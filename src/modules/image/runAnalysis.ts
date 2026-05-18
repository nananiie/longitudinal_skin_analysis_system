/// <reference types="node" />
import path from "path";
import { preprocessImage } from "./preprocess.js";
import { extractFeatures } from "./featureExtraction.js";


function computeSkinScore(spotCount: number, textureScore: number, averagePigmentation: number): number {
  return Math.min(100, Math.round(
    ((100 - Math.min(textureScore * 100, 100))
    + (100 - Math.min(averagePigmentation * 100, 100))
    + (100 - Math.min(spotCount * 2, 100))) / 3
  ));
}

function riskLabel(score: number): string {
  if (score >= 70) return "Low";
  if (score >= 40) return "Moderate";
  return "High";
}

function sep(char = "═", len = 60) { console.log(char.repeat(len)); }

async function analyze(imagePath: string) {
  const img = await preprocessImage(path.resolve(imagePath));
  return extractFeatures(img.buffer, img.width, img.height);
}

async function runAnalysis(paths: string[]) {
  const results = await Promise.all(paths.map(analyze));

  for (let i = 0; i < paths.length; i++) {
    const r = results[i];
    const score = computeSkinScore(r.spotCount, r.textureScore, r.averagePigmentation);
    const risk  = riskLabel(score);

    sep();
    console.log(`  PixelDerm — Scan ${i + 1}`);
    console.log(`  File : ${path.basename(paths[i])}`);
    console.log(`  Date : ${new Date().toLocaleString()}`);
    sep("─");
    console.log(`  Spot Count (CCL)    : ${r.spotCount}`);
    console.log(`  Texture Score (LBP) : ${(r.textureScore * 100).toFixed(2)}%`);
    console.log(`  Pigmentation        : ${(r.averagePigmentation * 100).toFixed(2)}%`);
    console.log(`  Skin Score          : ${score}%`);
    console.log(`  Risk Level          : ${risk}`);
    sep();
    console.log();
  }
}

const paths = process.argv.slice(2);
if (paths.length !== 3) {
  console.error("Usage: node runAnalysis.js <image1> <image2> <image3>");
  process.exit(1);
}
runAnalysis(paths).catch(err => { console.error("Error:", err.message); process.exit(1); });
