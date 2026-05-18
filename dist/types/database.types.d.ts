/**
 * Database Type Definitions
 * Aligns with SQLite schema and works with both Node.js and Android Room entities
 *
 * @file database.types.ts
 * @description TypeScript interfaces matching the SQLite schema
 */
/**
 * User profile and device tracking
 */
export interface User {
    user_id: string;
    created_at: string;
    updated_at: string;
    device_identifier: string;
    device_type: 'desktop' | 'android' | 'web';
    display_name?: string;
    sync_version: number;
}
/**
 * Analysis session - groups related images from single body area on single date
 */
export interface AnalysisSession {
    session_id: string;
    user_id: string;
    body_area: 'forehead' | 'cheek' | 'chin' | 'temple' | 'arm' | 'back' | 'chest' | 'other';
    session_date: string;
    lighting_condition?: string;
    device_orientation?: 'portrait' | 'landscape';
    notes?: string;
}
/**
 * Image metadata - references captured image file
 */
export interface ImageMetadata {
    image_id: string;
    session_id: string;
    user_id: string;
    image_path: string;
    image_hash?: string;
    image_size_kb?: number;
    width?: number;
    height?: number;
    created_at: string;
    stored_locally: boolean;
}
/**
 * Computed skin analysis features
 * Directly maps to the FeatureResults interface in image.ts
 */
export interface FeatureAnalysisResult {
    analysis_id: string;
    image_id: string;
    session_id: string;
    user_id: string;
    spot_count: number;
    texture_score: number;
    average_pigmentation: number;
    analysis_timestamp: string;
    processing_time_ms?: number;
    algorithm_version: string;
    confidence_score?: number;
}
/**
 * Baseline reference for longitudinal comparison
 * Snapshot of initial analysis for a body area
 */
export interface BaselineReference {
    baseline_id: string;
    user_id: string;
    body_area: string;
    analysis_id: string;
    session_id: string;
    baseline_spot_count: number;
    baseline_texture_score: number;
    baseline_pigmentation: number;
    established_date: string;
    is_active: boolean;
}
/**
 * Recommendation generated from analysis
 * Tracks system output and user engagement
 */
export interface Recommendation {
    recommendation_id: string;
    user_id: string;
    analysis_id: string;
    session_id: string;
    status: 'Stable' | 'Regression Detected' | 'Alert' | 'Critical';
    advice: string;
    severity: number;
    generated_at: string;
    viewed_at?: string;
    acted_upon: boolean;
    action_note?: string;
}
/**
 * Sync metadata for cross-device synchronization
 * Enables future Android-Desktop sync
 */
export interface SyncMetadata {
    sync_record_id: string;
    table_name: string;
    record_id: string;
    user_id?: string;
    operation: 'INSERT' | 'UPDATE' | 'DELETE';
    last_modified: string;
    synced_to_server: boolean;
    sync_timestamp?: string;
    device_origin: 'desktop' | 'android';
}
/**
 * Complete historical record for longitudinal analysis
 * Combines analysis with baseline for comparison
 */
export interface HistoricalRecord {
    session: AnalysisSession;
    images: ImageMetadata[];
    analysis: FeatureAnalysisResult;
    baseline?: BaselineReference;
    recommendation?: Recommendation;
    days_since_baseline?: number;
    change_from_baseline?: {
        spot_count_change: number;
        spot_count_pct: number;
        texture_change: number;
        pigmentation_change: number;
    };
}
/**
 * Trend data for visualization
 * Aggregated daily metrics over time period
 */
export interface TrendData {
    user_id: string;
    analysis_date: string;
    session_count: number;
    avg_spots: number;
    max_spots: number;
    min_spots: number;
    avg_texture: number;
    avg_pigmentation: number;
}
/**
 * Database configuration (portable across platforms)
 */
export interface DatabaseConfig {
    filename?: string;
    deviceType: 'desktop' | 'android';
    pragma?: {
        journal_mode?: 'WAL' | 'DELETE' | 'TRUNCATE';
        foreign_keys?: 'ON' | 'OFF';
        synchronous?: 'OFF' | 'NORMAL' | 'FULL';
        cache_size?: number;
    };
    timeout?: number;
}
/**
 * Export types for batch sync operations
 */
export interface DatabaseExport {
    export_date: string;
    user_id: string;
    data: {
        users: User[];
        sessions: AnalysisSession[];
        images: ImageMetadata[];
        analyses: FeatureAnalysisResult[];
        baselines: BaselineReference[];
        recommendations: Recommendation[];
    };
}
/**
 * Query filters for flexible retrieval
 */
export interface AnalysisQueryFilter {
    user_id?: string;
    body_area?: string;
    start_date?: string;
    end_date?: string;
    status?: 'Stable' | 'Regression Detected' | 'Alert' | 'Critical';
    min_confidence?: number;
    limit?: number;
    offset?: number;
}
/**
 * Comparison result between current and baseline
 */
export interface ComparisonResult {
    analysis_id: string;
    baseline_id: string;
    spot_count_baseline: number;
    spot_count_current: number;
    spot_count_delta: number;
    spot_count_pct_change: number;
    texture_baseline: number;
    texture_current: number;
    texture_delta: number;
    pigmentation_baseline: number;
    pigmentation_current: number;
    pigmentation_delta: number;
    days_elapsed: number;
    regression_detected: boolean;
}
/**
 * Migration metadata for version management
 */
export interface SchemaMigration {
    version_number: number;
    schema_description: string;
    deployment_date: string;
    desktop_compatible: string;
    android_compatible: string;
}
//# sourceMappingURL=database.types.d.ts.map