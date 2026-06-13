import { readConfigExtract } from '../lib/sources.mjs';
import { makeMeta } from '../lib/provenance.mjs';

export function extractPopulation() {
  const raw = readConfigExtract();
  return {
    _meta: makeMeta('doc/original_source/modules/prosperity/services/config.js', 'extracted'),
    population: {
      baseSpoilage: { bread: 0.08, cheese: 0.10, fish: 0.23, fruit: 0.22, meat: 0.18, vegetable: 0.14 },
      causesOfDeath: /** @type {string[]} */ (raw['CAUSESOFDEATH']),
      consumeFoodRate: 2,
      maxFood: 500,
      natality: { matRate: 0.04, retRate: 0.02 },
      spoilage: { bread: 0.08, cheese: 0.08, fish: 0.23, fruit: 0.22, meat: 0.18, vegetable: 0.14 },
    },
  };
}
