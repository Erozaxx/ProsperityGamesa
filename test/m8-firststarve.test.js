/**
 * M8 regression — firstStarve story trigger wiring (iter-019, review MAJOR-1 fix).
 *
 * The firstStarve event triggers on `flagTrue: home.food.starvation`. Before the fix
 * food.js computed a local `starved` but never set a persisted flag, so the event was
 * dead. This locks the wiring: meal sets the flag, the predicate reads it, it round-trips.
 *
 *   FS-1  meal with insufficient food sets home.food.starvation = true
 *   FS-2  meal with sufficient food clears it (toggles, mirrors diseaseActive)
 *   FS-3  evalPredicate flagTrue:home.food.starvation reflects the flag
 *   FS-4  starvation flag survives persist round-trip
 *   FS-5  fresh state initialises starvation = false
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createHomeState } from '../src/core/state/createHomeState.js';
import { meal1 } from '../src/core/systems/food.js';
import { evalPredicate } from '../src/core/systems/predicate.js';
import { PERSIST_SCHEMA } from '../src/save/persistSchema.js';

/** Minimal state wrapper so meal1 can run against home sub-domain only. */
function makeState(populationTotal, store) {
  const home = createHomeState();
  home.population.total = populationTotal;
  home.food.store = { ...home.food.store, ...store };
  return { home };
}

describe('M8 firstStarve trigger wiring (MAJOR-1)', () => {
  it('FS-5: fresh home state initialises starvation = false', () => {
    const home = createHomeState();
    assert.equal(home.food.starvation, false, 'fresh state must init starvation=false');
  });

  it('FS-1: meal with empty food store sets starvation = true', () => {
    const state = makeState(50, {}); // population eats, store empty → starved > 0
    meal1(state, {}, {});
    assert.equal(state.home.food.starvation, true, 'empty store must set starvation=true');
  });

  it('FS-2: meal with ample food clears starvation (toggles off)', () => {
    const state = makeState(50, {});
    meal1(state, {}, {});
    assert.equal(state.home.food.starvation, true, 'precondition: starving');
    // Refill far beyond demand and re-run the meal.
    state.home.food.store.bread = 100000;
    meal1(state, {}, {});
    assert.equal(state.home.food.starvation, false, 'ample food must clear starvation');
  });

  it('FS-3: evalPredicate flagTrue:home.food.starvation reflects the flag', () => {
    const pred = { kind: 'flagTrue', path: 'home.food.starvation' };
    const starving = makeState(50, {});
    meal1(starving, {}, {});
    assert.equal(evalPredicate(pred, starving), true, 'predicate true while starving');

    const fed = makeState(50, { bread: 100000 });
    meal1(fed, {}, {});
    assert.equal(evalPredicate(pred, fed), false, 'predicate false while fed');
  });

  it('FS-4: starvation is in the persist schema (survives round-trip)', () => {
    assert.ok(
      PERSIST_SCHEMA.food.includes('starvation'),
      'food persist schema must include starvation for kill-resume determinism',
    );
  });
});
