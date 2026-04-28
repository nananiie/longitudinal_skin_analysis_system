import { FeatureResults } from "../../types/image";

export async function extractFeatures(buffer: Buffer, width: number, height: number): Promise<FeatureResults> {
    let textureVariance = 0;
    const threshold = 100;

    // 1. Texture Analysis (1D Gradient Approximation of LBP)
    for (let i = 1; i < buffer.length; i++) {
        textureVariance += Math.abs(buffer[i] - buffer[i - 1]);
    }

    // 2. Connected Components Labeling (CCL) via Depth-First Search
    let totalSpotPixels = 0;
    let validSpotsCount = 0;

    const visited = new Uint8Array(buffer.length);
    const MIN_PORE_SIZE = 15; // Rejects microscopic noise smaller than 15 pixels

    const getIndex = (x: number, y: number) => y * width + x;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = getIndex(x, y);

            if (buffer[i] < threshold && visited[i] === 0) {
                let currentBlobSize = 0;
                const stack = [i];
                visited[i] = 1;

                while (stack.length > 0) {
                    const currentIdx = stack.pop()!;
                    currentBlobSize++;
                    totalSpotPixels++;

                    const cx = currentIdx % width;
                    const cy = Math.floor(currentIdx / width);

                    const neighbors = [
                        { nx: cx, ny: cy - 1 },
                        { nx: cx, ny: cy + 1 },
                        { nx: cx - 1, ny: cy },
                        { nx: cx + 1, ny: cy }
                    ];

                    for (const { nx, ny } of neighbors) {
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const nIdx = getIndex(nx, ny);
                            if (buffer[nIdx] < threshold && visited[nIdx] === 0) {
                                visited[nIdx] = 1;
                                stack.push(nIdx);
                            }
                        }
                    }
                }

                // Only count the spot if it is larger than the noise threshold
                if (currentBlobSize > MIN_PORE_SIZE) {
                    validSpotsCount++;
                }
            }
        }
    }

    return {
        spotCount: validSpotsCount,
        textureScore: textureVariance / buffer.length,
        averagePigmentation: totalSpotPixels / buffer.length
    };
}