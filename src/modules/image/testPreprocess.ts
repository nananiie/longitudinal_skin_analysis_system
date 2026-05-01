/// <reference types="node" />
import { preprocessImage } from "./preprocess";
import { extractFeatures } from "./featureExtraction";
import path from "path";

async function runTest() {
  const samplePath = path.resolve("uploads/test/allie_forehead_wof_sample.jpg");
  
  console.log("--- PIXELDERM: DAMAGE IDENTIFICATION PROFILE ---");
  
  try {
    // 1. Preprocess
    const imgData = await preprocessImage(samplePath);
    
    // 2. Extract Features using your interface
    imgData.features = await extractFeatures(imgData.buffer, imgData.width, imgData.height);

    // 3. Output identifying damage
    console.log(`Identification results for ${path.basename(samplePath)}:`);
    console.log(`- Spot Count: ${imgData.features.spotCount}`);
    console.log(`- Texture Score: ${imgData.features.textureScore.toFixed(2)}`);
    console.log(`- Pigmentation Density: ${(imgData.features.averagePigmentation * 100).toFixed(2)}%`);
    
    console.log("\n----------------------------");

  } catch (error) {
    console.error("X Pipeline Error:", error);
  }
}

//runTest();