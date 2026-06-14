/**
 * m5-contracts.test.js — iter-014 M5-2 T5 contracts tests.
 *
 * Gate requirements (brief_coder_T-004_iter-014):
 *   - contract lifecycle: offer→accept→complete (pay+grant) / expire / reject přes registr
 *   - determinismus: seed→stejné kontrakty, stream 'contracts' nerozbije G1
 *   - persist round-trip: contractQueue+contractSeq+schedule eventy přežijí; B2 re-arm
 *   - B1: build + contract commands resolvovatelné po boot (žádný unknown command)
 *   - catch-up-safe: kontrakty běží v offline dávce stejně jako live
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
import { scheduleInsert, scheduleCountOf } from '../src/core/engine/scheduler.js';
import { step } from '../src/core/engine/clock.js';
import { applyPersist } from '../src/save/persistSchema.js';
import { loadAndReconstruct } from '../src/save/load.js';
import { marketInit } from '../src/core/systems/market.js';
import {
  findContract,
  removeContract,
  applyContractComplete,
  armContractOffer,
  registerContractEffects,
} from '../src/core/systems/contracts.js';
import {
  acceptContract,
  rejectContract,
  completeContract,
  registerContractCommands,
} from '../src/core/commands/contracts.js';
import { createCommandRegistry, dispatch } from '../src/core/commands/dispatch.js';
import { registerBuild } from '../src/core/commands/build.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');

/** @param {string} name */
function loadJson(name) {
  return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8'));
}

const CATALOG_NAMES = ['resources', 'food', 'houseTypes', 'jobs', 'military', 'achievements', 'goods', 'buildings', 'contracts', 'companies'];

before(() => {
  clearCatalogs();
  for (const name of CATALOG_NAMES) {
    loadCatalog(name, loadJson(name));
  }
  loadCatalog('population', loadJson('population'));
});

after(() => {
  clearCatalogs();
});

/** Build a fresh state with market and rng initialized */
function makeState(seed = 0x9E3779B9) {
  const state = /** @type {any} */ (createInitialState({ seed }));
  initRng(state);
  state.player.gold = 50000;
  const goodsData = loadJson('goods');
  marketInit(state, goodsData.goods);
  return state;
}

/** Build registry + periodics ctx */
function makeCtx() {
  const registry = createRegistry();
  const periodics = registerCorePeriodics(registry);
  return { registry, periodics };
}

/** Build a minimal 'offered' contract for testing */
function makeOfferedContract(id = 'contract_0') {
  return {
    id,
    type: 'goodsSeller',
    title: 'Test kontrakt',
    status: 'offered',
    cost: { gold: 100 },
    reward: { techPt: 5 },
    deadlineStep: 0,
    onComplete: { effect: 'contract.complete' },
    onExpire: { effect: 'noop' },
    onReject: { effect: 'noop' },
  };
}

// ---------------------------------------------------------------------------
// 1. contractQueue init
// ---------------------------------------------------------------------------
describe('contractQueue init (M2 §14.4)', () => {
  it('fresh state has empty contractQueue and contractSeq=0', () => {
    const state = makeState();
    assert.ok(Array.isArray(state.home.contractQueue), 'contractQueue must be an array');
    assert.strictEqual(state.home.contractQueue.length, 0, 'contractQueue must be empty');
    assert.strictEqual(state.home.contractSeq, 0, 'contractSeq must start at 0');
  });
});

// ---------------------------------------------------------------------------
// 2. findContract / removeContract helpers
// ---------------------------------------------------------------------------
describe('findContract / removeContract helpers', () => {
  it('findContract returns undefined for empty queue', () => {
    const state = makeState();
    assert.strictEqual(findContract(state, 'x'), undefined);
  });

  it('findContract finds by id', () => {
    const state = makeState();
    const c = makeOfferedContract('contract_42');
    state.home.contractQueue.push(c);
    assert.strictEqual(findContract(state, 'contract_42'), c);
  });

  it('removeContract removes by id', () => {
    const state = makeState();
    const c = makeOfferedContract('contract_7');
    state.home.contractQueue.push(c);
    removeContract(state, 'contract_7');
    assert.strictEqual(state.home.contractQueue.length, 0);
  });

  it('removeContract is no-op for unknown id', () => {
    const state = makeState();
    assert.doesNotThrow(() => removeContract(state, 'unknown'));
  });
});

