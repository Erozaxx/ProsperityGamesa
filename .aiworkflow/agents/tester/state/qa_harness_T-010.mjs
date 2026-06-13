/**
 * Independent QA harness for iter-012 T-010 (tester).
 * Validates AC3 (long sim), AC4 (accounting invariant), AC5 (determinism on full hashState),
 * AC6 (save shape v3). Uses ONLY public engine/save API. Does NOT touch production code.
 *
 * Run from repo root: node .aiworkflow/agents/tester/state/qa_harness_T-010.mjs
 */
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createInitialState } from '../../../../src/core/state/createInitialState.js';
import { initRng, hashState } from '../../../../src/core/engine/rng.js';
import { step } from '../../../../src/core/engine/index.js';
import { createRegistry } from '../../../../src/core/registry/registry.js';
import { registerCorePeriodics } from '../../../../src/core/engine/tickOrder.js';
import { saveGame, loadGame, _resetDB } from '../../../../src/save/saveStore.js';
import { applyPersist } from '../../../../src/save/persistSchema.js';
import { loadCatalog, clearCatalogs, getCatalog, hasCatalog, buildById } from '../../../../src/core/catalog/index.js';
import { DAYS_PER_YEAR } from '../../../../src/core/systems/population.js';
import { BALANCE } from '../../../../src/core/balance/balance.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..', '..', '..', '..'); // repo root /home/user/ProsperityGamesa
const DATA_DIR = join(ROOT, 'src', 'data');

function loadJson(name) {
  return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8'));
}

// Mirror production catalog bootstrap (app/catalogs.js list + buildById).
const CATALOG_NAMES = ['achievements', 'buildings', 'food', 'goods', 'houseTypes', 'jobs', 'military', 'resources', 'companies', 'skills', 'population'];
function loadAllCatalogs() {
  clearCatalogs();
  for (const name of CATALOG_NAMES) {
    try { loadCatalog(name, loadJson(name)); } catch (e) { /* some optional */ }
  }
  buildById();
}

function buildCtxCatalog() {
  const catalog = {};
  for (const name of ['jobs', 'skills', 'houseTypes', 'food', 'goods']) {
    if (hasCatalog(name)) {
      const cat = getCatalog(name);
      const items = cat[name];
      catalog[name] = Array.isArray(items) ? items : [];
    }
  }
  return catalog;
}

// ctx mirrors production bootstrapEngine (registry + periodics + preloaded catalog).
function makeCtx(extra) {
  const registry = createRegistry();
  const periodics = registerCorePeriodics(registry);
  return { registry, periodics, catalog: buildCtxCatalog(), ...(extra || {}) };
}

function freshState(seed = 0xCAFEBABE) {
  const state = createInitialState({ seed });
  initRng(state);
  return state;
}

