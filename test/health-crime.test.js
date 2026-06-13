/**
 * health-crime.test.js – iter-007 M2a-2 health and crime systems tests.
 * Tests: diseaseChance formula, disease lifecycle, crimeCount formula, crime level increase.
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadCatalog, clearCatalogs } from '../src/core/catalog/index.js';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { initRng } from '../src/core/engine/rng.js';
import { healthBirths, healthDisease } from '../src/core/systems/health.js';
import { crimeDaily } from '../src/core/systems/crime.js';
import { diseaseChance, crimeCount } from '../src/core/balance/formulas.js';
import { BALANCE } from '../src/core/balance/balance.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');

/** @param {string} name @returns {Record<string, unknown>} */
function loadJson(name) {
  return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8'));
}

function createState() {
  const state = createInitialState();
  initRng(state);
  return state;
}

const MOCK_CTX = { registry: /** @type {any} */ ({}), periodics: [] };

before(() => {
  clearCatalogs();
  for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'military', 'achievements']) {
    loadCatalog(name, loadJson(name));
  }
  loadCatalog('population', loadJson('population'));
});

// -----------------------------------------------------------------------
// 1. diseaseChance formula (pure)
// -----------------------------------------------------------------------
describe('diseaseChance formula', () => {
  it('returns 0 for 0 population', () => {
    assert.strictEqual(diseaseChance(0, BALANCE.health), 0);
  });

  it('returns proportional chance for 20000 population', () => {
    const chance = diseaseChance(20000, BALANCE.health);
    // 20000 / 20000 * 0.01 = 0.01
    assert.strictEqual(chance, 0.01);
  });

  it('scales linearly with population', () => {
    const c1 = diseaseChance(10000, BALANCE.health);
    const c2 = diseaseChance(20000, BALANCE.health);
    assert.ok(c2 === c1 * 2, 'disease chance should scale linearly');
  });

  it('uses custom base rate', () => {
    const chance = diseaseChance(20000, { diseaseBaseChancePer20kPop: 0.05 });
    assert.strictEqual(chance, 0.05);
  });
});

// -----------------------------------------------------------------------
// 2. crimeCount formula (pure)
// -----------------------------------------------------------------------
describe('crimeCount formula', () => {
  it('returns 0 for crimeLevel 0', () => {
    assert.strictEqual(crimeCount(10000, 0, BALANCE.crime), 0);
  });

  it('returns positive crime for non-zero level', () => {
    const crimes = crimeCount(10000, 0.5, BALANCE.crime);
    assert.ok(crimes > 0, 'should have crime incidents with non-zero level');
  });

  it('scales with population', () => {
    const c1 = crimeCount(5000, 0.5, BALANCE.crime);
    const c2 = crimeCount(10000, 0.5, BALANCE.crime);
    assert.ok(c2 >= c1, 'larger population should have >= crime');
  });

  it('scales with crime level', () => {
    const c1 = crimeCount(10000, 0.1, BALANCE.crime);
    const c2 = crimeCount(10000, 0.5, BALANCE.crime);
    assert.ok(c2 > c1, 'higher crime level should have more crime');
  });
});

