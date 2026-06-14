/**
 * World system – zone tick (M7a-1 T1+T5).
 * iter-016 M7a-1 T1: worldTick (day-edge round-robin), processZone (economy/policy),
 * hydrateZones (shared fresh+load path, id-based merge from catalog).
 * iter-016 M7a-1 T5: marketInject wiring — productive zones inject supply (+),
 * warring zones drain supply (−). Contract §8.2 beze změny signatur.
 *
 * Design source of truth: design_iter-016.md §2.1/§2.2/§6/§8.1 (M-1/M-2 fixes, T5).
 * RNG: makeRng(state,'world') — SINGLE stream, no new streams (D6/§7.1).
 * Scope OUT: gatherTributes=M7a-2, processAI=M7a-2, revolts/quests=M7a-2.
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('../state/types.js').TickContext} TickContext
 */

import { BALANCE } from '../balance/balance.js';
import { makeRng } from '../engine/rng.js';
import { getCatalog, hasCatalog } from '../catalog/index.js';
import { getGoldValue, marketInject } from './market.js';
import { register } from '../registry/registry.js';
import { scheduleInsert } from '../engine/scheduler.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Stochastic round: floor(x) + (rng.next() < frac(x) ? 1 : 0).
 * Deterministic replacement for $rootScope.fns.randRound (world.js orig).
 * §7.3 formulas.js pattern.
 * @param {number} x
 * @param {{ next: () => number }} rng
 * @returns {number}
 */
function randRound(x, rng) {
  const fl = Math.floor(x);
  return fl + (rng.next() < (x - fl) ? 1 : 0);
}

// ─── processZone ──────────────────────────────────────────────────────────────

/**
 * Process a single zone's economy and policy for one zone-tick.
 * Pure over state.world.zones (finds zone by id).
 * Design §2.2, 1:1 from original world.js processZone (ř.33–494).
 * @param {import('../state/types.js').GameState} state
 * @param {string} zoneId
 * @param {{ next: () => number, int: (n:number) => number, chance: (p:number) => boolean }} rng
 */
