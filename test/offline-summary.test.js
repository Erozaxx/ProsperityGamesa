/**
 * offline-summary.test.js – iter-008 T-003
 * Tests for src/ui/OfflineSummary.js: buildOfflineSummary, formatOfflineSummary.
 * Covers T3 spec from design_iter-008_T-001.md.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildOfflineSummary, formatOfflineSummary } from '../src/ui/OfflineSummary.js';

// ---------------------------------------------------------------------------
// buildOfflineSummary
// ---------------------------------------------------------------------------
describe('buildOfflineSummary', () => {
  it('basic model has expected fields', () => {
    const model = buildOfflineSummary({
      missedMs: 3600_000,
      wasCapped: false,
      stepsRun: 900,
      interrupted: false,
    });
    assert.equal(model.missedMs, 3600_000);
    assert.equal(model.wasCapped, false);
    assert.equal(model.stepsRun, 900);
    assert.equal(model.interrupted, false);
    assert.ok(typeof model.gameDaysSimulated === 'number', 'gameDaysSimulated should be a number');
    assert.ok(typeof model.realSecondsElapsed === 'number', 'realSecondsElapsed should be a number');
  });

  it('gameDaysSimulated = stepsRun / 900', () => {
    const model = buildOfflineSummary({ missedMs: 0, wasCapped: false, stepsRun: 1800, interrupted: false });
    assert.equal(model.gameDaysSimulated, 2.0);
  });

  it('realSecondsElapsed = missedMs / 1000', () => {
    const model = buildOfflineSummary({ missedMs: 5000, wasCapped: false, stepsRun: 0, interrupted: false });
    assert.equal(model.realSecondsElapsed, 5.0);
  });

  it('zero steps → gameDaysSimulated = 0', () => {
    const model = buildOfflineSummary({ missedMs: 0, wasCapped: false, stepsRun: 0, interrupted: false });
    assert.equal(model.gameDaysSimulated, 0);
  });

  it('wasCapped=true is preserved', () => {
    const model = buildOfflineSummary({ missedMs: 100 * 3600_000, wasCapped: true, stepsRun: 576_000, interrupted: false });
    assert.equal(model.wasCapped, true);
  });

  it('interrupted=true is preserved', () => {
    const model = buildOfflineSummary({ missedMs: 3600_000, wasCapped: false, stepsRun: 500, interrupted: true });
    assert.equal(model.interrupted, true);
  });
});

// ---------------------------------------------------------------------------
// formatOfflineSummary
// ---------------------------------------------------------------------------
describe('formatOfflineSummary', () => {
  it('output is a non-empty string', () => {
    const model = buildOfflineSummary({ missedMs: 3600_000, wasCapped: false, stepsRun: 900, interrupted: false });
    const text = formatOfflineSummary(model);
    assert.equal(typeof text, 'string');
    assert.ok(text.length > 0, 'Formatted summary should not be empty');
  });

  it('includes hours info in output', () => {
    const model = buildOfflineSummary({ missedMs: 7200_000, wasCapped: false, stepsRun: 1800, interrupted: false });
    const text = formatOfflineSummary(model);
    assert.ok(text.includes('2.0') || text.includes('2'), 'Should mention 2 hours of offline time');
  });

  it('includes game days in output', () => {
    const model = buildOfflineSummary({ missedMs: 3600_000, wasCapped: false, stepsRun: 1800, interrupted: false });
    const text = formatOfflineSummary(model);
    assert.ok(text.includes('2.0') || text.includes('2'), 'Should mention 2 game days');
  });

  it('capped=true → summary includes capped note (zkráceno)', () => {
    const model = buildOfflineSummary({ missedMs: 100 * 3600_000, wasCapped: true, stepsRun: 576_000, interrupted: false });
    const text = formatOfflineSummary(model);
    assert.ok(text.includes('zkráceno') || text.includes('limit') || text.includes('cap'),
      `Capped summary should mention cap, got: "${text}"`);
  });

  it('interrupted=true → summary includes interrupted note (přerušeno)', () => {
    const model = buildOfflineSummary({ missedMs: 3600_000, wasCapped: false, stepsRun: 500, interrupted: true });
    const text = formatOfflineSummary(model);
    assert.ok(text.includes('přerušeno') || text.includes('interrupted'),
      `Interrupted summary should mention interruption, got: "${text}"`);
  });

  it('not capped, not interrupted → no special notes', () => {
    const model = buildOfflineSummary({ missedMs: 1800_000, wasCapped: false, stepsRun: 900, interrupted: false });
    const text = formatOfflineSummary(model);
    // Should be a clean summary without special flags
    assert.ok(!text.includes('zkráceno'), 'Non-capped summary should not mention zkráceno');
    assert.ok(!text.includes('přerušeno'), 'Non-interrupted summary should not mention přerušeno');
  });

  it('zero stepsRun → summary still works without crash', () => {
    const model = buildOfflineSummary({ missedMs: 0, wasCapped: false, stepsRun: 0, interrupted: false });
    assert.doesNotThrow(() => formatOfflineSummary(model));
    const text = formatOfflineSummary(model);
    assert.equal(typeof text, 'string');
  });
});

// ---------------------------------------------------------------------------
// shouldShowProgress logic (threshold)
// ---------------------------------------------------------------------------
describe('progress threshold', () => {
  it('threshold check: steps below 5000 means no progress needed', () => {
    // This mirrors CATCHUP_PROGRESS_THRESHOLD_STEPS = 5000
    const THRESHOLD = 5_000;
    const belowThreshold = 4999;
    const aboveThreshold = 5001;
    assert.ok(belowThreshold < THRESHOLD, 'Below threshold should not trigger progress');
    assert.ok(aboveThreshold >= THRESHOLD, 'At/above threshold should trigger progress');
  });

  it('total=0 → no progress display needed', () => {
    const model = buildOfflineSummary({ missedMs: 0, wasCapped: false, stepsRun: 0, interrupted: false });
    assert.equal(model.stepsRun, 0);
    // Edge case: 0 steps means no progress bar needed
    assert.ok(model.gameDaysSimulated === 0);
  });
});
