/**
 * M8 T3 — Achievement system gate tests (iter-019 M8).
 *
 * Gate requirements:
 *   AR-1  unlock when predicate satisfied (deterministic)
 *   AR-2  idempotence: same state → no re-unlock
 *   AR-3  unlock effect real mutation (MIN-2: grantResource / unlockMap)
 *   AR-4  persist round-trip: unlocked achievements survive save/load
 *   AR-5  grep gate: no imperative unlocked[ assignment outside unlockAchievement
 *   AR-6  achievementsEval: centralized — only via evalPredicate+unlockAchievement
 *   AR-7  no Date.now / Math.random / DOM in core achievements system
 *   AR-8  catalog: achievements.json has when predicate for every non-never achievement
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

import { loadCatalog, clearCatalogs } from '../src/core/catalog/index.js';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { initRng } from '../src/core/engine/rng.js';
import { createRegistry } from '../src/core/registry/registry.js';
import { registerCorePeriodics } from '../src/core/engine/tickOrder.js';
import { registerEffects } from '../src/core/registry/effects.js';
import { achievementsEval, unlockAchievement } from '../src/core/systems/achievements.js';
import { evalPredicate } from '../src/core/systems/predicate.js';
import { applyPersist } from '../src/save/persistSchema.js';
import { loadAndReconstruct } from '../src/save/load.js';
import { SAVE_VERSION } from '../src/save/schema.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');

function loadJson(name) {
  return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8'));
}

/** Achievement catalog loaded from disk */
let achievementsCatalog;

before(() => {
  clearCatalogs();
  for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'military', 'goods',
                       'zones', 'buildings', 'companies', 'skills', 'techs', 'contracts']) {
    try { loadCatalog(name, loadJson(name)); } catch (_) { /* optional */ }
  }
  try { loadCatalog('achievements', loadJson('achievements')); } catch (_) {}
  try { loadCatalog('story', loadJson('story')); } catch (_) {}

  achievementsCatalog = loadJson('achievements');
});

/**
 * Make a clean game state with rng initialized.
 */
function makeState(seed = 0x12345678) {
  const state = createInitialState({ seed });
  initRng(state);
  return state;
}

/**
 * Make a ctx with achievements catalog pre-loaded (for achievementsEval).
 * @param {object} [customAchievements]
 */
function makeCtx(customAchievements) {
  const registry = createRegistry();
  const periodics = registerCorePeriodics(registry);
  registerEffects(registry);
  const catalog = {
    achievements: customAchievements ?? achievementsCatalog,
  };
  const emitEvents = [];
  const ctx = {
    registry,
    periodics,
    catalog,
    emitEvent: (ev) => emitEvents.push(ev),
    _emitEvents: emitEvents,
  };
  return ctx;
}

// ─── AR-1: unlock when predicate satisfied ─────────────────────────────────────

