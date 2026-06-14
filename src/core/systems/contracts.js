/**
 * Contract system: lifecycle, generátor, efekty, re-arm.
 * iter-014 M5-2 T5.
 *
 * Design: design_iter-014.md §2-§6, §14. Source of truth.
 *
 * Invariants (tvrdé):
 * - Žádný Date.now / Math.random — veškerý RNG přes makeRng(state,'contracts')
 * - Žádný DOM / UI v core
 * - deadlineStep je absolutní herní krok (deterministické, přežije save/load)
 * - contract.id = 'contract_' + contractSeq (monotónní čítač, ne Date)
 * - Životní cyklus přes registr efektů K14 (string-ID v datech)
 * - Expirace + generování = schedule one-shot (K17, serializovatelné, catch-up-safe)
 *
 * @module contracts
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('../state/types.js').TickContext} TickContext
 * @typedef {import('../registry/registry.js').Registry} Registry
 */

import { register } from '../registry/registry.js';
import { scheduleInsert, scheduleCountOf } from '../engine/scheduler.js';
import { makeRng } from '../engine/rng.js';
import { getCatalog, hasCatalog } from '../catalog/index.js';
import { getGoldValue } from './market.js';
import { canAfford, pay, grant } from '../resources/transactions.js';
import { BALANCE } from '../balance/balance.js';

const BAL = /** @type {any} */ (BALANCE).contracts;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Find a contract by ID in the queue.
 * @param {GameState} state
 * @param {string} contractId
 * @returns {Record<string, any> | undefined}
 */
export function findContract(state, contractId) {
  const home = /** @type {any} */ (state.home);
  const queue = home.contractQueue;
  if (!Array.isArray(queue)) return undefined;
  return queue.find(/** @param {any} c */ (c) => c.id === contractId);
}

/**
 * Remove a contract from the queue by ID (splice).
 * home.js:2464 ekvivalent.
 * @param {GameState} state
 * @param {string} contractId
 * @returns {void}
 */
export function removeContract(state, contractId) {
  const home = /** @type {any} */ (state.home);
  const queue = home.contractQueue;
  if (!Array.isArray(queue)) return;
  const idx = queue.findIndex(/** @param {any} c */ (c) => c.id === contractId);
  if (idx !== -1) queue.splice(idx, 1);
}

/**
 * Count contracts in 'offered' or 'active' status.
 * @param {GameState} state
 * @returns {number}
 */
function countActiveOrOffered(state) {
  const home = /** @type {any} */ (state.home);
  const queue = home.contractQueue;
  if (!Array.isArray(queue)) return 0;
  return queue.filter(/** @param {any} c */ (c) => c.status === 'offered' || c.status === 'active').length;
}

// ---------------------------------------------------------------------------
// Generic completion logic (applyContractComplete)
// K14 design §6.1: command nemá ctx/registry → completion přes import, ne runtime registry.
// string-ID v onComplete zůstává v datech (K14 marker); command volá tuto fn přímo.
// ---------------------------------------------------------------------------

/**
 * Apply contract completion: pay(cost) + grant(reward).
 * Called directly by completeContract command (command vrstva nemá ctx/registry).
 * home.js:2455-2457 ekvivalent.
 * G-BUILD-TXAUDIT: bez ctx → audit skip; gold/goods se mění správně (stejné rozhodnutí jako M5-1).
 * @param {GameState} state
 * @param {Record<string, any>} contract
 * @returns {void}
 */
export function applyContractComplete(state, contract) {
  if (!contract) return;
  // Atomická operace: canAfford guard je v calleru (completeContract command)
  // pay hází pokud nelze zaplatit → double-guard (home.js:2455 ekvivalent)
  pay(state, contract.cost, 'contract:' + contract.id);
  grant(state, contract.reward, 'contract:' + contract.id);
}

// ---------------------------------------------------------------------------
// resolveEffect — string-ID dispatch pro schedule handlery (mají ctx/registry)
// §4.3 design: schedule handlery (expire/offer) ctx MAJÍ; command vrstva NE.
// ---------------------------------------------------------------------------

