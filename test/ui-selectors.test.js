/**
 * Tests for src/ui/selectors.js – pure selectors, no DOM needed.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { initRng } from '../src/core/engine/rng.js';
import { step } from '../src/core/engine/index.js';
import { createRegistry } from '../src/core/registry/registry.js';
import { registerCorePeriodics } from '../src/core/engine/tickOrder.js';
import { selectClock, selectSeason, selectSpeed, selectJobs, selectSkills, selectWorkforce, selectWorld } from '../src/ui/selectors.js';

test('selectClock returns day=1, year=1 for initial state', () => {
  const state = createInitialState();
  const clock = selectClock(state);
  assert.equal(clock.day, 1);
  assert.equal(clock.year, 1);
  assert.equal(clock.curStep, 0);
  assert.equal(clock.dayInSeason, 1);
});

test('selectClock.curStep grows after steps', () => {
  const state = createInitialState();
  initRng(state);
  const registry = createRegistry();
  const periodics = registerCorePeriodics(registry);
  const ctx = { registry, periodics };

  for (let i = 0; i < 5; i++) step(state, ctx);
  const clock = selectClock(state);
  assert.equal(clock.curStep, 5);
});

test('selectSeason returns Léto for curSeason=1', () => {
  const state = createInitialState();
  state.season.curSeason = 1;
  const season = selectSeason(state);
  assert.equal(season.season, 1);
  assert.equal(season.name, 'Léto');
});

test('selectSeason returns Jaro for curSeason=0', () => {
  const state = createInitialState();
  const season = selectSeason(state);
  assert.equal(season.name, 'Jaro');
});

test('selectSeason returns ? for unknown season index', () => {
  const state = createInitialState();
  // @ts-ignore - test bad value
  state.season.curSeason = 99;
  const season = selectSeason(state);
  assert.equal(season.name, '?');
});

test('selectSpeed returns 1 for default state', () => {
  const state = createInitialState();
  assert.equal(selectSpeed(state), 1);
});

test('selectSpeed reflects mutated speed', () => {
  const state = createInitialState();
  state.engine.speed = 0;
  assert.equal(selectSpeed(state), 0);
  state.engine.speed = 2;
  assert.equal(selectSpeed(state), 2);
});

// ---------------------------------------------------------------------------
// M3: selectJobs
// ---------------------------------------------------------------------------

test('selectJobs returns empty array for initial state (no jobs assigned)', () => {
  const state = createInitialState();
  const jobs = selectJobs(state);
  assert.deepEqual(jobs, []);
});

test('selectJobs returns assigned job rows', () => {
  const state = createInitialState();
  state.home.jobs = {
    baker: { number: 5, curStep: 20 },
    fisher: { number: 2, curStep: 0 },
  };
  const jobs = selectJobs(state);
  assert.equal(jobs.length, 2);
  const baker = jobs.find(j => j.id === 'baker');
  assert.ok(baker, 'baker should be in jobs');
  assert.equal(baker.number, 5);
  assert.equal(baker.curStep, 20);
});

// ---------------------------------------------------------------------------
// M3: selectSkills
// ---------------------------------------------------------------------------

test('selectSkills returns empty array for initial state (no skills)', () => {
  const state = createInitialState();
  const skills = selectSkills(state);
  assert.deepEqual(skills, []);
});

test('selectSkills returns skill rows with progressing flag', () => {
  const state = createInitialState();
  state.home.skills = {
    woodworking: { progressing: true, curStep: 15, progPct: 60 },
    scholarship: { progressing: false, curStep: 0, progPct: 0 },
  };
  const skills = selectSkills(state);
  assert.equal(skills.length, 2);
  const ww = skills.find(s => s.id === 'woodworking');
  assert.ok(ww, 'woodworking should be in skills');
  assert.ok(ww.progressing, 'woodworking should be progressing');
  assert.equal(ww.curStep, 15);
  assert.equal(ww.progPct, 60);
});

// ---------------------------------------------------------------------------
// M3: selectWorkforce
// ---------------------------------------------------------------------------

test('selectWorkforce returns correct totals', () => {
  const state = createInitialState();
  state.home.workforce = { total: 50, assigned: 12 };
  state.home.workerEfficiency = 1.5;
  const wf = selectWorkforce(state);
  assert.equal(wf.total, 50);
  assert.equal(wf.assigned, 12);
  assert.equal(wf.unemployed, 38);
  assert.equal(wf.efficiency, 1.5);
});

// ---------------------------------------------------------------------------
// M3: selectWorld
// ---------------------------------------------------------------------------

test('selectWorld returns forest/field/mine sub-objects', () => {
  const state = createInitialState();
  const world = selectWorld(state);
  assert.ok('forest' in world, 'world should have forest');
  assert.ok('field' in world, 'world should have field');
  assert.ok('mine' in world, 'world should have mine');
  assert.ok(typeof world.forest.curTrees === 'number', 'forest.curTrees should be a number');
  assert.ok(typeof world.mine.curOres === 'number', 'mine.curOres should be a number');
});

test('selectWorld reflects state mutations', () => {
  const state = createInitialState();
  state.world.forest.curTrees = 12345;
  state.world.mine.curOres = 99999;
  const world = selectWorld(state);
  assert.equal(world.forest.curTrees, 12345);
  assert.equal(world.mine.curOres, 99999);
});
