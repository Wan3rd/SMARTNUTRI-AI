import express from 'express';
import prisma from '../lib/prisma.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Get Today's Progress
router.get('/today', verifyToken, async (req, res) => {
    const userId = req.user.id;
    const { profileId } = req.query;
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);

    try {
        let activeProfileId = profileId;

        if (activeProfileId) {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(activeProfileId)) {
                return res.status(400).json({ message: 'Invalid Profile ID format' });
            }
        } else {
            // Fallback: Get first child profile linked to user
            const profile = await prisma.profiles.findFirst({
                where: { user_id: userId },
                select: { id: true }
            });
            if (!profile) {
                return res.status(404).json({ message: 'Profile not found' });
            }
            activeProfileId = profile.id;
        }

        // Verify authorization
        const profile = await prisma.profiles.findUnique({ where: { id: activeProfileId } });
        if (!profile) return res.status(404).json({ message: 'Profile not found' });

        const isAuthorized = profile.user_id === req.user.id || req.user.role === 'admin' ||
            (req.user.role === 'nutritionist' && await prisma.nutritionist_clients.findFirst({
                where: { nutritionist_id: req.user.id, parent_id: profile.user_id, status: 'active' }
            }));

        if (!isAuthorized) return res.status(403).json({ message: 'Unauthorized access to progress log' });

        // Get log
        const log = await prisma.daily_logs.findUnique({
            where: {
                profile_id_date: {
                    profile_id: activeProfileId,
                    date: today
                }
            }
        });

        if (!log) {
            return res.json({ water_intake_glasses: 0, steps_count: 0 });
        }

        res.json(log);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Update Water Intake
router.post('/water', verifyToken, async (req, res) => {
    const userId = req.user.id;
    const { action, profileId } = req.body; // 'increment' or 'decrement'

    // Input Validation
    if (!action || !['increment', 'decrement'].includes(action)) {
        return res.status(400).json({ message: 'Invalid action. Must be "increment" or "decrement"' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);

    try {
        let activeProfileId = profileId;

        if (activeProfileId) {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(activeProfileId)) {
                return res.status(400).json({ message: 'Invalid Profile ID format' });
            }
        } else {
            const profile = await prisma.profiles.findFirst({
                where: { user_id: userId },
                select: { id: true }
            });
            if (!profile) return res.status(404).json({ message: 'No profile' });
            activeProfileId = profile.id;
        }

        // Verify authorization
        const profile = await prisma.profiles.findUnique({ where: { id: activeProfileId } });
        if (!profile) return res.status(404).json({ message: 'Profile not found' });

        const isAuthorized = profile.user_id === req.user.id || req.user.role === 'admin' ||
            (req.user.role === 'nutritionist' && await prisma.nutritionist_clients.findFirst({
                where: { nutritionist_id: req.user.id, parent_id: profile.user_id, status: 'active' }
            }));

        if (!isAuthorized) return res.status(403).json({ message: 'Unauthorized to log progress data' });

        // Upsert logic
        const existingLog = await prisma.daily_logs.findUnique({
            where: {
                profile_id_date: {
                    profile_id: activeProfileId,
                    date: today
                }
            }
        });

        if (!existingLog) {
            const water = action === 'increment' ? 1 : 0;
            const newLog = await prisma.daily_logs.create({
                data: {
                    profile_id: activeProfileId,
                    date: today,
                    water_intake_glasses: water
                }
            });
            return res.json(newLog);
        } else {
            let current = existingLog.water_intake_glasses || 0;
            if (action === 'increment') current += 1;
            if (action === 'decrement' && current > 0) current -= 1;

            const updatedLog = await prisma.daily_logs.update({
                where: { id: existingLog.id },
                data: { water_intake_glasses: current }
            });
            return res.json(updatedLog);
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

export default router;
