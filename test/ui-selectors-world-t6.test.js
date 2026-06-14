/**
 * T6 (iter-017 M7a-2) — UI selector tests for world/zones/factions/quests.
 *
 * Gate requirements (brief_coder_T-006_iter-017 + design §8.1):
 *   WS-1  selectWorldZones: returns zones with derived militaryRating, economicRating
 *   WS-2  selectWorldZones: favour = zone.favour.player ?? 0 (undefined-safe, n-1)
 *   WS-3  selectWorldZones: policyName human-readable
 *   WS-4  selectWorldZones: occupied zone detection (liege != originalLiege)
 *   WF-1  selectFactions: returns factions with totalZones/totalWarriors/totalArchers
 *   WF-2  selectFactions: wantToAttack flag forwarded
 *   WQ-1  selectQuests: daysLeft derived from curStep (not stored)
 *   WQ-2  selectQuests: canAccept checks player totWarriors/totArchers vs req
 *   WQ-3  selectQuests: daysLeft = 0 when past deadline
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { BALANCE } from '../src/core/balance/balance.js';
import { selectWorldZones, selectFactions, selectQuests } from '../src/ui/selectors.js';

// ─── Minimal state builder ─────────────────────────────────────────────────────

/** Build a minimal GameState with injected world.zones, world.factions, world.quests */
function makeState({ zones = [], factions = {}, quests = [], questSeq = 0, curStep = 0 } = {}) {
  const state = createInitialState();
  state.engine.curStep = curStep;
  // @ts-ignore — minimal injection for selector tests
  state.world.zones    = zones;
  // @ts-ignore
  state.world.factions = factions;
  // @ts-ignore
  state.world.quests   = quests;
  // @ts-ignore
  state.world.questSeq = questSeq;
  return state;
}

function makeZone(overrides = {}) {
  return {
    id:            'testZone',
    name:          'Test Zone',
    liege:         'player',
    originalLiege: 'player',
    policy:        1,
    numWorkers:    100,
    warriors:      50,
    archers:       30,
    favour:        {},
    goldStore:     0,
    notEnoughGold: 0,
    goldDemand:    0,
    goldProduction:0,
    neighbours:    ['zone2'],
    curQuest:      null,
    immunity:      0,
    resources:     {},
    ...overrides,
  };
}

function makeFaction(overrides = {}) {
  return {
    id:          'theWarlord',
    name:        'Warlord',
    capitalId:   'warlordCapital',
    aggression:  0.8,
    backstab:    0.3,
    allies:      [],
    recallMin:   { w: 20, a: 10 },
    unitStats:   { warriors: { strength: 1, defense: 1 }, archers: { strength: 1, defense: 1 } },
    state:       0,
    wantToAttack:false,
    nextTarget:  null,
    allies_dyn:  [],
    ...overrides,
  };
}

// ─── selectWorldZones ──────────────────────────────────────────────────────────

