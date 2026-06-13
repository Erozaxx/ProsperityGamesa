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
