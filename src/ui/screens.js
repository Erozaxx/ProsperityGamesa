/**
 * Game UI screens: Forest, Field, Mine, Jobs, Skills, Build, Contracts.
 * Uses preact+htm (vendored). No DOM imports – pure view components.
 * BLOCKER-2: T5 UI screens for M3 production loop.
 * T6 (iter-014 M5-2): BuildScreen + ContractsScreen added.
 * Each screen is a pure component: receives snapshot + send, reads via selectors.
 */
import { html } from '../vendor/preact.standalone.js';
import {
  selectWorld, selectJobs, selectSkills, selectWorkforce, selectFinance, selectMarket,
  selectBuildableBuildings, selectProjectQueue, selectBuilderCapacity, selectBuilderCompanies,
  selectContracts, selectTechTree, selectResearchProgress, selectTechPoints,
} from './selectors.js';

// ---------------------------------------------------------------------------
// BuildScreen
// ---------------------------------------------------------------------------

/**
 * Build screen: building cards, project queue, builder capacity, builder companies.
 * Pure component — all reads via selectors, all writes via send(command, params).
 * T6 (iter-014 M5-2).
 * @param {{ snapshot: import('../core/state/types.js').GameState, send: (type: string, params?: object) => {ok: boolean, error?: string} }} props
 */
export function BuildScreen({ snapshot, send }) {
  const buildings = selectBuildableBuildings(snapshot);
  const queue = selectProjectQueue(snapshot);
  const capacity = selectBuilderCapacity(snapshot);
  const companies = selectBuilderCompanies(snapshot);

  /**
   * Format a cost basket as a short string.
   * @param {Record<string, number>} cost
   * @returns {string}
   */
  function formatCost(cost) {
    const entries = Object.entries(cost);
    if (entries.length === 0) return 'Zdarma';
    return entries.map(([k, v]) => `${v} ${k}`).join(', ');
  }

  return html`
    <div class="screen screen-build">
      <h2>Stavba</h2>

      <section class="build-section">
        <h3>Kapacita stavitelů</h3>
        <dl>
          <dt>Přiřazení stavitelé</dt><dd>${capacity.assignedBuilders}</dd>
          <dt>Firemní stavitelé</dt><dd>${capacity.companyBuilders}</dd>
          <dt>Max aktivní projektů</dt><dd>${capacity.maxActiveProjects}</dd>
          <dt>Max fronta projektů</dt><dd>${capacity.maxProjectQueue}</dd>
          <dt>Fronta využita</dt><dd>${capacity.queueUsed}</dd>
        </dl>
      </section>

      <section class="build-section">
        <h3>Fronta projektů</h3>
        ${queue.length === 0
          ? html`<p class="empty-state">Žádné aktivní projekty.</p>`
          : html`
            <ul class="project-list">
              ${queue.map(p => html`
                <li key=${p.id} class="project-item project-${p.type}">
                  <span class="project-name">${p.name}</span>
                  <span class="project-type">${p.type === 'repair' ? '(oprava)' : '(stavba)'}</span>
                  <progress value=${p.progressPct} max="100" title="${p.progressPct} %"></progress>
                  <span class="project-pct">${p.progressPct} %</span>
                </li>
              `)}
            </ul>
          `}
      </section>

      <section class="build-section">
        <h3>Budovy</h3>
        ${buildings.length === 0
          ? html`<p class="empty-state">Žádné budovy k dispozici.</p>`
          : html`
            <div class="building-cards">
              ${buildings.map(b => html`
                <div key=${b.id} class="building-card ${b.canAfford ? '' : 'unaffordable'}">
                  <div class="building-name">${b.name}</div>
                  <div class="building-meta">Postaveno: ${b.created} · Celkem: ${b.totalMade}</div>
                  <div class="building-cost">Cena: ${formatCost(b.cost)}</div>
                  <button
                    onClick=${() => send('build', { itemId: b.id })}
                    disabled=${!b.canAfford}
                    title=${b.canAfford ? `Postavit ${b.name}` : 'Nedostatek zdrojů'}
                  >Postavit</button>
                </div>
              `)}
            </div>
          `}
      </section>

      <section class="build-section">
        <h3>Stavební firmy</h3>
        ${companies.length === 0
          ? html`<p class="empty-state">Žádné stavební firmy k dispozici.</p>`
          : html`
            <ul class="company-list">
              ${companies.map(c => html`
                <li key=${c.id} class="company-item ${c.owned ? 'owned' : ''}">
                  <span class="company-name">${c.name}</span>
                  ${c.buildersProvided > 0 ? html`<span class="company-builders">+${c.buildersProvided} stavitelů</span>` : null}
                  ${c.masonProvided > 0 ? html`<span class="company-masons">+${c.masonProvided} mistrů</span>` : null}
                  ${c.owned
                    ? html`<span class="company-owned">Vlastníte</span>`
                    : html`
                      <span class="company-cost">Cena: ${formatCost(c.cost)}</span>
                      <button
                        onClick=${() => send('buyCompany', { companyId: c.id })}
                        disabled=${!c.canAfford}
                        title=${c.canAfford ? `Najmout ${c.name}` : 'Nedostatek zdrojů'}
                      >Najmout</button>
                    `}
                </li>
              `)}
            </ul>
          `}
      </section>
    </div>`;
}

