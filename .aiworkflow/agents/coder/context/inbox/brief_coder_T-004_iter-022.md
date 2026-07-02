# Brief

- **Brief ID**: BRIEF-022-04
- **Iteration**: iter-022
- **From**: Orchestrator
- **To**: coder
- **Date**: 2026-07-02

## Goal
Vlna 2 oprav z QA reportu T-ADV-002: zpřístupnit dark-features (#3 nábor jednotek, #4 dovednosti) a zabezpečit data (#6 import se neuloží, #5 tichý export) + MINOR leštění (#7 stale-closure daní, #8 tichý neúspěch importu, #9 HUD gap). **Bez doteku `src/core/` a `src/data/`** — golden-hash G1 bit-identický.

## Context
- QA report: `.aiworkflow/agents/tester/artifacts/final/e2e-rum-report_post-iter-021.md` (nálezy #3–#9). PŘEČTI.
- Vlna 1 (hotovo, commit 0e320e6): `send()` už vrací `result` a volá `requestRender()` při `result.ok`. Stav při psaní importu tedy překreslí sám; ověř aktuální podobu `send`/handlerů v `main.js`.
- **USER ROZHODNUTÍ (#4 dovednosti):** implementovat JEN jako UI katalog dostupných dovedností → tlačítko „Spustit" volá existující command `startSkill`. **NEseeduj dovednosti do `state.home.skills`** (to by byl dotek core/data → zakázáno). Katalog dostupných je odvozený v UI/selektoru bez zápisu do hashState.

## Scope IN
- **#3 nábor UI:** přidej ovládací prvek (tlačítko/sekci) v příslušném tabu, který volá command `recruitUnit` (registrovaný v jádře, wired `src/app/main.js:139`). Čistě UI — command existuje, jen ho vystav. Zjisti z `recruitUnit` command signaturu (params: typ jednotky, počet?) a nabídni odpovídající UI.
- **#4 dovednosti UI katalog:** `SkillsScreen` (`src/ui/screens.js:574`) nyní renderuje jen existující `state.home.skills`. Přidej seznam DOSTUPNÝCH dovedností (odvozený v UI — z konstant/katalogu, který smíš číst, ne zapisovat do stavu) s tlačítkem „Spustit" → `send('startSkill', {...})`. Zdroj katalogu: najdi, odkud `startSkill` bere validní IDs (pravděpodobně `src/core/` konstanta — tu smíš ČÍST a zobrazit, ne měnit). Pokud katalog dostupných neexistuje jako čtitelná data → ZASTAV a eskaluj (nevymýšlej dovednosti).
- **#6 import→save:** `onImport` (`src/app/main.js:310`) po úspěšném importu zavolej `autosave.requestSave()` (najdi přesné API autosave v `src/app/autosave.js`), aby reload import nezahodil. Ověř konzistenci `lastSimTimestamp`.
- **#5 export feedback/fallback:** `onExport` (`src/app/main.js:289`) — přidej viditelné potvrzení (toast/hláška) a fallback, když `navigator.clipboard` chybí nebo selže (např. zobraz textareu s řetězcem k ručnímu zkopírování, nebo download). Nespolkni chybu tiše.
- **#8 neplatný import:** v `catch` (`main.js:317`) zobraz chybovou hlášku uživateli (ne `/* silent */`).
- **#7 stale-closure daní:** `onClick` u daní (`src/ui/screens.js:242`) posílá `rate` z posledního renderu → rychlé kliky ztrácejí kroky. Oprav tak, aby každý klik vycházel z živého stavu (čti aktuální `finance.taxRate` v handleru) nebo lokálním counterem. Totéž pro „−".
- **#9 HUD gap:** `.stats` v `styles.css` — přidej gap/mezery mezi statistikami.
- Po změnách regeneruj precache: `node tools/gen-precache.mjs`.

## Scope OUT
- **NEMĚŇ `src/core/**` ani `src/data/**`.** Dotek core = STOP + eskalace (G1 gate). Zvlášť: neseeduj dovednosti/jednotky do stavu, neměň balanc.
- Neřeš už opravené #1/#2/#10 (Vlna 1).

## Task List (dílčí checklist)
- [ ] T-004a: #3 nábor UI (volá recruitUnit)
- [ ] T-004b: #4 dovednosti UI katalog (Spustit → startSkill; BEZ seedu do stavu)
- [ ] T-004c: #6 import → autosave.requestSave()
- [ ] T-004d: #5 export potvrzení + fallback (bez clipboardu)
- [ ] T-004e: #8 chybová hláška u neplatného importu
- [ ] T-004f: #7 stale-closure daní (živý stav)
- [ ] T-004g: #9 `.stats` gap
- [ ] T-004h: validace (CI + smoke + golden-hash + precache) + technický záznam

## Inputs
- `.aiworkflow/agents/tester/artifacts/final/e2e-rum-report_post-iter-021.md`
- `src/app/main.js` (onImport ~310, onExport ~289, ~139 recruit wiring), `src/app/autosave.js`
- `src/ui/screens.js` (SkillsScreen ~574, tax onClick ~242), `src/ui/selectors.js` (~80 skills), `src/ui/styles.css`
- `src/core/commands/recruitUnit.js`, `src/core/commands/startSkill*.js` (ČTENÍ signatury/katalogu — NEMĚNIT)

## Acceptance Criteria
- Nábor jde spustit z UI (klik → `recruitUnit` proběhne, jednotka přibude).
- Dovednosti: UI nabízí dostupné dovednosti a „Spustit" reálně spustí dovednost (`startSkill`); žádný zápis seedu do `state`.
- Import: po importu + reload data PŘEŽIJÍ (autosave zavolán).
- Export: bez clipboardu se zobrazí fallback (textarea/download) + potvrzení.
- Neplatný import: viditelná chybová hláška.
- Rychlé kliky na daně (+×5) dojdou na rateMax (5), ne na 2.
- `.stats` staty nejsou slepené @390.
- `npm run ci` = 1566/1566; `npm run smoke` = OK; `git diff --stat src/core src/data` = PRÁZDNÉ (dolož); golden-hash beze změny.

## Expected Outputs
- Změny v `src/app/main.js`, `src/ui/screens.js`, `src/ui/styles.css` (+ příp. `src/ui/selectors.js`, `src/app/autosave.js` wiring — ověř že autosave.js není core), regen `src/precache.js`.
- Technický záznam: `.aiworkflow/agents/coder/artifacts/final/wave2_iter-022.md`.
- Handoff: `bash .aiworkflow/agents/coder/scripts/handoff-out.sh T-004 "<zpráva>"`

## Risks / Constraints
- Model: silnější (Opus/Sonnet).
- #4 hlavní past: pokušení seedovat dovednosti do stavu → ZAKÁZÁNO. Jen UI katalog + startSkill. Když katalog dostupných dovedností nejde přečíst z existujících dat, ZASTAV a eskaluj.
- `autosave.js`: ověř, že je to app vrstva (ne core) — pokud by requestSave sahalo do core determinismu, eskaluj.
- Nefabuluj validaci — reálně spusť CI/smoke. Co nejde, označ.
