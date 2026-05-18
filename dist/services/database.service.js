/**
 * SQLite Database Service
 * Portable data access layer for skin analysis historical data
 *
 * Works with both Node.js (desktop) and future Android implementation
 * Uses prepared statements for platform independence
 */
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url'; // <--- ADD THIS
// --- ADD THESE TWO LINES ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/**
 * AnalysisDatabase - Main database service for historical data management
 */
export class AnalysisDatabase {
    constructor(config) {
        this.config = config;
        this.db = new Database(config.filename || ':memory:');
        // Apply configuration
        this.applyPragmas();
    }
    /**
     * Initialize database schema
     * Loads and executes schema SQL file
     */
    async initialize() {
        try {
            const schemaPath = path.resolve(__dirname, '../../db-schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf-8');
            // Execute schema - use exec() for multiple statements
            this.db.exec(schema);
            console.log('✓ Database schema initialized successfully');
            // Migration: add display_name to users if it doesn't exist yet
            try {
                this.db.exec('ALTER TABLE users ADD COLUMN display_name TEXT');
            }
            catch { /* column already exists — safe to ignore */ }
        }
        catch (error) {
            throw new Error(`Failed to initialize database schema: ${error}`);
        }
    }
    /**
     * Apply SQLite pragmas for cross-platform consistency
     */
    applyPragmas() {
        const pragma = this.config.pragma || {};
        this.db.pragma('foreign_keys = ON');
        this.db.pragma(`journal_mode = ${pragma.journal_mode || 'WAL'}`);
        this.db.pragma(`synchronous = ${pragma.synchronous || 'NORMAL'}`);
        this.db.pragma(`cache_size = ${pragma.cache_size || 2000}`);
    }
    /**
     * Close database connection
     */
    close() {
        this.db.close();
    }
    // =========================================================================
    // USER MANAGEMENT
    // =========================================================================
    /**
     * Create or get user
     */
    createUser(deviceIdentifier, deviceType, displayName) {
        const userId = uuidv4();
        const now = new Date().toISOString();
        const stmt = this.db.prepare(`
      INSERT INTO users (user_id, device_identifier, device_type, display_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
        stmt.run(userId, deviceIdentifier, deviceType, displayName ?? null, now, now);
        return {
            user_id: userId,
            created_at: now,
            updated_at: now,
            device_identifier: deviceIdentifier,
            device_type: deviceType,
            display_name: displayName,
            sync_version: 1
        };
    }
    updateUserDisplayName(userId, displayName) {
        const stmt = this.db.prepare('UPDATE users SET display_name = ?, updated_at = ? WHERE user_id = ?');
        stmt.run(displayName, new Date().toISOString(), userId);
    }
    /**
     * Get user by device identifier
     */
    getUserByDevice(deviceIdentifier) {
        const stmt = this.db.prepare('SELECT * FROM users WHERE device_identifier = ?');
        return stmt.get(deviceIdentifier);
    }
    // =========================================================================
    // SESSION MANAGEMENT
    // =========================================================================
    /**
     * Create analysis session
     */
    createSession(userId, bodyArea, lightingCondition, notes) {
        const sessionId = uuidv4();
        const now = new Date().toISOString();
        const stmt = this.db.prepare(`
      INSERT INTO analysis_sessions 
        (session_id, user_id, body_area, session_date, lighting_condition, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
        stmt.run(sessionId, userId, bodyArea, now, lightingCondition || null, notes || null);
        return {
            session_id: sessionId,
            user_id: userId,
            body_area: bodyArea,
            session_date: now,
            lighting_condition: lightingCondition,
            notes
        };
    }
    /**
     * Get sessions for user (with optional date filter)
     */
    getUserSessions(userId, days = 30) {
        const stmt = this.db.prepare(`
      SELECT * FROM analysis_sessions
      WHERE user_id = ? AND session_date >= datetime('now', '-' || ? || ' days')
      ORDER BY session_date DESC
    `);
        return stmt.all(userId, days);
    }
    // =========================================================================
    // IMAGE MANAGEMENT
    // =========================================================================
    /**
     * Store image metadata
     */
    createImageRecord(sessionId, userId, imagePath, width, height, imageHash) {
        const imageId = uuidv4();
        const now = new Date().toISOString();
        const stmt = this.db.prepare(`
      INSERT INTO images 
        (image_id, session_id, user_id, image_path, image_hash, width, height, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(imageId, sessionId, userId, imagePath, imageHash || null, width, height, now);
        return {
            image_id: imageId,
            session_id: sessionId,
            user_id: userId,
            image_path: imagePath,
            width,
            height,
            created_at: now,
            stored_locally: true
        };
    }
    /**
     * Get images for session
     */
    getSessionImages(sessionId) {
        const stmt = this.db.prepare('SELECT * FROM images WHERE session_id = ? ORDER BY created_at');
        return stmt.all(sessionId);
    }
    /**
     * Get the most recent image for a user+bodyArea (used to surface previous scan for comparison)
     */
    getPreviousImageForBodyArea(userId, bodyArea) {
        const stmt = this.db.prepare(`
      SELECT i.* FROM images i
      JOIN analysis_sessions s ON i.session_id = s.session_id
      WHERE i.user_id = ? AND s.body_area = ?
      ORDER BY s.session_date DESC
      LIMIT 1
    `);
        return stmt.get(userId, bodyArea);
    }
    // =========================================================================
    // FEATURE ANALYSIS
    // =========================================================================
    /**
     * Store feature analysis results
     */
    createAnalysis(imageId, sessionId, userId, spotCount, textureScore, averagePigmentation, processingTimeMs, confidenceScore = 1.0, algorithmVersion = 'v1.0') {
        const analysisId = uuidv4();
        const timestamp = new Date().toISOString();
        const stmt = this.db.prepare(`
      INSERT INTO feature_analyses 
        (analysis_id, image_id, session_id, user_id, spot_count, texture_score, 
         average_pigmentation, analysis_timestamp, processing_time_ms, algorithm_version, confidence_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(analysisId, imageId, sessionId, userId, spotCount, textureScore, averagePigmentation, timestamp, processingTimeMs || null, algorithmVersion, confidenceScore);
        return {
            analysis_id: analysisId,
            image_id: imageId,
            session_id: sessionId,
            user_id: userId,
            spot_count: spotCount,
            texture_score: textureScore,
            average_pigmentation: averagePigmentation,
            analysis_timestamp: timestamp,
            algorithm_version: algorithmVersion,
            confidence_score: confidenceScore
        };
    }
    /**
     * Get analysis results for user (with optional filtering)
     */
    getUserAnalyses(userId, filter) {
        let query = 'SELECT * FROM feature_analyses WHERE user_id = ?';
        const params = [userId];
        if (filter?.start_date) {
            query += ' AND analysis_timestamp >= ?';
            params.push(filter.start_date);
        }
        if (filter?.end_date) {
            query += ' AND analysis_timestamp <= ?';
            params.push(filter.end_date);
        }
        query += ' ORDER BY analysis_timestamp DESC';
        if (filter?.limit) {
            query += ' LIMIT ?';
            params.push(filter.limit);
        }
        const stmt = this.db.prepare(query);
        return stmt.all(...params);
    }
    /**
     * Get latest analysis for user
     */
    getLatestAnalysis(userId) {
        const stmt = this.db.prepare(`
      SELECT * FROM feature_analyses
      WHERE user_id = ?
      ORDER BY analysis_timestamp DESC
      LIMIT 1
    `);
        return stmt.get(userId);
    }
    // =========================================================================
    // BASELINE MANAGEMENT
    // =========================================================================
    /**
     * Set baseline for body area (deactivates previous active baseline)
     */
    setBaseline(userId, bodyArea, analysisId, sessionId, spotCount, textureScore, pigmentation) {
        // Deactivate previous active baseline
        const deactivate = this.db.prepare(`
      UPDATE baseline_references
      SET is_active = 0
      WHERE user_id = ? AND body_area = ? AND is_active = 1
    `);
        deactivate.run(userId, bodyArea);
        // Insert new baseline
        const baselineId = uuidv4();
        const now = new Date().toISOString();
        const stmt = this.db.prepare(`
      INSERT INTO baseline_references
        (baseline_id, user_id, body_area, analysis_id, session_id, 
         baseline_spot_count, baseline_texture_score, baseline_pigmentation, established_date, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
        stmt.run(baselineId, userId, bodyArea, analysisId, sessionId, spotCount, textureScore, pigmentation, now);
        return {
            baseline_id: baselineId,
            user_id: userId,
            body_area: bodyArea,
            analysis_id: analysisId,
            session_id: sessionId,
            baseline_spot_count: spotCount,
            baseline_texture_score: textureScore,
            baseline_pigmentation: pigmentation,
            established_date: now,
            is_active: true
        };
    }
    /**
     * Get active baseline for body area
     */
    getActiveBaseline(userId, bodyArea) {
        const stmt = this.db.prepare(`
      SELECT * FROM baseline_references
      WHERE user_id = ? AND body_area = ? AND is_active = 1
    `);
        return stmt.get(userId, bodyArea);
    }
    // =========================================================================
    // RECOMMENDATIONS
    // =========================================================================
    /**
     * Create recommendation from analysis
     */
    createRecommendation(userId, analysisId, sessionId, status, advice, severity) {
        const recommendationId = uuidv4();
        const timestamp = new Date().toISOString();
        const stmt = this.db.prepare(`
      INSERT INTO recommendations
        (recommendation_id, user_id, analysis_id, session_id, status, advice, severity, generated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(recommendationId, userId, analysisId, sessionId, status, advice, severity || null, timestamp);
        return {
            recommendation_id: recommendationId,
            user_id: userId,
            analysis_id: analysisId,
            session_id: sessionId,
            status,
            advice,
            severity: severity || 0,
            generated_at: timestamp,
            acted_upon: false
        };
    }
    /**
     * Get unviewed recommendations for user
     */
    getUnviewedRecommendations(userId) {
        const stmt = this.db.prepare(`
      SELECT * FROM recommendations
      WHERE user_id = ? AND viewed_at IS NULL
      ORDER BY generated_at DESC
    `);
        return stmt.all(userId);
    }
    /**
     * Mark recommendation as viewed
     */
    markRecommationViewed(recommendationId) {
        const stmt = this.db.prepare(`
      UPDATE recommendations
      SET viewed_at = CURRENT_TIMESTAMP
      WHERE recommendation_id = ?
    `);
        stmt.run(recommendationId);
    }
    // =========================================================================
    // LONGITUDINAL ANALYSIS & TRENDS
    // =========================================================================
    /**
     * Compare current analysis with baseline
     */
    compareWithBaseline(analysisId, userId, bodyArea) {
        const analysis = this.db
            .prepare('SELECT * FROM feature_analyses WHERE analysis_id = ?')
            .get(analysisId);
        if (!analysis)
            return null;
        const baseline = this.getActiveBaseline(userId, bodyArea);
        if (!baseline)
            return null;
        const baselineTimestamp = new Date(baseline.established_date);
        const analysisTimestamp = new Date(analysis.analysis_timestamp);
        const daysElapsed = Math.floor((analysisTimestamp.getTime() - baselineTimestamp.getTime()) / (1000 * 60 * 60 * 24));
        const spotCountDelta = analysis.spot_count - baseline.baseline_spot_count;
        const spotCountPct = baseline.baseline_spot_count > 0
            ? (spotCountDelta / baseline.baseline_spot_count) * 100
            : 0;
        return {
            analysis_id: analysisId,
            baseline_id: baseline.baseline_id,
            spot_count_baseline: baseline.baseline_spot_count,
            spot_count_current: analysis.spot_count,
            spot_count_delta: spotCountDelta,
            spot_count_pct_change: spotCountPct,
            texture_baseline: baseline.baseline_texture_score,
            texture_current: analysis.texture_score,
            texture_delta: analysis.texture_score - baseline.baseline_texture_score,
            pigmentation_baseline: baseline.baseline_pigmentation,
            pigmentation_current: analysis.average_pigmentation,
            pigmentation_delta: analysis.average_pigmentation - baseline.baseline_pigmentation,
            days_elapsed: daysElapsed,
            regression_detected: spotCountPct > 20 // >20% increase triggers regression
        };
    }
    /**
     * Get trend data over time period
     */
    getTrendData(userId, days = 90) {
        const stmt = this.db.prepare(`
      SELECT 
        user_id,
        DATE(analysis_timestamp) as analysis_date,
        COUNT(*) as session_count,
        AVG(spot_count) as avg_spots,
        MAX(spot_count) as max_spots,
        MIN(spot_count) as min_spots,
        AVG(texture_score) as avg_texture,
        AVG(average_pigmentation) as avg_pigmentation
      FROM feature_analyses
      WHERE user_id = ? AND analysis_timestamp >= datetime('now', '-' || ? || ' days')
      GROUP BY DATE(analysis_timestamp)
      ORDER BY analysis_date DESC
    `);
        return stmt.all(userId, days);
    }
    /**
     * Detect significant regressions
     */
    detectRegressions(userId) {
        const query = `
      SELECT 
        fa.analysis_id,
        br.baseline_id,
        br.baseline_spot_count,
        fa.spot_count,
        fa.spot_count - br.baseline_spot_count as spot_count_delta,
        ROUND((CAST(fa.spot_count - br.baseline_spot_count) / br.baseline_spot_count) * 100, 1) as spot_count_pct,
        br.baseline_texture_score,
        fa.texture_score,
        fa.texture_score - br.baseline_texture_score as texture_delta,
        br.baseline_pigmentation,
        fa.average_pigmentation,
        fa.average_pigmentation - br.baseline_pigmentation as pigmentation_delta,
        julianday(fa.analysis_timestamp) - julianday(br.established_date) as days_elapsed
      FROM feature_analyses fa
      JOIN baseline_references br ON fa.user_id = br.user_id
      WHERE fa.user_id = ? AND br.is_active = 1
        AND (CAST(fa.spot_count - br.baseline_spot_count) / br.baseline_spot_count) > 0.2
      ORDER BY fa.analysis_timestamp DESC
    `;
        const stmt = this.db.prepare(query);
        const results = stmt.all(userId);
        return results.map(row => ({
            analysis_id: row.analysis_id,
            baseline_id: row.baseline_id,
            spot_count_baseline: row.baseline_spot_count,
            spot_count_current: row.spot_count,
            spot_count_delta: row.spot_count_delta,
            spot_count_pct_change: row.spot_count_pct,
            texture_baseline: row.baseline_texture_score,
            texture_current: row.texture_score,
            texture_delta: row.texture_delta,
            pigmentation_baseline: row.baseline_pigmentation,
            pigmentation_current: row.average_pigmentation,
            pigmentation_delta: row.pigmentation_delta,
            days_elapsed: Math.floor(row.days_elapsed),
            regression_detected: true
        }));
    }
    /**
     * Get complete historical record for analysis
     */
    getHistoricalRecord(analysisId) {
        const analysis = this.db
            .prepare('SELECT * FROM feature_analyses WHERE analysis_id = ?')
            .get(analysisId);
        if (!analysis)
            return null;
        const session = this.db
            .prepare('SELECT * FROM analysis_sessions WHERE session_id = ?')
            .get(analysis.session_id);
        const images = this.getSessionImages(analysis.session_id);
        const baseline = this.getActiveBaseline(analysis.user_id, session.body_area);
        const recommendation = this.db
            .prepare('SELECT * FROM recommendations WHERE analysis_id = ?')
            .get(analysisId);
        const comparison = baseline ? this.compareWithBaseline(analysisId, analysis.user_id, session.body_area) : null;
        return {
            session,
            images,
            analysis,
            baseline,
            recommendation,
            days_since_baseline: comparison?.days_elapsed,
            change_from_baseline: comparison ? {
                spot_count_change: comparison.spot_count_delta,
                spot_count_pct: comparison.spot_count_pct_change,
                texture_change: comparison.texture_delta,
                pigmentation_change: comparison.pigmentation_delta
            } : undefined
        };
    }
    // =========================================================================
    // SYNC OPERATIONS
    // =========================================================================
    /**
     * Get pending sync records
     */
    getPendingSyncRecords(limit = 100) {
        const stmt = this.db.prepare(`
      SELECT * FROM sync_metadata
      WHERE synced_to_server = 0
      ORDER BY last_modified ASC
      LIMIT ?
    `);
        return stmt.all(limit);
    }
    /**
     * Mark sync record as synced
     */
    markSynced(syncRecordId) {
        const stmt = this.db.prepare(`
      UPDATE sync_metadata
      SET synced_to_server = 1, sync_timestamp = CURRENT_TIMESTAMP
      WHERE sync_record_id = ?
    `);
        stmt.run(syncRecordId);
    }
    // =========================================================================
    // DATABASE UTILITIES
    // =========================================================================
    /**
     * Export all user data (for backup/migration)
     */
    exportUserData(userId) {
        return {
            user: this.db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId),
            sessions: this.db.prepare('SELECT * FROM analysis_sessions WHERE user_id = ?').all(userId),
            images: this.db.prepare('SELECT * FROM images WHERE user_id = ?').all(userId),
            analyses: this.db.prepare('SELECT * FROM feature_analyses WHERE user_id = ?').all(userId),
            baselines: this.db.prepare('SELECT * FROM baseline_references WHERE user_id = ?').all(userId),
            recommendations: this.db.prepare('SELECT * FROM recommendations WHERE user_id = ?').all(userId)
        };
    }
    /**
     * Get database statistics
     */
    getStats() {
        const tables = this.db.prepare(`
      SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'
    `).get().count;
        const records = this.db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM users) +
        (SELECT COUNT(*) FROM analysis_sessions) +
        (SELECT COUNT(*) FROM images) +
        (SELECT COUNT(*) FROM feature_analyses) +
        (SELECT COUNT(*) FROM baseline_references) +
        (SELECT COUNT(*) FROM recommendations) as total
    `).get().total;
        // Size in KB
        const filename = this.config.filename || ':memory:';
        let size = 0;
        if (filename !== ':memory:' && fs.existsSync(filename)) {
            size = fs.statSync(filename).size / 1024;
        }
        return { tables, records, size_kb: size };
    }
}
export default AnalysisDatabase;
//# sourceMappingURL=database.service.js.map