export function processZone(state, zoneId, rng) {
  const zones = state.world.zones;
  if (!Array.isArray(zones)) return;
  const zone = /** @type {any} */ (zones.find(z => /** @type {any} */ (z).id === zoneId));
  if (!zone) return;

  // Skip homeZone (orig ř.36)
  if (zone.id === 'homeZone') return;

  const bal = BALANCE.world;

  // ── Gold economy (orig ř.38-43) ──────────────────────────────────────────
  // Computed from PRE-policy values and stored on zone (readable by selectors/tests).
  // Persisted in save schema so that hashState is stable after save/load (M-2 gate).
  zone.goldDemand = bal.goldDemandPerUnit * ((zone.warriors || 0) + (zone.archers || 0));
  zone.goldProduction = bal.goldProdPerWorker * (zone.numWorkers || 0);
  const goldDemand = zone.goldDemand;
  const goldProduction = zone.goldProduction;
  if (!zone.goldStore) zone.goldStore = 0;

  // ── Policy switch (orig ř.45-213) ────────────────────────────────────────
  switch (zone.policy) {
    case 1: { // growth (orig ř.46-93)
      const numWorkersBefore = zone.numWorkers || 0; // capture before update (tribute uses pre-update value)
      let addedWorkers;
      if (numWorkersBefore > bal.growthWorkerCap) {
        addedWorkers = ~~(rng.next() * 20); // orig: ~~(rng * 20) — deterministic replacement (§7.1)
      } else {
        addedWorkers = ~~(numWorkersBefore * bal.growthBasePct + bal.growthBaseAdd);
      }

      if (zone.liege !== 'player' && numWorkersBefore < (zone.targetWorkerNum || 0) / 3) {
        addedWorkers += bal.growthUnderTargetBonus; // +15
      }

      if (numWorkersBefore > (zone.targetWorkerNum || 0)) {
        addedWorkers = Math.floor(-20 * rng.next());
        // notification skipped (no UI in M7a-1)
        zone.policy = 0;
      }

      zone.numWorkers = numWorkersBefore + addedWorkers;

      // clamp + hornCastle/thePsychopath special (orig ř.71-76)
      if (zone.numWorkers < 1 || (zone.id === 'hornCastle' && zone.liege === 'thePsychopath')) {
        zone.numWorkers = 1;
        if (zone.id === 'hornCastle' && zone.liege === 'thePsychopath') {
          zone.policy = 2;
        }
      }

      // tribute accumulation (orig ř.78-93) — M7a-1: accumulate only
      // Uses pre-update numWorkers (numWorkersBefore) to match original order
      const trib = zone.tribute || {};
      if (!zone.resources) zone.resources = {};
      for (const [itemId, amount] of Object.entries(trib)) {
        if (typeof amount !== 'number' || isNaN(/** @type {number} */ (amount))) {
          zone.resources[itemId] = 0;
        } else {
          if (!zone.resources[itemId]) zone.resources[itemId] = 0;
          zone.resources[itemId] += Math.ceil(/** @type {number} */ (amount) * numWorkersBefore / bal.tributeGrowthDivisor);
        }
      }
      break;
    }

    case 2: { // military (orig ř.95-180)
      if ((zone.numWorkers || 0) > bal.militaryWorkerThreshold ||
          (zone.id === 'hornCastle' && zone.liege === 'thePsychopath')) {

        let warriorGrowthBase = zone.warriorGrowth || 0;
        let archerGrowthBase  = zone.archerGrowth  || 0;
        const fg = bal.factionGrowth;

        // Faction-specific multipliers (orig ř.108-120)
        if (zone.liege === 'theWarlord') {
          warriorGrowthBase = Math.round(warriorGrowthBase * fg.theWarlord.w);
          archerGrowthBase  = Math.round(archerGrowthBase  * fg.theWarlord.a);
        } else if (zone.liege === 'thePrincess') {
          warriorGrowthBase = Math.round(warriorGrowthBase * fg.thePrincess.w);
          archerGrowthBase  = Math.round(archerGrowthBase  * fg.thePrincess.a);
        } else if (zone.liege === 'thePsychopath') {
          warriorGrowthBase = Math.round(warriorGrowthBase * fg.thePsychopath.w);
          archerGrowthBase  = Math.round(archerGrowthBase  * fg.thePsychopath.a);
        }

        // randRound (orig ř.122-123)
        const warriorGrowth = randRound(warriorGrowthBase, rng);
        const archerGrowth  = randRound(archerGrowthBase,  rng);

        // Scale by numWorkers (orig ř.125-134)
        if ((zone.numWorkers || 0) > 1600) {
          zone.warriors = (zone.warriors || 0) + warriorGrowth * 3;
          zone.archers  = (zone.archers  || 0) + archerGrowth  * 3;
        } else if ((zone.numWorkers || 0) > 500) {
          zone.warriors = (zone.warriors || 0) + warriorGrowth * 2;
          zone.archers  = (zone.archers  || 0) + archerGrowth  * 2;
        } else {
          zone.warriors = (zone.warriors || 0) + warriorGrowth;
          zone.archers  = (zone.archers  || 0) + archerGrowth;
        }

        // Worker drain (orig ř.138-141)
        zone.numWorkers = (zone.numWorkers || 0) - Math.round((archerGrowth + warriorGrowth) / 2);
        if (zone.numWorkers < 1) zone.numWorkers = 1;

        // 25% chance AI buys extra units from gold (orig ř.144-155)
        if (zone.liege !== 'player' && rng.chance(bal.aiBuyUnitChance)) {
          if (!zone.resources) zone.resources = {};
          const gold = zone.resources.gold || 0;
          if (gold > 800) {
            const addWarriors = Math.floor(gold / (400 + rng.next() * 50));
            const addArchers  = Math.floor(gold / (400 + rng.next() * 50));
            zone.resources.gold = Math.round(rng.next() * 0.1 * gold);
            zone.warriors = (zone.warriors || 0) + addWarriors;
            zone.archers  = (zone.archers  || 0) + addArchers;
          }
        }

        // originalLiege drain (orig ř.157-164) — BUG FIX: archres → archers (G-WORLD-ARCHRES)
        if (zone.liege === zone.originalLiege) {
          if ((zone.warriors || 0) > (zone.numWorkers || 0) * 0.5) {
            zone.warriors -= 5;
          }
          if ((zone.archers || 0) > (zone.numWorkers || 0) * 0.5) {
            zone.archers -= 5; // FIXED: orig had zone.archres (bug G-WORLD-ARCHRES)
          }
        }

        zone.warriors = Math.floor(zone.warriors || 0);
        zone.archers  = Math.floor(zone.archers  || 0);
        // homeZone units NOT mirrored in M7a-1 (single source = player.totWarriors/totArchers);
        // mirror into homeZone.warriors/archers deferred to M7a-2 if processAI needs homeZone military rating

      } else {
        // Too few workers → switch to growth (orig ř.171-179)
        // notification skipped (no UI in M7a-1)
        zone.policy = 1;
      }
      break;
    }

    case 0: // resource (default) (orig ř.182-212)
    default: {
      if (!zone.resources) zone.resources = {};
      const trib = zone.tribute || {};
      for (const [itemId, amount] of Object.entries(trib)) {
        if (!zone.resources[itemId]) zone.resources[itemId] = 0;
        zone.resources[itemId] += Math.round(/** @type {number} */ (amount) * (zone.numWorkers || 0));
      }

      // T5: market inject — productive and warring zones affect market supply (design §6.2).
      // marketInject is safe for unknown goodsIds (no-op guard in market.js:106).
      // Clamp [0,max] enforced by marketInject internally (market.js:107).
      const bal5 = BALANCE.world;
      if (zone.liege === zone.originalLiege) {
        // Productive zone (policy resource, liege==originalLiege):
        // inject a fraction of accumulated resources into market supply (+qty).
        // Increases available → pushes price down (more supply). After tribute accumulation. (§6.2)
        const injectFrac = bal5.injectFraction;
        for (const [goodsId, qty] of Object.entries(zone.resources)) {
          const injectQty = Math.floor(/** @type {number} */ (qty) * injectFrac);
          if (injectQty > 0) {
            marketInject(state, goodsId, injectQty);
          }
        }

        // Convert resources to gold if liege == originalLiege (orig ř.191-197)
        const goldVal = getGoldValue(state, zone.resources);
        zone.resources = { gold: goldVal };
      } else {
        // Warring zone (liege != originalLiege):
        // drain market supply (−warConsumption per resource key). Decreases available → pushes price up.
        // Approximated war drain (G-WORLD-INJECT-QTY). (§6.2)
        const warDrain = bal5.warConsumption;
        for (const goodsId of Object.keys(zone.resources)) {
          marketInject(state, goodsId, -warDrain);
        }
      }

      // Worker dynamics by gold (orig ř.200-210)
      if ((zone.numWorkers || 0) > (zone.targetWorkerNum || 0)) {
        zone.numWorkers = (zone.numWorkers || 0) - Math.floor(rng.next() * 20);
      } else {
        if (goldProduction > goldDemand) {
          zone.numWorkers = (zone.numWorkers || 0) + Math.floor(rng.next() * 20);
        }
      }
      if (zone.numWorkers < 1) zone.numWorkers = 1;
      break;
    }
  }

  // ── Gold shortage (orig ř.216-270) ──────────────────────────────────────
  if (goldProduction < goldDemand) {
    const diff = goldDemand - goldProduction;

    if ((zone.goldStore || 0) - diff < 0) {
      zone.goldStore = 0;

      // Unified key: notEnoughGold (G-WORLD-NOTENOUGH: orig had notEnoughgold/notEnoughGold typo — unified)
      if (!zone.notEnoughGold) {
        zone.notEnoughGold = 1;
      } else {
        zone.notEnoughGold++;
        // notifications skipped (no UI in M7a-1)

        if (zone.notEnoughGold > 3) {
          // Lose workers/soldiers (orig ř.247-264)
          const nw = zone.numWorkers || 0;
          const wa = zone.warriors   || 0;
          const ar = zone.archers    || 0;
          const pctWorker = (nw / 5) / ((nw / 5) + ar + wa + 0.0001);

          if (rng.next() <= pctWorker) {
            zone.numWorkers = nw - Math.floor(rng.next() * nw * zone.notEnoughGold / 40);
          } else {
            const pctWarrior = wa / (wa + ar + 0.0001);
            if (rng.next() <= pctWarrior) {
              zone.warriors = Math.max(0, wa - Math.floor(rng.next() * 3 * zone.notEnoughGold));
            } else {
              zone.archers  = Math.max(0, ar - Math.floor(rng.next() * 3 * zone.notEnoughGold));
            }
          }
        }
      }
    } else {
      zone.goldStore = (zone.goldStore || 0) - diff;
      zone.notEnoughGold = 0;
    }
  }

  // ── Revolt (gated, M7a-2 stub) (§2.2.4, §16) ────────────────────────────
  if (state.engine.curStep > BALANCE.world.revoltMechanicStart) {
    // M7a-2 implementation — no-op placeholder
  }

  // ── Quest (gated, M7a-2 stub) (§2.2.5, §16) ─────────────────────────────
  // M7a-2 implementation — no-op

  // ── Ratings (orig ř.490-493) — derived, not persisted ────────────────────
  // NOTE: ratings computed on-demand by selectors (not stored on zone to preserve hashState determinism)
}

