import { FeatureResults } from "../../types/image";

// Fixed threshold via Otsu's method: finds the single intensity value that
// maximises between-class variance across the whole image.
export function computeOtsuThreshold(buffer: Buffer): number {
    const histogram = new Int32Array(256);
    for (let i = 0; i < buffer.length; i++) histogram[buffer[i]]++;

    const total = buffer.length;
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * histogram[i];

    let sumB = 0, wB = 0, maxVariance = 0, threshold = 0;
    for (let t = 0; t < 256; t++) {
        wB += histogram[t];
        if (wB === 0) continue;
        const wF = total - wB;
        if (wF === 0) break;
        sumB += t * histogram[t];
        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;
        const variance = wB * wF * (mB - mF) ** 2;
        if (variance > maxVariance) { maxVariance = variance; threshold = t; }
    }
    return threshold;
}

// Adaptive thresholding: computes a local threshold per pixel based on the mean
// of its surrounding block minus a constant C to account for lighting variation.

// Adaptive Thresholding
export function computeAdaptiveThreshold(buffer: Buffer, width: number, height: number, blockSize = 101, C = 40): Uint8Array {
    const thresholdMap = new Uint8Array(buffer.length);
    const half = Math.floor(blockSize / 2);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0;
            let count = 0;
            for (let dy = -half; dy <= half; dy++) {
                for (let dx = -half; dx <= half; dx++) {
                    const ny = y + dy;
                    const nx = x + dx;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        sum += buffer[ny * width + nx];
                        count++;
                    }
                }
            }
            thresholdMap[y * width + x] = Math.max(0, Math.round(sum / count) - C);
        }
    }
    return thresholdMap;
}

// 8-neighbour Local Binary Pattern: encodes local texture as a binary code per pixel
function computeLBPScore(buffer: Buffer, width: number, height: number): number {
    // Clockwise from right: E, SE, S, SW, W, NW, N, NE
    const offsets = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
    let lbpSum = 0;
    const pixelCount = (width - 2) * (height - 2);

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const center = buffer[y * width + x];
            let code = 0;
            for (let b = 0; b < 8; b++) {
                const [dx, dy] = offsets[b];
                if (buffer[(y + dy) * width + (x + dx)] >= center) code |= (1 << b);
            }
            lbpSum += code;
        }
    }
    return (lbpSum / pixelCount) / 255; // normalised to 0–1
}

export async function extractFeatures(buffer: Buffer, width: number, height: number): Promise<FeatureResults> {
    // 1. Adaptive Thresholding — local mean per pixel block
    const thresholdMap = computeAdaptiveThreshold(buffer, width, height);

    // 2. Texture Analysis via 8-neighbour Local Binary Pattern
    const textureScore = computeLBPScore(buffer, width, height);

    // 3. Connected Components Labeling (CCL) via Depth-First Search
    let totalSpotPixels = 0;
    let validSpotsCount = 0;

    const visited = new Uint8Array(buffer.length);
    const MIN_PORE_SIZE = 15; // Rejects microscopic noise smaller than 15 pixels

    const getIndex = (x: number, y: number) => y * width + x;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = getIndex(x, y);

            if (buffer[i] < thresholdMap[i] && visited[i] === 0) {
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
                            if (buffer[nIdx] < thresholdMap[nIdx] && visited[nIdx] === 0) {
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
        textureScore,
        averagePigmentation: totalSpotPixels / buffer.length
    };
}