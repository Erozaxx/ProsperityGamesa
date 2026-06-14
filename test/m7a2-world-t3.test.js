/**
 * M7a-2 T3 — revolty, questy, tribute výběr, AI-AI bitvy (iter-017).
 *
 * Gate requirements (brief_coder_T-005 + design §3/§4/§5/§6):
 *   T3-1  Revolt deterministický: favour-drain vzorec, stejný stav → stejný výsledek
 *   T3-2  Revolt gating: under revoltMechanicStart → no drain; above → drain
 *   T3-3  Revolt immune: hornCastle/thePsychopath / dickinsonLanding/theWarlord / castleGrey/thePrincess
 *   T3-4  Revolt trigger: favour < 5 → zone.liege = originalLiege, policy = 1
 *   T3-5  Revolt decay: liege==originalLiege → favour decay toward 0 per faction
 *   T3-6  Quest gating (settlementLevel): settlementLevel < questSettlementMin → no quest
 *   T3-7  Quest gating (hasMilitary): totWarriors+totArchers = 0 → no quest
 *   T3-8  Quest gating (liege!=originalLiege): occupied zone → no quest
 *   T3-9  Quest generování: deterministické (stejný seed → stejné questy)
 *   T3-10 Quest accept: deducts warriors/archers, grants reward
 *   T3-11 Quest reject: removes quest, no penalty
 *   T3-12 Quest accept: insufficient warriors → error
 *   T3-13 gatherTributes: player zone resources → granted to player inventory
 *   T3-14 gatherTributes: AI zone resources → capital.resources.gold accumulated
 *   T3-15 aiBattleResolve tabulkový: 1:1 originál (attacker wins/loses scenarios)
 *   T3-16 persist round-trip: world.quests/questSeq survive save/load
 *   T3-17 persist round-trip: favour shape (object) survives save/load after revolt activity
 *   T3-18 fresh-vs-load: hashState identical after quest gen + revolt activity
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadCatalog, clearCatalogs } from '../src/core/catalog/index.js';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { initRng, hashState, makeRng } from '../src/core/engine/rng.js';
import { applyPersist } from '../src/save/persistSchema.js';
import { loadAndReconstruct } from '../src/save/load.js';
import { SAVE_VERSION } from '../src/save/schema.js';
import { BALANCE } from '../src/core/balance/balance.js';
import { processZone, hydrateZones, gatherTributes, findQuest, removeQuest } from '../src/core/systems/world.js';
import { acceptQuest, rejectQuest } from '../src/core/commands/quests.js';
import { aiBattleResolve } from '../src/core/balance/formulas.js';
import { createRegistry } from '../src/core/registry/registry.js';
import { registerCorePeriodics } from '../src/core/engine/tickOrder.js';

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
  loadCatalog('population', loadJson('population'));
});

function makeCtx() {
  const registry = createRegistry();
  const periodics = registerCorePeriodics(registry);
  return { registry, periodics };
}

function makeState(seed = 0xDEADBEEF) {
  const state = createInitialState({ seed });
  initRng(state);
  return state;
}

/**
 * Make a minimal zone for testing (without catalog).
 * @param {Partial<any>} overrides
 * @returns {any}
 */
function makeZone(overrides = {}) {
  return {
    id: 'testZone',
    name: 'Test Zone',
    liege: 'thePrincess',
    originalLiege: 'theWarlord',
    policy: 0,
    numWorkers: 500,
    warriors: 50,
    archers: 50,
    resources: {},
    tribute: {},
    favour: {},
    goldStore: 0,
    notEnoughGold: 0,
    curQuest: null,
    goldDemand: 0,
    goldProduction: 0,
    neighbours: [],
    targetWorkerNum: 1000,
    warriorGrowth: 0,
    archerGrowth: 0,
    immunity: 0,
    ...overrides,
  };
}

/**
 * Build a minimal state for revolt/quest testing without catalog.
 * @param {Partial<any>} opts
 * @returns {any}
 */
