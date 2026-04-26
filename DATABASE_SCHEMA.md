# SQLite Schema for Longitudinal Skin Analysis System
## Desktop-Android Portable Design

### 1. SCHEMA OVERVIEW

This schema is designed for **maximum portability** between Node.js desktop environment and future Android (SQLite-based) implementation. All data types use standard SQLite primitives with explicit type annotations for clarity.

---

## 2. CORE TABLES

### 2.1 Users Table
```sql
CREATE TABLE users (
  user_id TEXT PRIMARY KEY,           -- UUID or unique identifier
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  device_identifier TEXT UNIQUE,      -- Hardware ID for cross-device sync
  device_type TEXT,                   -- 'desktop' | 'android' | 'web'
  sync_version INTEGER DEFAULT 1      -- Schema compatibility version
);
```

**Portability Notes:**
- `TEXT` for UUIDs (more portable than INTEGER auto-increment across platforms)
- `DATETIME` as ISO 8601 strings (standardized across all platforms)
- Device tracking enables future sync between desktop and Android

---

### 2.2 Analysis Sessions Table
```sql
CREATE TABLE analysis_sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  body_area TEXT NOT NULL,            -- e.g., 'forehead', 'cheek', 'arm'
  session_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  lighting_condition TEXT,             -- e.g., 'natural', 'fluorescent', 'led'
  device_orientation TEXT,             -- 'portrait' | 'landscape' (for mobile)
  notes TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CHECK (body_area IN ('forehead', 'cheek', 'chin', 'temple', 'arm', 'back', 'chest', 'other'))
);

CREATE INDEX idx_sessions_user_date ON analysis_sessions(user_id, session_date DESC);
```

**Portability Notes:**
- Captures contextual metadata (lighting, orientation) for consistent analysis
- `CHECK` constraints work identically in SQLite across platforms
- Indexed by user and date for efficient historical queries

---

### 2.3 Image Metadata Table
```sql
CREATE TABLE images (
  image_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  image_path TEXT NOT NULL,           -- Relative path for portability
  image_hash TEXT UNIQUE,             -- SHA256 for deduplication
  image_size_kb INTEGER,
  width INTEGER,
  height INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  stored_locally BOOLEAN DEFAULT 1,   -- 1=local, 0=remote/archived
  FOREIGN KEY (session_id) REFERENCES analysis_sessions(session_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_images_session ON images(session_id);
CREATE INDEX idx_images_hash ON images(image_hash);
```

**Portability Notes:**
- Relative paths allow databases to move between systems
- Hash field enables deduplication and integrity checking
- BOOLEAN stored as INTEGER (0/1) - SQLite native

---

### 2.4 Feature Analysis Results Table
```sql
CREATE TABLE feature_analyses (
  analysis_id TEXT PRIMARY KEY,
  image_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  
  -- Core measurements (from FeatureResults interface)
  spot_count INTEGER,
  texture_score REAL,                 -- LBP score
  average_pigmentation REAL,          -- 0.0-1.0 normalized value
  
  -- Extended metadata
  analysis_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  processing_time_ms INTEGER,         -- For performance tracking
  algorithm_version TEXT,             -- 'v1.0', 'v1.1', etc.
  confidence_score REAL CHECK(confidence_score >= 0.0 AND confidence_score <= 1.0),
  
  FOREIGN KEY (image_id) REFERENCES images(image_id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES analysis_sessions(session_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_analyses_user_date ON feature_analyses(user_id, analysis_timestamp DESC);
CREATE INDEX idx_analyses_image ON feature_analyses(image_id);
```

**Portability Notes:**
- Uses `REAL` for floating-point values (standard across platforms)
- Algorithm version tracking enables forward/backward compatibility
- Confidence scores for reliability assessment

---

### 2.5 Baseline Reference Table
```sql
CREATE TABLE baseline_references (
  baseline_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  body_area TEXT NOT NULL,
  analysis_id TEXT NOT NULL,          -- Reference to initial analysis
  session_id TEXT NOT NULL,
  
  -- Snapshot of baseline values
  baseline_spot_count INTEGER,
  baseline_texture_score REAL,
  baseline_pigmentation REAL,
  
  established_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT 1,
  
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (analysis_id) REFERENCES feature_analyses(analysis_id) ON DELETE RESTRICT,
  FOREIGN KEY (session_id) REFERENCES analysis_sessions(session_id) ON DELETE CASCADE,
  
  UNIQUE(user_id, body_area, is_active)  -- Only one active baseline per area
);

CREATE INDEX idx_baseline_user_area ON baseline_references(user_id, body_area);
```