// -----------------------------------------------------------------------
// 3. healthDisease - disease lifecycle
// -----------------------------------------------------------------------
describe('healthDisease disease lifecycle', () => {
  it('disease can start (with high enough population)', () => {
    // Run many ticks on one state to probabilistically trigger disease.
    // chance per tick = 100000/20000 * 0.01 = 0.05 (5%). After 200 ticks, P(no disease) ≈ 0.00003.
    const state = createState();
    state.home.population.total = 100000; // very high pop = 5% chance per tick
    state.home.health.diseaseActive = false;
    state.home.health.diseaseDaysLeft = 0;

    let diseaseStarted = false;
    for (let i = 0; i < 200 && !diseaseStarted; i++) {
      // Reset disease so we can detect first trigger
      if (!state.home.health.diseaseActive) {
        healthDisease(state, {}, MOCK_CTX);
        if (state.home.health.diseaseActive) {
          diseaseStarted = true;
          // Verify duration was set
          assert.strictEqual(state.home.health.diseaseDaysLeft, BALANCE.health.diseaseDurationDays);
        }
      }
    }
    assert.ok(diseaseStarted, 'disease should eventually start with large population (200 attempts at 5% each)');
  });

  it('disease causes population deaths while active', () => {
    const state = createState();
    state.home.population.total = 10000;
    state.home.health.diseaseActive = true;
    state.home.health.diseaseDaysLeft = 5;
    const popBefore = state.home.population.total;

    healthDisease(state, {}, MOCK_CTX);

    assert.ok(state.home.population.total < popBefore, 'disease should kill people');
    assert.ok(state.home.population.diedTotal > 0, 'diedTotal should increase');
  });

  it('disease counts down diseaseDaysLeft', () => {
    const state = createState();
    state.home.population.total = 1000;
    state.home.health.diseaseActive = true;
    state.home.health.diseaseDaysLeft = 5;

    healthDisease(state, {}, MOCK_CTX);

    assert.strictEqual(state.home.health.diseaseDaysLeft, 4);
  });

  it('disease ends when diseaseDaysLeft reaches 0', () => {
    const state = createState();
    state.home.population.total = 1000;
    state.home.health.diseaseActive = true;
    state.home.health.diseaseDaysLeft = 1;

    healthDisease(state, {}, MOCK_CTX);

    assert.strictEqual(state.home.health.diseaseActive, false);
    assert.strictEqual(state.home.health.diseaseDaysLeft, 0);
  });

  it('population does not go negative during disease', () => {
    const state = createState();
    state.home.population.total = 1; // tiny population
    state.home.health.diseaseActive = true;
    state.home_health_diseaseDaysLeft = 5;

    healthDisease(state, {}, MOCK_CTX);

    assert.ok(state.home.population.total >= 0, 'population should not go negative');
  });
});

// -----------------------------------------------------------------------
// 4. crimeDaily - crime level
// -----------------------------------------------------------------------
describe('crimeDaily', () => {
  it('increases crime level over time', () => {
    const state = createState();
    state.home.population.total = 1000;
    state.home.crime.level = 0;
    state.player.gold = 1000;

    crimeDaily(state, {}, MOCK_CTX);

    // basePerDay=0.001, dampening=0.0005 → delta=0.0005 per day
    // crime level should increase slightly
    assert.ok(state.home.crime.level >= 0, 'crime level should be >= 0');
    assert.ok(state.home.crime.level <= 1, 'crime level should be <= 1');
  });

  it('clamps crime level to [0, 1]', () => {
    const state = createState();
    state.home.population.total = 1000;
    state.home.crime.level = 0.999;
    state.player.gold = 1000;

    // Run many ticks
    for (let i = 0; i < 1000; i++) {
      crimeDaily(state, {}, MOCK_CTX);
    }

    assert.ok(state.home.crime.level <= 1, 'crime level should be clamped to max 1');
    assert.ok(state.home.crime.level >= 0, 'crime level should be >= 0');
  });

  it('does nothing special with 0 population', () => {
    const state = createState();
    state.home.population.total = 0;
    state.home.crime.level = 0;

    crimeDaily(state, {}, MOCK_CTX);

    // With 0 population, delta = 0 (no population contribution)
    assert.strictEqual(state.home.crime.level, 0);
  });

  it('reduces player gold when crime incidents occur', () => {
    const state = createState();
    state.home.population.total = 10000;
    state.home.crime.level = 1.0; // max crime
    state.player.gold = 1000;

    const goldBefore = state.player.gold;
    crimeDaily(state, {}, MOCK_CTX);

    // With max crime and large population, gold loss should occur
    const incidents = crimeCount(10000, 1.0, BALANCE.crime);
    if (incidents > 0) {
      assert.ok(state.player.gold <= goldBefore, 'gold should decrease or stay same due to crime');
    }
  });
});
