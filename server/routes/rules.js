import express from 'express';
import prisma from '../lib/prisma.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// GET /profile/:profileId - Get rules for a profile (Shared for Parents & Nutritionists)
router.get('/profile/:profileId', verifyToken, async (req, res) => {
    try {
        const { profileId } = req.params;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(profileId)) {
            return res.status(400).json({ message: 'Invalid Profile ID format' });
        }

        // Verify authorization
        const profile = await prisma.profiles.findUnique({ where: { id: profileId } });
        if (!profile) return res.status(404).json({ message: 'Profile not found' });

        const isAuthorized = profile.user_id === req.user.id || req.user.role === 'admin' ||
            (req.user.role === 'nutritionist' && await prisma.nutritionist_clients.findFirst({
                where: { nutritionist_id: req.user.id, parent_id: profile.user_id, status: 'active' }
            }));

        if (!isAuthorized) return res.status(403).json({ message: 'Unauthorized access to nutrition rules' });

        const rules = await prisma.nutrition_rules.findMany({
            where: { profile_id: profileId },
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
        const { id } = req.params;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            return res.status(400).json({ message: 'Invalid Rule ID format' });
        }

        const rule = await prisma.nutrition_rules.findUnique({
            where: { id: req.params.id }
        });
        if (!rule) return res.status(404).json({ message: 'Rule not found' });

        // Verify authorization
        const profile = await prisma.profiles.findUnique({ where: { id: rule.profile_id } });
        if (!profile) return res.status(404).json({ message: 'Profile not found' });

        const isAuthorized = profile.user_id === req.user.id || req.user.role === 'admin' ||
            (req.user.role === 'nutritionist' && await prisma.nutritionist_clients.findFirst({
                where: { nutritionist_id: req.user.id, parent_id: profile.user_id, status: 'active' }
            }));

        if (!isAuthorized) return res.status(403).json({ message: 'Unauthorized access to nutrition rules' });

        res.json(rule);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

export default router;
