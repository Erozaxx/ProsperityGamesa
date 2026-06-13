/**
 * Calendar system – single authority for date/season advancement and TimeEdges production.
 * Runs FIRST in tickOrder each step.
 *
 * Season model: 91 days/season, 4 seasons/year = 364 days/year.
 * Month: 30 days provisional – CALENDAR: month=30d provisional, confirm @ M1
 */

/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('../state/types.js').SeasonState} SeasonState
 * @typedef {import('../state/types.js').TimeEdges} TimeEdges
 */

import { STEPS_PER_DAY, STEPS_PER_QUARTER, DAYS_PER_SEASON, DAYS_PER_MONTH } from '../engine/timeEdges.js';

/**
 * Advances the calendar by one step. Updates season.* and returns time edges for this step.
 * Must be called FIRST in tickOrder (before schedule dispatch and periodics).
 * @param {GameState} state
 * @returns {TimeEdges}
 */
export function advanceCalendar(state) {
  const curStep = state.engine.curStep;
  const season = state.season;
  season.curStep = curStep;

  const sid = (curStep - 1) % STEPS_PER_DAY; // 0..899 within current day
  const isNewDay = sid === 0;

  // Advance day on day boundary, but NOT on the very first step (step 1 = start of day 1)
  if (isNewDay && curStep !== 1) {
    advanceDay(season);
  }

  return {
    isNewDay,
    isQuarterDay: sid % STEPS_PER_QUARTER === 0,
    isNoon: sid === 450,
    isNewMonth: isNewDay && (season.curDay - 1) % DAYS_PER_MONTH === 0,
    isNew5Days: isNewDay && season._absDay % 5 === 0,
    isNew10Days: isNewDay && season._absDay % 10 === 0,
    isNewSeason: isNewDay && season.dayInSeason === 1,
    isNewYear: isNewDay && season.curSeason === 0 && season.dayInSeason === 1,
  };
}

/**
 * Advances season state by one day.
 * @param {SeasonState} season
 */
function advanceDay(season) {
  season._absDay += 1;
  season.dayInSeason += 1;

  if (season.dayInSeason > DAYS_PER_SEASON) {
    season.dayInSeason = 1;
    season.curSeason = (season.curSeason + 1) % 4;
    if (season.curSeason === 0) {
      season.curYear += 1;
    }
  }

  // curDay = absolute day in current year (1..364)
  season.curDay = season.curSeason * DAYS_PER_SEASON + season.dayInSeason;
  // curMonth = provisional 30d/month
  season.curMonth = Math.floor((season.curDay - 1) / DAYS_PER_MONTH) + 1;
}
