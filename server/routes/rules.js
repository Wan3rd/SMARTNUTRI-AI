import express from 'express';
import prisma from '../lib/prisma.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// GET /profile/:profileId - Get rules for a profile (Shared for Parents & Nutritionists)
router.get('/profile/:profileId', verifyToken, async (req, res) => {
    try {
        const rules = await prisma.nutrition_rules.findMany({
            where: { profile_id: req.params.profileId },
            orderBy: { created_at: 'desc' }
        });
        res.json(rules);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET /:id - Get specific rule
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const rule = await prisma.nutrition_rules.findUnique({
            where: { id: req.params.id }
        });
        if (!rule) return res.status(404).json({ message: 'Rule not found' });
        res.json(rule);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

export default router;
