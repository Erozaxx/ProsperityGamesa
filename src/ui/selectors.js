/**
 * Pure selectors over GameState snapshots. No DOM – unit-testable in Node.
 * @typedef {import('../core/state/types.js').GameState} GameState
 */

import { buyingPrice, sellingPrice } from '../core/systems/market.js';
import { getCatalog, hasCatalog, byId, hasId } from '../core/catalog/loader.js';
import { canAfford } from '../core/resources/transactions.js';
import { scaleCostByCount } from '../core/balance/formulas.js';
import { effectiveMap, effectFromCatalog } from '../core/systems/buildings.js';
import { companyBuildersTotal, companyMasonTotal } from '../core/commands/buyCompany.js';
import { BALANCE } from '../core/balance/balance.js';

const STEPSPERDAY = BALANCE.engine.stepsPerDay;
const BAL_BUILDINGS = /** @type {any} */ (BALANCE).buildings;
const BAL_CONTRACTS = /** @type {any} */ (BALANCE).contracts;

const SEASON_NAMES = ['Jaro', 'Léto', 'Podzim', 'Zima'];

/**
 * @typedef {{ id: string, number: number, curStep: number }} JobViewItem
 * @typedef {{ id: string, progressing: boolean, curStep: number, progPct: number }} SkillViewItem
 */

/**
 * Extracts clock display data.
 * @param {GameState} s
 * @returns {{ curStep: number, day: number, dayInSeason: number, year: number }}
 */
export function selectClock(s) {
  return {
    curStep: s.engine.curStep,
    day: s.season.curDay,
    dayInSeason: s.season.dayInSeason,
    year: s.season.curYear,
  };
}

/**
 * Extracts season display data.
 * @param {GameState} s
 * @returns {{ season: number, name: string }}
 */
export function selectSeason(s) {
  return {
    season: s.season.curSeason,
    name: SEASON_NAMES[s.season.curSeason] ?? '?',
  };
}

/**
 * Returns current speed level.
 * @param {GameState} s
 * @returns {0|1|2}
 */
export function selectSpeed(s) {
  return /** @type {0|1|2} */ (s.engine.speed);
}

/**
 * Selects job state: for each job in state, returns id, number assigned, progress.
 * @param {GameState} s
 * @returns {JobViewItem[]}
 */
export function selectJobs(s) {
  const jobs = s.home.jobs ?? {};
  return Object.entries(jobs).map(([id, j]) => ({
    id,
    number: j.number || 0,
    curStep: j.curStep || 0,
  }));
}

/**
 * Selects skill state: for each skill, returns id, progressing, curStep, progPct.
 * @param {GameState} s
 * @returns {SkillViewItem[]}
 */
export function selectSkills(s) {
  const skills = s.home.skills ?? {};
  return Object.entries(skills).map(([id, sk]) => ({
    id,
    progressing: !!sk.progressing,
    curStep: sk.curStep || 0,
    progPct: sk.progPct || 0,
  }));
}

/**
 * Selects workforce summary.
 * @param {GameState} s
 * @returns {{ total: number, assigned: number, unemployed: number, efficiency: number }}
 */
export function selectWorkforce(s) {
  const wf = s.home.workforce ?? { total: 0, assigned: 0 };
  const total = wf.total || 0;
  const assigned = wf.assigned || 0;
  return {
    total,
    assigned,
    unemployed: total - assigned,
    efficiency: s.home.workerEfficiency ?? 1,
  };
}

/**
 * Selects finance/council state for display.
 * @param {GameState} s
 * @returns {{ gold: number, taxRate: number, lastReport: import('../core/state/types.js').MonthlyReport | null, notEnoughMilitaryFunding: boolean }}
 */
export function selectFinance(s) {
  const last = (s.council && s.council.history[0]) || null;
  return {
    gold: s.player.gold,
    taxRate: s.player.taxRate ?? 1,
    lastReport: last,
    notEnoughMilitaryFunding: !!(s.home && s.home.notEnoughMilitaryFunding),
  };
}

