/**
 * Battle system — M7b T1+T2 full implementation.
 * iter-018. Design DESIGN-018-001.
 *
 * Fills the battle.js stub (contract §8.1):
 *   battleStep(bs, commands, rng) → bs'  PURE, no shared-state mutation
 *   battleTick(state, params, ctx)        system adapter (sub-step accumulator §3.1)
 *   createBattleState(state, zone, faction, isBandit)
 *
 * Invariants (MUST, review gate):
 *   F-1  Serializability: no cyclic refs, no functions, no undefined, liege=string, lastAttackId=string|null
 *   G2   auto-resolve == live: same battleStep, commands=[] → defensive AI plays
 *   M-1  baseRevival: state.player.baseRevival ?? BALANCE.battle.baseRevivalDefault (??  not ||)
 *   M-2  opponent cd double-decrement: cd-- after attackWith, every tick incl. attack tick
 *   M-3  crit: rng.next() exactly 1× per attack-with-focus AFTER guard, not per target, not 2×
 */

import { BALANCE } from '../balance/balance.js';
import { battleDamage, battleDefense, revivePlayer, reviveAI } from '../balance/formulas.js';
import { makeRng } from '../engine/rng.js';
import { STEP_MS } from '../engine/clock.js';
import { scheduleInsert, scheduleCountOf } from '../engine/scheduler.js';
import { getCatalog, hasCatalog } from '../catalog/index.js';
import { grant, pay, canAfford } from '../resources/transactions.js';

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('../state/types.js').TickContext} TickContext
 * @typedef {import('../engine/rng.js').Rng} Rng
 */

/**
 * @typedef {{ zoneId: string, sides: {player: any, opponent: any}, state: 'setup'|'running'|'done', tick: number, log: any[], summary: any, subAccMs: number, queue: any[], reaction: number, startedAtStep: number, attackerSide: string, banditLoot: any, meta: any }} BattleState
 */

/** Battle tick duration in ms. 1:1 original (var tick = 30). */
const BATTLE_TICK_MS = BALANCE.battle.battleTickMs;  // 30

/**
 * Attacks catalog (1:1 original battle.js ř.586-629).
 * Inline fallback — loaded from military.json via catalog system at runtime when available.
 * Source: doc/original_source/modules/prosperity/services/battle.js ř.586-629.
 */
const ATTACKS_FALLBACK = Object.freeze({
  warriors: [
    { id: 'charge',     name: 'Charge',      multiplier: 1,   cd: 80,  focus: ['warriors', 'archers'] },
    { id: 'shieldWall', name: 'Shield Wall', multiplier: 0,   cd: 150, focus: [] },
    { id: 'flank',      name: 'Flank',       multiplier: 1.8, cd: 180, focus: ['archers', 'warriors'] },
  ],
  archers: [
    { id: 'volley',     name: 'Volley',      multiplier: 0.7, cd: 120, focus: ['archers', 'warriors'] },
    { id: 'fireArrows', name: 'Fire Arrows', multiplier: 1.5, cd: 220, focus: ['archers', 'warriors'] },
  ],
});

/**
 * Get attacks catalog. Uses military.json _battle.attacks if loaded, else inline fallback.
 * @returns {{ warriors: any[], archers: any[] }}
 */
function getAttacks() {
  if (hasCatalog('military')) {
    const mil = /** @type {any} */ (getCatalog('military'));
    if (mil && mil._battle && mil._battle.attacks) return mil._battle.attacks;
  }
  return /** @type {any} */ (ATTACKS_FALLBACK);
}

/**
 * Deep clone a Side + its two Unit objects.
 * Only clones sides-level data; subAccMs/queue/meta cloned shallowly at bs level.
 * @param {any} side
 * @returns {any}
 */
function cloneSide(side) {
  return {
    ...side,
    warriors: { ...side.warriors },
    archers:  { ...side.archers },
  };
}

/**
 * Deep clone the BattleState top-level plus sides (invariant n-2).
 * subAccMs/queue/log/summary/meta are plain-value or array, cloned shallowly.
 * @param {BattleState} bs
 * @returns {BattleState}
 */
function cloneBs(bs) {
  return /** @type {BattleState} */ ({
    ...bs,
    sides: {
      player:   cloneSide(bs.sides.player),
      opponent: cloneSide(bs.sides.opponent),
    },
    log: bs.log ? [...bs.log] : [],
    summary: bs.summary ? {
      winner:      bs.summary.winner,
      p_warriors:  { ...bs.summary.p_warriors },
      p_archers:   { ...bs.summary.p_archers },
      o_warriors:  { ...bs.summary.o_warriors },
      o_archers:   { ...bs.summary.o_archers },
    } : null,
  });
}

