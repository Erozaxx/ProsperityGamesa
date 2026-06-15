/**
 * Ephemeral UI event bus — T4 (iter-019 M8).
 *
 * Design: design_iter-019.md §7.
 *
 * Events are push-drained OUTSIDE of state — zero hashState impact.
 * Engine emits { type, ...payload } via ctx.emitEvent; UI consumes via drain().
 * During catch-up the bus is drained into an aggregate (not spam toasts).
 *
 * Core never imports this module (no DOM, no app dependency in core).
 */

/**
 * @typedef {{ type: string; [key: string]: unknown }} UiEvent
 */

/**
 * @typedef {{
 *   push: (ev: UiEvent) => void,
 *   drain: () => UiEvent[],
 *   size: () => number,
 * }} UiEventBus
 */

/**
 * Creates a new ephemeral UI event bus.
 * All events are plain-data objects ({ type, ...payload }).
 * Consumers call drain() each frame to get and process pending events.
 *
 * @returns {UiEventBus}
 */
export function createUiEventBus() {
  /** @type {UiEvent[]} */
  let queue = [];

  return {
    /**
     * Push an event onto the queue.
     * Called by engine (via ctx.emitEvent) inside step() — deterministic, no DOM.
     * @param {UiEvent} ev
     */
    push(ev) {
      queue.push(ev);
    },

    /**
     * Drain all pending events and return them.
     * Clears the queue. Called by UI layer each render/rAF cycle.
     * @returns {UiEvent[]}
     */
    drain() {
      const events = queue;
      queue = [];
      return events;
    },

    /**
     * Returns the current queue length (non-destructive).
     * @returns {number}
     */
    size() {
      return queue.length;
    },
  };
}

/**
 * Aggregate drained events into a catch-up summary object.
 * Called after catch-up batch completes to avoid spam toasts.
 * Returns counts per event type.
 *
 * @param {UiEvent[]} events
 * @returns {Record<string, number>}
 */
export function aggregateUiEvents(events) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const ev of events) {
    counts[ev.type] = (counts[ev.type] ?? 0) + 1;
  }
  return counts;
}
