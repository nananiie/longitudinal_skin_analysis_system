# PixelDerm — System Architecture Flowchart

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER'S ANDROID PHONE                         │
│                        PixelDerm Mobile App                         │
│                         (React Native)                              │
│                                                                     │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌────────────┐  │
│   │  Camera  │───►│  Capture │───►│  Sun     │───►│  Send to   │  │
│   │          │    │  Photo   │    │  Profile │    │  Backend   │  │
│   └──────────┘    └──────────┘    │  (opt.)  │    └─────┬──────┘  │
│                                   └──────────┘          │          │
│                                                          │ HTTPS    │
└──────────────────────────────────────────────────────────┼─────────┘
                                                           │
                                                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  RAILWAY — NODE.JS BACKEND                          │
│           longitudinalskinanalysissystem-production.up.railway.app  │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │                    POST /api/analyze/upload                  │  │
│   └───────────────────────────┬─────────────────────────────────┘  │
│                               │                                     │
│         ┌─────────────────────▼──────────────────────┐             │
│         │           1. SKIN DETECTION                 │             │
│         │   Is this actually a photo of skin?         │             │
│         └──────────┬──────────────────┬───────────────┘             │
│                    │ YES              │ NO                           │
│                    ▼                  ▼                              │
│         ┌──────────────────┐  ┌─────────────────┐                  │
│         │ 2. PREPROCESS    │  │ Reject image    │                  │
│         │ Resize → 256×256 │  │ Return error    │                  │
│         │ Reduce noise     │  └─────────────────┘                  │
│         │ Normalize        │                                        │
│         └────────┬─────────┘                                        │
│                  │                                                   │
│                  ▼                                                   │
│         ┌──────────────────────────────────────────┐                │
│         │           3. FEATURE EXTRACTION           │                │
│         │                                           │                │
│         │  ┌─────────────────────────────────────┐ │                │
│         │  │ Adaptive Thresholding                │ │                │
│         │  │ Local brightness per 101×101 block   │ │                │
│         │  └──────────────────┬──────────────────┘ │                │
│         │                     │                     │                │
│         │         ┌───────────┼───────────┐         │                │
│         │         ▼           ▼           ▼         │                │
│         │  ┌──────────┐ ┌─────────┐ ┌──────────┐  │                │
│         │  │  CCL     │ │  LBP    │ │Pigment-  │  │                │
│         │  │ Spot     │ │Texture  │ │ation     │  │                │
│         │  │ Count    │ │ Score   │ │ Level    │  │                │
│         │  └──────────┘ └─────────┘ └──────────┘  │                │
│         └──────────┬───────────────────────────────┘                │
│                    │  3 features extracted                           │
│                    ▼                                                 │
│         ┌──────────────────┐                                         │
│         │ 4. DATABASE      │                                         │
│         │ Save session,    │◄──── SQLite on Railway Volume           │
│         │ image, analysis, │                                         │
│         │ baseline         │                                         │
│         └────────┬─────────┘                                         │
│                  │                                                   │
│         ┌────────▼──────────────────────────────────────────────┐   │
│         │              5. PARALLEL PROCESSING                    │   │
│         └────┬────────────────────┬──────────────────────┬──────┘   │
│              │                    │                       │          │
│              ▼                    ▼                       ▼          │
│   ┌──────────────────┐  ┌────────────────────┐  ┌──────────────┐   │
│   │ Rule-based Check │  │  ML Engine Call    │  │  Groq AI     │   │
│   │                  │  │  (Python service)  │  │  API Call    │   │
│   │ Spot count +20%? │  │  Random Forest     │  │  (external)  │   │
│   │ → Regression     │  │  UV damage score   │  │  Personalized│   │
│   │ Spots > 50?      │  │  0.0 – 1.0         │  │  advice text │   │
│   │ → Alert          │  │                    │  │              │   │
│   └────────┬─────────┘  └────────┬───────────┘  └──────┬───────┘   │
│            │                     │                      │            │
│            └─────────────────────┴──────────────────────┘            │
│                                  │ Combine all results               │
│                                  ▼                                   │
│                    ┌─────────────────────────┐                       │
│                    │   6. RETURN RESPONSE    │                       │
│                    │   features, skin score, │                       │
│                    │   risk level, AI advice │                       │
│                    └────────────┬────────────┘                       │
└─────────────────────────────────┼───────────────────────────────────┘
                                  │ HTTPS response
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        USER'S ANDROID PHONE                         │
│                                                                     │
│   ┌──────────────────────────────────────────────────────────────┐ │
│   │                    RESULTS SCREEN                            │ │
│   │                                                              │ │
│   │   Skin Score: 76%          Risk Level: LOW                   │ │
│   │   ─────────────────────────────────────────────             │ │
│   │   Spot Count    │  Texture Score  │  Pigmentation            │ │
│   │   ─────────────────────────────────────────────             │ │
│   │   vs Baseline: Stable / Regression Detected / Alert         │ │
│   │   ─────────────────────────────────────────────             │ │
│   │   AI Advice: "Based on your scan..."                         │ │
│   └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════
                    PYTHON ML SERVICE (separate)
         stunning-tenderness-production-841b.up.railway.app
═══════════════════════════════════════════════════════════════════════

   Node.js Backend ──► POST /analyze ──► Random Forest Model
                                              │
                         ┌────────────────────┘
                         │  Input: spotCount, textureScore, pigmentation
                         ▼
                  ┌─────────────────┐
                  │  rf_model.pkl   │  ← Pre-trained model
                  │  scaler.pkl     │  ← Feature normalizer
                  └────────┬────────┘
                           │
                           ▼
                  damage_score: 0.0 – 1.0
                  level: Minimal / Mild / Moderate / Severe
                  advice: "Apply SPF 30+..."
                           │
                           ▼
                  ◄── JSON response to Node.js


═══════════════════════════════════════════════════════════════════════
                         DATA STORAGE
═══════════════════════════════════════════════════════════════════════

   SQLite Database (Railway Volume /app/data/analysis.db)
   ┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
   │   users     │────►│  sessions   │────►│    analyses     │
   │  user_id    │     │ session_id  │     │  analysis_id    │
   │  device_id  │     │ body_area   │     │  spot_count     │
   │  name       │     │ created_at  │     │  texture_score  │
   └─────────────┘     └─────────────┘     │  pigmentation   │
          │                                └────────┬────────┘
          │                                         │
          ▼                                         ▼
   ┌─────────────────┐                   ┌─────────────────────┐
   │   baselines     │                   │  recommendations    │
   │  baseline_id    │                   │  recommendation_id  │
   │  body_area      │                   │  status             │
   │  spot_count     │                   │  advice             │
   │  texture_score  │                   │  viewed             │
   │  pigmentation   │                   └─────────────────────┘
   └─────────────────┘
```
