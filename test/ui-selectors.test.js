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
import { selectClock, selectSeason, selectSpeed } from '../src/ui/selectors.js';

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
