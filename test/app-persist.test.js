/**
 * Tests for src/app/persist.js – requestPersistentStorage, fake navigator.storage.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestPersistentStorage } from '../src/app/persist.js';

test('returns false when navigator is undefined', async () => {
  // persist.js checks typeof navigator === 'undefined'
  // In Node, navigator is not defined → should return false
  const result = await requestPersistentStorage();
  assert.equal(result, false);
});
