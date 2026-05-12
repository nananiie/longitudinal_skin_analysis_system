/**
 * SQLite Database Schema Initialization
 * Portable across Node.js (desktop) and Android environments
 * 
 * @file db-schema.sql
 * @description Pure SQL schema file - can be executed on any SQLite platform
 */

-- ============================================================================
-- INITIALIZATION SETUP (Run this first)
-- ============================================================================

-- Enable foreign keys for referential integrity
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users table: Tracks application users and device information
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  device_identifier TEXT UNIQUE NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('desktop', 'android', 'web')),
  display_name TEXT,
  sync_version INTEGER DEFAULT 1
);

-- Analysis Sessions: Groups multiple images from one body area on one date
CREATE TABLE IF NOT EXISTS analysis_sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  body_area TEXT NOT NULL,
  session_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  lighting_condition TEXT,
  device_orientation TEXT,
  notes TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CHECK (body_area IN ('forehead', 'cheek', 'chin', 'temple', 'arm', 'back', 'chest', 'other')),
  CHECK (device_orientation IN ('portrait', 'landscape') OR device_orientation IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_date 
  ON analysis_sessions(user_id, session_date DESC);

-- Image Metadata: Stores reference to captured images
CREATE TABLE IF NOT EXISTS images (
  image_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  image_path TEXT NOT NULL,
  image_hash TEXT UNIQUE,
  image_size_kb INTEGER,
  width INTEGER,
  height INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  stored_locally BOOLEAN DEFAULT 1,
  FOREIGN KEY (session_id) REFERENCES analysis_sessions(session_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_images_session ON images(session_id);
CREATE INDEX IF NOT EXISTS idx_images_hash ON images(image_hash);

-- Feature Analysis Results: Stores computed skin analysis metrics
CREATE TABLE IF NOT EXISTS feature_analyses (
  analysis_id TEXT PRIMARY KEY,
  image_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  
  spot_count INTEGER,
  texture_score REAL,
  average_pigmentation REAL,
  
  analysis_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  processing_time_ms INTEGER,
  algorithm_version TEXT DEFAULT 'v1.0',
  confidence_score REAL CHECK(confidence_score >= 0.0 AND confidence_score <= 1.0),
  
  FOREIGN KEY (image_id) REFERENCES images(image_id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES analysis_sessions(session_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_analyses_user_date 
  ON feature_analyses(user_id, analysis_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_image ON feature_analyses(image_id);

-- Baseline References: Stores initial snapshot for longitudinal comparison
CREATE TABLE IF NOT EXISTS baseline_references (
  baseline_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  body_area TEXT NOT NULL,
  analysis_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  
  baseline_spot_count INTEGER,
  baseline_texture_score REAL,
  baseline_pigmentation REAL,
  
  established_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT 1,
  
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (analysis_id) REFERENCES feature_analyses(analysis_id) ON DELETE RESTRICT,
  FOREIGN KEY (session_id) REFERENCES analysis_sessions(session_id) ON DELETE CASCADE,
  
  UNIQUE(user_id, body_area, is_active)
);

CREATE INDEX IF NOT EXISTS idx_baseline_user_area 
  ON baseline_references(user_id, body_area);

-- Recommendations: Stores system recommendations and user responses
CREATE TABLE IF NOT EXISTS recommendations (
  recommendation_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  analysis_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  
  status TEXT NOT NULL CHECK (status IN ('Stable', 'Regression Detected', 'Alert', 'Critical')),
  advice TEXT NOT NULL,
  severity REAL,
  
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  viewed_at DATETIME,
  acted_upon BOOLEAN DEFAULT 0,
  action_note TEXT,
  
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (analysis_id) REFERENCES feature_analyses(analysis_id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES analysis_sessions(session_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_recommendations_user_viewed 
  ON recommendations(user_id, viewed_at);

-- Sync Metadata: Enables cross-platform synchronization
CREATE TABLE IF NOT EXISTS sync_metadata (
  sync_record_id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  user_id TEXT,
  
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
  synced_to_server BOOLEAN DEFAULT 0,
  sync_timestamp DATETIME,
  device_origin TEXT NOT NULL CHECK (device_origin IN ('desktop', 'android')),
  
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE(table_name, record_id, operation, last_modified)
);

CREATE INDEX IF NOT EXISTS idx_sync_pending 
  ON sync_metadata(synced_to_server, last_modified);

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Historical trend data
CREATE VIEW IF NOT EXISTS user_trend_analysis AS
SELECT 
  fa.user_id,
  DATE(fa.analysis_timestamp) as analysis_date,
  COUNT(*) as session_count,
  AVG(fa.spot_count) as avg_spots,
  MAX(fa.spot_count) as max_spots,
  MIN(fa.spot_count) as min_spots,
  AVG(fa.texture_score) as avg_texture,
  AVG(fa.average_pigmentation) as avg_pigmentation
FROM feature_analyses fa
GROUP BY fa.user_id, DATE(fa.analysis_timestamp);

-- Recent analysis with recommendations
CREATE VIEW IF NOT EXISTS recent_analyses_with_recommendations AS
SELECT 
  fa.analysis_id,
  fa.user_id,
  fa.session_id,
  fa.analysis_timestamp,
  fa.spot_count,
  fa.texture_score,
  fa.average_pigmentation,
  r.status,
  r.advice,
  r.severity
FROM feature_analyses fa
LEFT JOIN recommendations r ON fa.analysis_id = r.analysis_id
ORDER BY fa.analysis_timestamp DESC;

-- ============================================================================
-- SCHEMA VERSIONING
-- ============================================================================

CREATE TABLE IF NOT EXISTS schema_versions (
  version_number INTEGER PRIMARY KEY,
  schema_description TEXT NOT NULL,
  deployment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  desktop_compatible TEXT,
  android_compatible TEXT
);

-- Insert current schema version
INSERT OR IGNORE INTO schema_versions 
  (version_number, schema_description, desktop_compatible, android_compatible)
VALUES 
  (1, 'Initial schema with core tables for longitudinal skin analysis', 'v1.0+', 'v1.0+');
