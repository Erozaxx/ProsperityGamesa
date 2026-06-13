/**
 * Pure selectors over GameState snapshots. No DOM – unit-testable in Node.
 * @typedef {import('../core/state/types.js').GameState} GameState
 */

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
