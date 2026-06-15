# Current Task

- **Task ID**: T-002 (iter-021, M9b – review designu release kandidáta, Opus přísnost)
- **Brief**: BRIEF-021-002
- **Iteration**: iter-021
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-15
- **Completed**: 2026-06-15

## Co teď dělám
Hotovo: review designu M9b (DESIGN-021-001) PROTI KÓDU + architektuře iter-002. Ověřeno čtením:
service-worker.js, src/ui/render.js, src/app/loop.js, src/app/persist.js, src/app/autosave.js,
src/app/lifecycle.js, src/save/saveStore.js, src/save/schema.js, src/save/persistSchema.js,
src/core/engine/rng.js (hashState), src/core/engine/clock.js, src/ui/App.js, src/ui/styles.css,
index.html, src/precache.js, tools/gen-precache.mjs, icons/, arch §3.4/§6.1/§6.3/§9.2/§9.4,
done-criteria.

## Výsledek
Verdikt: **GO-s-podmínkami** (3 podmínky, všechny minor/dispatch — žádný blocker).

- Determinismus nedotčen: PASS — render-throttle (UI vrstva), lastExportAt sidecar (envelope mimo
  payload), _meta (allowlist persist) všechny MIMO hashState; hashState hashuje jen state/payload.
- SW update bez ztráty savu: PASS — message-driven skip-waiting + autosave('hide') (existuje,
  lifecycle wired) + IndexedDB mimo cache; offline zachován; cache verze se nemíchají.
- Evikce: PASS — persisted() + reminder >7d, lastExportAt sidecar mimo hashState.
- Mobile UX měřitelné: PASS — touch/overflow/render-cap deterministicky testovatelné; render ~60/s
  nález správný (ověřeno render.js + loop.js + clock.js); fix v UI vrstvě.
- Licence = user gate: PASS — jen doporučení, žádný LICENSE před rozhodnutím (ověřeno: repo nemá),
  eskalace povinná; gen-precache EXCLUDE /\.md$/ + ROOTS bez doc//tools/ → distribuce čistá.
- Split A/B: SOUHLAS (disjunktní, oba Sonnet) s podmínkou sekvenčního finálního gen-precache.

## Nálezy (severity)
- BLOCKER: 0
- MAJOR: 0
- MINOR: 3 (1: precache re-gen není čistě paralelní — _meta v src/data je v ROOTS → sekvenční
  gen-precache; 2: render-throttle test musí pokrýt živou dávku ne klid; 3: C-021-B potřebuje
  explicitní determinismus G1 gate po _meta změnách)
- NIT: 2 (1: zkrácené cesty ve split/briefu — persist je src/app/ ne src/save/; 2: OFF-2 PNG ikona
  rozhodnutí přiřadit na user-gate Q2)

Výstup: agents/reviewer/artifacts/final/review_design_iter-021_T-002.md

## NEcommitnuto (per brief).
