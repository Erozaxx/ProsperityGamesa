/**
 * registry.test.js – BUG-001 regression tests + effects skeleton tests (iter-006)
 * Tests that assertSerializable handles cyclic objects cleanly (no RangeError stack overflow).
 * Also tests registerEffects idempotency and known/unknown effect IDs.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertSerializable, createRegistry, register, resolve } from '../src/core/registry/registry.js';
import { registerEffects } from '../src/core/registry/effects.js';

describe('assertSerializable – BUG-001 regression', () => {
  it('cyclic object does NOT throw RangeError (stack overflow)', () => {
    const a = {};
    // @ts-ignore – intentional cycle for test
    a.self = a;
    // Before fix this would crash with RangeError: Maximum call stack size exceeded.
    // After fix it must complete without any error (cycle = ok, no function in it).
    assert.doesNotThrow(() => assertSerializable(a));
  });

  it('cyclic object with function inside throws "must not contain functions" (not RangeError)', () => {
    const a = {};
    // @ts-ignore – intentional cycle + function for test
    a.self = a;
    // @ts-ignore
    a.fn = () => {};
    let thrown = null;
    try {
      assertSerializable(a);
    } catch (e) {
      thrown = e;
    }
    assert.ok(thrown !== null, 'expected an error to be thrown');
    assert.ok(
      thrown instanceof Error && thrown.message.includes('must not contain functions'),
      `expected "must not contain functions" but got: ${String(thrown)}`
    );
    // Must NOT be a RangeError
    assert.ok(
      !(thrown instanceof RangeError),
      'should not be a RangeError (stack overflow)'
    );
  });

  it('happy path – plain nested object passes without error', () => {
    assert.doesNotThrow(() => assertSerializable({ x: 1, nested: { y: 2, z: [3, 4] } }));
  });
});

// ---------------------------------------------------------------------------
// Effects skeleton tests (iter-006 M1)
// ---------------------------------------------------------------------------
describe('registerEffects – M1 skeleton', () => {
  it('registerEffects is idempotent (double register does not throw)', () => {
    const reg = createRegistry();
    registerEffects(reg);
    // Second call should be idempotent (same handler re-registered)
    assert.doesNotThrow(() => registerEffects(reg));
  });

  it('known effectId "noop" resolves without throwing', () => {
    const reg = createRegistry();
    registerEffects(reg);
    assert.doesNotThrow(() => resolve(reg, 'noop'));
  });

  it('known effectId "createScholars" resolves', () => {
    const reg = createRegistry();
    registerEffects(reg);
    assert.doesNotThrow(() => resolve(reg, 'createScholars'));
  });

  it('known effectId "unlockBuilding" resolves', () => {
    const reg = createRegistry();
    registerEffects(reg);
    assert.doesNotThrow(() => resolve(reg, 'unlockBuilding'));
  });

  it('known effectId "unlockMap" resolves', () => {
    const reg = createRegistry();
    registerEffects(reg);
    assert.doesNotThrow(() => resolve(reg, 'unlockMap'));
  });

  it('known effectId "insertInventory" resolves', () => {
    const reg = createRegistry();
    registerEffects(reg);
    assert.doesNotThrow(() => resolve(reg, 'insertInventory'));
  });

  it('known effectId "grantResource" resolves', () => {
    const reg = createRegistry();
    registerEffects(reg);
    assert.doesNotThrow(() => resolve(reg, 'grantResource'));
  });

  it('unknown effectId throws (fail-fast)', () => {
    const reg = createRegistry();
    registerEffects(reg);
    assert.throws(
      () => resolve(reg, 'unknownEffectId_XYZ'),
      /registry: unknown id/
    );
  });
});
