import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import prisma from '../lib/prisma.js';

dotenv.config();

export const verifyToken = async (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access Denied: No Token Provided' });
    }

    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error("FATAL ERROR: JWT_SECRET is not defined in environment variables.");
            return res.status(500).json({ message: 'Internal Configuration Error' });
        }
        const verified = jwt.verify(token, secret);
        
        // GLOBAL SECURITY CHECK: Verify latest account status from DB
        const user = await prisma.users.findUnique({
            where: { id: verified.id }
        });

        if (!user) {
            return res.status(401).json({ message: 'Account no longer exists' });
        }

        if (user.is_suspended) {
            return res.status(403).json({ message: 'Account Access Suspended: Please contact administration.' });
        }

        // Only block if not on the change-password or logout path
        if (user.force_password_reset && !req.path.includes('/change-password') && !req.path.includes('/logout')) {
            return res.status(403).json({ message: 'FORCE_RESET_REQUIRED', detail: 'Security policy requires a password update.' });
        }

        req.user = {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            status: user.status,
            theme_preference: user.theme_preference
        };
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid or Expired Token' });
    }
};

export const verifyNutritionist = (req, res, next) => {
    verifyToken(req, res, () => {
        const user = req.user;
        if (user.role === 'nutritionist' || user.role === 'admin') {
            if (user.role === 'admin' || user.status === 'approved') {
                next();
            } else {
                return res.status(403).json({ message: 'Clinical Verification Required: Your account is currently under review.' });
            }
        } else {
            res.status(403).json({ message: 'Access Denied: Nutritionist only route' });
        }
    });
};

export const verifyCaregiver = (req, res, next) => {
    verifyToken(req, res, () => {
        const user = req.user;
        if (user.role === 'parent' || user.role === 'caregiver' || user.role === 'admin') {
            next();
        } else {
            res.status(403).json({ message: 'Access Denied: Caregiver only route' });
        }
    });
};

export const verifyAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access Denied: Administrative access required.' });
        }
        next();
    });
};
