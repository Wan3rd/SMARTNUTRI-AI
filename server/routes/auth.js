import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { verifyToken } from '../middleware/auth.js';
import { upload, cloudinary } from '../lib/cloudinary.js';

const router = express.Router();

// REGISTER
router.post('/register', async (req, res) => {
    const { password, full_name, role, professional_id } = req.body;
    const email = req.body.email?.toLowerCase();

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

        // Create user
        const newUser = await prisma.users.create({
            data: {
                email,
                password_hash: hashedPassword,
                full_name,
                role: role || 'parent',
                professional_id
            },
            select: {
                id: true,
                email: true,
                full_name: true,
                role: true,
                status: true
            }
        });

        // Create Token
        const token = jwt.sign({ id: newUser.id, role: newUser.role, status: newUser.status }, process.env.JWT_SECRET || 'default_dev_secret', {
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

// LOGIN
router.post('/login', async (req, res) => {
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

        // Check password
        const validPass = await bcrypt.compare(password, user.password_hash);
        if (!validPass) {
            return res.status(400).json({ message: 'Invalid Email or Password' });
        }

        // Create Token
        const token = jwt.sign({ id: user.id, role: user.role, status: user.status }, process.env.JWT_SECRET || 'default_dev_secret', {
            expiresIn: '1d',
        });

        res.json({
            message: 'Logged in successfully',
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                status: user.status
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
    try {
        const updatedUser = await prisma.users.update({
            where: { id: req.user.id },
            data: {
                full_name,
                phone,
                specialization,
                license_no,
                clinic,
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
            return res.status(500).json({ message: 'File processing failed', error: err.message });
        }
        next();
    });
}, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

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

export default router;
