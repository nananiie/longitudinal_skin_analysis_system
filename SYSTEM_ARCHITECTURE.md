# System Architecture & Connection Map

## Module Dependency Graph

```mermaid
graph TD
    A["🚀 index.ts<br/>(Entry Point)"] -->|initializes| B["🗄️ AnalysisDatabase<br/>(database.service.ts)"]
    A -->|creates| C["🌐 Express Server<br/>(index.ts)"]
    C -->|mounts| D["📡 API Router<br/>(routes/api.ts)"]
    
    D -->|endpoint| E["POST /api/analyze<br/>(Main Pipeline)"]
    D -->|endpoint| F["GET /api/comparison"]
    D -->|endpoint| G["GET /api/trends"]
    D -->|endpoint| H["GET /api/recommendations"]
    
    E -->|1.preprocess| I["📸 preprocessImage<br/>(modules/image/preprocess.ts)"]
    E -->|2.extract| J["🔍 extractFeatures<br/>(modules/image/featureExtraction.ts)"]
    E -->|3.store| B
    E -->|4.compare| K["📊 generateRecommendation<br/>(modules/comparison/rules.ts)"]
    
    I -->|uses| L["sharp library<br/>(image processing)"]
    J -->|uses| L
    
    B -->|reads/writes| M["💾 db-schema.sql<br/>(SQLite Database)"]
    
    K -->|uses| N["Types: FeatureResults<br/>(types/image.ts)"]
    J -->|outputs| N
    B -->|uses| O["Types: Database Interfaces<br/>(types/database.types.ts)"]
    
    style A fill:#ff9999
    style B fill:#99ccff
    style C fill:#99ccff
    style D fill:#99ff99
    style E fill:#ffcc99
    style M fill:#cc99ff
    style L fill:#ffffcc
```

## Data Flow Pipeline

```mermaid
sequenceDiagram
    participant Client as 📱 Client App
    participant Server as 🌐 Server<br/>index.ts
    participant Router as 📡 Router<br/>routes/api.ts
    participant Image as 📸 Image Module
    participant Features as 🔍 Features Module
    participant Database as 🗄️ Database Service
    participant Recommendation as 📊 Recommendation
    
    Client->>Server: POST /api/analyze<br/>{userId, imagePath}
    Server->>Router: Route to POST /analyze
    Router->>Router: Validate user & file
    Router->>Image: preprocessImage(path)
    Image->>Image: Resize 256x256<br/>Blur, Normalize
    Image-->>Router: PreprocessedImage
    Router->>Features: extractFeatures(buffer)
    Features-->>Router: {spotCount, texture, pigmentation}
    Router->>Database: createSession()
    Database->>Database: INSERT session
    Database-->>Router: session_id
    Router->>Database: createImageRecord()
    Database-->>Router: image_id
    Router->>Database: createAnalysis()
    Database-->>Router: analysis_id
    Router->>Database: getActiveBaseline()
    Database-->>Router: baseline (or null)
    Router->>Recommendation: generateRecommendation(current, baseline)
    Recommendation-->>Router: {status, advice}
    Router->>Database: createRecommendation()
    Database-->>Router: recommendation_id
    Router-->>Client: 201 {analysis, features, baseline, recommendation}
```

## Module Connections Matrix

| Source | Target | Purpose | Type |
|--------|--------|---------|------|
| index.ts | database.service.ts | Initialize & attach DB | Initialization |
| index.ts | routes/api.ts | Mount API routes | Server setup |
| routes/api.ts | database.service.ts | Store/retrieve data | Data layer |
| routes/api.ts | preprocess.ts | Image preprocessing | Image processing |
| routes/api.ts | featureExtraction.ts | Feature analysis | Image processing |
| routes/api.ts | rules.ts | Generate recommendations | Logic |
| preprocess.ts | sharp library | Image manipulation | External dep |
| featureExtraction.ts | sharp library | Image analysis | External dep |
| featureExtraction.ts | image.ts (types) | Type definitions | Types |
| database.service.ts | database.types.ts | Type definitions | Types |
| rules.ts | image.ts (types) | Feature types | Types |

## File Connectivity Checklist

✅ **Integrated Components:**
- [x] Entry point (src/index.ts) - Created
- [x] Express server setup - Integrated in index.ts
- [x] Database initialization - Wired in index.ts
- [x] API routes mounted - In index.ts
- [x] Image preprocessing - Connected via /api/analyze
- [x] Feature extraction - Connected via /api/analyze
- [x] Recommendation engine - Connected via /api/analyze
- [x] Database service - Connected to all routes

✅ **API Endpoints Connected:**
- [x] POST /api/analyze - Full pipeline
- [x] POST /api/users - User creation
- [x] GET /api/users/:userId - User profile
- [x] GET /api/sessions/:userId - Session history
- [x] GET /api/comparison/:userId/:bodyArea - Baseline comparison
- [x] GET /api/trends/:userId/:bodyArea - Trend analysis
- [x] GET /api/recommendations/:userId - View recommendations
- [x] PUT /api/recommendations/:id/viewed - Mark viewed
- [x] GET /api/baselines/:userId - All baselines
- [x] GET /health - Health check
- [x] GET /api/debug/stats - System stats

## How to Verify Connections Work

### 1. Build & Compile
```bash
npm run build
# Checks: TypeScript compilation, import resolution, type checking
```

### 2. Start Server
```bash
npm start
# Server runs on http://localhost:3000
```

### 3. Test Health Check
```bash
curl http://localhost:3000/health
# Response: {status: "healthy", database: "connected"}
```

### 4. Test Full Pipeline
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-001",
    "imagePath": "uploads/test/allie_forehead_wf_sample.jpg",
    "bodyArea": "forehead"
  }'
# Full analysis: preprocessing → features → storage → recommendation
```

### 5. View Trends
```bash
curl http://localhost:3000/api/trends/user-001/forehead
# Returns: Historical trend data across analyses
```

## Dependency Tree

```
index.ts
├── express (HTTP server)
├── cors (Cross-origin)
├── database.service.ts
│   ├── better-sqlite3 (Database)
│   ├── uuid (ID generation)
│   ├── fs (File I/O)
│   └── database.types.ts
├── routes/api.ts
│   ├── preprocess.ts
│   │   ├── sharp (Image processing)
│   │   └── image.ts types
│   ├── featureExtraction.ts
│   │   ├── sharp
│   │   └── image.ts types
│   ├── rules.ts
│   │   └── image.ts types
│   ├── database.service.ts
│   └── uuid, crypto (Utilities)
└── path, fs (Node utilities)
```

## System Status

| Component | Status | Notes |
|-----------|--------|-------|
| Entry Point | ✅ Created | src/index.ts |
| Server | ✅ Running | Express on port 3000 |
| Database | ✅ Connected | better-sqlite3 |
| Routes | ✅ Mounted | 11 API endpoints |
| Image Pipeline | ✅ Connected | preprocess → extract → recommend |
| Type System | ✅ Valid | All interfaces properly defined |
| Dependencies | ✅ Installed | express, sharp, better-sqlite3, etc |
