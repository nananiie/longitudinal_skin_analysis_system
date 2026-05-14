# PixelDerm — Full Documentation
**Longitudinal Skin Analysis System**
Last updated: May 2026

---

## Table of Contents
1. [Summary](#1-summary)
2. [How the System Works](#2-how-the-system-works)
3. [User Manual — Mobile App](#3-user-manual--mobile-app)
4. [User Manual — runAnalysis Script](#4-user-manual--runanalysis-script)
5. [API Reference](#5-api-reference)
6. [Deployment Info](#6-deployment-info)
7. [Glossary](#7-glossary)

---

## 1. Summary

**PixelDerm** is a mobile application that helps users monitor their skin health over time using their phone's camera. It takes a photo of a skin area, analyzes it using computer vision and machine learning, and gives personalized recommendations about sun damage and skin condition.

### What it does in simple terms:
- You take a photo of your skin (forehead, cheek, arm, etc.)
- The app measures three things in the photo: how many spots/blemishes it sees, how rough or smooth the texture looks, and how dark the pigmentation is
- It compares your current scan to your very first scan (your "baseline") to track changes over time
- It gives you a risk level (Low / Moderate / High) and personalized advice
- An AI (powered by Groq) writes a custom recommendation paragraph just for you based on all your data

### Who it's for:
Anyone who wants to track skin changes over time — particularly useful for monitoring sun damage, tracking skincare progress, or flagging concerns to discuss with a dermatologist.

---

## 2. How the System Works

The system has three parts that work together:

```
  [Your Phone]                [Railway Server 1]          [Railway Server 2]
  PixelDerm App   ────────►   Node.js Backend    ────────►  Python ML Engine
  (React Native)              (Express + SQLite)            (FastAPI + RandomForest)
                                      │
                                      ▼
                               [Groq AI API]
                           (Personalized advice)
```

### Step-by-step flow when you take a photo:

**Step 1 — You take a photo**
You point your camera at a skin area and tap Analyze. The photo goes to the backend server over the internet.

**Step 2 — Skin detection**
The server checks if the photo actually shows skin. If you accidentally photographed a wall or your shirt, it rejects it and asks you to retake.

**Step 3 — Image preprocessing**
The image is resized to 256×256 pixels, noise is reduced, and it's prepared for analysis.

**Step 4 — Feature extraction**
Four sub-steps run on the image to produce three measurements:

- **Adaptive Thresholding** — before counting anything, the system figures out what counts as a "dark spot" for each pixel individually. Instead of one fixed brightness cutoff for the whole image, it looks at a 101×101 pixel block around each pixel and calculates the average brightness in that block minus a constant (40). This means a spot in a naturally darker area of the image is still detected correctly, even if the lighting is uneven. This is what makes the spot detection reliable across different lighting conditions and skin tones.
- **Spot Count** — using the threshold map above, dark pixels that fall below their local threshold are grouped together using Connected Component Labeling (CCL). Each connected group of 15+ pixels counts as one spot.
- **Texture Score** — measures how uneven or rough the skin surface looks using Local Binary Patterns (LBP)
- **Pigmentation** — measures the average darkness of the skin tone

**Step 5 — Baseline comparison**
Your very first scan for each body area becomes your "baseline." Every scan after that is compared to it to detect changes.

**Step 6 — Rule-based recommendation**
A set of rules checks if your spot count has increased by more than 20% since your baseline, or if it's critically high (over 50 spots). This gives a quick status: Stable or Alert.

**Step 7 — Machine learning score**
The three measurements are sent to the Python ML service, which uses a Random Forest model trained on skin data to calculate a UV damage score (0–100%).

**Step 8 — AI recommendation**
All the data (features, baseline comparison, ML score, your sun habits) is sent to Groq AI, which writes a personalized paragraph of advice just for you.

**Step 9 — Results saved and returned**
Everything is saved to a database and sent back to your phone for display.

---

## 3. User Manual — Mobile App

### First time setup

1. **Install the app**
   - Get the `app-release.apk` file
   - On your Android phone: Settings → Security → enable "Install unknown apps"
   - Open the APK file to install it
   - Open PixelDerm

2. **Enter your name**
   - The app will ask for your name on first launch
   - This is stored locally on your device

---

### Taking a scan

1. Tap the **camera button** on the home screen
2. Point your camera **directly at the skin area** you want to scan (hold it close, 10–20 cm away)
3. Make sure you have **good lighting** — natural light or a bright indoor light works best. Avoid shadows
4. Tap the shutter button to take the photo

> If you get an error saying "Image does not appear to be skin" — retake the photo closer to your skin, making sure the skin fills most of the frame.

---

### Understanding your results

After scanning, you will see:

| Result | What it means |
|--------|--------------|
| **Skin Score** | Overall skin health score out of 100. Higher = healthier |
| **Risk Level: Low** | Score ≥ 70. Skin looks healthy, keep up your routine |
| **Risk Level: Moderate** | Score 40–69. Some concerns, follow the advice given |
| **Risk Level: High** | Score < 40. Significant concerns, consider seeing a dermatologist |
| **Spot Count** | Number of visible spots/marks detected in the photo |
| **Texture Score** | How uneven the skin surface is (shown as %) |
| **Pigmentation** | Average darkness level of the skin (shown as %) |

---

### Longitudinal tracking (comparing over time)

- Your **first scan** of each body area automatically becomes your **baseline**
- Every scan after that is compared to your baseline
- If spot count increases by more than 20%, you will see a **Regression Detected** warning
- If spot count exceeds 50, you will see an **Alert** to consider consulting a dermatologist
- Use the **Trends** section to see a graph of your changes over time

---

### Body areas you can scan

| Area | What to scan |
|------|-------------|
| Forehead | Upper face, above eyebrows |
| Cheek | Side of the face |
| Chin | Lower face area |
| Temple | Side of head near the eye |
| Arm | Forearm or upper arm |
| Back | Upper or lower back |
| Chest | Chest/décolletage area |

> Tip: Scan the same body area each time for accurate tracking. Switching between areas resets the comparison.

---

### Sun profile (optional)

Before or after scanning, you can fill in your sun habits:
- How much sun exposure you get daily
- Whether you use sunscreen and how often
- How often you go outdoors
- When your last sunburn was

This information is used by the AI to make your recommendations more specific to your lifestyle.

---

## 4. User Manual — runAnalysis Script

This is a desktop tool for researchers or the thesis author to analyze 3 images at once from the command line, without using the mobile app.

### Requirements
- Node.js installed
- The backend project built (`npm run build`)
- 3 image files (JPG or PNG)

### Setup (first time only)
```powershell
cd c:\Users\patio\Documents\longitudinal_skin_analysis
npm run build
```

### How to run

Place your 3 images in:
```
src/modules/image/img1.jpg
src/modules/image/img2.jpg
src/modules/image/img3.jpg
```

Then run:
```powershell
node dist/modules/image/runAnalysis.js src/modules/image/img1.jpg src/modules/image/img2.jpg src/modules/image/img3.jpg
```

You can also use full paths to images stored anywhere on your computer:
```powershell
node dist/modules/image/runAnalysis.js "C:\Users\patio\Desktop\scan1.jpg" "C:\Users\patio\Desktop\scan2.jpg" "C:\Users\patio\Desktop\scan3.jpg"
```

### Sample output

```
════════════════════════════════════════════════════════════
  PixelDerm — Scan 1
  File : img1.jpg
  Date : 5/12/2026, 10:30:00 AM
────────────────────────────────────────────────────────────
  Spot Count (CCL)    : 14
  Texture Score (LBP) : 32.45%
  Pigmentation        : 18.72%
  Skin Score          : 76%
  Risk Level          : Low
════════════════════════════════════════════════════════════
```

### Understanding the output

| Field | What it means |
|-------|--------------|
| **Spot Count** | Number of spots detected. Lower is better |
| **Texture Score** | Surface irregularity. Lower = smoother skin |
| **Pigmentation** | Average skin darkness. Context-dependent |
| **Skin Score** | Overall health score (0–100). Higher = better |
| **Risk Level** | Low (≥70), Moderate (40–69), or High (<40) |

---

## 5. API Reference

Base URL: `https://longitudinalskinanalysissystem-production.up.railway.app`

All endpoints return JSON.

---

### Health check
```
GET /health
```
Returns server status and database connection state.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-05-12T10:00:00.000Z",
  "environment": "production",
  "database": "connected"
}
```

---

### User management

#### Create a user
```
POST /api/users
```
**Body:**
```json
{
  "deviceIdentifier": "device-123",
  "deviceType": "android",
  "name": "Shana"
}
```
**Response:** User object with `userId`

---

#### Get user profile and stats
```
GET /api/users/:userId
```
**Response:**
```json
{
  "userId": "...",
  "statistics": {
    "totalAnalyses": 12,
    "totalSessions": 12,
    "lastAnalysis": { ... }
  }
}
```

---

#### Update display name
```
PUT /api/users/:userId
```
**Body:** `{ "name": "New Name" }`

---

### Skin analysis

#### Analyze a skin photo (mobile)
```
POST /api/analyze/upload
Content-Type: multipart/form-data
```
**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | file | Yes | JPG/PNG photo of skin |
| `userId` | string | Yes | User ID from POST /api/users |
| `bodyArea` | string | No | forehead, cheek, chin, temple, arm, back, chest (default: forehead) |
| `sunExposure` | string | No | e.g. "Less than 30 minutes" |
| `sunscreenUse` | string | No | e.g. "Once a day" |
| `outdoorFrequency` | string | No | e.g. "3 days a week" |
| `lastSunburn` | string | No | e.g. "A week ago" |

**Response:**
```json
{
  "success": true,
  "analysis": {
    "analysisId": "...",
    "sessionId": "...",
    "imageId": "...",
    "timestamp": "2026-05-12T10:00:00.000Z"
  },
  "features": {
    "spotCount": 14,
    "textureScore": 0.324,
    "pigmentation": 0.187
  },
  "baseline": {
    "spotCount": 12,
    "textureScore": 0.310,
    "pigmentation": 0.180
  },
  "recommendation": {
    "status": "Stable",
    "advice": "Continue your current sun protection routine."
  },
  "uvDamage": {
    "damageScore": 0.23,
    "level": "Mild",
    "advice": "Apply SPF 30+ daily..."
  },
  "geminiRecommendation": "Based on your scan results...",
  "currentImageUrl": "/uploads/...",
  "previousImageUrl": "/uploads/..."
}
```

---

### Comparison and trends

#### Get current vs baseline comparison
```
GET /api/comparison/:userId/:bodyArea
```
Returns spot count change, texture change, pigmentation change, and days elapsed since baseline.

#### Get historical trend data
```
GET /api/trends/:userId/:bodyArea?days=90
```
Returns all data points over the last N days (default 90).

---

### Recommendations

#### Get unread recommendations
```
GET /api/recommendations/:userId
```

#### Mark a recommendation as read
```
PUT /api/recommendations/:recommendationId/viewed
```

---

### Baselines

#### Get all baselines for a user
```
GET /api/baselines/:userId
```
Returns the baseline scan data for every body area the user has scanned.

---

## 6. Deployment Info

### Live services

| Service | URL |
|---------|-----|
| **Backend (Node.js)** | https://longitudinalskinanalysissystem-production.up.railway.app |
| **Python ML Engine** | https://stunning-tenderness-production-841b.up.railway.app |

### Infrastructure
- **Platform:** Railway (cloud hosting)
- **Database:** SQLite stored on a Railway persistent volume at `/app/data/analysis.db`
- **Image uploads:** Stored in `/uploads/` on the server
- **AI:** Groq API (Llama model) for personalized recommendations

### Environment variables (backend)
| Variable | Purpose |
|----------|---------|
| `NODE_ENV` | Set to `production` |
| `PORT` | Port the server listens on (Railway sets this automatically) |
| `DB_PATH` | Path to the SQLite database file |
| `GROQ_API_KEY` | API key for Groq AI recommendations |
| `ML_SERVICE_URL` | URL of the Python ML service `/analyze` endpoint |

### How to redeploy
Any push to the `database-branch` branch on GitHub automatically triggers a new deployment on Railway.

### How to rebuild the mobile app
After any code change in `PixelDermApp/`:
```powershell
cd c:\Users\patio\Documents\PixelDermApp\android
.\gradlew assembleRelease
```
Output: `android\app\build\outputs\apk\release\app-release.apk`

---

## 7. Glossary

**Baseline**
Your very first scan for a body area. All future scans are compared against it to detect changes over time.

**Adaptive Thresholding**
A method for deciding what counts as a "dark spot" on a pixel-by-pixel basis. For each pixel, the system looks at the 101×101 block of pixels surrounding it, calculates the average brightness of that block, and subtracts 40. If the pixel is darker than that local average, it is considered a spot. This handles uneven lighting — a naturally shadowed area of the face won't produce false positives, and a subtle spot in a bright area won't be missed. Block size: 101px, constant C: 40.

**CCL (Connected Component Labeling)**
A computer vision method used to count spots. It finds groups of dark pixels that are connected to each other — each group counts as one spot. Groups smaller than 15 pixels are ignored as noise.

**LBP (Local Binary Patterns)**
A method for measuring texture. It looks at small patches of pixels and detects how different each pixel is from its neighbors, producing a texture score.

**Pigmentation**
The darkness level of the skin. Higher pigmentation can indicate sun damage, hyperpigmentation, or melasma.

**Skin Score**
A 0–100 health score calculated from all three features. Higher means healthier. Calculated as:
`((100 - texture%) + (100 - pigmentation%) + (100 - spotCount×2)) ÷ 3`

**Random Forest**
A type of machine learning model made up of many decision trees that vote together to make a prediction. Used here to estimate UV damage level.

**Longitudinal analysis**
Tracking the same thing over a long period of time. PixelDerm tracks skin features across multiple scans to detect trends.

**Baseline comparison**
Comparing your current scan to your first (baseline) scan to see how your skin has changed.

**Groq AI**
A fast AI service that uses a large language model (like ChatGPT) to generate personalized advice paragraphs based on your scan data.

**Railway**
The cloud platform hosting the backend and Python ML service. It is always running so the mobile app can connect from anywhere.

**APK (Android Package)**
The file format for Android apps. `app-release.apk` is the PixelDerm app file you install on any Android phone.

**REST API**
The way the mobile app communicates with the backend server — it sends requests (like "analyze this photo") and gets back responses (like "here are your results").

---

*PixelDerm — Longitudinal Skin Analysis System*
*Built as a thesis project | Deployed on Railway | React Native + Node.js + Python*