describe('AR-1: unlock when predicate satisfied (deterministic)', () => {
  it('unlockAchievement sets unlocked[id]=true', () => {
    const state = makeState();
    const ctx = makeCtx();

    assert.equal(/** @type {any} */ (state).achievements.unlocked['achieveSettlement'], undefined);
    unlockAchievement(state, ctx, 'achieveSettlement');
    assert.equal(/** @type {any} */ (state).achievements.unlocked['achieveSettlement'], true);
  });

  it('achievementsEval unlocks when stateGte predicate satisfied', () => {
    const state = makeState();
    const ctx = makeCtx({
      achievements: [
        { id: 'testGoldAchieve', when: { kind: 'stateGte', path: 'player.gold', value: 100 }, onUnlock: [] }
      ]
    });

    /** @type {any} */ (state).player.gold = 50;
    achievementsEval(state, {}, ctx);
    assert.equal(/** @type {any} */ (state).achievements.unlocked['testGoldAchieve'], undefined, 'should NOT unlock when gold < threshold');

    /** @type {any} */ (state).player.gold = 100;
    achievementsEval(state, {}, ctx);
    assert.equal(/** @type {any} */ (state).achievements.unlocked['testGoldAchieve'], true, 'should unlock when gold >= threshold');
  });

  it('achievementsEval unlocks sumGte predicate (army total)', () => {
    const state = makeState();
    const ctx = makeCtx({
      achievements: [
        { id: 'testArmy', when: { kind: 'sumGte', paths: ['player.totWarriors', 'player.totArchers'], value: 100 }, onUnlock: [] }
      ]
    });

    /** @type {any} */ (state).player.totWarriors = 50;
    /** @type {any} */ (state).player.totArchers = 49;
    achievementsEval(state, {}, ctx);
    assert.equal(/** @type {any} */ (state).achievements.unlocked['testArmy'], undefined, 'should NOT unlock when sum < 100');

    /** @type {any} */ (state).player.totArchers = 50;
    achievementsEval(state, {}, ctx);
    assert.equal(/** @type {any} */ (state).achievements.unlocked['testArmy'], true, 'should unlock when sum >= 100');
  });

  it('achievementsEval unlocks flagTrue predicate (disease)', () => {
    const state = makeState();
    const ctx = makeCtx({
      achievements: [
        { id: 'testDisease', when: { kind: 'flagTrue', path: 'home.health.diseaseActive' }, onUnlock: [] }
      ]
    });

    achievementsEval(state, {}, ctx);
    assert.equal(/** @type {any} */ (state).achievements.unlocked['testDisease'], undefined, 'should NOT unlock without disease');

    /** @type {any} */ (state).home.health.diseaseActive = true;
    achievementsEval(state, {}, ctx);
    assert.equal(/** @type {any} */ (state).achievements.unlocked['testDisease'], true, 'should unlock when diseaseActive=true');
  });

  it('achievementsEval unlocks settlementLevel predicate', () => {
    const state = makeState();
    const ctx = makeCtx({
      achievements: [
        { id: 'testSettlement', when: { kind: 'settlementLevel', atLeast: 1 }, onUnlock: [] }
      ]
    });

    achievementsEval(state, {}, ctx);
    assert.equal(/** @type {any} */ (state).achievements.unlocked['testSettlement'], undefined);

    /** @type {any} */ (state).home.settlementLevel = 1;
    achievementsEval(state, {}, ctx);
    assert.equal(/** @type {any} */ (state).achievements.unlocked['testSettlement'], true);
  });

  it('same state produces same unlocks on repeated eval (determinism)', () => {
    const state1 = makeState(0xABCDEF);
    const state2 = makeState(0xABCDEF);
    const catalog = {
      achievements: [
        { id: 'deterA', when: { kind: 'stateGte', path: 'player.gold', value: 500 }, onUnlock: [] }
      ]
    };
    const ctx1 = makeCtx(catalog);
    const ctx2 = makeCtx(catalog);

    /** @type {any} */ (state1).player.gold = 1000;
    /** @type {any} */ (state2).player.gold = 1000;

    achievementsEval(state1, {}, ctx1);
    achievementsEval(state2, {}, ctx2);

    assert.deepStrictEqual(
      /** @type {any} */ (state1).achievements.unlocked,
      /** @type {any} */ (state2).achievements.unlocked,
      'identical states must produce identical unlocks'
    );
  });
});

// ─── AR-2: idempotence ────────────────────────────────────────────────────────

