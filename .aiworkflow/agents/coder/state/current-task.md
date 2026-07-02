# Current Task
- **Task ID**: T-001 (iter-022 — Vlna 1 UX/wiring/CSS opravy z QA reportu post-iter-021)
- **Iteration**: iter-022
- **Status**: done
- **Done**: 2026-07-02
- **Gate**: `npm run ci` = 1566/1566 pass (0 fail). `npm run smoke` = SMOKE OK (0 console errorů, 0 horizontal overflow @320/360/390 napříč 12 taby). `git diff --stat src/core src/data` = PRÁZDNÉ (core/data netknuto, golden-hash G1 nedotčen — žádný core soubor v diffu, m9a-regression golden-hash testy v `npm run ci` ZELENÉ). Render-throttle testy (`test/render-throttle.test.js`) ZELENÉ — throttle nerozbit. Precache regenerován (`node tools/gen-precache.mjs`).

## Dílčí checklist
- [x] T-001a: #2 render-on-send v `send()` (main.js) — respektovat render-throttle
- [x] T-001b: #1 CSS pro story overlay/dialog/tlačítka (fixed, backdrop, z-index, centrování, ve viewportu 320–1280)
- [x] T-001c: #1c modalita (blok pozadí) — CSS-first (fixed overlay intercepts clicks), žádný JS focus-trap potřeba
- [x] T-001d: #10 dostylovat `.offline-summary` + `.catchup-progress`
- [x] T-001e: validace (CI + smoke + golden-hash + regenerace precache) a technický záznam změn

## Poznámka k validaci e2e-rum harness (volitelné)
Harness (`.aiworkflow/agents/tester/scratch/e2e-rum.mjs`) potvrdil #1 opraveno (story overlay
`position:fixed, z-index:1000, inViewport:true`). Narazil jsem na intermitentní
"HARNESS-FLOW-CRASH" v F4 (tab click timeout) — vyšetřeno instrumentovanou kopií harnessu:
příčina je SPRÁVNÉ chování (nová story událost na hranici dne @krok 901 legitimně zamkla
engine a `.story-overlay` correctně blokoval klik na pozadí — přesně #1c, jak QA požadovalo).
F4 flow v harnessi nevolá `clearOverlays()` mezi jednotlivými tab-kliky (na rozdíl od F2/F3),
takže mid-flow story event způsobí timeout kliku na tab pod overlayem. Toto je gap v tester
harnessu (mimo můj scope), ne regrese v produkčním kódu — zdokumentováno v
`artifacts/final/wave1_iter-022.md`.
