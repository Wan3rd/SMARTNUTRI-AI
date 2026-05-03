import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

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
                role: true
            }
        });

        // Create Token
        const token = jwt.sign({ id: newUser.id, role: newUser.role }, process.env.JWT_SECRET || 'default_dev_secret', {
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
        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'default_dev_secret', {
            expiresIn: '1d',
        });

        res.json({
            message: 'Logged in successfully',
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role
            },
            token,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

export default router;
