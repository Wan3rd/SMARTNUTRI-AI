import prisma from './prisma.js';

/**
 * Logs an administrative action to the database for compliance and auditing.
 * 
 * @param {Object} params
 * @param {string} params.adminId - ID of the admin performing the action
 * @param {string} [params.targetId] - ID of the user being affected
 * @param {string} params.action - Action name (e.g., 'SUSPEND_USER', 'APPROVE_NUTRITIONIST')
 * @param {string} params.entityType - Type of entity affected ('USER', 'PROFILE', etc.)
 * @param {string} [params.entityId] - Specific ID of the affected entity
 * @param {Object} [params.details] - JSON object with before/after state or metadata
 * @param {string} [params.ipAddress] - IP address of the admin
 */
export const logAuditAction = async ({
    adminId,
    targetId,
    action,
    entityType,
    entityId,
    details,
    ipAddress
}) => {
    try {
        await prisma.audit_logs.create({
            data: {
                admin_id: adminId,
                target_id: targetId,
                action,
                entity_type: entityType,
                entity_id: entityId,
                details: details || {},
                ip_address: ipAddress
            }
        });
    } catch (err) {
        console.error("FAILED TO LOG AUDIT ACTION:", err);
        // We don't throw here to avoid breaking the main request if logging fails,
        // but in a strict clinical environment, we might want to.
    }
};
