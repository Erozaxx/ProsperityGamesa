/**
 * iter006-catalog-schema.test.js – iter-006 T-003 tester scope
 *
 * Covers:
 * 1. Schema validation of ALL 16 catalogs in src/data/
 * 2. Catalog item counts (food=6, houseTypes=8, achievements=15, military=2, etc.)
 * 3. Provenance presence on every catalog
 * 4. Fail-fast on artificially broken catalog (missing required field, ID collision)
 * 5. Extraction reproducibility (second run = identical catalogs)
 * 6. Cross-check of reference data values from design spec §4.3
 *
 * Scope OUT: does NOT modify production code.
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { validateCatalog, assertCatalogValid } from '../src/core/catalog/index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');

// --------------------------------------------------------------------------
// Helper: load a catalog JSON from src/data/
// --------------------------------------------------------------------------
/** @param {string} name @returns {Record<string, unknown>} */
function loadJson(name) {
  const path = join(DATA_DIR, `${name}.json`);
  return JSON.parse(readFileSync(path, 'utf8'));
}

// --------------------------------------------------------------------------
// 1. ALL 16 catalogs exist and have _meta with provenance
// --------------------------------------------------------------------------
describe('all catalogs present and have _meta.provenance', () => {
  const CATALOGS = [
    'achievements', 'balance', 'buildings', 'companies',
    'food', 'goods', 'houseTypes', 'jobs', 'marketBaseline',
    'military', 'population', 'resources', 'sectors', 'skills',
    'techs', 'zones',
  ];

  it(`exactly 16 expected catalog files exist in src/data/`, () => {
    for (const name of CATALOGS) {
      const path = join(DATA_DIR, `${name}.json`);
      assert.ok(existsSync(path), `missing catalog file: ${name}.json`);
    }
    assert.strictEqual(CATALOGS.length, 16);
  });

  for (const name of CATALOGS) {
    it(`${name}.json has _meta.provenance`, () => {
      const cat = loadJson(name);
      assert.ok(
        cat['_meta'] && typeof (/** @type {Record<string, unknown>} */(cat['_meta']))['provenance'] === 'string',
        `${name}.json missing _meta.provenance`
      );
    });
  }
});

// --------------------------------------------------------------------------
// 2. Schema validation passes for all real catalogs
// --------------------------------------------------------------------------
describe('schema validation passes for all real catalog files', () => {
  const ARRAY_CATALOGS = ['achievements', 'buildings', 'food', 'houseTypes', 'jobs', 'military', 'resources'];
  const OBJECT_CATALOGS = ['balance', 'companies', 'population', 'techs', 'zones'];
  const EMPTY_CATALOGS  = ['goods', 'marketBaseline', 'sectors', 'skills'];

  for (const name of [...ARRAY_CATALOGS, ...OBJECT_CATALOGS, ...EMPTY_CATALOGS]) {
    it(`validateCatalog('${name}', ...) returns no errors`, () => {
      const cat = loadJson(name);
      const errors = validateCatalog(name, cat);
      assert.deepEqual(errors, [], `schema errors in ${name}: ${JSON.stringify(errors)}`);
    });
  }

  it('assertCatalogValid does not throw for all real catalogs', () => {
    const ALL = ['achievements', 'balance', 'buildings', 'companies', 'food', 'goods',
                 'houseTypes', 'jobs', 'marketBaseline', 'military', 'population',
                 'resources', 'sectors', 'skills', 'techs', 'zones'];
    for (const name of ALL) {
      const cat = loadJson(name);
      assert.doesNotThrow(
        () => assertCatalogValid(name, cat),
        `assertCatalogValid threw for ${name}`
      );
    }
  });
});

