import { makeMeta } from '../lib/provenance.mjs';

export function extractResources() {
  const items = [
    { id: 'gold', kind: 'gold', name: 'Gold' },
    { id: 'ore', kind: 'resource', name: 'Ore' },
    { id: 'stone', kind: 'resource', name: 'Stone' },
    { id: 'techPt', kind: 'techPt', name: 'Tech Points' },
    { id: 'wood', kind: 'resource', name: 'Wood' },
  ];
  return {
    _meta: makeMeta('doc/original_source/modules/prosperity/services/config.js', 'derived', 'Reconstructed from config.js references'),
    resources: items,
  };
}
