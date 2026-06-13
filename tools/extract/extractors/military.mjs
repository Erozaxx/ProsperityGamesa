import { readConfigExtract } from '../lib/sources.mjs';
import { makeMeta } from '../lib/provenance.mjs';

export function extractMilitary() {
  const raw = readConfigExtract();
  const items = [
    {
      id: 'archer',
      goldCost: /** @type {number} */ (raw['GOLDCOSTPERARCHER']),
      name: 'Archer',
      upkeep: /** @type {number} */ (raw['ARCHERUPKEEP']),
    },
    {
      id: 'warrior',
      goldCost: /** @type {number} */ (raw['GOLDCOSTPERWARRIOR']),
      name: 'Warrior',
      upkeep: /** @type {number} */ (raw['WARRIORUPKEEP']),
    },
  ];
  return {
    _meta: makeMeta('doc/original_source/extracted/config-extract.json', 'extracted'),
    military: items,
  };
}
