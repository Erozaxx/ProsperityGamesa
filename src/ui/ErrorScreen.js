/**
 * Blocking error screen – shown when boot fails (save load failure, unexpected error).
 * No silent half-load (§6.4 B4): user sees the failure and a retry/new-game action.
 */
import { html, render } from '../vendor/preact.standalone.js';
import { APP_DEV } from '../app/env.js';

/**
 * Builds a pure error model (testable without DOM).
 * @param {{ kind: 'save'|'catalog'|'boot', message: string, error?: Error }} info
 * @returns {{ title: string, message: string, showDetail: boolean, actions: Array<{label:string,key:string}> }}
 */
export function buildErrorModel(info) {
  const actions = [{ label: 'Zkusit znovu', key: 'retry' }];
  if (info.kind === 'save') {
    actions.push({ label: 'Nová hra', key: 'newGame' });
  }
  return {
    title: 'Nepodařilo se spustit hru',
    message: info.message,
    showDetail: APP_DEV && !!info.error,
    actions,
  };
}

/**
 * Renders a blocking error screen into root (#app) when boot fails.
 * @param {HTMLElement} root
 * @param {{ kind: 'save'|'catalog'|'boot', message: string, error?: Error, onRetry?: () => void, onNewGame?: () => void }} info
 * @returns {void}
 */
export function showErrorScreen(root, info) {
  const model = buildErrorModel(info);

  render(html`
    <div class="error-screen" role="alert">
      <h1>${model.title}</h1>
      <p>${model.message}</p>
      ${model.showDetail && info.error ? html`<pre class="error-detail">${String(info.error?.stack ?? info.error)}</pre>` : null}
      <div class="error-actions">
        <button onClick=${() => { if (info.onRetry) { info.onRetry(); } else { location.reload(); } }}>Zkusit znovu</button>
        ${info.kind === 'save' ? html`<button onClick=${info.onNewGame}>Nová hra</button>` : null}
      </div>
    </div>`, root);
}
