/**
 * Tests for src/app/lifecycle.js – autosave hooks, fake EventTarget.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attachLifecycle } from '../src/app/lifecycle.js';

/**
 * Creates a minimal fake EventTarget for testing.
 * @param {string} [visibilityState]
 */
function createFakeTarget(visibilityState = 'visible') {
  /** @type {Map<string, Set<EventListenerOrEventListenerObject>>} */
  const listeners = new Map();
  return {
    visibilityState,
    /** @param {string} type @param {EventListenerOrEventListenerObject} fn */
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)?.add(fn);
    },
    /** @param {string} type @param {EventListenerOrEventListenerObject} fn */
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn);
    },
    /** @param {string} type @param {Partial<Event>} [extra] */
    dispatch(type, extra = {}) {
      const fns = listeners.get(type);
      if (!fns) return;
      const evt = Object.assign({ type }, extra);
      for (const fn of fns) {
        if (typeof fn === 'function') fn(/** @type {Event} */ (evt));
        else fn.handleEvent(/** @type {Event} */ (evt));
      }
    },
    hasListener(type) {
      return (listeners.get(type)?.size ?? 0) > 0;
    },
  };
}

test('visibilitychange hidden triggers onHide', () => {
  const target = createFakeTarget('hidden');
  const win = createFakeTarget();
  let hideCalls = 0;

  attachLifecycle({ target, win, onHide: () => { hideCalls++; } });
  target.dispatch('visibilitychange');

  assert.equal(hideCalls, 1);
});

test('visibilitychange visible does NOT trigger onHide', () => {
  const target = createFakeTarget('visible');
  const win = createFakeTarget();
  let hideCalls = 0;

  attachLifecycle({ target, win, onHide: () => { hideCalls++; } });
  target.dispatch('visibilitychange');

  assert.equal(hideCalls, 0);
});

test('pagehide triggers onHide', () => {
  const target = createFakeTarget('visible');
  const win = createFakeTarget();
  let hideCalls = 0;

  attachLifecycle({ target, win, onHide: () => { hideCalls++; } });
  win.dispatch('pagehide');

  assert.equal(hideCalls, 1);
});

test('detach() removes listeners, further events do not trigger onHide', () => {
  const target = createFakeTarget('hidden');
  const win = createFakeTarget();
  let hideCalls = 0;

  const detach = attachLifecycle({ target, win, onHide: () => { hideCalls++; } });
  detach();

  target.dispatch('visibilitychange');
  win.dispatch('pagehide');

  assert.equal(hideCalls, 0);
});

test('works without win (no pagehide registration)', () => {
  const target = createFakeTarget('hidden');
  let hideCalls = 0;

  const detach = attachLifecycle({ target, onHide: () => { hideCalls++; } });
  target.dispatch('visibilitychange');
  assert.equal(hideCalls, 1);
  detach(); // should not throw
});