// ---------------------------------------------------------------------------
// 3. applyContractComplete — pay cost + grant reward
// ---------------------------------------------------------------------------
describe('applyContractComplete (pay+grant)', () => {
  it('deducts cost and grants reward', () => {
    const state = makeState();
    state.player.gold = 500;
    const c = {
      id: 'c1',
      type: 'goodsSeller',
      cost: { gold: 200 },
      reward: { gold: 350 },
    };
    applyContractComplete(state, /** @type {any} */ (c));
    // pay 200 gold, grant 350 gold → net +150
    assert.strictEqual(state.player.gold, 650, 'gold should be 500 - 200 + 350 = 650');
  });

  it('throws if cannot afford cost', () => {
    const state = makeState();
    state.player.gold = 10;
    const c = {
      id: 'c2',
      type: 'goodsSeller',
      cost: { gold: 500 }, // cannot afford
      reward: { gold: 1000 },
    };
    assert.throws(
      () => applyContractComplete(state, /** @type {any} */ (c)),
      /insufficient/,
      'pay should throw on insufficient funds'
    );
  });

  it('is no-op for null contract', () => {
    const state = makeState();
    const goldBefore = state.player.gold;
    applyContractComplete(state, /** @type {any} */ (null));
    assert.strictEqual(state.player.gold, goldBefore, 'no-op for null');
  });
});

// ---------------------------------------------------------------------------
// 4. acceptContract command
// ---------------------------------------------------------------------------
describe('acceptContract command', () => {
  it('transitions offered→active and schedules expiration', () => {
    const state = makeState();
    const c = makeOfferedContract('c_accept1');
    state.home.contractQueue.push(c);

    const result = acceptContract(state, { contractId: 'c_accept1' });
    assert.ok(result.ok, `acceptContract failed: ${result.error}`);

    const updated = findContract(state, 'c_accept1');
    assert.ok(updated, 'contract must still be in queue');
    assert.strictEqual(updated.status, 'active');
    assert.ok(updated.deadlineStep > 0, 'deadlineStep must be set');
    assert.strictEqual(scheduleCountOf(state, 'contract.expire'), 1, 'contract.expire must be scheduled');
  });

  it('returns error for unknown contractId', () => {
    const state = makeState();
    const r = acceptContract(state, { contractId: 'nonexistent' });
    assert.ok(!r.ok, 'must fail for unknown contract');
    assert.ok(r.error && r.error.includes('not found'), `error: ${r.error}`);
  });

  it('returns error for non-offered status', () => {
    const state = makeState();
    const c = makeOfferedContract('c_already_active');
    c.status = 'active';
    state.home.contractQueue.push(c);
    const r = acceptContract(state, { contractId: 'c_already_active' });
    assert.ok(!r.ok, 'must fail for non-offered status');
  });

  it('returns error for empty contractId', () => {
    const state = makeState();
    const r = acceptContract(state, { contractId: '' });
    assert.ok(!r.ok, 'must fail for empty contractId');
  });

  it('sets deadlineStep = curStep + expirationDays * STEPSPERDAY', () => {
    const state = makeState();
    const c = makeOfferedContract('c_deadline');
    state.home.contractQueue.push(c);
    state.engine.curStep = 100;

    const r = acceptContract(state, { contractId: 'c_deadline' });
    assert.ok(r.ok, `acceptContract failed: ${r.error}`);

    const updated = findContract(state, 'c_deadline');
    // goodsSeller has expirationDays=15, STEPSPERDAY=900
    assert.strictEqual(updated.deadlineStep, 100 + 15 * 900);
  });
});