// ─── worldTick ────────────────────────────────────────────────────────────────

/**
 * World tick – day edge, order 30.
 * Day-index round-robin: processes 1 zone per day via monotonic _absDay.
 * Design §2.1 (M-1 fix): uses _absDay, NOT curStep % dist.
 * Bezstavový (no cursor in state.world).
 *
 * @param {GameState} state
 * @param {object} _params
 * @param {TickContext} _ctx
 * @returns {void}
 */
export function worldTick(state, _params, _ctx) {
  const zones = state.world.zones;
  if (!Array.isArray(zones) || zones.length === 0) return;

  const rng = makeRng(state, 'world');
  const len = zones.length;
  const day = state.season._absDay;                            // monotonic day-index (calendar.js:53)
  const PERIOD_DAYS = BALANCE.world.zonePeriodDays;            // = 5
  const slot = Math.max(1, Math.ceil(PERIOD_DAYS / len));     // daysPerZoneSlot ≥ 1

  if (day % slot === 0) {                                       // gate: only on slot-boundary days
    const zoneIndex = Math.floor(day / slot) % len;           // round-robin index (bezstavový)
    const zone = /** @type {any} */ (zones[zoneIndex]);
    if (zone && zone.id) {
      processZone(state, zone.id, rng);
    }
  }
}

// ─── migrateFavour ────────────────────────────────────────────────────────────

/**
 * Deterministic favour migration: number→{} (§3.1 design, M7a-2 M-1).
 * Branch order is MANDATORY (saved object > saved number > def object > {}).
 * @param {unknown} savedFavour
 * @param {unknown} defFavour
 * @returns {Record<string, number>}
 */
function migrateFavour(savedFavour, defFavour) {
  // 1) saved is object (M7a-2 save with real data) → deep-copy (no shared ref)
  if (savedFavour && typeof savedFavour === 'object') return { .../** @type {any} */ (savedFavour) };
  // 2) saved is number (old M7a-1 save: favour:0) → migrate to {} (lossless, §3.1.1)
  if (typeof savedFavour === 'number') return {};
  // 3) saved missing → use catalog default; def is already {} (point 1), guard for old catalog number
  if (defFavour && typeof defFavour === 'object') return { .../** @type {any} */ (defFavour) };
  return {};  // def number or undefined → {}
}

