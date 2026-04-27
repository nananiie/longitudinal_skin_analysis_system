/**
 * API Routes for Skin Analysis System
 * Connects image processing, database, and recommendation modules
 *
 * @file routes/api.ts
 */
import { AnalysisDatabase } from '../services/database.service.js';
declare const router: import("express-serve-static-core").Router;
declare global {
    namespace Express {
        interface Request {
            db?: AnalysisDatabase;
        }
    }
}
export default router;
//# sourceMappingURL=api.d.ts.map