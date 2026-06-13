import { makeMeta } from '../lib/provenance.mjs';

export function extractJobs() {
  const items = [
    { id: 'baker', name: 'Baker', products: ['bread'] },
    { id: 'cheesefarmer', name: 'Cheese Farmer', products: ['cheese'] },
    { id: 'farmer', name: 'Farmer', products: ['vegetable', 'fruit'] },
    { id: 'fisher', name: 'Fisher', products: ['fish'] },
    { id: 'hunter', name: 'Hunter', products: ['meat'] },
    { id: 'miner', name: 'Miner', products: ['ore', 'stone'] },
    { id: 'woodcutter', name: 'Woodcutter', products: ['wood'] },
  ];
  return {
    _meta: makeMeta('doc/original_source/modules/prosperity/services/home.js', 'derived', 'Reconstructed from home.js job loops; exact production numbers are estimates'),
    jobs: items,
  };
}
