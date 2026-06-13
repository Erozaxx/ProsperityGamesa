import { makeMeta } from '../lib/provenance.mjs';

/**
 * iter-009 M3: added two approximated example skills for system testing.
 * Real skill list (listSkill.json) not found in extracted sources (gap G-LISTSKILL).
 * Skills produce existing resource kinds (wood/techPt) to avoid introducing fictitious goods.
 * maxStep=50 with stepCompensation=0.5 gives effMaxStep=25; completion on step 26.
 */
export function extractSkills() {
  const items = [
    {
      id: 'woodworking',
      name: 'Woodworking',
      maxStep: 50,
      products: { wood: 5 },
      cost: {},
      discovered: true,
      _note: 'Approximated skill – real skill list missing (G-LISTSKILL). Produces wood (existing resource kind).',
    },
    {
      id: 'scholarship',
      name: 'Scholarship',
      maxStep: 100,
      products: { techPt: 1 },
      cost: {},
      discovered: true,
      _note: 'Approximated skill – real skill list missing (G-LISTSKILL). Produces techPt (existing resource kind).',
    },
  ];
  return {
    _meta: makeMeta('doc/original_source', 'approximated', 'listSkill not found in extracted sources; gap G-LISTSKILL. Two approximated example skills added in iter-009 M3 for system testing. Skills produce existing resource kinds (wood/techPt) to avoid introducing fictitious goods (gap G-LISTGOODS). maxStep=50 with stepCompensation=0.5 gives effMaxStep=25; completion on step 26. provenance: approximated.'),
    skills: items,
  };
}
