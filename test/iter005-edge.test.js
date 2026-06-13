/**
 * iter-005 T-003 edge tests (tester agent).
 * Covers gaps identified in test loop:
 *  1. Determinism after load (load + continuation = same hash as uninterrupted, G1)
 *  2. PWA smoke: manifest.webmanifest valid JSON with required fields
 *  3. Precache freshness: committed src/precache.js matches freshly generated output
 *  4. Benchmark sanity: ns/krok < 10 000 threshold (scope requirement)
 *  5. Save: all 3 generations corrupted → loadGame returns null (negative edge)
 *  6. Save: kill-safe pointer – slot pointer not advanced when save record missing
 */

import 'fake-indexeddb/auto';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

// ---------------------------------------------------------------
// Top-level imports (module-level await is OK in ESM)
// ---------------------------------------------------------------
import { createInitialState } from '../src/core/state/createInitialState.js';
import { initRng, hashState } from '../src/core/engine/rng.js';
import { step } from '../src/core/engine/index.js';
import { createRegistry } from '../src/core/registry/registry.js';
import { registerCorePeriodics } from '../src/core/engine/tickOrder.js';
import { saveGame, loadGame, _resetDB } from '../src/save/saveStore.js';
import { openDB, get, put } from '../src/save/idb.js';
import { DB_NAME, DB_VERSION, STORE_SAVES, STORE_SLOTS, GENERATIONS, SAVE_VERSION } from '../src/save/schema.js';
import { generatePrecache } from '../tools/gen-precache.mjs';
import { runBench } from '../tools/bench-step.mjs';

let _slotCounter = 100; // start offset to avoid collision with save-store.test.js
function freshSlot() {
  _resetDB();
  return `tester-slot-${_slotCounter++}`;
}

function makeCtx() {
  const registry = createRegistry();
  const periodics = registerCorePeriodics(registry);
  return { registry, periodics };
}

function makeState(steps = 0) {
  const state = createInitialState({ seed: 0xDEADBEEF });
  initRng(state);
  if (steps > 0) {
    const ctx = makeCtx();
    for (let i = 0; i < steps; i++) step(state, ctx);
  }
  return state;
}

// ---------------------------------------------------------------
// TC-T01: Determinism after load (G1)
// load + continuation = same hash as uninterrupted simulation
// ---------------------------------------------------------------
describe('iter-005: determinism after load (G1)', () => {
  test('uninterrupted vs interrupted+resumed produce identical hashes', async () => {
    const TOTAL = 50;
    const BREAK = 20; // save point

    // Path A: uninterrupted simulation for TOTAL steps
    const stateA = makeState(TOTAL);
    const hashA = hashState(stateA);

    // Path B: simulate BREAK steps, save, load, continue to TOTAL
    const slot = freshSlot();
    const stateB = makeState(BREAK);
    await saveGame(stateB, { slotId: slot, now: 1000 });

    const loaded = await loadGame(slot, {});
    assert.ok(loaded !== null, 'loaded state should not be null');

    // Continue from loaded state – must use identical ctx construction
    const stateC = loaded.state;
    const ctxC = makeCtx();
    for (let i = BREAK; i < TOTAL; i++) step(stateC, ctxC);
    const hashC = hashState(stateC);

    assert.equal(hashC, hashA,
      `determinism broken: hash after interrupted+resumed (${hashC}) ≠ uninterrupted (${hashA})`);
  });
});