// ---------------------------------------------------------------------------
// ContractsScreen
// ---------------------------------------------------------------------------

/**
 * Contracts screen: offered/active contracts, accept/reject/complete actions.
 * Pure component — all reads via selectors, all writes via send(command, params).
 * T6 (iter-014 M5-2).
 * @param {{ snapshot: import('../core/state/types.js').GameState, send: (type: string, params?: object) => {ok: boolean, error?: string} }} props
 */
export function ContractsScreen({ snapshot, send }) {
  const contracts = selectContracts(snapshot);

  const offered = contracts.filter(c => c.status === 'offered');
  const active = contracts.filter(c => c.status === 'active');

  /**
   * Format a basket {id: qty} as a short string.
   * @param {Record<string, number>} basket
   * @returns {string}
   */
  function formatBasket(basket) {
    const entries = Object.entries(basket);
    if (entries.length === 0) return '–';
    return entries.map(([k, v]) => `${v} ${k}`).join(', ');
  }

  return html`
    <div class="screen screen-contracts">
      <h2>Kontrakty</h2>

      <section class="contracts-section">
        <h3>Nabídnuté kontrakty</h3>
        ${offered.length === 0
          ? html`<p class="empty-state">Žádné nabídnuté kontrakty.</p>`
          : html`
            <ul class="contract-list">
              ${offered.map(c => html`
                <li key=${c.id} class="contract-item contract-offered">
                  <div class="contract-title">${c.title || c.type}</div>
                  <div class="contract-details">
                    <span class="contract-cost">Náklady: ${formatBasket(c.cost)}</span>
                    <span class="contract-reward">Odměna: ${formatBasket(c.reward)}</span>
                  </div>
                  <div class="contract-actions">
                    <button
                      onClick=${() => send('acceptContract', { contractId: c.id })}
                      title="Přijmout kontrakt"
                    >Přijmout</button>
                    <button
                      onClick=${() => send('rejectContract', { contractId: c.id })}
                      title="Odmítnout kontrakt"
                    >Odmítnout</button>
                  </div>
                </li>
              `)}
            </ul>
          `}
      </section>

      <section class="contracts-section">
        <h3>Aktivní kontrakty</h3>
        ${active.length === 0
          ? html`<p class="empty-state">Žádné aktivní kontrakty.</p>`
          : html`
            <ul class="contract-list">
              ${active.map(c => html`
                <li key=${c.id} class="contract-item contract-active ${c.canComplete ? 'completable' : ''}">
                  <div class="contract-title">${c.title || c.type}</div>
                  <div class="contract-details">
                    <span class="contract-cost">Náklady: ${formatBasket(c.cost)}</span>
                    <span class="contract-reward">Odměna: ${formatBasket(c.reward)}</span>
                    ${c.daysLeft !== null ? html`<span class="contract-deadline">Zbývá: ${c.daysLeft} dní</span>` : null}
                    ${c.pctComplete !== null ? html`<progress value=${c.pctComplete} max="100" title="${c.pctComplete} % doby uplynulo"></progress>` : null}
                    ${c.unaffordable.length > 0
                      ? html`<span class="contract-warn">Chybí: ${c.unaffordable.join(', ')}</span>`
                      : null}
                  </div>
                  <div class="contract-actions">
                    <button
                      onClick=${() => send('completeContract', { contractId: c.id })}
                      disabled=${!c.canComplete}
                      title=${c.canComplete ? 'Splnit kontrakt' : 'Nedostatek zdrojů'}
                    >Splnit</button>
                    <button
                      onClick=${() => send('rejectContract', { contractId: c.id })}
                      title="Zrušit kontrakt"
                    >Zrušit</button>
                  </div>
                </li>
              `)}
            </ul>
          `}
      </section>
    </div>`;
}

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
// MarketScreen
// ---------------------------------------------------------------------------