// ─── hydrateZones ─────────────────────────────────────────────────────────────

/**
 * Re-hydrate world.zones and world.factions from zones catalog (static) + saved dynamic state.
 * Shared path for BOTH createInitialState AND load.js (M5-R1 gate — no load-only branch).
 * id-based merge: catalog order wins, dynamic state merged by id, stale tail discarded.
 *
 * Design §8.1.b (M-2 fix), pattern: rebuildBuildingDerived.
 *
 * @param {import('../state/types.js').GameState} state
 */
export function hydrateZones(state) {
  if (!hasCatalog('zones')) {
    // Catalog not loaded (tests without catalog, or pre-catalog boot): leave world.zones as-is
    return;
  }

  const cat = /** @type {any} */ (getCatalog('zones'));
  const catalogDef = cat && cat.zones ? cat.zones : cat;

  // ── Zones hydration ───────────────────────────────────────────────────────
  const catalogZones = Array.isArray(catalogDef.zones) ? catalogDef.zones : [];
  const savedZones = Array.isArray(state.world.zones) ? state.world.zones : [];

  // Build id-based map of saved dynamic state
  /** @type {Map<string, any>} */
  const byId = new Map(savedZones.map((/** @type {any} */ z) => [z.id, z]));

  // Re-construct zones array in catalog order, merging dynamic state per id
  const bal = BALANCE.world;
  state.world.zones = catalogZones.map((/** @type {any} */ def) => {
    const saved = byId.get(def.id);
    const warriors    = saved?.warriors      ?? def.warriors      ?? 0;
    const archers     = saved?.archers       ?? def.archers       ?? 0;
    const numWorkers  = saved?.numWorkers    ?? def.numWorkers    ?? 0;
    return {
      // STATIC from catalog (always from def — overrides any stale save)
      id:              def.id,
      name:            def.name,
      originalLiege:   def.originalLiege,
      neighbours:      def.neighbours     || [],
      targetWorkerNum: def.targetWorkerNum || 0,
      warriorGrowth:   def.warriorGrowth   || 0,
      archerGrowth:    def.archerGrowth    || 0,
      immunity:        def.immunity        || 0,
      // DYNAMIC from save, else catalog defaults (fresh start values)
      liege:         saved?.liege         ?? def.liege         ?? def.originalLiege,
      policy:        saved?.policy        ?? def.policy        ?? 1,
      numWorkers,
      warriors,
      archers,
      resources:     saved?.resources     ?? {},
      tribute:       saved?.tribute       ?? def.tribute       ?? {},
      favour:        migrateFavour(saved?.favour, def.favour),
      goldStore:     saved?.goldStore     ?? 0,
      notEnoughGold: saved?.notEnoughGold ?? 0,
      curQuest:      saved?.curQuest      ?? null,
      // SEMI-DERIVED — use saved value if available (persisted for M-2 hashState determinism),
      // else compute from current warriors/archers/numWorkers as initial default.
      goldDemand:    saved?.goldDemand    ?? bal.goldDemandPerUnit * (warriors + archers),
      goldProduction:saved?.goldProduction ?? bal.goldProdPerWorker * numWorkers,
    };
  });

  // ── Factions hydration ────────────────────────────────────────────────────
  const catalogFactions = Array.isArray(catalogDef.factions) ? catalogDef.factions : [];
  const savedFactions = (state.world.factions && typeof state.world.factions === 'object')
    ? state.world.factions
    : {};

  /** @type {Record<string, any>} */
  const hydratedFactions = {};
  for (const def of catalogFactions) {
    if (!def.id) continue;
    const saved = /** @type {any} */ (savedFactions)[def.id] || {};
    hydratedFactions[def.id] = {
      // STATIC from catalog
      id:         def.id,
      name:       def.name,
      capitalId:  def.capitalId  || null,
      aggression: def.aggression || 0,
      backstab:   def.backstab   || 0,
      allies:     def.allies     || [],
      recallMin:  def.recallMin  || { w: 0, a: 0 },
      unitStats:  def.unitStats  || { warriors: { strength: 1, defense: 1 }, archers: { strength: 1, defense: 1 } },
      // DYNAMIC from save, else defaults
      state:       saved.state        ?? 0,
      wantToAttack:saved.wantToAttack ?? false,
      nextTarget:  saved.nextTarget   ?? null,
      allies_dyn:  saved.allies_dyn   ?? [],
    };
  }
  state.world.factions = hydratedFactions;

  // M7a-2: init world.quests/questSeq if absent (persist §10, G-QUEST-PERSIST)
  const w = /** @type {any} */ (state.world);
  if (!Array.isArray(w.quests)) w.quests = [];
  if (typeof w.questSeq !== 'number') w.questSeq = 0;
}

// ─── AI helpers ───────────────────────────────────────────────────────────────

/**
 * Get faction by id from state.world.factions (hydrated Record).
 * @param {any} state
 * @param {string} factionId
 * @returns {any|undefined}
 */
function getFaction(state, factionId) {
  return state.world?.factions?.[factionId];
}

/**
 * Get zone by id from state.world.zones.
 * @param {any} state
 * @param {string} zoneId
 * @returns {any|undefined}
 */
