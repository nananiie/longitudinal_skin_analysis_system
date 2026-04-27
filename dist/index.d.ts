/**
 * Longitudinal Skin Analysis System - Main Entry Point
 * Initializes database, image processing, and API server
 *
 * @file index.ts
 */
import { AnalysisDatabase } from './services/database.service.js';
/**
 * Initialize Express server
 */
declare function createServer(): import("express-serve-static-core").Express;
export declare const getApp: () => typeof createServer;
export declare const getDb: () => AnalysisDatabase;
export {};
//# sourceMappingURL=index.d.ts.map