/**
 * Market screen: shows goods table with buy/sell prices and caravan status.
 * Buy/sell qty=10 per button (MVP – simple and deterministic).
 * iter-011 M4b T5.
 * @param {{ snapshot: import('../core/state/types.js').GameState, send: (type: string, params?: object) => {ok: boolean, error?: string} }} props
 */
export function MarketScreen({ snapshot, send }) {
  const market = selectMarket(snapshot);
  const { rows, caravan } = market;

  /** @param {string} goodsId @param {number} qty */
  function buy(goodsId, qty) {
    send('buyGoods', { goodsId, qty });
  }

  /** @param {string} goodsId @param {number} qty */
  function sell(goodsId, qty) {
    send('sellGoods', { goodsId, qty });
  }

  function sendCaravan() {
    // MVP preset: buy 10 tools (simple deterministic preset)
    send('sendCaravan', { buy: { tools: 10 }, sell: {} });
  }

  const daysLeft = caravan.sentOut > 0 ? Math.ceil(caravan.sentOut / 900) : 0;

  return html`
    <div class="screen screen-market">
      <h2>Trh</h2>
      <section class="market-section">
        <h3>Zboží</h3>
        <div class="table-scroll">
        <table class="market-table">
          <thead>
            <tr>
              <th>Zboží</th>
              <th>Dostupné</th>
              <th>Nákupní cena</th>
              <th>Prodejní cena</th>
              <th>V inventáři</th>
              <th>Akce</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length === 0
              ? html`<tr><td colspan="6" class="empty-state">Trh není k dispozici.</td></tr>`
              : rows.map(row => html`
                <tr key=${row.id}>
                  <td>${row.id}</td>
                  <td>${row.available.toFixed(0)} / ${row.max}</td>
                  <td>${row.buy.toFixed(2)}</td>
                  <td>${row.sell.toFixed(2)}</td>
                  <td>${row.owned}</td>
                  <td class="market-actions">
                    <button onClick=${() => buy(row.id, 10)}>Koupit 10</button>
                    <button
                      onClick=${() => sell(row.id, 10)}
                      disabled=${row.owned < 10}
                    >Prodat 10</button>
                  </td>
                </tr>
              `)}
          </tbody>
        </table>
        </div>
      </section>
      <section class="caravan-section">
        <h3>Karavana</h3>
        <dl>
          <dt>Kapacita</dt><dd>${caravan.capacity}</dd>
          <dt>Stav</dt><dd>${caravan.onRoad ? `Na cestě (${daysLeft}d)` : 'Připravena'}</dd>
        </dl>
        <button
          onClick=${sendCaravan}
          disabled=${caravan.onRoad}
          title="Koupit 10 tools (MVP preset)"
        >Poslat karavanu (koupit 10 tools)</button>
      </section>
    </div>`;
}

// ---------------------------------------------------------------------------
// TechScreen (iter-015 M6 T4)
// ---------------------------------------------------------------------------

