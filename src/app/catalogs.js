/**
 * App-layer catalog loader: fetches all JSON catalogs and loads them into the catalog store.
 * S-1: centralised catalog bootstrap for main.js.
 * S-5: validate BEFORE load + buildById() after all catalogs loaded.
 */

import { loadCatalog, assertCatalogValid, buildById } from '../core/catalog/index.js';

/** Catalog names that are loaded from src/data/ */
const CATALOG_NAMES = [
  'achievements',
  'buildings',
  'contracts',
  'food',
  'goods',
  'houseTypes',
  'jobs',
  'military',
  'resources',
  'companies',
  'skills',
  'techs',
  'zones',
];

/**
 * Fetch and load all catalogs. Throws on fetch or validation failure.
 * S-5: validate each catalog BEFORE loading it into the store (fail-fast, no dirty store).
 * After all catalogs are loaded, builds the byId cross-catalog index (K10 collision detection).
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
    // S-5: validate BEFORE loading to avoid dirty store on error
    assertCatalogValid(name, data);
    loadCatalog(name, data);
  }
  // S-5: build cross-catalog byId index and detect K10 collisions
  buildById();
}