/**
 * Resolve and call an effect by string-ID from registry.
 * Used in schedule handlers (which have ctx with registry).
 * @param {Registry} registry
 * @param {{ effect: string, [key: string]: unknown } | null | undefined} effectData
 * @param {GameState} state
 * @param {Record<string, unknown>} extraParams
 * @param {TickContext} ctx
 * @returns {void}
 */
function resolveEffect(registry, effectData, state, extraParams, ctx) {
  if (!effectData || !effectData.effect) return;
  const { effect, ...params } = effectData;
  // Dynamically import resolve to avoid circular dep via index.js
  const handler = registry.handlers.get(effect);
  if (handler) {
    handler(state, { ...params, ...extraParams }, ctx);
  }
  // If not found: noop (catch-up-safe — missing effect on terminál event is silent)
}

// ---------------------------------------------------------------------------
// Schedule handlers
// ---------------------------------------------------------------------------

/**
 * Handler: contract.expire — fires at deadlineStep for an 'active' contract.
 * Schedule one-shot, registered via registerContractEffects.
 * Idempotentní: no-op pokud kontrakt neexistuje nebo není 'active' (K17, M52-R2).
 * @param {GameState} state
 * @param {{ contractId?: unknown }} params
 * @param {TickContext} ctx
 * @returns {void}
 */
function contractExpire(state, params, ctx) {
  const contractId = /** @type {string} */ (params.contractId);
  if (!contractId) return;
  const c = findContract(state, contractId);
  if (!c || c.status !== 'active') return; // idempotentní no-op (guard M52-R2)
  c.status = 'expired';
  resolveEffect(ctx.registry, c.onExpire, state, { contractId: c.id }, ctx);
  removeContract(state, c.id);
}

/**
 * Handler: contract.offer — periodický generátor nabídek.
 * Schedule one-shot re-schedulující se (M52-D5, §5.1).
 * Catch-up-safe: schedule one-shot → odpálí se přesně tolikrát, kolikrát má.
 * @param {GameState} state
 * @param {object} _params
 * @param {TickContext} ctx
 * @returns {void}
 */
function contractOffer(state, _params, ctx) {
  void ctx; // ctx retained for registry resolve in future M6+ effects
  const rng = makeRng(state, /** @type {any} */ ('contracts'));

  // 1. Kapacita: generuj kontrakt pokud pod limitem
  if (countActiveOrOffered(state) < BAL.maxContracts) {
    const contract = buildContractInstance(state, rng);
    if (contract) {
      const home = /** @type {any} */ (state.home);
      home.contractQueue.push(contract);
    }
  }

  // 2. Re-schedule sebe sama (perioda s jitterem přes rng stream 'contracts')
  const jitter = Math.round((rng.next() * 2 - 1) * BAL.offerJitterDays * BALANCE.engine.stepsPerDay);
  const nextStep = state.engine.curStep + Math.max(1, BAL.offerPeriodDays * BALANCE.engine.stepsPerDay + jitter);
  scheduleInsert(state, nextStep, 'contract.offer', {});
}

// ---------------------------------------------------------------------------
// Contract instance builder
// ---------------------------------------------------------------------------

/**
 * Pick goods from catalog for a supply contract.
 * Min. sada: jeden goods typ z katalogu (kind:'supply' → cost=goods, reward=gold).
 * @param {GameState} state
 * @param {import('../state/types.js').Rng} rng
 * @returns {{ goodsId: string, qty: number } | null}
 */
function pickGoodsItem(state, rng) {
  if (!hasCatalog('goods')) return null;
  const cat = /** @type {Record<string, any[]>} */ (/** @type {any} */ (getCatalog('goods')));
  const goods = cat.goods;
  if (!Array.isArray(goods) || goods.length === 0) return null;

  // Filtruj goods které jsou v market state (initializované)
  const ms = /** @type {any} */ (state.world.marketState) ?? {};
  const available = goods.filter(/** @param {any} g */ (g) => ms[g.id] !== undefined);
  if (available.length === 0) return null;

  const idx = rng.int(available.length);
  const goodsEntry = available[idx];
  const qty = BAL.supplyQtyMin + Math.round(rng.next() * (BAL.supplyQtyMax - BAL.supplyQtyMin));
  return { goodsId: goodsEntry.id, qty };
}

