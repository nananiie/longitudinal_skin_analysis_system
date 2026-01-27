import sharp from "sharp";
import { PreprocessedImage } from "../../types/image.js"; 

export async function preprocessImage(
  imagePath: string
): Promise<PreprocessedImage> {

  const image = sharp(imagePath);

  const processedBuffer = await image
    .resize(256, 256)
    .blur(1)
    .normalise()
    .toBuffer();

  return {
    buffer: processedBuffer,
    width: 256,
    height: 256
  };
}
