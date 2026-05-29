import express from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { verifyToken } from '../middleware/auth.js';
import { upload, cloudinary, deleteCloudinaryAsset } from '../lib/cloudinary.js';
import { sendResetPasswordEmail, sendOtpEmail } from '../lib/mailer.js';
import crypto from 'crypto';

const router = express.Router();

// ─── Shared Validation Helpers ──────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = ['parent', 'nutritionist'];
const VALID_THEMES = ['light', 'dark', 'system'];
const VALID_MEASUREMENT_SYSTEMS = ['metric', 'imperial'];
const VALID_NUTRIENT_PRECISIONS = ['whole', 'decimal'];

function validateEmail(email) {
    return typeof email === 'string' && EMAIL_REGEX.test(email);
}
function validatePassword(password) {
    if (typeof password !== 'string' || password.length < 8) return false;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    return hasUppercase && hasLowercase && hasDigit && hasSpecial;
}

// CHECK EMAIL AVAILABILITY
router.get('/check-email', async (req, res) => {
    const email = req.query.email?.toLowerCase();
    if (!email) return res.status(400).json({ message: 'Email required' });

    try {
        const user = await prisma.users.findUnique({
            where: { email }
        });
        res.json({ available: !user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Active OTP storage in memory
const activeOtps = new Map();

// SEND OTP EMAIL (via SendGrid)
router.post('/send-otp', async (req, res) => {
    const { email, fullName } = req.body;
    if (!email || !validateEmail(email)) {
        return res.status(400).json({ message: 'A valid email address is required' });
    }

    try {
        // Generate 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store on server with 2 minutes expiration
        const expiresAt = Date.now() + 2 * 60 * 1000;
        activeOtps.set(email.toLowerCase(), { otpCode, expiresAt });

        // Dispatch via SendGrid
        const mailResult = await sendOtpEmail(email.toLowerCase(), otpCode, fullName);
        
        if (mailResult.success) {
            return res.json({ success: true, message: 'Verification OTP sent successfully' });
        } else {
            console.error("SendGrid failed to dispatch OTP:", mailResult.error);
            return res.status(500).json({ 
                message: 'Failed to send verification email. Please contact support or check your SENDGRID_API_KEY environment variable.' 
            });
        }
    } catch (err) {
        console.error("OTP send service error:", err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// VERIFY OTP
router.post('/verify-otp', async (req, res) => {
    const { email, otpCode } = req.body;
    if (!email || !otpCode) {
        return res.status(400).json({ message: 'Email and OTP code are required' });
    }

    const record = activeOtps.get(email.toLowerCase());
    if (!record) {
        return res.status(400).json({ message: 'No active verification code found for this email. Please request a new one.' });
    }

    if (Date.now() > record.expiresAt) {
        activeOtps.delete(email.toLowerCase());
        return res.status(400).json({ message: 'Verification code has expired. Please click "Resend Code".' });
    }

    if (record.otpCode !== otpCode) {
        return res.status(400).json({ message: 'Invalid verification code. Please check and try again.' });
    }

    // Verified! Clear code
    activeOtps.delete(email.toLowerCase());
    res.json({ success: true, message: 'Email verified successfully.' });
});


// REGISTER
router.post('/register', (req, res, next) => {
    upload.single('license')(req, res, (err) => {
        if (err) {
            console.error('Register Multer Error:', err);
            return res.status(400).json({ message: err.message });
        }
        next();
    });
}, async (req, res) => {
    const { password, full_name, role, professional_id, phone, specialization, license_no, clinic } = req.body;
    const email = req.body.email?.toLowerCase();

    // Input Validation
    if (!email || !validateEmail(email)) {
        return res.status(400).json({ message: 'A valid email address is required' });
    }
    if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
        return res.status(400).json({ message: 'Full name is required (minimum 2 characters)' });
    }
    if (!validatePassword(password)) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.' });
    }
    if (!role || !VALID_ROLES.includes(role)) {
        return res.status(400).json({ message: 'Role must be either "parent" or "nutritionist"' });
    }

    try {
        // Check if user exists
        const userExist = await prisma.users.findUnique({
            where: { email }
        });
        if (userExist) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Handle License Image Upload if present
        let license_image_url = null;
        if (req.file && role === 'nutritionist') {
            try {
                const uploadFromBuffer = () => {
                    return new Promise((resolve, reject) => {
                        const stream = cloudinary.uploader.upload_stream(
                            {
                                folder: 'smartnutri/credentials',
                                transformation: [{ width: 1200, crop: 'limit' }]
                            },
                            (error, result) => {
                                if (result) resolve(result);
                                else reject(error);
                            }
                        );
                        stream.end(req.file.buffer);
                    });
                };
                const uploadResult = await uploadFromBuffer();
                license_image_url = uploadResult.secure_url;
            } catch (uploadErr) {
                console.error('License upload failed:', uploadErr);
                // We continue even if upload fails, or should we error? 
                // Let's error to be safe since it's a security document.
                return res.status(500).json({ message: 'Credential document upload failed' });
            }
        }

        // Create user
        const newUser = await prisma.users.create({
            data: {
                email,
                password_hash: hashedPassword,
                full_name,
                role: (role === 'nutritionist') ? 'nutritionist' : 'parent',
                status: (role === 'nutritionist') ? 'pending' : 'approved',
                professional_id,
                phone,
                specialization,
                license_no,
                clinic,
                license_image_url
            },
            select: {
                id: true,
                email: true,
                full_name: true,
                role: true,
                status: true,
                theme_preference: true,
                privacy_mode: true,
                measurement_system: true,
                nutrient_precision: true,
                notif_compliance: true,
                notif_reminders: true,
                research_anonymize: true
            }
        });

        // Create Token
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error("FATAL: JWT_SECRET is missing");
            return res.status(500).json({ message: 'Internal Server Error' });
        }

        const token = jwt.sign({ id: newUser.id, role: newUser.role, status: newUser.status }, secret, {
            expiresIn: '1d',
        });

        res.status(201).json({
            message: 'User registered successfully',
            user: newUser,
            token,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Rate limiter for sensitive auth routes
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 requests per window
    message: { message: 'Too many requests. Please try again in an hour.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for login (slightly more lenient)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// LOGIN
router.post('/login', loginLimiter, async (req, res) => {
    const { password, rememberMe } = req.body;
    const email = req.body.email?.toLowerCase();

    try {
        // Find user
        const user = await prisma.users.findUnique({
            where: { email }
        });
        if (!user) {
            return res.status(400).json({ message: 'Invalid Email or Password' });
        }

        // Check if account is suspended
        if (user.is_suspended) {
            return res.status(403).json({ message: 'Account Access Denied: This account has been suspended by an administrator. Please contact snutri244@gmail.com to know more.' });
        }

        // Check password
        const validPass = await bcrypt.compare(password, user.password_hash);
        if (!validPass) {
            return res.status(400).json({ message: 'Invalid Email or Password' });
        }

        // Create Token
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error("FATAL: JWT_SECRET is missing");
            return res.status(500).json({ message: 'Internal Server Error' });
        }

        const token = jwt.sign({ id: user.id, role: user.role, status: user.status }, secret, {
            expiresIn: rememberMe ? '7d' : '1d',
        });

        res.json({
            message: 'Logged in successfully',
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                status: user.status,
                force_password_reset: user.force_password_reset,
                theme_preference: user.theme_preference,
                privacy_mode: user.privacy_mode,
                measurement_system: user.measurement_system,
                nutrient_precision: user.nutrient_precision,
                notif_compliance: user.notif_compliance ?? true,
                notif_reminders: user.notif_reminders ?? true,
                research_anonymize: user.research_anonymize ?? false,
                profile_image_url: user.profile_image_url || null
            },
            token,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET CURRENT USER
router.get('/me', verifyToken, async (req, res) => {
    try {
        const user = await prisma.users.findUnique({
            where: { id: req.user.id }
        });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Remove sensitive data
        const { password_hash, ...safeUser } = user;
        res.json(safeUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// UPDATE PROFILE
router.put('/profile', verifyToken, async (req, res) => {
    const { full_name, phone, specialization, license_no, clinic, profile_image_url } = req.body;

    // --- Input Validation ---
    if (full_name !== undefined && full_name !== null && full_name !== '') {
        if (typeof full_name !== 'string' || full_name.trim().length < 2 || full_name.trim().length > 100) {
            return res.status(400).json({ message: 'Full name must be between 2 and 100 characters' });
        }
    }
    if (phone !== undefined && phone !== null && phone !== '') {
        if (typeof phone !== 'string' || !/^\+?[\d\s\-().]{6,20}$/.test(phone)) {
            return res.status(400).json({ message: 'Invalid phone number format' });
        }
    }
    if (specialization !== undefined && specialization !== null && specialization !== '') {
        if (typeof specialization !== 'string' || specialization.trim().length > 150) {
            return res.status(400).json({ message: 'Specialization must be 150 characters or less' });
        }
    }
    if (license_no !== undefined && license_no !== null && license_no !== '') {
        if (typeof license_no !== 'string' || license_no.trim().length > 50) {
            return res.status(400).json({ message: 'License number must be 50 characters or less' });
        }
    }
    if (clinic !== undefined && clinic !== null && clinic !== '') {
        if (typeof clinic !== 'string' || clinic.trim().length > 150) {
            return res.status(400).json({ message: 'Clinic name must be 150 characters or less' });
        }
    }
    if (profile_image_url !== undefined && profile_image_url !== null && profile_image_url !== '') {
        if (typeof profile_image_url !== 'string' || !profile_image_url.startsWith('https://')) {
            return res.status(400).json({ message: 'Profile image URL must be a valid HTTPS URL' });
        }
    }

    try {
        const updatedUser = await prisma.users.update({
            where: { id: req.user.id },
            data: {
                full_name: full_name !== undefined ? full_name.trim() : undefined,
                phone: phone !== undefined ? (phone === '' ? null : phone.trim()) : undefined,
                specialization: specialization !== undefined ? (specialization === '' ? null : specialization.trim()) : undefined,
                license_no: license_no !== undefined ? (license_no === '' ? null : license_no.trim()) : undefined,
                clinic: clinic !== undefined ? (clinic === '' ? null : clinic.trim()) : undefined,
                profile_image_url
            }
        });
        const { password_hash, ...safeUser } = updatedUser;
        res.json(safeUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET ASSIGNED NUTRITIONIST (For Caregivers)
router.get('/my-nutritionist', verifyToken, async (req, res) => {
    try {
        const assignment = await prisma.nutritionist_clients.findFirst({
            where: { parent_id: req.user.id },
            include: {
                nutritionist: {
                    select: {
                        id: true,
                        full_name: true,
                        email: true,
                        phone: true,
                        specialization: true,
                        clinic: true,
                        profile_image_url: true,
                        license_no: true
                    }
                }
            }
        });

        if (!assignment || !assignment.nutritionist) {
            return res.status(404).json({ message: 'No assigned nutritionist found' });
        }

        res.json(assignment.nutritionist);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// UPLOAD PHOTO (For Accounts)
router.post('/photo', verifyToken, (req, res, next) => {
    upload.single('photo')(req, res, (err) => {
        if (err) {
            console.error('Multer Error:', err);
            return res.status(400).json({ message: 'File processing failed', error: err.message });
        }
        next();
    });
}, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Fetch current user details to check for an existing avatar to delete
        const currentUser = await prisma.users.findUnique({
            where: { id: req.user.id }
        });

        // Upload to Cloudinary from memory buffer
        const uploadFromBuffer = () => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'smartnutri/accounts',
                        transformation: [{ width: 500, height: 500, crop: 'limit' }]
                    },
                    (error, result) => {
                        if (result) resolve(result);
                        else reject(error);
                    }
                );
                stream.end(req.file.buffer);
            });
        };

        const result = await uploadFromBuffer();

        // Clean up old profile picture from Cloudinary to avoid storage leaks
        if (currentUser && currentUser.profile_image_url) {
            deleteCloudinaryAsset(currentUser.profile_image_url).catch(e => console.error("Cloudinary old avatar cleanup failed:", e));
        }

        const updatedUser = await prisma.users.update({
            where: { id: req.user.id },
            data: {
                profile_image_url: result.secure_url
            }
        });

        const { password_hash, ...safeUser } = updatedUser;
        res.json(safeUser);
    } catch (err) {
        console.error('Cloudinary/Database Error:', err);
        res.status(500).json({ message: 'Upload failed', error: err.message });
    }
});

// UPLOAD LICENSE IMAGE (For Nutritionist Verification)
router.post('/license-image', verifyToken, (req, res, next) => {
    upload.single('license')(req, res, (err) => {
        if (err) {
            console.error('Multer Error:', err);
            return res.status(400).json({ message: 'File processing failed', error: err.message });
        }
        next();
    });
}, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No license image uploaded' });
        }

        // Fetch current user details to check for an existing license image to delete
        const currentUser = await prisma.users.findUnique({
            where: { id: req.user.id }
        });

        // Upload to Cloudinary from memory buffer
        const uploadFromBuffer = () => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'smartnutri/credentials',
                        transformation: [{ width: 1200, crop: 'limit' }] // High res for verification
                    },
                    (error, result) => {
                        if (result) resolve(result);
                        else reject(error);
                    }
                );
                stream.end(req.file.buffer);
            });
        };

        const result = await uploadFromBuffer();

        // Clean up old license document from Cloudinary to avoid storage leaks
        if (currentUser && currentUser.license_image_url) {
            deleteCloudinaryAsset(currentUser.license_image_url).catch(e => console.error("Cloudinary old license cleanup failed:", e));
        }

        const updatedUser = await prisma.users.update({
            where: { id: req.user.id },
            data: {
                license_image_url: result.secure_url
            }
        });

        const { password_hash, ...safeUser } = updatedUser;
        res.json({ message: 'License document uploaded successfully', user: safeUser });
    } catch (err) {
        console.error('Cloudinary/Database Error:', err);
        res.status(500).json({ message: 'Credential upload failed', error: err.message });
    }
});

// FORGOT PASSWORD
router.post('/forgot-password', authLimiter, async (req, res) => {
    const { email } = req.body;

    if (!email || !validateEmail(email.toLowerCase())) {
        return res.status(400).json({ message: 'A valid email address is required' });
    }
    try {
        const user = await prisma.users.findUnique({ where: { email: email?.toLowerCase() } });

        // Security best practice: don't reveal if user exists
        if (!user) {
            return res.json({ success: true, message: 'If an account exists with that email, a reset link has been sent.' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 3600000); // 1 hour

        await prisma.users.update({
            where: { id: user.id },
            data: {
                reset_password_token: token,
                reset_password_expires: expires
            }
        });

        await sendResetPasswordEmail(user.email, token, user.full_name);

        res.json({ success: true, message: 'If an account exists with that email, a reset link has been sent.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// RESET PASSWORD
router.post('/reset-password', async (req, res) => {
    const { token, password } = req.body;

    if (!token || typeof token !== 'string' || token.trim().length === 0) {
        return res.status(400).json({ message: 'Reset token is required' });
    }
    if (!validatePassword(password)) {
        return res.status(400).json({ message: 'New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.' });
    }

    try {
        const user = await prisma.users.findFirst({
            where: {
                reset_password_token: token,
                reset_password_expires: { gt: new Date() }
            }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await prisma.users.update({
            where: { id: user.id },
            data: {
                password_hash: hashedPassword,
                reset_password_token: null,
                reset_password_expires: null,
                force_password_reset: false
            }
        });

        res.json({ success: true, message: 'Password has been reset' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// UPDATE USER PREFERENCES
router.put('/preferences', verifyToken, async (req, res) => {
    const { theme, privacy_mode, measurement_system, nutrient_precision, notif_compliance, notif_reminders, research_anonymize } = req.body;
    try {
        const updateData = {};
        if (theme !== undefined) {
            if (!VALID_THEMES.includes(theme)) return res.status(400).json({ message: `Invalid theme. Must be one of: ${VALID_THEMES.join(', ')}` });
            updateData.theme_preference = theme;
        }
        if (privacy_mode !== undefined) updateData.privacy_mode = !!privacy_mode;
        if (measurement_system !== undefined) {
            if (!VALID_MEASUREMENT_SYSTEMS.includes(measurement_system)) return res.status(400).json({ message: `Invalid measurement system. Must be one of: ${VALID_MEASUREMENT_SYSTEMS.join(', ')}` });
            updateData.measurement_system = measurement_system;
        }
        if (nutrient_precision !== undefined) {
            if (!VALID_NUTRIENT_PRECISIONS.includes(nutrient_precision)) return res.status(400).json({ message: `Invalid nutrient precision. Must be one of: ${VALID_NUTRIENT_PRECISIONS.join(', ')}` });
            updateData.nutrient_precision = nutrient_precision;
        }
        if (notif_compliance !== undefined) updateData.notif_compliance = !!notif_compliance;
        if (notif_reminders !== undefined) updateData.notif_reminders = !!notif_reminders;
        if (research_anonymize !== undefined) updateData.research_anonymize = !!research_anonymize;

        await prisma.users.update({
            where: { id: req.user.id },
            data: updateData
        });
        res.json({ success: true, message: 'Preferences saved' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// UPDATE THEME PREFERENCE
router.put('/theme', verifyToken, async (req, res) => {
    const { theme } = req.body;

    // Validate against the same allowed list used by /preferences
    if (!theme || !VALID_THEMES.includes(theme)) {
        return res.status(400).json({ message: `Invalid theme. Must be one of: ${VALID_THEMES.join(', ')}` });
    }

    try {
        await prisma.users.update({
            where: { id: req.user.id },
            data: { theme_preference: theme }
        });
        res.json({ success: true, message: 'Theme preference updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update theme' });
    }
});

// (authLimiter defined above near login)

// CHANGE PASSWORD
router.put('/change-password', verifyToken, authLimiter, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || typeof currentPassword !== 'string') {
        return res.status(400).json({ message: 'Current password is required' });
    }
    if (!validatePassword(newPassword)) {
        return res.status(400).json({ message: 'New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.' });
    }

    try {
        const user = await prisma.users.findUnique({
            where: { id: req.user.id }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password
        const validPass = await bcrypt.compare(currentPassword, user.password_hash);
        if (!validPass) {
            return res.status(400).json({ message: 'Incorrect current password' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await prisma.users.update({
            where: { id: user.id },
            data: {
                password_hash: hashedPassword,
                force_password_reset: false
            }
        });

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET /auth/announcements - Fetch active announcements for the current user
router.get('/announcements', verifyToken, async (req, res) => {
    try {
        const announcements = await prisma.announcements.findMany({
            where: {
                is_active: true,
                target_role: { in: ['all', req.user.role] },
                OR: [
                    { expires_at: null },
                    { expires_at: { gt: new Date() } }
                ]
            },
            orderBy: { created_at: 'desc' }
        });
        res.json(announcements);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// FORCE CHANGE PASSWORD (for new accounts)
router.post('/change-password-force', verifyToken, async (req, res) => {
    const { newPassword } = req.body;

    if (!validatePassword(newPassword)) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await prisma.users.update({
            where: { id: req.user.id },
            data: {
                password_hash: hashedPassword,
                force_password_reset: false
            }
        });

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update password' });
    }
});

// DEACTIVATE ACCOUNT (Soft Delete)
router.post('/deactivate', verifyToken, async (req, res) => {
    const { password, reason } = req.body;
    try {
        const user = await prisma.users.findUnique({ where: { id: req.user.id } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const validPass = await bcrypt.compare(password, user.password_hash);
        if (!validPass) {
            return res.status(400).json({ message: 'Invalid password' });
        }

        await prisma.users.update({
            where: { id: req.user.id },
            data: {
                deleted_at: new Date(),
                status: 'archived',
                deactivation_reason: reason || 'Not specified'
            }
        });

        res.json({ success: true, message: 'Account deactivated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to deactivate account' });
    }
});

// DATA EXPORT (Clinical History Download)
router.get('/export-data', verifyToken, async (req, res) => {
    try {
        const parentUser = await prisma.users.findUnique({
            where: { id: req.user.id },
            include: {
                profiles: {
                    include: {
                        growth_logs: {
                            orderBy: { logged_at: 'desc' }
                        },
                        daily_logs: {
                            orderBy: { date: 'desc' }
                        },
                        meal_logs: {
                            orderBy: { logged_at: 'desc' }
                        },
                        meal_plans: {
                            orderBy: { date: 'desc' }
                        },
                        portion_plans: true,
                        profile_vaccinations: {
                            include: { vaccination_types: true }
                        },
                        adime_notes: {
                            orderBy: { created_at: 'desc' }
                        }
                    }
                }
            }
        });

        if (!parentUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Clean password hash for security before exporting
        const { password_hash, ...safeData } = parentUser;

        res.json({
            exported_at: new Date().toISOString(),
            engine_version: "SmartNutri-AI v1.2.0 (Clinical-Grade)",
            data: safeData
        });
    } catch (err) {
        console.error("Data export failed:", err);
        res.status(500).json({ message: 'Failed to compile clinical export data' });
    }
});

export default router;