/**
 * Add a log entry (prepend like original `unshift`).
 * @param {any[]} log
 * @param {string} msg
 * @param {string|null} [nameClass]
 */
function battleLog(log, msg, nameClass) {
  log.unshift([msg, nameClass ?? null]);
}

/**
 * Apply an attack from `units` against `targetSide`.
 * 1:1 port of original attackWith (ř.465-584).
 *
 * INVARIANTS:
 *   - lastAttackId set BEFORE guard (so even failed attacks update it, matching orig ř.469)
 *   - crit roll (rng.next()) EXACTLY 1× per attack-with-focus, AFTER guard (M-3)
 *   - no crit roll for attacks without focus (shieldWall/rally/retreat)
 *   - targetSide passed as parameter — NO army self-ref on Unit (F-1)
 *
 * @param {any} units - attacking unit block (playerSide.warriors etc.)
 * @param {any} attack - attack definition {id, name, multiplier, cd, focus}
 * @param {any} targetSide - opposing side object
 * @param {BattleState} bs - mutated (log, summary)
 * @param {Rng} rng - rng stream 'battle'
 * @param {string} attackerLiegeId - 'player' or faction id (for summary tracking)
 */
function attackWith(units, attack, targetSide, bs, rng, attackerLiegeId) {
  // (1) Record last attack id — string only (F-1: no object ref, orig ř.469)
  units.lastAttackId = attack.id;

  // (2) Guard: must have units AND be off cooldown
  if (!(units.number > 0)) {
    battleLog(bs.log, 'No units to use this attack');
    return;
  }
  if (units.cd !== 0) {
    battleLog(bs.log, 'Your ' + units.type + ' are on cooldown: ' + (units.cd * BATTLE_TICK_MS / 1000));
    return;
  }

  // (3) Set cooldown
  units.cd = attack.cd;
  units.lastMaxCD = attack.cd;
  // thumbRing tech: if player's archers and tech unlocked → cd * 0.9 (orig ř.478-481)
  // Applied via serializable boolean flag in bs.meta (F-1: no object ref)
  if (units.type === 'archers' && bs.meta && bs.meta.thumbRing) {
    units.cd = Math.trunc(0.9 * units.cd);
  }

  // (4) Attacks without focus (shieldWall / rally / retreat) — NO crit roll
  if (attack.focus.length === 0) {
    // shieldWall: passive effect checked in defense calculation
    // rally/retreat: MVP skip (orig ř.565-572: TODO stubs, never completed)
    battleLog(bs.log, attack.name + ' used');
    return;
  }

  // (5) Attack with focus — crit roll EXACTLY 1× HERE, after guard (M-3)
  const critRoll = rng.next() < units.critChance;
  let damage = battleDamage(units.number, units.strength, attack.multiplier, critRoll);

  // Loop through focus targets (orig ř.491-555)
  for (let i = 0; i < attack.focus.length && damage > 0; i++) {
    const focusType = attack.focus[i];
    const focus = targetSide[focusType];
    if (!focus || focus.number <= 0) continue;

    const defense = battleDefense(focus.number, units.number, focus.defense);

    // shieldWall double-defense check (orig ř.501): string id comparison (F-1)
    let effectiveDefense = defense;
    if (focus.type === 'warriors' && focus.lastAttackId === 'shieldWall' && focus.cd > 0) {
      effectiveDefense *= 2;
    }

    const dmg = Math.min(Math.floor(damage / effectiveDefense), focus.number);
    const d0 = focus.number * effectiveDefense; // effort it would've taken

    damage -= d0; // reduce effort from total damage (orig ř.508)

    // Apply casualties
    focus.number -= dmg;
    focus.casualties += dmg;
    targetSide.number -= dmg;

    // Summary tracking (orig ř.522-548)
    if (attackerLiegeId === 'player') {
      if (units.type === 'archers')   bs.summary.p_archers.kills  += dmg;
      if (units.type === 'warriors')  bs.summary.p_warriors.kills += dmg;
    } else {
      if (units.type === 'archers')   bs.summary.o_archers.kills  += dmg;
      if (units.type === 'warriors')  bs.summary.o_warriors.kills += dmg;
    }

    const targetIsPlayer = (targetSide.liege === 'player');
    if (targetIsPlayer) {
      if (focusType === 'warriors')  bs.summary.p_warriors.casualties += dmg;
      if (focusType === 'archers')   bs.summary.p_archers.casualties  += dmg;
    } else {
      if (focusType === 'warriors')  bs.summary.o_warriors.casualties += dmg;
      if (focusType === 'archers')   bs.summary.o_archers.casualties  += dmg;
    }

    // Log (orig ř.550)
    const who = (attackerLiegeId === 'player') ? 'Your troops' : (units.liege || attackerLiegeId);
    battleLog(bs.log, who + ' incapacitated ' + dmg + ' ' + focusType + ' with ' + attack.name, targetSide.liege);
  }
}

