export async function extractFeatures(buffer) {
    let spotPixels = 0;
    let textureVariance = 0;
    const threshold = 100;
    for (let i = 0; i < buffer.length; i++) {
        const pixel = buffer[i];
        // to identify spots/hyperpigmentation - ADAPTIVE THRESHOLDING ++ to detect moles for early detection of skin cancer
        if (pixel < threshold)
            spotPixels++; //[DIMENSION] move 'spotPixels++' below then add another variable called 'spotMole++' ; spotMole++ if pixelSize > 6mm
        // to identify texture variance - LOCAL BINARY PATTERNS 
        if (i > 0)
            textureVariance += Math.abs(buffer[i] - buffer[i - 1]);
    }
    return {
        spotCount: Math.floor(spotPixels / 50), // Connected Components Labeling approximation
        textureScore: textureVariance / buffer.length,
        averagePigmentation: spotPixels / buffer.length
    };
}
//# sourceMappingURL=featureExtraction.js.map