function getZone(state, zoneId) {
  return Array.isArray(state.world?.zones)
    ? state.world.zones.find((/** @type {any} */ z) => z.id === zoneId)
    : undefined;
}

/**
 * Get capital zone of faction (data-driven from faction.capitalId).
 * Source of truth: catalog faction.capitalId (not originál hardcode).
 * @param {any} state
 * @param {string} factionId
 * @returns {any|undefined}
 */
function getCapital(state, factionId) {
  const faction = getFaction(state, factionId);
  if (!faction || !faction.capitalId) return undefined;
  return getZone(state, faction.capitalId);
}

/**
 * Calculate military rating of a zone (derived, not persisted).
 * Source: original world.js ř.607-618.
 * @param {any} state
 * @param {any} zone
 * @returns {number}
 */
function calcMilitaryRating(state, zone) {
  if (!zone) return 0;
  if (zone.immunity) return 99999999;
  const liege = getFaction(state, zone.liege);
  const bal = BALANCE.world;
  const ws = liege?.unitStats?.warriors ?? { strength: 1, defense: 1 };
  const as = liege?.unitStats?.archers  ?? { strength: 1, defense: 1 };
  return (zone.warriors || 0) * (ws.strength * 2 + ws.defense)
       + (zone.archers  || 0) * (as.strength * 2 + as.defense)
       + bal.baseMilitaryRating;
}

/**
 * Calculate economic rating of a zone (derived, not persisted).
 * Source: original world.js ř.620-634.
 * @param {any} state
 * @param {any} zone
 * @returns {number}
 */
function calcEconomicRating(state, zone) {
  if (!zone) return 0;
  if (zone.liege === 'player') {
    // Player capital: inventory gold value + player.gold
    const p = /** @type {any} */ (state.player);
    return getGoldValue(state, p?.inventory ?? {}) + (p?.gold ?? 0);
  }
  return getGoldValue(state, zone.resources ?? {}) + (zone.numWorkers || 0) * 1000;
}

/**
 * Find neighbouring zones of a faction (not owned by it).
 * Source: original world.js ř.993-1016 (1:1, data-driven).
 * @param {any} state
 * @param {string} factionId
 * @returns {any[]}
 */
function findNeighboursOf(state, factionId) {
  const zones = state.world?.zones;
  if (!Array.isArray(zones)) return [];
  const owned = zones.filter((/** @type {any} */ z) => z.liege === factionId);
  /** @type {any[]} */
  const neighbours = [];
  for (const zone of owned) {
    const neighbs = zone.neighbours || [];
    for (const nId of neighbs) {
      const n = getZone(state, nId);
      if (n && n.liege !== factionId && !neighbours.includes(n)) {
        neighbours.push(n);
      }
    }
  }
  return neighbours;
}

/**
 * Redistribute faction forces across owned zones and capital.
 * Source: original world.js ř.636-742 (1:1, Math.random→rng).
 * @param {any} state
 * @param {string} factionId
 * @param {{ next: () => number }} rng
 */
function redistributeForces(state, factionId, rng) {
  const faction = getFaction(state, factionId);
  const capital = getCapital(state, factionId);
  if (!faction || !capital) return;

  const zones = state.world?.zones;
  if (!Array.isArray(zones)) return;

  let defenseRatio = 0.5;
  if (rng.next() < faction.aggression) {
    defenseRatio = 0.1;
    faction.wantToAttack = true;
  }

  // Gather all owned zones, pool troops, zero out zone troops
  /** @type {{ zone: any, minRating: number }[]} */
  const vassals = [];
  let totalAvailableWarriors = 0;
  let totalAvailableArchers = 0;
  let totalReqMilitaryRating = 0;

  for (const zone of zones) {
    if (zone.liege === factionId) {
      totalAvailableWarriors += (zone.warriors || 0);
      totalAvailableArchers  += (zone.archers  || 0);
      zone.warriors = 0;
      zone.archers  = 0;

      let requiredMilitaryRating = 0;
      /** @type {string[]} */
      const considered = [];
      for (const nId of (zone.neighbours || [])) {
        const nZ = getZone(state, nId);
        if (nZ && nZ.liege !== factionId &&
            (nZ.liege === 'player' || nZ.liege === 'theWarlord' ||
             nZ.liege === 'thePsychopath' || nZ.liege === 'thePrincess')) {
          if (!considered.includes(nZ.liege)) {
            const capZ = getCapital(state, nZ.liege);
            requiredMilitaryRating += capZ ? calcMilitaryRating(state, capZ) : 0;
            considered.push(nZ.liege);
          }
        }
      }
      requiredMilitaryRating += Math.min(120, Math.floor(requiredMilitaryRating * 0.05));
      totalReqMilitaryRating += requiredMilitaryRating;
      vassals.push({ zone, minRating: requiredMilitaryRating });
    }
  }

  // AI cheats: +10% troops (original ř.681-682)
  totalAvailableWarriors = Math.round(totalAvailableWarriors * 1.1);
  totalAvailableArchers  = Math.round(totalAvailableArchers  * 1.1);

  // Recall minimum to capital (from catalog recallMin, not original hardcode)
  const rm = faction.recallMin || { w: 0, a: 0 };
  if (totalAvailableWarriors >= rm.w) {
    capital.warriors = (capital.warriors || 0) + rm.w;
    totalAvailableWarriors -= rm.w;
  } else {
    capital.warriors = (capital.warriors || 0) + totalAvailableWarriors;
    totalAvailableWarriors = 0;
  }
  if (totalAvailableArchers >= rm.a) {
    capital.archers = (capital.archers || 0) + rm.a;
    totalAvailableArchers -= rm.a;
  } else {
    capital.archers = (capital.archers || 0) + totalAvailableArchers;
    totalAvailableArchers = 0;
  }

  // Sort vassals: most demanding first
  vassals.sort((a, b) => b.minRating - a.minRating);
  if (totalReqMilitaryRating < 1) totalReqMilitaryRating = 1;

  // Distribute proportionally
  for (const vassal of vassals) {
    const wAmt = Math.floor(vassal.minRating * totalAvailableWarriors * defenseRatio / totalReqMilitaryRating
                          + totalAvailableWarriors * defenseRatio * 0.8 / vassals.length);
    const aAmt = Math.floor(vassal.minRating * totalAvailableArchers * defenseRatio / totalReqMilitaryRating
                          + totalAvailableArchers * defenseRatio * 0.8 / vassals.length);
    vassal.zone.warriors = wAmt;
    vassal.zone.archers  = aAmt;
    totalAvailableWarriors -= wAmt;
    totalAvailableArchers  -= aAmt;
  }

  // Remainder to capital
  capital.warriors = (capital.warriors || 0) + totalAvailableWarriors;
  capital.archers  = (capital.archers  || 0) + totalAvailableArchers;
}

