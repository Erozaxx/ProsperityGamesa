/**
 * Pure selectors over GameState snapshots. No DOM – unit-testable in Node.
 * @typedef {import('../core/state/types.js').GameState} GameState
 */

import { buyingPrice, sellingPrice } from '../core/systems/market.js';
import { getCatalog, hasCatalog, byId, hasId } from '../core/catalog/loader.js';
import { canAfford } from '../core/resources/transactions.js';
import { scaleCostByCount, techCap } from '../core/balance/formulas.js';
import { effectiveMap, effectFromCatalog } from '../core/systems/buildings.js';
import { companyBuildersTotal, companyMasonTotal } from '../core/commands/buyCompany.js';
import { BALANCE } from '../core/balance/balance.js';
import { calcMilitaryRating, calcEconomicRating, findQuest } from '../core/systems/world.js';

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

// ---------------------------------------------------------------------------
// T4 — Tech tree selectors (iter-015 M6)
// ---------------------------------------------------------------------------

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   sector: string,
 *   level: number,
 *   cost: number,
 *   prereqs: string[],
 *   unlocked: boolean,
 *   available: boolean,
 *   canAfford: boolean,
 *   effects: Array<{target: string, attr: string, op: string, value: number}>
 * }} TechViewItem
 */

/**
 * Selects full tech tree with unlock status, cost and affordability.
 * Pure selector: derives cost via techCap(level), prereqs from catalog, canAfford from techPt.
 * Design: design_iter-015.md §5.1 (M6-D9).
 * @param {GameState} s
 * @returns {TechViewItem[]}
 */
export function selectTechTree(s) {
  if (!hasCatalog('techs')) return [];
  const cat = /** @type {Record<string, any>} */ (getCatalog('techs'));
  const tree = /** @type {any[]} */ (cat.techs?.tree ?? []);
  const unlocked = /** @type {Record<string, boolean>} */ (/** @type {any} */ (s.player).unlockedTechs ?? {});
  const havePt = /** @type {number} */ (/** @type {any} */ (s.player).techPt ?? 0);

  return tree.map(t => {
    const level = typeof t.level === 'number' ? t.level : 0;
    const cost = techCap(level);
    const prereqs = Array.isArray(t.prereqs) ? /** @type {string[]} */ (t.prereqs) : [];
    const prereqsMet = prereqs.every(p => unlocked[p] === true);
    const isUnlocked = unlocked[t.id] === true;
    return {
      id: t.id,
      name: t.name ?? t.id,
      sector: t.sector ?? '',
      level,
      cost,
      prereqs,
      unlocked: isUnlocked,
      available: !isUnlocked && prereqsMet,
      canAfford: havePt >= cost,
      effects: Array.isArray(t.effects) ? t.effects : [],
    };
  });
}

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   level: number,
 *   exp: number,
 *   cap: number,
 *   progPct: number
 * }} ResearchProgressItem
 */

/**
 * Selects research progress per sector.
 * Pure selector: derives cap via techCap(level), progPct from exp/cap.
 * Design: design_iter-015.md §5.1 (M6-D9).
 * @param {GameState} s
 * @returns {ResearchProgressItem[]}
 */
export function selectResearchProgress(s) {
  if (!hasCatalog('techs')) return [];
  const cat = /** @type {Record<string, any>} */ (getCatalog('techs'));
  const catSectors = /** @type {any[]} */ (cat.techs?.sectors ?? []);
  const sectors = /** @type {Record<string, {level: number, exp: number}> } */ (
    /** @type {any} */ (s.player).research?.sectors ?? {}
  );

  return catSectors.map(sec => {
    const st = sectors[sec.id] ?? { level: 0, exp: 0 };
    const cap = techCap(st.level);
    return {
      id: sec.id,
      name: sec.name ?? sec.id,
      level: st.level,
      exp: st.exp,
      cap,
      progPct: cap > 0 ? Math.min(100, Math.round(st.exp * 100 / cap)) : 0,
    };
  });
}

/**
 * Selects current tech points balance.
 * @param {GameState} s
 * @returns {number}
 */