describe('AR-2: idempotence — same state → no re-unlock', () => {
  it('unlockAchievement is idempotent (calling twice has no extra effect)', () => {
    const state = makeState();
    const ctx = makeCtx();
    const emitBefore = /** @type {any} */ (ctx)._emitEvents.length;

    unlockAchievement(state, ctx, 'achieveSettlement');
    const emitAfterFirst = /** @type {any} */ (ctx)._emitEvents.length;

    unlockAchievement(state, ctx, 'achieveSettlement');
    const emitAfterSecond = /** @type {any} */ (ctx)._emitEvents.length;

    assert.equal(/** @type {any} */ (state).achievements.unlocked['achieveSettlement'], true);
    assert.equal(emitAfterFirst - emitBefore, 1, 'emitEvent called exactly once on first unlock');
    assert.equal(emitAfterSecond - emitAfterFirst, 0, 'emitEvent NOT called again on duplicate unlock');
  });

  it('achievementsEval does not re-unlock already unlocked achievement', () => {
    const state = makeState();
    const catalog = {
      achievements: [
        { id: 'idempotentTest', when: { kind: 'stateGte', path: 'player.gold', value: 1 }, onUnlock: [] }
      ]
    };
    const ctx = makeCtx(catalog);
    /** @type {any} */ (state).player.gold = 100;

    achievementsEval(state, {}, ctx); // first eval — should unlock
    const eventsAfterFirst = /** @type {any} */ (ctx)._emitEvents.length;

    achievementsEval(state, {}, ctx); // second eval — same state, already unlocked
    const eventsAfterSecond = /** @type {any} */ (ctx)._emitEvents.length;

    assert.equal(eventsAfterSecond, eventsAfterFirst, 'no additional events on re-eval of already-unlocked achievement');
    assert.equal(/** @type {any} */ (state).achievements.unlocked['idempotentTest'], true);
  });

  it('achievementsEval skips achievements with no when predicate', () => {
    const state = makeState();
    const catalog = {
      achievements: [
        { id: 'noWhen', onUnlock: [] } // no 'when' field
      ]
    };
    const ctx = makeCtx(catalog);

    achievementsEval(state, {}, ctx);
    assert.equal(/** @type {any} */ (state).achievements.unlocked['noWhen'], undefined, 'no when → skip');
  });

  it('achievementsEval skips achievements with when:never', () => {
    const state = makeState();
    const catalog = {
      achievements: [
        { id: 'neverAchieve', when: { kind: 'never' }, onUnlock: [] }
      ]
    };
    const ctx = makeCtx(catalog);

    achievementsEval(state, {}, ctx);
    assert.equal(/** @type {any} */ (state).achievements.unlocked['neverAchieve'], undefined, 'never → skip');
  });
});

// ─── AR-3: unlock effect real mutation (MIN-2) ────────────────────────────────