// ─── processAI ────────────────────────────────────────────────────────────────

/**
 * Faction AI state machine (processAI).
 * Source: original world.js ř.743-991 (1:1, RNG isolated, Engine.insert→scheduleInsert).
 * States: 0=default, 1=growPop, 2=growMil, 3=growRes, 4=prepAttack, 5=annoAttack,
 *         6=attacking, 7=incapacitated.
 * Odchylky: Math.random→rng.next(), Engine.insert→scheduleInsert (K17, params objekt),
 *           lookups přes helpery (ne $rootScope), spy check přeskočen pokud player.spy absent (G-SPY-ABSENT).
 * @param {any} state
 * @param {string} factionId
 * @param {{ next: () => number, chance: (p:number) => boolean, int: (n:number) => number }} rng
 */
export function processAI(state, factionId, rng) {
  const faction = getFaction(state, factionId);
  if (!faction) return;

  // Only process known AI factions
  if (factionId !== 'theWarlord' && factionId !== 'thePrincess' && factionId !== 'thePsychopath') return;

  const capital = getCapital(state, factionId);
  if (!capital) return;

  const curStep = state.engine.curStep;

  if (faction.state === 7) {
    // incapacitated – do nothing (terminal state)
    return;
  }

  if (faction.state === 0) {
    // default: redistribute, find weakest neighbour, decide next state
    if (rng.next() < 0.5 && !faction.wantToAttack) {
      redistributeForces(state, factionId, rng);
    }

    const potentialTargets = findNeighboursOf(state, factionId);

    if (potentialTargets.length > 0) {
      const capMilRating = calcMilitaryRating(state, capital);
      const capEcoRating = calcEconomicRating(state, capital);

      const backstab = (rng.next() > faction.backstab);

      // Remove allies (unless backstab) and immune targets
      for (let i = potentialTargets.length - 1; i >= 0; i--) {
        const target = potentialTargets[i];
        if ((faction.allies || []).indexOf(target.liege) >= 0 && !backstab) {
          potentialTargets.splice(i, 1);
          continue;
        }
        if (target.immunity) {
          potentialTargets.splice(i, 1);
        }
      }

      if (potentialTargets.length > 0) {
        // Find weakest by militaryRating
        let weakestTarget = potentialTargets[0];
        let weakestMilRating = calcMilitaryRating(state, weakestTarget);
        for (let i = 1; i < potentialTargets.length; i++) {
          const tRating = calcMilitaryRating(state, potentialTargets[i]);
          if (tRating < weakestMilRating) {
            weakestMilRating = tRating;
            weakestTarget = potentialTargets[i];
          }
        }

        if (capMilRating < weakestMilRating * 1.5) {
          const weakEcoRating = calcEconomicRating(state, weakestTarget);
          if (capEcoRating < weakEcoRating) {
            faction.state = 3; // growing resources
          } else {
            faction.state = 2; // growing military
          }
        } else {
          if (rng.next() < faction.aggression) {
            faction.state = 4; // preparing for war
            faction.nextTarget = weakestTarget.id;
          } else {
            faction.state = 1; // grow population
          }
        }
      } else {
        faction.state = 0;
      }
    } else {
      // No potential targets
      if (capital.liege === factionId) {
        // Faction has taken over everything → incapacitated guard (actually this is "won")
        // Original: console.log(character.name + ' has already taken over everything')
        // No state change in original here (stays at 0)
      } else {
        // Capital lost → incapacitated
        faction.state = 7;
      }
    }

  } else if (faction.state === 1) {
    // growPop: capital policy=1; 30% rng convert resources→gold
    capital.policy = 1;
    if (rng.next() < 0.3) {
      const goldVal = getGoldValue(state, capital.resources || {});
      capital.resources = { gold: goldVal };
    }
    faction.state = 0;

  } else if (faction.state === 2) {
    // growMil: vassal policies→2 (50% rng); weakest-AI bonus; capital policy=2
    const zones = state.world?.zones;
    if (Array.isArray(zones)) {
      for (const zone of zones) {
        if (zone.liege === factionId && zone.policy !== 2 && rng.next() < 0.5) {
          zone.policy = 2;
        }
      }
    }

    // Find weakest AI by capital units (not player, not incapacitated)
    const allFactionIds = ['player', 'thePrincess', 'theWarlord', 'thePsychopath'];
    /** @type {Record<string, number>} */
    const totalUnits = {};
    for (const fid of allFactionIds) {
      const f = getFaction(state, fid);
      const cap = getCapital(state, fid);
      if (f && fid !== 'player' && f.state !== 7 && cap) {
        totalUnits[fid] = (cap.warriors || 0) + (cap.archers || 0);
      }
    }

    // Find smallest
    let smallest = allFactionIds[0];
    for (const fid of allFactionIds) {
      if (totalUnits[fid] !== undefined) {
        if (totalUnits[smallest] === undefined || totalUnits[fid] < totalUnits[smallest]) {
          smallest = fid;
        }
      }
    }

    // Weakest AI bonus
    if (smallest === factionId) {
      capital.warriors = (capital.warriors || 0) + Math.floor(rng.next() * 15);
      capital.archers  = (capital.archers  || 0) + Math.floor(rng.next() * 10);
    }

    capital.policy = 2;
    faction.state = 0;

  } else if (faction.state === 3) {
    // growRes: capital policy=0
    capital.policy = 0;
    faction.state = 0;

  } else if (faction.state === 4) {
    // prepAttack: spy detection (G-SPY-ABSENT: skip if spy absent); → state 5
    const spyStats = /** @type {any} */ (state.player)?.spy;
    if (spyStats) {
      const spies = spyStats.deployed;
      if (Array.isArray(spies)) {
        for (const spy of spies) {
          if (spy.location === capital.id && rng.next() < (spyStats.successRate || 0)) {
            scheduleInsert(state, curStep + 50, 'warningAIAttacking', { factionId });
          }
        }
      }
    }
    faction.state = 5;

  } else if (faction.state === 5) {
    // annoAttack: spy detection (G-SPY-ABSENT); → state 6
    const spyStats = /** @type {any} */ (state.player)?.spy;
    if (spyStats) {
      const spies = spyStats.deployed;
      if (Array.isArray(spies)) {
        for (const spy of spies) {
          if (spy.location === capital.id && rng.next() < (spyStats.successRate || 0)) {
            scheduleInsert(state, curStep + 50, 'dangerAIAttacking', { factionId });
          }
        }
      }
    }
    faction.state = 6;

  } else if (faction.state === 6) {
    // attacking
    scheduleInsert(state, curStep + 0, 'AIIsAttacking', { factionId });
    const nextTargetZone = getZone(state, faction.nextTarget);
    if (nextTargetZone) {
      if (nextTargetZone.liege === 'player') {
        // vs player → M7b stub
        scheduleInsert(state, curStep + 100, 'startBattle', {
          attackerId: factionId,
          targetZoneId: faction.nextTarget,
        });
      } else {
        // vs AI → aiBattleResolve (1:1 original ř.952-981)
        const targetLiegeFaction = getFaction(state, nextTargetZone.liege);
        if (targetLiegeFaction) {
          const ws = faction.unitStats?.warriors ?? { strength: 1 };
          const as = faction.unitStats?.archers  ?? { strength: 1 };
          const dws = targetLiegeFaction.unitStats?.warriors ?? { strength: 1 };
          const das = targetLiegeFaction.unitStats?.archers  ?? { strength: 1 };

          const warrResults = Math.max(
            (ws.strength * (capital.warriors || 0)
              - (nextTargetZone.warriors || 0) * dws.strength * rng.next() * 0.5 + 0.7)
            / ws.strength,
            0
          );
          const archResults = Math.max(
            (as.strength * (capital.archers || 0)
              - (nextTargetZone.archers || 0) * das.strength * rng.next() * 0.5 + 0.7)
            / as.strength,
            0
          );

          if (warrResults + archResults > 0) {
            // Attacker wins
            capital.warriors = Math.floor(rng.next() * 1.4 * warrResults);
            capital.archers  = Math.floor(rng.next() * 1.4 * archResults);
            nextTargetZone.archers  = Math.floor(rng.next() * 0.3 * archResults);
            nextTargetZone.warriors = Math.floor(rng.next() * 0.3 * warrResults);
            scheduleInsert(state, curStep + 400, 'world.takeOver', {
              attackerId: factionId,
              targetZoneId: faction.nextTarget,
            });
            if (factionId === 'thePsychopath') {
              nextTargetZone.warriors = (nextTargetZone.warriors || 0)
                + Math.floor((nextTargetZone.numWorkers || 0) * rng.next() * 0.7);
              nextTargetZone.numWorkers = 1;
            }
            faction.nextTarget = null;
          } else {
            // Attacker loses
            capital.warriors = Math.floor(rng.next() * 0.2 * (capital.warriors || 0));
            capital.archers  = Math.floor(rng.next() * 0.2 * (capital.archers  || 0));
            nextTargetZone.archers  = Math.floor(rng.next() * 0.7 * (nextTargetZone.archers  || 0));
            nextTargetZone.warriors = Math.floor(rng.next() * 0.7 * (nextTargetZone.warriors || 0));
          }
          redistributeForces(state, factionId, rng);
        }
      }
    }
    faction.state = 0;
    faction.wantToAttack = false;
  }
}

