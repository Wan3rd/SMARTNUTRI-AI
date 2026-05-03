import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

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
    verifyToken(req, res, () => {
        if (req.user.role === 'nutritionist' || req.user.role === 'admin') {
            next();
        } else {
            res.status(403).json({ message: 'Access Denied: Nutritionist only route' });
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
