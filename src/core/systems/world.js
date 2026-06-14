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
      favour:        saved?.favour        ?? (def.favour       ?? 0),
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
}
