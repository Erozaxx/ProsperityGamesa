/**
 * Root UI component: time/season readout + speed controls (pause / 1× / 2×).
 * Also displays population, food totals, and health status.
 * Reads a read-only snapshot; mutates ONLY via the injected send callback (command/intent API).
 */
import { html } from '../vendor/preact.standalone.js';
import { selectClock, selectSeason, selectSpeed } from './selectors.js';

/**
 * @param {Object} props
 * @param {import('../core/state/types.js').GameState} props.snapshot
 * @param {(type: string, params?: object) => {ok: boolean, error?: string}} props.send
 */
export function App({ snapshot, send }) {
  const clock = selectClock(snapshot);
  const season = selectSeason(snapshot);
  const speed = selectSpeed(snapshot);

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
    </div>`;
}
