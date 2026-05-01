/**
 * API Routes for Skin Analysis System
 * Connects image processing, database, and recommendation modules
 *
 * @file routes/api.ts
 */
import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import multer from 'multer';
import { preprocessImage } from '../modules/image/preprocess.js';
import { extractFeatures } from '../modules/image/featureExtraction.js';
import { generateRecommendation } from '../modules/comparison/rules.js';
// Multer — save uploads to /uploads with original extension
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.join(__dirname, '../../uploads')),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
    },
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/'))
            cb(null, true);
        else
            cb(new Error('Only image files are allowed'));
    },
});
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = Router();
// ============================================================================
// USER MANAGEMENT ROUTES
// ============================================================================
/**
 * GET /api/users/:userId
 * Retrieve user profile and analysis statistics
 */
router.get('/users/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const db = req.db;
        const analyses = db.getUserAnalyses(userId);
        const sessions = db.getUserSessions(userId);
        res.json({
            userId,
            statistics: {
                totalAnalyses: analyses.length,
                totalSessions: sessions.length,
                lastAnalysis: analyses[analyses.length - 1] || null
            }
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * POST /api/users
 * Create new user on device
 */
router.post('/users', (req, res) => {
    try {
        const { deviceIdentifier, deviceType } = req.body;
        const db = req.db;
        if (!deviceIdentifier) {
            return res.status(400).json({ error: 'deviceIdentifier required' });
        }
        const user = db.createUser(deviceIdentifier, deviceType || 'desktop');
        res.status(201).json(user);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ============================================================================
// IMAGE ANALYSIS ROUTES (Main Processing Pipeline)
// ============================================================================
/**
 * POST /api/analyze/upload
 * Mobile-friendly endpoint: accepts multipart/form-data with an image file.
 * Fields: image (file), userId (string), bodyArea (string), lightingCondition? (string)
 */
router.post('/analyze/upload', upload.single('image'), async (req, res) => {
    try {
        const { userId, bodyArea = 'forehead', lightingCondition = 'natural', notes } = req.body;
        const db = req.db;
        if (!userId)
            return res.status(400).json({ error: 'userId required' });
        if (!req.file)
            return res.status(400).json({ error: 'image file required' });
        const imagePath = req.file.path;
        // Reuse the full analysis pipeline
        const session = db.createSession(userId, bodyArea, lightingCondition, notes);
        const preprocessed = await preprocessImage(imagePath);
        const features = await extractFeatures(preprocessed.buffer, preprocessed.width, preprocessed.height);
        const imageHash = crypto.createHash('sha256').update(preprocessed.buffer).digest('hex');
        const image = db.createImageRecord(session.session_id, userId, imagePath, preprocessed.width, preprocessed.height, imageHash);
        const analysis = db.createAnalysis(image.image_id, session.session_id, userId, features.spotCount, features.textureScore, features.averagePigmentation, undefined, 0.95, 'v1.0');
        let baseline = db.getActiveBaseline(userId, bodyArea);
        if (!baseline) {
            baseline = db.setBaseline(userId, bodyArea, analysis.analysis_id, session.session_id, features.spotCount, features.textureScore, features.averagePigmentation);
        }
        const recommendation = generateRecommendation(features, baseline ? {
            spotCount: baseline.baseline_spot_count,
            textureScore: baseline.baseline_texture_score,
            averagePigmentation: baseline.baseline_pigmentation,
        } : null);
        const rec = db.createRecommendation(userId, analysis.analysis_id, session.session_id, recommendation.status, recommendation.advice);
        res.status(201).json({
            success: true,
            analysis: { analysisId: analysis.analysis_id, sessionId: session.session_id, imageId: image.image_id, timestamp: analysis.analysis_timestamp },
            features: { spotCount: features.spotCount, textureScore: Number(features.textureScore.toFixed(3)), pigmentation: Number(features.averagePigmentation.toFixed(3)) },
            baseline: baseline ? { spotCount: baseline.baseline_spot_count, textureScore: Number(baseline.baseline_texture_score.toFixed(3)), pigmentation: Number(baseline.baseline_pigmentation.toFixed(3)) } : null,
            recommendation: { status: recommendation.status, advice: recommendation.advice, recommendationId: rec.recommendation_id },
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * POST /api/analyze
 * Main endpoint: Upload image → Preprocess → Extract Features → Store → Get Recommendation
 *
 * Body: {
 *   userId: string (UUID)
 *   imagePath: string (local file path)
 *   bodyArea: 'forehead' | 'cheek' | 'chin' | 'temple' | 'arm' | 'back' | 'chest'
 *   lightingCondition?: string
 * }
 */
router.post('/analyze', async (req, res) => {
    try {
        const { userId, imagePath, bodyArea = 'forehead', lightingCondition = 'natural', notes } = req.body;
        const db = req.db;
        // Validation
        if (!userId || !imagePath) {
            return res.status(400).json({ error: 'userId and imagePath required' });
        }
        // Check if file exists
        if (!fs.existsSync(imagePath)) {
            return res.status(400).json({ error: `Image file not found: ${imagePath}` });
        }
        console.log(`\n📸 Processing image for user ${userId} (${bodyArea})`);
        // STEP 1: Create analysis session
        const session = db.createSession(userId, bodyArea, lightingCondition, notes);
        console.log(`  ✓ Session created: ${session.session_id}`);
        // STEP 2: Preprocess image (resize, normalize, blur)
        const preprocessed = await preprocessImage(imagePath);
        console.log(`  ✓ Image preprocessed: 256x256`);
        // STEP 3: Extract features (spot count, texture, pigmentation)
        const features = await extractFeatures(preprocessed.buffer, preprocessed.width, preprocessed.height);
        console.log(`  ✓ Features extracted: ${features.spotCount} spots, texture: ${features.textureScore.toFixed(2)}`);
        // STEP 4: Store image metadata
        const imageHash = crypto
            .createHash('sha256')
            .update(preprocessed.buffer)
            .digest('hex');
        const image = db.createImageRecord(session.session_id, userId, imagePath, preprocessed.width, preprocessed.height, imageHash);
        console.log(`  ✓ Image stored: ${image.image_id}`);
        // STEP 5: Store analysis results
        const analysis = db.createAnalysis(image.image_id, session.session_id, userId, features.spotCount, features.textureScore, features.averagePigmentation, undefined, 0.95, // confidence
        'v1.0');
        console.log(`  ✓ Analysis stored: ${analysis.analysis_id}`);
        // STEP 6: Get baseline (if exists)
        let baseline = db.getActiveBaseline(userId, bodyArea);
        if (!baseline) {
            // Set as baseline if first analysis for this area
            baseline = db.setBaseline(userId, bodyArea, analysis.analysis_id, session.session_id, features.spotCount, features.textureScore, features.averagePigmentation);
            console.log(`  ✓ Baseline established`);
        }
        // STEP 7: Generate recommendation
        const recommendation = generateRecommendation(features, baseline ? {
            spotCount: baseline.baseline_spot_count,
            textureScore: baseline.baseline_texture_score,
            averagePigmentation: baseline.baseline_pigmentation
        } : null);
        console.log(`  ✓ Recommendation: ${recommendation.status}`);
        // STEP 8: Store recommendation in database
        const rec = db.createRecommendation(userId, analysis.analysis_id, session.session_id, recommendation.status, recommendation.advice);
        // STEP 9: Return full result
        res.status(201).json({
            success: true,
            analysis: {
                analysisId: analysis.analysis_id,
                sessionId: session.session_id,
                imageId: image.image_id,
                timestamp: analysis.analysis_timestamp
            },
            features: {
                spotCount: features.spotCount,
                textureScore: features.textureScore.toFixed(3),
                pigmentation: features.averagePigmentation.toFixed(3)
            },
            baseline: baseline ? {
                isBaseline: true,
                spotCount: baseline.baseline_spot_count,
                textureScore: baseline.baseline_texture_score.toFixed(3),
                pigmentation: baseline.baseline_pigmentation.toFixed(3)
            } : null,
            recommendation: {
                status: recommendation.status,
                advice: recommendation.advice,
                recommendationId: rec.recommendation_id
            }
        });
    }
    catch (error) {
        console.error('  ✗ Analysis failed:', error.message);
        res.status(500).json({ error: error.message });
    }
});
// ============================================================================
// SESSION ROUTES
// ============================================================================
/**
 * GET /api/sessions/:userId
 * Get all analysis sessions for a user
 */
router.get('/sessions/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const db = req.db;
        const sessions = db.getUserSessions(userId);
        res.json({
            userId,
            count: sessions.length,
            sessions
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/sessions/:userId/:bodyArea
 * Get sessions for specific body area
 */
router.get('/sessions/:userId/:bodyArea', (req, res) => {
    try {
        const { userId, bodyArea } = req.params;
        const db = req.db;
        const sessions = db.getUserSessions(userId)
            .filter((s) => s.body_area === bodyArea);
        res.json({
            userId,
            bodyArea,
            count: sessions.length,
            sessions
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ============================================================================
// COMPARISON & TREND ROUTES
// ============================================================================
/**
 * GET /api/comparison/:userId/:bodyArea
 * Get longitudinal comparison: current vs baseline
 */
router.get('/comparison/:userId/:bodyArea', (req, res) => {
    try {
        const { userId, bodyArea } = req.params;
        const db = req.db;
        const latest = db.getLatestAnalysis(userId);
        const baseline = db.getActiveBaseline(userId, bodyArea);
        if (!latest || !baseline) {
            return res.status(404).json({
                error: 'Insufficient data for comparison',
                hasLatest: !!latest,
                hasBaseline: !!baseline
            });
        }
        const comparison = db.compareWithBaseline(latest.analysis_id, userId, bodyArea);
        res.json({
            userId,
            bodyArea,
            baseline: {
                id: baseline.baseline_id,
                date: baseline.established_date,
                spotCount: baseline.baseline_spot_count,
                textureScore: baseline.baseline_texture_score,
                pigmentation: baseline.baseline_pigmentation
            },
            current: {
                id: latest.analysis_id,
                date: latest.analysis_timestamp,
                spotCount: latest.spot_count,
                textureScore: latest.texture_score,
                pigmentation: latest.average_pigmentation
            },
            comparison: comparison ? {
                spotCountChange: comparison.spot_count_delta,
                spotCountChangePercent: comparison.spot_count_pct_change.toFixed(1),
                textureScoreChange: comparison.texture_delta.toFixed(3),
                pigmentationChange: comparison.pigmentation_delta.toFixed(3),
                regressionDetected: comparison.regression_detected,
                daysElapsed: comparison.days_elapsed
            } : null
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/trends/:userId/:bodyArea
 * Get historical trend data
 */
router.get('/trends/:userId/:bodyArea', (req, res) => {
    try {
        const { userId, bodyArea } = req.params;
        const { days = 90 } = req.query;
        const db = req.db;
        const trends = db.getTrendData(userId, parseInt(days));
        res.json({
            userId,
            bodyArea,
            timeframe: `${days} days`,
            dataPoints: trends.length,
            trends
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ============================================================================
// RECOMMENDATIONS ROUTES
// ============================================================================
/**
 * GET /api/recommendations/:userId
 * Get unviewed recommendations for user
 */
router.get('/recommendations/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const db = req.db;
        const recommendations = db.getUnviewedRecommendations(userId);
        res.json({
            userId,
            count: recommendations.length,
            recommendations
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * PUT /api/recommendations/:recommendationId/viewed
 * Mark recommendation as viewed
 */
router.put('/recommendations/:recommendationId/viewed', (req, res) => {
    try {
        const { recommendationId } = req.params;
        const db = req.db;
        db.markRecommationViewed(recommendationId);
        res.json({
            success: true,
            recommendationId,
            message: 'Recommendation marked as viewed'
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ============================================================================
// BASELINE ROUTES
// ============================================================================
/**
 * GET /api/baselines/:userId
 * Get all active baselines for user
 */
router.get('/baselines/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const db = req.db;
        // Get all body areas and their baselines
        const bodyAreas = ['forehead', 'cheek', 'chin', 'temple', 'arm', 'back', 'chest'];
        const baselines = bodyAreas
            .map(area => ({ area, baseline: db.getActiveBaseline(userId, area) }))
            .filter(({ baseline }) => baseline !== null);
        res.json({
            userId,
            count: baselines.length,
            baselines: baselines.map(({ area, baseline }) => ({
                bodyArea: area,
                baselineId: baseline.baseline_id,
                createdAt: baseline.established_date,
                spotCount: baseline.baseline_spot_count,
                textureScore: baseline.baseline_texture_score,
                pigmentation: baseline.baseline_pigmentation
            }))
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ============================================================================
// DEBUG & UTILITY ROUTES
// ============================================================================
/**
 * GET /api/debug/stats
 * Get system statistics for debugging
 */
router.get('/debug/stats', (req, res) => {
    try {
        const db = req.db;
        res.json({
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            database: {
                path: process.env.DB_PATH || './data/analysis.db',
                connected: db ? true : false
            },
            api: {
                version: '1.0.0',
                endpoints: [
                    'POST /api/analyze',
                    'GET /api/users/:userId',
                    'GET /api/sessions/:userId',
                    'GET /api/comparison/:userId/:bodyArea',
                    'GET /api/trends/:userId/:bodyArea',
                    'GET /api/recommendations/:userId',
                    'GET /api/baselines/:userId'
                ]
            }
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
export default router;
//# sourceMappingURL=api.js.map