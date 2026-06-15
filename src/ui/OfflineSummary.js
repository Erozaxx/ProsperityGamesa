/**
 * Offline summary: pure model builder + Preact view component.
 * M2b: offline catch-up summary.
 * iter-018 M7b T-006: extended with battle results from state.world.battleLog.
 * No DOM in model functions - they are pure data transformations.
 */
import { html } from '../vendor/preact.standalone.js';
import { STEP_MS } from '../core/engine/clock.js';

/** Number of steps per game day (matches balance.engine.stepsPerDay). */
const STEPS_PER_DAY = 900;

// ---------------------------------------------------------------------------
// Model (pure, no DOM)
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
 * @typedef {{
 *   total: number,
 *   wins: number,
 *   losses: number,
 *   playerCasualties: number,
 *   playerKills: number,
 *   hasBattles: boolean
 * }} BattlesSummary
 */

/**
 * @typedef {Object} OfflineSummaryModel
 * @property {number} missedMs - real milliseconds elapsed while offline
 * @property {boolean} wasCapped - whether the catch-up was capped
 * @property {number} stepsRun - number of simulation steps that were run
 * @property {number} gameDaysSimulated - approximate game days simulated
 * @property {number} realSecondsElapsed - real seconds elapsed while offline
 * @property {boolean} interrupted - whether the catch-up was interrupted
 * @property {BattlesSummary} battles - battle outcomes during offline period
 */

/**
 * Select battle log entries that occurred during the offline window.
 * PURE: reads state.world.battleLog (populated by resolveBattleOutcome §9.3).
 * No logic in UI — all derivations done here.
 *
 * @param {object | null | undefined} gameState - current game state
 * @param {number} startStep - step at which offline period began (0 = include all)
 * @returns {BattleLogEntry[]}
 */
export function selectOfflineBattles(gameState, startStep) {
  if (!gameState) return [];
  const st = /** @type {any} */ (gameState);
  const log = /** @type {BattleLogEntry[] | undefined} */ (st.world?.battleLog);
  if (!Array.isArray(log) || log.length === 0) return [];
  // Filter to battles that started at or after startStep
  const threshold = typeof startStep === 'number' ? startStep : 0;
  return log.filter(entry => (entry.atStep ?? 0) >= threshold);
}

/**
 * Build the offline summary model from catch-up result data.
 * iter-018 M7b: state param added for battle log integration.
 *
 * @param {Object} opts
 * @param {number} opts.missedMs - real ms elapsed while offline
 * @param {boolean} opts.wasCapped - whether the total steps were capped
 * @param {number} opts.stepsRun - steps actually run during catch-up
 * @param {boolean} opts.interrupted - whether catch-up was interrupted
 * @param {object} [opts.state] - game state (optional; used for battle log)
 * @param {number} [opts.startStep] - step at which offline catch-up started
 * @returns {OfflineSummaryModel}
 */
export function buildOfflineSummary(opts) {
  const { missedMs, wasCapped, stepsRun, interrupted } = opts;
  const gameDaysSimulated = stepsRun / STEPS_PER_DAY;
  const realSecondsElapsed = missedMs / 1000;

  // Battle log integration (§9.3): read from state.world.battleLog via selector
  const battleEntries = selectOfflineBattles(opts.state ?? null, opts.startStep ?? 0);
  const wins   = battleEntries.filter(b => b.winner === 'player').length;
  const losses = battleEntries.length - wins;
  const playerCasualties = battleEntries.reduce((s, b) => s + (b.playerCasualties || 0), 0);
  const playerKills      = battleEntries.reduce((s, b) => s + (b.playerKills      || 0), 0);

  /** @type {BattlesSummary} */
  const battles = {
    total: battleEntries.length,
    wins,
    losses,
    playerCasualties,
    playerKills,
    hasBattles: battleEntries.length > 0,
  };

  return {
    missedMs,
    wasCapped,
    stepsRun,
    gameDaysSimulated,
    realSecondsElapsed,
    interrupted,
    battles,
  };
}

/**
 * Format the offline summary into a human-readable string.
 * Includes battle results when battles occurred during offline period.
 * @param {OfflineSummaryModel} model
 * @returns {string}
 */
export function formatOfflineSummary(model) {
  const days = model.gameDaysSimulated.toFixed(1);
  const hours = (model.realSecondsElapsed / 3600).toFixed(1);
  const cappedNote = model.wasCapped ? ' (zkráceno)' : '';
  const interruptedNote = model.interrupted ? ' (přerušeno)' : '';
  let text = `Byli jste offline ${hours}h. Dohnáno ${days} herních dní${cappedNote}${interruptedNote}.`;

  // Append battle summary if any battles occurred (§9.3)
  const b = model.battles;
  if (b && b.hasBattles) {
    text += ` Proběhlo ${b.total} ${b.total === 1 ? 'bitva' : b.total < 5 ? 'bitvy' : 'bitev'}: ${b.wins} výher, ${b.losses} proher. Ztráty: ${b.playerCasualties}, nepřátelé poraženi: ${b.playerKills}.`;
  }

  return text;
}

// ---------------------------------------------------------------------------
// View (Preact component)
// ---------------------------------------------------------------------------

/**
 * @param {Object} props
 * @param {OfflineSummaryModel} props.model
 * @param {() => void} props.onDismiss
 */
export function OfflineSummary({ model, onDismiss }) {
  const text = formatOfflineSummary(model);
  return html`
    <div class="offline-summary" role="status">
      <p>${text}</p>
      <button onClick=${onDismiss}>OK</button>
    </div>`;
}
