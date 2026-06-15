/**
 * M7b T-006 — T4 dotažení: banditRaid schedule + battleLog→OfflineSummary gate tests.
 *
 * Gate requirements (DoD):
 *   BT4-1  banditRaid naplánuje bitvu (deterministicky, idempotentní arm — staré savy)
 *   BT4-2  armBanditRaid je idempotentní (nevkládá duplicitní entry)
 *   BT4-3  banditRaid spustí bitvu (isBandit=true) a nastaví self-rearm
 *   BT4-4  banditRaid deterministické (stejný state seed → identický výsledek)
 *   BT4-5  invaze z frakční AI → startBattle → reálná bitva (state.battle nasazeno)
 *   BT4-6  battleLog→OfflineSummary: selectOfflineBattles čte state.world.battleLog
 *   BT4-7  buildOfflineSummary zahrnuje battles (hasBattles=true, total>0)
 *   BT4-8  formatOfflineSummary obsahuje bitevní text když hasBattles=true
 *   BT4-9  selectBattleLog vrací záznamy newest-first
 *   BT4-10 catch-up auto-resolve: bitvy doběhnou přes runCatchupBatch (offline dávka)
 *   BT4-11 battleLog model bez battle entries → hasBattles=false, čistý text
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadCatalog, clearCatalogs } from '../src/core/catalog/index.js';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { initRng, makeRng, hashState } from '../src/core/engine/rng.js';
import { scheduleCountOf } from '../src/core/engine/scheduler.js';
import { BALANCE } from '../src/core/balance/balance.js';
import { armBanditRaid, banditRaid, startBattle, createBattleState, battleTick, resolveBattleOutcome } from '../src/core/systems/battle.js';
import { buildOfflineSummary, formatOfflineSummary, selectOfflineBattles } from '../src/ui/OfflineSummary.js';
import { selectBattleLog } from '../src/ui/selectors.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');

function loadJson(name) {
  return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8'));
}

before(() => {
  clearCatalogs();
  for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'military', 'achievements', 'goods', 'zones']) {
    try { loadCatalog(name, loadJson(name)); } catch (_) { /* optional */ }
  }
  try { loadCatalog('population', loadJson('population')); } catch (_) { /* optional */ }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeState(seed = 0x12345678) {
  const state = createInitialState({ seed });
  initRng(state);
  return state;
}

/** Add homeZone to state if not present */
function ensureHomeZone(state) {
  const st = /** @type {any} */ (state);
  if (!st.world) st.world = {};
  if (!Array.isArray(st.world.zones)) st.world.zones = [];
  const existing = st.world.zones.find((z) => z.id === 'homeZone');
  if (!existing) {
    st.world.zones.push({
      id: 'homeZone',
      liege: 'player',
      warriors: 30,
      archers: 15,
      name: 'Home',
    });
  }
  return state;
}

/** Add a faction to state */
function ensureFaction(state, factionId = 'theWarlord') {
  const st = /** @type {any} */ (state);
  if (!st.world) st.world = {};
  if (!st.world.factions) st.world.factions = {};
  if (!st.world.factions[factionId]) {
    st.world.factions[factionId] = {
      id: factionId,
      name: factionId,
      capitalId: 'northZone',
      unitStats: {
        warriors: { strength: 1, defense: 1 },
        archers:  { strength: 1, defense: 1 },
      },
    };
  }
  // Add capital zone
  if (!Array.isArray(st.world.zones)) st.world.zones = [];
  if (!st.world.zones.find((z) => z.id === 'northZone')) {
    st.world.zones.push({
      id: 'northZone',
      liege: factionId,
      warriors: 20,
      archers: 10,
      name: 'North',
    });
  }
  return state;
}

/** Push a battleLog entry to state.world.battleLog */
function pushBattleLogEntry(state, entry) {
  const st = /** @type {any} */ (state);
  if (!st.world) st.world = {};
  if (!st.world.battleLog) st.world.battleLog = [];
  st.world.battleLog.push(entry);
}

// ─── BT4-1: banditRaid naplánuje bitvu (idempotentní arm) ────────────────────

