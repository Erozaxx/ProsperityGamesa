import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCatalog, assertCatalogValid } from '../src/core/catalog/index.js';

// Sample valid catalogs
const validFood = {
  _meta: { source: 'test', provenance: 'test' },
  food: [
    { id: 'bread', name: 'Bread', description: 'Baked goods', type: 'food' },
  ],
};

const validHouseTypes = {
  _meta: { source: 'test', provenance: 'test' },
  houseTypes: [
    { id: 'tent', workers: 3, attractiveness: 0, capacity: null },
  ],
};

const validBalance = {
  _meta: { source: 'test', provenance: 'test' },
  balance: {
    army: {}, engine: {}, market: {}, population: {}, season: {}, tech: {},
  },
};

const validPopulation = {
  _meta: { source: 'test', provenance: 'test' },
  population: {
    consumeFoodRate: 2,
    natality: { matRate: 0.04, retRate: 0.02 },
    spoilage: {},
    causesOfDeath: [],
  },
};

test('validateCatalog: valid food returns no errors', () => {
  const errors = validateCatalog('food', validFood);
  assert.deepEqual(errors, []);
});

test('validateCatalog: missing _meta returns error', () => {
  const errors = validateCatalog('food', { food: [] });
  assert.ok(errors.some(e => e.key.includes('_meta')));
});

test('validateCatalog: missing required field returns error', () => {
  const catalog = {
    _meta: { source: 'test', provenance: 'test' },
    food: [{ id: 'bread' }], // missing name, description, type
  };
  const errors = validateCatalog('food', catalog);
  assert.ok(errors.length > 0);
});

test('validateCatalog: unknown catalog name returns error', () => {
  const errors = validateCatalog('unknownCatalog', { _meta: {}, unknownCatalog: [] });
  assert.ok(errors.some(e => e.issue.includes('no schema')));
});

test('validateCatalog: valid houseTypes returns no errors', () => {
  const errors = validateCatalog('houseTypes', validHouseTypes);
  assert.deepEqual(errors, []);
});

test('validateCatalog: valid balance returns no errors', () => {
  const errors = validateCatalog('balance', validBalance);
  assert.deepEqual(errors, []);
});

test('validateCatalog: valid population returns no errors', () => {
  const errors = validateCatalog('population', validPopulation);
  assert.deepEqual(errors, []);
});

test('assertCatalogValid: throws on invalid catalog', () => {
  assert.throws(() => {
    assertCatalogValid('food', { food: [{ id: 'bread' }] }); // no _meta
  }, /catalog validation failed/);
});

test('assertCatalogValid: does not throw on valid catalog', () => {
  assert.doesNotThrow(() => {
    assertCatalogValid('food', validFood);
  });
});
