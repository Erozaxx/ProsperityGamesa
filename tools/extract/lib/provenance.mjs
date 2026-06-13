/**
 * Provenance helpers - track data source for each catalog.
 */

/**
 * Create a _meta block for a catalog.
 * @param {string} source - source file description
 * @param {string} provenance - 'extracted' | 'derived' | 'approximated'
 * @param {string} [notes]
 * @returns {object}
 */
export function makeMeta(source, provenance, notes) {
  const meta = { source, provenance };
  if (notes) meta.notes = notes;
  return meta;
}
