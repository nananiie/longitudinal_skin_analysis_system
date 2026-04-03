// This interface stores the numerical results of your algorithms
export interface FeatureResults {
  spotCount: number;         // Calculated via CCL
  textureScore: number;      // Calculated via LBP
  averagePigmentation: number; // For UV damage tracking
}

// Updated interface to include the optional features
export interface PreprocessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  features?: FeatureResults; // The '?' means it's optional until extraction is done
}