describe('BT4-1+BT4-2: armBanditRaid — naplánuje, idempotentní', () => {
  it('armBanditRaid přidá přesně jeden záznam banditRaid do schedule', () => {
    const state = makeState(0x1001);
    ensureHomeZone(state);
    const before = scheduleCountOf(state, 'banditRaid');
    armBanditRaid(state);
    const after = scheduleCountOf(state, 'banditRaid');
    assert.equal(after - before, 1, 'armBanditRaid must add exactly 1 banditRaid entry');
  });

  it('armBanditRaid je idempotentní — druhé volání nepřidá další entry', () => {
    const state = makeState(0x1002);
    ensureHomeZone(state);
    armBanditRaid(state);
    const countAfterFirst = scheduleCountOf(state, 'banditRaid');
    armBanditRaid(state);
    const countAfterSecond = scheduleCountOf(state, 'banditRaid');
    assert.equal(countAfterFirst, countAfterSecond, 'second armBanditRaid call must not add another entry (idempotent)');
  });

  it('armBanditRaid na "starém save" (bez existujícího záznamu) přidá entry — anti-DR-012-02', () => {
    const state = makeState(0x1003);
    ensureHomeZone(state);
    // Simulate old save: schedule has no banditRaid
    const st = /** @type {any} */ (state);
    st.engine.schedule = (st.engine.schedule || []).filter((e) => e.id !== 'banditRaid');
    assert.equal(scheduleCountOf(state, 'banditRaid'), 0, 'precondition: no banditRaid in schedule');
    armBanditRaid(state);
    assert.equal(scheduleCountOf(state, 'banditRaid'), 1, 'armBanditRaid must arm even for old saves');
  });
});

// ─── BT4-3: banditRaid handler spustí bitvu a self-rearm ────────────────────

describe('BT4-3: banditRaid handler — spustí bitvu + self-rearm', () => {
  it('banditRaid handler nastaví state.battle (isBandit=true)', () => {
    const state = makeState(0x2001);
    ensureHomeZone(state);
    const st = /** @type {any} */ (state);
    assert.ok(!st.battle, 'no battle before handler');
    banditRaid(state, {}, {});
    assert.ok(st.battle, 'banditRaid must set state.battle');
    assert.equal(st.battle.meta.isBandit, true, 'battle meta.isBandit must be true');
  });

  it('banditRaid handler nastaví self-rearm (nový záznam banditRaid v schedule)', () => {
    const state = makeState(0x2002);
    ensureHomeZone(state);
    const st = /** @type {any} */ (state);
    const countBefore = scheduleCountOf(state, 'banditRaid');
    banditRaid(state, {}, {});
    const countAfter = scheduleCountOf(state, 'banditRaid');
    assert.ok(countAfter > countBefore, 'banditRaid must self-rearm (insert next entry)');
  });

  it('banditRaid handler je no-op pokud bitva už běží (one-battle guard)', () => {
    const state = makeState(0x2003);
    ensureHomeZone(state);
    const st = /** @type {any} */ (state);
    // Pre-set a battle
    const zone = { id: 'homeZone', liege: 'player', warriors: 5, archers: 5 };
    const fac = { id: 'bandits', unitStats: { warriors: { strength: 1, defense: 1 }, archers: { strength: 1, defense: 1 } }, warriors: 5, archers: 2 };
    st.battle = createBattleState(state, zone, fac, true);
    const originalBattle = st.battle;
    banditRaid(state, {}, {});
    // Battle should be unchanged (guard prevented override)
    assert.strictEqual(st.battle, originalBattle, 'banditRaid must not override existing battle');
  });
});

// ─── BT4-4: banditRaid deterministické ───────────────────────────────────────

describe('BT4-4: banditRaid deterministické', () => {
  it('dva state se stejným seedem → identický battleState po banditRaid', () => {
    const s1 = makeState(0x3001);
    const s2 = makeState(0x3001);
    ensureHomeZone(s1);
    ensureHomeZone(s2);
    banditRaid(s1, {}, {});
    banditRaid(s2, {}, {});
    const b1 = /** @type {any} */ (s1).battle;
    const b2 = /** @type {any} */ (s2).battle;
    assert.deepStrictEqual(b1, b2, 'same seed must produce identical battle state');
  });
});