export function selectTechPoints(s) {
  return /** @type {number} */ (/** @type {any} */ (s.player).techPt ?? 0);
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

// ---------------------------------------------------------------------------
// T6 (iter-017 M7a-2) — World / Zones / Factions / Quests selectors
// ---------------------------------------------------------------------------

/** Policy id → human-readable name (orig: 0=resource, 1=growth, 2=military, 3=tribute) */
const POLICY_NAMES = ['Zdroje', 'Růst', 'Vojsko', 'Tribut'];

/** Faction colour palette (approximate, vis-distinguishable)
 * @type {Record<string, string>}
 */
const FACTION_COLORS = {
  player:         '#4caf50',
  theWarlord:     '#ef5350',
  thePrincess:    '#ab47bc',
  thePsychopath:  '#ff7043',
};

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   liege: string,
 *   liegeName: string,
 *   liegeColor: string,
 *   originalLiege: string,
 *   policy: number,
 *   policyName: string,
 *   numWorkers: number,
 *   warriors: number,
 *   archers: number,
 *   favour: number,
 *   militaryRating: number,
 *   economicRating: number,
 *   neighbours: string[],
 *   curQuest: string | null
 * }} ZoneViewItem
 */

/**
 * Selects world zones with derived ratings and display fields.
 * Ratingy on-demand (calcMilitaryRating/calcEconomicRating) — NEukládá (design §8.1).
 * favour = player favour number = zone.favour?.player ?? 0 (undefined-safe, §8.1 n-1).
 * @param {GameState} s
 * @returns {ZoneViewItem[]}
 */
export function selectWorldZones(s) {
  const zones = /** @type {any[]} */ (s.world?.zones ?? []);
  return zones.map(z => {
    const liegeColor = FACTION_COLORS[/** @type {string} */ (z.liege)] ?? '#888';
    const liegeName  = (() => {
      if (z.liege === 'player') return 'Hráč';
      const fac = /** @type {any} */ (s.world?.factions)?.[z.liege];
      return fac ? fac.name : z.liege;
    })();
    // favour: player favour number from per-faction object (undefined-safe)
    const favour = (z.favour && typeof z.favour.player === 'number') ? z.favour.player : 0;
    return {
      id:             z.id,
      name:           z.name ?? z.id,
      liege:          z.liege ?? '',
      liegeName,
      liegeColor,
      originalLiege:  z.originalLiege ?? '',
      policy:         z.policy ?? 0,
      policyName:     POLICY_NAMES[z.policy ?? 0] ?? String(z.policy),
      numWorkers:     z.numWorkers ?? 0,
      warriors:       z.warriors   ?? 0,
      archers:        z.archers    ?? 0,
      favour,
      militaryRating: calcMilitaryRating(s, z),
      economicRating: calcEconomicRating(s, z),
      neighbours:     Array.isArray(z.neighbours) ? z.neighbours : [],
      curQuest:       z.curQuest ?? null,
    };
  });
}

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   color: string,
 *   state: number,
 *   stateName: string,
 *   capitalId: string | null,
 *   capitalName: string | null,
 *   aggression: number,
 *   totalZones: number,
 *   totalWarriors: number,
 *   totalArchers: number,
 *   wantToAttack: boolean
 * }} FactionViewItem
 */

/**
 * Selects world factions with derived totals and state name.
 * stateName derived from aiStates catalog (key field, §8.1 design).
 * @param {GameState} s
 * @returns {FactionViewItem[]}
 */
export function selectFactions(s) {
  const factions = /** @type {Record<string, any>} */ (s.world?.factions ?? {});
  const zones = /** @type {any[]} */ (s.world?.zones ?? []);

  // aiStates from catalog (zones.json.zones.aiStates)
  let aiStates = /** @type {any[]} */ ([]);
  try {
    if (hasCatalog('zones')) {
      const cat = /** @type {any} */ (getCatalog('zones'));
      const catalogDef = cat?.zones ?? cat;
      if (Array.isArray(catalogDef?.aiStates)) aiStates = catalogDef.aiStates;
    }
  } catch (_) { /* catalog not available (tests without catalog) */ }

  /** @param {number} stateId @returns {string} */
  function getStateName(stateId) {
    const entry = aiStates.find((/** @type {any} */ a) => a.id === stateId);
    return entry ? entry.key : String(stateId);
  }

  return Object.values(factions).map(fac => {
    const facZones = zones.filter(z => z.liege === fac.id);
    const totalWarriors = facZones.reduce((acc, z) => acc + (z.warriors || 0), 0);
    const totalArchers  = facZones.reduce((acc, z) => acc + (z.archers  || 0), 0);

    // capital name
    const capitalZone = fac.capitalId ? zones.find((z) => z.id === fac.capitalId) : null;
    const capitalName = capitalZone ? (capitalZone.name ?? fac.capitalId) : null;

    return {
      id:           fac.id,
      name:         fac.name ?? fac.id,
      color:        FACTION_COLORS[fac.id] ?? '#888',
      state:        fac.state ?? 0,
      stateName:    getStateName(fac.state ?? 0),
      capitalId:    fac.capitalId ?? null,
      capitalName,
      aggression:   fac.aggression ?? 0,
      totalZones:   facZones.length,
      totalWarriors,
      totalArchers,
      wantToAttack: !!fac.wantToAttack,
    };
  });
}

