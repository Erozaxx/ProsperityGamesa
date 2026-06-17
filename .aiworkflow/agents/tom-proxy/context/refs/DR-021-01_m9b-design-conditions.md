# DR-021-01 — M9b (release kandidát) designové podmínky + impl poznámky

- **Datum**: 2026-06-15
- **Stav**: Rozhodnuto (architekt T-001 + reviewer T-002 GO-s-podmínkami)

## Rozhodnutí

1. **Determinismus nedotčen (release invariant)**: všechny M9b změny jsou UI/prezentační/infra vrstva MIMO deterministický herní stav. `hashState` (rng.js:69, hashuje jen persist payload přes allowlist) MUSÍ zůstat IDENTICKÝ s iter-020:
   - render-throttle (`RENDER_MIN_INTERVAL_MS=66`, trailing) čte `performance.now()` jen v UI render loopu, ne v core.
   - `lastExportAt` = envelope sidecar vedle `savedAt`, MIMO `payload`.
   - `_meta.provenance` na katalozích, MIMO persist allowlist.
2. **SW update bez ztráty savu (R-F)**: `skipWaiting()` (service-worker.js:11) → message-driven skip-waiting + UI prompt + `autosave.requestSave('hide')` (už existuje, autosave.js:40-46, wired lifecycle.js/main.js:348-352) před reloadem. Update maže jen caches; save v IndexedDB (saveStore.js) přežije.
3. **Evikce (R-F)**: `persisted()` + export reminder při `daysSinceLastExport>7` || ne-perzistentní; sidecar mimo hashState.
4. **Licence = USER GATE (nevratné/právní)**: doporučení MIT+disclaimer (alt GPL-3.0/proprietární); **finální rozhodnutí = explicitní user gate T-008**, tom-proxy NEROZHODUJE — eskaluje. Žádný `LICENSE` soubor se necommituje před rozhodnutím. PROVENANCE.md §6 = placeholder. `gen-precache.mjs` EXCLUDE `\.md$` + ROOTS bez doc/tools → distribuce čistá.

## Designové podmínky (GO-s-podmínkami, zapracovat při kódu)

- **MINOR-1 (render test)**: render-throttle test MUSÍ pokrýt živou dávku (2× rychlost + kroky), ne klid — jinak "≤15/s" falešně PASS.
- **MINOR-2 (precache sekvenčně)**: C-021-B edituje `src/data/*.json` (`_meta`) = v precache ROOTS. **Orchestrátor vynutí jediný finální `gen-precache` po dokončení A i B (NE paralelně)** — proto C-021-A a C-021-B běží SEKVENČNĚ.
- **MINOR-3 (G1 gate)**: C-021-B potřebuje explicitní determinismus G1 gate (hashState identický) po `_meta` změnách.
- **NIT**: persist je `src/app/persist.js` (ne `src/save/persist.js` jak uvádí brief); OFF-2 PNG ikona → ověření na user-gate Q2.

## Split coder tasků (SEKVENČNĚ — viz MINOR-2)
- **C-021-A** (= plan T-004): T1 mobile UX + T2 PWA audit (render.js, styles.css, index.html, App.js, service-worker.js, sw-register.js, app/persist.js).
- **C-021-B** (= plan T-005): T3 PROVENANCE/licence + T4 release docs (PROVENANCE.md, audit-provenance.mjs, _meta.provenance v src/data, README přepis, KNOWN_ISSUES).
- Orchestrátor regeneruje precache JEDNOU po obou.

## Reference
- Design: agents/architect/artifacts/final/design_iter-021_T-001.md
- Review: agents/reviewer/artifacts/final/review_design_iter-021_T-002.md