describe('AR-3: unlock effect real mutation (MIN-2)', () => {
  it('grantResource adds to state.home.store (real mutation, not console.log)', () => {
    const state = makeState();
    const registry = createRegistry();
    registerEffects(registry);
    const ctx = makeCtx();
    ctx.registry = registry;

    const store = /** @type {any} */ (state).home.store;
    const before = store['wood'] ?? 0;

    const grantFn = registry.handlers.get('grantResource');
    assert.ok(grantFn, 'grantResource must be registered');
    grantFn(state, { resourceId: 'wood', amount: 50 }, /** @type {any} */ (ctx));

    const after = /** @type {any} */ (state).home.store['wood'] ?? 0;
    assert.equal(after, before + 50, 'grantResource must add to home.store');
  });

  it('grantResource accumulates on repeated calls', () => {
    const state = makeState();
    const registry = createRegistry();
    registerEffects(registry);
    const ctx = makeCtx();
    ctx.registry = registry;

    const grantFn = registry.handlers.get('grantResource');
    grantFn(state, { resourceId: 'stone', amount: 10 }, /** @type {any} */ (ctx));
    grantFn(state, { resourceId: 'stone', amount: 20 }, /** @type {any} */ (ctx));

    assert.equal(/** @type {any} */ (state).home.store['stone'], 30, 'grantResource must accumulate');
  });

  it('unlockMap sets flag in state.catalogState.unlockedMaps (real mutation)', () => {
    const state = makeState();
    const registry = createRegistry();
    registerEffects(registry);
    const ctx = makeCtx();
    ctx.registry = registry;

    assert.equal(/** @type {any} */ (state).catalogState?.unlockedMaps?.['worldMap'], undefined, 'flag must not exist before unlock');

    const unlockFn = registry.handlers.get('unlockMap');
    assert.ok(unlockFn, 'unlockMap must be registered');
    unlockFn(state, { map: 'worldMap' }, /** @type {any} */ (ctx));

    assert.equal(/** @type {any} */ (state).catalogState.unlockedMaps['worldMap'], true, 'unlockMap must set flag in catalogState');
  });

  it('achievementsEval runs onUnlock effects via registry', () => {
    const state = makeState();
    const registry = createRegistry();
    registerEffects(registry);
    const catalog = {
      achievements: [
        {
          id: 'withEffect',
          when: { kind: 'stateGte', path: 'player.gold', value: 1 },
          onUnlock: [{ effect: 'grantResource', params: { resourceId: 'ore', amount: 100 } }]
        }
      ]
    };
    const ctx = /** @type {any} */ (makeCtx(catalog));
    ctx.registry = registry;

    /** @type {any} */ (state).player.gold = 10;
    achievementsEval(state, {}, ctx);

    assert.equal(/** @type {any} */ (state).achievements.unlocked['withEffect'], true, 'achievement must be unlocked');
    assert.equal(/** @type {any} */ (state).home.store['ore'], 100, 'onUnlock grantResource must run (MIN-2 real mutation)');
  });

  it('unlockAchievement logs to ring buffer', () => {
    const state = makeState();
    const ctx = makeCtx();
    const logBefore = state.log.entries.length;

    unlockAchievement(state, ctx, 'achieveSettlement');

    const logAfter = state.log.entries.length;
    assert.equal(logAfter, logBefore + 1, 'unlock must write one log entry');
    const lastEntry = /** @type {any} */ (state.log.entries[state.log.entries.length - 1]);
    assert.ok(lastEntry.msg.includes('achieveSettlement'), 'log entry must contain achievement id');
  });

  it('unlockAchievement emits ephemeral UI event (achievementUnlocked)', () => {
    const state = makeState();
    const ctx = makeCtx();
    const events = /** @type {any} */ (ctx)._emitEvents;

    unlockAchievement(state, ctx, 'achieveVillage');

    const ev = events.find((/** @type {any} */ e) => e.type === 'achievementUnlocked' && e.id === 'achieveVillage');
    assert.ok(ev, 'emitEvent must fire achievementUnlocked event');
  });
});

// ─── AR-4: persist round-trip ─────────────────────────────────────────────────

describe('AR-4: persist round-trip — unlocked achievements survive save/load', () => {
  it('achievements.unlocked is included in applyPersist output', () => {
    const state = makeState();
    const ctx = makeCtx();

    unlockAchievement(state, ctx, 'achieveSettlement');
    unlockAchievement(state, ctx, 'achieveUnhygienic');

    const saved = applyPersist(state);
    assert.ok(saved.achievements, 'applyPersist must include achievements');
    assert.equal(/** @type {any} */ (saved.achievements).unlocked['achieveSettlement'], true);
    assert.equal(/** @type {any} */ (saved.achievements).unlocked['achieveUnhygienic'], true);
  });

  it('achievements.unlocked survives full JSON round-trip (save/load)', () => {
    const state1 = makeState(0x1A2B3C4D);
    const ctx = makeCtx();

    unlockAchievement(state1, ctx, 'achieveCenturion');
    assert.equal(/** @type {any} */ (state1).achievements.unlocked['achieveCenturion'], true);

    // Save
    const saved = JSON.parse(JSON.stringify(applyPersist(state1)));
    saved.meta = saved.meta ?? {};
    saved.meta.saveVersion = SAVE_VERSION;

    // Load
    const state2 = loadAndReconstruct(saved);

    assert.equal(/** @type {any} */ (state2).achievements.unlocked['achieveCenturion'], true,
      'unlocked achievement must survive save/load round-trip');
  });

  it('achievements.unlocked is structuredClone-safe', () => {
    const state = makeState();
    const ctx = makeCtx();

    unlockAchievement(state, ctx, 'achieveSettlement');

    assert.doesNotThrow(() => {
      structuredClone(state.achievements);
    }, 'achievements state must be structuredClone-safe');
  });

  it('multiple unlocked achievements all persist', () => {
    const state1 = makeState(0xFEEDFACE);
    const ctx = makeCtx();

    const ids = ['achieveSettlement', 'achieveUnhygienic', 'achievementSurvivedWinter'];
    for (const id of ids) {
      unlockAchievement(state1, ctx, id);
    }

    const saved = JSON.parse(JSON.stringify(applyPersist(state1)));
    saved.meta = saved.meta ?? {};
    saved.meta.saveVersion = SAVE_VERSION;
    const state2 = loadAndReconstruct(saved);

    for (const id of ids) {
      assert.equal(/** @type {any} */ (state2).achievements.unlocked[id], true,
        `${id} must survive round-trip`);
    }
  });
});