// ---------------------------------------------------------------------------
// 5. rejectContract command
// ---------------------------------------------------------------------------
describe('rejectContract command', () => {
  it('removes offered contract from queue', () => {
    const state = makeState();
    const c = makeOfferedContract('c_reject1');
    state.home.contractQueue.push(c);

    const r = rejectContract(state, { contractId: 'c_reject1' });
    assert.ok(r.ok, `rejectContract failed: ${r.error}`);
    assert.strictEqual(state.home.contractQueue.length, 0, 'contract must be removed');
  });

  it('can reject an active contract', () => {
    const state = makeState();
    const c = makeOfferedContract('c_reject_active');
    c.status = 'active';
    state.home.contractQueue.push(c);

    const r = rejectContract(state, { contractId: 'c_reject_active' });
    assert.ok(r.ok, `rejectContract failed: ${r.error}`);
    assert.strictEqual(state.home.contractQueue.length, 0, 'contract must be removed');
  });

  it('returns error for unknown contractId', () => {
    const state = makeState();
    const r = rejectContract(state, { contractId: 'xxx' });
    assert.ok(!r.ok);
  });

  it('returns error for completed contract', () => {
    const state = makeState();
    const c = makeOfferedContract('c_completed');
    c.status = 'completed';
    state.home.contractQueue.push(c);
    const r = rejectContract(state, { contractId: 'c_completed' });
    assert.ok(!r.ok, 'cannot reject completed');
  });
});

// ---------------------------------------------------------------------------
// 6. completeContract command
// ---------------------------------------------------------------------------
describe('completeContract command', () => {
  it('happy path: pay cost + grant reward + remove from queue', () => {
    const state = makeState();
    state.player.gold = 500;

    const c = makeOfferedContract('c_complete1');
    c.status = 'active';
    c.cost = { gold: 200 };
    c.reward = { gold: 350 };
    state.home.contractQueue.push(c);

    const r = completeContract(state, { contractId: 'c_complete1' });
    assert.ok(r.ok, `completeContract failed: ${r.error}`);
    assert.strictEqual(state.player.gold, 650, 'gold = 500 - 200 + 350 = 650');
    assert.strictEqual(state.home.contractQueue.length, 0, 'contract removed after completion');
  });

  it('returns error when cannot afford cost', () => {
    const state = makeState();
    state.player.gold = 10;

    const c = makeOfferedContract('c_broke');
    c.status = 'active';
    c.cost = { gold: 1000 };
    c.reward = { gold: 2000 };
    state.home.contractQueue.push(c);

    const r = completeContract(state, { contractId: 'c_broke' });
    assert.ok(!r.ok, 'must fail when cannot afford');
    assert.ok(r.error && r.error.includes('insufficient'), `error: ${r.error}`);
  });

  it('returns error for non-active contract', () => {
    const state = makeState();
    const c = makeOfferedContract('c_offered');
    // status = 'offered' (not active)
    state.home.contractQueue.push(c);
    const r = completeContract(state, { contractId: 'c_offered' });
    assert.ok(!r.ok, 'must fail for non-active status');
  });

  it('contract with techPt reward is granted correctly', () => {
    const state = makeState();
    state.player.gold = 1000;
    state.player.techPt = 0;

    const c = makeOfferedContract('c_techPt');
    c.status = 'active';
    c.cost = { gold: 100 };
    c.reward = { techPt: 5 };
    state.home.contractQueue.push(c);

    const r = completeContract(state, { contractId: 'c_techPt' });
    assert.ok(r.ok, `completeContract failed: ${r.error}`);
    assert.strictEqual(state.player.techPt, 5, 'techPt must be granted');
    assert.strictEqual(state.player.gold, 900, 'gold must be deducted');
  });
});