// ─── BT4-5: invaze frakční AI → startBattle → reálná bitva ──────────────────

describe('BT4-5: startBattle handler — AI invaze → reálná bitva', () => {
  it('startBattle handler nasadí state.battle pro platný útok na player zónu', () => {
    const state = makeState(0x4001);
    ensureHomeZone(state);
    ensureFaction(state, 'theWarlord');
    const st = /** @type {any} */ (state);
    assert.ok(!st.battle, 'precondition: no battle');
    startBattle(state, { attackerId: 'theWarlord', targetZoneId: 'homeZone' }, {});
    assert.ok(st.battle, 'startBattle must set state.battle');
    assert.equal(st.battle.meta.isBandit, false, 'AI invasion must have isBandit=false');
    assert.equal(st.battle.zoneId, 'homeZone', 'battle zoneId must match target zone');
  });

  it('startBattle je no-op pokud bitva již běží (guard orig ř.55)', () => {
    const state = makeState(0x4002);
    ensureHomeZone(state);
    ensureFaction(state, 'theWarlord');
    const st = /** @type {any} */ (state);
    startBattle(state, { attackerId: 'theWarlord', targetZoneId: 'homeZone' }, {});
    const firstBattle = st.battle;
    startBattle(state, { attackerId: 'theWarlord', targetZoneId: 'homeZone' }, {});
    assert.strictEqual(st.battle, firstBattle, 'startBattle must not override existing battle (guard)');
  });

  it('startBattle je no-op pro neexistující frakci', () => {
    const state = makeState(0x4003);
    ensureHomeZone(state);
    const st = /** @type {any} */ (state);
    startBattle(state, { attackerId: 'nonexistent', targetZoneId: 'homeZone' }, {});
    assert.ok(!st.battle, 'startBattle must be no-op for unknown faction');
  });

  it('startBattle je no-op pro neexistující zónu', () => {
    const state = makeState(0x4004);
    ensureFaction(state, 'theWarlord');
    const st = /** @type {any} */ (state);
    startBattle(state, { attackerId: 'theWarlord', targetZoneId: 'nonexistentZone' }, {});
    assert.ok(!st.battle, 'startBattle must be no-op for unknown zone');
  });
});

// ─── BT4-6: selectOfflineBattles ─────────────────────────────────────────────

describe('BT4-6: selectOfflineBattles — čte state.world.battleLog', () => {
  it('vrací prázdné pole pro state bez battleLog', () => {
    const state = makeState(0x5001);
    const result = selectOfflineBattles(state, 0);
    assert.deepStrictEqual(result, [], 'no battleLog → empty array');
  });

  it('vrací záznamy od startStep (filtr)', () => {
    const state = makeState(0x5002);
    pushBattleLogEntry(state, { zoneId: 'homeZone', winner: 'player', playerCasualties: 5, playerKills: 10, loot: null, atStep: 100 });
    pushBattleLogEntry(state, { zoneId: 'homeZone', winner: 'theWarlord', playerCasualties: 20, playerKills: 3, loot: null, atStep: 200 });
    pushBattleLogEntry(state, { zoneId: 'homeZone', winner: 'player', playerCasualties: 2, playerKills: 8, loot: null, atStep: 300 });
    const result = selectOfflineBattles(state, 150);
    assert.equal(result.length, 2, 'should return only entries with atStep >= 150');
    assert.ok(result.every((e) => e.atStep >= 150), 'all returned entries must have atStep >= startStep');
  });

  it('vrací všechny záznamy pro startStep=0', () => {
    const state = makeState(0x5003);
    pushBattleLogEntry(state, { zoneId: 'homeZone', winner: 'player', playerCasualties: 5, playerKills: 10, loot: null, atStep: 50 });
    pushBattleLogEntry(state, { zoneId: 'homeZone', winner: 'player', playerCasualties: 3, playerKills: 7, loot: null, atStep: 100 });
    const result = selectOfflineBattles(state, 0);
    assert.equal(result.length, 2, 'startStep=0 must return all entries');
  });

  it('je null-safe pro null state', () => {
    assert.doesNotThrow(() => selectOfflineBattles(null, 0));
    assert.deepStrictEqual(selectOfflineBattles(null, 0), []);
  });
});

