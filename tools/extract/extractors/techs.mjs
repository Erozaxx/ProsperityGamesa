import { makeMeta } from '../lib/provenance.mjs';

export function extractTechs() {
  return {
    _meta: makeMeta('doc/original_source', 'approximated', 'listTechs not found in extracted sources; gap G-LISTTECHS'),
    techs: {
      sectors: [],
      techBase: 100,
      techScale: 1.25,
      tree: [],
    },
  };
}
