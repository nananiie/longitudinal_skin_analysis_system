/**
 * Database Integration Example
 * Shows how to use AnalysisDatabase with the existing image processing pipeline
 *
 * @file database.integration.example.ts
 * @description Example uses from the skin analysis system
 */
import AnalysisDatabase from './database.service';
/**
 * Example 1: Initialize database and create first user
 */
export declare function initializeDatabaseExample(): Promise<AnalysisDatabase>;
/**
 * Example 2: Process image and store analysis in database
 * Integration point between image processing pipeline and historical data
 */
export declare function analyzeAndStoreExample(db: AnalysisDatabase, userId: string, imagePath: string): Promise<{
    analysis: import("../types/database.types").FeatureAnalysisResult;
    baseline: import("../types/database.types").BaselineReference;
    comparison: import("../types/database.types").ComparisonResult | null;
    recommendation: import("../types/database.types").Recommendation;
}>;
/**
 * Example 3: Retrieve historical trend data
 */
export declare function getTrendAnalysisExample(db: AnalysisDatabase, userId: string): {
    trends: import("../types/database.types").TrendData[];
    regressions: import("../types/database.types").ComparisonResult[];
};
/**
 * Example 4: Generate historical report
 */
export declare function generateHistoricalReportExample(db: AnalysisDatabase, userId: string): import("../types/database.types").FeatureAnalysisResult[];
/**
 * Example 5: Batch analysis processing (desktop version)
 */
export declare function batchAnalysisExample(db: AnalysisDatabase, userId: string, imagePaths: string[]): Promise<{
    analysis: import("../types/database.types").FeatureAnalysisResult;
    baseline: import("../types/database.types").BaselineReference;
    comparison: import("../types/database.types").ComparisonResult | null;
    recommendation: import("../types/database.types").Recommendation;
}[]>;
/**
 * Example 6: Export data for Android sync
 */
export declare function exportForAndroidExample(db: AnalysisDatabase, userId: string): any;
/**
 * Example 7: Database maintenance
 */
export declare function maintenanceExample(db: AnalysisDatabase): void;
/**
 * Main execution example
 */
export declare function runIntegrationExample(): Promise<void>;
//# sourceMappingURL=database.integration.example.d.ts.map