**Portability Notes:**
- Denormalized baseline values for fast comparison queries
- `is_active` flag enables baseline history without deletion
- UNIQUE constraint prevents multiple active baselines

---

### 2.6 Recommendations Log Table
```sql
CREATE TABLE recommendations (
  recommendation_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  analysis_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  
  status TEXT NOT NULL,               -- 'Stable', 'Regression Detected', 'Alert'
  advice TEXT NOT NULL,
  severity REAL,                      -- 0.0 (low) to 1.0 (high)
  
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  viewed_at DATETIME,                 -- NULL until user views
  acted_upon BOOLEAN DEFAULT 0,
  action_note TEXT,
  
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (analysis_id) REFERENCES feature_analyses(analysis_id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES analysis_sessions(session_id) ON DELETE CASCADE,
  CHECK (status IN ('Stable', 'Regression Detected', 'Alert', 'Critical'))
);

CREATE INDEX idx_recommendations_user_viewed ON recommendations(user_id, viewed_at);
```

**Portability Notes:**
- Tracks recommendation lifecycle (generated → viewed → acted upon)
- Enables analytics on user engagement
- Severity numeric scale works across all platforms

---

### 2.7 Sync Metadata Table (For Cross-Device Sync)
```sql
CREATE TABLE sync_metadata (
  sync_record_id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  user_id TEXT,
  
  operation TEXT NOT NULL,            -- 'INSERT' | 'UPDATE' | 'DELETE'
  last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
  synced_to_server BOOLEAN DEFAULT 0,
  sync_timestamp DATETIME,
  device_origin TEXT NOT NULL,        -- 'desktop' | 'android'
  
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  
  UNIQUE(table_name, record_id, operation, last_modified)
);

CREATE INDEX idx_sync_pending ON sync_metadata(synced_to_server, last_modified);
```

**Portability Notes:**
- Essential for future Android-Desktop sync
- Works identically across platforms
- Tracks data lineage and update conflicts

---

## 3. INITIALIZATION TRIGGERS (For SQLite 3.31+)
These triggers maintain data consistency across platforms:

```sql
-- Auto-update timestamp on table modifications
CREATE TRIGGER update_users_timestamp
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE user_id = NEW.user_id;
END;

CREATE TRIGGER update_analyses_timestamp
AFTER UPDATE ON feature_analyses
FOR EACH ROW
BEGIN
  UPDATE feature_analyses SET analysis_timestamp = CURRENT_TIMESTAMP WHERE analysis_id = NEW.analysis_id;
END;

-- Sync metadata recording
CREATE TRIGGER sync_log_feature_insert
AFTER INSERT ON feature_analyses
FOR EACH ROW
BEGIN
  INSERT INTO sync_metadata (sync_record_id, table_name, record_id, user_id, operation, device_origin)
  VALUES (
    substr(hex(randomblob(16)), 1, 32),
    'feature_analyses',
    NEW.analysis_id,
    NEW.user_id,
    'INSERT',
    'desktop'
  );
END;
```

---

## 4. ANDROID MIGRATION SCRIPT

When deploying to Android, update `device_origin` value:

```sql
-- Android migration (run on Android first time)
UPDATE users SET device_type = 'android' WHERE device_identifier = ?;

-- Ensure Android changes are marked correctly
CREATE TRIGGER sync_log_feature_insert_android
AFTER INSERT ON feature_analyses
FOR EACH ROW
BEGIN
  INSERT INTO sync_metadata (sync_record_id, table_name, record_id, user_id, operation, device_origin)
  VALUES (
    substr(hex(randomblob(16)), 1, 32),
    'feature_analyses',
    NEW.analysis_id,
    NEW.user_id,
    'INSERT',
    'android'
  );
END;
```

---

## 5. DATA TYPE COMPATIBILITY MATRIX

