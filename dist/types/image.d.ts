export interface FeatureResults {
    spotCount: number;
    textureScore: number;
    averagePigmentation: number;
}
export interface PreprocessedImage {
    buffer: Buffer;
    width: number;
    height: number;
    features?: FeatureResults;
}
//# sourceMappingURL=image.d.ts.map