// ─── Schedule handlers ────────────────────────────────────────────────────────

/**
 * Schedule handler: world.processFaction — AI turn for one faction.
 * Self-re-arms UNCONDITIONALLY (anti-DR-012-02): entry never disappears,
 * even below aiMechanicStart threshold or when faction is incapacitated.
 * @param {any} state
 * @param {{ factionId?: string }} params
 * @param {any} _ctx
 */
function processFaction(state, params, _ctx) {
  const factionId = params && params.factionId;
  if (!factionId) return;

  const faction = getFaction(state, factionId);
  if (!faction) return; // faction gone → no-op (idempotent)

  // Gate: only process AI after aiMechanicStart threshold
  if (state.engine.curStep > BALANCE.world.aiMechanicStart) {
    if (faction.state !== 7) { // 7=incapacitated → skip processAI but still re-arm
      const rng = makeRng(state, 'world');
      processAI(state, factionId, rng);
    }
  }

  // SELF-REARM: unconditional (anti-DR-012-02) — schedule entry never disappears
  const period = BALANCE.world.aiTurnPeriod;
  scheduleInsert(state, state.engine.curStep + period, 'world.processFaction', { factionId });
}

/**
 * Schedule handler: world.takeOver — AI faction takes over a zone.
 * Source: original changeZoneLiege (ř.496+).
 * @param {any} state
 * @param {{ attackerId?: string, targetZoneId?: string }} params
 * @param {any} _ctx
 */
