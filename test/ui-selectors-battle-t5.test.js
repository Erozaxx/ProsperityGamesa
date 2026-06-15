/**
 * M7b T5 — UI selector tests for selectBattle (iter-018).
 *
 * Gate requirements (brief_coder_T-007_iter-018):
 *   SB-1  No active battle → active=false, empty defaults
 *   SB-2  Active battle → active=true, units mapped correctly
 *   SB-3  Actions available iff cd===0 && number>0 && state==='running'
 *   SB-4  Actions disabled on cooldown (cd>0)
 *   SB-5  Actions disabled when no units (number=0)
 *   SB-6  cdPct derived from cd/lastMaxCD*100
 *   SB-7  log: ring-buffer slice (max 30, newest first from bs.log[0])
 *   SB-8  progressPct: casualties fraction of total starting units
 *   SB-9  summary forwarded when battle is done
 *   SB-10 selector is pure (repeated calls same result, no mutation)
 *   SB-11 warrior actions: charge, shieldWall, flank (side='warriors')
 *   SB-12 archer actions: volley, fireArrows (side='archers')
 *   SB-13 battle state 'done' — available=false for all actions
 *   SB-14 state.battle=null → active=false (safe)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { selectBattle } from '../src/ui/selectors.js';

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** Minimal Unit object */
function makeUnit({ number = 100, startingNumber = 100, casualties = 0, cd = 0, lastMaxCD = 80, type = 'warriors' } = {}) {
  return { number, startingNumber, casualties, cd, lastMaxCD, type,
           strength: 2, defense: 2, critChance: 0.1, lastAttackId: null };
}

/** Minimal Side object */
function makeSide({ liege = 'player', action = 'Defending', warriors, archers, number } = {}) {
  const w = warriors ?? makeUnit({ type: 'warriors' });
  const a = archers  ?? makeUnit({ type: 'archers', cd: 0, lastMaxCD: 120 });
  return {
    liege, action,
    warriors: w,
    archers:  a,
    number: number ?? (w.number + a.number),
  };
}

/** Minimal BattleState */
function makeBattleState({
  state = 'running',
  zoneId = 'zone1',
  tick = 0,
  reaction = 60,
  subAccMs = 0,
  queue = [],
  log = [],
  summary = null,
  player,
  opponent,
} = {}) {
  return {
    zoneId,
    sides: {
      player:   player   ?? makeSide({ liege: 'player',   action: 'Defending' }),
      opponent: opponent ?? makeSide({ liege: 'theWarlord', action: 'Attacking' }),
    },
    state,
    tick,
    reaction,
    subAccMs,
    queue,
    log,
    summary,
    startedAtStep: 0,
    attackerSide: 'opponent',
    banditLoot: null,
    meta: { attackerId: 'theWarlord', targetZoneId: 'zone1', isBandit: false },
  };
}

/** Create state with injected battle */
function makeState(battleState = null) {
  const s = /** @type {any} */ (createInitialState());
  s.battle = battleState;
  return s;
}

// ─── Tests ───────────────────────────────────────────────────────────────────────

describe('selectBattle — no active battle', () => {
  it('SB-1a: state.battle=null → active=false', () => {
    const s = makeState(null);
    const v = selectBattle(s);
    assert.equal(v.active, false);
    assert.equal(v.state, null);
    assert.equal(v.zoneId, null);
    assert.equal(v.player, null);
    assert.equal(v.opponent, null);
    assert.deepEqual(v.actions, []);
    assert.deepEqual(v.log, []);
    assert.equal(v.progressPct, 0);
    assert.equal(v.summary, null);
  });

  it('SB-1b: state.battle=undefined → active=false', () => {
    const s = makeState(undefined);
    const v = selectBattle(s);
    assert.equal(v.active, false);
  });
});

describe('selectBattle — active battle units', () => {
  it('SB-2: active battle → active=true, sides mapped', () => {
    const bs = makeBattleState();
    const s = makeState(bs);
    const v = selectBattle(s);
    assert.equal(v.active, true);
    assert.equal(v.state, 'running');
    assert.equal(v.zoneId, 'zone1');
    assert.ok(v.player !== null, 'player side must be mapped');
    assert.ok(v.opponent !== null, 'opponent side must be mapped');
  });

  it('SB-2b: unit numbers mapped correctly', () => {
    const playerSide = makeSide({
      warriors: makeUnit({ number: 80, startingNumber: 100, casualties: 20, cd: 0 }),
      archers:  makeUnit({ number: 50, startingNumber: 60,  casualties: 10, cd: 30, lastMaxCD: 120, type: 'archers' }),
    });
    const bs = makeBattleState({ player: playerSide });
    const v = selectBattle(makeState(bs));
    assert.equal(v.player?.warriors.number, 80);
    assert.equal(v.player?.warriors.startingNumber, 100);
    assert.equal(v.player?.warriors.casualties, 20);
    assert.equal(v.player?.archers.number, 50);
    assert.equal(v.player?.archers.cd, 30);
    assert.equal(v.player?.archers.lastMaxCD, 120);
  });
});

