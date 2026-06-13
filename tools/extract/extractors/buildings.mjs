import { makeMeta } from '../lib/provenance.mjs';

export function extractBuildings() {
  const items = [
    { id: 'builderHut', baseCost: { wood: 30 }, category: 'production', name: 'Builder Hut' },
    { id: 'granary', baseCost: { wood: 50 }, category: 'storage', name: 'Granary' },
    { id: 'townCenter', baseCost: { gold: 500, wood: 200 }, category: 'service', name: 'Town Center' },
    { id: 'warehouse', baseCost: { ore: 20, wood: 100 }, category: 'storage', name: 'Warehouse' },
  ];
  return {
    _meta: makeMeta('doc/original_source/modules/prosperity/services/config.js', 'derived', 'Reconstructed from config.js building references; full list in G-LISTBUILDINGS'),
    buildings: items,
  };
}