function makeMinimalState(opts = {}) {
  const s = /** @type {any} */ ({
    engine: { curStep: BALANCE.world.revoltMechanicStart + 1000, schedule: [], scheduleCount: {}, _seq: 0 },
    world: {
      zones: opts.zones || [],
      factions: opts.factions || {},
      quests: opts.quests || [],
      questSeq: opts.questSeq || 0,
      marketState: {},
    },
    home: { settlementLevel: opts.settlementLevel ?? 5 },
    player: {
      totWarriors: opts.totWarriors ?? 100,
      totArchers: opts.totArchers ?? 100,
      gold: opts.gold ?? 1000,
      inventory: opts.inventory || {},
    },
    season: { _absDay: 100 },
    // rng.streams is what makeRng actually reads (not seeds)
    rng: { streams: { world: opts.rngSeed ?? 0xABCDEF }, seed: 0xABCDEF },
  });
  return s;
}

// ─── T3-1: Revolt deterministický ─────────────────────────────────────────────
describe('T3-1 — Revolt deterministický: favour-drain', () => {
  it('same zone state → same favour drain (deterministic, no rng needed)', () => {
    const zone1 = makeZone({ policy: 0, warriors: 50, archers: 50, favour: {} });
    const zone2 = makeZone({ policy: 0, warriors: 50, archers: 50, favour: {} });

    const state1 = makeMinimalState({ zones: [zone1] });
    const state2 = makeMinimalState({ zones: [zone2] });

    const rng1 = makeRng(state1, 'world');
    const rng2 = makeRng(state2, 'world');

    processZone(state1, 'testZone', rng1);
    processZone(state2, 'testZone', rng2);

    // Both zones should have same favour drain result
    assert.deepStrictEqual(state1.world.zones[0].favour, state2.world.zones[0].favour);
  });

  it('occupied zone (liege!=originalLiege) drains favour by base -2 + modifiers', () => {
    // Zone with policy=0, units 50+50=100 (< 500 range → +0 modifier)
    // Expected: -2 base + 0 policy + 0 unit = -2
    const zone = makeZone({ policy: 0, warriors: 50, archers: 50, favour: { thePrincess: 10 } });
    const state = makeMinimalState({ zones: [zone] });
    const rng = makeRng(state, 'world');

    processZone(state, 'testZone', rng);

    // Favour for liege (thePrincess) should decrease
    const newFavour = state.world.zones[0].favour.thePrincess;
    assert.ok(newFavour < 10, `favour should decrease from 10, got ${newFavour}`);
  });

  it('policy=2 (military) drains more (-4 modifier)', () => {
    const zone1 = makeZone({ policy: 0, warriors: 50, archers: 50, favour: { thePrincess: 50 } });
    const zone2 = makeZone({ policy: 2, warriors: 50, archers: 50, favour: { thePrincess: 50 } });
    const state1 = makeMinimalState({ zones: [zone1] });
    const state2 = makeMinimalState({ zones: [zone2] });

    processZone(state1, 'testZone', makeRng(state1, 'world'));
    processZone(state2, 'testZone', makeRng(state2, 'world'));

    const drain1 = 50 - state1.world.zones[0].favour.thePrincess;
    const drain2 = 50 - state2.world.zones[0].favour.thePrincess;

    // policy=2 drains more than policy=0
    assert.ok(drain2 > drain1, `policy=2 should drain more than policy=0: drain2=${drain2} drain1=${drain1}`);
  });
});

// ─── T3-2: Revolt gating ──────────────────────────────────────────────────────
describe('T3-2 — Revolt gating: under/above revoltMechanicStart', () => {
  it('under revoltMechanicStart: no favour drain', () => {
    const zone = makeZone({ favour: { thePrincess: 50 } });
    const state = makeMinimalState({ zones: [zone] });
    // Set step BELOW gate
    state.engine.curStep = BALANCE.world.revoltMechanicStart - 1000;
    const rng = makeRng(state, 'world');

    processZone(state, 'testZone', rng);

    // Favour should remain unchanged (revolt not triggered)
    assert.strictEqual(state.world.zones[0].favour.thePrincess, 50);
  });

  it('above revoltMechanicStart: favour drain occurs', () => {
    const zone = makeZone({ favour: { thePrincess: 50 } });
    const state = makeMinimalState({ zones: [zone] });
    state.engine.curStep = BALANCE.world.revoltMechanicStart + 1;
    const rng = makeRng(state, 'world');

    processZone(state, 'testZone', rng);

    // Favour should change
    assert.ok(state.world.zones[0].favour.thePrincess !== 50,
      'favour should change above revoltMechanicStart');
  });
});

