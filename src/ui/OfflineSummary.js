/**
 * Preact component: displays the offline catch-up summary to the player.
 * M2b: offline summary UI.
 */
import { html } from '../vendor/preact.standalone.js';
import { formatOfflineSummary } from './offlineSummary.js';

/**
 * @param {Object} props
 * @param {import('./offlineSummary.js').OfflineSummaryModel} props.model
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
