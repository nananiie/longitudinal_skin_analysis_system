import sharp from "sharp";
import { PreprocessedImage } from "../../types/image";

// Returns true if r,g,b values match known skin tone ranges.
// Combines two rule sets to cover light through dark skin tones.
function isSkinPixel(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  // Kovac et al. (2003) — light to medium skin
  const rule1 = r > 95 && g > 40 && b > 20 && (max - min) > 15 && Math.abs(r - g) > 15 && r > g && r > b;
  // Peer et al. — medium to dark skin
  const rule2 = r > 220 && g > 210 && b > 170 && Math.abs(r - g) <= 15 && r > b && g > b;
  return rule1 || rule2;
}

// Checks whether at least `threshold` fraction of pixels look like skin.
// Resizes to 64x64 for speed — no need to process the full image.
export async function isSkinImage(imagePath: string, threshold = 0.15): Promise<boolean> {
  const { data, info } = await sharp(imagePath)
    .resize(64, 64)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixelCount = info.width * info.height;
  let skinPixels = 0;
  for (let i = 0; i < data.length; i += 3) {
    if (isSkinPixel(data[i], data[i + 1], data[i + 2])) skinPixels++;
  }
  return skinPixels / pixelCount >= threshold;
}

export async function preprocessImage(
  imagePath: string
): Promise<PreprocessedImage> {
  const image = sharp(imagePath);

  // standardization logic for the identification profile
  const processedBuffer = await image
    .resize(256, 256)
    .blur(1)
    .normalise()
    .grayscale()
    .raw()
    .toBuffer();

  return {
    buffer: processedBuffer,
    width: 256,
    height: 256
  };
}