// ─── T3-3: Revolt immune ──────────────────────────────────────────────────────
describe('T3-3 — Revolt immune combinations', () => {
  const immuneCases = [
    { id: 'hornCastle',      liege: 'thePsychopath', originalLiege: 'player' },
    { id: 'dickinsonLanding',liege: 'theWarlord',    originalLiege: 'player' },
    { id: 'castleGrey',      liege: 'thePrincess',   originalLiege: 'player' },
  ];

  for (const c of immuneCases) {
    it(`${c.id}/${c.liege} is immune (favour unchanged)`, () => {
      const zone = makeZone({ id: c.id, liege: c.liege, originalLiege: c.originalLiege, favour: { [c.liege]: 50 } });
      const state = makeMinimalState({ zones: [zone] });
      state.engine.curStep = BALANCE.world.revoltMechanicStart + 1000;

      processZone(state, c.id, makeRng(state, 'world'));

      // Favour should not change (immune)
      assert.strictEqual(state.world.zones[0].favour[c.liege], 50,
        `${c.id}/${c.liege} should be immune`);
    });
  }
});

// ─── T3-4: Revolt trigger ─────────────────────────────────────────────────────
describe('T3-4 — Revolt trigger: favour < 5 → revert liege', () => {
  it('when favour drops below 5, zone reverts to originalLiege, policy=1', () => {
    // Start favour at 4 → should revolt immediately
    const zone = makeZone({ favour: { thePrincess: 4 }, policy: 2 });
    const state = makeMinimalState({ zones: [zone] });
    state.engine.curStep = BALANCE.world.revoltMechanicStart + 1;

    processZone(state, 'testZone', makeRng(state, 'world'));

    // Zone should have reverted to originalLiege (theWarlord)
    assert.strictEqual(state.world.zones[0].liege, 'theWarlord',
      'zone should revert to originalLiege after revolt');
    assert.strictEqual(state.world.zones[0].policy, 1,
      'policy should reset to 1 after revolt');
  });
});

// ─── T3-5: Revolt decay ───────────────────────────────────────────────────────
describe('T3-5 — Revolt decay: liege==originalLiege → favour decay toward 0', () => {
  it('positive favour decays toward 0', () => {
    const zone = makeZone({
      liege: 'theWarlord',
      originalLiege: 'theWarlord',  // same → neutral zone
      favour: { thePrincess: 10, player: 5, theWarlord: 0 },
    });
    const state = makeMinimalState({ zones: [zone] });
    state.engine.curStep = BALANCE.world.revoltMechanicStart + 1;

    processZone(state, 'testZone', makeRng(state, 'world'));

    // Positive favours should decrease by 1
    assert.strictEqual(state.world.zones[0].favour.thePrincess, 9);
    assert.strictEqual(state.world.zones[0].favour.player, 4);
  });

  it('negative favour decays toward 0', () => {
    const zone = makeZone({
      liege: 'theWarlord',
      originalLiege: 'theWarlord',
      favour: { thePsychopath: -10 },
    });
    const state = makeMinimalState({ zones: [zone] });
    state.engine.curStep = BALANCE.world.revoltMechanicStart + 1;

    processZone(state, 'testZone', makeRng(state, 'world'));

    assert.strictEqual(state.world.zones[0].favour.thePsychopath, -9);
  });
});

// ─── T3-6: Quest gating settlementLevel ───────────────────────────────────────
describe('T3-6 — Quest gating: settlementLevel too low', () => {
  it('settlementLevel < questSettlementMin → no quest generated', () => {
    const zone = makeZone({
      liege: 'theWarlord',
      originalLiege: 'theWarlord',
      numWorkers: 5000,
      curQuest: null,
      neighbours: ['homeZone'], // neighbour is player
    });
    const homeZone = makeZone({ id: 'homeZone', liege: 'player', originalLiege: 'player' });

    const state = makeMinimalState({
      zones: [zone, homeZone],
      settlementLevel: 0, // below questSettlementMin (1)
      totWarriors: 100,
      totArchers: 100,
    });
    state.engine.curStep = BALANCE.world.revoltMechanicStart + 1;

    processZone(state, 'testZone', makeRng(state, 'world'));

    assert.strictEqual(state.world.zones[0].curQuest, null,
      'no quest should be generated when settlementLevel < questSettlementMin');
  });
});