/**
 * Selects market state for display: rows with buy/sell prices and caravan status.
 * Pure selector: imports price helpers from market.js (pure fns, no DOM).
 * iter-011 M4b T5.
 * @param {GameState} s
 * @returns {{ rows: Array<{id: string, available: number, max: number, buy: number, sell: number, owned: number}>, caravan: {sentOut: number, capacity: number, onRoad: boolean} }}
 */
export function selectMarket(s) {
  const ms = /** @type {Record<string, {available:number,max:number,baseline:number}> | undefined} */ (s.world.marketState);
  const rows = ms ? Object.entries(ms).map(([id, m]) => ({
    id,
    available: m.available,
    max: m.max,
    buy: buyingPrice(s, id),
    sell: sellingPrice(s, id),
    owned: (s.player.inventory && s.player.inventory[id]) || 0,
  })) : [];

  const caravan = /** @type {import('../core/state/types.js').CaravanState | undefined} */ (s.world.caravan);
  return {
    rows,
    caravan: {
      sentOut: caravan ? caravan.sentOut : 0,
      capacity: caravan ? caravan.capacity : 10000,
      onRoad: caravan ? caravan.sentOut > 0 : false,
    },
  };
}

// ---------------------------------------------------------------------------
// T6.1 — Build selectors
// ---------------------------------------------------------------------------

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   category: string,
 *   cost: Record<string, number>,
 *   canAfford: boolean,
 *   created: number,
 *   totalMade: number,
 *   unlocked: boolean,
 *   builders: number,
 *   maxProgress: number
 * }} BuildingViewItem
 */

/**
 * Selects buildable buildings with scaled cost and affordability.
 * Cena se scalingem přes scaleCostByCount (design §7.1).
 * @param {GameState} s
 * @returns {BuildingViewItem[]}
 */
export function selectBuildableBuildings(s) {
  if (!hasCatalog('buildings')) return [];
  const cat = /** @type {Record<string, any>} */ (getCatalog('buildings'));
  const buildings = /** @type {any[]} */ (Array.isArray(cat.buildings) ? cat.buildings : []);
  const stateBuildings = /** @type {Record<string, any>} */ (/** @type {any} */ (s.home).buildings ?? {});

  const scaleFactor = BAL_BUILDINGS ? (BAL_BUILDINGS.costScaleFactor ?? 1.0) : 1.0;

  return buildings
    .filter(entry => entry.unlocked !== false)
    .map(entry => {
      const bState = stateBuildings[entry.id] ?? { created: 0, totalMade: 0 };
      const baseCost = /** @type {Record<string, number>} */ (effectiveMap(entry.id, 'baseCost', s));
      const scaledCost = scaleCostByCount(baseCost, bState.totalMade ?? 0, scaleFactor);
      const affordable = canAfford(s, scaledCost);
      return {
        id: entry.id,
        name: entry.name ?? entry.id,
        category: entry.category ?? '',
        cost: scaledCost,
        canAfford: affordable,
        created: bState.created ?? 0,
        totalMade: bState.totalMade ?? 0,
        unlocked: entry.unlocked !== false,
        builders: entry.builders ?? 0,
        maxProgress: entry.maxProgress ?? 0,
      };
    });
}

/**
 * @typedef {{
 *   id: string,
 *   buildingId: string,
 *   name: string,
 *   type: string,
 *   progressPct: number,
 *   builders: number,
 *   removable: boolean
 * }} ProjectQueueItem
 */

/**
 * Selects project queue (build + repair projects).
 * @param {GameState} s
 * @returns {ProjectQueueItem[]}
 */
