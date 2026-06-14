/**
 * Catalog schemas - validation rules for each catalog type.
 * Each schema defines required fields and their types.
 * iter-007 M2a-1: added itemShape for per-field validation.
 */

/**
 * @typedef {{ type: string, required: boolean, min?: number, max?: number,
 *             enum?: string[], nullable?: boolean, ref?: string }} FieldRule
 * @typedef {{ required: string[], itemShape?: Record<string, FieldRule>, itemCheck?: (item: object) => string | null }} Schema
 */

/** @type {Record<string, Schema>} */
export const SCHEMAS = {
  achievements: {
    required: ['id', 'name', 'description', 'level'],
    itemShape: {
      id:          { type: 'string', required: true },
      name:        { type: 'string', required: true },
      description: { type: 'string', required: true },
      level:       { type: 'number', required: true, min: 0 },
    },
  },
  balance: {
    required: ['army', 'engine', 'market', 'population', 'season', 'tech'],
  },
  buildings: {
    required: ['id', 'name', 'category', 'baseCost'],
    itemShape: {
      id:       { type: 'string', required: true },
      name:     { type: 'string', required: true },
      category: { type: 'string', required: true },
      baseCost: { type: 'costMap', required: true },
    },
  },
  companies: {
    required: ['explorer', 'houseBuilder', 'mineBuilder'],
  },
  contracts: {
    // iter-014 M5-2 T5: contract catalog. required = required fields per item.
    required: ['id', 'title', 'expirationDays', 'kind'],
    itemShape: {
      id:             { type: 'string', required: true },
      title:          { type: 'string', required: true },
      expirationDays: { type: 'number', required: true, min: 1 },
      kind:           { type: 'string', required: true, enum: ['supply', 'demand', 'build', 'military', 'unlock'] },
    },
  },
  food: {
    required: ['id', 'name', 'description', 'type'],
    itemShape: {
      id:          { type: 'string', required: true },
      name:        { type: 'string', required: true },
      description: { type: 'string', required: true },
      type:        { type: 'string', required: true, enum: ['food'] },
    },
  },
  goods: {
    required: ['id', 'kind', 'basePrice', 'max', 'baselineFraction'],
    itemShape: {
      id:               { type: 'string',  required: true },
      kind:             { type: 'string',  required: true, enum: ['goods'] },
      basePrice:        { type: 'number',  required: true, min: 0.001 },
      max:              { type: 'number',  required: true, min: 1 },
      baselineFraction: { type: 'number',  required: true, min: 0, max: 1 },
    },
  },
  houseTypes: {
    required: ['id', 'workers', 'attractiveness'],
    itemShape: {
      id:            { type: 'string', required: true },
      workers:       { type: 'number', required: true, min: 0 },
      attractiveness:{ type: 'number', required: true },
      capacity:      { type: 'number', required: false, nullable: true, min: 0 },
    },
  },
  jobs: {
    required: ['id', 'name', 'products'],
    itemShape: {
      id:       { type: 'string', required: true },
      name:     { type: 'string', required: true },
      products: { type: 'productMap', required: true },  // S-3: map {resourceId: amount}
    },
  },
  marketBaseline: {
    required: [],
  },
  military: {
    required: ['id', 'name', 'goldCost', 'upkeep'],
    itemShape: {
      id:       { type: 'string', required: true },
      name:     { type: 'string', required: true },
      goldCost: { type: 'number', required: true, min: 0 },
      upkeep:   { type: 'number', required: true, min: 0 },
    },
  },
  population: {
    required: ['consumeFoodRate', 'natality', 'spoilage', 'causesOfDeath'],
  },
  resources: {
    required: ['id', 'name', 'kind'],
    itemShape: {
      id:   { type: 'string', required: true },
      name: { type: 'string', required: true },
      kind: { type: 'string', required: true, enum: ['gold', 'techPt', 'goods', 'food', 'resource', 'stock'] },
    },
  },
  sectors: {
    required: [],
  },
  skills: {
    required: [],
  },
  techs: {
    required: ['techBase', 'techScale'],
  },
  zones: {
    required: ['policies', 'factions'],
  },
};
