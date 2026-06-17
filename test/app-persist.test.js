/**
 * Tests for src/app/persist.js – requestPersistentStorage + iter-021 T2 (R-F) eviction/reminder.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  requestPersistentStorage,
  isStoragePersisted,
  getLastExportAt,
  setLastExportAt,
  evaluateExportReminder,
  LAST_EXPORT_KEY,
  EXPORT_REMINDER_DAYS,
} from '../src/app/persist.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Minimal in-memory Storage stub. */
function fakeStorage() {
  /** @type {Map<string,string>} */
  const m = new Map();
  return /** @type {Storage} */ (/** @type {unknown} */ ({
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    clear: () => m.clear(),
    key: () => null,
    length: 0,
  }));
}

test('requestPersistentStorage returns false when navigator is undefined', async () => {
  const result = await requestPersistentStorage();
  assert.equal(result, false);
});

test('isStoragePersisted returns false when navigator is undefined', async () => {
  const result = await isStoragePersisted();
  assert.equal(result, false);
});

test('lastExportAt sidecar round-trips through injected storage', () => {
  const store = fakeStorage();
  assert.equal(getLastExportAt(store), null, 'no value initially');
  setLastExportAt(1_700_000_000_000, store);
  assert.equal(getLastExportAt(store), 1_700_000_000_000);
  // stored under the dedicated app-metadata key (NOT in any game-save payload)
  assert.equal(store.getItem(LAST_EXPORT_KEY), '1700000000000');
});

test('getLastExportAt tolerates corrupt/non-numeric values', () => {
  const store = fakeStorage();
  store.setItem(LAST_EXPORT_KEY, 'not-a-number');
  assert.equal(getLastExportAt(store), null);
});

test('reminder fires when storage is NOT persistent (even if recently exported)', () => {
  const now = 1_700_000_000_000;
  const d = evaluateExportReminder({ persisted: false, lastExportAt: now - 1000, now });
  assert.equal(d.show, true);
  assert.equal(d.reason, 'not-persisted');
});

test('reminder fires when never exported but storage persistent', () => {
  const now = 1_700_000_000_000;
  const d = evaluateExportReminder({ persisted: true, lastExportAt: null, now });
  assert.equal(d.show, true);
  assert.equal(d.reason, 'never');
});

test('reminder fires when last export is older than the threshold', () => {
  const now = 1_700_000_000_000;
  const lastExportAt = now - (EXPORT_REMINDER_DAYS + 1) * DAY_MS;
  const d = evaluateExportReminder({ persisted: true, lastExportAt, now });
  assert.equal(d.show, true);
  assert.equal(d.reason, 'stale');
  assert.ok(d.daysSinceLastExport > EXPORT_REMINDER_DAYS);
});

test('reminder stays quiet when persistent and recently exported', () => {
  const now = 1_700_000_000_000;
  const lastExportAt = now - 2 * DAY_MS; // 2 days ago < 7
  const d = evaluateExportReminder({ persisted: true, lastExportAt, now });
  assert.equal(d.show, false);
  assert.equal(d.reason, null);
});

test('reminder threshold is configurable', () => {
  const now = 1_700_000_000_000;
  const lastExportAt = now - 5 * DAY_MS;
  assert.equal(evaluateExportReminder({ persisted: true, lastExportAt, now, reminderDays: 3 }).show, true);
  assert.equal(evaluateExportReminder({ persisted: true, lastExportAt, now, reminderDays: 10 }).show, false);
});