const results = [];
function rec(ac, pass, detail) {
  results.push({ ac, pass, detail });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${ac}: ${detail}`);
}

loadAllCatalogs();
const STEPS_PER_DAY = 900;
const DPY = DAYS_PER_YEAR; // 364
console.log(`DAYS_PER_YEAR=${DPY}, sanityMaxPop=${BALANCE.population.sanityMaxPop}, STEPS_PER_DAY=${STEPS_PER_DAY}`);

// =====================================================================
// AC3 — Long seeded sim >= 2 game years (>=728 days) without crash;
//        population neither explodes (sanity cap) nor collapses to 0 nonsensically.
// =====================================================================
(function ac3() {
  const YEARS = 2;
  const TARGET_DAYS = YEARS * DPY; // 728
  const TARGET_STEPS = TARGET_DAYS * STEPS_PER_DAY; // 655200
  const state = freshState(0x0A11CE);
  const ctx = makeCtx();
  const startPop = state.home.population.total;
  const startGold = state.player.gold;
  let maxPop = startPop, minPop = startPop;
  let crashed = null;
  let i = 0;
  try {
    for (; i < TARGET_STEPS; i++) {
      step(state, ctx);
      const p = state.home.population.total;
      if (p > maxPop) maxPop = p;
      if (p < minPop) minPop = p;
      if (!Number.isFinite(p) || p < 0) { crashed = `invalid pop ${p} at step ${i}`; break; }
      if (!Number.isFinite(state.player.gold) || state.player.gold < 0) { crashed = `invalid gold ${state.player.gold} at step ${i}`; break; }
    }
  } catch (e) {
    crashed = `EXCEPTION at step ${i}: ${e && e.message}`;
  }
  const finalPop = state.home.population.total;
  const finalDay = state.season._absDay;
  const cap = BALANCE.population.sanityMaxPop;
  const noCrash = crashed === null;
  const capHeld = maxPop <= cap;
  const notZero = finalPop > 0;
  const pass = noCrash && capHeld && notZero && i >= TARGET_STEPS;
  rec('AC3 long-sim', pass,
    `stepsRun=${i}/${TARGET_STEPS} absDay=${finalDay} (Rok ${state.season.curYear}) startPop=${startPop} finalPop=${finalPop} maxPop=${maxPop} minPop=${minPop} cap=${cap} startGold=${startGold} finalGold=${state.player.gold} crash=${crashed || 'none'} | noCrash=${noCrash} capHeld=${capHeld} notZero=${notZero}`);
})();

// =====================================================================
// AC4 — Accounting invariant: Σ gold-tx == Δ player.gold over a long run.
//        Wire ctx.emitTx like production (app/main.js: ctx.emitTx = recordTx),
//        but here accumulate gold deltas. Also cross-check with raw player.gold delta.
//        Note: gold handler clamps remove at 0; in normal pay() flow canAfford prevents
//        over-spend, so Σ requested == Σ actual. We track both to detect any clamp event.
// =====================================================================
(function ac4() {
  const RUN_STEPS = 90 * STEPS_PER_DAY; // 90 days, exercises 5days/monthly taxes + crime + upkeep
  const state = freshState(0xACC0117);
  let sumGoldTx = 0;
  let txCount = 0, goldTxCount = 0;
  let lastGold = state.player.gold;
  let clampSuspect = 0;
  const emitTx = (tx) => {
    txCount++;
    if (tx.key === 'gold') {
      goldTxCount++;
      sumGoldTx += tx.amount;
    }
  };
  const ctx = makeCtx({ emitTx });
  const startGold = state.player.gold;
  // Per-step reconciliation: detect if a step's gold delta != that step's gold-tx sum
  // (would reveal a direct mutation bypassing the resource layer, or a clamp).
  let stepSumGoldTx = 0;
  let maxStepDiscrepancy = 0;
  let discrepancyDetail = '';
  const wrapEmit = (tx) => {
    if (tx.key === 'gold') stepSumGoldTx += tx.amount;
    txCount++;
    if (tx.key === 'gold') { goldTxCount++; sumGoldTx += tx.amount; }
  };
  ctx.emitTx = wrapEmit;
  for (let i = 0; i < RUN_STEPS; i++) {
    stepSumGoldTx = 0;
    const before = state.player.gold;
    step(state, ctx);
    const after = state.player.gold;
    const realDelta = after - before;
    const diff = realDelta - stepSumGoldTx;
    if (Math.abs(diff) > 1e-9) {
      if (Math.abs(diff) > Math.abs(maxStepDiscrepancy)) {
        maxStepDiscrepancy = diff;
        discrepancyDetail = `step ${i}: realDelta=${realDelta} stepTx=${stepSumGoldTx} before=${before} after=${after}`;
      }
    }
  }
  const endGold = state.player.gold;
  const realTotalDelta = endGold - startGold;
  const invariantHolds = Math.abs(realTotalDelta - sumGoldTx) < 1e-9 && Math.abs(maxStepDiscrepancy) < 1e-9;
  rec('AC4 accounting-invariant', invariantHolds,
    `runSteps=${RUN_STEPS} startGold=${startGold} endGold=${endGold} ΔrealGold=${realTotalDelta} ΣgoldTx=${sumGoldTx} diff(total)=${(realTotalDelta - sumGoldTx)} txTotal=${txCount} goldTx=${goldTxCount} maxStepDiscrepancy=${maxStepDiscrepancy} ${discrepancyDetail ? '('+discrepancyDetail+')' : ''}`);
})();

// =====================================================================
// AC5 — G1 determinism on FULL hashState. save->load->N == continuous N,
//        bit-equality of entire state. Multiple save points incl. early (0, 1).
// =====================================================================
async function ac5() {
  const TOTAL = 1200; // > 1 quarterDay (225), crosses day boundary (900)
  const breakPoints = [0, 1, 2, 113, 225, 226, 450, 899, 900, 901];
  let allPass = true;
  const detail = [];
  let slotCounter = 0;
  for (const BREAK of breakPoints) {
    _resetDB();
    const slot = `qa-ac5-${slotCounter++}`;
    // Path A: continuous TOTAL steps from fresh seeded start
    const seed = 0xD37E124 ^ BREAK;
    const stateA = freshState(seed);
    const ctxA = makeCtx();
    for (let i = 0; i < TOTAL; i++) step(stateA, ctxA);
    const hashA = hashState(stateA);

    // Path B: BREAK steps, save, load (loadAndReconstruct via catalog), continue to TOTAL
    const stateB0 = freshState(seed);
    const ctxB0 = makeCtx();
    for (let i = 0; i < BREAK; i++) step(stateB0, ctxB0);
    await saveGame(stateB0, { slotId: slot, now: 1000 });
    const loaded = await loadGame(slot, {}); // truthy catalog -> loadAndReconstruct
    if (!loaded) { allPass = false; detail.push(`BREAK=${BREAK}: loadGame null`); continue; }
    const stateC = loaded.state;
    const ctxC = makeCtx();
    for (let i = BREAK; i < TOTAL; i++) step(stateC, ctxC);
    const hashC = hashState(stateC);

    const ok = hashA === hashC;
    if (!ok) allPass = false;
    detail.push(`BREAK=${BREAK}: ${ok ? 'OK' : 'MISMATCH'} (A=${hashA} C=${hashC})`);
  }
  rec('AC5 G1-determinism-full-hashState', allPass, detail.join(' | '));
}

// =====================================================================
// AC6 — Save v3 shape: applyPersist(state) payload does NOT contain workforce.total
//        (only assigned). Check on fresh state and after stepping.
// =====================================================================
function ac6() {
  const checks = [];
  let pass = true;
  // fresh
  const s0 = freshState(0xF00D);
  const p0 = applyPersist(s0);
  const wf0 = p0.home && p0.home.workforce;
  const c0 = wf0 && !('total' in wf0) && ('assigned' in wf0);
  if (!c0) pass = false;
  checks.push(`fresh: workforce=${JSON.stringify(wf0)} -> ${c0 ? 'OK (no total)' : 'FAIL'}`);
  // after stepping (workforce.total becomes nonzero via autoAssign)
  const s1 = freshState(0xBEEF);
  const ctx = makeCtx();
  for (let i = 0; i < 1000; i++) step(s1, ctx);
  const p1 = applyPersist(s1);
  const wf1 = p1.home && p1.home.workforce;
  const c1 = wf1 && !('total' in wf1) && ('assigned' in wf1);
  if (!c1) pass = false;
  checks.push(`after 1000 steps (live total=${s1.home.workforce.total}): payload workforce=${JSON.stringify(wf1)} -> ${c1 ? 'OK (no total)' : 'FAIL'}`);
  // save version
  checks.push(`meta.saveVersion=${p1.meta && p1.meta.saveVersion}`);
  rec('AC6 save-v3-shape', pass, checks.join(' | '));
}

await ac5();
ac6();

console.log('\n===== SUMMARY =====');
let allGo = true;
for (const r of results) { if (!r.pass) allGo = false; console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.ac}`); }
console.log(`\nVERDICT: ${allGo ? 'GO' : 'NO-GO'}`);
process.exit(allGo ? 0 : 1);
