/**
 * Provenance helpers - track data source for each catalog.
 */

/**
 * @typedef {{ source: string, provenance: string, notes?: string }} MetaBlock
 */

/**
 * Create a _meta block for a catalog.
 * @param {string} source - source file description
 * @param {string} provenance - 'extracted' | 'derived' | 'approximated'
 * @param {string} [notes]
 * @returns {MetaBlock}
 */
export function makeMeta(source, provenance, notes) {
  /** @type {MetaBlock} */
  const meta = { source, provenance };
  if (notes) meta.notes = notes;
  return meta;
}