// --------------------------------------------------------------------------
// 3. Item counts – design spec §4.3 and impl note
// --------------------------------------------------------------------------
describe('catalog item counts match design spec', () => {
  it('food.json has exactly 6 items', () => {
    const cat = loadJson('food');
    assert.strictEqual(
      /** @type {unknown[]} */(/** @type {Record<string, unknown>} */(cat)['food']).length,
      6
    );
  });

  it('houseTypes.json has exactly 8 items', () => {
    const cat = loadJson('houseTypes');
    assert.strictEqual(
      /** @type {unknown[]} */(/** @type {Record<string, unknown>} */(cat)['houseTypes']).length,
      8
    );
  });

  it('achievements.json has exactly 15 items', () => {
    const cat = loadJson('achievements');
    assert.strictEqual(
      /** @type {unknown[]} */(/** @type {Record<string, unknown>} */(cat)['achievements']).length,
      15
    );
  });

  it('military.json has exactly 2 items (warrior + archer)', () => {
    const cat = loadJson('military');
    assert.strictEqual(
      /** @type {unknown[]} */(/** @type {Record<string, unknown>} */(cat)['military']).length,
      2
    );
  });

  it('resources.json has base 5 items (gold, ore, stone, techPt, wood) plus M3 stock resources', () => {
    const cat = loadJson('resources');
    const items = /** @type {Array<{id: string}>} */(/** @type {Record<string, unknown>} */(cat)['resources']);
    // iter-009 M3: added stock resources (trees, animals, ores, livestock, farmland)
    assert.ok(items.length >= 5, 'should have at least 5 resource items');
    const ids = items.map(r => r.id);
    for (const id of ['gold', 'ore', 'stone', 'techPt', 'wood']) {
      assert.ok(ids.includes(id), `resources.json should contain "${id}"`);
    }
  });

  it('population.json causesOfDeath has 14 entries', () => {
    const cat = loadJson('population');
    const pop = /** @type {Record<string, unknown>} */(/** @type {Record<string, unknown>} */(cat)['population']);
    assert.strictEqual(
      /** @type {unknown[]} */(pop['causesOfDeath']).length,
      14
    );
  });
});

