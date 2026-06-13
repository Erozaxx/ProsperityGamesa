/**
 * @typedef {import('../state/types.js').TimeEdges} TimeEdges
 * @typedef {import('../state/types.js').SeasonState} SeasonState
 */

/** Steps per game day */
export const STEPS_PER_DAY = 900;
/** Steps per quarter day */
export const STEPS_PER_QUARTER = 225;
/** Days per season */
export const DAYS_PER_SEASON = 91;
/** Seasons per year */
export const SEASONS_PER_YEAR = 4;
/** Days per year (4×91) */
export const DAYS_PER_YEAR = 364;
/** Days per month (provisional – confirm @ M1) */
export const DAYS_PER_MONTH = 30; // CALENDAR: month=30d provisional, confirm @ M1

/**
 * Returns the step index within the current day (0..STEPS_PER_DAY-1).
 * Step 1 is the first step of day 1, so stepInDay for step N is (N-1) % 900.
 * @param {number} curStep
 * @returns {number}
 */
export function stepInDay(curStep) {
  return (curStep - 1) % STEPS_PER_DAY;
}

/**
 * Returns true if curStep is the first step of a new day.
 * @param {number} curStep
 * @returns {boolean}
 */
export function isDayBoundary(curStep) {
  return stepInDay(curStep) === 0;
}
