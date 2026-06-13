import { readConfigExtract } from '../lib/sources.mjs';
import { makeMeta } from '../lib/provenance.mjs';

export function extractAchievements() {
  const raw = readConfigExtract();
  const items = Object.values(raw.achievements).map(({ id, name, description, level }) => ({
    id,
    description,
    level,
    name,
  }));
  return {
    _meta: makeMeta('doc/original_source/extracted/config-extract.json', 'extracted'),
    achievements: items,
  };
}
