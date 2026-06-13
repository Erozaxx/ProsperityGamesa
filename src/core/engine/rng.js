/**
 * @typedef {import('../state/types.js').GameState} GameState
 * @typedef {import('../state/types.js').StreamName} StreamName
 * @typedef {import('../state/types.js').Rng} Rng
 */

// Stream names in fixed order (determinism)
const STREAM_NAMES = /** @type {StreamName[]} */ (['population','forest','mine','field','market','world','battle','events']);

/**
 * Single step of mulberry32 PRNG.
 * @param {number} a - uint32 state
 * @returns {[number, number]} [float in [0,1), new uint32 state]
 */
function mulberryStep(a) {
  a = ((a + 0x6D2B79F5) | 0) >>> 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const val = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [val, a];
}

/**
 * Returns a thin RNG bound to state.rng.streams[name].
 * Reads/writes state directly (serializable, survives save).
 * @param {GameState} state
 * @param {StreamName} name
 * @returns {Rng}
 */
export function makeRng(state, name) {
  const next = () => {
    const s = state.rng.streams[name] ?? 0;
    const [val, s2] = mulberryStep(s);
    state.rng.streams[name] = s2;
    return val;
  };
  return {
    next,
    int: (maxExclusive) => Math.floor(next() * maxExclusive),
    range: (min, max) => min + next() * (max - min),
    chance: (p) => next() < p,
  };
}

/**
 * Initializes all named streams from state.rng.seed (deterministically, one uint32 per stream).
 * Idempotent only if streams don't yet exist – do NOT call after load (state is in save).
 * @param {GameState} state
 * @returns {void}
 */
export function initRng(state) {
  const base = state.rng.seed >>> 0;
  for (let i = 0; i < STREAM_NAMES.length; i++) {
    const name = STREAM_NAMES[i];
    if (state.rng.streams[name] === undefined) {
      state.rng.streams[name] = (base + (i + 1) * 0x9E3779B9) >>> 0;
    }
  }
}

/**
 * Stable FNV-1a 32-bit hash of entire state for determinism testing.
 * Uses JSON.stringify with sorted keys for stability across key insertion order.
 * @param {GameState} state
 * @returns {number}
 */
export function hashState(state) {
  const json = JSON.stringify(state, (_, val) => {
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      return Object.fromEntries(Object.keys(val).sort().map(k => [k, val[k]]));
    }
    return val;
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) {
    h ^= json.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}
