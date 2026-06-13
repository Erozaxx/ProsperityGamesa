import { SCHEMAS } from './schemas.js';

/**
 * @typedef {{ key: string, issue: string }} ValidationError
 */

/**
 * @typedef {Record<string, unknown> & { _meta?: unknown }} CatalogData
 */

/**
 * Validates a productMap value: must be a non-null object where all keys are strings
 * and all values are numbers >= 0.
 * @param {unknown} value
 * @returns {string | null} error message or null if valid
 */
function validateProductMap(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return 'must be a non-null object (productMap)';
  }
  const map = /** @type {Record<string, unknown>} */ (value);
  for (const [k, v] of Object.entries(map)) {
    if (typeof k !== 'string') return `key "${String(k)}" must be a string`;
    if (typeof v !== 'number' || v < 0) return `value for key "${k}" must be a number >= 0`;
  }
  return null;
}

/**
 * Validates a productList value: must be a non-empty array of strings.
 * @param {unknown} value
 * @returns {string | null} error message or null if valid
 */
function validateProductList(value) {
  if (!Array.isArray(value)) return 'must be an array (productList)';
  for (let i = 0; i < value.length; i++) {
    if (typeof value[i] !== 'string') return `item[${i}] must be a string`;
  }
  return null;
}

/**
 * Validates a costMap value: must be a non-null object where all keys are strings
 * and all values are numbers >= 0.
 * @param {unknown} value
 * @returns {string | null} error message or null if valid
 */
function validateCostMap(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return 'must be a non-null object (costMap)';
  }
  const map = /** @type {Record<string, unknown>} */ (value);
  for (const [k, v] of Object.entries(map)) {
    if (typeof k !== 'string') return `key "${String(k)}" must be a string`;
    if (typeof v !== 'number' || v < 0) return `value for key "${k}" must be a number >= 0`;
  }
  return null;
}

/**
 * Validate a single field value against a field rule.
 * @param {unknown} value
 * @param {import('./schemas.js').FieldRule} rule
 * @returns {string | null} error message or null if valid
 */
function validateField(value, rule) {
  // nullable: null is ok
  if (value === null) {
    if (rule.nullable) return null;
    return 'must not be null';
  }
  // undefined: handled by required check upstream
  if (value === undefined) {
    return rule.required ? 'missing required field' : null;
  }

  // Special composite types
  if (rule.type === 'productMap') {
    return validateProductMap(value);
  }
  if (rule.type === 'productList') {
    return validateProductList(value);
  }
  if (rule.type === 'costMap') {
    return validateCostMap(value);
  }

  // Primitive types
  if (rule.type === 'string') {
    if (typeof value !== 'string') return `must be a string, got ${typeof value}`;
    if (rule.enum && !rule.enum.includes(value)) {
      return `must be one of [${rule.enum.join(', ')}], got "${value}"`;
    }
  } else if (rule.type === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return `must be a finite number, got ${typeof value}`;
    }
    if (rule.min !== undefined && value < rule.min) {
      return `must be >= ${rule.min}, got ${value}`;
    }
    if (rule.max !== undefined && value > rule.max) {
      return `must be <= ${rule.max}, got ${value}`;
    }
  } else if (rule.type === 'boolean') {
    if (typeof value !== 'boolean') return `must be a boolean, got ${typeof value}`;
  }

  return null;
}

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

      // Backward-compatible required field check
      for (const field of schema.required) {
        if (item[field] === undefined) {
          errors.push({ key: `${name}[${i}].${field}`, issue: 'missing required field' });
        }
      }

      // itemShape validation
      if (schema.itemShape) {
        for (const [field, rule] of Object.entries(schema.itemShape)) {
          const value = item[field];
          if (value === undefined && !rule.required) continue;
          const issue = validateField(value, rule);
          if (issue) {
            errors.push({ key: `${name}[${i}].${field}`, issue });
          }
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
