import { readConfigExtract } from '../lib/sources.mjs';
import { makeMeta } from '../lib/provenance.mjs';

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

  return {
    _meta: makeMeta('doc/original_source/extracted/config-extract.json', 'extracted'),
    companies: {
      explorer,
      houseBuilder: companies.houseBuilder,
      mineBuilder,
    },
  };
}
