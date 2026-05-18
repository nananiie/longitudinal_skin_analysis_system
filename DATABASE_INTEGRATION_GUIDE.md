# SQLite Database Setup & Integration Guide

## Installation & Configuration

### 1. Package Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    "better-sqlite3": "^9.2.0",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.8",
    "@types/node": "^20.0.0"
  }
}
```

Install:
```bash
npm install && npm install --save-dev @types/better-sqlite3 @types/node
```

### 2. Project Structure

```
src/
├── database/
│   └── db-schema.sql              # Pure SQL schema (platform-independent)
├── types/
│   ├── image.ts                   # Existing image types
│   └── database.types.ts           # NEW: Database interfaces
├── services/
│   ├── database.service.ts         # NEW: Main database service
│   └── database.integration.example.ts  # NEW: Usage examples
├── modules/
│   └── image/
│       ├── featureExtraction.ts
│       ├── preprocess.ts
│       └── testPreprocess.ts
└── ...

data/
└── analysis.db                    # SQLite database file (auto-created)
```

---

## Quick Start

### Step 1: Initialize Database (Desktop)

```typescript
import AnalysisDatabase from './services/database.service.js';

// Create and initialize database
const db = new AnalysisDatabase({
  filename: './data/analysis.db',
  deviceType: 'desktop',
  pragma: {
    journal_mode: 'WAL',      // Write-Ahead Logging for reliability
    foreign_keys: 'ON',       // Enforce referential integrity
    synchronous: 'NORMAL'     // Balance safety and performance
  }
});

await db.initialize();  // Creates schema
```

### Step 2: Create User & Session

```typescript
// Create user (first app launch)
const user = db.createUser('desktop-device-001', 'desktop');

// Create analysis session
const session = db.createSession(
  user.user_id,
  'forehead',           // body area
  'natural',            // lighting condition
  'Morning selfie'      // notes
);
```

### Step 3: Process Image & Store Analysis

```typescript
import { preprocessImage } from './modules/image/preprocess.js';
import { extractFeatures } from './modules/image/featureExtraction.js';

// Process image
const preprocessed = await preprocessImage('./uploads/test/image.jpg');
const features = await extractFeatures(preprocessed.buffer);

// Store in database
const image = db.createImageRecord(
  session.session_id,
  user.user_id,
  './uploads/test/image.jpg',
  preprocessed.width,
  preprocessed.height
);

const analysis = db.createAnalysis(
  image.image_id,
  session.session_id,
  user.user_id,
  features.spotCount,
  features.textureScore,
  features.averagePigmentation
);
```

### Step 4: Set Baseline & Compare

```typescript
// First analysis - establish baseline
const baseline = db.setBaseline(
  user.user_id,
  'forehead',
  analysis.analysis_id,
  session.session_id,
  features.spotCount,
  features.textureScore,
  features.averagePigmentation
);

// Later analyses - compare with baseline
const comparison = db.compareWithBaseline(
  analysis.analysis_id,
  user.user_id,
  'forehead'
);

if (comparison?.regression_detected) {
  console.log(`⚠️ Spots increased ${comparison.spot_count_pct_change.toFixed(1)}%`);
}
```

---

## Data Schema Overview

### Key Tables

| Table | Purpose | Indexed By |
|-------|---------|-----------|
| `users` | User profiles & device tracking | device_identifier |
| `analysis_sessions` | Groups images from one body area/date | user_id, session_date |
| `images` | Image metadata & file references | session_id, image_hash |
| `feature_analyses` | Computed skin metrics | user_id, analysis_timestamp |
| `baseline_references` | Initial readings for comparison | user_id, body_area |
| `recommendations` | System advice & user responses | user_id, viewed_at |
| `sync_metadata` | Cross-device sync tracking | synced_to_server, last_modified |

### Data Types (Cross-Platform Compatible)

- **UUIDs**: Stored as TEXT (works universally)
- **Timestamps**: ISO 8601 strings (standardized)
- **Numbers**: INTEGER/REAL (standard SQLite)
- **Booleans**: 0/1 integers (SQLite native)

---

## Query Examples

### Get Historical Trend (30 days)

```typescript
const trends = db.getTrendData(userId, 30);

