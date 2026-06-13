/**
 * App-layer catalog loader: fetches all JSON catalogs and loads them into the catalog store.
 * S-1: centralised catalog bootstrap for main.js.
 */

import { loadCatalog, assertCatalogValid } from '../core/catalog/index.js';

/** Catalog names that are loaded from src/data/ */
const CATALOG_NAMES = [
  'achievements',
  'buildings',
  'food',
  'houseTypes',
  'jobs',
  'military',
  'resources',
  'companies',
];

/**
 * Fetch and load all catalogs. Throws on fetch or validation failure.
 * @returns {Promise<void>}
 */
export async function loadAllCatalogs() {
  const results = await Promise.all(
    CATALOG_NAMES.map(async (name) => {
      const res = await fetch(`./src/data/${name}.json`);
      if (!res.ok) {
        throw new Error(`catalog: failed to fetch ${name}.json (${res.status})`);
      }
      const data = await res.json();
      return { name, data };
    })
  );
  for (const { name, data } of results) {
    loadCatalog(name, data);
    assertCatalogValid(name, data);
  }
}
