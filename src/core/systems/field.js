/**
 * Field daily – day edge, order 40.
 * Source: field.js:8-40.
 * Deterministic: RNG via makeRng(state,'field'), only when chanceOfRodents > 0.
 */

/** @typedef {import('../state/types.js').GameState} GameState */
/** @typedef {import('../state/types.js').TickContext} TickContext */

/**
 * Field daily tick – day edge, order 40.
 * @param {GameState} state
 * @param {object} _params
 * @param {TickContext} _ctx
 */
export function fieldDaily(state, _params, _ctx) {
  const fld = state.world.field;
  if (!fld) return;
  const season = state.season.curSeason; // 0=spring,1=summer,2=autumn,3=winter

  // Rodent infestation (field.js:8-31)
  // vegetableFarm.created = 0 in M3 (no farms) → chanceOfRodents = 0 (gap G-FIELD-FARMS M5)
  // RNG NOT consumed when chanceOfRodents === 0 (determinism: originál calls Math.random only inside if block)
  const vegetableFarmCount = 0; // M5: read from buildings
  let chanceOfRodents = 0.001 * vegetableFarmCount;
  if (season === 3) chanceOfRodents /= 3; // Winter
  if (season === 0) chanceOfRodents *= 1.5; // Spring
  // NOTE: chanceOfRodents is 0 in M3; no RNG consumed (see design §3.2)
  // When M5 adds farms: import makeRng and roll here

  // inspectTime decrement (crop circle, field.js:33-39; drops are M8 → passive decrement only)
  if (fld.inspectTime > 0) {
    fld.inspectTime--;
  }
}