/**
 * Execute one battle tick. PURE — returns a new BattleState, never mutates input.
 * 1:1 port of the $interval fight-loop (orig ř.224-294).
 *
 * Step order (§3.3):
 *  1. End check (tick % endCheckPeriod === endCheckPhase)
 *  2. Player cd-down (warriors → archers, clamp ≥ 0) [orig ř.239-247]
 *  3. Apply player commands from queue
 *  4. Defensive AI for player (if commands empty) [G2 — same code path]
 *  5. Opponent AI (reaction-gated, double cd-decrement M-2) [orig ř.265-291]
 *  6. tick++
 *  7. Update side.number derived cache
 *
 * @param {BattleState} bs
 * @param {object[]} commands - pending player commands [{side:'warriors'|'archers', action:'charge'|...}]
 * @param {Rng} rng
 * @returns {BattleState}
 */
export function battleStep(bs, commands, rng) {
  if (!bs || bs.state === 'done') return bs;

  // Deep clone sides to maintain purity (n-2, POVINNÉ)
  const next = cloneBs(bs);
  const player   = next.sides.player;
  const opponent = next.sides.opponent;

  // ── 1. End check (orig ř.231) ──────────────────────────────────────────────
  if (next.tick % BALANCE.battle.endCheckPeriod === BALANCE.battle.endCheckPhase) {
    if (player.number === 0 || opponent.number === 0) {
      next.state = 'done';
      return next;
    }
  }

  // ── 2. Player cd-down (orig ř.239-247) ─────────────────────────────────────
  // Player decrements ONCE per tick (at start), opponent TWICE (M-2 asymmetry)
  if (player.warriors.cd > 0) player.warriors.cd--;
  if (player.archers.cd  > 0) player.archers.cd--;

  // ── 3. Apply player commands ────────────────────────────────────────────────
  let commandsApplied = 0;
  if (commands && commands.length > 0) {
    for (const cmd of commands) {
      const cmdAny = /** @type {any} */ (cmd);
      const unitType = cmdAny.side;  // 'warriors' | 'archers'
      const actionId = cmdAny.action;
      if (!unitType || !player[unitType]) continue;
      const atk = getAttacks();
      const attackList = /** @type {any[]} */ (atk[/** @type {'warriors'|'archers'} */ (unitType)]);
      if (!attackList) continue;
      const attack = attackList.find(/** @param {any} a */ (a) => a.id === actionId);
      if (!attack) continue;
      attackWith(player[unitType], attack, opponent, next, rng, 'player');
      commandsApplied++;
    }
  }

  // ── 4. Defensive AI for player (G2) ─────────────────────────────────────────
  // If no commands were given (offline catch-up OR player idle), play default attacks.
  // Fixed order: warriors → archers. Uses charge[0] / volley[0] (same as opponent).
  if (commandsApplied === 0) {
    const atk = getAttacks();
    const defaultWarriorAttack = atk.warriors[0]; // charge
    const defaultArcherAttack  = atk.archers[0];  // volley
    if (player.warriors.number > 0 && player.warriors.cd === 0) {
      attackWith(player.warriors, defaultWarriorAttack, opponent, next, rng, 'player');
    }
    if (player.archers.number > 0 && player.archers.cd === 0) {
      attackWith(player.archers, defaultArcherAttack, opponent, next, rng, 'player');
    }
  }

  // ── 5. Opponent AI (orig ř.265-291) ─────────────────────────────────────────
  // CRITICAL M-2: cd-- runs EVERY tick AFTER attackWith (incl. tick of attack), warriors→archers.
  const reaction   = next.reaction;         // default 60
  const archReact  = reaction + BALANCE.battle.archerReactionOffset; // reaction+20 = 80
  const atk = getAttacks();

  // --- opponent warriors ---
  if (opponent.warriors.number > 0) {
    if (next.tick === reaction) {
      // First attack (orig ř.268-269)
      attackWith(opponent.warriors, atk.warriors[0], player, next, rng, opponent.liege);
    } else if (next.tick > reaction && opponent.warriors.cd === 0) {
      // Repeat attacks (orig ř.270-272)
      attackWith(opponent.warriors, atk.warriors[0], player, next, rng, opponent.liege);
    }
    // M-2 double-decrement: ALWAYS after attackWith, every tick (orig ř.274-277)
    opponent.warriors.cd--;
    if (opponent.warriors.cd < 0) opponent.warriors.cd = 0;
  }

  // --- opponent archers ---
  if (opponent.archers.number > 0) {
    if (next.tick === archReact) {
      // First attack (orig ř.281-282)
      attackWith(opponent.archers, atk.archers[0], player, next, rng, opponent.liege);
    } else if (next.tick > archReact && opponent.archers.cd === 0) {
      // Repeat attacks (orig ř.283-285)
      attackWith(opponent.archers, atk.archers[0], player, next, rng, opponent.liege);
    }
    // M-2 double-decrement: ALWAYS after attackWith, every tick (orig ř.287-290)
    opponent.archers.cd--;
    if (opponent.archers.cd < 0) opponent.archers.cd = 0;
  }

  // ── 6. tick++ (orig ř.293 cB.curStep++) ────────────────────────────────────
  next.tick++;

  // ── 7. Update derived side.number cache ─────────────────────────────────────
  player.number   = player.warriors.number   + player.archers.number;
  opponent.number = opponent.warriors.number + opponent.archers.number;

  return next;
}

