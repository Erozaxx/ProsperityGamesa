/**
 * Pure selectors over GameState snapshots. No DOM – unit-testable in Node.
 * @typedef {import('../core/state/types.js').GameState} GameState
 */

const SEASON_NAMES = ['Jaro', 'Léto', 'Podzim', 'Zima'];

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
