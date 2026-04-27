/**
 * SQLite Database Service
 * Portable data access layer for skin analysis historical data
 *
 * Works with both Node.js (desktop) and future Android implementation
 * Uses prepared statements for platform independence
 */
import { User, AnalysisSession, ImageMetadata, FeatureAnalysisResult, BaselineReference, Recommendation, HistoricalRecord, TrendData, AnalysisQueryFilter, ComparisonResult, DatabaseConfig } from '../types/database.types.js';
/**
 * AnalysisDatabase - Main database service for historical data management
 */
export declare class AnalysisDatabase {
    private db;
    private config;
    constructor(config: DatabaseConfig);
    /**
     * Initialize database schema
     * Loads and executes schema SQL file
     */
    initialize(): Promise<void>;
    /**
     * Apply SQLite pragmas for cross-platform consistency
     */
    private applyPragmas;
    /**
     * Close database connection
     */
    close(): void;
    /**
     * Create or get user
     */
    createUser(deviceIdentifier: string, deviceType: 'desktop' | 'android' | 'web'): User;
    /**
     * Get user by device identifier
     */
    getUserByDevice(deviceIdentifier: string): User | undefined;
    /**
     * Create analysis session
     */
    createSession(userId: string, bodyArea: string, lightingCondition?: string, notes?: string): AnalysisSession;
    /**
     * Get sessions for user (with optional date filter)
     */
    getUserSessions(userId: string, days?: number): AnalysisSession[];
    /**
     * Store image metadata
     */
    createImageRecord(sessionId: string, userId: string, imagePath: string, width: number, height: number, imageHash?: string): ImageMetadata;
    /**
     * Get images for session
     */
    getSessionImages(sessionId: string): ImageMetadata[];
    /**
     * Store feature analysis results
     */
    createAnalysis(imageId: string, sessionId: string, userId: string, spotCount: number, textureScore: number, averagePigmentation: number, processingTimeMs?: number, confidenceScore?: number, algorithmVersion?: string): FeatureAnalysisResult;
    /**
     * Get analysis results for user (with optional filtering)
     */
    getUserAnalyses(userId: string, filter?: AnalysisQueryFilter): FeatureAnalysisResult[];
    /**
     * Get latest analysis for user
     */
    getLatestAnalysis(userId: string): FeatureAnalysisResult | undefined;
    /**
     * Set baseline for body area (deactivates previous active baseline)
     */
    setBaseline(userId: string, bodyArea: string, analysisId: string, sessionId: string, spotCount: number, textureScore: number, pigmentation: number): BaselineReference;
    /**
     * Get active baseline for body area
     */
    getActiveBaseline(userId: string, bodyArea: string): BaselineReference | undefined;
    /**
     * Create recommendation from analysis
     */
    createRecommendation(userId: string, analysisId: string, sessionId: string, status: 'Stable' | 'Regression Detected' | 'Alert' | 'Critical', advice: string, severity?: number): Recommendation;
    /**
     * Get unviewed recommendations for user
     */
    getUnviewedRecommendations(userId: string): Recommendation[];
    /**
     * Mark recommendation as viewed
     */
    markRecommationViewed(recommendationId: string): void;
    /**
     * Compare current analysis with baseline
     */
    compareWithBaseline(analysisId: string, userId: string, bodyArea: string): ComparisonResult | null;
    /**
     * Get trend data over time period
     */
    getTrendData(userId: string, days?: number): TrendData[];
    /**
     * Detect significant regressions
     */
    detectRegressions(userId: string): ComparisonResult[];
    /**
     * Get complete historical record for analysis
     */
    getHistoricalRecord(analysisId: string): HistoricalRecord | null;
    /**
     * Get pending sync records
     */
    getPendingSyncRecords(limit?: number): any[];
    /**
     * Mark sync record as synced
     */
    markSynced(syncRecordId: string): void;
    /**
     * Export all user data (for backup/migration)
     */
    exportUserData(userId: string): any;
    /**
     * Get database statistics
     */
    getStats(): {
        tables: string;
        records: number;
        size_kb: number;
    };
}
export default AnalysisDatabase;
//# sourceMappingURL=database.service.d.ts.map