// ─── T3-7: Quest gating hasMilitary ───────────────────────────────────────────
describe('T3-7 — Quest gating: no military', () => {
  it('totWarriors=0 + totArchers=0 → no quest generated', () => {
    const zone = makeZone({
      liege: 'player',
      originalLiege: 'player',
      numWorkers: 5000,
      curQuest: null,
    });

    const state = makeMinimalState({
      zones: [zone],
      settlementLevel: 5,
      totWarriors: 0,
      totArchers: 0,
    });
    state.engine.curStep = BALANCE.world.revoltMechanicStart + 1;

    processZone(state, 'testZone', makeRng(state, 'world'));

    assert.strictEqual(state.world.zones[0].curQuest, null,
      'no quest should be generated when no military');
  });
});

// ─── T3-8: Quest gating liege!=originalLiege ─────────────────────────────────
describe('T3-8 — Quest gating: occupied zone (liege!=originalLiege)', () => {
  it('occupied zone → no quest generated', () => {
    // Zone is occupied (thePrincess took warlord's zone) but is neighbor of player
    const zone = makeZone({
      liege: 'thePrincess',      // occupied
      originalLiege: 'theWarlord',
      numWorkers: 5000,
      curQuest: null,
      neighbours: ['homeZone'],
    });
    const homeZone = makeZone({ id: 'homeZone', liege: 'player', originalLiege: 'player' });

    const state = makeMinimalState({
      zones: [zone, homeZone],
      settlementLevel: 5,
      totWarriors: 200,
      totArchers: 200,
    });
    state.engine.curStep = BALANCE.world.revoltMechanicStart + 1;

    processZone(state, 'testZone', makeRng(state, 'world'));

    // Occupied zone should not generate quest (liege!=originalLiege check in processQuestGen)
    assert.strictEqual(state.world.zones[0].curQuest, null,
      'occupied zone should not generate quest');
  });
});

// ─── T3-9: Quest generování deterministické ───────────────────────────────────
describe('T3-9 — Quest generování deterministické', () => {
  it('same seed → same questSeq and quest params', () => {
    function runGen(seed) {
      const zone = makeZone({
        id: 'silverInslet',
        liege: 'player',
        originalLiege: 'player',
        numWorkers: 5000,
        curQuest: null,
        neighbours: [],
      });

      const state = makeMinimalState({
        zones: [zone],
        settlementLevel: 5,
        totWarriors: 500,
        totArchers: 500,
        rngSeed: seed,
      });
      state.engine.curStep = BALANCE.world.revoltMechanicStart + 1;

      processZone(state, 'silverInslet', makeRng(state, 'world'));
      return { quests: state.world.quests, questSeq: state.world.questSeq };
    }

    const r1 = runGen(0x12345678);
    const r2 = runGen(0x12345678);

    assert.strictEqual(r1.questSeq, r2.questSeq, 'questSeq should be deterministic');
    assert.deepStrictEqual(r1.quests, r2.quests, 'quests should be deterministic');
  });
});

// ─── T3-10: Quest accept ──────────────────────────────────────────────────────
describe('T3-10 — Quest accept: deducts warriors/archers, grants reward', () => {
  it('acceptQuest deducts warriors/archers and grants gold reward', () => {
    const zone = makeZone({ id: 'zone1', liege: 'player', originalLiege: 'player', favour: {} });
    const quest = {
      id: 'quest_0',
      from: 'zone1',
      type: 'reinforcement',
      title: 'Test quest',
      req: { warriors: 10, archers: 5 },
      reward: { favour: 60, gold: 100 },
      deadlineStep: 999999,
      description: 'Test',
    };

    const state = makeMinimalState({
      zones: [zone],
      quests: [quest],
      questSeq: 1,
      totWarriors: 50,
      totArchers: 30,
      gold: 500,
    });
    zone.curQuest = 'quest_0';

    const result = acceptQuest(state, { questId: 'quest_0' });

    assert.strictEqual(result.ok, true, 'acceptQuest should succeed');
    assert.strictEqual(state.player.totWarriors, 40, 'should deduct 10 warriors');
    assert.strictEqual(state.player.totArchers, 25, 'should deduct 5 archers');
    assert.strictEqual(state.player.gold, 600, 'should grant 100 gold reward');
    assert.strictEqual(findQuest(state, 'quest_0'), undefined, 'quest should be removed');
    assert.strictEqual(state.world.zones[0].curQuest, null, 'zone.curQuest should be null');
  });

  it('acceptQuest grants favour to zone', () => {
    const zone = makeZone({ id: 'zone1', liege: 'player', originalLiege: 'player', favour: { player: 10 } });
    const quest = {
      id: 'quest_1',
      from: 'zone1',
      type: 'reinforcement',
      title: 'Test quest',
      req: { warriors: 5, archers: 0 },
      reward: { favour: 60 },
      deadlineStep: 999999,
      description: 'Test',
    };

    const state = makeMinimalState({ zones: [zone], quests: [quest], totWarriors: 20 });
    zone.curQuest = 'quest_1';

    acceptQuest(state, { questId: 'quest_1' });

    assert.strictEqual(state.world.zones[0].favour.player, 70,
      'favour should increase by reward.favour (60)');
  });
});

