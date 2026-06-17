/**
 * render-throttle.test.js – iter-021 T1 (UX-3, MINOR-1)
 *
 * Proves the UI-layer render time-gate caps paint rate at ≤15/s even under a LIVE burst
 * (loop signals dirty ~every frame at 2× speed). Uses the injectable now/raf/setTimeoutFn/
 * renderFn deps of mountUI — DOM-free, deterministic, no browser.
 *
 * Invariant: throttle lives entirely in src/ui/render.js (UI layer); core/clock.js untouched.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mountUI, RENDER_MIN_INTERVAL_MS } from '../src/ui/render.js';

/**
 * Builds a fake UI environment with a controllable clock and rAF/timeout queues.
 * The clock only advances when we call `tick(ms)`, which also flushes any rAF and
 * any due setTimeout callbacks — modelling the browser event loop deterministically.
 */
function makeFakeEnv() {
  let nowMs = 0;
  /** @type {Array<() => void>} */
  let rafQueue = [];
  /** @type {Array<{ id: number, due: number, cb: () => void }>} */
  let timers = [];
  let timerId = 1;
  let paints = 0;

  const env = {
    now: () => nowMs,
    raf: (/** @type {() => void} */ cb) => { rafQueue.push(cb); return 0; },
    setTimeoutFn: (/** @type {() => void} */ cb, /** @type {number} */ ms) => {
      const id = timerId++;
      timers.push({ id, due: nowMs + ms, cb });
      return id;
    },
    clearTimeoutFn: (/** @type {number} */ id) => { timers = timers.filter((t) => t.id !== id); },
    renderFn: () => { paints++; },
    state: {},
    send: () => ({ ok: true }),
    root: {},
    getExtraProps: () => ({}),
  };

  /** Advance the clock by `ms` in 1ms slices, flushing rAF + due timers each slice. */
  function tick(ms) {
    for (let i = 0; i < ms; i++) {
      nowMs += 1;
      // Flush any due timers first (they may schedule a rAF).
      const due = timers.filter((t) => t.due <= nowMs);
      timers = timers.filter((t) => t.due > nowMs);
      for (const t of due) t.cb();
      // Flush rAF queue (browser paints once per frame).
      const frame = rafQueue;
      rafQueue = [];
      for (const cb of frame) cb();
    }
  }

  return { env, tick, getPaints: () => paints, setPaints: (/** @type {number} */ v) => { paints = v; } };
}

test('render throttle caps paints at ≤15/s under a live 60fps dirty burst', () => {
  const { env, tick, getPaints, setPaints } = makeFakeEnv();
  const { requestRender } = mountUI(env);

  // mountUI does one initial doRender(); reset the counter so we measure the burst only.
  setPaints(0);

  // Simulate 1 real second of a LIVE batch: the loop fires onDirty()==requestRender()
  // every frame (~60 fps → every ~16ms), like 2× speed with steps running each frame.
  const FRAME_MS = 16;
  const FRAMES = Math.ceil(1000 / FRAME_MS); // ~63 frames in 1s
  for (let f = 0; f < FRAMES; f++) {
    requestRender();   // dirty signal this frame
    tick(FRAME_MS);    // advance the fake clock one frame, flushing rAF + timers
  }
  // Drain any trailing render scheduled near the end of the second.
  tick(RENDER_MIN_INTERVAL_MS + 2);

  const paints = getPaints();
  // 1000ms / 66ms ≈ 15.1 → cap is 15 paints/s (trailing scheduler can add at most 1).
  assert.ok(paints <= 16, `expected ≤16 paints in ~1s, got ${paints}`);
  assert.ok(paints <= 15 + 1, `paint rate exceeds ~15/s cap: ${paints}`);
  // Sanity: throttling must not suppress painting entirely.
  assert.ok(paints >= 10, `expected the burst to still paint (~15/s), got ${paints}`);
});

test('trailing render guarantees the final post-burst state is painted', () => {
  const { env, tick, getPaints, setPaints } = makeFakeEnv();
  const { requestRender } = mountUI(env);
  // mountUI does an initial doRender() at t=0 (sets lastRenderMs=0). Advance past the
  // throttle window so the next request is a clean leading render, then reset the counter.
  tick(RENDER_MIN_INTERVAL_MS + 1);
  setPaints(0);

  // One immediate render (window elapsed → leading paint on next frame).
  requestRender();
  tick(1); // flush the rAF → 1 paint
  assert.equal(getPaints(), 1, 'leading render should paint on next frame');

  // A second request arrives immediately (too soon): must be a trailing render, not dropped.
  requestRender();
  // Not enough time yet — no paint.
  tick(10);
  assert.equal(getPaints(), 1, 'too-soon request must not paint immediately');

  // After the throttle window elapses, the trailing render fires.
  tick(RENDER_MIN_INTERVAL_MS);
  assert.equal(getPaints(), 2, 'trailing render must paint the latest state');
});

test('multiple requests within one window coalesce into a single paint', () => {
  const { env, tick, getPaints, setPaints } = makeFakeEnv();
  const { requestRender } = mountUI(env);
  // Skip past the initial render's window so the first measured request paints cleanly.
  tick(RENDER_MIN_INTERVAL_MS + 1);
  setPaints(0);

  requestRender(); tick(1); // leading paint
  assert.equal(getPaints(), 1);

  // Burst of requests all inside the same throttle window → at most ONE trailing paint.
  requestRender();
  requestRender();
  requestRender();
  tick(RENDER_MIN_INTERVAL_MS + 1);
  assert.equal(getPaints(), 2, 'coalesced burst yields exactly one trailing paint');
});
