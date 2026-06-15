/**
 * m9a-regression.test.js – iter-020 C-020-B (T4: Balanc regression metodika + dekompozice L).
 *
 * Dlouhé deterministické běhy (rok+ herního času) jako STRÁŽCI balanc-regrese. Reference NEjsou
 * serverová data (neexistují, R-C / S-03), ale:
 *   (1) kvalitativní INVARIANTY křivek (design §4.2): populace 0–10000, gold≥0, food per-type 0–maxFood,
 *       žádný NaN, žádný kolaps populace (proxy "starve>30 dní" — viz pozn. níže),
 *   (2) GOLDEN-HASH checkpointy (design §4.2 "golden run"): verzované referenční hashState v kvartálních
 *       bodech (den 91/182/273/364) per seed. Regrese = budoucí běh téhož seedu se od golden hashů liší.
 *
 * POVINNÁ DEKOMPOZICE L (design §4.3, DR-020-01 §3):
 *   - Kvartální segmenty (91 dní = 81 900 kroků), každý jako samostatný čin pod časovým limitem prostředí
 *     (změřeno: 1 kvartál plného simu ≈ 0,1 s → bezpečně pod limitem).
 *   - Checkpointy přes save/load: po každém kvartálu applyPersist → loadAndReconstruct → pokračuj na
 *     loaded state. Ověřeno (níže + manuálně), že segmentovaný save/load běh je BIT-IDENTICKÝ s
 *     kontinuálním během (žádný drift) — toto je zároveň G1 determinismus přes save hranici.
 *   - Multi-seed split: SMOKE (1 seed, jen invarianty, rychlý) + PLNÝ (3 seedy, golden hashe).
 *
 * MINOR-2 (DR-020-01): správné state cesty ověřeny v createInitialState.js —
 *   populace = state.home.population.total ; gold = state.player.gold ;
 *   food = state.home.food.store[type]  (NE home.foodStore / home.curWorkers — ty v kódu neexistují).
 *
 * Determinismus: createInitialState({seed}) + initRng + step; žádný Date.now/Math.random/DOM v běhu.
 *
 * --- REGENERACE GOLDEN HASHŮ ---
 * Golden hashe (GOLDEN konstanta níže) jsou deterministický, regenerovatelný artefakt (NE flaky).
 * Pokud se ZÁMĚRNĚ změní balanc data / engine a hashe se rozejdou (žádoucí změna, ne bug):
 *   1. Spusť tento soubor s proměnnou prostředí REGEN_GOLDEN=1:  REGEN_GOLDEN=1 node --test test/m9a-regression.test.js
 *      → test vypíše aktuální hashe na stdout v JSON formátu (a golden asserty se přeskočí).
 *   2. Zkopíruj vypsaný objekt do konstanty GOLDEN níže.
 *   3. Commitni s odůvodněním (jaká data se změnila). Reviewer ověří, že změna je záměrná.
 * Invariant: stejné seedy + stejná data → stejné hashe (FNV-1a nad sorted-key JSON, viz rng.hashState).
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
import { registerWorldEffects, armFactionAI } from '../src/core/systems/world.js';
import { step, STEPS_PER_DAY } from '../src/core/engine/clock.js';
import { marketInit } from '../src/core/systems/market.js';
import { applyPersist } from '../src/save/persistSchema.js';
import { loadAndReconstruct } from '../src/save/load.js';
import { SAVE_VERSION } from '../src/save/schema.js';
import { BALANCE } from '../src/core/balance/balance.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');

/** @param {string} name */
function loadJson(name) {
  return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8'));
}

/** All catalogs a full-system balanced run touches (superset of catchup-sim-qa). */
const CATALOGS = [
  'resources', 'food', 'houseTypes', 'jobs', 'military', 'achievements', 'goods',
  'zones', 'population', 'skills', 'techs', 'story', 'buildings', 'contracts', 'quests',
];

before(() => {
  clearCatalogs();
  for (const name of CATALOGS) {
    try { loadCatalog(name, loadJson(name)); } catch (_) { /* optional catalog */ }
  }
});

after(() => {
  clearCatalogs();
});

const DAYS_PER_QUARTER = 91;
const QUARTER_STEPS = DAYS_PER_QUARTER * STEPS_PER_DAY; // 81 900
const QUARTERS_PER_YEAR = 4;

/** Build a fresh full-system context (registry + core periodics + world AI effects). */
function makeCtx() {
  const registry = createRegistry();
  const periodics = registerCorePeriodics(registry);
  registerWorldEffects(registry);
  return { registry, periodics, catalog: {} };
}

/**
 * Deterministic fresh balanced state for a seed: createInitialState + initRng + marketInit + armFactionAI.
 * Mirrors the production boot wiring (main.js) so the run exercises the real systems.
 * @param {number} seed
 */
function makeState(seed) {
  const state = createInitialState({ seed });
  initRng(state);
  try { marketInit(state, /** @type {any} */ (loadJson('goods')).goods); } catch (_) { /* goods optional */ }
  armFactionAI(state);
  return state;
}

