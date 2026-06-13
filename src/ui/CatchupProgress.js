/**
 * Preact component: displays catch-up progress bar.
 * M2b: offline catch-up progress UI.
 */
import { html } from '../vendor/preact.standalone.js';

/**
 * @param {Object} props
 * @param {number} props.done - steps completed so far
 * @param {number} props.total - total steps to run
 */
export function CatchupProgress({ done, total }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return html`
    <div class="catchup-progress" role="progressbar" aria-valuenow=${pct} aria-valuemin="0" aria-valuemax="100">
      <div class="catchup-bar" style=${{ width: pct + '%' }}></div>
      <span>${pct}%</span>
    </div>`;
}
