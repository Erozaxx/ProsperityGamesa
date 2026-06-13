/**
 * Tests for src/ui/ErrorScreen.js – buildErrorModel pure function, no DOM.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildErrorModel } from '../src/ui/ErrorScreen.js';

test('buildErrorModel kind=save includes Nová hra action', () => {
  const model = buildErrorModel({ kind: 'save', message: 'Chyba při načtení.' });
  const keys = model.actions.map((a) => a.key);
  assert.ok(keys.includes('newGame'), 'save kind should have newGame action');
  assert.ok(keys.includes('retry'), 'should always have retry action');
});

test('buildErrorModel kind=boot does not include Nová hra action', () => {
  const model = buildErrorModel({ kind: 'boot', message: 'Neočekávaná chyba.' });
  const keys = model.actions.map((a) => a.key);
  assert.ok(!keys.includes('newGame'), 'boot kind should not have newGame action');
  assert.ok(keys.includes('retry'));
});

test('buildErrorModel kind=catalog does not include Nová hra', () => {
  const model = buildErrorModel({ kind: 'catalog', message: 'Katalog selhal.' });
  const keys = model.actions.map((a) => a.key);
  assert.ok(!keys.includes('newGame'));
});

test('buildErrorModel showDetail=false when no error provided', () => {
  const model = buildErrorModel({ kind: 'save', message: 'Test' });
  assert.equal(model.showDetail, false);
});

test('buildErrorModel title is always set', () => {
  const model = buildErrorModel({ kind: 'boot', message: 'Msg' });
  assert.ok(typeof model.title === 'string' && model.title.length > 0);
});

test('buildErrorModel message is preserved', () => {
  const msg = 'Specifická chybová zpráva pro uživatele.';
  const model = buildErrorModel({ kind: 'save', message: msg });
  assert.equal(model.message, msg);
});
