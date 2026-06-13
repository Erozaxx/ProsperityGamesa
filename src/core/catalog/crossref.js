/**
 * Cross-reference validation for catalog cost/products maps.
 * iter-007 M2a-1: B4 cross-ref checks.
 */

/**
 * @typedef {{ key: string, issue: string }} ValidationError
 */

/**
 * Validates cost/products maps reference known resource-like IDs.
 * resource-like = resources[].id ∪ food[].id ∪ goods[].id
 *
 * Checks:
 *  - buildings[].baseCost keys against resource-like IDs
 *  - companies.*[].cost keys against resource-like IDs
 *  - jobs[].products keys against resource-like IDs (food IS valid per N-2!)
 *    NOTE: jobs.products may be an array of strings (legacy) or a productMap object.
 *
 * @param {Map<string, { type: string, entry: object }>} byIdIndex
 * @returns {ValidationError[]}
 */
export function validateCrossRefs(byIdIndex) {
  /** @type {ValidationError[]} */
  const errors = [];

  // Build resource-like ID set
  /** @type {Set<string>} */
  const resourceLike = new Set();
  for (const [id, entry] of byIdIndex) {
    const type = entry.type;
    if (type === 'resources' || type === 'food' || type === 'goods') {
      resourceLike.add(id);
    }
  }

  // Check buildings baseCost keys
  for (const [, entry] of byIdIndex) {
    if (entry.type !== 'buildings') continue;
    const item = /** @type {Record<string, unknown>} */ (entry.entry);
    const baseCost = /** @type {Record<string, unknown> | undefined} */ (item['baseCost']);
    if (baseCost && typeof baseCost === 'object' && !Array.isArray(baseCost)) {
      for (const key of Object.keys(baseCost)) {
        if (!resourceLike.has(key)) {
          errors.push({
            key: `buildings[${item['id']}].baseCost.${key}`,
            issue: `unknown resource-like id "${key}"`,
          });
        }
      }
    }
  }

  // Check companies.*[].cost keys
  for (const [, entry] of byIdIndex) {
    if (!entry.type.startsWith('companies.')) continue;
    const item = /** @type {Record<string, unknown>} */ (entry.entry);
    const cost = /** @type {Record<string, unknown> | undefined} */ (item['cost']);
    if (cost && typeof cost === 'object' && !Array.isArray(cost)) {
      for (const key of Object.keys(cost)) {
        if (!resourceLike.has(key)) {
          errors.push({
            key: `${entry.type}[${item['id']}].cost.${key}`,
            issue: `unknown resource-like id "${key}"`,
          });
        }
      }
    }
  }

  // Check jobs[].products keys (food IS valid per N-2)
  for (const [, entry] of byIdIndex) {
    if (entry.type !== 'jobs') continue;
    const item = /** @type {Record<string, unknown>} */ (entry.entry);
    const products = item['products'];
    if (Array.isArray(products)) {
      // Legacy: array of string ids
      for (const key of /** @type {string[]} */ (products)) {
        if (!resourceLike.has(key)) {
          errors.push({
            key: `jobs[${item['id']}].products`,
            issue: `unknown resource-like id "${key}"`,
          });
        }
      }
    } else if (products && typeof products === 'object') {
      // productMap format
      const map = /** @type {Record<string, unknown>} */ (products);
      for (const key of Object.keys(map)) {
        if (!resourceLike.has(key)) {
          errors.push({
            key: `jobs[${item['id']}].products.${key}`,
            issue: `unknown resource-like id "${key}"`,
          });
        }
      }
    }
  }

  return errors;
}
