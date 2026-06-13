/**
 * Registers the service worker if supported. Best-effort: failure only warns.
 * @returns {Promise<void>}
 */
export async function registerServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('service-worker.js', { scope: './', type: 'module' });
  } catch (e) {
    console.warn('[sw] registration failed:', e);
  }
}
