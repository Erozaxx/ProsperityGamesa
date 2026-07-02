# Brief

- **Brief ID**: BRIEF-022-01
- **Iteration**: iter-022
- **From**: Orchestrator
- **To**: coder
- **Date**: 2026-07-02

## Goal
Vlna 1 oprav z QA reportu T-ADV-002: odstranit dojem „hra je rozbitá/zamrzlá a tlačítka nefungují" — (#2) chybějící překreslení po akci a (#1) neostylovaný/mimo-obrazovkový story dialog. Plus související neostylované runtime panely (#10). **Bez doteku `src/core/` a `src/data/`** — golden-hash G1 musí zůstat bit-identický.

## Context
- QA report: `.aiworkflow/agents/tester/artifacts/final/e2e-rum-report_post-iter-021.md` (nálezy #1, #2, #10). PŘEČTI ho.
- Runtime je stabilní (0 JS chyb) — tohle jsou UI/wiring/CSS mezery, ne pády.
- Determinismus: `src/app/send()` posílá commandy do jádra; jádro se NEMĚNÍ. Render vrstva je mimo hashState.
- Pozor na iter-021 UX-3 render-throttle (`src/ui/render.js`, `RENDER_MIN_INTERVAL_MS`) — oprava #2 nesmí throttle obejít ani rozbít (žádné render-bouře).

## Scope IN
- **#2 render-on-send:** `send()` (`src/app/main.js:277-278`) po úspěšném dispatchi zajistí překreslení UI. Preferovaný přístup: obal `send` tak, aby po dispatchi zavolal `requestRender()` (které už respektuje throttle v `render.js`). Musí fungovat i když engine běží (nezdvojovat render s loop `onDirty`) i když je pauza/story-freeze (loop nekrokuje → dnes žádný render). Ověř, že `requestRender` je v scope v momentě volání (dnes je definován níž na ř. 338/365 — vyřeš pořadí/closure čistě, ne hackem).
- **#1 story dialog CSS + modalita:** doplň do `src/ui/styles.css` pravidla pro `.story-overlay`, `.story-dialog`, `.story-option-btn`: fixed pozice přes celý viewport, backdrop (ztmavení), vysoký z-index (nad taby/HUD), vycentrování, čitelné tlačítko. Dialog musí být VE viewportu na 320/360/390 i desktopu. Volitelně (#1c) blokace interakce s pozadím — pokud jde čistě přes CSS (pointer-events/overlay), OK; JS focus-trap jen pokud nutné a bezpečné (`GamelogScreen.js:58-78`).
- **#10 související panely:** dostyluj `.offline-summary` a `.catchup-progress` (dnes 0 pravidel) do konzistentního kontejneru jako ostatní bannery. Story/tutorial overlay řeší #1.
- Aktualizuj precache pokud přidáš/změníš soubor v precache manifestu (`node tools/gen-precache.mjs`) — ale styles.css a main.js už v manifestu jsou, takže verze se změní obsahově; to je OK.

## Scope OUT
- **NEMĚŇ `src/core/**` ani `src/data/**`.** Pokud se ukáže, že oprava vyžaduje dotek core → ZASTAV, nastav status blocked a eskaluj (G1 gate). Nehádej.
- Neřeš Vlnu 2 (nábor #3, dovednosti #4, import/export #5/#6, MINOR #7/#8/#9) — to je samostatný task T-004.
- Neměň herní logiku, balanc, čísla.

## Task List (zkopíruj do svého dílčího checklistu)
- [ ] T-001a: #2 render-on-send v `send()` (main.js) — respektovat render-throttle
- [ ] T-001b: #1 CSS pro story overlay/dialog/tlačítka (fixed, backdrop, z-index, centrování, ve viewportu 320–1280)
- [ ] T-001c: #1c modalita (blok pozadí) — CSS-first, JS jen pokud nutné
- [ ] T-001d: #10 dostylovat `.offline-summary` + `.catchup-progress`
- [ ] T-001e: validace (CI + smoke + golden-hash + regenerace precache) a technický záznam změn

## Inputs (soubory / reference)
- `.aiworkflow/agents/tester/artifacts/final/e2e-rum-report_post-iter-021.md`
- `src/app/main.js` (send ~277, requestRender ~338/365), `src/app/loop.js` (~52 onDirty), `src/ui/render.js` (throttle)
- `src/ui/styles.css`, `src/ui/screens.js` (GamelogScreen ~58-78, ř. dle reportu)
- `tools/smoke.mjs`, `.aiworkflow/agents/tester/scratch/e2e-rum.mjs` (pro lokální ověření)

## Acceptance Criteria
- Při pauze i při story-freeze: klik na akci (daně ±, koupit) se OKAMŽITĚ projeví v UI (ne až po resume). Ověřeno harnessem/smoke.
- Story dialog je viditelný modál s backdropem, ve viewportu na 320/360/390 i desktopu, s funkčním tlačítkem; nezůstává pod okrajem stránky.
- `.offline-summary` a `.catchup-progress` mají kontejner (ne holý text).
- `npm run ci` = 1566/1566 pass; `npm run smoke` = OK (0 console errorů, 0 overflow).
- **Golden-hash beze změny** (core/data netknuto) — dolož `git diff --stat src/core src/data` = prázdné.
- Render-throttle nerozbitý (žádné render-bouře; ověř že smoke render-count check drží pokud existuje).

## Expected Outputs (cesty k souborům)
- Změny v `src/app/main.js`, `src/ui/styles.css` (+ příp. `src/ui/screens.js`), regenerovaný `src/precache.js`.
- Technický záznam změn: `.aiworkflow/agents/coder/artifacts/final/wave1_iter-022.md` (co změněno, proč, jak ověřeno).
- Handoff: `bash .aiworkflow/agents/coder/scripts/handoff-out.sh T-001 "<zpráva>"`

## Risks / Constraints
- Model: silnější (Opus/Sonnet) — render/loop closure je choulostivá.
- #2 hlavní riziko: dvojitý render / obcházení throttle / stale closure na `requestRender`. Řeš čistě.
- Nefabuluj „ověřeno" — reálně spusť CI, smoke a (pokud jde) harness. Co nejde spustit, označ.
- Pracuješ jen ve svém scope; cizí změny v repu ignoruj.
