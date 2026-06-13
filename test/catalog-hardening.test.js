/**
 * Tests for catalog hardening: byId, collision detection, itemShape validation, crossrefs.
 * iter-007 M2a-1.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { loadCatalog, clearCatalogs, byId, hasId, buildById } from '../src/core/catalog/loader.js';
import { validateCatalog } from '../src/core/catalog/validate.js';
import { validateCrossRefs } from '../src/core/catalog/crossref.js';

// Minimal catalog fixtures
const RESOURCES_CAT = {
  _meta: { provenance: 'test' },
  resources: [
    { id: 'gold', name: 'Gold', kind: 'gold' },
    { id: 'wood', name: 'Wood', kind: 'resource' },
  ],
};

const FOOD_CAT = {
  _meta: { provenance: 'test' },
  food: [
    { id: 'bread', name: 'Bread', description: 'Baked goods', type: 'food' },
    { id: 'meat', name: 'Meat', description: 'Animal protein', type: 'food' },
  ],
};

const JOBS_CAT = {
  _meta: { provenance: 'test' },
  jobs: [
    { id: 'baker', name: 'Baker', products: { bread: 2 } },
    { id: 'woodcutter', name: 'Woodcutter', products: { wood: 3 } },
  ],
};

const BUILDINGS_CAT = {
  _meta: { provenance: 'test' },
  buildings: [
    { id: 'hut', name: 'Hut', category: 'production', baseCost: { wood: 10 } },
  ],
};

const HOUSE_TYPES_CAT = {
  _meta: { provenance: 'test' },
  houseTypes: [
    { id: 'tent', workers: 3, attractiveness: 0, capacity: null },
    { id: 'house', workers: 5, attractiveness: 2, capacity: 600 },
  ],
};

beforeEach(() => {
  clearCatalogs();
});

afterEach(() => {
  clearCatalogs();
});

describe('byId lookup', () => {
  it('byId returns the entry for a known id', () => {
    loadCatalog('resources', RESOURCES_CAT);
    const entry = byId('gold');
    assert.strictEqual(entry.type, 'resources');
    assert.strictEqual(/** @type {any} */ (entry.entry)['id'], 'gold');
  });

  it('hasId returns true for a loaded id', () => {
    loadCatalog('resources', RESOURCES_CAT);
    assert.strictEqual(hasId('gold'), true);
  });

  it('hasId returns false for an unknown id', () => {
    loadCatalog('resources', RESOURCES_CAT);
    assert.strictEqual(hasId('notexist'), false);
  });

  it('byId throws for an unknown id', () => {
    loadCatalog('resources', RESOURCES_CAT);
    assert.throws(() => byId('notexist'), /no entry with id/);
  });
});

describe('id collision across types throws (K10)', () => {
  it('throws when same id exists in two different catalog types', () => {
    // Create a conflicting catalog: food with id 'gold' (which is in resources)
    const conflictingFood = {
      _meta: { provenance: 'test' },
      food: [{ id: 'gold', name: 'Gold food?', description: 'Conflict', type: 'food' }],
    };
    loadCatalog('resources', RESOURCES_CAT);
    loadCatalog('food', conflictingFood);
    assert.throws(() => buildById(), /id collision/);
  });

  it('does not throw with non-conflicting catalogs', () => {
    loadCatalog('resources', RESOURCES_CAT);
    loadCatalog('food', FOOD_CAT);
    assert.doesNotThrow(() => buildById());
  });
});

describe('itemShape type validation', () => {
  it('wrong type for a required string field → error', () => {
    const badCat = {
      _meta: { provenance: 'test' },
      resources: [
        { id: 123, name: 'Gold', kind: 'gold' }, // id should be string
      ],
    };
    const errors = validateCatalog('resources', badCat);
    assert.ok(errors.some(e => e.key.includes('id') && e.issue.includes('string')),
      `expected type error for id, got: ${JSON.stringify(errors)}`);
  });

  it('wrong type for a number field → error', () => {
    const badCat = {
      _meta: { provenance: 'test' },
      houseTypes: [
        { id: 'tent', workers: 'three', attractiveness: 0 }, // workers should be number
      ],
    };
    const errors = validateCatalog('houseTypes', badCat);
    assert.ok(errors.some(e => e.key.includes('workers') && e.issue.includes('number')),
      `expected type error for workers, got: ${JSON.stringify(errors)}`);
  });
});

