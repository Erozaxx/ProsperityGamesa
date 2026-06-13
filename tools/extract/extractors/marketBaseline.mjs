import { makeMeta } from '../lib/provenance.mjs';

export function extractMarketBaseline() {
  return {
    _meta: makeMeta('doc/original_source', 'approximated', 'basePrice is random at runtime; gap G-MARKETBASELINE'),
    marketBaseline: {},
  };
}
