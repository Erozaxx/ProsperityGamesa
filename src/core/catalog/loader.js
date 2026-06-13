/**
 * Catalog loader - loads JSON catalogs from src/data/ at runtime.
 * NOTE: This module uses dynamic import for JSON files.
 * In Node.js with --experimental-json-modules or import assertions, JSON can be imported.
 * We use a synchronous loader pattern with pre-loaded data for the core.
 *
 * iter-007 M2a-1: added byId registry + K10 cross-type collision detection.
 */

/** @type {Record<string, object>} */
const _store = {};

/**
 * @typedef {{ type: string, entry: object }} ByIdEntry
 */

/** Cached flat id→{type,entry} index. Invalidated on clearCatalogs / loadCatalog.
 * @type {Map<string, ByIdEntry> | null}
 */
let _byIdCache = null;

/** Catalogs whose items have an "id" field (indexed by byId). */
const ID_CATALOGS = new Set([
  'achievements', 'buildings', 'food', 'houseTypes', 'jobs', 'military', 'resources',
]);

/** Catalogs with named sections whose sub-items have an "id" field. */
const SECTION_CATALOGS = /** @type {Record<string, string[]>} */ ({
  companies: ['explorer', 'houseBuilder', 'mineBuilder'],
});

/**
 * Load a catalog into the store.
 * @param {string} name
 * @param {object} data
 * @returns {void}
 */
export function loadCatalog(name, data) {
  _store[name] = data;
  _byIdCache = null; // invalidate
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
  _byIdCache = null;
}

/**
 * Builds and caches a flat id→{type,entry} index across all loaded catalogs.
 * Throws on cross-type id collision (K10).
 * @returns {Map<string, ByIdEntry>}
 */
export function buildById() {
  /** @type {Map<string, ByIdEntry>} */
  const index = new Map();

  for (const name of Object.keys(_store)) {
    const cat = /** @type {Record<string, unknown>} */ (_store[name]);

    // Array-style catalogs with id fields
    if (ID_CATALOGS.has(name)) {
      const items = /** @type {Array<Record<string, unknown>>} */ (cat[name]);
      if (!Array.isArray(items)) continue;
      for (const entry of items) {
        const id = /** @type {string | undefined} */ (entry['id']);
        if (id === undefined) continue;
        if (index.has(id)) {
          const existing = /** @type {ByIdEntry} */ (index.get(id));
          if (existing.type !== name) {
            throw new Error(
              `catalog: id collision "${id}" in ${existing.type} and ${name}`
            );
          }
        } else {
          index.set(id, { type: name, entry });
        }
      }
    }

    // Section-based catalogs (companies)
    if (Object.prototype.hasOwnProperty.call(SECTION_CATALOGS, name)) {
      const sections = SECTION_CATALOGS[name];
      const data = /** @type {Record<string, unknown>} */ (cat[name] ?? cat);
      for (const section of sections) {
        const items = /** @type {Array<Record<string, unknown>> | undefined} */ (data[section]);
        if (!Array.isArray(items)) continue;
        for (const entry of items) {
          const id = /** @type {string | undefined} */ (entry['id']);
          if (id === undefined) continue;
          const type = `${name}.${section}`;
          if (index.has(id)) {
            const existing = /** @type {ByIdEntry} */ (index.get(id));
            if (existing.type !== type) {
              throw new Error(
                `catalog: id collision "${id}" in ${existing.type} and ${type}`
              );
            }
          } else {
            index.set(id, { type, entry });
          }
        }
      }
    }
  }

  _byIdCache = index;
  return index;
}

/**
 * Returns the cached byId index, building it if not yet built.
 * @returns {Map<string, ByIdEntry>}
 */
function getByIdIndex() {
  if (!_byIdCache) {
    return buildById();
  }
  return _byIdCache;
}

/**
 * Look up any catalog entry by its id field.
 * Throws if the id is not found (fail-fast, not 'no such item').
 * @param {string} id
 * @returns {ByIdEntry}
 */
export function byId(id) {
  const index = getByIdIndex();
  const entry = index.get(id);
  if (!entry) {
    throw new Error(`catalog: no entry with id "${id}"`);
  }
  return entry;
}

/**
 * Returns true if an entry with the given id exists in the catalog index.
 * @param {string} id
 * @returns {boolean}
 */
export function hasId(id) {
  const index = getByIdIndex();
  return index.has(id);
}
