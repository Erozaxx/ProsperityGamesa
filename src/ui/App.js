/**
 * Root UI component: HUD (time/season/speed/stats) + tabbed screens.
 * BLOCKER-2 fix: adds Forest/Field/Mine (via ForestScreen), Jobs (JobsScreen), Skills (SkillsScreen).
 *
 * Tabs: Přehled (summary) | Příroda (forest/field/mine) | Práce (jobs) | Dovednosti (skills)
 *
 * Reads a read-only snapshot; mutates ONLY via the injected send callback (command/intent API).
 * B-4: wires OfflineSummary, CatchupProgress, export/import.
 */
import { html } from '../vendor/preact.standalone.js';
import { useState } from '../vendor/preact.standalone.js';
import { selectClock, selectSeason, selectSpeed } from './selectors.js';
import { OfflineSummary } from './OfflineSummary.js';
import { CatchupProgress } from './CatchupProgress.js';
import { ForestScreen, JobsScreen, SkillsScreen, CouncilScreen, MarketScreen, BuildScreen, ContractsScreen, TechScreen, WorldZonesScreen, BattleScreen } from './screens.js';

const TABS = [
  { id: 'overview', label: 'Přehled' },
  { id: 'world', label: 'Příroda' },
  { id: 'jobs', label: 'Práce' },
  { id: 'skills', label: 'Dovednosti' },
  { id: 'council', label: 'Rada' },
  { id: 'market', label: 'Trh' },
  { id: 'build', label: 'Stavba' },
  { id: 'contracts', label: 'Kontrakty' },
  { id: 'tech', label: 'Veda' },
  { id: 'world-ai', label: 'Svět' },
  { id: 'battle', label: 'Bitva' },
];

/**
 * @param {Object} props
 * @param {import('../core/state/types.js').GameState} props.snapshot
 * @param {(type: string, params?: object) => {ok: boolean, error?: string}} props.send
 * @param {import('./OfflineSummary.js').OfflineSummaryModel | null} [props.offlineSummary]
 * @param {{ done: number, total: number } | null} [props.catchupProgress]
 * @param {(() => void) | null} [props.onDismissOfflineSummary]
 * @param {(() => void) | null} [props.onExport]
 * @param {(() => void) | null} [props.onImport]
 */
export function App({ snapshot, send, offlineSummary, catchupProgress, onDismissOfflineSummary, onExport, onImport }) {
  const clock = selectClock(snapshot);
  const season = selectSeason(snapshot);
  const speed = selectSpeed(snapshot);
  const [activeTab, setActiveTab] = useState('overview');

  // Population display
  const pop = snapshot.home.population.total;
  const bornTotal = snapshot.home.population.bornTotal;
  const diedTotal = snapshot.home.population.diedTotal;

  // Food display (total food units)
  const foodStore = snapshot.home.food.store || {};
  const totalFood = Object.values(foodStore).reduce((s, v) => s + v, 0);

  // Health display
  const diseaseActive = snapshot.home.health.diseaseActive;
  const diseaseDaysLeft = snapshot.home.health.diseaseDaysLeft;

  // Crime display
  const crimeLevel = snapshot.home.crime.level;

  return html`
    <div class="hud">
      <div class="clock">
        Rok ${clock.year} · den ${clock.day} (${season.name}, den v sezóně ${clock.dayInSeason}) · krok ${clock.curStep}
      </div>
      <div class="stats">
        <span class="population">Lid: ${pop} (+${bornTotal}/-${diedTotal})</span>
        <span class="food">Jídlo: ${totalFood}</span>
        <span class="health">${diseaseActive ? `Nemoc! (${diseaseDaysLeft}d)` : 'Zdraví: OK'}</span>
        <span class="crime">Zločin: ${(crimeLevel * 100).toFixed(1)}%</span>
      </div>
      <div class="speed">
        <button class=${speed === 0 ? 'on' : ''} onClick=${() => send('setSpeed', { speed: 0 })}>⏸</button>
        <button class=${speed === 1 ? 'on' : ''} onClick=${() => send('setSpeed', { speed: 1 })}>1×</button>
        <button class=${speed === 2 ? 'on' : ''} onClick=${() => send('setSpeed', { speed: 2 })}>2×</button>
      </div>
      ${onExport || onImport ? html`
        <div class="save-actions">
          ${onExport ? html`<button onClick=${onExport}>Exportovat hru</button>` : null}
          ${onImport ? html`<button onClick=${onImport}>Importovat hru</button>` : null}
        </div>
      ` : null}
      ${catchupProgress ? html`<${CatchupProgress} done=${catchupProgress.done} total=${catchupProgress.total} />` : null}
      ${offlineSummary && !catchupProgress ? html`<${OfflineSummary} model=${offlineSummary} onDismiss=${onDismissOfflineSummary ?? (() => {})} />` : null}

      <nav class="tabs">
        ${TABS.map(tab => html`
          <button
            key=${tab.id}
            class=${'tab-btn' + (activeTab === tab.id ? ' active' : '')}
            onClick=${() => setActiveTab(tab.id)}
          >${tab.label}</button>
        `)}
      </nav>

      <div class="tab-content">
        ${activeTab === 'overview' ? html`
          <div class="screen screen-overview">
            <h2>Přehled</h2>
            <dl>
              <dt>Populace</dt><dd>${pop} (+${bornTotal}/-${diedTotal})</dd>
              <dt>Jídlo</dt><dd>${totalFood}</dd>
              <dt>Zdraví</dt><dd>${diseaseActive ? `Nemoc (${diseaseDaysLeft}d)` : 'OK'}</dd>
              <dt>Zločin</dt><dd>${(crimeLevel * 100).toFixed(1)} %</dd>
              <dt>Zlato</dt><dd>${snapshot.player.gold}</dd>
            </dl>
          </div>
        ` : null}
        ${activeTab === 'world' ? html`<${ForestScreen} snapshot=${snapshot} />` : null}
        ${activeTab === 'jobs' ? html`<${JobsScreen} snapshot=${snapshot} send=${send} />` : null}
        ${activeTab === 'skills' ? html`<${SkillsScreen} snapshot=${snapshot} send=${send} />` : null}
        ${activeTab === 'council' ? html`<${CouncilScreen} snapshot=${snapshot} send=${send} />` : null}
        ${activeTab === 'market' ? html`<${MarketScreen} snapshot=${snapshot} send=${send} />` : null}
        ${activeTab === 'build' ? html`<${BuildScreen} snapshot=${snapshot} send=${send} />` : null}
        ${activeTab === 'contracts' ? html`<${ContractsScreen} snapshot=${snapshot} send=${send} />` : null}
        ${activeTab === 'tech' ? html`<${TechScreen} snapshot=${snapshot} send=${send} />` : null}
        ${activeTab === 'world-ai' ? html`<${WorldZonesScreen} snapshot=${snapshot} send=${send} />` : null}
        ${activeTab === 'battle' ? html`<${BattleScreen} snapshot=${snapshot} send=${send} />` : null}
      </div>
    </div>`;
}
