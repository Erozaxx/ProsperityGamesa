/**
 * requestAnimationFrame loop driving core advance().
 * All time sources injected (nowFn/raf/cancelRaf) – testable in Node without DOM.
 * @typedef {import('../core/state/types.js').GameState} GameState
 * @typedef {import('../core/state/types.js').TickContext} TickContext
 * @typedef {import('../core/engine/clock.js').Accumulator} Accumulator
 */

import { advance } from '../core/engine/index.js';

/**
 * @typedef {Object} GameLoop
 * @property {() => void} start   - begin rAF scheduling
 * @property {() => void} stop    - cancel rAF (pauses real-time stepping; engine speed unaffected)
 * @property {boolean} running
 */

/**
 * Creates a requestAnimationFrame loop driving core advance().
 * @param {Object} deps
 * @param {GameState} deps.state
 * @param {TickContext} deps.ctx
 * @param {Accumulator} deps.acc
 * @param {() => number} deps.nowFn            - injected clock (performance.now); test injects fake
 * @param {(raf: FrameRequestCallback) => number} deps.raf   - requestAnimationFrame (injected)
 * @param {(id: number) => void} deps.cancelRaf              - cancelAnimationFrame (injected)
 * @param {() => void} deps.onDirty            - called once per frame when stepsRun>0 (triggers render)
 * @returns {GameLoop}
 */
export function createGameLoop(deps) {
  let rafId = 0;

  /** @type {GameLoop} */
  const loop = {
    running: false,

    start() {
      if (loop.running) return;
      loop.running = true;
      deps.acc.lastTimeMs = deps.nowFn();
      rafId = deps.raf(frame);
    },

    stop() {
      loop.running = false;
      deps.cancelRaf(rafId);
    },
  };

  /** @param {number} _timestamp */
  function frame(_timestamp) {
    const nowMs = deps.nowFn();
    const { dirty } = advance(deps.acc, deps.state, deps.ctx, nowMs);
    if (dirty) deps.onDirty();
    if (loop.running) {
      rafId = deps.raf(frame);
    }
  }

  return loop;
}