/**
 * Build a new contract instance (supply kind, goodsSeller type).
 * §5.2 design.
 * @param {GameState} state
 * @param {import('../state/types.js').Rng} rng
 * @returns {Record<string, any> | null}
 */
function buildContractInstance(state, rng) {
  if (!hasCatalog('contracts')) return null;
  const cat = /** @type {Record<string, any[]>} */ (/** @type {any} */ (getCatalog('contracts')));
  const contracts = cat.contracts;
  if (!Array.isArray(contracts) || contracts.length === 0) return null;

  // Min. sada: generuj jen 'supply' kind (goodsSeller)
  const supplyTypes = contracts.filter(/** @param {any} e */ (e) => e.kind === 'supply');
  if (supplyTypes.length === 0) return null;

  const typeIdx = rng.int(supplyTypes.length);
  const entry = /** @type {any} */ (supplyTypes[typeIdx]);

  const picked = pickGoodsItem(state, rng);
  if (!picked) return null;

  const cost = { [picked.goodsId]: picked.qty };
  const goldVal = getGoldValue(state, cost);
  const reward = { gold: Math.round(goldVal * BAL.rewardMult) };

  const home = /** @type {any} */ (state.home);

  return {
    id: 'contract_' + (home.contractSeq++),
    type: entry.id,
    title: entry.title,
    status: 'offered',
    cost,
    reward,
    deadlineStep: 0, // set at acceptContract
    onComplete: entry.onComplete,
    onExpire: entry.onExpire,
    onReject: entry.onReject,
  };
}

// ---------------------------------------------------------------------------
// B2 — armContractOffer (idempotentní re-arm, §14.2)
// ---------------------------------------------------------------------------

/**
 * Idempotentní arm generátoru nabídek.
 * Volat z bootSequence za marketInit (mirror marketInit vzoru, main.js:180).
 * Guard: scheduleCountOf('contract.offer')===0 → insert; jinak no-op.
 * Deterministické (žádný RNG/Date při armování — jitter až v handleru).
 * Pokrývá fresh+M5-2 save+starý save jedinou cestou (§14.2).
 * @param {GameState} state
 * @returns {void}
 */
export function armContractOffer(state) {
  if (scheduleCountOf(state, 'contract.offer') === 0) {
    const step = Math.max(state.engine.curStep, BAL.firstOfferStep);
    scheduleInsert(state, step, 'contract.offer', {});
  }
}

// ---------------------------------------------------------------------------
// Boot registration
// ---------------------------------------------------------------------------

/**
 * Handler: contract.complete — generická completion efekt (K14, §4.3).
 * Module-level constant → idempotentní register (stejná reference, žádná kolize).
 * Command completeContract volá applyContractComplete přímo (command nemá registry).
 * @param {GameState} state
 * @param {{ contractId?: unknown }} params
 * @param {TickContext} _ctx
 */
function contractComplete(state, params, _ctx) {
  const p = /** @type {any} */ (params);
  const c = findContract(state, p.contractId);
  if (!c) return;
  applyContractComplete(state, c);
}

/**
 * Registruje contract schedule handlery do registru efektů.
 * Volat z bootstrapEngine za registerCorePeriodics (§14.1, §6.4)
 * A z registerCorePeriodics (tickOrder.js) pro pokrytí test ctx.
 * Idempotentní: module-level function references → re-register is safe (same ref).
 * Registruje: 'contract.expire', 'contract.offer', 'contract.complete'.
 * 'noop' je již registrován (tickOrder.js:146) → NEregistrujeme znovu.
 * @param {Registry} reg
 * @returns {void}
 */
export function registerContractEffects(reg) {
  register(reg, 'contract.expire', contractExpire);
  register(reg, 'contract.offer', contractOffer);
  register(reg, 'contract.complete', contractComplete);
}
