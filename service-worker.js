/**
 * Hand-written service worker (§2.1). Cache-first, versioned precache list.
 * Version + URL list come from the generated src/precache.js (run tools/gen-precache.mjs to refresh).
 */
import { PRECACHE_VERSION, PRECACHE_URLS } from './src/precache.js';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  // iter-021 T2 (DR-021-01 §1): do NOT skipWaiting() automatically. A new version waits
  // until the app explicitly opts in (SKIP_WAITING message), so a running session never
  // gets a half-swapped module set mid-play (no-build ESM cache-mixing risk).
});

// iter-021 T2: message-driven skip-waiting. The page posts {type:'SKIP_WAITING'} after the
// user accepts the update banner (and after autosave has flushed to IndexedDB).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== PRECACHE_VERSION)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((hit) => {
      if (hit) return hit;
      return fetch(event.request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(PRECACHE_VERSION).then((cache) => cache.put(event.request, copy));
          return resp;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
