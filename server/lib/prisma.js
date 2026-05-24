import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../../env_config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load dotenv relative to the server folder
dotenv.config({ path: path.join(__dirname, '../.env') });

// Use URL from environment variables for security
const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prismaInstance = new PrismaClient({ adapter });

// Enforce ORM-level immutability on audit_logs to guarantee HIPAA/DPA data integrity compliance
const prisma = prismaInstance.$extends({
    query: {
        audit_logs: {
            async update() {
                throw new Error("Security Violation: audit_logs are immutable and cannot be updated.");
            },
            async updateMany() {
                throw new Error("Security Violation: audit_logs are immutable and cannot be updated.");
            },
            async delete() {
                throw new Error("Security Violation: audit_logs are immutable and cannot be deleted.");
            },
            async deleteMany() {
                throw new Error("Security Violation: audit_logs are immutable and cannot be deleted.");
            },
            async upsert() {
                throw new Error("Security Violation: audit_logs are immutable and cannot be modified.");
            }
        }
    }
});

export default prisma;
