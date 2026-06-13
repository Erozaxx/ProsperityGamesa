import { readConfigExtract } from '../lib/sources.mjs';
import { makeMeta } from '../lib/provenance.mjs';

export function extractHouseTypes() {
  const raw = readConfigExtract();
  const items = Object.entries(raw.houseTypes).map(([id, ht]) => ({
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
