import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { extractFeatures } from './src/modules/image/featureExtraction.ts';

async function generateDataset() {
    const imageFolder = './uploads/test'; 
    const csvFilePath = './python-ml/skin_features_dataset.csv';
    
    const header = "filename,spot_count,texture_score,pigmentation,target_damage_score\n";
    fs.writeFileSync(csvFilePath, header);

    const files = fs.readdirSync(imageFolder);
    console.log(`Found ${files.length} files. Starting batch extraction...`);

    let successCount = 0;

    for (const file of files) {
        if (file.match(/\.(jpg|jpeg|png)$/i)) {
            const imagePath = path.join(imageFolder, file);
            
            try {
                const { data, info } = await sharp(imagePath)
                    .resize(500, 500, { fit: 'cover' })
                    .grayscale()
                    .blur(3) // Low-pass filter to remove skin noise
                    .raw()
                    .toBuffer({ resolveWithObject: true });

                const features = await extractFeatures(data, info.width, info.height);

                const row = `${file},${features.spotCount},${features.textureScore.toFixed(4)},${features.averagePigmentation.toFixed(4)},\n`;
                fs.appendFileSync(csvFilePath, row);
                
                console.log(`Successfully processed: ${file}`);
                successCount++;

            } catch (error) {
                console.error(`Error processing ${file}:`, error);
            }
        }
    }
    
    console.log(`\n=== BATCH PROCESSING COMPLETE ===`);
    console.log(`File saved to: ${csvFilePath}`);
}

generateDataset();