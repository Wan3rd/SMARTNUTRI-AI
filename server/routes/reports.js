import express from 'express';
import prisma from '../lib/prisma.js';

const router = express.Router();

// GET /api/reports/compliance/:clientId
// Returns compliance stats for the last 30 days
router.get('/compliance/:clientId', async (req, res) => {
    try {
        const { clientId } = req.params;
        const { days = 30 } = req.query; // Default to 30 days

        // 1. Get Summary Stats
        const summary = await prisma.$queryRaw`
            SELECT 
                COUNT(*)::int as total_logs,
                COUNT(CASE WHEN compliance_status = 'compliant' THEN 1 END)::int as compliant_count,
                COUNT(CASE WHEN compliance_status = 'flagged' THEN 1 END)::int as flagged_count,
                COUNT(CASE WHEN compliance_status = 'pending' THEN 1 END)::int as pending_count
            FROM meal_logs 
            WHERE profile_id = ${clientId}::uuid
            AND logged_at >= NOW() - CAST(${days + ' days'} AS INTERVAL)
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
            AND logged_at >= NOW() - CAST(${days + ' days'} AS INTERVAL)
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
