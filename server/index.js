import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './lib/prisma.js';
import cookieParser from 'cookie-parser';
import config from '../env_config.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import { sendSupportTicketEmail } from './lib/mailer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
import { systemConfig } from './lib/systemConfig.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const server = createServer(app);

// Middleware
const allowedOrigins = [
    "https://smartnutri-ai-xmn9.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000"
];

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        credentials: true
    }
});

io.on('connection', (socket) => {
    console.log(`[Socket.io] New client connected: ${socket.id}`);

    socket.on('join', (userId) => {
        if (userId) {
            socket.join(userId);
            console.log(`[Socket.io] Socket ${socket.id} joined room (userId): ${userId}`);
        }
    });

    socket.on('disconnect', () => {
        console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
});

// Expose io instance to all express request routers
app.use((req, res, next) => {
    req.io = io;
    next();
});

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
    try {
        const dbCheck = await prisma.$queryRaw`SELECT NOW()`;
        res.json({ 
            status: 'online', 
            database: 'connected', 
            timestamp: new Date(),
            dbTime: dbCheck[0].now,
            maintenance: systemConfig.maintenanceMode
        });
    } catch (err) {
        console.error('[Health Check Error]:', err.message);
        res.status(503).json({ status: 'degraded', database: 'disconnected', error: err.message });
    }
});

// Global Maintenance Middleware
app.use((req, res, next) => {
    if (systemConfig.maintenanceMode) {
        // Exempt auth and admin routes so admins can still log in and disable it
        if (!req.path.startsWith('/api/auth') && !req.path.startsWith('/api/admin')) {
            return res.status(503).json({ message: 'Server is currently under maintenance. Please try again later.', maintenance: true });
        }
    }
    next();
});

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

app.get('/system-updates', (req, res) => {
    const pathsToTry = [
        path.join(__dirname, '../SYSTEM_HISTORY_AND_UPDATES.html'),
        path.join(process.cwd(), 'SYSTEM_HISTORY_AND_UPDATES.html'),
        path.join(__dirname, 'SYSTEM_HISTORY_AND_UPDATES.html'),
        path.join(process.cwd(), 'server/SYSTEM_HISTORY_AND_UPDATES.html')
    ];

    for (const p of pathsToTry) {
        if (fs.existsSync(p)) {
            return res.sendFile(path.resolve(p));
        }
    }

    console.error(`[System Updates] SYSTEM_HISTORY_AND_UPDATES.html not found. Tried paths:`, pathsToTry);
    res.status(404).send('System updates file not found.');
});

// Ticket endpoint rate limiter: Max 5 tickets per hour per IP
const ticketLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: { error: 'Too many support tickets submitted from this IP. Please try again in an hour or contact us directly at snutri244@gmail.com.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Auto-dispatch support tickets to mailer
app.post('/api/support/ticket', ticketLimiter, async (req, res) => {
    try {
        const { name, email, role, subject, message } = req.body;
        
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ error: 'All fields (name, email, subject, message) are required.' });
        }

        const mailResult = await sendSupportTicketEmail({ name, email, role, subject, message });

        if (mailResult.success) {
            return res.status(200).json({ message: 'Support ticket successfully dispatched.' });
        } else {
            return res.status(500).json({ error: 'Failed to send support ticket. Please contact support or check your SENDGRID_API_KEY environment variable.' });
        }
    } catch (err) {
        console.error('Support ticket route error:', err);
        res.status(500).json({ error: 'Server error processing support ticket.' });
    }
});

app.get('/', (req, res) => {
    res.send('SmartNutri-AI API is running...');
});

// Start Server
server.listen(PORT, () => {
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