/**
 * @typedef {{
 *   id: string,
 *   from: string,
 *   fromName: string,
 *   type: string,
 *   title: string,
 *   description: string,
 *   req: Record<string, number>,
 *   reward: Record<string, number>,
 *   deadlineStep: number,
 *   daysLeft: number,
 *   canAccept: boolean
 * }} QuestViewItem
 */

/**
 * Selects world quests with derived daysLeft and canAccept affordability.
 * daysLeft derived from curStep (design §8.1) — not stored.
 * canAccept: player has enough warriors/archers for req (design §5.3).
 * @param {GameState} s
 * @returns {QuestViewItem[]}
 */
export function selectQuests(s) {
  const quests = /** @type {any[]} */ (/** @type {any} */ (s.world)?.quests ?? []);
  const curStep = s.engine.curStep;
  const stepsPerDay = STEPSPERDAY;
  const p = /** @type {any} */ (s.player);

  return quests.map(q => {
    const remaining = Math.max(0, (q.deadlineStep ?? 0) - curStep);
    const daysLeft  = Math.round(remaining / stepsPerDay);

    // canAccept: player has enough warriors and archers for req (min. set check)
    const req = q.req || {};
    const neededWarriors = req.warriors || 0;
    const neededArchers  = req.archers  || 0;
    const neededGold     = req.gold     || 0;
    const hasWarriors    = (p?.totWarriors ?? 0) >= neededWarriors;
    const hasArchers     = (p?.totArchers  ?? 0) >= neededArchers;
    const hasGold        = (p?.gold        ?? 0) >= neededGold;
    const canAccept      = hasWarriors && hasArchers && hasGold;

    // fromName: zone name lookup
    const zones = /** @type {any[]} */ (s.world?.zones ?? []);
    const fromZone = zones.find(z => z.id === q.from);
    const fromName = fromZone ? (fromZone.name ?? q.from) : q.from;

    return {
      id:           q.id,
      from:         q.from,
      fromName,
      type:         q.type ?? '',
      title:        q.title ?? '',
      description:  q.description ?? '',
      req:          /** @type {Record<string, number>} */ (req),
      reward:       /** @type {Record<string, number>} */ (q.reward ?? {}),
      deadlineStep: q.deadlineStep ?? 0,
      daysLeft,
      canAccept,
    };
  });
}

// ---------------------------------------------------------------------------
// M7b T-007 — Battle selector (iter-018 T5)
// ---------------------------------------------------------------------------

/**
 * @typedef {{
 *   number: number,
 *   startingNumber: number,
 *   casualties: number,
 *   cd: number,
 *   lastMaxCD: number,
 *   type: string
 * }} UnitView
 *
 * @typedef {{
 *   liege: string,
 *   action: string,
 *   warriors: UnitView,
 *   archers: UnitView,
 *   number: number
 * }} SideView
 *
 * @typedef {{
 *   id: string,
 *   name: string,
 *   cdPct: number,
 *   available: boolean,
 *   side: 'warriors' | 'archers'
 * }} BattleActionView
 *
 * @typedef {{
 *   active: boolean,
 *   state: 'running' | 'done' | 'setup' | null,
 *   zoneId: string | null,
 *   player: SideView | null,
 *   opponent: SideView | null,
 *   actions: BattleActionView[],
 *   log: [string, string|null][],
 *   progressPct: number,
 *   summary: object | null
 * }} BattleView
 */

/** Inline action catalog — mirrors ATTACKS_FALLBACK in battle.js */
const BATTLE_ACTIONS = [
  { id: 'charge',     name: 'Charge',      side: 'warriors' },
  { id: 'shieldWall', name: 'Shield Wall', side: 'warriors' },
  { id: 'flank',      name: 'Flank',       side: 'warriors' },
  { id: 'volley',     name: 'Volley',      side: 'archers'  },
  { id: 'fireArrows', name: 'Fire Arrows', side: 'archers'  },
];

