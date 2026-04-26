/**
 * Database Integration Example
 * Shows how to use AnalysisDatabase with the existing image processing pipeline
 * 
 * @file database.integration.example.ts
 * @description Example uses from the skin analysis system
 */

import AnalysisDatabase from './database.service';
import { preprocessImage } from '../modules/image/preprocess';
import { extractFeatures } from '../modules/image/featureExtraction';
import { generateRecommendation } from '../modules/comparison/rules';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

/**
 * Example 1: Initialize database and create first user
 */
export async function initializeDatabaseExample() {
  // Create database instance
  const db = new AnalysisDatabase({
    filename: './data/analysis.db',
    deviceType: 'desktop',
    pragma: {
      journal_mode: 'WAL',
      foreign_keys: 'ON',
      synchronous: 'NORMAL'
    }
  });

  // Initialize schema
  await db.initialize();

  // Create user on first app launch
  const user = db.createUser(
    'desktop-device-001',  // Unique hardware identifier
    'desktop'
  );

  console.log('✓ User created:', user.user_id);
  return db;
}

/**
 * Example 2: Process image and store analysis in database
 * Integration point between image processing pipeline and historical data
 */
export async function analyzeAndStoreExample(
  db: AnalysisDatabase,
  userId: string,
  imagePath: string
) {
  try {
    // Step 1: Create analysis session for this body region
    const session = db.createSession(
      userId,
      'forehead',
      'natural',
      'Morning lighting, post-shower'
    );
    console.log('✓ Session created:', session.session_id);

    // Step 2: Process image
    const preprocessed = await preprocessImage(imagePath);
    const features = await extractFeatures(preprocessed.buffer);

    // Step 3: Store image metadata
    const imageHash = crypto
      .createHash('sha256')
      .update(preprocessed.buffer)
      .digest('hex');

    const image = db.createImageRecord(
      session.session_id,
      userId,
      imagePath,
      preprocessed.width,
      preprocessed.height,
      imageHash
    );
    console.log('✓ Image stored:', image.image_id);

    // Step 4: Store analysis results in database
    const analysis = db.createAnalysis(
      image.image_id,
      session.session_id,
      userId,
      features.spotCount,
      features.textureScore,
      features.averagePigmentation,
      undefined,
      0.95, // confidence score
      'v1.0'
    );
    console.log('✓ Analysis stored:', analysis.analysis_id);

    // Step 5: Get or set baseline
    let baseline = db.getActiveBaseline(userId, 'forehead');

    if (!baseline) {
      // First time analyzing, set this as baseline
      baseline = db.setBaseline(
        userId,
        'forehead',
        analysis.analysis_id,
        session.session_id,
        features.spotCount,
        features.textureScore,
        features.averagePigmentation
      );
      console.log('✓ Baseline established:', baseline.baseline_id);
    }

    // Step 6: Compare with baseline
    const comparison = db.compareWithBaseline(analysis.analysis_id, userId, 'forehead');
    console.log('📊 Comparison with baseline:', {
      spotCountChange: comparison?.spot_count_pct_change,
      regressionDetected: comparison?.regression_detected,
      daysElapsed: comparison?.days_elapsed
    });

    // Step 7: Generate recommendation
    const recommendation = generateRecommendation(
      features,
      {
        spotCount: baseline.baseline_spot_count,
        textureScore: baseline.baseline_texture_score,
        averagePigmentation: baseline.baseline_pigmentation
      }
    );

    // Step 8: Store recommendation
    const rec = db.createRecommendation(
      userId,
      analysis.analysis_id,
      session.session_id,
      recommendation.status as any,
      recommendation.advice,
      comparison?.regression_detected ? 0.8 : 0.3
    );
    console.log('✓ Recommendation:', rec.status);

    return {
      analysis,
      baseline,
      comparison,
      recommendation: rec
    };

  } catch (error) {
    console.error('✗ Analysis storage failed:', error);
    throw error;
  }
}

/**
 * Example 3: Retrieve historical trend data
 */
export function getTrendAnalysisExample(
  db: AnalysisDatabase,
  userId: string
) {
  // Get 30-day trend
  const trends = db.getTrendData(userId, 30);

  console.log('\n📈 30-Day Trend Analysis:');
  console.table(trends);

  // Detect significant regressions
  const regressions = db.detectRegressions(userId);

  if (regressions.length > 0) {
    console.log('\n⚠️  Significant Regressions Detected:');
    regressions.forEach(reg => {
      console.log(`  • Spot count increased ${reg.spot_count_pct_change.toFixed(1)}% in ${reg.days_elapsed} days`);
    });
  }

  return { trends, regressions };
}

