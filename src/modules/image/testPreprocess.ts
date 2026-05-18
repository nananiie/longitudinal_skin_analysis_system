/// <reference types="node" />
import { preprocessImage } from "./preprocess";
import { extractFeatures, computeAdaptiveThreshold, computeOtsuThreshold } from "./featureExtraction";
import path from "path";
import sharp from "sharp";
import fs from "fs";

async function runCCL(buffer: Buffer, width: number, height: number, thresholdFn: (i: number) => number) {
  const visited = new Uint8Array(buffer.length);
  const MIN_PORE_SIZE = 15;
  let totalSpotPixels = 0;
  let validSpotsCount = 0;
  const getIndex = (x: number, y: number) => y * width + x;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = getIndex(x, y);
      if (buffer[i] < thresholdFn(i) && visited[i] === 0) {
        let blobSize = 0;
        const stack = [i];
        visited[i] = 1;
        while (stack.length > 0) {
          const idx = stack.pop()!;
          blobSize++;
          totalSpotPixels++;
          const cx = idx % width;
          const cy = Math.floor(idx / width);
          for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]) {
            const nx = cx + dx, ny = cy + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = getIndex(nx, ny);
              if (buffer[nIdx] < thresholdFn(nIdx) && visited[nIdx] === 0) {
                visited[nIdx] = 1;
                stack.push(nIdx);
              }
            }
          }
        }
        if (blobSize > MIN_PORE_SIZE) validSpotsCount++;
      }
    }
  }
  return { spotCount: validSpotsCount, pigmentation: totalSpotPixels / buffer.length };
}

async function generatePanels(samplePath: string, label: string, outputDir: string) {

  // Panel 1 — original
  const originalOut = path.join(outputDir, `${label}_1_original.jpg`);
  fs.copyFileSync(samplePath, originalOut);

  // Panel 2 — grayscale normalized
  const imgData = await preprocessImage(samplePath);
  const grayscaleOut = path.join(outputDir, `${label}_2_grayscale_normalized.png`);
  await sharp(imgData.buffer, { raw: { width: imgData.width, height: imgData.height, channels: 1 } })
    .png()
    .toFile(grayscaleOut);

  // ADAPTIVE THRESHOLD
  const thresholdMap = computeAdaptiveThreshold(imgData.buffer, imgData.width, imgData.height);
  const adaptiveResults = await runCCL(imgData.buffer, imgData.width, imgData.height, (i) => thresholdMap[i]);

  const adaptiveBinary = Buffer.alloc(imgData.buffer.length);
  for (let i = 0; i < imgData.buffer.length; i++) {
    adaptiveBinary[i] = imgData.buffer[i] < thresholdMap[i] ? 0 : 255;
  }
  const adaptiveOut = path.join(outputDir, `${label}_3_binary_adaptive.png`);
  await sharp(adaptiveBinary, { raw: { width: imgData.width, height: imgData.height, channels: 1 } })
    .png()
    .toFile(adaptiveOut);

  // OTSU THRESHOLD
  
  const _otsuFormula     = (w0: number, w1: number, mu0: number, mu1: number) => w0 * w1 * (mu0 - mu1) ** 2;

  const _adaptiveFormula = (blockMean: number, C = 40) => blockMean - C;

  const otsuT = computeOtsuThreshold(imgData.buffer);
  const otsuResults = await runCCL(imgData.buffer, imgData.width, imgData.height, () => otsuT);

  const otsuBinary = Buffer.alloc(imgData.buffer.length);
  for (let i = 0; i < imgData.buffer.length; i++) {
    otsuBinary[i] = imgData.buffer[i] < otsuT ? 0 : 255;
  }
  const otsuOut = path.join(outputDir, `${label}_4_binary_otsu.png`);
  await sharp(otsuBinary, { raw: { width: imgData.width, height: imgData.height, channels: 1 } })
    .png()
    .toFile(otsuOut);

  const textureScore = (await extractFeatures(imgData.buffer, imgData.width, imgData.height)).textureScore;

  console.log(`  ${String(adaptiveResults.spotCount).padEnd(10)} | ${(adaptiveResults.pigmentation * 100).toFixed(2)}%`);
  console.log(`  ${String(otsuResults.spotCount).padEnd(10)} | ${(otsuResults.pigmentation * 100).toFixed(2)}%`);
  console.log(`  ${textureScore.toFixed(4)}`);
}

async function runTest() {
  const outputDir = path.resolve("uploads/test/output/figure4_1");
  fs.mkdirSync(outputDir, { recursive: true });

  await generatePanels(
    path.resolve("uploads/test/allie_forehead_wof_sample.jpg"),
    "lighter_tone",
    outputDir
  );

  await generatePanels(
    path.resolve("uploads/test/darkerTone.jpg"),
    "darker_tone",
    outputDir
  );

}

runTest();
