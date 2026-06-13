import { readConfigExtract } from '../lib/sources.mjs';
import { makeMeta } from '../lib/provenance.mjs';

export function extractCompanies() {
  const raw = readConfigExtract();
  const companies = raw.companies;

  // Normalize mineBuilder from object to array
  const mineBuilder = Array.isArray(companies.mineBuilder)
    ? companies.mineBuilder
    : [companies.mineBuilder];

  // Add type field to explorer companies
  const explorer = companies.explorer.map(c => ({ ...c, type: 'explorer' }));

  return {
    _meta: makeMeta('doc/original_source/extracted/config-extract.json', 'extracted'),
    companies: {
      explorer,
      houseBuilder: companies.houseBuilder,
      mineBuilder,
    },
  };
}
