export function generateRecommendation(current: FeatureResults, baseline: FeatureResults | null) {
    let status = "Stable";
    let advice = "Continue your current sun protection routine.";

    // Rule 1: Longitudinal Analysis
    if (baseline && current.spotCount > baseline.spotCount * 1.2) {
        status = "Regression Detected";
        advice = "We've detected a 20% increase in spot count. Consider increasing your SPF usage.";
    }

    // Rule 2: Severity Threshold
    if (current.spotCount > 50) {
        status = "Alert";
        advice = "High spot density detected. Please consult a dermatologist for a professional exam.";
    }

    return { status, advice };
}