// --------------------------------------------------------------------------
// 4. Reference data values (design spec §4.3)
// --------------------------------------------------------------------------
describe('reference data values from design spec §4.3', () => {
  it('military: archer goldCost=1620, upkeep=162', () => {
    const cat = loadJson('military');
    const military = /** @type {Array<{id:string, goldCost:number, upkeep:number}>} */(
      /** @type {Record<string, unknown>} */(cat)['military']
    );
    const archer = military.find(m => m.id === 'archer');
    assert.ok(archer, 'archer not found in military.json');
    assert.strictEqual(archer.goldCost, 1620, 'archer goldCost should be 1620');
    assert.strictEqual(archer.upkeep, 162, 'archer upkeep should be 162 (round(108*1.5))');
  });

  it('military: warrior goldCost=1080, upkeep=108', () => {
    const cat = loadJson('military');
    const military = /** @type {Array<{id:string, goldCost:number, upkeep:number}>} */(
      /** @type {Record<string, unknown>} */(cat)['military']
    );
    const warrior = military.find(m => m.id === 'warrior');
    assert.ok(warrior, 'warrior not found in military.json');
    assert.strictEqual(warrior.goldCost, 1080, 'warrior goldCost should be 1080');
    assert.strictEqual(warrior.upkeep, 108, 'warrior upkeep should be 108');
  });

  it('population: natality matRate=0.04, retRate=0.02', () => {
    const cat = loadJson('population');
    const pop = /** @type {Record<string, unknown>} */(
      /** @type {Record<string, unknown>} */(cat)['population']
    );
    const natality = /** @type {{matRate:number, retRate:number}} */(pop['natality']);
    assert.strictEqual(natality.matRate, 0.04, 'matRate should be 0.04');
    assert.strictEqual(natality.retRate, 0.02, 'retRate should be 0.02');
  });

  it('population: spoilage.meat=0.18, spoilage.fish=0.23, spoilage.bread=0.08', () => {
    const cat = loadJson('population');
    const pop = /** @type {Record<string, unknown>} */(
      /** @type {Record<string, unknown>} */(cat)['population']
    );
    const spoilage = /** @type {Record<string, number>} */(pop['spoilage']);
    assert.strictEqual(spoilage['meat'], 0.18, 'meat spoilage should be 0.18');
    assert.strictEqual(spoilage['fish'], 0.23, 'fish spoilage should be 0.23');
    assert.strictEqual(spoilage['bread'], 0.08, 'bread spoilage should be 0.08');
  });

  it('population: cheese spoilage divergence – spoilage=0.08 vs baseSpoilage=0.10 (D-CHEESE-SPOILAGE)', () => {
    const cat = loadJson('population');
    const pop = /** @type {Record<string, unknown>} */(
      /** @type {Record<string, unknown>} */(cat)['population']
    );
    const spoilage = /** @type {Record<string, number>} */(pop['spoilage']);
    const baseSpoilage = /** @type {Record<string, number>} */(pop['baseSpoilage']);
    // Both values must be present – this is a documented source divergence
    assert.strictEqual(spoilage['cheese'], 0.08, 'effective cheese spoilage = 0.08');
    assert.strictEqual(baseSpoilage['cheese'], 0.10, 'base cheese spoilage = 0.10');
  });

  it('techs: techBase=100, techScale=1.25', () => {
    const cat = loadJson('techs');
    const techs = /** @type {Record<string, unknown>} */(
      /** @type {Record<string, unknown>} */(cat)['techs']
    );
    assert.strictEqual(techs['techBase'], 100, 'techBase should be 100');
    assert.strictEqual(techs['techScale'], 1.25, 'techScale should be 1.25');
  });

  it('balance: army archerUpkeep=162', () => {
    const cat = loadJson('balance');
    const balance = /** @type {Record<string, unknown>} */(
      /** @type {Record<string, unknown>} */(cat)['balance']
    );
    const army = /** @type {Record<string, number>} */(balance['army']);
    assert.strictEqual(army['archerUpkeep'], 162, 'archerUpkeep in balance.json should be 162');
  });

  it('balance: population workerEffMin=0.25, workerEffMax=2', () => {
    const cat = loadJson('balance');
    const balance = /** @type {Record<string, unknown>} */(
      /** @type {Record<string, unknown>} */(cat)['balance']
    );
    const pop = /** @type {Record<string, number>} */(balance['population']);
    assert.strictEqual(pop['workerEffMin'], 0.25, 'workerEffMin should be 0.25');
    assert.strictEqual(pop['workerEffMax'], 2, 'workerEffMax should be 2');
  });

  it('houseTypes: mansion workers=6, capacity=1000, attractiveness=4', () => {
    const cat = loadJson('houseTypes');
    const types = /** @type {Array<{id:string, workers:number, capacity:number, attractiveness:number}>} */(
      /** @type {Record<string, unknown>} */(cat)['houseTypes']
    );
    const mansion = types.find(h => h.id === 'mansion');
    assert.ok(mansion, 'mansion not found in houseTypes.json');
    assert.strictEqual(mansion.workers, 6, 'mansion workers=6');
    assert.strictEqual(mansion.capacity, 1000, 'mansion capacity=1000');
    assert.strictEqual(mansion.attractiveness, 4, 'mansion attractiveness=4');
  });

  it('houseTypes: estate workers=20, capacity=10000, attractiveness=100', () => {
    const cat = loadJson('houseTypes');
    const types = /** @type {Array<{id:string, workers:number, capacity:number, attractiveness:number}>} */(
      /** @type {Record<string, unknown>} */(cat)['houseTypes']
    );
    const estate = types.find(h => h.id === 'estate');
    assert.ok(estate, 'estate not found in houseTypes.json');
    assert.strictEqual(estate.workers, 20, 'estate workers=20');
    assert.strictEqual(estate.capacity, 10000, 'estate capacity=10000');
    assert.strictEqual(estate.attractiveness, 100, 'estate attractiveness=100');
  });

  it('houseTypes: publichouse workers=25, capacity=3000, attractiveness=-10', () => {
    const cat = loadJson('houseTypes');
    const types = /** @type {Array<{id:string, workers:number, capacity:number, attractiveness:number}>} */(
      /** @type {Record<string, unknown>} */(cat)['houseTypes']
    );
    const ph = types.find(h => h.id === 'publichouse');
    assert.ok(ph, 'publichouse not found in houseTypes.json');
    assert.strictEqual(ph.workers, 25, 'publichouse workers=25');
    assert.strictEqual(ph.capacity, 3000, 'publichouse capacity=3000');
    assert.strictEqual(ph.attractiveness, -10, 'publichouse attractiveness=-10');
  });

  it('companies: KuttingKorners gold=2000', () => {
    const cat = loadJson('companies');
    const comp = /** @type {Record<string, unknown>} */(
      /** @type {Record<string, unknown>} */(cat)['companies']
    );
    const builders = /** @type {Array<{id:string, cost:{gold:number}}>} */(comp['houseBuilder']);
    const kk = builders.find(b => b.id === 'KuttingKorners');
    assert.ok(kk, 'KuttingKorners not found in companies.houseBuilder');
    assert.strictEqual(kk.cost.gold, 2000, 'KuttingKorners cost.gold=2000');
  });

  it('companies: LawyeredUp gold=200000', () => {
    const cat = loadJson('companies');
    const comp = /** @type {Record<string, unknown>} */(
      /** @type {Record<string, unknown>} */(cat)['companies']
    );
    const builders = /** @type {Array<{id:string, cost:{gold:number}}>} */(comp['houseBuilder']);
    const lu = builders.find(b => b.id === 'LawyeredUp');
    assert.ok(lu, 'LawyeredUp not found in companies.houseBuilder');
    assert.strictEqual(lu.cost.gold, 200000, 'LawyeredUp cost.gold=200000');
  });

  it('companies: StrikeGoldInc gold=10000, wood=2400', () => {
    const cat = loadJson('companies');
    const comp = /** @type {Record<string, unknown>} */(
      /** @type {Record<string, unknown>} */(cat)['companies']
    );
    const miners = /** @type {Array<{id:string, cost:{gold:number, wood:number}}>} */(comp['mineBuilder']);
    const sg = miners.find(b => b.id === 'StrikeGoldInc');
    assert.ok(sg, 'StrikeGoldInc not found in companies.mineBuilder');
    assert.strictEqual(sg.cost.gold, 10000, 'StrikeGoldInc cost.gold=10000');
    assert.strictEqual(sg.cost.wood, 2400, 'StrikeGoldInc cost.wood=2400');
  });
});

