import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { verifyAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /admin/stats - System overview
router.get('/stats', verifyAdmin, async (req, res) => {
    try {
        const [totalUsers, totalProfiles, pendingNutritionists, totalLogs] = await Promise.all([
            prisma.users.count(),
            prisma.profiles.count(),
            prisma.users.count({ where: { role: 'nutritionist', status: 'pending' } }),
            prisma.meal_logs.count()
        ]);

        res.json({
            users: totalUsers,
            profiles: totalProfiles,
            pendingApprovals: pendingNutritionists,
            totalMealsLogged: totalLogs
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET /admin/nutritionists - List all nutritionists for verification
router.get('/nutritionists', verifyAdmin, async (req, res) => {
    try {
        const nutritionists = await prisma.users.findMany({
            where: { role: 'nutritionist' },
            select: {
                id: true,
                email: true,
                full_name: true,
                status: true,
                specialization: true,
                license_no: true,
                clinic: true,
                phone: true,
                created_at: true,
                profile_image_url: true
            },
            orderBy: { created_at: 'desc' }
        });
        res.json(nutritionists);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// PATCH /admin/nutritionists/:id/verify - Approve/Reject a nutritionist
router.patch('/nutritionists/:id/verify', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
    }

    try {
        const updatedUser = await prisma.users.update({
            where: { id },
            data: { status },
            select: {
                id: true,
                full_name: true,
                status: true
            }
        });
        res.json({ message: `Nutritionist account ${status}`, user: updatedUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET /admin/users - Master user list
router.get('/users', verifyAdmin, async (req, res) => {
    try {
        const users = await prisma.users.findMany({
            select: {
                id: true,
                email: true,
                full_name: true,
                role: true,
                status: true,
                created_at: true,
                professional_id: true,
                clinic: true
            },
            orderBy: { created_at: 'desc' }
        });
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// DELETE /admin/users/:id - Delete a user account
router.delete('/users/:id', verifyAdmin, async (req, res) => {
    const { id } = req.params;

    // Prevent self-deletion
    if (id === req.user.id) {
        return res.status(403).json({ message: "Security Violation: You cannot delete your own administrative account." });
    }

    try {
        await prisma.users.delete({
            where: { id }
        });
        res.json({ message: 'User account deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to delete user' });
    }
});

// PATCH /admin/users/:id/role - Change user role
router.patch('/users/:id/role', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    // Prevent self-role change
    if (id === req.user.id) {
        return res.status(403).json({ message: "Security Violation: You cannot modify your own administrative role." });
    }

    if (!['parent', 'nutritionist', 'admin'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
    }

    try {
        const updatedUser = await prisma.users.update({
            where: { id },
            data: { role },
            select: { id: true, role: true }
        });
        res.json({ message: `Role updated to ${role}`, user: updatedUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET /admin/users/:id/details - Comprehensive user details
router.get('/users/:id/details', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const user = await prisma.users.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                full_name: true,
                role: true,
                status: true,
                phone: true,
                professional_id: true,
                clinic: true,
                created_at: true,
                profiles: {
                    select: {
                        id: true,
                        child_name: true,
                        created_at: true
                    }
                }
            }
        });

        if (!user) return res.status(404).json({ message: 'User not found' });

        // Calculate some stats
        const stats = {
            totalChildren: user.profiles?.length || 0,
            hasProfessionalData: !!user.professional_id
        };

        res.json({ ...user, stats });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /admin/users - Create a new user manually
router.post('/users', verifyAdmin, async (req, res) => {
    const { email, password, full_name, role, professional_id, clinic } = req.body;

    try {
        // Check if user exists
        const userExist = await prisma.users.findUnique({
            where: { email: email.toLowerCase() }
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
                email: email.toLowerCase(),
                password_hash: hashedPassword,
                full_name,
                role,
                professional_id,
                clinic,
                status: role === 'nutritionist' ? 'pending' : 'approved'
            }
        });

        const { password_hash, ...safeUser } = newUser;
        res.status(201).json(safeUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

export default router;