// Returns array of daily aggregates:
// [
//   { analysis_date: '2024-01-15', avg_spots: 42, max_spots: 58, ... },
//   { analysis_date: '2024-01-14', avg_spots: 40, max_spots: 55, ... },
//   ...
// ]
```

### Detect Regressions

```typescript
const regressions = db.detectRegressions(userId);

// Returns analyses with >20% increase from baseline
regressions.forEach(reg => {
  console.log(`Spots: ${reg.spot_count_baseline} → ${reg.spot_count_current} `);
  console.log(`Change: ${reg.spot_count_pct_change.toFixed(1)}%`);
});
```

### Generate Complete Historical Record

```typescript
const record = db.getHistoricalRecord(analysisId);

// Contains:
// - session metadata
// - image references
// - analysis results
// - baseline comparison
// - recommendation
// - calculated deltas
```

---

## Android Integration (Future Phase)

### Data Portability Checklist

✅ **Schema**: Pure SQL, works identically on all platforms
✅ **Data Types**: Standard SQLite types
✅ **Paths**: Relative (for portability)
✅ **UUIDs**: TEXT format (cross-platform)
✅ **Timestamps**: ISO 8601 strings
✅ **Sync Metadata**: Tracks device origin

### Android Migration Steps

1. **Copy Database File**
   ```bash
   # Desktop -> Android
   cp ./data/analysis.db /data/data/com.app/databases/analysis.db
   ```

2. **Update Device Type**
   ```sql
   UPDATE users SET device_type = 'android' WHERE user_id = ?;
   ```

3. **Create Android DAOs (Room)**
   ```kotlin
   @Entity
   data class UserEntity(
       @PrimaryKey val userId: String,
       val deviceType: String,
       @ColumnInfo(name = "created_at") val createdAt: String
   )

   @Dao
   interface UserDao {
       @Query("SELECT * FROM users WHERE user_id = ?")
       fun getUser(userId: String): Flow<UserEntity>
   }
   ```

4. **Enable Sync Tracking**
   Sync metadata table automatically records Android origin

---

## Performance Tuning

### Database Size Estimates

- **1 Day** (8 analyses): ~50 KB
- **1 Month**: ~1.5 MB
- **1 Year**: ~18 MB
- **5 Years**: ~90 MB

All comfortably within mobile storage limits.

### Optimization Tips

1. **Indexes**: Created on high-frequency queries
2. **WAL Mode**: Improves concurrent access
3. **Pragma Cache**: Larger cache_size (2000 pages) for trending queries
4. **Prepared Statements**: Used throughout for performance

### Cleanup (Optional)

```typescript
// Archive old recommendations (>1 year)
db.exec(`
  DELETE FROM recommendations
  WHERE generated_at < datetime('now', '-365 days')
`);
```

---

## Common Patterns

### Pattern 1: Single Body Area Tracking
```typescript
// Forehead-only tracking
const session = db.createSession(userId, 'forehead');
const analysis = db.createAnalysis(...);
const baseline = db.getActiveBaseline(userId, 'forehead');
```

### Pattern 2: Multi-Region Comparison
```typescript
// Track multiple body areas
const areas = ['forehead', 'cheek', 'chin'];

for (const area of areas) {
  const session = db.createSession(userId, area);
  // ... process each area independently
}

// Later: compare trends across areas
areas.forEach(area => {
  const baseline = db.getActiveBaseline(userId, area);
  // Generate area-specific recommendations
});
```

### Pattern 3: Daily Batch Processing
```typescript
// Morning skincare routine analysis
const session = db.createSession(userId, 'forehead', 'natural', 'Morning routine');

// Capture 3 angles
const cameras = ['front', 'left', 'right'];
for (const camera of cameras) {
  const image = await captureImage(camera);
  const analysis = await analyzeAndStore(db, userId, image);
}

