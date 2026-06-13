import { makeMeta } from '../lib/provenance.mjs';

export function extractGoods() {
  return {
    _meta: makeMeta('doc/original_source', 'approximated', 'listGoods not found in extracted sources; gap G-LISTGOODS'),
    goods: [],
  };
}