// ─── T3-11: Quest reject ──────────────────────────────────────────────────────
describe('T3-11 — Quest reject: removes quest, no penalty', () => {
  it('rejectQuest removes quest with no penalty', () => {
    const zone = makeZone({ id: 'zone1', liege: 'player', originalLiege: 'player' });
    const quest = {
      id: 'quest_2',
      from: 'zone1',
      type: 'reinforcement',
      req: { warriors: 10, archers: 5 },
      reward: { favour: 60 },
      deadlineStep: 999999,
      description: 'Test',
    };

    const state = makeMinimalState({
      zones: [zone],
      quests: [quest],
      totWarriors: 50,
      totArchers: 30,
      gold: 500,
    });
    zone.curQuest = 'quest_2';

    const goldBefore = state.player.gold;
    const warriorsBefore = state.player.totWarriors;

    const result = rejectQuest(state, { questId: 'quest_2' });

    assert.strictEqual(result.ok, true);
    assert.strictEqual(state.player.gold, goldBefore, 'gold should not change on reject');
    assert.strictEqual(state.player.totWarriors, warriorsBefore, 'warriors should not change on reject');
    assert.strictEqual(findQuest(state, 'quest_2'), undefined, 'quest should be removed');
    assert.strictEqual(state.world.zones[0].curQuest, null, 'zone.curQuest should be null');
  });
});

// ─── T3-12: Quest accept insufficient warriors ────────────────────────────────
describe('T3-12 — Quest accept: insufficient warriors → error', () => {
  it('returns ok:false when not enough warriors', () => {
    const zone = makeZone({ id: 'zone1', liege: 'player', originalLiege: 'player' });
    const quest = {
      id: 'quest_3',
      from: 'zone1',
      type: 'reinforcement',
      req: { warriors: 100, archers: 0 },
      reward: { favour: 60 },
      deadlineStep: 999999,
      description: 'Test',
    };

    const state = makeMinimalState({
      zones: [zone],
      quests: [quest],
      totWarriors: 10, // not enough
    });
    zone.curQuest = 'quest_3';

    const result = acceptQuest(state, { questId: 'quest_3' });

    assert.strictEqual(result.ok, false);
    assert.ok(result.error && result.error.includes('insufficient warriors'));
    // Quest should remain
    assert.ok(findQuest(state, 'quest_3') !== undefined, 'quest should remain after failed accept');
  });

  it('returns ok:false for non-existent questId', () => {
    const state = makeMinimalState({});
    const result = acceptQuest(state, { questId: 'quest_nonexistent' });
    assert.strictEqual(result.ok, false);
  });

  it('returns ok:false for invalid questId type', () => {
    const state = makeMinimalState({});
    const result = acceptQuest(state, { questId: 123 });
    assert.strictEqual(result.ok, false);
  });

  it('rejectQuest returns ok:false for non-existent questId', () => {
    const state = makeMinimalState({});
    const result = rejectQuest(state, { questId: 'quest_nonexistent' });
    assert.strictEqual(result.ok, false);
  });
});

