import { readConfigExtract } from '../lib/sources.mjs';
import { makeMeta } from '../lib/provenance.mjs';

export function extractMilitary() {
  const raw = readConfigExtract();
  const items = [
    {
      id: 'archer',
      goldCost: raw.GOLDCOSTPERARCHER,
      name: 'Archer',
      upkeep: raw.ARCHERUPKEEP,
    },
    {
      id: 'warrior',
      goldCost: raw.GOLDCOSTPERWARRIOR,
      name: 'Warrior',
      upkeep: raw.WARRIORUPKEEP,
    },
  ];
  return {
    _meta: makeMeta('doc/original_source/extracted/config-extract.json', 'extracted'),
    military: items,
  };
}
