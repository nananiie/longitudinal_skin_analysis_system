
import { FeatureResults } from "../../types/image.js";

export function generateRecommendation(current: FeatureResults, baseline: FeatureResults | null) {
    let status = "Stable";
    let advice = "Continue your current sun protection routine.";

    if (baseline && current.spotCount > baseline.spotCount * 1.2) {
        status = "Regression Detected";
        advice = "We've detected a 20% increase in spot count. Consider increasing your SPF usage.";
    }

    if (current.spotCount > 50) {
        status = "Alert";
        advice = "High spot density detected. Please consult a dermatologist for a professional exam.";
    }

    return { status, advice }; // TITE TITTE TTIITEIEIEIEIEIEIRE kita mo ba
}