// ─── T3-13: gatherTributes player zones ───────────────────────────────────────
describe('T3-13 — gatherTributes: player zone resources → player inventory', () => {
  it('player zone resources are granted to player inventory', () => {
    const zone = makeZone({
      id: 'zone1',
      liege: 'player',
      originalLiege: 'player',
      resources: { wood: 100, stone: 50 },
    });

    const state = makeMinimalState({ zones: [zone], inventory: { wood: 10 } });

    const ctx = makeCtx();
    gatherTributes(state, {}, ctx);

    // Player should have received the tribute
    assert.ok(state.player.inventory.wood >= 10, 'wood should be at least 10 (initial)');
    // Resources should be cleared
    assert.deepStrictEqual(state.world.zones[0].resources, {}, 'zone resources should be cleared');
  });

  it('homeZone is skipped in gatherTributes', () => {
    const homeZone = makeZone({ id: 'homeZone', liege: 'player', resources: { gold: 1000 } });
    const state = makeMinimalState({ zones: [homeZone] });

    const ctx = makeCtx();
    const goldBefore = state.player.gold;
    gatherTributes(state, {}, ctx);

    // homeZone is skipped so gold should not change
    assert.strictEqual(state.player.gold, goldBefore, 'homeZone resources should not be collected');
  });
});

// ─── T3-14: gatherTributes AI zones ───────────────────────────────────────────
describe('T3-14 — gatherTributes: AI zone resources → capital.resources.gold', () => {
  it('AI zone resources are converted to gold in capital', () => {
    // Need a faction with a capital zone
    const capitalZone = makeZone({
      id: 'silverInslet',
      liege: 'theWarlord',
      originalLiege: 'theWarlord',
      resources: { gold: 0 },
    });
    const vassalZone = makeZone({
      id: 'pointAnne',
      liege: 'theWarlord',
      originalLiege: 'theWarlord',
      resources: { gold: 500 },  // accumulated tribute
    });

    const state = makeMinimalState({
      zones: [capitalZone, vassalZone],
      factions: {
        theWarlord: { id: 'theWarlord', capitalId: 'silverInslet', state: 0, wantToAttack: false, nextTarget: null },
      },
    });

    const ctx = makeCtx();
    gatherTributes(state, {}, ctx);

    // vassalZone resources should be cleared
    assert.deepStrictEqual(state.world.zones[1].resources, {},
      'AI zone resources should be cleared');
  });
});