export function selectProjectQueue(s) {
  const queue = /** @type {any[]} */ (/** @type {any} */ (s.home).projectQueue ?? []);
  return queue.map(p => {
    const entryName = hasId(p.buildingId)
      ? (/** @type {Record<string, any>} */ (byId(p.buildingId).entry).name ?? p.buildingId)
      : p.buildingId;
    const maxP = p.maxProgress ?? 1;
    const curP = p.curProgress ?? 0;
    const progressPct = maxP > 0 ? Math.round((curP / maxP) * 100) : 0;
    return {
      id: p.id ?? p.buildingId,
      buildingId: p.buildingId,
      name: entryName,
      type: p.type ?? 'build',
      progressPct: Math.min(100, Math.max(0, progressPct)),
      builders: p.builders ?? 0,
      removable: p.removable !== false && (p.type ?? 'build') === 'build',
    };
  });
}

/**
 * @typedef {{
 *   assignedBuilders: number,
 *   companyBuilders: number,
 *   maxActiveProjects: number,
 *   maxProjectQueue: number,
 *   queueUsed: number
 * }} BuilderCapacity
 */

/**
 * Selects builder capacity summary.
 * @param {GameState} s
 * @returns {BuilderCapacity}
 */
export function selectBuilderCapacity(s) {
  const jobs = /** @type {any} */ (s.home.jobs ?? {});
  const assignedBuilders = jobs.builder?.number ?? 0;
  const companyBuilders = companyBuildersTotal(s);

  const stateBuildings = /** @type {Record<string, any>} */ (/** @type {any} */ (s.home).buildings ?? {});
  const bhut = stateBuildings['builderHut'];
  const bhutCreated = bhut ? (bhut.created ?? 0) : 0;
  const perHutActive = effectFromCatalog('builderHut', 'maxActiveProjects');
  const perHutQueue = effectFromCatalog('builderHut', 'maxProjectQueue');
  const maxActiveProjects = bhutCreated > 0 ? perHutActive * bhutCreated + companyMasonTotal(s) : 0 + companyMasonTotal(s);
  const maxProjectQueue = bhutCreated > 0 ? perHutQueue * bhutCreated : 0;

  const queue = /** @type {any[]} */ (/** @type {any} */ (s.home).projectQueue ?? []);

  return {
    assignedBuilders,
    companyBuilders,
    maxActiveProjects,
    maxProjectQueue,
    queueUsed: queue.length,
  };
}

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   type: string,
 *   cost: Record<string, number>,
 *   owned: boolean,
 *   canAfford: boolean,
 *   buildersProvided: number,
 *   masonProvided: number
 * }} CompanyViewItem
 */

/**
 * Selects builder companies (houseBuilder + mineBuilder sections) with owned/cost.
 * @param {GameState} s
 * @returns {CompanyViewItem[]}
 */
