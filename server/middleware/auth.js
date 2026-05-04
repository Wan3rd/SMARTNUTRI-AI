import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import prisma from '../lib/prisma.js';

dotenv.config();

export const verifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access Denied: No Token Provided' });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'default_dev_secret');
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ message: 'Invalid Token' });
    }
};

export const verifyNutritionist = (req, res, next) => {
    verifyToken(req, res, async () => {
        try {
            // Fetch latest user from DB to ensure status is up to date
            const user = await prisma.users.findUnique({
                where: { id: req.user.id }
            });

            if (!user) return res.status(404).json({ message: 'User not found' });

            if (user.role === 'nutritionist') {
                if (user.status === 'approved') {
                    req.user = user; // Update req.user with latest DB data
                    next();
                } else {
                    return res.status(403).json({ message: 'Clinical Verification Required: Your account is currently under review by the administration.' });
                }
            } else if (user.role === 'admin') {
                next();
            } else {
                res.status(403).json({ message: 'Access Denied: Nutritionist only route' });
            }
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server Error' });
        }
    });
};

export const verifyCaregiver = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.role === 'parent' || req.user.role === 'caregiver' || req.user.role === 'admin') {
            next();
        } else {
            res.status(403).json({ message: 'Access Denied: Caregiver only route' });
        }
    });
};

export const verifyAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.role === 'admin') {
            next();
        } else {
            res.status(403).json({ message: 'Access Denied: Administrative access required.' });
        }
    });
};