// ─── BT4-7: buildOfflineSummary zahrnuje battles ─────────────────────────────

describe('BT4-7: buildOfflineSummary — zahrnuje battles', () => {
  it('model bez state → hasBattles=false, total=0', () => {
    const model = buildOfflineSummary({ missedMs: 3600_000, wasCapped: false, stepsRun: 900, interrupted: false });
    assert.equal(model.battles.hasBattles, false, 'no state → hasBattles=false');
    assert.equal(model.battles.total, 0, 'no state → total=0');
  });

  it('model s battles v state → hasBattles=true, total/wins/losses správně', () => {
    const state = makeState(0x6001);
    pushBattleLogEntry(state, { zoneId: 'homeZone', winner: 'player', playerCasualties: 5, playerKills: 10, loot: null, atStep: 100 });
    pushBattleLogEntry(state, { zoneId: 'homeZone', winner: 'theWarlord', playerCasualties: 20, playerKills: 2, loot: null, atStep: 200 });
    const model = buildOfflineSummary({
      missedMs: 3600_000, wasCapped: false, stepsRun: 900, interrupted: false,
      state,
      startStep: 50,
    });
    assert.equal(model.battles.hasBattles, true, 'battles present → hasBattles=true');
    assert.equal(model.battles.total, 2, 'total must be 2');
    assert.equal(model.battles.wins, 1, 'wins=1 (player won one)');
    assert.equal(model.battles.losses, 1, 'losses=1 (player lost one)');
    assert.equal(model.battles.playerCasualties, 25, 'playerCasualties=5+20=25');
    assert.equal(model.battles.playerKills, 12, 'playerKills=10+2=12');
  });

  it('startStep filtr — záznamy před startStep se nezapočítají', () => {
    const state = makeState(0x6002);
    pushBattleLogEntry(state, { zoneId: 'homeZone', winner: 'player', playerCasualties: 1, playerKills: 1, loot: null, atStep: 50 });
    pushBattleLogEntry(state, { zoneId: 'homeZone', winner: 'player', playerCasualties: 2, playerKills: 2, loot: null, atStep: 500 });
    const model = buildOfflineSummary({
      missedMs: 0, wasCapped: false, stepsRun: 0, interrupted: false,
      state,
      startStep: 100, // only atStep=500 is above threshold
    });
    assert.equal(model.battles.total, 1, 'only entry with atStep >= 100 should be counted');
  });
});

// ─── BT4-8: formatOfflineSummary obsahuje bitevní text ───────────────────────