function takeOver(state, params, _ctx) {
  const { attackerId, targetZoneId } = params || {};
  if (!attackerId || !targetZoneId) return;
  const zone = getZone(state, targetZoneId);
  if (!zone) return;
  zone.liege = attackerId;
  // Clear curQuest on zone change (original ř.500+)
  zone.curQuest = null;
}

/** M7b stub: startBattle — AI vs player, battle automat is M7b. No-op until M7b. */
function startBattleStub(/** @type {any} */ _state, /** @type {any} */ _params, /** @type {any} */ _ctx) { /* M7b stub */ }
/** M8 stub: warningAIAttacking — spy warning. No-op until M8. */
function warningAIAttackingStub(/** @type {any} */ _state, /** @type {any} */ _params, /** @type {any} */ _ctx) { /* M8 stub */ }
/** M8 stub: dangerAIAttacking — spy danger. No-op until M8. */
function dangerAIAttackingStub(/** @type {any} */ _state, /** @type {any} */ _params, /** @type {any} */ _ctx) { /* M8 stub */ }
/** M8 stub: AIIsAttacking — attack announcement. No-op until M8. */
function AIIsAttackingStub(/** @type {any} */ _state, /** @type {any} */ _params, /** @type {any} */ _ctx) { /* M8 stub */ }

/**
 * Register world AI schedule handlers into registry.
 * Mirror of registerContractEffects — idempotent (module-level fn refs).
 * Registers: world.processFaction, world.takeOver, AIIsAttacking, startBattle (M7b stub),
 *   warningAIAttacking, dangerAIAttacking (M8 stubs).
 * @param {import('../registry/registry.js').Registry} reg
 */
export function registerWorldEffects(reg) {
  register(reg, 'world.processFaction', processFaction);
  register(reg, 'world.takeOver', takeOver);
  register(reg, 'AIIsAttacking', AIIsAttackingStub);
  register(reg, 'startBattle', startBattleStub);
  register(reg, 'warningAIAttacking', warningAIAttackingStub);
  register(reg, 'dangerAIAttacking', dangerAIAttackingStub);
}

/**
 * Idempotent arm of AI faction schedulers (per-faction set-difference guard).
 * Mirror of armContractOffer. Called ONCE from bootSequence after armContractOffer.
 * Per-faction guard: scan schedule for existing world.processFaction entries per factionId,
 * insert ONLY missing factions in fixed order (deterministic).
 * Anti-DR-012-02: covers fresh + M7a-2 save + old M7a-1 save in ONE path.
 * NEVER uses scheduleCountOf (can't distinguish factions, only counts by id).
 * @param {any} state
 */
export function armFactionAI(state) {
  // Fixed faction order (deterministic — seq tie-break ensures order)
  const factionIds = ['theWarlord', 'thePrincess', 'thePsychopath'];

  // 1) Scan which factions already have a pending processFaction entry
  const live = new Set(
    (state.engine.schedule || [])
      .filter((/** @type {any} */ e) => e.id === 'world.processFaction')
      .map((/** @type {any} */ e) => e.params && e.params.factionId)
  );

  // 2) Insert only missing factions in deterministic order
  const step = Math.max(state.engine.curStep, 1);
  for (const fid of factionIds) {
    if (!live.has(fid)) {
      scheduleInsert(state, step, 'world.processFaction', { factionId: fid });
    }
  }
}
