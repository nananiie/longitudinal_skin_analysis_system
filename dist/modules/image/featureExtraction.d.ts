import { FeatureResults } from "../../types/image";
export declare function computeOtsuThreshold(buffer: Buffer): number;
export declare function computeAdaptiveThreshold(buffer: Buffer, width: number, height: number, blockSize?: number, C?: number): Uint8Array;
export declare function extractFeatures(buffer: Buffer, width: number, height: number): Promise<FeatureResults>;
//# sourceMappingURL=featureExtraction.d.ts.map