/**
 * Tech/Academy screen: tech tree grouped by sector + research progress per sector + techPt balance.
 * Pure component — all reads via selectors, all writes via send('buyTech', { techId }).
 * Design: design_iter-015.md §5.2 (M6-D9).
 * @param {{ snapshot: import('../core/state/types.js').GameState, send: (type: string, params?: object) => {ok: boolean, error?: string} }} props
 */
export function TechScreen({ snapshot, send }) {
  const techPt = selectTechPoints(snapshot);
  const progress = selectResearchProgress(snapshot);
  const techs = selectTechTree(snapshot);

  // Group techs by sector
  /** @type {Map<string, ReturnType<typeof selectTechTree>>} */
  const bySector = new Map();
  for (const t of techs) {
    if (!bySector.has(t.sector)) bySector.set(t.sector, []);
    const sectorList = bySector.get(t.sector);
    if (sectorList) sectorList.push(t);
  }

  /**
   * Render status text + action for a single tech.
   * @param {import('./selectors.js').TechViewItem} t
   */
  function techAction(t) {
    if (t.unlocked) {
      return html`<span class="tech-status tech-unlocked">Odemceno</span>`;
    }
    if (t.available) {
      return html`
        <button
          class="tech-buy-btn"
          onClick=${() => send('buyTech', { techId: t.id })}
          disabled=${!t.canAfford}
          title=${t.canAfford ? `Odemknout ${t.name} za ${t.cost} tech. bodu` : 'Nedostatek tech. bodu'}
        >${t.canAfford ? 'Odemknout' : 'Nedostatek bodu'}</button>`;
    }
    const prereqList = t.prereqs.join(', ');
    return html`<span class="tech-status tech-locked" title="Vyzaduje: ${prereqList}">Vyzaduje: ${prereqList || '?'}</span>`;
  }

  return html`
    <div class="screen screen-tech">
      <h2>Veda &amp; Akademie</h2>

      <section class="tech-section tech-points-header">
        <strong>Tech. body: ${techPt}</strong>
      </section>

      <section class="tech-section">
        <h3>Vyzkumny pokrok (per sektor)</h3>
        ${progress.length === 0
          ? html`<p class="empty-state">Ziadny katalog technologii.</p>`
          : html`
            <ul class="research-list">
              ${progress.map(sec => html`
                <li key=${sec.id} class="research-item">
                  <span class="research-name">${sec.name}</span>
                  <span class="research-level">Uroven ${sec.level}</span>
                  <span class="research-exp">${sec.exp} / ${sec.cap} exp</span>
                  <progress class="research-bar" value=${sec.progPct} max="100"
                    title="${sec.progPct} % do dalsi urovne (${sec.exp}/${sec.cap} exp)"
                  ></progress>
                  <span class="research-pct">${sec.progPct} %</span>
                </li>
              `)}
            </ul>
          `}
      </section>

      <section class="tech-section">
        <h3>Strom technologii</h3>
        ${techs.length === 0
          ? html`<p class="empty-state">Ziadny tech strom. Zkontrolujte katalog.</p>`
          : html`
            <div class="tech-sectors">
              ${[...bySector.entries()].map(([sector, list]) => html`
                <div key=${sector} class="tech-sector">
                  <h4 class="tech-sector-name">${sector}</h4>
                  <ul class="tech-list">
                    ${list.map(t => html`
                      <li key=${t.id}
                        class=${'tech-item' +
                          (t.unlocked ? ' tech-item-unlocked' : t.available ? ' tech-item-available' : ' tech-item-locked')}
                      >
                        <div class="tech-header">
                          <span class="tech-name">${t.name}</span>
                          <span class="tech-cost">${t.cost} TB</span>
                        </div>
                        ${t.effects.length > 0
                          ? html`<div class="tech-effects">${t.effects.map(e =>
                              html`<span class="tech-effect">${e.target} ${e.attr} ${e.op === 'add' ? '+' : e.op === 'mul' ? '×' : '='}${e.value}</span>`
                            )}</div>`
                          : null}
                        <div class="tech-action">${techAction(t)}</div>
                      </li>
                    `)}
                  </ul>
                </div>
              `)}
            </div>
          `}
      </section>
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
