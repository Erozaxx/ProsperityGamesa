/**
 * Game UI screens: Forest, Field, Mine, Jobs, Skills.
 * Uses preact+htm (vendored). No DOM imports – pure view components.
 * BLOCKER-2: T5 UI screens for M3 production loop.
 * Each screen is a pure component: receives snapshot + send, reads via selectors.
 */
import { html } from '../vendor/preact.standalone.js';
import { selectWorld, selectJobs, selectSkills, selectWorkforce, selectFinance } from './selectors.js';

// ---------------------------------------------------------------------------
// CouncilScreen
// ---------------------------------------------------------------------------

/**
 * Council/finance screen: shows gold, tax rate, last monthly report.
 * @param {{ snapshot: import('../core/state/types.js').GameState, send: (type: string, params?: object) => {ok: boolean, error?: string} }} props
 */
export function CouncilScreen({ snapshot, send }) {
  const finance = selectFinance(snapshot);
  const r = finance.lastReport;

  return html`
    <div class="screen screen-council">
      <h2>Rada – Finance</h2>
      <dl>
        <dt>Zlato</dt><dd>${finance.gold}</dd>
        <dt>Daňová sazba</dt><dd>${finance.taxRate}×
          <button onClick=${() => send('setTaxRate', { rate: finance.taxRate - 1 })}>−</button>
          <button onClick=${() => send('setTaxRate', { rate: finance.taxRate + 1 })}>+</button>
        </dd>
        ${finance.notEnoughMilitaryFunding ? html`<dt>Upozornění</dt><dd class="warning">Nedostatek financí na vojsko!</dd>` : null}
      </dl>
      ${r ? html`
        <h3>Minulý měsíc (${r.month}/${r.year})</h3>
        <dl>
          <dt>Příjmy</dt><dd>${r.goldEarned} zlata</dd>
          <dt>Výdaje</dt><dd>${r.goldSpent} zlata</dd>
          <dt>Bilance</dt><dd>${r.goldEarned - r.goldSpent} zlata</dd>
        </dl>
      ` : html`<p class="empty-state">Žádná uzavřená účetní zpráva zatím.</p>`}
    </div>`;
}

// ---------------------------------------------------------------------------
// ForestScreen
// ---------------------------------------------------------------------------

/**
 * Displays forest/field/mine resource areas.
 * @param {{ snapshot: import('../core/state/types.js').GameState }} props
 */
export function ForestScreen({ snapshot }) {
  const world = selectWorld(snapshot);
  const f = world.forest;
  const field = world.field;
  const mine = world.mine;

  return html`
    <div class="screen screen-world">
      <h2>Příroda</h2>
      <section class="world-section">
        <h3>Les</h3>
        <dl>
          <dt>Stromy</dt><dd>${f.curTrees.toFixed(0)}</dd>
          <dt>Zvířata</dt><dd>${f.curAnimals.toFixed(0)}</dd>
          <dt>Zdraví lesa</dt><dd>${f.health} %</dd>
          <dt>Od posledního požáru</dt><dd>${f.timeSinceLastFire} dávek</dd>
        </dl>
      </section>
      <section class="world-section">
        <h3>Pole</h3>
        <dl>
          <dt>Dobytek</dt><dd>${field.curLivestock}</dd>
          <dt>Hlodavci</dt><dd>${field.rodentInfestation > 0 ? 'ANO' : 'ne'}</dd>
          <dt>Využitá půda</dt><dd>${field.usedFarmLand}</dd>
        </dl>
      </section>
      <section class="world-section">
        <h3>Důl</h3>
        <dl>
          <dt>Rudy</dt><dd>${mine.curOres}</dd>
        </dl>
      </section>
    </div>`;
}

// ---------------------------------------------------------------------------
// JobsScreen
// ---------------------------------------------------------------------------

/**
 * Jobs screen: shows assigned workers per job, progress bar, +/- assignment buttons.
 * @param {{ snapshot: import('../core/state/types.js').GameState, send: (type: string, params?: object) => {ok: boolean, error?: string} }} props
 */
export function JobsScreen({ snapshot, send }) {
  const jobs = selectJobs(snapshot);
  const workforce = selectWorkforce(snapshot);

  /**
   * @param {string} jobId
   * @param {number} delta
   */
  function assign(jobId, delta) {
    const result = send('assignJob', { jobId, delta });
    if (!result.ok) {
      // Silently ignore (e.g. no unemployed workers) – UI reflects state on next render
    }
  }

  return html`
    <div class="screen screen-jobs">
      <h2>Práce</h2>
      <div class="workforce-summary">
        Pracovní síla: ${workforce.total} celkem · ${workforce.assigned} přiřazeno · ${workforce.unemployed} volných
        · Efektivita: ${(workforce.efficiency * 100).toFixed(0)} %
      </div>
      ${jobs.length === 0
        ? html`<p class="empty-state">Žádní pracovníci zatím přiřazeni. Přiřaďte pracovníky níže.</p>`
        : null}
      <table class="jobs-table">
        <thead>
          <tr>
            <th>Práce</th>
            <th>Přiřazeno</th>
            <th>Postup</th>
            <th>Akce</th>
          </tr>
        </thead>
        <tbody>
          ${jobs.map(job => html`
            <tr key=${job.id}>
              <td>${job.id}</td>
              <td class="job-count">${job.number}</td>
              <td class="job-progress">
                <progress value=${job.curStep} max="100" title="krok ${job.curStep}"></progress>
              </td>
              <td class="job-actions">
                <button
                  onClick=${() => assign(job.id, -1)}
                  disabled=${job.number <= 0}
                  title="Odebrat pracovníka"
                >−</button>
                <button
                  onClick=${() => assign(job.id, 1)}
                  disabled=${workforce.unemployed <= 0}
                  title="Přiřadit pracovníka"
                >+</button>
              </td>
            </tr>
          `)}
        </tbody>
      </table>
    </div>`;
}

// ---------------------------------------------------------------------------
// SkillsScreen
// ---------------------------------------------------------------------------

/**
 * Skills screen: shows skill progress + start button.
 * @param {{ snapshot: import('../core/state/types.js').GameState, send: (type: string, params?: object) => {ok: boolean, error?: string} }} props
 */
export function SkillsScreen({ snapshot, send }) {
  const skills = selectSkills(snapshot);

  /**
   * @param {string} skillId
   */
  function startSkill(skillId) {
    send('startSkill', { skillId });
  }

  return html`
    <div class="screen screen-skills">
      <h2>Dovednosti</h2>
      ${skills.length === 0
        ? html`<p class="empty-state">Žádné dovednosti zatím spuštěny.</p>`
        : null}
      <ul class="skills-list">
        ${skills.map(sk => html`
          <li key=${sk.id} class="skill-item ${sk.progressing ? 'progressing' : 'idle'}">
            <span class="skill-id">${sk.id}</span>
            <span class="skill-status">${sk.progressing ? 'probíhá' : 'nečinná'}</span>
            <progress value=${sk.curStep} max="100" title="krok ${sk.curStep} (${sk.progPct.toFixed(0)} %)"></progress>
            ${!sk.progressing
              ? html`<button onClick=${() => startSkill(sk.id)}>Spustit</button>`
              : null}
          </li>
        `)}
      </ul>
    </div>`;
}