// ─── AR-5: grep gate — no imperative unlocked[ outside unlockAchievement ──────

describe('AR-5: grep gate — no imperative unlocked[ assignment outside unlockAchievement', () => {
  it('meta-test: no raw unlocked[ assignment in systems/ outside achievements.js', () => {
    const ROOT_PATH = join(fileURLToPath(new URL('.', import.meta.url)), '..');

    // Search for assignments to unlocked[ in src/core/systems/ (excluding achievements.js)
    let found = '';
    try {
      // Look for pattern: .unlocked[ followed by = (assignment, not comparison)
      const result = execSync(
        `grep -rn 'achievements\\.unlocked\\[' "${ROOT_PATH}/src/core/systems/" --include="*.js"`,
        { encoding: 'utf8' }
      ).trim();
      found = result;
    } catch (_e) {
      // grep exits non-zero when no matches — that's good
      found = '';
    }

    // Filter to only assignment lines (= but not ==, !=, ===, !==)
    const assignmentLines = found
      .split('\n')
      .filter(line => line.trim() !== '')
      // Allow: achievements.js (the one permitted file)
      .filter(line => !line.includes('/achievements.js:'))
      // Allow: read access (comparisons, not assignments)
      .filter(line => /achievements\.unlocked\[/.test(line))
      // Filter to assignment patterns only (= not preceded by !, <, >, =)
      .filter(line => /achievements\.unlocked\[[^\]]*\]\s*=[^=]/.test(line));

    assert.equal(assignmentLines.length, 0,
      `C4 grep gate FAILED: imperative unlocked[ assignment found outside achievements.js:\n${assignmentLines.join('\n')}`
    );
  });

  it('meta-test: no raw unlocked[ assignment in src/ (any .js) outside achievements.js', () => {
    const ROOT_PATH = join(fileURLToPath(new URL('.', import.meta.url)), '..');

    let found = '';
    try {
      const result = execSync(
        `grep -rn '\\.unlocked\\[' "${ROOT_PATH}/src/" --include="*.js"`,
        { encoding: 'utf8' }
      ).trim();
      found = result;
    } catch (_e) {
      found = '';
    }

    // Only flag assignment lines outside achievements.js
    const violatingLines = found
      .split('\n')
      .filter(line => line.trim() !== '')
      .filter(line => !line.includes('/achievements.js:'))
      .filter(line => /\.unlocked\[[^\]]*\]\s*=[^=]/.test(line));

    assert.equal(violatingLines.length, 0,
      `C4 grep gate FAILED: imperative .unlocked[ assignment outside achievements.js:\n${violatingLines.join('\n')}`
    );
  });
});

// ─── AR-6: centralized evaluator ──────────────────────────────────────────────