/**
 * Create a new BattleState for an upcoming battle.
 * 1:1 port of orig create() (ř.54-193) adapted for serializable state.
 *
 * INVARIANTS (F-1):
 *   - liege: string ('player' | factionId | 'bandits'), never object
 *   - lastAttackId: null, never object ref
 *   - no army self-ref (targetSide passed as parameter to attackWith)
 *
 * @param {GameState} state - game state (read-only)
 * @param {any} zone - target zone object
 * @param {any} faction - attacking faction object (or bandits pseudo-faction)
 * @param {boolean} [isBandit] - true for bandit raids
 * @returns {BattleState}
 */
export function createBattleState(state, zone, faction, isBandit = false) {
  const isPlayerDefending = (zone.liege === 'player');

  // Player stats from military.json combat (G-MILITARY-STATS, approx, M9 calibration)
  // Player combat stats from catalog (loaded at boot via catalogs.js) or inline fallback
  let warriorCombat = { strength: 2, defense: 2, critChance: 0.1, baseCd: 80 };
  let archerCombat  = { strength: 3, defense: 1, critChance: 0.1, baseCd: 120 };
  if (hasCatalog('military')) {
    const milCat = /** @type {any} */ (getCatalog('military'));
    const milItems = milCat?.military ?? [];
    const wc = milItems.find((/** @type {any} */ m) => m.id === 'warrior')?.combat;
    const ac = milItems.find((/** @type {any} */ m) => m.id === 'archer')?.combat;
    if (wc) warriorCombat = wc;
    if (ac) archerCombat  = ac;
  }

  // critChance: base 0.1 + blessingOfWind +0.1 if unlocked (orig ř.109/120)
  const st = /** @type {any} */ (state);
  const blessingOfWind = st.player?.unlockedTechs?.blessingOfWind ? 0.1 : 0;
  const playerCritChance = (warriorCombat.critChance || 0.1) + blessingOfWind;

  // Player unit numbers
  let playerWarriors, playerArchers;
  if (isPlayerDefending) {
    // Player defends: take units from zone (orig ř.145-146)
    playerWarriors = Math.trunc(zone.warriors || 0);
    playerArchers  = Math.trunc(zone.archers  || 0);
  } else {
    // Player attacks: use totWarriors/totArchers from player state
    playerWarriors = Math.trunc(st.player?.totWarriors || 0);
    playerArchers  = Math.trunc(st.player?.totArchers  || 0);
  }

  // Opponent stats from faction.unitStats (M7a-2) or fallback
  const factionId  = isBandit ? 'bandits' : (faction?.id || faction?.factionId || 'unknown');
  const unitStats  = faction?.unitStats ?? { warriors: { strength: 1, defense: 1 }, archers: { strength: 1, defense: 1 } };
  const oppCrit    = BALANCE.battle.critChanceDefault; // 0.1 (orig ř.129/138)

  // Opponent unit numbers
  let opponentWarriors, opponentArchers;
  if (isPlayerDefending) {
    // Opponent attacks from capital (§9.1 m-2: use getCapital, not invasion.warriors — field doesn't exist)
    const capital = _getCapitalZone(state, factionId, faction);
    opponentWarriors = Math.trunc(capital?.warriors || 0);
    opponentArchers  = Math.trunc(capital?.archers  || 0);
  } else {
    // Player attacks: opponent defends zone
    opponentWarriors = Math.trunc(zone.warriors || 0);
    opponentArchers  = Math.trunc(zone.archers  || 0);
  }

  // thumbRing stored as boolean flag in meta (not object ref) for F-1 serializability
  const thumbRing = st.player?.unlockedTechs?.thumbRing ? true : false;

  return /** @type {BattleState} */ ({
    // §8.1 top-level contract keys (NEMĚNIT):
    zoneId:   zone.id,
    sides: {
      player: {
        liege:  'player',  // string (F-1)
        action: isPlayerDefending ? 'Defending' : 'Attacking',
        warriors: {
          number:         playerWarriors,
          startingNumber: playerWarriors,
          strength:       warriorCombat.strength,
          defense:        warriorCombat.defense,
          critChance:     playerCritChance,
          cd:             0,
          lastMaxCD:      100,
          casualties:     0,
          lastAttackId:   null,  // string|null (F-1)
          type:           'warriors',
        },
        archers: {
          number:         playerArchers,
          startingNumber: playerArchers,
          strength:       archerCombat.strength,
          defense:        archerCombat.defense,
          critChance:     playerCritChance,
          cd:             0,
          lastMaxCD:      100,
          casualties:     0,
          lastAttackId:   null,  // string|null (F-1)
          type:           'archers',
        },
        number: playerWarriors + playerArchers,
      },
      opponent: {
        liege:  factionId,  // string (F-1)
        action: isPlayerDefending ? 'Attacking' : 'Defending',
        warriors: {
          number:         opponentWarriors,
          startingNumber: opponentWarriors,
          strength:       unitStats.warriors?.strength ?? 1,
          defense:        unitStats.warriors?.defense  ?? 1,
          critChance:     oppCrit,
          cd:             0,
          lastMaxCD:      100,
          casualties:     0,
          lastAttackId:   null,  // string|null (F-1)
          type:           'warriors',
        },
        archers: {
          number:         opponentArchers,
          startingNumber: opponentArchers,
          strength:       unitStats.archers?.strength ?? 1,
          defense:        unitStats.archers?.defense  ?? 1,
          critChance:     oppCrit,
          cd:             0,
          lastMaxCD:      100,
          casualties:     0,
          lastAttackId:   null,  // string|null (F-1)
          type:           'archers',
        },
        number: opponentWarriors + opponentArchers,
      },
    },
    state:    'running',
    tick:     0,           // m-4: MUST start at 0 (end-check first fires at tick 30)
    log:      [],
    summary:  {
      winner:      null,
      p_warriors:  { kills: 0, casualties: 0 },
      p_archers:   { kills: 0, casualties: 0 },
      o_warriors:  { kills: 0, casualties: 0 },
      o_archers:   { kills: 0, casualties: 0 },
    },
    // Runtime fields (naplnění obsahu, NErozšiřuje top-level §8.1 signatura):
    subAccMs:       0,     // m-4
    queue:          [],    // pending player commands (drainuje battleTick)
    reaction:       BALANCE.battle.reactionDefault,  // 60, m-4
    startedAtStep:  st.engine?.curStep ?? 0,
    attackerSide:   isPlayerDefending ? 'opponent' : 'player',
    banditLoot:     null,
    meta: {
      attackerId:   factionId,
      targetZoneId: zone.id,
      isBandit:     isBandit,
      thumbRing:    thumbRing,  // serializable boolean (F-1)
    },
  });
}