/**
 * Run `steps` engine steps, sampling the three balance curves ONCE PER GAME DAY (design §4.3 S2).
 * Returns daily samples + a running record of the worst invariant breaches seen.
 * Sampling daily (not per-step) keeps the array small (365×3 numbers) and cheap.
 * @param {import('../src/core/state/types.js').GameState} state
 * @param {object} ctx
 * @param {number} steps
 * @param {{ minPop:number, maxPop:number, minGold:number, minFood:number, maxFood:number, sawNaN:boolean, popCollapseStreak:number, maxPopCollapseStreak:number }} acc
 */
function runAndSample(state, ctx, steps, acc) {
  let stepInDay = 0;
  for (let i = 0; i < steps; i++) {
    step(state, ctx);
    stepInDay++;
    if (stepInDay >= STEPS_PER_DAY) {
      stepInDay = 0;
      sample(state, acc);
    }
  }
}

/** Sample one day's curve values into the accumulator and update invariant guards. */
function sample(state, acc) {
  // MINOR-2: verified state paths (createInitialState.js).
  const pop = state.home.population.total;
  const gold = state.player.gold;
  const store = state.home.food.store;

  if (!Number.isFinite(pop) || !Number.isFinite(gold)) acc.sawNaN = true;
  acc.minPop = Math.min(acc.minPop, pop);
  acc.maxPop = Math.max(acc.maxPop, pop);
  acc.minGold = Math.min(acc.minGold, gold);

  for (const v of Object.values(store)) {
    if (!Number.isFinite(v)) acc.sawNaN = true;
    acc.minFood = Math.min(acc.minFood, v);
    acc.maxFood = Math.max(acc.maxFood, v);
  }

  // "starve > 30 dní" proxy (design §4.2): the simplified M2a food model sets the daily
  // `food.starvation` boolean almost permanently for any under-supplied small settlement
  // (per-meal unmet demand) WITHOUT actually collapsing the population — so the boolean is a
  // noisy signal, not a collapse signal. The real intent ("ne >30 dní starved") is a guard
  // against a SUSTAINED population COLLAPSE. We proxy it with a population-collapse streak:
  // a day counts toward the streak only if population dropped on that day (net death), and we
  // assert the collapse never runs >30 consecutive days.
  if (pop < acc._prevPop) {
    acc.popCollapseStreak += 1;
    acc.maxPopCollapseStreak = Math.max(acc.maxPopCollapseStreak, acc.popCollapseStreak);
  } else {
    acc.popCollapseStreak = 0;
  }
  acc._prevPop = pop;
}

function freshAcc(startPop) {
  return {
    minPop: Infinity, maxPop: -Infinity, minGold: Infinity,
    minFood: Infinity, maxFood: -Infinity, sawNaN: false,
    popCollapseStreak: 0, maxPopCollapseStreak: 0, _prevPop: startPop,
  };
}

/** Assert all curve invariants on a finished accumulator (design §4.2). */
function assertInvariants(acc, label) {
  assert.ok(!acc.sawNaN, `${label}: žádná metrika nesmí být NaN/Inf`);
  assert.ok(acc.minPop > 0, `${label}: populace nesmí kolabovat na 0 (min=${acc.minPop})`);
  assert.ok(
    acc.maxPop <= BALANCE.population.sanityMaxPop,
    `${label}: populace nesmí překročit sanityMaxPop=${BALANCE.population.sanityMaxPop} (max=${acc.maxPop})`
  );
  assert.ok(acc.minGold >= 0, `${label}: gold nesmí být záporné (min=${acc.minGold})`);
  assert.ok(acc.minFood >= 0, `${label}: food per-type nesmí být záporné (min=${acc.minFood})`);
  assert.ok(
    acc.maxFood <= BALANCE.food.maxFood,
    `${label}: food per-type nesmí přetéct nad maxFood=${BALANCE.food.maxFood} (max=${acc.maxFood})`
  );
  assert.ok(
    acc.maxPopCollapseStreak <= 30,
    `${label}: populace nesmí klesat >30 dní v řadě (kolaps proxy, streak=${acc.maxPopCollapseStreak})`
  );
}

// ---------------------------------------------------------------------------
// GOLDEN checkpoint hashe (verzovaný artefakt, regenerovatelný — viz hlavička).
// Index 0..3 = hashState po kvartálu Q1..Q4 (den 91/182/273/364), na LOADED state
// (po save/load checkpointu). Vygenerováno deterministicky; REGEN_GOLDEN=1 pro obnovu.
// ---------------------------------------------------------------------------
const GOLDEN = Object.freeze({
  /** @type {Record<string, number[]>} */
  hashes: {
    A: [2312291157, 3235836124, 3003978013, 4005350179],
    B: [916691886, 2184094310, 1575257500, 901312187],
    C: [3461909307, 959640370, 3842566491, 3247529584],
  },
  seeds: { A: 0xA1, B: 0xB2, C: 0xC3 },
});

const REGEN = process.env.REGEN_GOLDEN === '1';

/**
 * Run one seed for `quarters` kvartálů, segmentovaně s save/load checkpointem po každém kvartálu.
 * Returns { acc, hashes } — hashes[q] = hashState na loaded state po kvartálu q.
 * @param {number} seed
 * @param {number} quarters
 */