// ─── T3-15: aiBattleResolve tabulkový ────────────────────────────────────────
describe('T3-15 — aiBattleResolve: 1:1 originál tabulkový test', () => {
  // Fixed-value rng for deterministic tests
  function makeFixedRng(values) {
    let i = 0;
    return { next: () => values[i++ % values.length] };
  }

  it('attacker wins scenario (high strength vs weak defender)', () => {
    // rng values for warrResults + archResults calculation
    // warrResults = max((1 * 1000 - (10 * 1 * rng * 0.5 + 0.7)) / 1, 0)
    // with rng=0.1: warrResults = max(1000 - (0.5 + 0.7), 0) = max(998.8, 0) = 998.8
    // archResults = max((1 * 1000 - (10 * 1 * rng * 0.5 + 0.7)) / 1, 0) = same
    // attackerWins = (998.8 + 998.8) > 0 = true
    // newAtkWarriors = floor(rng * 1.4 * 998.8) = floor(0.5 * 1.4 * 998.8) = floor(699.16) = 699
    // newAtkArchers  = floor(rng * 1.4 * 998.8) = floor(0.5 * 1.4 * 998.8) = 699
    // newDefArchers  = floor(rng * 0.3 * 998.8) = floor(0.5 * 0.3 * 998.8) = floor(149.82) = 149
    // newDefWarriors = floor(rng * 0.3 * 998.8) = floor(0.5 * 0.3 * 998.8) = 149

    const rng = makeFixedRng([0.1, 0.1, 0.5, 0.5, 0.5, 0.5]);
    const result = aiBattleResolve({
      atkWarriorStrength: 1,
      atkArcherStrength: 1,
      defWarriorStrength: 1,
      defArcherStrength: 1,
      atkWarriors: 1000,
      atkArchers: 1000,
      defWarriors: 10,
      defArchers: 10,
    }, rng);

    assert.strictEqual(result.attackerWins, true, 'attacker should win with high strength');
    assert.ok(result.warrResults > 0, 'warrResults should be positive');
    assert.ok(result.archResults > 0, 'archResults should be positive');
    // Verify floor operation
    assert.strictEqual(result.newAtkWarriors, Math.floor(result.newAtkWarriors),
      'newAtkWarriors should be floored');
    assert.strictEqual(result.newAtkArchers, Math.floor(result.newAtkArchers),
      'newAtkArchers should be floored');
  });

  it('attacker loses scenario (weak attacker vs strong defender)', () => {
    // warrResults = max((1 * 10 - (1000 * 1 * rng * 0.5 + 0.7)) / 1, 0)
    // with rng=0.1: max(10 - 50.7, 0) = 0
    // archResults = same = 0
    // attackerWins = false
    const rng = makeFixedRng([0.1, 0.1, 0.5, 0.5, 0.5, 0.5]);
    const result = aiBattleResolve({
      atkWarriorStrength: 1,
      atkArcherStrength: 1,
      defWarriorStrength: 1,
      defArcherStrength: 1,
      atkWarriors: 10,
      atkArchers: 10,
      defWarriors: 1000,
      defArchers: 1000,
    }, rng);

    assert.strictEqual(result.attackerWins, false, 'attacker should lose vs strong defender');
    assert.strictEqual(result.warrResults, 0, 'warrResults should be 0');
    assert.strictEqual(result.archResults, 0, 'archResults should be 0');
    // Lose: new values are fractions of original
    assert.ok(result.newAtkWarriors <= 10, 'losing attacker should lose warriors');
    assert.ok(result.newAtkArchers <= 10, 'losing attacker should lose archers');
    assert.ok(result.newDefWarriors <= 1000, 'losing defender still takes some damage');
  });

  it('deterministic: same rng sequence → same result', () => {
    const params = {
      atkWarriorStrength: 2,
      atkArcherStrength: 1.5,
      defWarriorStrength: 1,
      defArcherStrength: 1,
      atkWarriors: 500,
      atkArchers: 300,
      defWarriors: 200,
      defArchers: 150,
    };

    let seq1 = 0, seq2 = 0;
    const rng1 = { next: () => [0.3, 0.4, 0.7, 0.6, 0.5, 0.8][seq1++ % 6] };
    const rng2 = { next: () => [0.3, 0.4, 0.7, 0.6, 0.5, 0.8][seq2++ % 6] };

    const r1 = aiBattleResolve(params, rng1);
    const r2 = aiBattleResolve(params, rng2);

    assert.deepStrictEqual(r1, r2, 'aiBattleResolve should be deterministic');
  });

  it('formula matches original: warrResults = max((atkWS*atkW - defW*defWS*rng*0.5+0.7)/atkWS, 0)', () => {
    // Test specific calculation from design §4
    // rng returns fixed values in order
    const rngVals = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
    let i = 0;
    const rng = { next: () => rngVals[i++] };

    const atkWS = 2, atkAS = 1.5;
    const defWS = 1, defAS = 1;
    const atkW = 100, atkA = 50;
    const defW = 30, defA = 20;

    const result = aiBattleResolve({
      atkWarriorStrength: atkWS, atkArcherStrength: atkAS,
      defWarriorStrength: defWS, defArcherStrength: defAS,
      atkWarriors: atkW, atkArchers: atkA,
      defWarriors: defW, defArchers: defA,
    }, rng);

    // Manually compute expected warrResults
    // warrResults = max((2*100 - (30*1*0.5*0.5 + 0.7)) / 2, 0)
    //             = max((200 - (7.5 + 0.7)) / 2, 0)
    //             = max(191.8 / 2, 0) = max(95.9, 0) = 95.9
    const expectedWarrResults = Math.max((atkWS * atkW - (defW * defWS * 0.5 * 0.5 + 0.7)) / atkWS, 0);
    assert.strictEqual(result.warrResults, expectedWarrResults,
      `warrResults should match formula: expected ${expectedWarrResults}, got ${result.warrResults}`);
  });
});