/**
 * Get capital zone of a faction (for opponent unit numbers in startBattle).
 * @param {GameState} state
 * @param {string} factionId
 * @param {any} faction
 * @returns {any|null}
 */
function _getCapitalZone(state, factionId, faction) {
  if (factionId === 'bandits') {
    // Bandits don't have a capital — use faction.warriors/archers directly or zero
    return faction ? { warriors: faction.warriors || 0, archers: faction.archers || 0 } : null;
  }
  const st = /** @type {any} */ (state);
  const capitalId = faction?.capitalId;
  if (capitalId && Array.isArray(st.world?.zones)) {
    return st.world.zones.find((/** @type {any} */ z) => z.id === capitalId) ?? null;
  }
  return null;
}

/**
 * Resolve battle outcome after state = 'done'.
 * Applies revival, zone transfers, loot/demand.
 * 1:1 port of orig end() (ř.298-437).
 *
 * Called from battleTick when state.battle.state === 'done'.
 * Mutates trvalý state (zones, player inventory, faction capitals).
 * Sets state.battle = null when done.
 *
 * @param {GameState} state - mutated
 * @param {Rng} rng - rng stream 'battle' (for reviveAI)
 */
export function resolveBattleOutcome(state, rng) {
  const st = /** @type {any} */ (state);
  const bs = /** @type {BattleState|null} */ (st.battle);
  if (!bs) return;

  const player   = bs.sides.player;
  const opponent = bs.sides.opponent;

  // Determine winner (orig ř.304)
  const playerWins = player.number > 0;
  bs.summary.winner = playerWins ? 'player' : opponent.liege;

  // ── Revival (orig ř.311-321, M-1+M-3) ──────────────────────────────────────
  // Player revival: deterministic (M-1)
  // NOTE: state.player.baseRevival does NOT exist in repo (grep=0) → ?? fallback POVINNÝ
  const baseRevival = (st.player?.baseRevival) ?? BALANCE.battle.baseRevivalDefault; // ?? not || (M-1)
  const ut = st.player?.unlockedTechs ?? {};
  const bonuses = (ut.fieldHospital ? 0.15 : 0) + (ut.blessingOfHoney ? 0.1 : 0);

  const revivedPlayerWarriors = revivePlayer(bs.summary.p_warriors.casualties, baseRevival, bonuses);
  const revivedPlayerArchers  = revivePlayer(bs.summary.p_archers.casualties,  baseRevival, bonuses);
  player.warriors.number += revivedPlayerWarriors;
  player.archers.number  += revivedPlayerArchers;
  player.number = player.warriors.number + player.archers.number;

  // AI revival: random (2× rng, archers→warriors fixed order per orig ř.317-318)
  const revivedOppArchers  = reviveAI(bs.summary.o_archers.casualties,  rng); // archers FIRST
  const revivedOppWarriors = reviveAI(bs.summary.o_warriors.casualties, rng); // warriors second
  opponent.archers.number  += revivedOppArchers;
  opponent.warriors.number += revivedOppWarriors;
  opponent.number = opponent.warriors.number + opponent.archers.number;

  // ── Outcome branches (orig ř.324-436) ──────────────────────────────────────
  if (playerWins) {
    if (player.action === 'Attacking') {
      // Player attacked and won — occupy zone (orig ř.326)
      const zone = _getZone(state, bs.zoneId);
      if (zone) {
        zone.warriors = Math.floor(player.warriors.number);
        zone.archers  = Math.floor(player.archers.number);
        zone.liege    = 'player';
      }
    } else {
      // Player defended successfully (orig ř.329-347)
      const zone = _getZone(state, bs.zoneId);
      if (zone) {
        zone.warriors = Math.floor(player.warriors.number);
        zone.archers  = Math.floor(player.archers.number);
      }
      if (bs.meta?.isBandit) {
        // Bandits dropped loot (orig ř.334-346)
        const loot = {
          gold:    bs.summary.o_warriors.casualties * 40 + bs.summary.o_archers.casualties * 60,
          sword:   Math.trunc(bs.summary.o_warriors.casualties * 0.25),
          armour:  Math.trunc(bs.summary.o_warriors.casualties * 0.25),
          longbow: Math.trunc(bs.summary.o_archers.casualties  * 0.25),
        };
        bs.banditLoot = loot;
        _insertInventory(state, loot);
      }
    }
  } else {
    // Player lost
    if (player.action === 'Attacking') {
      // Player attacked and failed (orig ř.352-359)
      player.warriors.number = 0;
      player.archers.number  = 0;
      const zone = _getZone(state, bs.zoneId);
      if (zone) {
        zone.warriors = opponent.warriors.number;
        zone.archers  = opponent.archers.number;
      }
    } else {
      // Player failed to defend (orig ř.362-433)
      const zone = _getZone(state, bs.zoneId);
      if (zone && zone.id === 'homeZone') {
        zone.warriors = 0;
        zone.archers  = 0;
        if (bs.meta?.isBandit) {
          // Bandits raided (orig ř.369-398)
          const enemiesAlive = opponent.warriors.number + opponent.archers.number;
          const inv = /** @type {Record<string,number>} */ (st.player?.inventory ?? {});
          /** @type {Record<string,number>} */
          const demand = {
            gold:    Math.min(enemiesAlive * 5400, st.player?.gold ?? 0),
            armour:  Math.min(enemiesAlive * 2, inv.armour  ?? 0),
            sword:   Math.min(enemiesAlive * 2, inv.sword   ?? 0),
            longbow: Math.min(enemiesAlive * 2, inv.longbow ?? 0),
            quiver:  Math.min(enemiesAlive * 6, inv.quiver  ?? 0),
          };
          // Remove zero entries (orig ř.378-382)
          for (const k of Object.keys(demand)) {
            if (demand[k] === 0) delete demand[k];
          }
          bs.banditLoot = { demand }; // record for summary
          _payDemand(state, demand);
        } else {
          // AI raided homeZone (orig ř.400-426)
          const capital = _getCapital(state, opponent.liege);
          if (capital) {
            capital.archers  += opponent.archers.number;
            capital.warriors += opponent.warriors.number;
          }
          const demandGold = Math.trunc((st.player?.gold ?? 0) / 2);
          if (demandGold > 0) {
            pay(state, { gold: demandGold }, 'battle.aiRaid');
          }
          // Cull workers (orig ř.419-421 curWorkers/4 times Player.cullWorker)
          const curWorkers = st.home?.workforce?.assigned ?? 0;
          const cullCount  = Math.trunc(curWorkers / 4);
          if (cullCount > 0 && st.home?.workforce) {
            st.home.workforce.assigned = Math.max(0, st.home.workforce.assigned - cullCount);
            if (st.home.population) {
              st.home.population.total = Math.max(0, (st.home.population.total || 0) - cullCount);
            }
          }
          // Immunity (orig ř.424)
          if (zone) zone.immunity = 210;
        }
      } else if (zone) {
        // Lose vassal zone (orig ř.430-432)
        zone.warriors = opponent.warriors.number;
        zone.archers  = opponent.archers.number;
        zone.liege    = opponent.liege;
      }
    }
  }

  // Record to battleLog for offline summary
  _recordBattleHistory(state, bs);

  // Nullify battle slot (orig delete $rootScope.curBattle)
  st.battle = null;
}

// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * @param {GameState} state
 * @param {string} zoneId
 * @returns {any|undefined}
 */
function _getZone(state, zoneId) {
  const st = /** @type {any} */ (state);
  return Array.isArray(st.world?.zones)
    ? st.world.zones.find((/** @type {any} */ z) => z.id === zoneId)
    : undefined;
}

/**
 * @param {GameState} state
 * @param {string} factionId
 * @returns {any|null}
 */
function _getCapital(state, factionId) {
  const st = /** @type {any} */ (state);
  const faction = st.world?.factions?.[factionId];
  if (!faction?.capitalId) return null;
  return _getZone(state, faction.capitalId);
}

/**
 * @param {GameState} state
 * @param {Record<string,number>} loot
 */
function _insertInventory(state, loot) {
  if (!loot) return;
  // Use grant() to respect resource handler layer and DA5 gold-mutation gate
  grant(state, loot, 'battle.loot');
}

/**
 * @param {GameState} state
 * @param {Record<string,number>} demand
 */
function _payDemand(state, demand) {
  if (!demand || Object.keys(demand).length === 0) return;
  // Clamp demand to what player can actually afford (orig: Math.min each field)
  // then pay — use pay() if affordable, else clamp and pay partial (bandit loot is already clamped)
  if (canAfford(state, demand)) {
    pay(state, demand, 'battle.demand');
  } else {
    // Pay only what can be afforded (already clamped in demand calc above, but guard anyway)
    // Build clamped demand using handler checks
    /** @type {Record<string,number>} */
    const clamped = {};
    const st = /** @type {any} */ (state);
    for (const [id, qty] of Object.entries(demand)) {
      if (id === 'gold') {
        clamped[id] = Math.min(qty, st.player?.gold ?? 0);
      } else {
        clamped[id] = Math.min(qty, st.player?.inventory?.[id] ?? 0);
      }
    }
    // Remove zeros
    for (const k of Object.keys(clamped)) {
      if (clamped[k] === 0) delete clamped[k];
    }
    if (Object.keys(clamped).length > 0) {
      pay(state, clamped, 'battle.demand');
    }
  }
}