export function selectBuilderCompanies(s) {
  if (!hasCatalog('companies')) return [];
  const cat = /** @type {Record<string, any>} */ (getCatalog('companies'));
  const data = /** @type {Record<string, any[]>} */ (cat.companies ?? cat);
  const ownedCompanies = /** @type {Record<string, boolean>} */ (/** @type {any} */ (s.home).ownedCompanies ?? {});

  /** @type {CompanyViewItem[]} */
  const result = [];
  for (const section of ['houseBuilder', 'mineBuilder']) {
    const items = data[section];
    if (!Array.isArray(items)) continue;
    for (const entry of items) {
      const owned = !!ownedCompanies[entry.id];
      const cost = /** @type {Record<string, number>} */ (entry.cost ?? {});
      result.push({
        id: entry.id,
        name: entry.name ?? entry.id,
        type: section,
        cost,
        owned,
        canAfford: canAfford(s, cost),
        buildersProvided: typeof entry.buildersProvided === 'number' ? entry.buildersProvided : 0,
        masonProvided: typeof entry.masonProvided === 'number' ? entry.masonProvided : 0,
      });
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// T6.2 — Contracts selector
// ---------------------------------------------------------------------------

/**
 * @typedef {{
 *   id: string,
 *   type: string,
 *   title: string,
 *   status: string,
 *   cost: Record<string, number>,
 *   reward: Record<string, number>,
 *   canComplete: boolean,
 *   daysLeft: number | null,
 *   pctComplete: number | null,
 *   unaffordable: string[]
 * }} ContractViewItem
 */

/**
 * Selects contracts queue with derived fields.
 * Deriváty canComplete/daysLeft/pctComplete počítané ZDE (design §7.2).
 * @param {GameState} s
 * @returns {ContractViewItem[]}
 */
export function selectContracts(s) {
  const queue = /** @type {any[]} */ (/** @type {any} */ (s.home).contractQueue ?? []);
  const curStep = s.engine.curStep;

  return queue.map(c => {
    const cost = /** @type {Record<string, number>} */ (c.cost ?? {});
    const reward = /** @type {Record<string, number>} */ (c.reward ?? {});
    const isActive = c.status === 'active';

    const completable = isActive && canAfford(s, cost);

    let daysLeft = null;
    let pctComplete = null;
    if (isActive && typeof c.deadlineStep === 'number') {
      const remaining = Math.max(0, c.deadlineStep - curStep);
      daysLeft = Math.round(remaining / STEPSPERDAY);
      // pctComplete: fraction of deadline elapsed (0..100)
      // We need to know the total duration. Use expirationDays from catalog if available.
      let totalSteps = c.deadlineStep; // fallback: use absolute (no start reference)
      if (hasCatalog('contracts')) {
        try {
          const entry = /** @type {Record<string, any>} */ (byId(c.type).entry);
          if (typeof entry.expirationDays === 'number') {
            totalSteps = entry.expirationDays * STEPSPERDAY;
          }
        } catch (_) { /* catalog not loaded or type unknown — use fallback */ }
      }
      const elapsed = totalSteps - remaining;
      pctComplete = totalSteps > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / totalSteps) * 100))) : 0;
    }

    const unaffordable = Object.keys(cost).filter(k => {
      const need = cost[k];
      return !canAfford(s, { [k]: need });
    });

    // Derive title from catalog if not present in contract data
    let title = c.title ?? '';
    if (!title && hasCatalog('contracts')) {
      try {
        const entry = /** @type {Record<string, any>} */ (byId(c.type).entry);
        title = entry.title ?? c.type;
      } catch (_) { title = c.type ?? ''; }
    }

    return {
      id: c.id,
      type: c.type ?? '',
      title,
      status: c.status ?? 'offered',
      cost,
      reward,
      canComplete: completable,
      daysLeft,
      pctComplete,
      unaffordable,
    };
  });
}

/**
 * Selects world resource areas (forest/field/mine) for display.
 * @param {GameState} s
 * @returns {{
 *   forest: { curTrees: number, curAnimals: number, health: number, timeSinceLastFire: number },
 *   field: { curLivestock: number, rodentInfestation: number, usedFarmLand: number },
 *   mine: { curOres: number }
 * }}
 */
export function selectWorld(s) {
  /** @type {import('../core/state/types.js').ForestState | undefined} */
  const forest = s.world.forest;
  /** @type {import('../core/state/types.js').FieldState | undefined} */
  const field = s.world.field;
  /** @type {import('../core/state/types.js').MineState | undefined} */
  const mine = s.world.mine;
  return {
    forest: {
      curTrees: forest ? forest.curTrees : 0,
      curAnimals: forest ? forest.curAnimals : 0,
      health: forest ? forest.health : 100,
      timeSinceLastFire: forest ? forest.timeSinceLastFire : 0,
    },
    field: {
      curLivestock: field ? field.curLivestock : 0,
      rodentInfestation: field ? field.rodentInfestation : 0,
      usedFarmLand: field ? field.usedFarmLand : 0,
    },
    mine: {
      curOres: mine ? mine.curOres : 0,
    },
  };
}