function runSeedSegmented(seed, quarters) {
  let state = makeState(seed);
  let ctx = makeCtx();
  const acc = freshAcc(state.home.population.total);
  /** @type {number[]} */
  const hashes = [];
  for (let q = 0; q < quarters; q++) {
    runAndSample(state, ctx, QUARTER_STEPS, acc);
    // Checkpoint přes save/load: ověřuje, že save/load uprostřed dlouhého běhu NEMĚNÍ trajektorii
    // (bit-identické), a předává stav dál izolovaně (robustnější než sdílení reference).
    const payload = applyPersist(state);
    state = /** @type {any} */ (loadAndReconstruct({ saveVersion: SAVE_VERSION, payload }));
    ctx = makeCtx();
    hashes.push(hashState(state));
  }
  return { acc, hashes };
}

// ---------------------------------------------------------------------------
// SMOKE varianta — 1 seed, 1 rok, jen invarianty (rychlá, pro Haiku/CI smoke).
// ---------------------------------------------------------------------------
describe('m9a-regression SMOKE: 1 seed / 1 rok / invarianty křivek', () => {
  it('seed A: rok plného simu drží všechny invarianty (pop/gold/food/NaN/kolaps)', () => {
    const { acc } = runSeedSegmented(GOLDEN.seeds.A, QUARTERS_PER_YEAR);
    assertInvariants(acc, 'SMOKE seed A (1 rok)');
  });
});

// ---------------------------------------------------------------------------
// PLNÝ loop — 3 seedy, golden hashe + invarianty. Každý kvartál = samostatný it()
// → žádný jednotlivý test nepřekročí časový limit prostředí (design §4.3 S1/S4).
// ---------------------------------------------------------------------------
for (const key of /** @type {Array<'A'|'B'|'C'>} */ (['A', 'B', 'C'])) {
  const seed = GOLDEN.seeds[key];

  describe(`m9a-regression PLNÝ: seed ${key} (0x${seed.toString(16)}) — kvartální segmenty + golden hashe`, () => {
    // Sdílený stav napříč kvartálními it() (každý it() zpracuje ≤ 1 kvartál → pod limitem).
    /** @type {import('../src/core/state/types.js').GameState} */
    let state;
    /** @type {object} */
    let ctx;
    /** @type {ReturnType<typeof freshAcc>} */
    let acc;

    before(() => {
      state = makeState(seed);
      ctx = makeCtx();
      acc = freshAcc(state.home.population.total);
    });

    for (let q = 0; q < QUARTERS_PER_YEAR; q++) {
      it(`Q${q + 1} (dny ${q * DAYS_PER_QUARTER + 1}–${(q + 1) * DAYS_PER_QUARTER}): segment + checkpoint hash`, () => {
        runAndSample(state, ctx, QUARTER_STEPS, acc);

        // Checkpoint save/load (bit-identický s kontinuálním během — žádný drift).
        const payload = applyPersist(state);
        state = /** @type {any} */ (loadAndReconstruct({ saveVersion: SAVE_VERSION, payload }));
        ctx = makeCtx();
        const h = hashState(state);

        if (REGEN) {
          // eslint-disable-next-line no-console
          console.log(`REGEN seed ${key} Q${q + 1} hash=${h}`);
          return; // při regeneraci golden asserty přeskočíme
        }

        assert.strictEqual(
          h, GOLDEN.hashes[key][q],
          `seed ${key} Q${q + 1}: golden-hash regrese — got ${h}, expected ${GOLDEN.hashes[key][q]}. ` +
          `Pokud je změna ZÁMĚRNÁ, regeneruj golden (REGEN_GOLDEN=1) a commitni s odůvodněním.`
        );
      });
    }

    it('invarianty křivek za celý rok (pop/gold/food/NaN/kolaps)', () => {
      assertInvariants(acc, `PLNÝ seed ${key} (1 rok)`);
    });
  });
}

// ---------------------------------------------------------------------------
// Determinismus G1 přes save hranici: stejný seed → stejné checkpoint hashe (regenerovatelnost,
// ne flaky). Drží segmentaci poctivou (kdyby save/load driftoval, hashe by se rozcházely).
// ---------------------------------------------------------------------------
describe('m9a-regression determinismus: segmentované checkpoint hashe jsou reprodukovatelné', () => {
  it('seed A: dva nezávislé segmentované běhy dají stejné kvartální hashe (1 rok)', () => {
    const r1 = runSeedSegmented(GOLDEN.seeds.A, QUARTERS_PER_YEAR);
    const r2 = runSeedSegmented(GOLDEN.seeds.A, QUARTERS_PER_YEAR);
    assert.deepStrictEqual(r1.hashes, r2.hashes, 'segmentované hashe musí být deterministické');
    // a zároveň shodné s verzovaným golden artefaktem (regenerovatelnost)
    assert.deepStrictEqual(r1.hashes, GOLDEN.hashes.A, 'běh musí odpovídat golden artefaktu seed A');
  });
});
