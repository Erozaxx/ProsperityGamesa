import { SCHEMAS } from './schemas.js';

/**
 * @typedef {{ key: string, issue: string }} ValidationError
 */

/**
 * @typedef {Record<string, unknown> & { _meta?: unknown }} CatalogData
 */

/**
 * Validate a catalog object against its schema.
 * @param {string} name - catalog name (e.g. 'food', 'houseTypes')
 * @param {CatalogData} catalog - the parsed catalog JSON
 * @returns {ValidationError[]} array of errors (empty = valid)
 */
export function validateCatalog(name, catalog) {
  /** @type {ValidationError[]} */
  const errors = [];

  if (!catalog || typeof catalog !== 'object') {
    errors.push({ key: name, issue: 'catalog must be an object' });
    return errors;
  }

  if (!catalog['_meta']) {
    errors.push({ key: `${name}._meta`, issue: 'missing _meta block' });
  }

  const schema = SCHEMAS[name];
  if (!schema) {
    errors.push({ key: name, issue: `no schema registered for catalog "${name}"` });
    return errors;
  }

  // For catalogs with array items, check required fields on each item
  const items = /** @type {Record<string, unknown>} */ (catalog)[name];
  if (Array.isArray(items)) {
    for (let i = 0; i < items.length; i++) {
      const item = /** @type {Record<string, unknown>} */ (items[i]);
      for (const field of schema.required) {
        if (item[field] === undefined) {
          errors.push({ key: `${name}[${i}].${field}`, issue: 'missing required field' });
        }
      }
    }
  } else if (items !== undefined && typeof items === 'object' && items !== null) {
    // For object-style catalogs (balance, population, etc.)
    const itemObj = /** @type {Record<string, unknown>} */ (items);
    for (const field of schema.required) {
      if (itemObj[field] === undefined) {
        errors.push({ key: `${name}.${field}`, issue: 'missing required field' });
      }
    }
  }

  return errors;
}

/**
 * Assert a catalog is valid, throwing on first violation.
 * @param {string} name
 * @param {CatalogData} catalog
 * @returns {void}
 */
export function assertCatalogValid(name, catalog) {
  const errors = validateCatalog(name, catalog);
  if (errors.length > 0) {
    throw new Error(`catalog validation failed for "${name}": ${errors[0].key} - ${errors[0].issue}`);
  }
}