/**
 * Example 4: Generate historical report
 */
export function generateHistoricalReportExample(
  db: AnalysisDatabase,
  userId: string
) {
  // Get latest 10 analyses
  const analyses = db.getUserAnalyses(userId, { limit: 10 });

  console.log('\n📋 Historical Report:');
  console.log(`Total analyses: ${analyses.length}`);

  analyses.forEach((analysis, idx) => {
    const record = db.getHistoricalRecord(analysis.analysis_id);

    if (record) {
      console.log(`\n${idx + 1}. ${record.session.session_date}`);
      console.log(`   Spot Count: ${record.analysis.spot_count}`);
      console.log(`   Texture Score: ${record.analysis.texture_score.toFixed(2)}`);
      console.log(`   Pigmentation: ${(record.analysis.average_pigmentation * 100).toFixed(1)}%`);

      if (record.change_from_baseline) {
        console.log(`   📊 vs Baseline: ${record.change_from_baseline.spot_count_pct.toFixed(1)}% change`);
      }

      if (record.recommendation) {
        console.log(`   💡 ${record.recommendation.status}`);
      }
    }
  });

  return analyses;
}

/**
 * Example 5: Batch analysis processing (desktop version)
 */
export async function batchAnalysisExample(
  db: AnalysisDatabase,
  userId: string,
  imagePaths: string[]
) {
  console.log(`\n🔄 Processing ${imagePaths.length} images...`);

  const results = [];

  for (const imagePath of imagePaths) {
    try {
      const result = await analyzeAndStoreExample(db, userId, imagePath);
      results.push(result);
    } catch (error) {
      console.error(`✗ Failed to process ${imagePath}:`, error);
    }
  }

  console.log(`✓ Processed ${results.length} images`);

  // Generate summary
  const avgSpots = results.reduce((sum, r) => sum + r.analysis.spot_count, 0) / results.length;
  const avgTexture = results.reduce((sum, r) => sum + r.analysis.texture_score, 0) / results.length;

  console.log('\n📊 Batch Summary:');
  console.log(`  Average Spot Count: ${avgSpots.toFixed(1)}`);
  console.log(`  Average Texture Score: ${avgTexture.toFixed(2)}`);

  return results;
}

/**
 * Example 6: Export data for Android sync
 */
export function exportForAndroidExample(
  db: AnalysisDatabase,
  userId: string
) {
  const exported = db.exportUserData(userId);

  // Could save as JSON for transmission
  const json = JSON.stringify(exported, null, 2);

  console.log('\n📤 Data exported for Android:');
  console.log(`  Sessions: ${exported.sessions.length}`);
  console.log(`  Analyses: ${exported.analyses.length}`);
  console.log(`  Size: ${(json.length / 1024).toFixed(1)} KB`);

  return exported;
}

/**
 * Example 7: Database maintenance
 */
export function maintenanceExample(db: AnalysisDatabase) {
  const stats = db.getStats();

  console.log('\n🔧 Database Maintenance:');
  console.log(`  Tables: ${stats.tables}`);
  console.log(`  Total Records: ${stats.records}`);
  console.log(`  Size: ${stats.size_kb.toFixed(1)} KB`);

  // Cleanup old recommendation records (older than 1 year)
  // In production, you'd want to archive rather than delete
  // db.exec(`
  //   DELETE FROM recommendations
  //   WHERE generated_at < datetime('now', '-365 days')
  // `);
}

/**
 * Main execution example
 */
export async function runIntegrationExample() {
  const db = await initializeDatabaseExample();

  try {
    // Get or create user
    let user = db.getUserByDevice('desktop-device-001');
    if (!user) {
      user = db.createUser('desktop-device-001', 'desktop');
    }

    // Analyze sample images
    const samplePath = './uploads/test/allie_forehead_wof_sample.jpg';
    if (fs.existsSync(samplePath)) {
      await analyzeAndStoreExample(db, user.user_id, samplePath);

      // Query historical data
      getTrendAnalysisExample(db, user.user_id);
      generateHistoricalReportExample(db, user.user_id);
    }

    // Database maintenance
    maintenanceExample(db);

  } finally {
    db.close();
  }
}

// Uncomment to run:
// runIntegrationExample().catch(console.error);
