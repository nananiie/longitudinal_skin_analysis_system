from fastapi import FastAPI
from pydantic import BaseModel
import json
from database import save_scan, init_db

app = FastAPI(title="PixelDerm AI Engine")
init_db()

# Ensure you have your knowledge_base.json created in the right folder!
with open('../src/modules/recommendation/knowledge_base.json', 'r') as file:
    knowledge_base = json.load(file)

class ScanData(BaseModel):
    userId: str
    spotCount: int
    textureScore: float
    averagePigmentation: float

def simulate_random_forest(spots, texture):
    # This is a placeholder logic until you train the real Scikit-Learn model
    if spots > 50 or texture > 80:
        return 0.85 
    elif spots > 20:
        return 0.50 
    return 0.15 

def get_recommendation(score: float):
    for rule in knowledge_base['recommendations']:
        if score <= rule['max_score']:
            return rule
    return knowledge_base['recommendations'][-1]

@app.post("/analyze")
async def process_scan(data: ScanData):
    ai_score = simulate_random_forest(data.spotCount, data.textureScore)
    save_scan(data.userId, data.spotCount, data.textureScore, data.averagePigmentation, ai_score)
    result = get_recommendation(ai_score)
    
    return {
        "status": "success",
        "damage_score": round(ai_score, 2),
        "level": result["level"],
        "advice": result["advice"]
    }