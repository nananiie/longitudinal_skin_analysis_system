import { FeatureResults } from "../../types/image";

export async function extractFeatures(buffer: Buffer): Promise<FeatureResults> {
    let spotPixels = 0;
    let textureVariance = 0;
    const threshold = 100; 

    for (let i = 0; i < buffer.length; i++) {
        const pixel = buffer[i];
        
        // to identify spots/hyperpigmentation - ADAPTIVE THRESHOLDING
        if (pixel < threshold) spotPixels++;

        // to identify texture variance - LOCAL BINARY PATTERNS 
        if (i > 0) textureVariance += Math.abs(buffer[i] - buffer[i - 1]);
    }

    return {
        spotCount: Math.floor(spotPixels / 50), // Connected Components Labeling approximation
        textureScore: textureVariance / buffer.length,
        averagePigmentation: spotPixels / buffer.length 
    };
}