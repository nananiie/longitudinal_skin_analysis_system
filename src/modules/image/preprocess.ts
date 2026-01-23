import sharp from 'sharp';

export async function preprocessImage(
  imagePath: string
): Promise<PreprocessedImage> {

  const image = sharp(imagePath);

  const processedBuffer = await image
    .resize(256, 256)
    .blur(1) // noise reduction
    .normalise() // lighting normalization
    .toBuffer();

  return {
    buffer: processedBuffer,
    width: 256,
    height: 256
  };
}