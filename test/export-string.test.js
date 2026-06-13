/**
 * export-string.test.js – iter-008 T-003
 * Tests for src/save/exportString.js: export/import round-trip, compression, error handling.
 * Covers T5 spec from design_iter-008_T-001.md.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadCatalog, clearCatalogs } from '../src/core/catalog/index.js';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { initRng, hashState } from '../src/core/engine/rng.js';
import { createRegistry } from '../src/core/registry/registry.js';
import { registerCorePeriodics } from '../src/core/engine/tickOrder.js';
import { step } from '../src/core/engine/clock.js';
import { applyPersist } from '../src/save/persistSchema.js';
import { exportToString, importFromString } from '../src/save/exportString.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');

function loadJson(name) {
  return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8'));
}

/** Dummy catalog handle for loadAndReconstruct (catalogs loaded into global store) */
const CATALOG = {};

before(() => {
  clearCatalogs();
  for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'military', 'achievements', 'population']) {
    loadCatalog(name, loadJson(name));
  }
});

after(() => {
  clearCatalogs();
});

function makeFreshState(seed = 0xFACEFEED) {
  const state = createInitialState({ seed });
  initRng(state);
  state.home.population.total = 80;
  state.home.housing.counts = { tent: 4, hovel: 1 };
  state.home.food.store = { bread: 300, fish: 80 };
  state.player.gold = 750;
  return state;
}

function makeCtx() {
  const registry = createRegistry();
  const periodics = registerCorePeriodics(registry);
  return { registry, periodics };
}

// ---------------------------------------------------------------------------
// Round-trip
// ---------------------------------------------------------------------------
describe('export/import round-trip', () => {
  it('basic round-trip: export→import → same allowlisted state fields', () => {
    const state = makeFreshState();
    const ctx = makeCtx();
    // Run some steps to make state non-trivial
    for (let i = 0; i < 100; i++) step(state, ctx);

    const str = exportToString(state);
    const { state: imported } = importFromString(str, CATALOG);

    // Compare allowlisted fields only (import goes through loadAndReconstruct which may recalc derivates)
    const origPayload = applyPersist(state);
    const importPayload = applyPersist(imported);
    assert.deepEqual(origPayload.engine, importPayload.engine, 'engine fields should match after round-trip');
    assert.deepEqual(origPayload.home, importPayload.home, 'home fields should match after round-trip');
    assert.deepEqual(origPayload.player, importPayload.player, 'player fields should match after round-trip');
  });

  it('hashState matches after round-trip (via applyPersist pipeline)', () => {
    const state = makeFreshState(0x11223344);
    const ctx = makeCtx();
    for (let i = 0; i < 200; i++) step(state, ctx);

    const str = exportToString(state);
    const { state: imported } = importFromString(str, CATALOG);

    // After loadAndReconstruct, re-apply persist to both and compare hashes
    // (loadAndReconstruct uses same allowlist, so hashes of reconstructed states should be equal)
    const { state: reimported } = importFromString(exportToString(imported), CATALOG);
    assert.equal(hashState(imported), hashState(reimported),
      'Import is idempotent: exporting and importing again produces same hash');
  });

  it('lastSimTimestamp is preserved in envelope (S-6: importFromString returns {state, lastSimTimestamp})', () => {
    const state = makeFreshState();
    const testTimestamp = 1700000000000;
    const str = exportToString(state, { lastSimTimestamp: testTimestamp });
    // importFromString now returns { state, lastSimTimestamp }
    const result = importFromString(str, CATALOG);
    assert.ok(result, 'importFromString should succeed');
    assert.ok(result.state, 'result.state should exist');
    assert.ok(Number.isFinite(result.state.engine.curStep), 'curStep should be finite after import');
    assert.equal(result.lastSimTimestamp, testTimestamp, 'lastSimTimestamp should be preserved in envelope');
  });

  it('export then run N steps on original; import then run same N steps → same hash', () => {
    const N = 100;
    const stateA = makeFreshState(0xBEEFCAFE);
    const ctxA = makeCtx();

    // Export BEFORE running steps
    const str = exportToString(stateA);

    // Run N steps on original
    for (let i = 0; i < N; i++) step(stateA, ctxA);

    // Import and run same N steps
    const { state: stateB } = importFromString(str, CATALOG);
    const ctxB = makeCtx();
    for (let i = 0; i < N; i++) step(stateB, ctxB);

    assert.equal(hashState(stateA), hashState(stateB),
      'Export→import→run same steps must produce identical hash (G1 across transfer)');
  });
});

// ---------------------------------------------------------------------------
// Compression
// ---------------------------------------------------------------------------
describe('export compression', () => {
  it('exported string is shorter than raw JSON (compression works)', () => {
    const state = makeFreshState();
    const str = exportToString(state);
    const rawJson = JSON.stringify(applyPersist(state));
    assert.ok(str.length < rawJson.length,
      `Exported string (${str.length}) should be shorter than raw JSON (${rawJson.length})`);
  });

  it('exported string is a non-empty string', () => {
    const state = makeFreshState();
    const str = exportToString(state);
    assert.equal(typeof str, 'string');
    assert.ok(str.length > 0, 'Export string should not be empty');
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------
describe('importFromString error handling', () => {
  it('corrupt string throws decompression error', () => {
    assert.throws(
      () => importFromString('xxx-not-valid-base64-lzstring', CATALOG),
      /decompression failed|JSON parse failed|version mismatch|payload missing/,
      'Should throw on decompression failure'
    );
  });

  it('empty string throws', () => {
    assert.throws(
      () => importFromString('', CATALOG),
      /decompression failed|JSON parse failed|version mismatch|payload missing/,
    );
  });

  it('valid base64 but garbage inside throws', () => {
    // 'AAAA' is a valid base64 string that decompresses to nonsense or fails JSON parse
    assert.throws(
      () => importFromString('AAAA', CATALOG),
      /Error/,
    );
  });

  it('null string throws', () => {
    assert.throws(
      () => importFromString(/** @type {any} */ (null), CATALOG),
      /Error/,
    );
  });
});

// ---------------------------------------------------------------------------
// Allowlist parity
// ---------------------------------------------------------------------------
describe('allowlist parity', () => {
  it('exported payload contains same keys as applyPersist(state)', () => {
    // Since exportToString calls applyPersist internally, we verify idempotency:
    // applyPersist(importFromString(exportToString(state)).state) should have same top-level keys
    const state = makeFreshState();
    const str = exportToString(state);
    const { state: imported } = importFromString(str, CATALOG);

    const origKeys = Object.keys(applyPersist(state)).sort();
    const importKeys = Object.keys(applyPersist(imported)).sort();

    assert.deepEqual(origKeys, importKeys, 'Exported and imported state should have same allowlist keys');
  });

  it('engine.frameBudget is NOT in export payload', () => {
    const state = makeFreshState();
    const payload = applyPersist(state);
    assert.ok(!('frameBudget' in (/** @type {any} */ (payload).engine ?? {})),
      'frameBudget should be excluded from persist payload');
  });
});
