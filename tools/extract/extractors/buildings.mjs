/**
 * Buildings catalog extractor.
 * iter-013 M5-1: expanded with resistance/maxProgress/builders/effects fields.
 * New buildings (workerHouse, well) approximated per design §9 (G-LISTBUILDINGS).
 * Note: id='workerHouse' (not 'house') to avoid K10 collision with houseTypes catalog.
 * iter-015 M6 T3: added academy/university buildings with researchExp attribute.
 *   Source: controllers/academy.js (academy unlock, scholars). provenance: approximated.
 *   Gap G-RESEARCH-ACADEMY: exact researchExp values approximated; calibration M9.
 */
import { makeMeta } from '../lib/provenance.mjs';

export function extractBuildings() {
  const items = [
    {
      id: 'builderHut',
      name: 'Builder Hut',
      category: 'production',
      baseCost: { wood: 30 },
      resistance: 100,
      maxProgress: 5,
      builders: 1,
      unlocked: true,
      effects: [
        { attr: 'maxActiveProjects', op: 'add', value: 1 },
        { attr: 'maxProjectQueue',   op: 'add', value: 3 },
      ],
      _meta: { resistance: 'approximated', maxProgress: 'approximated', builders: 'approximated', effects: 'approximated', gap: 'G-LISTBUILDINGS' },
    },
    {
      id: 'granary',
      name: 'Granary',
      category: 'storage',
      baseCost: { wood: 50 },
      resistance: 100,
      maxProgress: 7,
      builders: 1,
      unlocked: true,
      effects: [
        { attr: 'storage.food', op: 'add', value: 200 },
      ],
      _meta: { resistance: 'approximated', maxProgress: 'approximated', builders: 'approximated', effects: 'approximated', gap: 'G-LISTBUILDINGS' },
    },
    {
      id: 'townCenter',
      name: 'Town Center',
      category: 'service',
      baseCost: { gold: 500, wood: 200 },
      resistance: 150,
      maxProgress: 20,
      builders: 3,
      unlocked: true,
      effects: [
        { attr: 'attractiveness', op: 'add', value: 50 },
        { attr: 'workers',        op: 'add', value: 10 },
      ],
      _meta: { resistance: 'approximated', maxProgress: 'approximated', builders: 'approximated', effects: 'approximated', gap: 'G-LISTBUILDINGS' },
    },
    {
      id: 'warehouse',
      name: 'Warehouse',
      category: 'storage',
      baseCost: { ore: 20, wood: 100 },
      resistance: 120,
      maxProgress: 10,
      builders: 2,
      unlocked: true,
      effects: [
        { attr: 'storage.goods', op: 'add', value: 500 },
      ],
      _meta: { resistance: 'approximated', maxProgress: 'approximated', builders: 'approximated', effects: 'approximated', gap: 'G-LISTBUILDINGS' },
    },
    {
      id: 'workerHouse',
      name: 'Worker House',
      category: 'housing',
      baseCost: { wood: 40, ore: 5 },
      resistance: 80,
      maxProgress: 5,
      builders: 1,
      unlocked: true,
      effects: [
        { attr: 'workers', op: 'add', value: 5 },
      ],
      _meta: { provenance: 'approximated', gap: 'G-LISTBUILDINGS', note: "id='workerHouse' (not 'house') to avoid K10 collision with houseTypes catalog" },
    },
    {
      id: 'well',
      name: 'Well',
      category: 'service',
      baseCost: { wood: 15, ore: 10 },
      resistance: 60,
      maxProgress: 3,
      builders: 1,
      unlocked: true,
      effects: [
        { attr: 'attractiveness', op: 'add', value: 5 },
      ],
      _meta: { provenance: 'approximated', gap: 'G-LISTBUILDINGS' },
    },
    // iter-015 M6 T3: academy/university — provide researchExp via effective() (gap G-RESEARCH-ACADEMY)
    {
      id: 'academy',
      name: 'Academy',
      category: 'service',
      baseCost: { gold: 200, wood: 80, ore: 20 },
      resistance: 120,
      maxProgress: 15,
      builders: 2,
      unlocked: true,
      effects: [
        { attr: 'attractiveness', op: 'add', value: 10 },
        { attr: 'researchExp',    op: 'add', value: 2  },
      ],
      _meta: { provenance: 'approximated', gap: 'G-RESEARCH-ACADEMY', note: 'Academy: researchExp=2 per building. Source: controllers/academy.js. M6 T3 min. playable set.' },
    },
    {
      id: 'university',
      name: 'University',
      category: 'service',
      baseCost: { gold: 500, wood: 150, ore: 50 },
      resistance: 150,
      maxProgress: 30,
      builders: 3,
      unlocked: true,
      effects: [
        { attr: 'attractiveness', op: 'add', value: 20 },
        { attr: 'researchExp',    op: 'add', value: 5  },
      ],
      _meta: { provenance: 'approximated', gap: 'G-RESEARCH-ACADEMY', note: 'University: researchExp=5 per building. RNG scholar bonus vynechán (G-RESEARCH-UNIV-RNG). M6 T3 min. playable set.' },
    },
  ];
  return {
    _meta: makeMeta(
      'doc/original_source/modules/prosperity/services/config.js',
      'derived (existing 4 buildings) / approximated (new fields + new buildings)',
      'Reconstructed from config.js building references; M5-1 expansion: resistance/maxProgress/builders/effects added. G-LISTBUILDINGS autonomously extended per §9 (design_iter-013_T-001.md). New buildings (workerHouse, well) approximated.'
    ),
    buildings: items,
  };
}