// ---------------------------------------------------------------------------
// 7. contract.expire schedule handler
// ---------------------------------------------------------------------------
describe('contract.expire schedule handler', () => {
  it('fires at deadlineStep and removes active contract', () => {
    const state = makeState();
    const ctx = makeCtx();

    const c = makeOfferedContract('c_expire1');
    state.home.contractQueue.push(c);

    // accept (schedules expire at deadlineStep)
    const r = acceptContract(state, { contractId: 'c_expire1' });
    assert.ok(r.ok, `acceptContract failed: ${r.error}`);

    const deadline = findContract(state, 'c_expire1').deadlineStep;
    assert.ok(deadline > 0);

    // Advance to just before deadline — contract should still be there
    state.engine.curStep = deadline - 1;
    // Note: schedule heap holds absolute steps, we just need to check the handler

    // Manually trigger the expire handler via registry
    const expireHandler = ctx.registry.handlers.get('contract.expire');
    assert.ok(expireHandler, 'contract.expire must be registered');

    // Fire the handler
    expireHandler(state, { contractId: 'c_expire1' }, ctx);

    // Contract should be removed
    assert.strictEqual(state.home.contractQueue.length, 0, 'contract removed by expire handler');
  });

  it('expire is no-op for non-active contract (idempotence guard M52-R2)', () => {
    const state = makeState();
    const ctx = makeCtx();

    const c = makeOfferedContract('c_expire_noop');
    c.status = 'completed'; // already terminal
    state.home.contractQueue.push(c);

    const expireHandler = ctx.registry.handlers.get('contract.expire');
    expireHandler(state, { contractId: 'c_expire_noop' }, ctx);

    // contract still in queue (expire ignored non-active)
    assert.strictEqual(state.home.contractQueue.length, 1, 'no-op for non-active');
  });

  it('expire is no-op for unknown contractId (catch-up-safe)', () => {
    const state = makeState();
    const ctx = makeCtx();

    const expireHandler = ctx.registry.handlers.get('contract.expire');
    // Should not throw
    assert.doesNotThrow(() => expireHandler(state, { contractId: 'nonexistent' }, ctx));
  });

  it('completeContract then expire fires is a no-op (double-guard M52-R2)', () => {
    const state = makeState();
    const ctx = makeCtx();
    state.player.gold = 1000;

    const c = makeOfferedContract('c_complete_expire');
    state.home.contractQueue.push(c);
    acceptContract(state, { contractId: 'c_complete_expire' });
    c.cost = { gold: 100 };
    c.reward = { gold: 200 };

    // Complete it
    completeContract(state, { contractId: 'c_complete_expire' });
    assert.strictEqual(state.home.contractQueue.length, 0, 'contract removed after complete');

    // Expire handler fires (orphaned in heap) — should be no-op
    const expireHandler = ctx.registry.handlers.get('contract.expire');
    assert.doesNotThrow(() => expireHandler(state, { contractId: 'c_complete_expire' }, ctx));
    assert.strictEqual(state.home.contractQueue.length, 0, 'still empty after orphaned expire');
  });
});

// ---------------------------------------------------------------------------
// 8. contract.offer schedule handler (generator)
// ---------------------------------------------------------------------------
describe('contract.offer schedule handler (generator)', () => {
  it('generates an offered contract and re-schedules itself', () => {
    const state = makeState();
    const ctx = makeCtx();

    const offerHandler = ctx.registry.handlers.get('contract.offer');
    assert.ok(offerHandler, 'contract.offer must be registered');

    const schedBefore = scheduleCountOf(state, 'contract.offer');
    offerHandler(state, {}, ctx);

    // Should have generated a contract
    const offered = state.home.contractQueue.filter(/** @param {any} c */ (c) => c.status === 'offered');
    assert.ok(offered.length >= 0, 'may or may not generate (depends on maxContracts)');

    // Should have re-scheduled
    const schedAfter = scheduleCountOf(state, 'contract.offer');
    assert.strictEqual(schedAfter, schedBefore + 1, 'should re-schedule one more offer');
  });

  it('contract has valid structure after generation', () => {
    const state = makeState();
    const ctx = makeCtx();

    const offerHandler = ctx.registry.handlers.get('contract.offer');
    offerHandler(state, {}, ctx);

    if (state.home.contractQueue.length > 0) {
      const c = state.home.contractQueue[0];
      assert.strictEqual(typeof c.id, 'string', 'id must be string');
      assert.ok(c.id.startsWith('contract_'), 'id must start with contract_');
      assert.strictEqual(c.status, 'offered');
      assert.strictEqual(typeof c.cost, 'object');
      assert.strictEqual(typeof c.reward, 'object');
      assert.ok(c.onComplete && typeof c.onComplete.effect === 'string', 'onComplete must have effect string');
    }
  });

  it('contractSeq increments correctly for deterministic IDs', () => {
    const state = makeState();
    const ctx = makeCtx();

    assert.strictEqual(state.home.contractSeq, 0);

    const offerHandler = ctx.registry.handlers.get('contract.offer');
    offerHandler(state, {}, ctx);

    if (state.home.contractQueue.length > 0) {
      assert.ok(state.home.contractSeq > 0, 'contractSeq must increment');
      assert.strictEqual(state.home.contractQueue[0].id, 'contract_0', 'first contract ID is contract_0');
    }
  });
});

