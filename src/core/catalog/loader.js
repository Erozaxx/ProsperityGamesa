/**
 * Catalog loader - loads JSON catalogs from src/data/ at runtime.
 * NOTE: This module uses dynamic import for JSON files.
 * In Node.js with --experimental-json-modules or import assertions, JSON can be imported.
 * We use a synchronous loader pattern with pre-loaded data for the core.
 */

/** @type {Record<string, object>} */
const _store = {};

/**
 * Load a catalog into the store.
 * @param {string} name
 * @param {object} data
 * @returns {void}
 */
export function loadCatalog(name, data) {
  _store[name] = data;
}

/**
 * Get a loaded catalog by name.
 * @param {string} name
 * @returns {object}
 */
export function getCatalog(name) {
  const cat = _store[name];
  if (!cat) throw new Error(`catalog: "${name}" not loaded`);
  return cat;
}

/**
 * Check if a catalog is loaded.
 * @param {string} name
 * @returns {boolean}
 */
export function hasCatalog(name) {
  return Object.prototype.hasOwnProperty.call(_store, name);
}

/**
 * List all loaded catalog names.
 * @returns {string[]}
 */
export function listCatalogs() {
  return Object.keys(_store);
}

/**
 * Clear all loaded catalogs (for testing).
 * @returns {void}
 */
export function clearCatalogs() {
  for (const key of Object.keys(_store)) {
    delete _store[key];
  }
}