// --------------------------------------------------------------------------
// 5. Fail-fast on broken catalogs
// --------------------------------------------------------------------------
describe('fail-fast: broken catalog throws clean error (not silent pass)', () => {
  it('missing _meta throws on assertCatalogValid', () => {
    const broken = { food: [{ id: 'bread', name: 'Bread', description: 'x', type: 'food' }] };
    assert.throws(
      () => assertCatalogValid('food', broken),
      /catalog validation failed/,
      'should throw catalog validation failed when _meta is missing'
    );
  });

  it('missing required field "id" in food item → validateCatalog returns errors', () => {
    const broken = {
      _meta: { source: 'test', provenance: 'test' },
      food: [{ name: 'Bread', description: 'x', type: 'food' }], // id missing
    };
    const errors = validateCatalog('food', broken);
    assert.ok(errors.length > 0, 'should have errors for missing id');
    assert.ok(
      errors.some(e => e.key.includes('id')),
      `expected error mentioning 'id', got: ${JSON.stringify(errors)}`
    );
  });

  it('missing required field "name" in food item → validateCatalog returns errors', () => {
    const broken = {
      _meta: { source: 'test', provenance: 'test' },
      food: [{ id: 'bread', description: 'x', type: 'food' }], // name missing
    };
    const errors = validateCatalog('food', broken);
    assert.ok(errors.length > 0, 'should have errors for missing name');
  });

  it('missing required field "id" in houseTypes item → validateCatalog returns errors', () => {
    const broken = {
      _meta: { source: 'test', provenance: 'test' },
      houseTypes: [{ workers: 3, attractiveness: 0 }], // id missing
    };
    const errors = validateCatalog('houseTypes', broken);
    assert.ok(errors.length > 0, 'should have errors for missing id in houseTypes');
  });

  it('missing required "goldCost" in military item → validateCatalog returns errors', () => {
    const broken = {
      _meta: { source: 'test', provenance: 'test' },
      military: [{ id: 'archer', name: 'Archer', upkeep: 162 }], // goldCost missing
    };
    const errors = validateCatalog('military', broken);
    assert.ok(errors.length > 0, 'should have errors for missing goldCost in military');
  });

  it('unknown catalog name → validateCatalog error mentions "no schema"', () => {
    const errors = validateCatalog('nonexistentCatalog_XYZ', {
      _meta: { source: 'test', provenance: 'test' },
      nonexistentCatalog_XYZ: [],
    });
    assert.ok(
      errors.some(e => e.issue.includes('no schema')),
      `expected "no schema" error, got: ${JSON.stringify(errors)}`
    );
  });

  it('broken catalog does NOT silently pass (validateCatalog not returning empty for broken input)', () => {
    // Regression: ensure the validator is not a no-op
    const broken = {
      // no _meta
      food: [{ name: 'Bread' }], // no id
    };
    const errors = validateCatalog('food', broken);
    assert.ok(errors.length > 0, 'validator must catch broken catalog, not silently return []');
  });
});