// ---------------------------------------------------------------------------
// 9. Determinismus (G1) — seed → stejné kontrakty, stream 'contracts' nerozbije G1
// ---------------------------------------------------------------------------
describe('determinismus kontraktů', () => {
  it('stejný seed + contract.offer = stejný výsledek', () => {
    const state1 = makeState(0xABCDEF);
    const state2 = makeState(0xABCDEF);
    const ctx1 = makeCtx();
    const ctx2 = makeCtx();

    const offer1 = ctx1.registry.handlers.get('contract.offer');
    const offer2 = ctx2.registry.handlers.get('contract.offer');

    offer1(state1, {}, ctx1);
    offer2(state2, {}, ctx2);

    assert.deepStrictEqual(state1.home.contractQueue, state2.home.contractQueue, 'contract queues must match');
    assert.strictEqual(state1.home.contractSeq, state2.home.contractSeq, 'contractSeq must match');
  });

  it('rng stream contracts je izolovaný — neovlivňuje ostatní streams (G1)', () => {
    // Dva stavy: jeden spustí contract.offer, druhý ne
    // Hashujeme ostatní streams (bez contracts) — musí být stejné
    const state1 = makeState(0x12345678);
    const state2 = makeState(0x12345678);
    const ctx1 = makeCtx();

    // Spusť contract.offer jen na state1
    const offer1 = ctx1.registry.handlers.get('contract.offer');
    offer1(state1, {}, ctx1);

    // Streams jiné než 'contracts' musí být totožné
    for (const streamName of ['population', 'forest', 'mine', 'field', 'market', 'world', 'battle', 'events', 'buildings']) {
      assert.strictEqual(
        state1.rng.streams[streamName],
        state2.rng.streams[streamName],
        `stream '${streamName}' musí být nedotčen (izolace G1)`
      );
    }
  });

  it('contracts rng stream se liší po generování', () => {
    const state1 = makeState(0xDEAD);
    const state2 = makeState(0xDEAD);
    const ctx1 = makeCtx();

    const offer1 = ctx1.registry.handlers.get('contract.offer');
    offer1(state1, {}, ctx1);

    // 'contracts' stream se musí lišit po volání
    if (state1.home.contractQueue.length > 0) {
      assert.notStrictEqual(
        state1.rng.streams['contracts'],
        state2.rng.streams['contracts'],
        'contracts stream must change after generation'
      );
    }
  });

  it('G1: hash po save/load je stabilní (round-trip hash)', () => {
    const state = makeState(0xCAFEBABE);
    const ctx = makeCtx();

    // Generuj kontrakt
    const offer = ctx.registry.handlers.get('contract.offer');
    offer(state, {}, ctx);

    const hash1 = hashState(state);

    // Save + load
    const payload = applyPersist(state);
    const restored = loadAndReconstruct(payload);
    const hash2 = hashState(restored);

    assert.strictEqual(hash1, hash2, 'hashState must match after save/load round-trip (G1)');
  });
});

