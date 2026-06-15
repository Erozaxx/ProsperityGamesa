/**
 * GamelogScreen — T4 (iter-019 M8).
 * Gamelog panel: shows the ring buffer (state.log) newest-first.
 * Story event overlay: shown when state.story.event is active.
 * Tutorial overlay: shown when state.story.tutorials.curId is active.
 *
 * Pure Preact components — all reads via selectors, all writes via send().
 * No game logic here.
 */
import { html } from '../vendor/preact.standalone.js';
import { selectLog, selectActiveStoryEvent, selectTutorial } from './selectors.js';

// ---------------------------------------------------------------------------
// GamelogScreen: ring buffer panel
// ---------------------------------------------------------------------------

/**
 * Gamelog panel — renders the persistent ring buffer (state.log).
 * T4 (iter-019 M8): pure view, selektor selectLog provides data.
 *
 * @param {{ snapshot: import('../core/state/types.js').GameState }} props
 */
export function GamelogScreen({ snapshot }) {
  const entries = selectLog(snapshot, 100);

  return html`
    <div class="screen screen-gamelog">
      <h2>Deník</h2>
      ${entries.length === 0
        ? html`<p class="empty-state">Zatím žádné záznamy.</p>`
        : html`
          <ul class="gamelog-list">
            ${entries.map((e, i) => html`
              <li key=${i} class="gamelog-entry">
                <span class="gamelog-step">[${e.step}]</span>
                <span class="gamelog-msg">${e.msg}</span>
              </li>
            `)}
          </ul>
        `}
    </div>`;
}

// ---------------------------------------------------------------------------
// StoryEventOverlay: engine-stopping event dialog
// ---------------------------------------------------------------------------

/**
 * Overlay rendered when state.story.event is active.
 * Blocks interaction with the rest of the UI until the event is acknowledged.
 * T1/T2 (iter-019 M8).
 *
 * @param {{
 *   snapshot: import('../core/state/types.js').GameState,
 *   send: (type: string, params?: object) => {ok: boolean, error?: string}
 * }} props
 */
export function StoryEventOverlay({ snapshot, send }) {
  const ev = selectActiveStoryEvent(snapshot);
  if (!ev) return null;

  return html`
    <div class="story-overlay" role="dialog" aria-modal="true">
      <div class="story-dialog">
        ${ev.speakerId ? html`<div class="story-speaker">${ev.speakerId}</div>` : null}
        <div class="story-text">${ev.text}</div>
        <div class="story-options">
          ${ev.options.map(opt => html`
            <button
              key=${opt.index}
              class="story-option-btn"
              onClick=${() => send('acknowledgeEvent', { optionIndex: opt.index })}
            >${opt.text}</button>
          `)}
        </div>
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// TutorialOverlay: non-blocking tutorial step tooltip
// ---------------------------------------------------------------------------

/**
 * Tutorial overlay — shows current tutorial step text.
 * Non-blocking (does not stop engine). Player can advance or dismiss.
 * T2 (iter-019 M8).
 *
 * @param {{
 *   snapshot: import('../core/state/types.js').GameState,
 *   send: (type: string, params?: object) => {ok: boolean, error?: string}
 * }} props
 */
export function TutorialOverlay({ snapshot, send }) {
  const tut = selectTutorial(snapshot);
  if (!tut.active || !tut.stepText) return null;

  const progress = tut.totalSteps > 0
    ? `${tut.curStep + 1}/${tut.totalSteps}`
    : '';

  return html`
    <div class="tutorial-overlay" role="complementary">
      <div class="tutorial-box">
        <div class="tutorial-header">
          <span class="tutorial-label">Nápověda</span>
          ${progress ? html`<span class="tutorial-progress">${progress}</span>` : null}
        </div>
        <div class="tutorial-text">${tut.stepText}</div>
        <div class="tutorial-actions">
          ${tut.curStep + 1 < tut.totalSteps ? html`
            <button
              class="tutorial-btn-next"
              onClick=${() => send('advanceTutorial', {})}
            >Další</button>
          ` : html`
            <button
              class="tutorial-btn-done"
              onClick=${() => send('advanceTutorial', {})}
            >Hotovo</button>
          `}
          <button
            class="tutorial-btn-dismiss"
            onClick=${() => send('dismissTutorial', {})}
          >Zavřít</button>
        </div>
      </div>
    </div>`;
}