/**
 * Selects active battle state for the BattleScreen.
 * Deriváty (dostupnost akce, %progress) computed HERE, not in UI.
 * Pure read — no mutations, no DOM.
 * @param {GameState} s
 * @returns {BattleView}
 */
export function selectBattle(s) {
  const st = /** @type {any} */ (s);
  const bs = st.battle ?? null;

  if (!bs || typeof bs !== 'object') {
    return {
      active:      false,
      state:       null,
      zoneId:      null,
      player:      null,
      opponent:    null,
      actions:     [],
      log:         [],
      progressPct: 0,
      summary:     null,
    };
  }

  const player   = bs.sides?.player   ?? null;
  const opponent = bs.sides?.opponent ?? null;

  /** @param {any} u @returns {UnitView} */
  function mapUnit(u) {
    return {
      number:         u?.number         ?? 0,
      startingNumber: u?.startingNumber ?? 0,
      casualties:     u?.casualties     ?? 0,
      cd:             u?.cd             ?? 0,
      lastMaxCD:      u?.lastMaxCD      ?? 100,
      type:           u?.type           ?? '',
    };
  }

  /** @param {any} side @returns {SideView | null} */
  function mapSide(side) {
    if (!side) return null;
    return {
      liege:    side.liege    ?? '',
      action:   side.action   ?? '',
      warriors: mapUnit(side.warriors),
      archers:  mapUnit(side.archers),
      number:   side.number   ?? 0,
    };
  }

  const playerView   = mapSide(player);
  const opponentView = mapSide(opponent);

  // Compute available actions: action is available when the unit cd === 0 and number > 0
  /** @type {BattleActionView[]} */
  const actions = BATTLE_ACTIONS.map(a => {
    const unit = player?.[a.side];
    const cd       = unit?.cd         ?? 0;
    const lastMax  = unit?.lastMaxCD  ?? 1;
    const number   = unit?.number     ?? 0;
    const cdPct    = lastMax > 0 ? Math.round((cd / lastMax) * 100) : 0;
    return {
      id:        a.id,
      name:      a.name,
      side:      /** @type {'warriors' | 'archers'} */ (a.side),
      cdPct,
      available: (number > 0) && (cd === 0) && (bs.state === 'running'),
    };
  });

  // Progress: based on casualties as fraction of total starting units
  const pStart = (player?.warriors?.startingNumber ?? 0) + (player?.archers?.startingNumber ?? 0);
  const oStart = (opponent?.warriors?.startingNumber ?? 0) + (opponent?.archers?.startingNumber ?? 0);
  const totalStart = pStart + oStart;
  const totalAlive = (player?.number ?? 0) + (opponent?.number ?? 0);
  const progressPct = totalStart > 0
    ? Math.min(100, Math.round(((totalStart - totalAlive) / totalStart) * 100))
    : 0;

  // Log: ring buffer, newest first (already unshift in battle.js — index 0 is newest)
  const log = Array.isArray(bs.log) ? bs.log.slice(0, 30) : [];

  return {
    active:      true,
    state:       bs.state ?? null,
    zoneId:      bs.zoneId ?? null,
    player:      playerView,
    opponent:    opponentView,
    actions,
    log,
    progressPct,
    summary:     bs.summary ?? null,
  };
}

// ---------------------------------------------------------------------------
// M7b T-006 — Battle log selector (iter-018)
// ---------------------------------------------------------------------------

/**
 * @typedef {{
 *   zoneId: string,
 *   winner: string | null,
 *   playerCasualties: number,
 *   playerKills: number,
 *   loot: object | null,
 *   atStep: number
 * }} BattleLogEntry
 */

/**
 * Selects battle log entries for display (e.g. offline summary, history panel).
 * Reads state.world.battleLog (populated by resolveBattleOutcome §9.3, max 50 records).
 * Returns newest-first (original push order reversed).
 * No logic — pure read + reverse.
 * @param {GameState} s
 * @returns {BattleLogEntry[]}
 */
export function selectBattleLog(s) {
  const log = /** @type {BattleLogEntry[] | undefined} */ (/** @type {any} */ (s).world?.battleLog);
  if (!Array.isArray(log)) return [];
  // Newest first (battleLog is push-ordered, oldest first)
  return log.slice().reverse();
}
