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
  user_id: string;           // UUID v4
  created_at: string;        // ISO 8601 datetime
  updated_at: string;        // ISO 8601 datetime
  device_identifier: string; // Hardware ID for cross-device sync
  device_type: 'desktop' | 'android' | 'web';
  sync_version: number;
}

/**
 * Analysis session - groups related images from single body area on single date
 */
export interface AnalysisSession {
  session_id: string;
  user_id: string;
  body_area: 'forehead' | 'cheek' | 'chin' | 'temple' | 'arm' | 'back' | 'chest' | 'other';
  session_date: string;      // ISO 8601 datetime
  lighting_condition?: string; // e.g., 'natural', 'fluorescent', 'led'
  device_orientation?: 'portrait' | 'landscape'; // Mobile device orientation
  notes?: string;
}

/**
 * Image metadata - references captured image file
 */
export interface ImageMetadata {
  image_id: string;
  session_id: string;
  user_id: string;
  image_path: string;        // Relative path for portability
  image_hash?: string;       // SHA256 hash for deduplication
  image_size_kb?: number;
  width?: number;
  height?: number;
  created_at: string;        // ISO 8601 datetime
  stored_locally: boolean;   // true = local database, false = archived/remote
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
  
  // Core measurements from FeatureResults interface
  spot_count: number;        // Connected Component Labeling result
  texture_score: number;     // Local Binary Pattern score
  average_pigmentation: number; // 0.0-1.0 normalized
  
  // Metadata
  analysis_timestamp: string; // ISO 8601 datetime
  processing_time_ms?: number;
  algorithm_version: string; // e.g., 'v1.0'
  confidence_score?: number;  // 0.0-1.0
}

/**
 * Baseline reference for longitudinal comparison
 * Snapshot of initial analysis for a body area
 */
export interface BaselineReference {
  baseline_id: string;
  user_id: string;
  body_area: string;
  analysis_id: string;       // Links to initial feature analysis
  session_id: string;
  
  // Baseline snapshots
  baseline_spot_count: number;
  baseline_texture_score: number;
  baseline_pigmentation: number;
  
  established_date: string;  // ISO 8601 datetime
  is_active: boolean;        // Only one active baseline per body area
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
  advice: string;            // Human-readable recommendation text
  severity: number;          // 0.0 (low) to 1.0 (high)
  
  generated_at: string;      // ISO 8601 datetime
  viewed_at?: string;        // ISO 8601 datetime (null until user views)
  acted_upon: boolean;       // User taken action on recommendation
  action_note?: string;      // User's note about action taken
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
  last_modified: string;     // ISO 8601 datetime
  synced_to_server: boolean;
  sync_timestamp?: string;   // ISO 8601 datetime
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
  analysis_date: string;     // YYYY-MM-DD
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
  filename?: string;         // Path to .db file, ':memory:' for in-memory
  deviceType: 'desktop' | 'android';
  pragma?: {
    journal_mode?: 'WAL' | 'DELETE' | 'TRUNCATE';
    foreign_keys?: 'ON' | 'OFF';
    synchronous?: 'OFF' | 'NORMAL' | 'FULL';
    cache_size?: number;
  };
  timeout?: number;          // Connection timeout in ms
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
  start_date?: string;       // ISO 8601
  end_date?: string;         // ISO 8601
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
  regression_detected: boolean; // > 20% increase in spots
}

/**
 * Migration metadata for version management
 */
export interface SchemaMigration {
  version_number: number;
  schema_description: string;
  deployment_date: string;
  desktop_compatible: string;  // e.g., "v1.0+"
  android_compatible: string;  // e.g., "v1.0+"
}
