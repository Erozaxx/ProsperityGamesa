/**
 * Storage persistence + eviction-defence helpers (R-F §12, iter-021 T2).
 *
 * All of this lives in the app layer and reads `Date.now()` / Web Storage HERE only — never in
 * core. `lastExportAt` is an ENVELOPE SIDECAR: it is NOT part of the game save payload, so it
 * never enters the persist schema, hashState, or determinism. It is stored as a small app
 * preference (localStorage) next to — but outside — the IndexedDB game save.
 */

/** localStorage key for the export-reminder sidecar (app metadata, NOT game state). */
export const LAST_EXPORT_KEY = 'prosperity.lastExportAt';

/** Default reminder threshold: 7 real days since last export (design §2.2). */
export const EXPORT_REMINDER_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Requests persistent storage to reduce eviction risk (esp. iOS, R-F §12). Best-effort.
 * @returns {Promise<boolean>} granted? (false on unsupported / denied – never throws)
 */
export async function requestPersistentStorage() {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/**
 * Reports whether storage is currently persistent (eviction-protected). Best-effort.
 * @returns {Promise<boolean>} true if persisted; false on unsupported / denied / error.
 */
export async function isStoragePersisted() {
  if (typeof navigator === 'undefined' || !navigator.storage?.persisted) return false;
  try {
    return await navigator.storage.persisted();
  } catch {
    return false;
  }
}

/**
 * Reads the sidecar `lastExportAt` timestamp (ms epoch), or null if never exported.
 * @param {Storage} [store] - injectable (defaults to localStorage if available)
 * @returns {number | null}
 */
export function getLastExportAt(store) {
  const s = store ?? (typeof localStorage !== 'undefined' ? localStorage : null);
  if (!s) return null;
  try {
    const raw = s.getItem(LAST_EXPORT_KEY);
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/**
 * Records the sidecar `lastExportAt` timestamp. Call right after a successful export.
 * @param {number} now - wall-clock ms (Date.now()) — read in app layer only.
 * @param {Storage} [store] - injectable (defaults to localStorage if available)
 * @returns {void}
 */
export function setLastExportAt(now, store) {
  const s = store ?? (typeof localStorage !== 'undefined' ? localStorage : null);
  if (!s) return;
  try {
    s.setItem(LAST_EXPORT_KEY, String(now));
  } catch {
    // storage full / disabled — non-fatal, reminder simply keeps firing
  }
}

/**
 * Decides whether to surface the "back up your progress" reminder.
 * Fires when storage is NOT persistent (higher eviction risk) OR it's been longer than
 * `reminderDays` since the last export. Pure function — all inputs injected, no side effects.
 *
 * @param {Object} args
 * @param {boolean} args.persisted - navigator.storage.persisted() result
 * @param {number | null} args.lastExportAt - sidecar timestamp (ms) or null if never
 * @param {number} args.now - wall-clock ms (Date.now())
 * @param {number} [args.reminderDays] - threshold in real days (default EXPORT_REMINDER_DAYS)
 * @returns {{ show: boolean, reason: 'never'|'stale'|'not-persisted'|null, daysSinceLastExport: number|null }}
 */
export function evaluateExportReminder(args) {
  const reminderDays = args.reminderDays ?? EXPORT_REMINDER_DAYS;
  const daysSinceLastExport = args.lastExportAt == null
    ? null
    : (args.now - args.lastExportAt) / DAY_MS;

  // Non-persistent storage → eviction risk is real → always remind.
  if (!args.persisted) {
    return { show: true, reason: 'not-persisted', daysSinceLastExport };
  }
  // Never exported and storage is persistent → gently remind once it's "old enough" is moot;
  // treat "never exported" as a reminder reason so the very first backup is encouraged.
  if (daysSinceLastExport == null) {
    return { show: true, reason: 'never', daysSinceLastExport: null };
  }
  if (daysSinceLastExport > reminderDays) {
    return { show: true, reason: 'stale', daysSinceLastExport };
  }
  return { show: false, reason: null, daysSinceLastExport };
}
