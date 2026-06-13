/**
 * Tests for tools/bench-step.mjs – runBench, formatReport, arithmetic consistency.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runBench, formatReport } from '../tools/bench-step.mjs';

const STEPS_FOR_8H = 576_000; // 8h * 3600s / 0.05s

test('runBench returns positive nsPerStep', () => {
  const result = runBench({ steps: 50_000, warmup: 5_000 });
  assert.ok(result.nsPerStep > 0, `nsPerStep should be > 0, got ${result.nsPerStep}`);
});

test('runBench stepsFor8h equals 576000', () => {
  const result = runBench({ steps: 50_000, warmup: 5_000 });
  assert.equal(result.stepsFor8h, STEPS_FOR_8H);
});

test('runBench catchUpMs8h = nsPerStep * stepsFor8h / 1e6', () => {
  const result = runBench({ steps: 50_000, warmup: 5_000 });
  const expected = result.nsPerStep * STEPS_FOR_8H / 1e6;
  // Allow tiny floating point tolerance
  assert.ok(
    Math.abs(result.catchUpMs8h - expected) < 0.001,
    `catchUpMs8h arithmetic mismatch: ${result.catchUpMs8h} !== ${expected}`
  );
});

test('runBench state remains consistent after run (curStep is finite)', () => {
  // runBench is self-contained – state is internal, but we can verify the result doesn't crash
  const result = runBench({ steps: 10_000, warmup: 1_000 });
  assert.ok(Number.isFinite(result.nsPerStep));
  assert.ok(Number.isFinite(result.stepsPerSec));
});

test('runBench loadedHeap result is positive', () => {
  const result = runBench({ steps: 50_000, warmup: 5_000 });
  assert.ok(result.loadedHeap !== undefined);
  assert.ok(result.loadedHeap.nsPerStep > 0);
  assert.ok(result.loadedHeap.catchUpMs8h > 0);
});

test('formatReport contains required sections', () => {
  const result = runBench({ steps: 10_000, warmup: 1_000 });
  const report = formatReport(result);
  assert.ok(report.includes('METODIKA'), 'report should contain METODIKA');
  assert.ok(report.includes('VÝSLEDKY'), 'report should contain VÝSLEDKY');
  assert.ok(report.includes('VYHODNOCENÍ CAPU'), 'report should contain VYHODNOCENÍ CAPU');
  assert.ok(report.includes('SYNTETICKÝ'), 'report should contain SYNTETICKÝ');
  assert.ok(report.includes('A2'), 'report should contain A2 marker');
});

test('formatReport mentions stepsFor8h = 576000', () => {
  const result = runBench({ steps: 10_000, warmup: 1_000 });
  const report = formatReport(result);
  assert.ok(report.includes('576'), 'report should mention 576000 steps');
});
