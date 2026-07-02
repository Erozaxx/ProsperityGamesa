# Current Task

- **Task ID**: T-ADV-002
- **Brief**: BRIEF-ADV-002
- **Iteration**: post-iter-021 (advisory)
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-07-02
- **Completed**: 2026-07-02

## Co teď dělám
Dokončeno. e2e + RUM bug-hunt (Playwright/Chromium, 12 flow, desktop 1280 + mobil 390/360/320 touch).
RUM čistá: 0 console.error / 0 pageerror / 0 requestfailed / 0 overflow napříč všemi flow.
10 reprodukovaných nálezů: 0 BLOCKER, 6 MAJOR, 4 MINOR. Žádný pád; jde o UX/wiring/CSS mezery.

Top 3 (zdroj „spousty chyb"):
- #1 story dialog: neostylovaný + pod okrajem stránky + neblokuje pozadí (MAJOR)
- #2 žádná zpětná vazba na akce při pauze/story-freeze (send() nevolá requestRender) (MAJOR)
- #3/#4 nábor a dovednosti nedosažitelné z UI (dark features) (MAJOR)

Verdikt: NO-GO pro „hratelné bez frustrace" bez oprav #1+#2. Runtime stabilní (0 crashů).
Živá URL z sandboxu nedostupná (proxy) → cross-check NEOVĚŘENO. iOS on-device NEOVĚŘENO (N3 známé).

## Výstupy
- Harness: `.aiworkflow/agents/tester/scratch/e2e-rum.mjs` (spustitelný, dokumentovaný)
- Report: `.aiworkflow/agents/tester/artifacts/final/e2e-rum-report_post-iter-021.md`

## Checklist (z briefu BRIEF-ADV-002)
- [x] T-ADV-002a: Postav e2e/RUM Playwright harness (vzor z tools/smoke.mjs), ověř boot
- [x] T-ADV-002b: Projeď e2e user-flows na desktop + mobil, zachytávej RUM telemetrii
- [x] T-ADV-002c: Reprodukuj a kategorizuj nálezy (BLOCKER/MAJOR/MINOR, kroky, oček. vs. pozor.)
- [x] T-ADV-002d: Sepiš bug report + doporučení co opravit první, zapiš artefakt

## Blockery
–