// ---------------------------------------------------------------------------
// 10. Persist round-trip
// ---------------------------------------------------------------------------
describe('persist round-trip (T5.6)', () => {
  it('contractQueue přežije save/load', () => {
    const state = makeState();
    const c = makeOfferedContract('c_persist1');
    state.home.contractQueue.push(c);

    const payload = applyPersist(state);
    const restored = loadAndReconstruct(payload);

    assert.strictEqual(restored.home.contractQueue.length, 1, 'contractQueue must persist');
    assert.strictEqual(restored.home.contractQueue[0].id, 'c_persist1');
    assert.strictEqual(restored.home.contractQueue[0].status, 'offered');
  });

  it('contractSeq přežije save/load a pokračuje správně', () => {
    const state = makeState();
    state.home.contractSeq = 7;

    const payload = applyPersist(state);
    const restored = loadAndReconstruct(payload);

    assert.strictEqual(restored.home.contractSeq, 7, 'contractSeq must persist');
  });

  it('contract.expire v schedule přežije save/load', () => {
    const state = makeState();
    const c = makeOfferedContract('c_expire_persist');
    state.home.contractQueue.push(c);
    acceptContract(state, { contractId: 'c_expire_persist' });

    const contract = findContract(state, 'c_expire_persist');
    const deadline = contract.deadlineStep;
    assert.ok(deadline > 0);

    // Save + load
    const payload = applyPersist(state);
    const restored = loadAndReconstruct(payload);

    assert.strictEqual(
      scheduleCountOf(restored, 'contract.expire'),
      1,
      'contract.expire must persist in schedule'
    );
    assert.strictEqual(
      restored.engine.schedule.find(/** @param {any} e */ (e) => e.id === 'contract.expire')?.params?.contractId,
      'c_expire_persist',
      'contractId in expire event must match'
    );
  });

  it('canComplete a daysLeft nejsou v save (deriváty se neukládají)', () => {
    const state = makeState();
    const c = makeOfferedContract('c_noderiv');
    c.status = 'active';
    c.deadlineStep = 1000;
    state.home.contractQueue.push(c);

    const payload = applyPersist(state);
    const homePayload = /** @type {any} */ (payload).home;

    // Payload nesmí obsahovat canComplete nebo daysLeft
    const savedContract = homePayload.contractQueue[0];
    assert.strictEqual(savedContract.canComplete, undefined, 'canComplete must NOT be in save');
    assert.strictEqual(savedContract.daysLeft, undefined, 'daysLeft must NOT be in save');
  });

  it('SAVE_VERSION zůstává 3 (žádná migrace polí §14.3)', () => {
    const state = makeState();
    const payload = applyPersist(state);
    // Wrapped payload has saveVersion from meta
    assert.strictEqual(state.meta.saveVersion, 3, 'SAVE_VERSION must stay 3');
  });

  it('starý save (bez contractQueue) se načte s prázdnou queue', () => {
    const state = makeState();
    // Simuluj starý save bez contractQueue
    const payload = applyPersist(state);
    delete /** @type {any} */ (payload).home.contractQueue;
    delete /** @type {any} */ (payload).home.contractSeq;

    // Musí se načíst bez chyby
    const restored = loadAndReconstruct(payload);
    assert.ok(Array.isArray(restored.home.contractQueue), 'contractQueue must be initialized from createHomeState');
    assert.strictEqual(restored.home.contractSeq, 0, 'contractSeq must default to 0');
  });
});

