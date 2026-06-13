/**
 * Catalog schemas - validation rules for each catalog type.
 * Each schema defines required fields and their types.
 */

/** @typedef {{ required: string[], itemCheck?: (item: object) => string | null }} Schema */

/** @type {Record<string, Schema>} */
export const SCHEMAS = {
  achievements: {
    required: ['id', 'name', 'description', 'level'],
  },
  balance: {
    required: ['army', 'engine', 'market', 'population', 'season', 'tech'],
  },
  buildings: {
    required: ['id', 'name', 'category', 'baseCost'],
  },
  companies: {
    required: ['explorer', 'houseBuilder', 'mineBuilder'],
  },
  food: {
    required: ['id', 'name', 'description', 'type'],
  },
  goods: {
    required: [],
  },
  houseTypes: {
    required: ['id', 'workers', 'attractiveness'],
  },
  jobs: {
    required: ['id', 'name', 'products'],
  },
  marketBaseline: {
    required: [],
  },
  military: {
    required: ['id', 'name', 'goldCost', 'upkeep'],
  },
  population: {
    required: ['consumeFoodRate', 'natality', 'spoilage', 'causesOfDeath'],
  },
  resources: {
    required: ['id', 'name', 'kind'],
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
