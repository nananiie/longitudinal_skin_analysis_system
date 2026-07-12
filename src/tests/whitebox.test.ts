import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeAdaptiveThreshold } from '../modules/image/featureExtraction.js';
import { generateRecommendation } from '../modules/comparison/rules.js';

// ─── computeAdaptiveThreshold ────────────────────────────────────────────────

describe('computeAdaptiveThreshold', () => {
  it('output length matches input buffer size', () => {
    const width = 16, height = 16;
    const buf = Buffer.alloc(width * height, 128);
    const result = computeAdaptiveThreshold(buf, width, height);
    assert.equal(result.length, width * height);
  });

  it('dark uniform image produces threshold of 0 (mean - C goes negative, clamped)', () => {
    const width = 16, height = 16;
    const buf = Buffer.alloc(width * height, 30);
    const result = computeAdaptiveThreshold(buf, width, height);
    assert.equal(result[0], 0);
  });

  it('bright uniform image produces threshold of mean - 40', () => {
    const width = 16, height = 16;
    const buf = Buffer.alloc(width * height, 200);
    const result = computeAdaptiveThreshold(buf, width, height);
    assert.equal(result[0], 160);
  });

  it('all threshold values stay within 0–255', () => {
    const width = 32, height = 32;
    const buf = Buffer.from(Array.from({ length: width * height }, () => Math.floor(Math.random() * 256)));
    const result = computeAdaptiveThreshold(buf, width, height);
    for (const val of result) {
      assert.ok(val >= 0 && val <= 255);
    }
  });
});

// ─── generateRecommendation ──────────────────────────────────────────────────

describe('generateRecommendation', () => {
  it('returns Stable when spot count has not changed significantly', () => {
    const current  = { spotCount: 20, textureScore: 0.3, averagePigmentation: 0.2 };
    const baseline = { spotCount: 20, textureScore: 0.3, averagePigmentation: 0.2 };
    const result = generateRecommendation(current, baseline);
    assert.equal(result.status, 'Stable');
  });

  it('returns Regression Detected when spot count increases by more than 20%', () => {
    const current  = { spotCount: 25, textureScore: 0.3, averagePigmentation: 0.2 };
    const baseline = { spotCount: 20, textureScore: 0.3, averagePigmentation: 0.2 };
    const result = generateRecommendation(current, baseline);
    assert.equal(result.status, 'Regression Detected');
  });

  it('returns Alert when spot count exceeds 50', () => {
    const current  = { spotCount: 55, textureScore: 0.3, averagePigmentation: 0.2 };
    const baseline = { spotCount: 54, textureScore: 0.3, averagePigmentation: 0.2 };
    const result = generateRecommendation(current, baseline);
    assert.equal(result.status, 'Alert');
  });

  it('returns Stable on first scan when there is no baseline', () => {
    const current = { spotCount: 10, textureScore: 0.3, averagePigmentation: 0.2 };
    const result = generateRecommendation(current, null);
    assert.equal(result.status, 'Stable');
  });

  it('always returns a non-empty advice string', () => {
    const current = { spotCount: 5, textureScore: 0.2, averagePigmentation: 0.1 };
    const result = generateRecommendation(current, null);
    assert.ok(result.advice.length > 0);
  });
});