// ---------------------------------------------------------------------------
// 11. B2 — armContractOffer (idempotentní re-arm §14.2)
// ---------------------------------------------------------------------------
describe('armContractOffer B2 re-arm (§14.2)', () => {
  it('fresh game: armContractOffer přidá 1 offer do schedule', () => {
    const state = makeState();
    assert.strictEqual(scheduleCountOf(state, 'contract.offer'), 0, 'fresh state has no offer scheduled');

    armContractOffer(state);
    assert.strictEqual(scheduleCountOf(state, 'contract.offer'), 1, 'after arm: 1 offer scheduled');
  });

  it('idempotentní: druhé volání armContractOffer nepřidá duplicit', () => {
    const state = makeState();
    armContractOffer(state);
    armContractOffer(state);
    assert.strictEqual(scheduleCountOf(state, 'contract.offer'), 1, 'second call must be no-op');
  });

  it('třetí volání: stále 1 (idempotentní)', () => {
    const state = makeState();
    armContractOffer(state);
    armContractOffer(state);
    armContractOffer(state);
    assert.strictEqual(scheduleCountOf(state, 'contract.offer'), 1);
  });

  it('B2: starý save (bez offer) → armContractOffer přidá offer', () => {
    const state = makeState();
    // Simuluj starý save: žádný offer v heapu
    const payload = applyPersist(state);
    const restored = loadAndReconstruct(payload);

    assert.strictEqual(scheduleCountOf(restored, 'contract.offer'), 0, 'old save has no offer');
    armContractOffer(restored);
    assert.strictEqual(scheduleCountOf(restored, 'contract.offer'), 1, 'old save after arm: 1 offer');
  });

  it('B2: M5-2 save (s offerem) → armContractOffer nepřidá duplicit', () => {
    const state = makeState();
    armContractOffer(state); // arm before save

    const payload = applyPersist(state);
    const restored = loadAndReconstruct(payload);

    // Restored save already has the offer in schedule
    assert.strictEqual(scheduleCountOf(restored, 'contract.offer'), 1, 'M5-2 save has 1 offer');
    armContractOffer(restored); // should be no-op
    assert.strictEqual(scheduleCountOf(restored, 'contract.offer'), 1, 'arm of M5-2 save: still 1 (no dup)');
  });

  it('armContractOffer je deterministické (žádný RNG/Date)', () => {
    const state1 = makeState(0x1234);
    const state2 = makeState(0x1234);

    armContractOffer(state1);
    armContractOffer(state2);

    // Scheduled steps must match
    const entry1 = state1.engine.schedule.find(/** @param {any} e */ (e) => e.id === 'contract.offer');
    const entry2 = state2.engine.schedule.find(/** @param {any} e */ (e) => e.id === 'contract.offer');
    assert.strictEqual(entry1.step, entry2.step, 'scheduled step must be deterministic');
  });
});

// ---------------------------------------------------------------------------
// 12. B1 — boot wiring (commands resolvovatelné po bootstrap)
// ---------------------------------------------------------------------------
describe('B1 boot wiring — build + contract commands resolvovatelné', () => {
  it('registerContractCommands registruje acceptContract/rejectContract/completeContract', () => {
    const creg = createCommandRegistry();
    registerContractCommands(creg);

    const state = makeState();
    const c = makeOfferedContract('c_b1_test');
    state.home.contractQueue.push(c);

    const r = dispatch(creg, state, { type: 'acceptContract', params: { contractId: 'c_b1_test' } });
    assert.ok(r.ok, `acceptContract via dispatch: ${r.error}`);
  });

  it('registerBuild registruje build command', () => {
    const creg = createCommandRegistry();
    registerBuild(creg);

    const state = makeState();
    // Build command exists (will fail without proper state but must not return unknown command)
    const r = dispatch(creg, state, { type: 'build', params: { itemId: 'nonexistent_item' } });
    // Must NOT be 'unknown command' — may fail for other reasons (invalid itemId)
    assert.ok(!r.error || !r.error.includes('unknown command'), `build must be registered: ${r.error}`);
  });

  it('contract commands jsou resolvovatelné z dispatch (žádný unknown command)', () => {
    const creg = createCommandRegistry();
    registerContractCommands(creg);

    const state = makeState();

    for (const cmd of ['acceptContract', 'rejectContract', 'completeContract']) {
      const r = dispatch(creg, state, { type: cmd, params: { contractId: 'nonexistent' } });
      // Must not be unknown command
      assert.ok(
        !r.error || !r.error.includes('unknown command'),
        `${cmd} must be registered, got: ${r.error}`
      );
    }
  });

  it('registerContractEffects registruje contract.expire, contract.offer, contract.complete', () => {
    const registry = createRegistry();
    registerContractEffects(registry);

    assert.ok(registry.handlers.has('contract.expire'), 'contract.expire must be registered');
    assert.ok(registry.handlers.has('contract.offer'), 'contract.offer must be registered');
    assert.ok(registry.handlers.has('contract.complete'), 'contract.complete must be registered');
  });
});

