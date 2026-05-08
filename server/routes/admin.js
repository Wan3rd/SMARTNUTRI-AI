import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { verifyAdmin } from '../middleware/auth.js';
import { logAuditAction } from '../lib/auditLogger.js';

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
                profile_image_url: true,
                license_image_url: true,
                is_suspended: true
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
        const oldUser = await prisma.users.findUnique({ where: { id }, select: { status: true } });
        
        const updatedUser = await prisma.users.update({
            where: { id },
            data: { status },
            select: {
                id: true,
                full_name: true,
                status: true
            }
        });

        await logAuditAction({
            adminId: req.user.id,
            targetId: id,
            action: status === 'approved' ? 'APPROVE_NUTRITIONIST' : status === 'rejected' ? 'REJECT_NUTRITIONIST' : 'RESET_VERIFICATION_STATUS',
            entityType: 'USER',
            entityId: id,
            details: {
                before: oldUser.status,
                after: status
            },
            ipAddress: req.ip
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
                clinic: true,
                is_suspended: true
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
        const oldUser = await prisma.users.findUnique({ where: { id }, select: { email: true, full_name: true, role: true } });
        
        await prisma.users.delete({
            where: { id }
        });

        await logAuditAction({
            adminId: req.user.id,
            targetId: null, // User is gone, but we track the deletion action
            action: 'DELETE_USER',
            entityType: 'USER',
            entityId: id,
            details: {
                deleted_user: oldUser
            },
            ipAddress: req.ip
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
        const oldUser = await prisma.users.findUnique({ where: { id }, select: { role: true } });

        const updatedUser = await prisma.users.update({
            where: { id },
            data: { role },
            select: { id: true, role: true }
        });

        await logAuditAction({
            adminId: req.user.id,
            targetId: id,
            action: 'CHANGE_ROLE',
            entityType: 'USER',
            entityId: id,
            details: {
                before: oldUser.role,
                after: role
            },
            ipAddress: req.ip
        });

        res.json({ message: `Role updated to ${role}`, user: updatedUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// PATCH /admin/users/:id/suspend - Toggle account suspension
router.patch('/users/:id/suspend', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { is_suspended } = req.body;

    if (id === req.user.id) {
        return res.status(403).json({ message: "Security Violation: You cannot suspend your own administrative account." });
    }

    try {
        const updatedUser = await prisma.users.update({
            where: { id },
            data: { is_suspended },
            select: { id: true, is_suspended: true, full_name: true }
        });

        await logAuditAction({
            adminId: req.user.id,
            targetId: id,
            action: is_suspended ? 'SUSPEND_USER' : 'REACTIVATE_USER',
            entityType: 'USER',
            entityId: id,
            ipAddress: req.ip
        });

        res.json({ 
            message: `Account for ${updatedUser.full_name} has been ${is_suspended ? 'suspended' : 'reactivated'}`, 
            user: updatedUser 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update suspension status' });
    }
});

// PATCH /admin/users/:id/force-reset - Force password reset for a user
router.patch('/users/:id/force-reset', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { force_password_reset } = req.body;

    if (id === req.user.id) {
        return res.status(403).json({ message: "Security Violation: You cannot force a reset on your own administrative account." });
    }

    try {
        const updatedUser = await prisma.users.update({
            where: { id },
            data: { force_password_reset },
            select: { id: true, force_password_reset: true, full_name: true }
        });

        await logAuditAction({
            adminId: req.user.id,
            targetId: id,
            action: force_password_reset ? 'FORCE_PASSWORD_RESET_ON' : 'FORCE_PASSWORD_RESET_OFF',
            entityType: 'USER',
            entityId: id,
            ipAddress: req.ip
        });

        res.json({ 
            message: force_password_reset 
                ? `Account security policy updated: ${updatedUser.full_name} will be required to change their password on next login.` 
                : `Forced reset requirement cleared for ${updatedUser.full_name}.`, 
            user: updatedUser 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update password reset policy' });
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
                },
                license_image_url: true,
                is_suspended: true
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

// GET /admin/audit-logs - Retrieve global audit ledger
router.get('/audit-logs', verifyAdmin, async (req, res) => {
    try {
        const logs = await prisma.audit_logs.findMany({
            include: {
                admin: {
                    select: { full_name: true, email: true }
                },
                target_user: {
                    select: { full_name: true, email: true }
                }
            },
            orderBy: { created_at: 'desc' },
            take: 100 // Limit to latest 100 logs for performance
        });
        res.json(logs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET /admin/users/:id/audit - Specific user audit trail
router.get('/users/:id/audit', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const logs = await prisma.audit_logs.findMany({
            where: {
                OR: [
                    { target_id: id },
                    { entity_id: id }
                ]
            },
            include: {
                admin: {
                    select: { full_name: true }
                }
            },
            orderBy: { created_at: 'desc' }
        });
        res.json(logs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /admin/broadcast - Create a system-wide announcement
router.get('/announcements', verifyAdmin, async (req, res) => {
    try {
        const announcements = await prisma.announcements.findMany({
            orderBy: { created_at: 'desc' },
            include: { admin: { select: { full_name: true } } }
        });
        res.json(announcements);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch announcements' });
    }
});

router.post('/broadcast', verifyAdmin, async (req, res) => {
    const { title, content, target_role, priority, expires_at } = req.body;

    try {
        // ENFORCE MAX 1: Deactivate all existing active announcements
        await prisma.announcements.updateMany({
            where: { is_active: true },
            data: { is_active: false }
        });

        const announcement = await prisma.announcements.create({
            data: {
                title,
                content,
                target_role: target_role || 'all',
                priority: priority || 'normal',
                admin_id: req.user.id,
                expires_at: expires_at ? new Date(expires_at) : null,
                is_active: true
            }
        });

        await logAuditAction({
            adminId: req.user.id,
            action: 'CREATE_BROADCAST',
            entityType: 'ANNOUNCEMENT',
            entityId: announcement.id,
            details: { title, target_role },
            ipAddress: req.ip
        });

        res.status(201).json(announcement);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to broadcast announcement' });
    }
});

// PATCH /admin/announcements/:id - Update an announcement
router.patch('/announcements/:id', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { title, content, target_role, priority, expires_at, is_active } = req.body;

    try {
        const announcement = await prisma.announcements.update({
            where: { id },
            data: {
                title,
                content,
                target_role,
                priority,
                expires_at: expires_at ? new Date(expires_at) : undefined,
                is_active
            }
        });

        await logAuditAction({
            adminId: req.user.id,
            action: 'UPDATE_BROADCAST',
            entityType: 'ANNOUNCEMENT',
            entityId: id,
            details: { title, is_active },
            ipAddress: req.ip
        });

        res.json(announcement);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update announcement' });
    }
});

// GET /admin/announcements - List all announcements for management
router.get('/announcements', verifyAdmin, async (req, res) => {
    try {
        const announcements = await prisma.announcements.findMany({
            include: {
                admin: { select: { full_name: true } }
            },
            orderBy: { created_at: 'desc' }
        });
        res.json(announcements);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// DELETE /admin/announcements/:id - Remove an announcement
router.delete('/announcements/:id', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const oldAnn = await prisma.announcements.findUnique({ where: { id }, select: { title: true } });
        
        await prisma.announcements.delete({ where: { id } });

        await logAuditAction({
            adminId: req.user.id,
            action: 'DELETE_BROADCAST',
            entityType: 'ANNOUNCEMENT',
            entityId: id,
            details: { title: oldAnn?.title },
            ipAddress: req.ip
        });

        res.json({ message: 'Announcement removed' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

export default router;