describe('selectWorldZones', () => {
  it('WS-1: returns empty array when no zones', () => {
    const s = makeState({ zones: [] });
    const result = selectWorldZones(s);
    assert.deepEqual(result, []);
  });

  it('WS-1: returns zones with militaryRating and economicRating (derived, not NaN)', () => {
    const zone = makeZone({ warriors: 50, archers: 30, numWorkers: 100 });
    const s    = makeState({ zones: [zone] });
    const result = selectWorldZones(s);

    assert.equal(result.length, 1);
    const z = result[0];
    assert.equal(z.id,   'testZone');
    assert.equal(z.name, 'Test Zone');
    assert.ok(typeof z.militaryRating === 'number' && !isNaN(z.militaryRating),
      'militaryRating must be a number');
    assert.ok(typeof z.economicRating === 'number' && !isNaN(z.economicRating),
      'economicRating must be a number');
    // basic sanity: military rating > 0 for warriors/archers > 0
    assert.ok(z.militaryRating > 0, 'militaryRating should be positive for zone with troops');
  });

  it('WS-2: favour = zone.favour.player when set', () => {
    const zone = makeZone({ favour: { player: 42, theWarlord: -10 } });
    const s    = makeState({ zones: [zone] });
    const result = selectWorldZones(s);
    assert.equal(result[0].favour, 42);
  });

  it('WS-2: favour = 0 when zone.favour is empty object (no player key)', () => {
    const zone = makeZone({ favour: {} });
    const s    = makeState({ zones: [zone] });
    const result = selectWorldZones(s);
    assert.equal(result[0].favour, 0);
  });

  it('WS-2: favour = 0 when zone.favour is undefined (n-1 undefined-safe)', () => {
    const zone = makeZone({ favour: undefined });
    const s    = makeState({ zones: [zone] });
    const result = selectWorldZones(s);
    assert.equal(result[0].favour, 0);
  });

  it('WS-2: favour = 0 when zone.favour is a number (legacy/old save, migration guard)', () => {
    const zone = makeZone({ favour: 0 });
    // @ts-ignore intentional: test old number shape
    const s = makeState({ zones: [zone] });
    const result = selectWorldZones(s);
    // favour key is not a number→ favour.player lookup returns 0
    assert.equal(result[0].favour, 0);
  });

  it('WS-3: policyName is human-readable', () => {
    const EXPECTED = ['Zdroje', 'Růst', 'Vojsko', 'Tribut'];
    for (let p = 0; p < 4; p++) {
      const zone   = makeZone({ policy: p });
      const s      = makeState({ zones: [zone] });
      const result = selectWorldZones(s);
      assert.equal(result[0].policyName, EXPECTED[p], `policy ${p} should be ${EXPECTED[p]}`);
    }
  });

  it('WS-4: occupied zone (liege != originalLiege) is correctly identified in returned data', () => {
    const zone = makeZone({ liege: 'theWarlord', originalLiege: 'player' });
    const s    = makeState({ zones: [zone] });
    const result = selectWorldZones(s);
    const z = result[0];
    assert.equal(z.liege, 'theWarlord');
    assert.equal(z.originalLiege, 'player');
    // selector itself returns raw values; liege != originalLiege is occupied
    assert.notEqual(z.liege, z.originalLiege, 'occupied zone should have liege != originalLiege');
  });

  it('WS-1: militaryRating scales with warrior/archer count', () => {
    const few  = makeZone({ id: 'few',  warriors: 0,   archers: 0   });
    const many = makeZone({ id: 'many', warriors: 500, archers: 200 });
    const s = makeState({ zones: [few, many] });
    const result = selectWorldZones(s);
    const fewR  = result.find(z => z.id === 'few');
    const manyR = result.find(z => z.id === 'many');
    assert.ok(manyR && fewR, 'both zones should be in result');
    assert.ok(manyR.militaryRating > fewR.militaryRating,
      'more troops → higher militaryRating');
  });

  it('WS-1: neighbours array passed through', () => {
    const zone = makeZone({ neighbours: ['a', 'b', 'c'] });
    const s    = makeState({ zones: [zone] });
    const result = selectWorldZones(s);
    assert.deepEqual(result[0].neighbours, ['a', 'b', 'c']);
  });
});

// ─── selectFactions ────────────────────────────────────────────────────────────

describe('selectFactions', () => {
  it('WF-1: returns empty array when no factions', () => {
    const s = makeState({ factions: {} });
    const result = selectFactions(s);
    assert.deepEqual(result, []);
  });

  it('WF-1: returns faction with totalZones count', () => {
    const fac = makeFaction({ id: 'theWarlord' });
    const zones = [
      makeZone({ id: 'z1', liege: 'theWarlord', originalLiege: 'theWarlord' }),
      makeZone({ id: 'z2', liege: 'theWarlord', originalLiege: 'player' }),
      makeZone({ id: 'z3', liege: 'player',     originalLiege: 'player' }),
    ];
    const s = makeState({ factions: { theWarlord: fac }, zones });
    const result = selectFactions(s);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'theWarlord');
    assert.equal(result[0].totalZones, 2, 'should count zones where liege == factionId');
  });

  it('WF-1: totalWarriors/totalArchers sums over faction zones', () => {
    const fac = makeFaction({ id: 'theWarlord' });
    const zones = [
      makeZone({ id: 'z1', liege: 'theWarlord', warriors: 100, archers: 40 }),
      makeZone({ id: 'z2', liege: 'theWarlord', warriors: 50,  archers: 20 }),
      makeZone({ id: 'z3', liege: 'player',     warriors: 999, archers: 999 }),
    ];
    const s = makeState({ factions: { theWarlord: fac }, zones });
    const result = selectFactions(s);
    assert.equal(result[0].totalWarriors, 150);
    assert.equal(result[0].totalArchers,  60);
  });

  it('WF-2: wantToAttack is forwarded', () => {
    const fac = makeFaction({ wantToAttack: true });
    const s = makeState({ factions: { theWarlord: fac } });
    const result = selectFactions(s);
    assert.equal(result[0].wantToAttack, true);
  });

  it('WF-2: wantToAttack defaults to false', () => {
    const fac = makeFaction({ wantToAttack: false });
    const s = makeState({ factions: { theWarlord: fac } });
    const result = selectFactions(s);
    assert.equal(result[0].wantToAttack, false);
  });

  it('WF-1: aggression forwarded', () => {
    const fac = makeFaction({ aggression: 0.9 });
    const s = makeState({ factions: { theWarlord: fac } });
    const result = selectFactions(s);
    assert.equal(result[0].aggression, 0.9);
  });

  it('WF-1: multiple factions returned', () => {
    const facs = {
      theWarlord:   makeFaction({ id: 'theWarlord',   name: 'Warlord'   }),
      thePrincess:  makeFaction({ id: 'thePrincess',  name: 'Princess'  }),
      thePsychopath:makeFaction({ id: 'thePsychopath',name: 'Psychopath'}),
    };
    const s = makeState({ factions: facs });
    const result = selectFactions(s);
    assert.equal(result.length, 3);
    const ids = result.map(f => f.id).sort();
    assert.deepEqual(ids, ['thePrincess', 'thePsychopath', 'theWarlord']);
  });
});

