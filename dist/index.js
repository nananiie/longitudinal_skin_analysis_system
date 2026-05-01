/**
 * Longitudinal Skin Analysis System - Main Entry Point
 * Initializes database, image processing, and API server
 *
 * @file index.ts
 */
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { AnalysisDatabase } from './services/database.service.js';
import apiRouter from './routes/api.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Configuration
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || './data/analysis.db';
const NODE_ENV = process.env.NODE_ENV || 'development';
// Global database instance
let db;
/**
 * Initialize Express server
 */
function createServer(database) {
    const app = express();
    // Middleware
    app.use(cors());
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));
    // Static files
    app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
    // Attach database before routes so req.db is available in all handlers
    app.use((req, _res, next) => { req.db = database; next(); });
    // Health check
    app.get('/health', (req, res) => {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            environment: NODE_ENV,
            database: database ? 'connected' : 'disconnected'
        });
    });
    // API Routes
    app.use('/api', apiRouter);
    // 404 handler
    app.use((req, res) => {
        res.status(404).json({
            error: 'Not found',
            path: req.path,
            method: req.method
        });
    });
    // Error handler
    app.use((err, req, res, next) => {
        console.error('Error:', err);
        res.status(err.status || 500).json({
            error: err.message || 'Internal server error',
            ...(NODE_ENV === 'development' && { stack: err.stack })
        });
    });
    return app;
}
/**
 * Initialize database connection
 */
async function initializeDatabase() {
    try {
        console.log(`📦 Initializing database at: ${DB_PATH}`);
        db = new AnalysisDatabase({
            filename: DB_PATH,
            deviceType: 'desktop',
            pragma: {
                journal_mode: 'WAL',
                foreign_keys: 'ON',
                synchronous: 'NORMAL'
            }
        });
        await db.initialize();
        console.log('✓ Database initialized successfully');
        return db;
    }
    catch (error) {
        console.error('✗ Database initialization failed:', error);
        process.exit(1);
    }
}
/**
 * Start the application
 */
async function start() {
    try {
        // Initialize database
        await initializeDatabase();
        // Create Express app with database attached
        const app = createServer(db);
        // Start server
        const server = app.listen(PORT, () => {
            console.log(`\n🚀 Longitudinal Skin Analysis System Started`);
            console.log(`📍 Server running at http://localhost:${PORT}`);
            console.log(`🏥 API Base: http://localhost:${PORT}/api`);
            console.log(`📊 Health Check: http://localhost:${PORT}/health`);
            console.log(`\n✓ Environment: ${NODE_ENV}`);
            console.log(`✓ Database: ${DB_PATH}\n`);
        });
        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('\n⏹️  Shutting down gracefully...');
            server.close(() => {
                console.log('✓ Server closed');
                process.exit(0);
            });
        });
        process.on('SIGINT', () => {
            console.log('\n⏹️  Shutting down gracefully...');
            server.close(() => {
                console.log('✓ Server closed');
                process.exit(0);
            });
        });
    }
    catch (error) {
        console.error('✗ Failed to start application:', error);
        process.exit(1);
    }
}
// Export for testing
export const getApp = (database) => createServer(database);
export const getDb = () => db;
// Start if run directly
start().catch(console.error);
//# sourceMappingURL=index.js.map