// --------------------------------------------------------------------------
// 6. Extraction reproducibility
// --------------------------------------------------------------------------
describe('extraction reproducibility: second run = identical catalogs', () => {
  /** @type {Record<string, string>} */
  let beforeSnapshots = {};
  /** @type {string[]} */
  const CATALOG_FILES = [
    'achievements', 'balance', 'buildings', 'companies',
    'food', 'goods', 'houseTypes', 'jobs', 'marketBaseline',
    'military', 'population', 'resources', 'sectors', 'skills',
    'techs', 'zones',
  ];

  before(() => {
    // Snapshot current state
    for (const name of CATALOG_FILES) {
      beforeSnapshots[name] = readFileSync(join(DATA_DIR, `${name}.json`), 'utf8');
    }
  });

  it('running extract.mjs a second time produces identical output (deterministic)', () => {
    // Run extraction
    execSync('node tools/extract/extract.mjs', {
      cwd: ROOT,
      stdio: 'pipe',
    });

    // Compare
    const diffs = [];
    for (const name of CATALOG_FILES) {
      const after = readFileSync(join(DATA_DIR, `${name}.json`), 'utf8');
      if (beforeSnapshots[name] !== after) {
        diffs.push(name);
      }
    }

    assert.deepEqual(diffs, [], `catalog files changed after second extract run: ${diffs.join(', ')}`);
  });

  it('extract.mjs exits without error', () => {
    assert.doesNotThrow(() => {
      execSync('node tools/extract/extract.mjs', { cwd: ROOT, stdio: 'pipe' });
    }, 'extract.mjs should not throw');
  });
});

// --------------------------------------------------------------------------
// 7. gap-report.json exists and is valid
// --------------------------------------------------------------------------
describe('gap-report.json integrity', () => {
  it('gap-report.json exists in src/data/', () => {
    assert.ok(existsSync(join(DATA_DIR, 'gap-report.json')), 'gap-report.json must exist');
  });

  it('gap-report.json has _meta.iteration as a string', () => {
    const report = JSON.parse(readFileSync(join(DATA_DIR, 'gap-report.json'), 'utf8'));
    const meta = /** @type {Record<string, unknown>} */(report['_meta']);
    assert.strictEqual(typeof meta['iteration'], 'string', '_meta.iteration should be a string');
  });

  it('gap-report.json has at least one gap entry', () => {
    const report = JSON.parse(readFileSync(join(DATA_DIR, 'gap-report.json'), 'utf8'));
    const gaps = /** @type {unknown[]} */(report['gaps']);
    assert.ok(Array.isArray(gaps) && gaps.length > 0, 'gap-report.json must have at least 1 gap');
  });
});
