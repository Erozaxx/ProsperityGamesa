# Brief

- **Brief ID**: BRIEF-ADV-002
- **Iteration**: post-iter-021 (mezi-iterační advisory; žádná aktivní iterace)
- **From**: Orchestrator
- **To**: tester
- **Date**: 2026-07-02

## Goal
Prohnat hru reálnými e2e user-flow průchody v prohlížeči (Playwright/Chromium) a zachytit RUM-style runtime chyby (console errory, uncaught exceptions, failed requests, layout overflow, zamrznutí/pády) na desktop i mobilním viewportu. Najít, REPRODUKOVAT a sepsat konkrétní bugy s kroky reprodukce a závažností. Uživatel hru hrál a hlásí „spoustu chyb" — cíl je je najít.

## Context
- Hra = zero-build offline PWA (Preact/htm, no bundler), deterministické jádro `src/core/`, data `src/data/`, save přes IndexedDB, service worker + versioned precache.
- Release kandidát M0–M9 (iter-021). Deklarováno: CI 1566/1566, smoke OK, ale to je **existující** smoke (jen boot + 0 console errorů @390px). Tohle NESTAČÍ — uživatel hlásí chyby z reálného hraní, které unit testy ani boot-smoke nechytí.
- Živá verze: `https://erozaxx.github.io/ProsperityGamesa/` (HTTP 200, nasazená precache == HEAD `prosperity-4830cd1e8c19` — ověřeno orchestrátorem). Lokální HEAD == živá verze.
- **Uživatel neposkytl konkrétní symptomy** (dialog selhal) → udělej ŠIROKÝ pass přes všechny kategorie: UI/layout, herní logika/čísla, pády/console errory, save/load/offline.

## Scope IN
- **Postav e2e/RUM harness** (Playwright, Node) — vzor převezmi z `tools/smoke.mjs` (lokální static server přes `createServer` + `chromium.launch()`; browser se najde přes `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`, žádný `playwright install`). Harness ulož do `.aiworkflow/agents/tester/scratch/` nebo `tools/` (pokud do `tools/`, musí být mimo runtime precache — nezasahovat do `gen-precache`).
- **RUM zachytávání** během všech průchodů: `page.on('console')` (error/warning), `page.on('pageerror')` (uncaught exceptions), `page.on('requestfailed')`, kontrola horizontálního overflow, detekce zamrznutí (timeout na interakci), prázdný/nevykreslený panel.
- **e2e user-flows (reálné hraní, ne jen boot):** nová hra → základní ekonomická smyčka (výdělek → nákup → pasivní příjem) → přepínání všech tabů/panelů → nákup/prodej/kontrakty/nábor → idle/offline progres (manipulace času pokud jde) → save → reload → ověření obnovy → export/import round-trip. Klikat reálně na tlačítka, ne jen assertovat DOM.
- **Viewporty:** desktop (1280×800) + mobil (390×844, 360, 320) + touch. Reprodukovat na obou.
- **Reprodukce:** každý nález = konkrétní kroky (viewport, sekvence akcí), pozorované vs. očekávané chování, závažnost (BLOCKER/MAJOR/MINOR), a pokud jde, ukazatel na soubor/řádek v `src/` kde je pravděpodobná příčina.
- Testuj proti lokálnímu HEAD (spolehlivější, == živá verze). Volitelně cross-check proti živé URL.

## Scope OUT
- **NEOPRAVUJ bugy** — jen najdi, reprodukuj, sepiš. Opravy jsou samostatný coder task (rozhodne orchestrátor/uživatel).
- Neměň herní kód v `src/` ani data. Harness v `scratch/`/`tools/` je OK (ale ne úprava logiky hry).
- Neřeš balanc/kalibraci gapů z KNOWN_ISSUES (to je koš B jiné iterace) — pokud narazíš na balanční divnost, zapiš ji jako nález, ale nehodnoť „správné" číslo.

## Task List (zkopíruj do svého dílčího checklistu)
- [ ] T-ADV-002a: Postav e2e/RUM Playwright harness (vzor z tools/smoke.mjs), ověř že bootuje hru
- [ ] T-ADV-002b: Projeď e2e user-flows na desktop + mobil, zachytávej RUM telemetrii
- [ ] T-ADV-002c: Reprodukuj a kategorizuj nálezy (BLOCKER/MAJOR/MINOR, kroky, očekávané vs. pozorované)
- [ ] T-ADV-002d: Sepiš bug report + doporučení dalšího kroku (co opravit první), zapiš artefakt

## Inputs (soubory / reference)
- `tools/smoke.mjs` (vzor pro Playwright launch + static server)
- `index.html`, `src/app/`, `src/ui/` (boot + UI), `src/core/` (logika — jen čtení pro root-cause), `src/save/` (save/load)
- `KNOWN_ISSUES.md` (co je už známé — odliš nové nálezy od known gapů)
- `.aiworkflow/agents/architect/artifacts/final/review_post-iter-021_next-step.md` (kontext stavu, N3 = SVG apple-touch-icon je známý)
- Živá URL: `https://erozaxx.github.io/ProsperityGamesa/`

## Acceptance Criteria
- Existuje spustitelný e2e/RUM harness a je zdokumentováno jak ho spustit.
- Bug report obsahuje ≥ konkrétní reprodukovatelné nálezy (nebo explicitní „0 nalezeno" s důkazem pokrytí, pokud hra běží čistě) — každý s kroky, závažností, viewportem, očekávané vs. pozorované.
- Nálezy jsou odlišeny od už známých gapů (KNOWN_ISSUES) a od balančních otázek.
- RUM telemetrie (console/pageerror/requestfailed počty) je shrnutá per flow.
- Doporučení: co opravit první (prioritizace podle závažnosti/četnosti).
- Žádná změna herního kódu v `src/`.

## Expected Outputs (cesty k souborům)
- `.aiworkflow/agents/tester/artifacts/final/e2e-rum-report_post-iter-021.md`
- (harness) `.aiworkflow/agents/tester/scratch/e2e-rum.mjs` nebo `tools/e2e-rum.mjs`

## Risks / Constraints
- Model: Fable (rychlejší) — drž se testování + reportu, žádné rozsáhlé refaktoringy.
- Chromium: použij předinstalovaný (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`), NIKDY nespouštěj `playwright install`. Pokud default launch selže, zkus `executablePath: '/opt/pw-browsers/chromium'`.
- Determinismus: pokud manipuluješ herním časem/RNG kvůli idle testu, dělej to přes veřejné API hry, ne hackem do stavu.
- Nefabuluj nálezy — každý bug musí být skutečně reprodukovaný v harnessu, ne domněnka. Když něco nejde reprodukovat, označ jako „neověřeno".
- Pracuješ read-only vůči hernímu kódu; jiné změny v repu ignoruj.
