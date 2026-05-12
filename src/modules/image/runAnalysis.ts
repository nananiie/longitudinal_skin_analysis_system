/// <reference types="node" />
import path from "path";
import { preprocessImage } from "./preprocess.js";
import { extractFeatures } from "./featureExtraction.js";
import { generateRecommendation } from "../comparison/rules.js";

function sep(char = "═", len = 60) { console.log(char.repeat(len)); }
function row(label: string, a: string | number, b: string | number, delta?: string) {
  const l = label.padEnd(24);
  const av = String(a).padStart(10);
  const bv = String(b).padStart(10);
  const d = delta ? `  ${delta}` : "";
  console.log(`  ${l} ${av}   ${bv}${d}`);
}

async function analyze(imagePath: string) {
  const img = await preprocessImage(path.resolve(imagePath));
  return extractFeatures(img.buffer, img.width, img.height);
}

async function runComparison(firstPath: string, secondPath: string) {
  const [first, second] = await Promise.all([analyze(firstPath), analyze(secondPath)]);
  const rec = generateRecommendation(second, {
    spotCount: first.spotCount,
    textureScore: first.textureScore,
    averagePigmentation: first.averagePigmentation,
  });

  const spotDelta    = second.spotCount - first.spotCount;
  const spotPct      = first.spotCount > 0 ? ((spotDelta / first.spotCount) * 100) : 0;
  const textureDelta = second.textureScore - first.textureScore;
  const pigDelta     = second.averagePigmentation - first.averagePigmentation;

  sep();
  console.log("  PixelDerm — Comparison Summary");
  console.log(`  Scan 1 : ${path.basename(firstPath)}`);
  console.log(`  Scan 2 : ${path.basename(secondPath)}`);
  console.log(`  Date   : ${new Date().toLocaleString()}`);
  sep();
  console.log(`  ${"".padEnd(24)} ${"Scan 1".padStart(10)}   ${"Scan 2".padStart(10)}   ${"Change"}`);
  console.log(`  ${"─".repeat(56)}`);
  row("Spot Count (CCL)",
    first.spotCount,
    second.spotCount,
    `${spotDelta >= 0 ? "+" : ""}${spotDelta} (${spotPct >= 0 ? "+" : ""}${spotPct.toFixed(1)}%)`
  );
  row("Texture Score (LBP)",
    first.textureScore.toFixed(4),
    second.textureScore.toFixed(4),
    `${textureDelta >= 0 ? "+" : ""}${textureDelta.toFixed(4)}`
  );
  row("Pigmentation",
    `${(first.averagePigmentation * 100).toFixed(2)}%`,
    `${(second.averagePigmentation * 100).toFixed(2)}%`,
    `${pigDelta >= 0 ? "+" : ""}${(pigDelta * 100).toFixed(2)}%`
  );
  sep();
  console.log(`  Status : ${rec.status}`);
  console.log(`  Advice : ${rec.advice}`);
  sep();
  console.log();
}

const [first, second] = process.argv.slice(2);
if (!first || !second) {
  console.error("Usage: node runAnalysis.js <first-image> <second-image>");
  process.exit(1);
}
runComparison(first, second).catch(err => { console.error("Error:", err.message); process.exit(1); });
