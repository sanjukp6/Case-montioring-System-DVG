import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { pool, testConnection, closePool } from './config/database.js';
import { requestLogger } from './middleware/logger.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import caseRoutes from './routes/cases.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet()); // Security headers

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting (generous for bulk operations)
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'), // 1000 requests per window (for bulk uploads)
    message: { success: false, error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing - increased limit for bulk uploads (up to 10,000 cases)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use(morgan('combined'));
app.use(requestLogger);

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        await connection.query('SELECT 1');
        connection.release();

        res.json({
            success: true,
            status: 'ok',
            database: 'connected',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            status: 'error',
            database: 'disconnected',
            timestamp: new Date().toISOString(),
        });
    }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cases', caseRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
});

// Start server
async function startServer() {
    // Test database connection
    const dbConnected = await testConnection();

    if (!dbConnected) {
        console.error('Failed to connect to database. Please check your configuration.');
        console.log('');
        console.log('Make sure MySQL is running and the database exists.');
        console.log('To create the database, run:');
        console.log('  mysql -u root -p -e "CREATE DATABASE case_monitoring"');
        console.log('');
        console.log('Then initialize the database with:');
        console.log('  npm run db:init');
        console.log('');
        // Continue anyway for development - database might be created later
    }

    app.listen(PORT, () => {
        console.log('');
        console.log('='.repeat(60));
        console.log('  🚔 Police Case Monitoring System - Backend Server');
        console.log('='.repeat(60));
        console.log(`  ✅ Server running at: http://localhost:${PORT}`);
        console.log(`  ✅ API base URL: http://localhost:${PORT}/api`);
        console.log(`  ✅ Health check: http://localhost:${PORT}/api/health`);
        console.log(`  ✅ Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`  ✅ CORS origin: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
        console.log('='.repeat(60));
        console.log('');
        console.log('Available endpoints:');
        console.log('  POST   /api/auth/login     - User login');
        console.log('  POST   /api/auth/logout    - User logout');
        console.log('  GET    /api/auth/me        - Get current user');
        console.log('  PUT    /api/auth/password  - Change password');
        console.log('  PUT    /api/auth/profile   - Update profile');
        console.log('  GET    /api/users          - List users (SP only)');
        console.log('  POST   /api/users          - Create user (SP only)');
        console.log('  GET    /api/cases          - List cases');
        console.log('  POST   /api/cases          - Create case');
        console.log('  GET    /api/cases/:id      - Get case');
        console.log('  PUT    /api/cases/:id      - Update case');
        console.log('  DELETE /api/cases/:id      - Delete case');
        console.log('');
    });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    await closePool();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received. Shutting down gracefully...');
    await closePool();
    process.exit(0);
});

startServer();
