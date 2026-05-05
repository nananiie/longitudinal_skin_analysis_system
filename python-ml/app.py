import json
import os
import pickle

from fastapi import FastAPI
from pydantic import BaseModel, validator
from database import save_scan, init_db

app = FastAPI(title="PixelDerm AI Engine")
init_db()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'rf_model.pkl')
SCALER_PATH = os.path.join(BASE_DIR, 'scaler.pkl')
KB_PATH = os.path.join(BASE_DIR, '../src/modules/recommendation/knowledge_base.json')

with open(KB_PATH, 'r') as f:
    knowledge_base = json.load(f)

if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
    with open(MODEL_PATH, 'rb') as f:
        rf_model = pickle.load(f)
    with open(SCALER_PATH, 'rb') as f:
        scaler = pickle.load(f)
    USE_MODEL = True
else:
    rf_model = None
    scaler = None
    USE_MODEL = False


# ── Data Validator ────────────────────────────────────────────────────────────

class ScanData(BaseModel):
    userId: str
    spotCount: int
    textureScore: float
    averagePigmentation: float

    @validator('userId')
    def user_id_not_empty(cls, v):
        if not v.strip():
            raise ValueError('userId must not be empty')
        return v

    @validator('spotCount')
    def spot_count_non_negative(cls, v):
        if v < 0:
            raise ValueError('spotCount must be non-negative')
        return v

    @validator('textureScore', 'averagePigmentation')
    def scores_non_negative(cls, v):
        if v < 0:
            raise ValueError('Score values must be non-negative')
        return v


# ── Inference ─────────────────────────────────────────────────────────────────

def run_inference(spots: int, texture: float, pigmentation: float) -> float:
    if USE_MODEL:
        X = scaler.transform([[spots, texture, pigmentation]])
        score = float(rf_model.predict(X)[0])
        return max(0.0, min(1.0, score))
    # Heuristic fallback until train_model.py has been run
    spot_norm = min(spots / 3000, 1.0)
    pig_norm = min(pigmentation / 0.75, 1.0)
    texture_norm = min(texture, 1.0)  # already 0–1 normalised
    return max(0.0, min(1.0,
        0.50 * pig_norm + 0.35 * spot_norm + 0.15 * texture_norm
    ))


def get_recommendation(score: float) -> dict:
    for rule in knowledge_base['recommendations']:
        if score <= rule['max_score']:
            return rule
    return knowledge_base['recommendations'][-1]


# ── Routes ────────────────────────────────────────────────────────────────────

@app.post("/analyze")
async def process_scan(data: ScanData):
    ai_score = run_inference(data.spotCount, data.textureScore, data.averagePigmentation)
    save_scan(data.userId, data.spotCount, data.textureScore, data.averagePigmentation, ai_score)
    result = get_recommendation(ai_score)

    return {
        "status": "success",
        "damage_score": round(ai_score, 2),
        "level": result["level"],
        "advice": result["advice"]
    }


@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": USE_MODEL}