describe('AR-6: achievementsEval is centralized — no side-channel unlocks', () => {
  it('achievementsEval handles empty catalog gracefully', () => {
    const state = makeState();
    const ctx = makeCtx({ achievements: [] });

    assert.doesNotThrow(() => {
      achievementsEval(state, {}, ctx);
    }, 'achievementsEval must not throw on empty catalog');
    assert.deepStrictEqual(/** @type {any} */ (state).achievements.unlocked, {}, 'no unlocks on empty catalog');
  });

  it('achievementsEval skips achievements with no catalog', () => {
    const state = makeState();
    const registry = createRegistry();
    registerEffects(registry);
    const ctx = /** @type {any} */ ({ registry, periodics: [], catalog: {} }); // no achievements in catalog

    assert.doesNotThrow(() => {
      achievementsEval(state, {}, ctx);
    }, 'achievementsEval must not throw when no achievements catalog');
    assert.deepStrictEqual(/** @type {any} */ (state).achievements.unlocked, {});
  });

  it('achievementsEval is a pure tick system — no Date.now / Math.random', () => {
    // Verify the module source does not reference forbidden globals
    const src = readFileSync(
      join(ROOT, 'src', 'core', 'systems', 'achievements.js'),
      'utf8'
    );
    assert.ok(!src.includes('Date.now'), 'achievements.js must not use Date.now');
    assert.ok(!src.includes('Math.random'), 'achievements.js must not use Math.random');
    assert.ok(!src.includes('document.'), 'achievements.js must not access DOM');
    assert.ok(!src.includes('window.'), 'achievements.js must not access window');
  });
});

// ─── AR-7: no DOM / Date.now / Math.random in core ───────────────────────────

describe('AR-7: determinism — no forbidden globals in achievements system', () => {
  it('evalPredicate is a pure function (no side effects)', () => {
    const state = { player: { gold: 1000 }, home: { settlementLevel: 0 } };

    // Run 10 times — must return identical results
    const results = Array.from({ length: 10 }, () =>
      evalPredicate({ kind: 'stateGte', path: 'player.gold', value: 1000 }, state)
    );
    assert.ok(results.every(r => r === true), 'evalPredicate must be deterministic');
  });

  it('unlockAchievement does not throw without emitEvent (optional bus)', () => {
    const state = makeState();
    const registry = createRegistry();
    registerEffects(registry);
    const ctx = /** @type {any} */ ({ registry, periodics: [], catalog: achievementsCatalog });
    // No emitEvent — must not throw

    assert.doesNotThrow(() => {
      unlockAchievement(state, ctx, 'achieveSettlement');
    }, 'unlockAchievement must work without emitEvent (optional bus)');
  });
});

// ─── AR-8: achievements.json catalog shape ────────────────────────────────────