| SQLite Type | Node.js Driver | Android (Room/SQLite) | Notes |
|-------------|-----------------|----------------------|-------|
| TEXT (UUID) | string          | String               | **RECOMMENDED** for IDs |
| INTEGER     | number          | Long/Int             | Standard |
| REAL        | number          | Double/Float         | Use for scores/decimals |
| DATETIME (ISO 8601) | Date    | LocalDateTime/Calendar | Store as TEXT ISO format |
| BLOB        | Buffer          | ByteArray            | For image data if needed |
| BOOLEAN     | boolean → 0/1   | Boolean → 0/1        | SQLite native representation |

---

## 6. RECOMMENDED CONFIGURATION FOR PORTABILITY

### SQLite Connection Options (Node.js)
```javascript
{
  filename: ':memory:' or './data/analysis.db',
  mode: Database.READONLY | Database.READWRITE | Database.CREATE,
  fileMustExist: false,
  timeout: 5000,
  trace: null,
  
  // Portability settings
  pragma: {
    journal_mode: 'WAL',        // Write-Ahead Logging (safe, cross-platform)
    foreign_keys: 'ON',         // Enforce referential integrity
    synchronous: 'NORMAL',      // Balance safety/performance
    cache_size: 2000,
    temp_store: 'MEMORY'
  }
}
```

### Android Configuration (Room/SQLite)
```kotlin
Database.builder(
    context,
    AppDatabase::class.java,
    "analysis.db"
).fallbackToDestructiveMigration().build()

// Enable same pragmas via callback:
setJournalMode(JournalMode.WAL)
```

---

## 7. QUERY EXAMPLES

### Historical Trend Analysis (Works identically on desktop & Android)
```sql
-- Get spot count trend for a user over last 30 days
SELECT 
  DATE(fa.analysis_timestamp) as analysis_date,
  COUNT(*) as session_count,
  AVG(fa.spot_count) as avg_spots,
  MAX(fa.spot_count) as max_spots
FROM feature_analyses fa
WHERE fa.user_id = ? 
  AND fa.analysis_timestamp >= datetime('now', '-30 days')
GROUP BY DATE(fa.analysis_timestamp)
ORDER BY analysis_date DESC;
```

### Regression Detection
```sql
-- Identify significant changes from baseline
SELECT 
  fa.analysis_id,
  fa.session_id,
  fa.spot_count,
  br.baseline_spot_count,
  ROUND((CAST(fa.spot_count - br.baseline_spot_count) / br.baseline_spot_count) * 100, 1) as pct_change
FROM feature_analyses fa
JOIN baseline_references br ON fa.user_id = br.user_id AND fa.session_id IS NOT NULL
WHERE fa.user_id = ?
  AND (CAST(fa.spot_count - br.baseline_spot_count) / br.baseline_spot_count) > 0.2;
```

---

## 8. SCHEMA VERSIONING

Store in `sync_metadata` or config:
```sql
-- Version 1 (Current): Base schema
-- Version 2: Add UV index tracking to analysis_sessions
-- Version 3: Add dermatologist notes table

CREATE TABLE schema_versions (
  version_number INTEGER PRIMARY KEY,
  schema_description TEXT,
  deployment_date DATETIME,
  desktop_compatible TEXT,    -- e.g., "v1.0+"
  android_compatible TEXT     -- e.g., "v1.0+"
);
```

---

## 9. PERFORMANCE TUNING FOR PORTABILITY

1. **Index Strategy**: Created on commonly queried columns (user_id, dates, status)
2. **Query Optimization**: Use prepared statements (works on all platforms)
3. **Database Size**: Typical 1-year history ~50MB (well within Android limits)
4. **Backup Strategy**: Export as JSON before major upgrades

---

## 10. ANDROID-SPECIFIC CONSIDERATIONS

- **File Path**: Use `context.getDatabasesPath()` or app's private directory
- **Permissions**: `android:name="android.permission.WRITE_EXTERNAL_STORAGE"`
- **Cursor Queries**: Android uses Cursor instead of direct query results
- **Thread Safety**: Use `@Query` annotations in Room DAOs
- **Encryption**: Consider SQLCipher for Android HIPAA compliance

---

## 11. NEXT STEPS

1. ✅ Implement Node.js database initialization module
2. ✅ Create TypeScript DAOs matching Android Room entities
3. ✅ Build export/import functionality for sync
4. ✅ Set up migration scripts for schema updates
5. ✅ Test cross-platform data integrity