describe('BT4-8: formatOfflineSummary — obsahuje bitevní text', () => {
  it('bez bitev → žádný bitevní text', () => {
    const model = buildOfflineSummary({ missedMs: 3600_000, wasCapped: false, stepsRun: 900, interrupted: false });
    const text = formatOfflineSummary(model);
    assert.ok(!text.includes('bitev') && !text.includes('bitva') && !text.includes('bitvy'),
      'no battles → no battle text');
  });

  it('s bitvami → text obsahuje počet bitev a výsledky', () => {
    const state = makeState(0x7001);
    pushBattleLogEntry(state, { zoneId: 'homeZone', winner: 'player', playerCasualties: 5, playerKills: 10, loot: null, atStep: 100 });
    const model = buildOfflineSummary({
      missedMs: 3600_000, wasCapped: false, stepsRun: 900, interrupted: false,
      state, startStep: 50,
    });
    const text = formatOfflineSummary(model);
    assert.ok(text.includes('1') && (text.includes('bitev') || text.includes('bitva') || text.includes('bitvy')),
      `text must mention battle count, got: "${text}"`);
  });

  it('s více bitvami → text zmiňuje výhry a prohry', () => {
    const state = makeState(0x7002);
    pushBattleLogEntry(state, { zoneId: 'homeZone', winner: 'player', playerCasualties: 1, playerKills: 5, loot: null, atStep: 100 });
    pushBattleLogEntry(state, { zoneId: 'homeZone', winner: 'theWarlord', playerCasualties: 10, playerKills: 1, loot: null, atStep: 200 });
    const model = buildOfflineSummary({
      missedMs: 3600_000, wasCapped: false, stepsRun: 900, interrupted: false,
      state, startStep: 0,
    });
    const text = formatOfflineSummary(model);
    assert.ok(text.includes('výher') || text.includes('výhra') || text.includes('1'),
      `text must mention wins, got: "${text}"`);
    assert.ok(text.includes('proher') || text.includes('prohra'),
      `text must mention losses, got: "${text}"`);
  });

  it('output je non-empty string bez crashe', () => {
    const model = buildOfflineSummary({ missedMs: 3600_000, wasCapped: false, stepsRun: 900, interrupted: false });
    assert.doesNotThrow(() => formatOfflineSummary(model));
    assert.ok(typeof formatOfflineSummary(model) === 'string');
    assert.ok(formatOfflineSummary(model).length > 0);
  });
});

// ─── BT4-9: selectBattleLog vrací newest-first ───────────────────────────────

describe('BT4-9: selectBattleLog — newest-first', () => {
  it('vrací záznamy newest-first (reversed)', () => {
    const state = makeState(0x8001);
    pushBattleLogEntry(state, { zoneId: 'homeZone', winner: 'player', playerCasualties: 1, playerKills: 5, loot: null, atStep: 100 });
    pushBattleLogEntry(state, { zoneId: 'homeZone', winner: 'theWarlord', playerCasualties: 3, playerKills: 2, loot: null, atStep: 200 });
    pushBattleLogEntry(state, { zoneId: 'homeZone', winner: 'player', playerCasualties: 0, playerKills: 8, loot: null, atStep: 300 });
    const log = selectBattleLog(/** @type {any} */ (state));
    assert.equal(log.length, 3, 'should return all 3 entries');
    assert.equal(log[0].atStep, 300, 'newest entry first');
    assert.equal(log[1].atStep, 200, 'second entry');
    assert.equal(log[2].atStep, 100, 'oldest entry last');
  });

  it('vrací prázdné pole pro state bez battleLog', () => {
    const state = makeState(0x8002);
    const log = selectBattleLog(/** @type {any} */ (state));
    assert.deepStrictEqual(log, [], 'no battleLog → empty array');
  });

  it('nemodifikuje originální pole (slice)', () => {
    const state = makeState(0x8003);
    pushBattleLogEntry(state, { zoneId: 'homeZone', winner: 'player', playerCasualties: 1, playerKills: 5, loot: null, atStep: 100 });
    pushBattleLogEntry(state, { zoneId: 'homeZone', winner: 'player', playerCasualties: 2, playerKills: 3, loot: null, atStep: 200 });
    const st = /** @type {any} */ (state);
    const originalFirst = st.world.battleLog[0].atStep;
    selectBattleLog(/** @type {any} */ (state));
    assert.equal(st.world.battleLog[0].atStep, originalFirst, 'selectBattleLog must not mutate state.world.battleLog');
  });
});

// ─── BT4-10: catch-up auto-resolve — bitvy doběhnou přes battleTick ──────────