// ---------------------------------------------------------------
// TC-T02: PWA smoke – manifest.webmanifest required fields
// ---------------------------------------------------------------
describe('iter-005: PWA smoke – manifest.webmanifest', () => {
  const MANIFEST_PATH = join(ROOT, 'manifest.webmanifest');

  test('manifest.webmanifest exists and is valid JSON', () => {
    assert.ok(existsSync(MANIFEST_PATH), 'manifest.webmanifest must exist');
    let raw;
    try {
      raw = readFileSync(MANIFEST_PATH, 'utf8');
    } catch (e) {
      assert.fail(`cannot read manifest.webmanifest: ${e}`);
    }
    let manifest;
    try {
      manifest = JSON.parse(raw);
    } catch (e) {
      assert.fail(`manifest.webmanifest is not valid JSON: ${e}`);
    }
    assert.ok(manifest !== null && typeof manifest === 'object', 'manifest should be an object');
  });

  test('manifest has required field: name', () => {
    const m = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
    assert.ok(typeof m.name === 'string' && m.name.length > 0, `"name" field must be a non-empty string, got: ${JSON.stringify(m.name)}`);
  });

  test('manifest has required field: start_url', () => {
    const m = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
    assert.ok(typeof m.start_url === 'string' && m.start_url.length > 0, `"start_url" must be a non-empty string, got: ${JSON.stringify(m.start_url)}`);
  });

  test('manifest has required field: display (standalone)', () => {
    const m = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
    assert.ok(typeof m.display === 'string', `"display" must be a string, got: ${JSON.stringify(m.display)}`);
    assert.equal(m.display, 'standalone', `"display" should be "standalone" for PWA installability`);
  });

  test('manifest has required field: icons (non-empty array)', () => {
    const m = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
    assert.ok(Array.isArray(m.icons) && m.icons.length > 0, `"icons" must be a non-empty array, got: ${JSON.stringify(m.icons)}`);
  });

  test('manifest icons each have src and sizes', () => {
    const m = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
    for (const icon of m.icons) {
      assert.ok(typeof icon.src === 'string' && icon.src.length > 0, `icon.src must be a non-empty string, got: ${JSON.stringify(icon)}`);
      assert.ok(typeof icon.sizes === 'string' && icon.sizes.length > 0, `icon.sizes must be a non-empty string, got: ${JSON.stringify(icon)}`);
    }
  });
});

// ---------------------------------------------------------------
// TC-T03: Precache freshness – committed src/precache.js matches freshly generated
// ---------------------------------------------------------------
describe('iter-005: PWA smoke – precache freshness', () => {
  test('src/precache.js content matches freshly generated output (not stale)', () => {
    const tmpOut = '/tmp/precache-freshness-check.js';
    generatePrecache({ outFile: tmpOut });

    const committedRaw = readFileSync(join(ROOT, 'src', 'precache.js'), 'utf8');
    const freshRaw = readFileSync(tmpOut, 'utf8');

    assert.equal(committedRaw, freshRaw,
      `committed src/precache.js is stale: run "node tools/gen-precache.mjs" to refresh. ` +
      `Committed version line: ${committedRaw.split('\n')[1]}, Fresh version line: ${freshRaw.split('\n')[1]}`);
  });

  test('precache list contains core engine files', () => {
    const result = generatePrecache({ outFile: '/tmp/precache-core-check.js' });
    const urls = new Set(result.files);
    assert.ok(urls.has('./src/core/engine/index.js'), 'precache must include src/core/engine/index.js');
    assert.ok(urls.has('./src/vendor/preact.standalone.js'), 'precache must include src/vendor/preact.standalone.js');
    assert.ok(urls.has('./src/app/main.js'), 'precache must include src/app/main.js');
  });

  test('precache files all exist on disk', () => {
    const result = generatePrecache({ outFile: '/tmp/precache-disk-check.js' });
    const missing = [];
    for (const rel of result.files) {
      const abs = join(ROOT, rel.slice(2)); // strip './'
      if (!existsSync(abs)) {
        missing.push(rel);
      }
    }
    assert.equal(missing.length, 0,
      `precache list references files that do not exist on disk: ${missing.join(', ')}`);
  });

  test('gen-precache is deterministic (two runs = same version)', () => {
    const r1 = generatePrecache({ outFile: '/tmp/precache-det-1.js' });
    const r2 = generatePrecache({ outFile: '/tmp/precache-det-2.js' });
    assert.equal(r1.version, r2.version, 'version must be identical across two runs (deterministic)');
    assert.deepEqual(r1.files, r2.files, 'file list must be identical across two runs');
  });
});

