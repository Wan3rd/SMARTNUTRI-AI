// Shared mutable system state — imported by index.js and admin.js
export const systemConfig = {
    maintenanceMode: process.env.MAINTENANCE_MODE === 'true'
};
