# Current Task

- **Task ID**: T-007 (iter-021, M9b – RELEASE GATE release kandidáta, Opus přísnost, právo re-run)
- **Brief**: BRIEF-021-007
- **Iteration**: iter-021
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-17
- **Completed**: 2026-06-17

## Co teď dělám
Hotovo: ZÁVĚREČNÝ RELEASE GATE (master plán M0–M9) PROTI KÓDU + empirickým spuštěním gate.
Ověřeno vlastním během: `git diff src/core/`=prázdný, `npm run lint:core` PASS (66 souborů),
`npm run typecheck` PASS, `npm run ci` 1566/1566 fail 0, `node tools/audit-provenance.mjs` 0
verbatim, `node tools/audit-touch-targets.mjs` PASS, golden hash `m9a-regression.test.js` 17/17,
nové testy render-throttle 3/3 + sw-update-flow 5/5 + app-persist 9/9, precache regen idempotentní
(diff prázdný). Čteno: render.js, service-worker.js, sw-register.js, persist.js, main.js (wiring),
App.js, contracts.json diff, PROVENANCE.md, KNOWN_ISSUES.md, README, audit-provenance.mjs.

## Výsledek
Verdikt: **GO (release kandidát)** — 0 blocker, 0 major, 2 minor, 2 nit (žádný release-blokující).

- INV-1 Determinismus G1: PASS — core diff prázdný, src/data změna jen contracts.json `_meta`
  (žádná herní hodnota), balance.js nedotčen, golden hash 17/17 identický, lint:core PASS;
  render-throttle/lastExportAt-sidecar/_meta vše MIMO hashState (ověřeno v kódu).
- INV-2 SW update save-safe: PASS — install bez auto-skipWaiting, flushSave PŘED postMessage
  (test #3 deepEqual order), jednorázový reload guard, save v IndexedDB přežije, SW reg po bootu.
- INV-3 Render ≤15/s živá dávka: PASS — test asserts paints ≤16 A ≥10 pod 60fps dirty burst.
- INV-4 Licence = user gate: PASS — žádný LICENSE soubor, PROVENANCE §6 placeholder, 0 verbatim,
  .md mimo precache.
- Acceptance criteria zadání 1–4 (hratelná/install/idle/save): PASS.
- DoD M9 / done-criteria: SPLNĚNO, master plán M0–M9 kompletní, release kandidát.

## Nálezy (severity)
- BLOCKER: 0
- MAJOR: 0
- MINOR: 2 (1: sw-update test count 5 vs summary 6 = kosmetika; 2: touch audit je statický CSS,
  ne runtime — shoda s designem §1 UX-1, nice-to-have post-release)
- NIT: 2 (1: contracts.json provenance reword kosmetika; 2: banner texty inline česky bez i18n)

Výstup: agents/reviewer/artifacts/final/review_iter-021_T-007.md

## NEcommitnuto (per brief).