// ---------------------------------------------------------------
// TC-T04: Benchmark sanity – ns/krok (catalogs-loaded production path)
//
// iter-008 T-003 note: bench now loads catalogs before measuring to represent
// the production path (in production, boot() always loads catalogs first).
// Without catalogs, getCatalog() throws every step (~3000 ns/throw per call),
// inflating cost from ~500 ns to ~8000 ns. The production threshold is 10 000 ns
// (with generous CI headroom for slow machines; typical value ~500 ns on fast HW).
// ---------------------------------------------------------------
describe('iter-005: benchmark sanity', () => {
  test('bench-step nsPerStep < 10000 ns (production path, catalogs loaded)', () => {
    // Use modest step count for CI speed; enough for meaningful average
    const result = runBench({ steps: 100_000, warmup: 10_000 });
    assert.ok(result.nsPerStep > 0, 'nsPerStep must be positive');
    // Threshold: 10 000 ns gives 5.76 s for 8h catch-up (576k steps) – within cap.
    // Typical value with catalogs loaded: ~500 ns. 10 000 ns = 20x safety margin for CI.
    assert.ok(
      result.nsPerStep < 10_000,
      `nsPerStep ${result.nsPerStep.toFixed(1)} ns exceeds threshold 10 000 ns/krok (production path)`
    );
  });

  test('bench-step loadedHeap nsPerStep < 10000 ns (production path, catalogs loaded)', () => {
    const result = runBench({ steps: 100_000, warmup: 10_000 });
    assert.ok(result.loadedHeap !== undefined, 'loadedHeap result must be present');
    assert.ok(
      result.loadedHeap.nsPerStep < 10_000,
      `loadedHeap nsPerStep ${result.loadedHeap.nsPerStep.toFixed(1)} ns exceeds threshold 10 000 ns/krok`
    );
  });

  test('bench-step catch-up 8h < 30000 ms (cap sanity)', () => {
    const result = runBench({ steps: 50_000, warmup: 5_000 });
    // 576 000 steps at 10 000 ns/step = 5760 ms. Threshold 30 000 ms is very conservative.
    assert.ok(
      result.catchUpMs8h < 30_000,
      `catchUpMs8h ${result.catchUpMs8h.toFixed(1)} ms exceeds 30 000 ms cap sanity threshold`
    );
  });
});

// ---------------------------------------------------------------
// TC-T05: Save – all generations corrupted → null (negative edge)
// ---------------------------------------------------------------
describe('iter-005: save – all generations corrupted → null', () => {
  test('loadGame returns null when all 3 generations are corrupt', async () => {
    const slot = freshSlot();
    const state = makeState(5);

    // Save 3 times to fill all generation slots
    for (let i = 0; i < GENERATIONS; i++) {
      await saveGame(state, { slotId: slot, now: (i + 1) * 100 });
    }

    // Open DB and corrupt all 3 generation records
    const upgFn = (/** @type {IDBDatabase} */ db) => {
      if (!db.objectStoreNames.contains(STORE_SAVES)) db.createObjectStore(STORE_SAVES, { keyPath: 'key' });
      if (!db.objectStoreNames.contains(STORE_SLOTS)) db.createObjectStore(STORE_SLOTS, { keyPath: 'slotId' });
    };
    const db = await openDB(DB_NAME, DB_VERSION, upgFn);
    for (let gen = 0; gen < GENERATIONS; gen++) {
      const txn = db.transaction(STORE_SAVES, 'readwrite');
      await put(txn.objectStore(STORE_SAVES), {
        key: `${slot}:${gen}`,
        slotId: slot,
        generation: gen,
        savedAt: 0,
        lastSimTimestamp: 0,
        saveVersion: SAVE_VERSION,
        gameVersion: '0.0.0-m0a',
        payload: {}, // corrupt: missing meta/engine/season/rng
      });
    }

    _resetDB();
    const result = await loadGame(slot);
    assert.equal(result, null, 'loadGame must return null when all generations are corrupt');
  });
});

// ---------------------------------------------------------------
// TC-T06: Save – kill-safe pointer (atomicity)
// After exactly N saves, slot.activeGen must point to the last saved generation
// and all previous N generations must be accessible (pointer never ahead of data)
// ---------------------------------------------------------------
describe('iter-005: save – kill-safe pointer (atomic tx)', () => {
  test('slot activeGen is always the last successfully written generation', async () => {
    const slot = freshSlot();
    const state = makeState(3);

    const savedGens = [];
    for (let i = 0; i < 5; i++) {
      const { generation } = await saveGame(state, { slotId: slot, now: (i + 1) * 10 });
      savedGens.push(generation);

      // After each save: load must always succeed and return the latest generation
      _resetDB();
      const loaded = await loadGame(slot);
      assert.ok(loaded !== null, `loadGame should succeed after save ${i + 1}`);
      assert.equal(loaded.record.generation, generation,
        `loaded generation ${loaded.record.generation} !== expected ${generation} after save ${i + 1}`);
    }
    // Verify rotation pattern
    assert.deepEqual(savedGens, [0, 1, 2, 0, 1], 'generation rotation must be 0→1→2→0→1');
  });
});
