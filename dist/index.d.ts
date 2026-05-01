/**
 * Longitudinal Skin Analysis System - Main Entry Point
 * Initializes database, image processing, and API server
 *
 * @file index.ts
 */
import { AnalysisDatabase } from './services/database.service.js';
export declare const getApp: (database: AnalysisDatabase) => import("express-serve-static-core").Express;
export declare const getDb: () => AnalysisDatabase;
//# sourceMappingURL=index.d.ts.map