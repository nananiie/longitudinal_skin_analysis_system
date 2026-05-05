import sharp from "sharp";
export async function preprocessImage(imagePath) {
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
//# sourceMappingURL=preprocess.js.map