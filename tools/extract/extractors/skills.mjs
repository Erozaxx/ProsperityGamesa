import { makeMeta } from '../lib/provenance.mjs';

export function extractSkills() {
  return {
    _meta: makeMeta('doc/original_source', 'approximated', 'listSkill not found in extracted sources; gap G-LISTSKILL'),
    skills: [],
  };
}