/**
 * @param {GameState} state
 * @param {BattleState} bs
 */
function _recordBattleHistory(state, bs) {
  // Record outcome to state.world.battleLog for offline summary (§9.3)
  const st = /** @type {any} */ (state);
  if (!st.world) return;
  if (!st.world.battleLog) st.world.battleLog = [];
  const rec = {
    zoneId:           bs.zoneId,
    winner:           bs.summary.winner,
    playerCasualties: bs.summary.p_warriors.casualties + bs.summary.p_archers.casualties,
    playerKills:      bs.summary.p_warriors.kills      + bs.summary.p_archers.kills,
    loot:             bs.banditLoot ?? null,
    atStep:           bs.startedAtStep ?? 0,
  };
  st.world.battleLog.push(rec);
  // Rotate: keep max 50 records (R-J: prevent unbounded save growth)
  if (st.world.battleLog.length > 50) {
    st.world.battleLog = st.world.battleLog.slice(-50);
  }
}

// ── Schedule handler: startBattle ────────────────────────────────────────────

/**
 * Schedule handler: startBattle — AI vs player battle trigger (naplnění world.js:1189 stub).
 * Orig ř.54: `if (!$rootScope.curBattle) { ... }` — one battle at a time guard.
 * @param {GameState} state
 * @param {object} params
 * @param {any} _ctx
 */