// ─── selectQuests ──────────────────────────────────────────────────────────────

describe('selectQuests', () => {
  const STEPS_PER_DAY = BALANCE.engine.stepsPerDay;

  it('WQ-1: returns empty array when no quests', () => {
    const s = makeState({ quests: [] });
    assert.deepEqual(selectQuests(s), []);
  });

  it('WQ-1: daysLeft derived from curStep and deadlineStep', () => {
    const curStep     = 10000;
    const daysAhead   = 30;
    const deadlineStep = curStep + daysAhead * STEPS_PER_DAY;

    const quest = {
      id: 'quest_0',
      from: 'someZone',
      type: 'reinforcement',
      title: 'Test Quest',
      description: 'desc',
      req: { warriors: 5, archers: 3 },
      reward: { favour: 60 },
      deadlineStep,
    };

    const s = makeState({ quests: [quest], curStep });
    // Give player enough resources
    // @ts-ignore
    s.player.totWarriors = 10;
    // @ts-ignore
    s.player.totArchers  = 10;

    const result = selectQuests(s);
    assert.equal(result.length, 1);
    const q = result[0];
    assert.equal(q.id, 'quest_0');
    // daysLeft should be ~30 (allow ±1 rounding)
    assert.ok(q.daysLeft >= 29 && q.daysLeft <= 31,
      `daysLeft should be ~30, got ${q.daysLeft}`);
  });

  it('WQ-3: daysLeft = 0 when past deadline', () => {
    const quest = {
      id: 'quest_1',
      from: 'z1',
      type: 'reinforcement',
      title: 'Expired',
      description: '',
      req: { warriors: 1, archers: 1 },
      reward: { favour: 10 },
      deadlineStep: 500,
    };
    const s = makeState({ quests: [quest], curStep: 99999 });
    // @ts-ignore
    s.player.totWarriors = 10;
    // @ts-ignore
    s.player.totArchers  = 10;

    const result = selectQuests(s);
    assert.equal(result[0].daysLeft, 0, 'past-deadline quest should have daysLeft=0');
  });

  it('WQ-2: canAccept = true when player has enough warriors and archers', () => {
    const quest = {
      id: 'quest_2',
      from: 'z1',
      type: 'reinforcement',
      title: 'Send troops',
      description: '',
      req: { warriors: 5, archers: 3 },
      reward: { favour: 60 },
      deadlineStep: 99999,
    };
    const s = makeState({ quests: [quest], curStep: 0 });
    // @ts-ignore
    s.player.totWarriors = 10;
    // @ts-ignore
    s.player.totArchers  = 10;

    const result = selectQuests(s);
    assert.equal(result[0].canAccept, true, 'should be acceptable when player has enough troops');
  });

  it('WQ-2: canAccept = false when player lacks warriors', () => {
    const quest = {
      id: 'quest_3',
      from: 'z1',
      type: 'reinforcement',
      title: 'Send troops',
      description: '',
      req: { warriors: 20, archers: 3 },
      reward: { favour: 60 },
      deadlineStep: 99999,
    };
    const s = makeState({ quests: [quest], curStep: 0 });
    // @ts-ignore
    s.player.totWarriors = 5; // insufficient
    // @ts-ignore
    s.player.totArchers  = 10;

    const result = selectQuests(s);
    assert.equal(result[0].canAccept, false, 'should not be acceptable when player lacks warriors');
  });

  it('WQ-2: canAccept = false when player lacks archers', () => {
    const quest = {
      id: 'quest_4',
      from: 'z1',
      type: 'reinforcement',
      title: 'Send troops',
      description: '',
      req: { warriors: 5, archers: 20 },
      reward: { favour: 60 },
      deadlineStep: 99999,
    };
    const s = makeState({ quests: [quest], curStep: 0 });
    // @ts-ignore
    s.player.totWarriors = 10;
    // @ts-ignore
    s.player.totArchers  = 5; // insufficient

    const result = selectQuests(s);
    assert.equal(result[0].canAccept, false, 'should not be acceptable when player lacks archers');
  });

  it('WQ-2: canAccept = true when req is empty (no resources needed)', () => {
    const quest = {
      id: 'quest_5',
      from: 'z1',
      type: 'other',
      title: 'Free quest',
      description: '',
      req: {},
      reward: { gold: 100 },
      deadlineStep: 99999,
    };
    const s = makeState({ quests: [quest], curStep: 0 });
    const result = selectQuests(s);
    assert.equal(result[0].canAccept, true, 'empty req should always be canAccept=true');
  });

  it('WQ-1: fromName resolved from zone list', () => {
    const quest = {
      id: 'quest_6',
      from: 'myZone',
      type: 'reinforcement',
      title: 'Quest',
      description: '',
      req: {},
      reward: { favour: 60 },
      deadlineStep: 99999,
    };
    const zone = makeZone({ id: 'myZone', name: 'My Zone Name' });
    const s = makeState({ quests: [quest], zones: [zone], curStep: 0 });

    const result = selectQuests(s);
    assert.equal(result[0].fromName, 'My Zone Name', 'fromName should be zone name from zones list');
  });

  it('WQ-1: fromName falls back to zone id when zone not found', () => {
    const quest = {
      id: 'quest_7',
      from: 'unknownZone',
      type: 'reinforcement',
      title: 'Quest',
      description: '',
      req: {},
      reward: { favour: 60 },
      deadlineStep: 99999,
    };
    const s = makeState({ quests: [quest], zones: [], curStep: 0 });
    const result = selectQuests(s);
    assert.equal(result[0].fromName, 'unknownZone', 'fromName should fall back to zone id');
  });

  it('WQ-1: selectors are pure reads — no state mutation', () => {
    const quest = {
      id: 'quest_8',
      from: 'z1',
      type: 'reinforcement',
      title: 'Q',
      description: '',
      req: { warriors: 5, archers: 3 },
      reward: { favour: 60 },
      deadlineStep: 99999,
    };
    const s = makeState({ quests: [quest], curStep: 0 });
    // @ts-ignore
    s.player.totWarriors = 10;
    // @ts-ignore
    s.player.totArchers  = 10;

    const beforeQuestLen = (/** @type {any} */ (s.world)).quests.length;
    selectQuests(s);
    selectQuests(s);
    assert.equal((/** @type {any} */ (s.world)).quests.length, beforeQuestLen,
      'selectQuests must not mutate state.world.quests');
  });
});

// ─── selectWorldZones — economicRating for player zone ────────────────────────

describe('selectWorldZones — economicRating player zone', () => {
  it('WS-1: economicRating for player zone uses player.gold + inventory gold value', () => {
    const zone = makeZone({ id: 'hz', liege: 'player', originalLiege: 'player' });
    const s    = makeState({ zones: [zone] });
    // @ts-ignore
    s.player.gold = 500;
    // @ts-ignore
    s.player.inventory = {};

    const result = selectWorldZones(s);
    const z = result.find(r => r.id === 'hz');
    assert.ok(z, 'player zone should be in result');
    // economicRating >= player.gold (500) for player zone
    assert.ok(z.economicRating >= 500,
      `player zone economicRating (${z.economicRating}) should include player.gold (500)`);
  });
});