// Generate consolidated recommendation
const trend = db.getTrendData(userId, 7);
// Generate weekly summary
```

### Pattern 4: Baseline Refresh
```typescript
// Reset baseline after skincare intervention
const oldBaseline = db.getActiveBaseline(userId, 'forehead');

// Deactivated automatically when setting new:
const newBaseline = db.setBaseline(userId, 'forehead', ...);

// Historical baseline preserved for audit trail
db.db.prepare(`
  SELECT * FROM baseline_references WHERE user_id = ?
`).all(userId);  // Shows all baselines including historical
```

---

## Error Handling

```typescript
try {
  await db.initialize();
  const analysis = db.createAnalysis(...);
  
} catch (error) {
  if (error.message.includes('UNIQUE constraint')) {
    console.error('Duplicate database record');
    // Handle duplicate image hash
  } else if (error.message.includes('FOREIGN KEY')) {
    console.error('Referenced record not found');
    // Handle missing session/user
  } else {
    console.error('Database error:', error);
  }
}
```

---

## Testing

### Unit Test Example

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import AnalysisDatabase from './database.service.js';

describe('AnalysisDatabase', () => {
  let db: AnalysisDatabase;

  beforeEach(async () => {
    db = new AnalysisDatabase({
      filename: ':memory:',  // In-memory for tests
      deviceType: 'desktop'
    });
    await db.initialize();
  });

  afterEach(() => {
    db.close();
  });

  it('should create user', () => {
    const user = db.createUser('test-device', 'desktop');
    expect(user.user_id).toBeDefined();
    expect(user.device_type).toBe('desktop');
  });

  it('should create session and analysis', () => {
    const user = db.createUser('test-device', 'desktop');
    const session = db.createSession(user.user_id, 'forehead');
    
    expect(session.session_id).toBeDefined();
    expect(session.body_area).toBe('forehead');
  });

  it('should detect regression', () => {
    // Setup test data
    const user = db.createUser('test-device', 'desktop');
    const session = db.createSession(user.user_id, 'forehead');
    
    // Create baseline
    const baseline = db.setBaseline(user.user_id, 'forehead', ...);
    
    // Create higher analysis
    const analysis = db.createAnalysis(
      ..., 60, // spot_count increase
      baseline.baseline_texture_score
    );
    
    // Check regression
    const comparison = db.compareWithBaseline(...);
    expect(comparison?.regression_detected).toBe(true);
  });
});
```

---

## Troubleshooting

### Issue: "Database is locked"
- **Cause**: Concurrent access without WAL mode
- **Solution**: Ensure WAL mode enabled
```typescript
db.pragma('journal_mode = WAL');
```

### Issue: "FOREIGN KEY constraint failed"
- **Cause**: Orphaned records or wrong order
- **Solution**: Check parent record exists before insert
```typescript
const user = db.getUserByDevice(deviceId);
if (!user) user = db.createUser(deviceId, 'desktop');
```

### Issue: Missing timestamps
- **Cause**: Not using ISO 8601 format
- **Solution**: Use JavaScript Date toISOString()
```typescript
const now = new Date().toISOString();  // ✓ Correct
```

---

## Migration to Production

### Pre-Production Checklist

- [ ] Test with expected data volume (~1 year)
- [ ] Verify backup strategy
- [ ] Test Android export/import
- [ ] Performance test with concurrent analyses
- [ ] Document baseline reset procedure
- [ ] Archive strategy for old recommendations

### Backup Strategy

```typescript
// Regular backups (daily)
const backup = db.exportUserData(userId);
fs.writeFileSync(`./backups/user_${userId}_${Date.now()}.json`, 
  JSON.stringify(backup, null, 2)
);
```

---

## Next Steps

1. ✅ Run `npm install` to add dependencies
2. ✅ Run the integration example to test setup
3. ✅ Integrate with existing image processing pipeline
4. ✅ Implement UI for viewing trends and recommendations
5. ✅ Plan Android Room DAO layer
6. ✅ Set up sync service for cross-device support

See `database.integration.example.ts` for working code samples.
