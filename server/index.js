import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './lib/prisma.js';
import cookieParser from 'cookie-parser';
import config from '../env_config.js';

import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profiles.js';
import mealRoutes from './routes/meals.js';
import progressRoutes from './routes/progress.js';
import aiRoutes from './routes/ai.js';
import nutritionistRoutes from './routes/nutritionist.js';
import logRoutes from './routes/logs.js';
import reportRoutes from './routes/reports.js';
import noteRoutes from './routes/notes.js';
import rulesRoutes from './routes/rules.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: config.client.url,
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/nutritionist', nutritionistRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/rules', rulesRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
    res.send('SmartNutri-AI API is running...');
});

app.get('/api/health', async (req, res) => {
    try {
        const result = await prisma.$queryRaw`SELECT NOW()`;
        res.json({ status: 'ok', time: result[0].now });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Database connection failed' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    // KEEP-ALIVE: Self-ping every 14 minutes to prevent Render spin-down
    if (config.isProduction) {
        const pingInterval = 14 * 60 * 1000; // 14 minutes in milliseconds
        setInterval(async () => {
            try {
                const healthUrl = `${config.server.url}/api/health`;
                console.log(`[Keep-Alive] Pinging health check at: ${healthUrl}`);
                const response = await fetch(healthUrl);
                const data = await response.json();
                console.log(`[Keep-Alive] Status: ${data.status}`);
            } catch (err) {
                console.error(`[Keep-Alive] Failed to ping server:`, err.message);
            }
        }, pingInterval);
    }
});