describe('itemShape min validation', () => {
  it('value < min → error', () => {
    const badCat = {
      _meta: { provenance: 'test' },
      houseTypes: [
        { id: 'tent', workers: -1, attractiveness: 0 }, // workers min: 0
      ],
    };
    const errors = validateCatalog('houseTypes', badCat);
    assert.ok(errors.some(e => e.key.includes('workers') && e.issue.includes('>=')),
      `expected min error for workers, got: ${JSON.stringify(errors)}`);
  });

  it('value >= min → no error', () => {
    const errors = validateCatalog('houseTypes', HOUSE_TYPES_CAT);
    assert.ok(!errors.some(e => e.key.includes('workers')),
      `unexpected workers error: ${JSON.stringify(errors)}`);
  });
});

describe('itemShape enum validation', () => {
  it('invalid enum value → error', () => {
    const badCat = {
      _meta: { provenance: 'test' },
      resources: [
        { id: 'weird', name: 'Weird', kind: 'unicorn' }, // kind must be from enum
      ],
    };
    const errors = validateCatalog('resources', badCat);
    assert.ok(errors.some(e => e.key.includes('kind') && e.issue.includes('one of')),
      `expected enum error for kind, got: ${JSON.stringify(errors)}`);
  });

  it('valid enum value → no error', () => {
    const errors = validateCatalog('resources', RESOURCES_CAT);
    assert.ok(!errors.some(e => e.key.includes('kind')),
      `unexpected kind error: ${JSON.stringify(errors)}`);
  });
});

describe('itemShape nullable', () => {
  it('null is ok when nullable:true (capacity in houseTypes)', () => {
    // houseTypes.capacity is nullable:true; tent has capacity: null
    const errors = validateCatalog('houseTypes', HOUSE_TYPES_CAT);
    assert.ok(!errors.some(e => e.key.includes('capacity') && e.issue.includes('null')),
      `unexpected null error for capacity: ${JSON.stringify(errors)}`);
  });

  it('null is not ok when field is not nullable', () => {
    const badCat = {
      _meta: { provenance: 'test' },
      resources: [
        { id: null, name: 'Gold', kind: 'gold' }, // id is not nullable
      ],
    };
    const errors = validateCatalog('resources', badCat);
    assert.ok(errors.some(e => e.key.includes('id')),
      `expected error for null id, got: ${JSON.stringify(errors)}`);
  });
});

describe('productMap validator', () => {
  it('valid productMap → no error', () => {
    const errors = validateCatalog('jobs', JOBS_CAT);
    assert.ok(!errors.some(e => e.key.includes('products')),
      `unexpected products error: ${JSON.stringify(errors)}`);
  });

  it('non-object productMap → error', () => {
    const badCat = {
      _meta: { provenance: 'test' },
      jobs: [
        { id: 'baker', name: 'Baker', products: 'bread' }, // products should be object
      ],
    };
    const errors = validateCatalog('jobs', badCat);
    assert.ok(errors.some(e => e.key.includes('products')),
      `expected products error, got: ${JSON.stringify(errors)}`);
  });

  it('productMap with negative value → error', () => {
    const badCat = {
      _meta: { provenance: 'test' },
      jobs: [
        { id: 'baker', name: 'Baker', products: { bread: -1 } }, // -1 is invalid
      ],
    };
    const errors = validateCatalog('jobs', badCat);
    assert.ok(errors.some(e => e.key.includes('products')),
      `expected products error for negative value, got: ${JSON.stringify(errors)}`);
  });
});

describe('cross-ref B4', () => {
  it('typo in baseCost key → crossref error', () => {
    const badBuildings = {
      _meta: { provenance: 'test' },
      buildings: [
        { id: 'hut', name: 'Hut', category: 'production', baseCost: { wud: 10 } }, // typo
      ],
    };
    loadCatalog('resources', RESOURCES_CAT);
    loadCatalog('food', FOOD_CAT);
    loadCatalog('buildings', badBuildings);
    const index = buildById();
    const errors = validateCrossRefs(index);
    assert.ok(errors.some(e => e.key.includes('wud')),
      `expected crossref error for typo 'wud', got: ${JSON.stringify(errors)}`);
  });

  it('valid baseCost key → no crossref error', () => {
    loadCatalog('resources', RESOURCES_CAT);
    loadCatalog('food', FOOD_CAT);
    loadCatalog('buildings', BUILDINGS_CAT);
    const index = buildById();
    const errors = validateCrossRefs(index);
    assert.ok(!errors.some(e => e.key.includes('baseCost')),
      `unexpected crossref error: ${JSON.stringify(errors)}`);
  });

  it('food is a valid products target (no error) per N-2', () => {
    loadCatalog('resources', RESOURCES_CAT);
    loadCatalog('food', FOOD_CAT);
    loadCatalog('jobs', JOBS_CAT); // baker produces bread (food)
    const index = buildById();
    const errors = validateCrossRefs(index);
    assert.ok(!errors.some(e => e.key.includes('jobs')),
      `unexpected crossref error for food product: ${JSON.stringify(errors)}`);
  });
});
