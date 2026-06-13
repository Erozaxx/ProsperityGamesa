/**
 * Root UI component: time/season readout + speed controls (pause / 1× / 2×).
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

  return html`
    <div class="hud">
      <div class="clock">
        Rok ${clock.year} · den ${clock.day} (${season.name}, den v sezóně ${clock.dayInSeason}) · krok ${clock.curStep}
      </div>
      <div class="speed">
        <button class=${speed === 0 ? 'on' : ''} onClick=${() => send('setSpeed', { speed: 0 })}>⏸</button>
        <button class=${speed === 1 ? 'on' : ''} onClick=${() => send('setSpeed', { speed: 1 })}>1×</button>
        <button class=${speed === 2 ? 'on' : ''} onClick=${() => send('setSpeed', { speed: 2 })}>2×</button>
      </div>
    </div>`;
}