describe('selectBattle — action availability (SB-3/4/5/6)', () => {
  it('SB-3: all actions available when cd=0 && number>0 && state=running', () => {
    const player = makeSide({
      warriors: makeUnit({ number: 100, cd: 0, lastMaxCD: 80 }),
      archers:  makeUnit({ number: 50,  cd: 0, lastMaxCD: 120, type: 'archers' }),
    });
    const v = selectBattle(makeState(makeBattleState({ player, state: 'running' })));
    for (const a of v.actions) {
      assert.equal(a.available, true, `${a.id} should be available`);
    }
  });

  it('SB-4: warrior actions disabled when warriors cd>0', () => {
    const player = makeSide({
      warriors: makeUnit({ number: 100, cd: 40, lastMaxCD: 80 }),
      archers:  makeUnit({ number: 50,  cd: 0,  lastMaxCD: 120, type: 'archers' }),
    });
    const v = selectBattle(makeState(makeBattleState({ player, state: 'running' })));
    const warriorActions = v.actions.filter(a => a.side === 'warriors');
    const archerActions  = v.actions.filter(a => a.side === 'archers');
    for (const a of warriorActions) {
      assert.equal(a.available, false, `warrior action ${a.id} should be disabled (cd>0)`);
    }
    for (const a of archerActions) {
      assert.equal(a.available, true, `archer action ${a.id} should be available (cd=0)`);
    }
  });

  it('SB-5: actions disabled when unit number=0', () => {
    const player = makeSide({
      warriors: makeUnit({ number: 0,   cd: 0, lastMaxCD: 80 }),
      archers:  makeUnit({ number: 100, cd: 0, lastMaxCD: 120, type: 'archers' }),
    });
    const v = selectBattle(makeState(makeBattleState({ player, state: 'running' })));
    const warriorActions = v.actions.filter(a => a.side === 'warriors');
    for (const a of warriorActions) {
      assert.equal(a.available, false, `warrior action ${a.id} should be disabled (number=0)`);
    }
  });

  it('SB-6: cdPct derived from cd/lastMaxCD*100', () => {
    const player = makeSide({
      warriors: makeUnit({ number: 100, cd: 40, lastMaxCD: 80 }),
      archers:  makeUnit({ number: 50,  cd: 60, lastMaxCD: 120, type: 'archers' }),
    });
    const v = selectBattle(makeState(makeBattleState({ player, state: 'running' })));
    // charge (warriors): cd=40, lastMaxCD=80 → cdPct = round(40/80*100) = 50
    const charge = v.actions.find(a => a.id === 'charge');
    assert.ok(charge, 'charge action should exist');
    assert.equal(charge.cdPct, 50, 'charge cdPct should be 50 (=40/80*100)');
    // volley (archers): cd=60, lastMaxCD=120 → cdPct = round(60/120*100) = 50
    const volley = v.actions.find(a => a.id === 'volley');
    assert.ok(volley, 'volley action should exist');
    assert.equal(volley.cdPct, 50, 'volley cdPct should be 50 (=60/120*100)');
  });

  it('SB-6b: cdPct=0 when lastMaxCD=0 (edge case)', () => {
    const player = makeSide({
      warriors: makeUnit({ number: 100, cd: 0, lastMaxCD: 0 }),
      archers:  makeUnit({ number: 50,  cd: 0, lastMaxCD: 0, type: 'archers' }),
    });
    const v = selectBattle(makeState(makeBattleState({ player, state: 'running' })));
    for (const a of v.actions) {
      assert.equal(a.cdPct, 0, `${a.id} cdPct should be 0 when lastMaxCD=0`);
    }
  });
});

describe('selectBattle — log (SB-7)', () => {
  it('SB-7a: log forwarded from bs.log', () => {
    const log = [
      ['Charge! Válečníci zaútočili.', 'player'],
      ['Obránci drží pozici.', 'opponent'],
    ];
    const v = selectBattle(makeState(makeBattleState({ log })));
    assert.equal(v.log.length, 2);
    assert.deepEqual(v.log[0], log[0]);
  });

  it('SB-7b: log capped at 30 entries', () => {
    const log = Array.from({ length: 50 }, (_, i) => [`Zpráva ${i}`, null]);
    const v = selectBattle(makeState(makeBattleState({ log })));
    assert.equal(v.log.length, 30, 'log should be capped at 30 entries');
  });

  it('SB-7c: empty log when no battle', () => {
    const v = selectBattle(makeState(null));
    assert.deepEqual(v.log, []);
  });
});

