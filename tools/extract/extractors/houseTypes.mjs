import { readConfigExtract } from '../lib/sources.mjs';
import { makeMeta } from '../lib/provenance.mjs';

export function extractHouseTypes() {
  const raw = readConfigExtract();
  const houseTypes = /** @type {Record<string, {effects:{attractiveness:number,workers:number,capacity?:number}}>} */ (raw['houseTypes']);
  const items = Object.entries(houseTypes).map(([id, ht]) => ({
    id,
    attractiveness: ht.effects.attractiveness,
    capacity: ht.effects.capacity ?? null,
    workers: ht.effects.workers,
  }));
  return {
    _meta: makeMeta('doc/original_source/extracted/config-extract.json', 'extracted'),
    houseTypes: items,
  };
}
