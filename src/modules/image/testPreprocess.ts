import fs from "fs";
import path from "path";
import { preprocessImage } from "./preprocess.js"; 
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function test() {
  const imagePath = path.join(
  __dirname,
  "../../../uploads/test/will_forehead_wof_sample.jpg" 
);

  const result = await preprocessImage(imagePath);

  fs.writeFileSync("debug_preprocessed.jpg", result.buffer);

  console.log("Preprocess test successful");
  console.log(`Image size: ${result.width} x ${result.height}`);
}

test().catch(console.error);
