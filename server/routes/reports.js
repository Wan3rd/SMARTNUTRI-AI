import express from 'express';
import prisma from '../lib/prisma.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/reports/compliance/:clientId
// Returns compliance stats for the last 30 days
router.get('/compliance/:clientId', verifyToken, async (req, res) => {
    try {
        const { clientId } = req.params;

        // SECURITY FIX: Parse and clamp `days` to prevent SQL injection via raw query concatenation
        const rawDays = parseInt(req.query.days, 10);
        const days = isNaN(rawDays) || rawDays < 1 ? 30 : Math.min(rawDays, 365);

        // Verify authorization
        const profile = await prisma.profiles.findUnique({ where: { id: clientId } });
        if (!profile) return res.status(404).json({ message: 'Profile not found' });

        const isAuthorized = profile.user_id === req.user.id || req.user.role === 'admin' ||
            (req.user.role === 'nutritionist' && await prisma.nutritionist_clients.findFirst({
                where: { nutritionist_id: req.user.id, parent_id: profile.user_id, status: 'active' }
            }));

        if (!isAuthorized) return res.status(403).json({ message: 'Unauthorized access to compliance reports' });

        // 1. Get Summary Stats — days is now a safe integer parameter
        const summary = await prisma.$queryRaw`
            SELECT 
                COUNT(*)::int as total_logs,
                COUNT(CASE WHEN compliance_status = 'compliant' THEN 1 END)::int as compliant_count,
                COUNT(CASE WHEN compliance_status = 'flagged' THEN 1 END)::int as flagged_count,
                COUNT(CASE WHEN compliance_status = 'pending' THEN 1 END)::int as pending_count
            FROM meal_logs 
            WHERE profile_id = ${clientId}::uuid
            AND logged_at >= NOW() - (${days} || ' days')::INTERVAL
        `;

        const summaryData = summary[0];

        // 2. Get Daily Compliance Trend
        const trend = await prisma.$queryRaw`
            SELECT 
                DATE(logged_at) as log_date,
                COUNT(*)::int as total,
                COUNT(CASE WHEN compliance_status = 'compliant' THEN 1 END)::int as compliant,
                COUNT(CASE WHEN compliance_status = 'flagged' THEN 1 END)::int as flagged
            FROM meal_logs
            WHERE profile_id = ${clientId}::uuid
            AND logged_at >= NOW() - (${days} || ' days')::INTERVAL
            GROUP BY DATE(logged_at)
            ORDER BY log_date ASC
        `;

        res.json({
            period: `${days} days`,
            summary: {
                totalLogs: summaryData.total_logs,
                compliantCount: summaryData.compliant_count,
                flaggedCount: summaryData.flagged_count,
                pendingCount: summaryData.pending_count,
                complianceRate: summaryData.total_logs > 0 ? Math.round((summaryData.compliant_count / summaryData.total_logs) * 100) : 0
            },
            trend: trend.map(row => ({
                date: typeof row.log_date === 'string' ? row.log_date : row.log_date.toISOString().split('T')[0],
                total: row.total,
                compliant: row.compliant,
                flagged: row.flagged
            }))
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
