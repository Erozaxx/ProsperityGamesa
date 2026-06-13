/**
 * registry.test.js – BUG-001 regression tests (iter-006)
 * Tests that assertSerializable handles cyclic objects cleanly (no RangeError stack overflow).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertSerializable } from '../src/core/registry/registry.js';

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
