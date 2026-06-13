import { makeMeta } from '../lib/provenance.mjs';

/**
 * iter-009 M3: added stock kind for world stockpiles (trees/animals/ores/livestock/farmland).
 * Stock resources live in state.world sub-domains, not in home.store.
 */
export function extractResources() {
  const items = [
    { id: 'gold',      kind: 'gold',     name: 'Gold' },
    { id: 'ore',       kind: 'resource', name: 'Ore' },
    { id: 'stone',     kind: 'resource', name: 'Stone' },
    { id: 'techPt',    kind: 'techPt',   name: 'Tech Points' },
    { id: 'wood',      kind: 'resource', name: 'Wood' },
    // Stock resources (world stockpiles) – iter-009 M3. Source: config.js:686-715.
    { id: 'trees',     kind: 'stock',    name: 'Trees' },
    { id: 'animals',   kind: 'stock',    name: 'Animals' },
    { id: 'ores',      kind: 'stock',    name: 'Ore Deposits' },
    { id: 'livestock', kind: 'stock',    name: 'Livestock' },
    { id: 'farmland',  kind: 'stock',    name: 'Farmland' },
  ];
  return {
    _meta: makeMeta('doc/original_source/modules/prosperity/services/config.js', 'derived', 'Reconstructed from config.js references. iter-009 M3: added stock kind for world stockpiles (trees/animals/ores/livestock/farmland). Stock resources live in state.world sub-domains, not in home.store.'),
    resources: items,
  };
}
