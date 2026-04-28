import { FeatureResults } from "../../types/image";

export async function sendToAIEngine(userId: string, features: FeatureResults) {
    try {
        const API_URL = 'http://127.0.0.1:8000/analyze'; 
        
        const payload = {
            userId: userId,
            spotCount: features.spotCount,
            textureScore: features.textureScore,
            averagePigmentation: features.averagePigmentation
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();

    } catch (error) {
        console.error("Failed to connect to AI Engine:", error);
        return null;
    }
}