export function startBattle(state, params, _ctx) {
  const st = /** @type {any} */ (state);
  if (st.battle) {
    // Already a battle in progress — drop (orig ř.55 guard; one battle at a time)
    return;
  }
  const p = /** @type {any} */ (params);
  const attackerId   = p?.attackerId;
  const targetZoneId = p?.targetZoneId;
  if (!attackerId || !targetZoneId) return;

  const zone    = _getZone(state, targetZoneId);
  const faction = st.world?.factions?.[attackerId];
  if (!zone || !faction) return;

  st.battle = createBattleState(state, zone, faction, false);
}

/**
 * Schedule handler: banditRaid — bandit attack on homeZone.
 * @param {GameState} state
 * @param {object} params
 * @param {any} _ctx
 */
export function banditRaid(state, params, _ctx) {
  const st = /** @type {any} */ (state);
  if (st.battle) return; // one battle at a time

  const homeZone = _getZone(state, 'homeZone');
  if (!homeZone) return;

  // Bandits pseudo-faction: approximate numbers (gap, M9 calibration)
  const banditFaction = {
    id: 'bandits',
    unitStats: {
      warriors: { strength: 1, defense: 1 },
      archers:  { strength: 1, defense: 1 },
    },
    warriors: 10,  // provenance: approximated
    archers:  5,
  };

  st.battle = createBattleState(state, homeZone, banditFaction, true);

  // Self-rearm (schedule the next raid)
  const nextStep = (st.engine?.curStep ?? 0) + BALANCE.battle.banditPeriod;
  if (st.engine && nextStep >= st.engine.curStep) {
    scheduleInsert(state, nextStep, 'banditRaid', {});
  }
}

/**
 * Idempotent arm of the bandit raid scheduler (anti-DR-012-02).
 * Mirror of armContractOffer / armFactionAI pattern.
 * Called ONCE from bootSequence after armFactionAI.
 * Guard: scheduleCountOf('banditRaid')===0 → insert first event; else no-op.
 * Covers fresh start + old saves without banditRaid in schedule.
 * Deterministic — no RNG at arm time (jitter is M9 calibration).
 * @param {GameState} state
 */
export function armBanditRaid(state) {
  if (scheduleCountOf(state, 'banditRaid') === 0) {
    const st = /** @type {any} */ (state);
    const step = Math.max(st.engine?.curStep ?? 0, 1) + BALANCE.battle.banditPeriod;
    scheduleInsert(state, step, 'banditRaid', {});
  }
}

// ── battleTick system function ────────────────────────────────────────────────

/**
 * Battle tick system function — step edge, order 30 (registered in tickOrder.js:230).
 * Sub-step accumulator adapter (§3.1 design).
 *
 * Per herní step: subAccMs += STEP_MS(50).
 * While subAccMs >= BATTLE_TICK_MS(30): run battleStep, drain queue, subAccMs -= 30.
 * G2: catch-up (offline) and live run same code path — queue empty → defensive AI in battleStep.
 *
 * @param {GameState} state
 * @param {object} _params
 * @param {TickContext} _ctx
 * @returns {void}
 */
export function battleTick(state, _params, _ctx) {
  const st = /** @type {any} */ (state);
  if (!st.battle || st.battle.state === 'done') return; // no-op when no active battle

  const rng = makeRng(state, 'battle');

  const currentAccMs = /** @type {number} */ (st.battle.subAccMs || 0);
  st.battle.subAccMs = currentAccMs + STEP_MS; // +50 ms per herní step

  while (/** @type {number} */ (st.battle.subAccMs) >= BATTLE_TICK_MS) {
    // Drain queue for this sub-step (player commands)
    const commands = /** @type {any[]} */ (st.battle.queue || []);
    st.battle.queue = [];

    // PURE advance — returns new BattleState
    const nextBs = battleStep(/** @type {BattleState} */ (st.battle), commands, rng);
    const prevAccMs = /** @type {number} */ (st.battle.subAccMs);
    st.battle = nextBs;
    st.battle.subAccMs = prevAccMs - BATTLE_TICK_MS;

    if (st.battle.state === 'done') {
      resolveBattleOutcome(state, rng);
      break; // state.battle is now null
    }
  }
}
