/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('../state/types.js').ScheduleEntry} ScheduleEntry
 */

/**
 * Compares two entries for heap ordering.
 * Primary: step (lower first); Secondary: seq (lower first = FIFO tie-breaker).
 * @param {ScheduleEntry} a
 * @param {ScheduleEntry} b
 * @returns {boolean} true if a should be above b in min-heap
 */
function less(a, b) {
  return a.step < b.step || (a.step === b.step && a.seq < b.seq);
}

/**
 * @param {number} i
 * @returns {number}
 */
function parent(i) { return Math.floor((i - 1) / 2); }
/**
 * @param {number} i
 * @returns {number}
 */
function left(i) { return 2 * i + 1; }
/**
 * @param {number} i
 * @returns {number}
 */
function right(i) { return 2 * i + 2; }

/**
 * @param {ScheduleEntry[]} heap
 * @param {number} i
 */
function siftUp(heap, i) {
  while (i > 0) {
    const p = parent(i);
    if (less(heap[i], heap[p])) {
      const tmp = heap[i]; heap[i] = heap[p]; heap[p] = tmp;
      i = p;
    } else break;
  }
}

/**
 * @param {ScheduleEntry[]} heap
 * @param {number} i
 */
function siftDown(heap, i) {
  const n = heap.length;
  while (true) {
    let smallest = i;
    const l = left(i);
    const r = right(i);
    if (l < n && less(heap[l], heap[smallest])) smallest = l;
    if (r < n && less(heap[r], heap[smallest])) smallest = r;
    if (smallest === i) break;
    const tmp = heap[i]; heap[i] = heap[smallest]; heap[smallest] = tmp;
    i = smallest;
  }
}

/**
 * Inserts a one-shot event into the scheduler heap.
 * Maintains heap invariant and scheduleCount index.
 * @param {GameState} state
 * @param {number} step - absolute step when event should fire (must be >= curStep in dev)
 * @param {string} id - handler string-ID
 * @param {object} [params]
 * @returns {void}
 */
export function scheduleInsert(state, step, id, params = {}) {
  if (step < state.engine.curStep) {
    throw new Error(`scheduleInsert: step ${step} is in the past (curStep=${state.engine.curStep})`);
  }
  /** @type {ScheduleEntry} */
  const entry = { step, id, params: /** @type {Record<string,unknown>} */ (params), seq: state.engine._seq++ };
  state.engine.schedule.push(entry);
  siftUp(state.engine.schedule, state.engine.schedule.length - 1);
  state.engine.scheduleCount[id] = (state.engine.scheduleCount[id] ?? 0) + 1;
}

/**
 * Pops the minimum entry from the heap.
 * @param {GameState} state
 * @returns {ScheduleEntry | undefined}
 */
function popMin(state) {
  const heap = state.engine.schedule;
  if (heap.length === 0) return undefined;
  const top = heap[0];
  const last = heap.pop();
  if (heap.length > 0 && last !== undefined) {
    heap[0] = last;
    siftDown(heap, 0);
  }
  const cnt = state.engine.scheduleCount[top.id];
  if (cnt !== undefined) {
    if (cnt <= 1) {
      delete state.engine.scheduleCount[top.id];
    } else {
      state.engine.scheduleCount[top.id] = cnt - 1;
    }
  }
  return top;
}

/**
 * Removes and returns all events with entry.step <= curStep, in ascending step/seq order.
 * @param {GameState} state
 * @param {number} curStep
 * @returns {ScheduleEntry[]}
 */
export function scheduleDue(state, curStep) {
  const out = [];
  while (state.engine.schedule.length > 0 && state.engine.schedule[0].step <= curStep) {
    const entry = popMin(state);
    if (entry !== undefined) out.push(entry);
  }
  return out;
}

/**
 * Cancels scheduled events matching a predicate. Updates scheduleCount.
 * @param {GameState} state
 * @param {(e: ScheduleEntry) => boolean} pred
 * @returns {number} number of cancelled events
 */
export function scheduleCancel(state, pred) {
  const heap = state.engine.schedule;
  let cancelled = 0;
  for (let i = heap.length - 1; i >= 0; i--) {
    if (pred(heap[i])) {
      const id = heap[i].id;
      heap.splice(i, 1);
      const cnt = state.engine.scheduleCount[id];
      if (cnt !== undefined) {
        if (cnt <= 1) delete state.engine.scheduleCount[id];
        else state.engine.scheduleCount[id] = cnt - 1;
      }
      cancelled++;
    }
  }
  // Re-heapify after removals
  if (cancelled > 0) {
    for (let i = Math.floor(heap.length / 2) - 1; i >= 0; i--) {
      siftDown(heap, i);
    }
  }
  return cancelled;
}

/**
 * Returns count of scheduled events with given id.
 * @param {GameState} state
 * @param {string} id
 * @returns {number}
 */
export function scheduleCountOf(state, id) {
  return state.engine.scheduleCount[id] ?? 0;
}
