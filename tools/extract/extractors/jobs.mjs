import { makeMeta } from '../lib/provenance.mjs';

/**
 * S-3 iter-007 M2a-1: products changed from array to map {resourceId: amount}.
 * Production amounts are estimated from home.js job loops; real calibration in M3.
 * provenance: derived.
 */
export function extractJobs() {
  const items = [
    { id: 'baker',       name: 'Baker',        products: { bread: 2 } },
    { id: 'cheesefarmer',name: 'Cheese Farmer', products: { cheese: 1 } },
    { id: 'farmer',      name: 'Farmer',        products: { vegetable: 1, fruit: 1 } },
    { id: 'fisher',      name: 'Fisher',        products: { fish: 2 } },
    { id: 'hunter',      name: 'Hunter',        products: { meat: 1 } },
    { id: 'miner',       name: 'Miner',         products: { ore: 2, stone: 1 } },
    { id: 'woodcutter',  name: 'Woodcutter',    products: { wood: 3 } },
  ];
  return {
    _meta: makeMeta(
      'doc/original_source/modules/prosperity/services/home.js',
      'derived',
      'Reconstructed from home.js job loops; products changed to map {resourceId:amount} per S-3 iter-007 M2a-1. Production amounts are estimated; real calibration in M3.'
    ),
    jobs: items,
  };
}
