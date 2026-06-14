import { readConfigExtract } from '../lib/sources.mjs';
import { makeMeta } from '../lib/provenance.mjs';

/**
 * Approximated buildersProvided/masonProvided capacity for each houseBuilder company.
 * These fields are NOT in the original source (config-extract.json) — they are approximated
 * for M5-1 T3 (G-BUILDER-CAP gap). Values calibrated in M9.
 * provenance: approximated, gap: G-BUILDER-CAP
 * @type {Record<string, { buildersProvided: number, masonProvided: number }>}
 */
const HOUSE_BUILDER_CAPACITY = {
  'KuttingKorners':  { buildersProvided: 1, masonProvided: 0 },
  'BrickingBad':     { buildersProvided: 2, masonProvided: 1 },
  'HonestlyGood':    { buildersProvided: 3, masonProvided: 1 },
  'LawyeredUp':      { buildersProvided: 5, masonProvided: 2 },
};

/**
 * Approximated buildersProvided/masonProvided for mineBuilder companies.
 * provenance: approximated, gap: G-BUILDER-CAP
 * @type {Record<string, { buildersProvided: number, masonProvided: number }>}
 */
const MINE_BUILDER_CAPACITY = {
  'StrikeGoldInc': { buildersProvided: 2, masonProvided: 0 },
};

const CAPACITY_META = { provenance: 'approximated', gap: 'G-BUILDER-CAP' };

export function extractCompanies() {
  const raw = readConfigExtract();
  /** @type {{explorer: Array<Record<string,unknown>>, houseBuilder: Array<Record<string,unknown>>, mineBuilder: Record<string,unknown>|Array<Record<string,unknown>>}} */
  const companies = /** @type {any} */ (raw['companies']);

  // Normalize mineBuilder from object to array
  const mineBuilder = Array.isArray(companies.mineBuilder)
    ? companies.mineBuilder
    : [companies.mineBuilder];

  // Add type field to explorer companies
  const explorer = companies.explorer.map(/** @param {Record<string,unknown>} c */ c => ({ ...c, type: 'explorer' }));

  // Inject approximated builder capacity fields (G-BUILDER-CAP, iter-013 M5-1 T3)
  const houseBuilderWithCapacity = companies.houseBuilder.map(/** @param {Record<string,unknown>} c */ c => {
    const id = /** @type {string} */ (c['id']);
    const cap = HOUSE_BUILDER_CAPACITY[id];
    if (cap) {
      return { ...c, ...cap, _meta: CAPACITY_META };
    }
    return c;
  });

  const mineBuilderWithCapacity = mineBuilder.map(/** @param {Record<string,unknown>} c */ c => {
    const id = /** @type {string} */ (c['id']);
    const cap = MINE_BUILDER_CAPACITY[id];
    if (cap) {
      return { ...c, ...cap, _meta: CAPACITY_META };
    }
    return c;
  });

  return {
    _meta: {
      ...makeMeta('doc/original_source/extracted/config-extract.json', 'extracted'),
      notes: 'iter-013 M5-1 T3: added buildersProvided/masonProvided (gap G-BUILDER-CAP, provenance:approximated)',
    },
    companies: {
      explorer,
      houseBuilder: houseBuilderWithCapacity,
      mineBuilder: mineBuilderWithCapacity,
    },
  };
}