describe('AR-8: achievements.json catalog structure', () => {
  it('achievements.json has _meta and achievements array', () => {
    assert.ok(achievementsCatalog._meta, 'achievements.json must have _meta');
    assert.ok(Array.isArray(achievementsCatalog.achievements), 'achievements must be an array');
    assert.ok(achievementsCatalog.achievements.length > 0, 'achievements array must not be empty');
  });

  it('every achievement has id, name, description, level', () => {
    for (const a of achievementsCatalog.achievements) {
      assert.ok(a.id, `${a.id ?? '?'}: must have id`);
      assert.ok(a.name, `${a.id}: must have name`);
      assert.ok(a.description, `${a.id}: must have description`);
      assert.ok(typeof a.level === 'number', `${a.id}: level must be a number`);
    }
  });

  it('every achievement has a when field (predicate or never)', () => {
    for (const a of achievementsCatalog.achievements) {
      assert.ok('when' in a, `${a.id}: must have when field`);
      assert.ok(a.when && typeof a.when.kind === 'string', `${a.id}: when.kind must be a string`);
    }
  });

  it('_meta.provenance is set to original-paraphrased', () => {
    assert.equal(achievementsCatalog._meta.provenance, 'original-paraphrased',
      '_meta.provenance must be original-paraphrased');
  });

  it('achieveSettlement has settlementLevel predicate', () => {
    const a = achievementsCatalog.achievements.find((/** @type {any} */ x) => x.id === 'achieveSettlement');
    assert.ok(a, 'achieveSettlement must exist');
    assert.equal(a.when.kind, 'settlementLevel');
    assert.equal(a.when.atLeast, 1);
  });

  it('achieveGoldHoarder has stateGte predicate with value 1000000', () => {
    const a = achievementsCatalog.achievements.find((/** @type {any} */ x) => x.id === 'achieveGoldHoarder');
    assert.ok(a, 'achieveGoldHoarder must exist');
    assert.equal(a.when.kind, 'stateGte');
    assert.equal(a.when.value, 1000000);
  });

  it('achieveCenturion has sumGte predicate over warriors+archers', () => {
    const a = achievementsCatalog.achievements.find((/** @type {any} */ x) => x.id === 'achieveCenturion');
    assert.ok(a, 'achieveCenturion must exist');
    assert.equal(a.when.kind, 'sumGte');
    assert.ok(Array.isArray(a.when.paths), 'sumGte must have paths array');
    assert.equal(a.when.value, 100);
  });

  it('achieveUnhygienic has flagTrue predicate for diseaseActive', () => {
    const a = achievementsCatalog.achievements.find((/** @type {any} */ x) => x.id === 'achieveUnhygienic');
    assert.ok(a, 'achieveUnhygienic must exist');
    assert.equal(a.when.kind, 'flagTrue');
    assert.ok(a.when.path.includes('diseaseActive'), 'flagTrue path must include diseaseActive');
  });

  it('achievementSurvivedWinter has stateGte curYear >= 2', () => {
    const a = achievementsCatalog.achievements.find((/** @type {any} */ x) => x.id === 'achievementSurvivedWinter');
    assert.ok(a, 'achievementSurvivedWinter must exist');
    assert.equal(a.when.kind, 'stateGte');
    assert.ok(a.when.path.includes('curYear'), 'path must reference curYear');
    assert.equal(a.when.value, 2);
  });

  it('world-takeOver achievements use when:never (M9 wiring placeholder)', () => {
    const worldAchievements = ['achieveBenevolence', 'achieveFeared', 'achieveMight'];
    for (const id of worldAchievements) {
      const a = achievementsCatalog.achievements.find((/** @type {any} */ x) => x.id === id);
      assert.ok(a, `${id} must exist`);
      assert.equal(a.when.kind, 'never', `${id}: world takeOver achievements must use when:never until M9 wiring`);
    }
  });
});

// ─── Integration: real disk catalog works with achievementsEval ───────────────

describe('Integration: achievementsEval with disk catalog', () => {
  it('achievementsEval does not throw on real catalog', () => {
    const state = makeState();
    const ctx = makeCtx(achievementsCatalog);

    assert.doesNotThrow(() => {
      achievementsEval(state, {}, ctx);
    }, 'achievementsEval must not throw with real catalog');
  });

  it('achievementsEval unlocks achieveUnhygienic when diseaseActive=true (real catalog)', () => {
    const state = makeState();
    const ctx = makeCtx(achievementsCatalog);

    /** @type {any} */ (state).home.health.diseaseActive = true;
    achievementsEval(state, {}, ctx);

    assert.equal(/** @type {any} */ (state).achievements.unlocked['achieveUnhygienic'], true,
      'achieveUnhygienic must unlock when diseaseActive=true');
  });

  it('achievementsEval unlocks achievementSurvivedWinter when curYear>=2 (real catalog)', () => {
    const state = makeState();
    const ctx = makeCtx(achievementsCatalog);

    /** @type {any} */ (state).season.curYear = 2;
    achievementsEval(state, {}, ctx);

    assert.equal(/** @type {any} */ (state).achievements.unlocked['achievementSurvivedWinter'], true,
      'achievementSurvivedWinter must unlock when curYear>=2');
  });

  it('never-kind achievements never unlock (world takeOver placeholders)', () => {
    const state = makeState();
    const ctx = makeCtx(achievementsCatalog);

    // Run with extreme values that would trigger if predicates were wrong
    /** @type {any} */ (state).player.gold = 99999999;
    /** @type {any} */ (state).home.settlementLevel = 99;
    achievementsEval(state, {}, ctx);

    const neverAchievements = ['achieveBenevolence', 'achieveFeared', 'achieveMight'];
    for (const id of neverAchievements) {
      assert.equal(/** @type {any} */ (state).achievements.unlocked[id], undefined,
        `${id} must never unlock (when:never placeholder)`);
    }
  });
});