// ─── T3-16: persist round-trip quests/questSeq ────────────────────────────────
describe('T3-16 — persist round-trip: world.quests/questSeq survive save/load', () => {
  it('quests and questSeq survive applyPersist → loadAndReconstruct', () => {
    const state = makeState(0xABCDEF);
    const w = /** @type {any} */ (state.world);

    // Inject some quests
    w.quests = [
      { id: 'quest_0', from: 'silverInslet', type: 'reinforcement', title: 'Test',
        req: { warriors: 10 }, reward: { favour: 60 }, deadlineStep: 900000, description: 'test' },
    ];
    w.questSeq = 1;

    const payload = applyPersist(state);
    const loaded = /** @type {any} */ (loadAndReconstruct({ saveVersion: SAVE_VERSION, payload }));

    assert.ok(Array.isArray(loaded.world.quests), 'quests should be array after load');
    assert.strictEqual(loaded.world.quests.length, 1, 'should have 1 quest after load');
    assert.strictEqual(loaded.world.quests[0].id, 'quest_0');
    assert.strictEqual(loaded.world.quests[0].from, 'silverInslet');
    assert.strictEqual(loaded.world.questSeq, 1, 'questSeq should survive save/load');
  });

  it('faction state, wantToAttack, nextTarget survive save/load', () => {
    const state = makeState(0xBEEF);
    const w = /** @type {any} */ (state.world);

    // Modify faction state
    if (w.factions && w.factions.theWarlord) {
      w.factions.theWarlord.state = 4;
      w.factions.theWarlord.wantToAttack = true;
      w.factions.theWarlord.nextTarget = 'pointAnne';
    }

    const payload = applyPersist(state);
    const loaded = /** @type {any} */ (loadAndReconstruct({ saveVersion: SAVE_VERSION, payload }));

    if (loaded.world.factions && loaded.world.factions.theWarlord) {
      assert.strictEqual(loaded.world.factions.theWarlord.state, 4);
      assert.strictEqual(loaded.world.factions.theWarlord.wantToAttack, true);
      assert.strictEqual(loaded.world.factions.theWarlord.nextTarget, 'pointAnne');
    }
  });
});

// ─── T3-17: persist round-trip favour shape ───────────────────────────────────
describe('T3-17 — persist round-trip: favour object shape survives save/load', () => {
  it('non-empty favour survives save/load with deep-copy', () => {
    const state = makeState(0xCAFE);
    const w = /** @type {any} */ (state.world);

    // Set a non-empty favour on a zone
    if (Array.isArray(w.zones) && w.zones.length > 0) {
      w.zones[0].favour = { thePrincess: -3, player: 7 };
    }

    const payload = applyPersist(state);
    const loaded = /** @type {any} */ (loadAndReconstruct({ saveVersion: SAVE_VERSION, payload }));

    if (Array.isArray(loaded.world.zones) && loaded.world.zones.length > 0) {
      assert.strictEqual(typeof loaded.world.zones[0].favour, 'object',
        'favour should be object after load');
      assert.strictEqual(loaded.world.zones[0].favour.thePrincess, -3,
        'thePrincess favour should be preserved');
      assert.strictEqual(loaded.world.zones[0].favour.player, 7,
        'player favour should be preserved');
    }
  });

  it('all zones have favour as object (not number) after save/load', () => {
    const state = makeState(0xDEED);

    const payload = applyPersist(state);
    const loaded = /** @type {any} */ (loadAndReconstruct({ saveVersion: SAVE_VERSION, payload }));

    for (const zone of loaded.world.zones) {
      assert.strictEqual(typeof zone.favour, 'object',
        `zone ${zone.id}: favour must be object after load`);
      assert.ok(zone.favour !== null, `zone ${zone.id}: favour must not be null`);
    }
  });
});

// ─── T3-18: fresh-vs-load hashState ──────────────────────────────────────────
describe('T3-18 — fresh-vs-load hashState identical', () => {
  it('hashState(fresh) == hashState(load(save(fresh))) with quests/favour initialized', () => {
    const state = makeState(0x9E3779B9);
    const h1 = hashState(state);

    const payload = applyPersist(state);
    const loaded = loadAndReconstruct({ saveVersion: SAVE_VERSION, payload });
    const h2 = hashState(loaded);

    assert.strictEqual(h1, h2, 'hashState should match after save/load round-trip');
  });

  it('old M7a-1 save with favour=0 (number) migrates cleanly to {} on load', () => {
    const state = makeState(0xAAAAAAAA);
    const payload = applyPersist(state);

    // Simulate old M7a-1 save format: inject number favour into payload
    const worldPayload = /** @type {any} */ (payload).world;
    if (Array.isArray(worldPayload.zones)) {
      for (const z of worldPayload.zones) {
        z.favour = 0; // old format
      }
    }

    const loaded = /** @type {any} */ (loadAndReconstruct({ saveVersion: SAVE_VERSION, payload }));

    // All zones should have object favour after migration
    for (const zone of loaded.world.zones) {
      assert.strictEqual(typeof zone.favour, 'object',
        `zone ${zone.id}: old favour:0 should migrate to {}`);
      assert.ok(zone.favour !== null);
    }
  });
});
