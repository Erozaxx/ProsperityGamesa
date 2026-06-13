import { makeMeta } from '../lib/provenance.mjs';

export function extractZones() {
  return {
    _meta: makeMeta('doc/original_source', 'approximated', 'listZone not fully extracted; gap G-LISTZONE'),
    zones: {
      aiStates: [],
      factions: ['player', 'thePrincess', 'thePsychopath', 'theWarlord'],
      policies: ['Growth', 'Military', 'Resource'],
      zones: [],
    },
  };
}