describe('BT4-10: catch-up auto-resolve — battleTick dohraje bitvu deterministicky', () => {
  it('battleTick dohraje bitvu (state.battle→null) v offline dávce (G2)', () => {
    const state = makeState(0x9001);
    ensureHomeZone(state);
    ensureFaction(state, 'theWarlord');
    const st = /** @type {any} */ (state);
    // Start a battle
    startBattle(state, { attackerId: 'theWarlord', targetZoneId: 'homeZone' }, {});
    assert.ok(st.battle, 'battle must be started');

    // Run enough battleTick steps to conclude the battle
    // Each step adds STEP_MS=50ms; BATTLE_TICK_MS=30ms → ~1.67 battleTicks per step
    // Worst case: ~500 opponent warriors → battle ends within endCheckPeriod*80 ≈ 6400 ticks → ~3840 steps
    let resolved = false;
    for (let i = 0; i < 5000; i++) {
      battleTick(state, {}, {});
      if (!st.battle) {
        resolved = true;
        break;
      }
    }
    assert.ok(resolved, 'battle must resolve within 5000 steps (G2 auto-resolve)');
  });

  it('resolveBattleOutcome записuje do state.world.battleLog', () => {
    const state = makeState(0x9002);
    ensureHomeZone(state);
    ensureFaction(state, 'theWarlord');
    const st = /** @type {any} */ (state);
    startBattle(state, { attackerId: 'theWarlord', targetZoneId: 'homeZone' }, {});
    assert.ok(st.battle, 'battle must be started');

    for (let i = 0; i < 5000; i++) {
      battleTick(state, {}, {});
      if (!st.battle) break;
    }
    // battleLog must have at least 1 entry
    assert.ok(Array.isArray(st.world?.battleLog), 'state.world.battleLog must be an array after battle');
    assert.ok(st.world.battleLog.length >= 1, 'at least 1 battle log entry must be recorded');
    const entry = st.world.battleLog[0];
    assert.ok(entry.zoneId, 'battleLog entry must have zoneId');
    assert.ok('winner' in entry, 'battleLog entry must have winner field');
    assert.ok(typeof entry.playerCasualties === 'number', 'battleLog entry must have playerCasualties');
    assert.ok(typeof entry.playerKills === 'number', 'battleLog entry must have playerKills');
  });

  it('catch-up auto-resolve deterministické — 2 identické state→ identický battleLog', () => {
    const s1 = makeState(0x9003);
    const s2 = makeState(0x9003);
    ensureHomeZone(s1);
    ensureHomeZone(s2);
    ensureFaction(s1, 'theWarlord');
    ensureFaction(s2, 'theWarlord');

    startBattle(s1, { attackerId: 'theWarlord', targetZoneId: 'homeZone' }, {});
    startBattle(s2, { attackerId: 'theWarlord', targetZoneId: 'homeZone' }, {});

    for (let i = 0; i < 5000; i++) {
      battleTick(s1, {}, {});
      battleTick(s2, {}, {});
      if (!/** @type {any} */ (s1).battle && !/** @type {any} */ (s2).battle) break;
    }

    const log1 = /** @type {any} */ (s1).world?.battleLog ?? [];
    const log2 = /** @type {any} */ (s2).world?.battleLog ?? [];
    assert.deepStrictEqual(log1, log2, 'identical seeds must produce identical battleLog (determinism G1)');
  });
});

// ─── BT4-11: battleLog model bez bitev ───────────────────────────────────────

describe('BT4-11: OfflineSummary model without battles — clean text', () => {
  it('model.battles.hasBattles=false → čistý text bez bitevní části', () => {
    const model = buildOfflineSummary({
      missedMs: 1800_000, wasCapped: false, stepsRun: 900, interrupted: false,
    });
    assert.equal(model.battles.hasBattles, false);
    assert.equal(model.battles.total, 0);
    assert.equal(model.battles.wins, 0);
    assert.equal(model.battles.losses, 0);
    const text = formatOfflineSummary(model);
    assert.ok(!text.includes('bitev') && !text.includes('bitva') && !text.includes('bitvy'),
      'no battles → no battle text in output');
  });

  it('model má battles field vždy (i bez state)', () => {
    const model = buildOfflineSummary({
      missedMs: 0, wasCapped: false, stepsRun: 0, interrupted: false,
    });
    assert.ok('battles' in model, 'model must always have battles field');
    assert.ok(typeof model.battles.total === 'number', 'battles.total must be number');
    assert.ok(typeof model.battles.wins === 'number', 'battles.wins must be number');
    assert.ok(typeof model.battles.losses === 'number', 'battles.losses must be number');
    assert.ok(typeof model.battles.hasBattles === 'boolean', 'battles.hasBattles must be boolean');
  });
});
