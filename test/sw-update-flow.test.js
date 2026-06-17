/**
 * sw-update-flow.test.js – iter-021 T2 (SW update flow, DR-021-01 §1).
 *
 * Verifies the message-driven skip-waiting flow:
 *   - update-ready prompt fires only when a worker is installed AND an old one controls the page
 *   - accepting flushes the save (autosave.requestSave('hide')) BEFORE postMessage(SKIP_WAITING)
 *   - controllerchange triggers exactly one reload (save survives in IndexedDB)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wireUpdateFlow } from '../src/app/sw-register.js';

/** Minimal EventTarget-ish fake with manual dispatch. */
function makeEmitter() {
  /** @type {Record<string, Function[]>} */
  const listeners = {};
  return {
    addEventListener(type, cb) { (listeners[type] ??= []).push(cb); },
    emit(type, ev) { (listeners[type] ?? []).forEach((cb) => cb(ev)); },
    _listeners: listeners,
  };
}

function fakeWaitingWorker() {
  return { posted: [], postMessage(msg) { this.posted.push(msg); } };
}

test('no prompt when there is no waiting worker', () => {
  let prompted = false;
  const registration = Object.assign(makeEmitter(), { waiting: null, installing: null });
  wireUpdateFlow({
    registration: /** @type {any} */ (registration),
    controller: /** @type {any} */ ({}),
    swContainer: /** @type {any} */ (makeEmitter()),
    onUpdateReady: () => { prompted = true; },
  });
  assert.equal(prompted, false);
});

test('prompts immediately when a worker is already waiting and page is controlled', () => {
  let prompted = false;
  const registration = Object.assign(makeEmitter(), { waiting: fakeWaitingWorker(), installing: null });
  wireUpdateFlow({
    registration: /** @type {any} */ (registration),
    controller: /** @type {any} */ ({}), // an old SW controls the page
    swContainer: /** @type {any} */ (makeEmitter()),
    onUpdateReady: () => { prompted = true; },
  });
  assert.equal(prompted, true);
});

test('accept flushes the save BEFORE posting SKIP_WAITING, then controllerchange reloads once', async () => {
  /** @type {string[]} */
  const order = [];
  const waiting = {
    posted: /** @type {any[]} */ ([]),
    postMessage(msg) { order.push('postMessage'); this.posted.push(msg); },
  };
  const registration = Object.assign(makeEmitter(), { waiting, installing: null });
  const swContainer = makeEmitter();
  let reloads = 0;
  /** @type {(() => void) | null} */
  let captured = null;

  wireUpdateFlow({
    registration: /** @type {any} */ (registration),
    controller: /** @type {any} */ ({}),
    swContainer: /** @type {any} */ (swContainer),
    onUpdateReady: (accept) => { captured = accept; },
    flushSave: () => { order.push('flushSave'); return Promise.resolve(); },
    reload: () => { reloads++; },
  });

  assert.ok(captured, 'accept handler captured');
  captured();
  // flushSave returns a promise; postMessage must happen AFTER it settles.
  await Promise.resolve(); await Promise.resolve();

  assert.deepEqual(order, ['flushSave', 'postMessage'], 'save flushed before SKIP_WAITING');
  assert.deepEqual(waiting.posted, [{ type: 'SKIP_WAITING' }]);

  // The new worker activates → controllerchange → exactly one reload.
  swContainer.emit('controllerchange');
  swContainer.emit('controllerchange'); // second event must be ignored (loop guard)
  assert.equal(reloads, 1, 'reload happens exactly once');
});

test('updatefound → installed (while controlled) prompts', () => {
  let prompted = false;
  const installing = makeEmitter();
  Object.assign(installing, { state: 'installing' });
  const registration = Object.assign(makeEmitter(), { waiting: null, installing });

  wireUpdateFlow({
    registration: /** @type {any} */ (registration),
    controller: /** @type {any} */ ({}),
    swContainer: /** @type {any} */ (makeEmitter()),
    onUpdateReady: () => { prompted = true; },
  });

  // fire updatefound, then the installing worker transitions to 'installed'
  registration.emit('updatefound');
  /** @type {any} */ (installing).state = 'installed';
  installing.emit('statechange');
  assert.equal(prompted, true);
});

test('first install (no existing controller) does NOT prompt', () => {
  let prompted = false;
  const installing = makeEmitter();
  Object.assign(installing, { state: 'installing' });
  const registration = Object.assign(makeEmitter(), { waiting: null, installing });

  wireUpdateFlow({
    registration: /** @type {any} */ (registration),
    controller: null, // no previous SW → this is a first install, not an update
    swContainer: /** @type {any} */ (makeEmitter()),
    onUpdateReady: () => { prompted = true; },
  });

  registration.emit('updatefound');
  /** @type {any} */ (installing).state = 'installed';
  installing.emit('statechange');
  assert.equal(prompted, false, 'fresh install must not show an update prompt');
});
