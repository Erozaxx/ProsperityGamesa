import { makeMeta } from '../lib/provenance.mjs';

/**
 * S-3 iter-007 M2a-1: products changed from array to map {resourceId: amount}.
 * iter-009 M3: added maxStep, max, autoAssignable fields. Builder stub added.
 * Production amounts are estimated from home.js job loops; real calibration in M9.
 * maxStep provenance: approximated, gap G-JOB-MAXSTEP.
 */
export function extractJobs() {
  const items = [
    { id: 'baker',       name: 'Baker',        products: { bread: 2 },              maxStep: 0.005, max: 50, autoAssignable: true },
    { id: 'cheesefarmer',name: 'Cheese Farmer', products: { cheese: 1 },             maxStep: 0.005, max: 50, autoAssignable: true },
    { id: 'farmer',      name: 'Farmer',        products: { fruit: 1, vegetable: 1 }, maxStep: 0.005, max: 50, autoAssignable: true },
    { id: 'fisher',      name: 'Fisher',        products: { fish: 2 },               maxStep: 0.005, max: 50, autoAssignable: true },
    { id: 'hunter',      name: 'Hunter',        products: { meat: 1 },               maxStep: 0.005, max: 50, autoAssignable: true },
    { id: 'miner',       name: 'Miner',         products: { ore: 2, stone: 1 },      maxStep: 0.005, max: 50, autoAssignable: true },
    { id: 'woodcutter',  name: 'Woodcutter',    products: { wood: 3 },               maxStep: 0.005, max: 50, autoAssignable: true },
    // Builder stub for M5 building construction (gap G-BUILDER-M5)
    { id: 'builder',     name: 'Builder',       products: {}, noProduction: true, category: 'builder', maxStep: 0, max: 100, autoAssignable: false, _note: 'Stub for M5 building construction (gap G-BUILDER-M5)' },
  ];
  return {
    _meta: makeMeta(
      'doc/original_source/modules/prosperity/services/home.js',
      'derived',
      'Reconstructed from home.js job loops; products changed to map {resourceId:amount} per S-3 iter-007 M2a-1. maxStep and max added in iter-009 M3. Production amounts are estimated; real calibration in M3. maxStep provenance: approximated, gap G-JOB-MAXSTEP.'
    ),
    jobs: items,
  };
}