describe('selectBattle — progressPct (SB-8)', () => {
  it('SB-8a: progressPct=0 with no casualties', () => {
    const player = makeSide({
      warriors: makeUnit({ number: 100, startingNumber: 100, casualties: 0 }),
      archers:  makeUnit({ number: 50,  startingNumber: 50,  casualties: 0, type: 'archers' }),
    });
    const opponent = makeSide({
      warriors: makeUnit({ number: 80, startingNumber: 80, casualties: 0 }),
      archers:  makeUnit({ number: 40, startingNumber: 40, casualties: 0, type: 'archers' }),
    });
    const v = selectBattle(makeState(makeBattleState({ player, opponent })));
    assert.equal(v.progressPct, 0, 'no casualties → progressPct=0');
  });

  it('SB-8b: progressPct derived from casualties/total starting', () => {
    // Total starting = 100+50+80+40 = 270, alive = 50+50+80+40 = 220, dead = 50
    // progressPct = round(50/270*100) = round(18.5) = 19
    const player = makeSide({
      warriors: makeUnit({ number: 50, startingNumber: 100 }),   // 50 dead
      archers:  makeUnit({ number: 50, startingNumber: 50,  type: 'archers' }),
    });
    const opponent = makeSide({
      warriors: makeUnit({ number: 80, startingNumber: 80 }),
      archers:  makeUnit({ number: 40, startingNumber: 40,  type: 'archers' }),
    });
    const v = selectBattle(makeState(makeBattleState({ player, opponent })));
    // totalStart=270, alive=220, dead=50
    const expected = Math.min(100, Math.round((50 / 270) * 100));
    assert.equal(v.progressPct, expected, `progressPct should be ${expected}`);
  });

  it('SB-8c: progressPct=100 when all starting units dead', () => {
    const player = makeSide({
      warriors: makeUnit({ number: 0, startingNumber: 100 }),
      archers:  makeUnit({ number: 0, startingNumber: 50,  type: 'archers' }),
    });
    const opponent = makeSide({
      warriors: makeUnit({ number: 0, startingNumber: 80 }),
      archers:  makeUnit({ number: 0, startingNumber: 40,  type: 'archers' }),
    });
    const v = selectBattle(makeState(makeBattleState({ player, opponent })));
    assert.equal(v.progressPct, 100, 'all dead → progressPct=100');
  });
});

describe('selectBattle — summary + done state (SB-9/13)', () => {
  it('SB-9: summary forwarded when battle done', () => {
    const summary = {
      winner: 'player',
      p_warriors: { kills: 20, casualties: 5 },
      p_archers:  { kills: 10, casualties: 3 },
      o_warriors: { kills: 0,  casualties: 15 },
      o_archers:  { kills: 0,  casualties: 5  },
    };
    const v = selectBattle(makeState(makeBattleState({ state: 'done', summary })));
    assert.deepEqual(v.summary, summary);
    assert.equal(v.state, 'done');
  });

  it('SB-13: all actions unavailable when state=done', () => {
    const player = makeSide({
      warriors: makeUnit({ number: 100, cd: 0, lastMaxCD: 80 }),
      archers:  makeUnit({ number: 50,  cd: 0, lastMaxCD: 120, type: 'archers' }),
    });
    const v = selectBattle(makeState(makeBattleState({ player, state: 'done' })));
    for (const a of v.actions) {
      assert.equal(a.available, false, `${a.id} should be unavailable when state=done`);
    }
  });
});

describe('selectBattle — action catalog (SB-11/12)', () => {
  it('SB-11: warrior actions are charge, shieldWall, flank', () => {
    const v = selectBattle(makeState(makeBattleState()));
    const warriorIds = v.actions.filter(a => a.side === 'warriors').map(a => a.id);
    assert.deepEqual(warriorIds.sort(), ['charge', 'flank', 'shieldWall'].sort());
  });

  it('SB-12: archer actions are volley, fireArrows', () => {
    const v = selectBattle(makeState(makeBattleState()));
    const archerIds = v.actions.filter(a => a.side === 'archers').map(a => a.id);
    assert.deepEqual(archerIds.sort(), ['fireArrows', 'volley'].sort());
  });

  it('total 5 actions returned (3 warrior + 2 archer)', () => {
    const v = selectBattle(makeState(makeBattleState()));
    assert.equal(v.actions.length, 5, 'should have exactly 5 actions');
  });
});

describe('selectBattle — purity (SB-10)', () => {
  it('SB-10a: repeated calls return same result (pure)', () => {
    const s = makeState(makeBattleState());
    const v1 = selectBattle(s);
    const v2 = selectBattle(s);
    assert.deepEqual(v1, v2, 'selectBattle must be pure — same result on repeated calls');
  });

  it('SB-10b: does not mutate state.battle', () => {
    const bs = makeBattleState();
    const s = makeState(bs);
    const tickBefore = bs.tick;
    selectBattle(s);
    assert.equal(s.battle?.tick, tickBefore, 'selectBattle must not mutate state.battle');
  });

  it('SB-10c: does not mutate battle log array', () => {
    const log = [['Útok!', 'player']];
    const bs = makeBattleState({ log });
    const s = makeState(bs);
    selectBattle(s);
    assert.equal(bs.log.length, 1, 'original log must not be modified by selector');
  });
});