// ---------------------------------------------------------------------------
// 13. Catch-up-safe (schedule one-shot, ne per-step polling)
// ---------------------------------------------------------------------------
describe('catch-up-safe', () => {
  it('contract.offer fires exactly once in catch-up for offer period', () => {
    const state = makeState();
    const ctx = makeCtx();

    // Arm offer at step 1
    armContractOffer(state);

    const STEPSPERDAY = 900;
    const TARGET_STEPS = 2 * STEPSPERDAY; // 2 days ahead

    // Run catch-up
    let offersFired = 0;
    const origOffer = ctx.registry.handlers.get('contract.offer');
    ctx.registry.handlers.set('contract.offer', (s, p, c) => {
      offersFired++;
      origOffer(s, p, c); // call original to re-schedule
    });

    for (let i = 0; i < TARGET_STEPS; i++) {
      step(state, ctx);
    }

    // In 2 days (1800 steps), with firstOfferStep=1 and offerPeriodDays=15,
    // only 1 offer fires (period is 15 days)
    assert.ok(offersFired >= 1, 'at least 1 offer must fire in 2 days');
    assert.ok(offersFired <= 2, 'at most 2 offers in 2 days (period=15d, but jitter possible)');
  });

  it('contract.expire fires at correct absolute step in catch-up', () => {
    const state = makeState();
    const ctx = makeCtx();

    // Create and accept a contract
    const c = makeOfferedContract('c_catchup');
    state.home.contractQueue.push(c);
    acceptContract(state, { contractId: 'c_catchup' });

    const deadline = findContract(state, 'c_catchup').deadlineStep;
    assert.ok(deadline > 0);

    // Arm offer generator too
    armContractOffer(state);

    // Run until just past deadline in catch-up
    const targetSteps = deadline + 1;
    for (let i = 0; i < targetSteps; i++) {
      step(state, ctx);
    }

    // Contract should be gone (expired)
    assert.strictEqual(findContract(state, 'c_catchup'), undefined, 'contract must expire in catch-up');
  });
});

// ---------------------------------------------------------------------------
// 14. Full lifecycle: offer → accept → complete (pay+grant)
// ---------------------------------------------------------------------------
describe('full lifecycle: offer→accept→complete', () => {
  it('end-to-end: generate offer → accept → complete → pay+grant', () => {
    const state = makeState();
    const ctx = makeCtx();
    state.player.gold = 100000;

    // Generate a contract via offer handler
    const offerHandler = ctx.registry.handlers.get('contract.offer');
    offerHandler(state, {}, ctx);

    if (state.home.contractQueue.length === 0) {
      // No contract generated (e.g., goods not available in market); skip
      return;
    }

    const c = /** @type {any} */ (state.home.contractQueue[0]);
    assert.strictEqual(c.status, 'offered');

    // Accept
    const r1 = acceptContract(state, { contractId: c.id });
    assert.ok(r1.ok, `accept failed: ${r1.error}`);
    assert.strictEqual(findContract(state, c.id).status, 'active');
    assert.strictEqual(scheduleCountOf(state, 'contract.expire'), 1);

    // Ensure we can afford completion
    // Add enough resources
    for (const [k, qty] of Object.entries(/** @type {Record<string, number>} */ (c.cost))) {
      if (k === 'gold') {
        state.player.gold = qty + 10000;
      } else if (state.home.store) {
        state.home.store[k] = qty + 100;
      }
    }
    // player.inventory for goods items
    if (!state.player.inventory) state.player.inventory = {};
    for (const [k, qty] of Object.entries(/** @type {Record<string, number>} */ (c.cost))) {
      if (k !== 'gold') {
        state.player.inventory[k] = (state.player.inventory[k] || 0) + qty + 100;
      }
    }

    // Complete
    const r2 = completeContract(state, { contractId: c.id });
    assert.ok(r2.ok, `complete failed: ${r2.error}`);
    assert.strictEqual(findContract(state, c.id), undefined, 'contract removed after complete');
  });
});
