/**
 * Pure predicate evaluator - shared by story triggers and achievement conditions.
 * No mutations, no RNG, no Date.now/DOM.
 * @module predicate
 */

/** Helper: safe deep-get by dot-path. Returns undefined on missing path, never throws in prod. */
function getPath(/** @type {any} */ obj, /** @type {string} */ path) {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur;
}

/**
 * Evaluates a predicate node against read-only state.
 * @param {any} node
 * @param {any} state
 * @returns {boolean}
 */
export function evalPredicate(node, state) {
  if (!node) return false;
  const kind = node.kind;
  switch (kind) {
    case 'gameStart': return true; // evaluated only on first check (idempotence via used[])
    case 'stateGte': {
      const val = getPath(state, node.path);
      return typeof val === 'number' && val >= node.value;
    }
    case 'stateEq': {
      const val = getPath(state, node.path);
      return val === node.value;
    }
    case 'flagTrue': {
      const val = getPath(state, node.path);
      return Boolean(val);
    }
    case 'sumGte': {
      const sum = (node.paths || []).reduce((acc, p) => {
        const v = getPath(state, p);
        return acc + (typeof v === 'number' ? v : 0);
      }, 0);
      return sum >= node.value;
    }
    case 'and':
      return (node.all || []).every(n => evalPredicate(n, state));
    case 'or':
      return (node.any || []).some(n => evalPredicate(n, state));
    case 'settlementLevel': {
      const level = getPath(state, 'home.settlementLevel');
      return typeof level === 'number' && level >= (node.atLeast ?? 0);
    }
    case 'buildingBuilt': {
      const buildings = getPath(state, 'home.buildings');
      if (!buildings || typeof buildings !== 'object') return false;
      const b = buildings[node.id];
      return b != null && (b.created > 0 || (Array.isArray(b.instances) && b.instances.length > 0));
    }
    case 'calendar':
      // calendar/every triggers are handled by storyCheck via edge detection, not here
      return false;
    case 'never':
      return false;
    default:
      return false;
  }
}
