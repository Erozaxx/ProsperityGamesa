# Current Task
- **Task ID**: T-004 (iter-022 — Vlna 2 UX/wiring oprav z QA reportu post-iter-021, nálezy #3–#9)
- **Iteration**: iter-022
- **Status**: done
- **Done**: 2026-07-02
- **Gate**: `npm run ci` = 1566/1566 pass (0 fail), vč. m9a-regression golden-hash G1 testů (zeleně).
  `npm run smoke` = SMOKE OK (0 console errorů, 0 horizontal overflow @320/360/390 napříč 12 taby).
  `git diff --stat src/core src/data` = PRÁZDNÉ (core/data netknuto). Precache regenerován
  (`node tools/gen-precache.mjs` → `prosperity-246f14014116`).

## Dílčí checklist
- [x] T-004a: #3 nábor UI (volá recruitUnit) — sekce "Nábor jednotek" v BattleScreen
- [x] T-004b: #4 dovednosti UI katalog (Spustit → startSkill; BEZ seedu do stavu)
- [x] T-004c: #6 import → autosave.flush() (immediate, throttle-bypass)
- [x] T-004d: #5 export potvrzení + fallback (bez clipboardu)
- [x] T-004e: #8 chybová hláška u neplatného importu
- [x] T-004f: #7 stale-closure daní — ověřeno beze změny (Vlna 1 fix drží)
- [x] T-004g: #9 `.stats` gap
- [x] T-004h: validace (CI + smoke + golden-hash + precache) + technický záznam

## Poznámka k validaci e2e-rum harness (volitelné)
Harness (`.aiworkflow/agents/tester/scratch/e2e-rum.mjs`) F9 hlásí "MINOR IMPORT-NO-ERROR-FEEDBACK"
i po opravě — je to STARÝ, natvrdo zapsaný nález v harness skriptu (řádek 660-661: `else` větev
v F9 vždy loguje tento finding, aniž by reálně kontrolovala DOM na chybovou hlášku). Harness je
mimo můj scope (patří testerovi). Ověřil jsem chování ad-hoc Playwright skriptem přímo proti
běžící appce (smazán po použití, nebyl commitnut):
- #8: `.banner-import-error` se renderuje s textem "Neplatný importní řetězec — import se
  nezdařil." po importu `THIS-IS-NOT-A-SAVE`.
- #5: `.banner-export-feedback` (potvrzení) po úspěšném zápisu do schránky;
  `.banner-export-fallback` + `.export-fallback-text` (textarea) když context nemá clipboard
  oprávnění.
- #6: import na kroku 43 → `autosave.flush()` → reload → krok 83 (perzistováno + offline
  catch-up od doby uložení; PŮVODNÍ bug resetoval na krok 1).
- #4: 2 katalogové položky (Woodworking, Scholarship) v "Dostupné dovednosti"; klik "Spustit" →
  1 položka se objeví jako `progressing` v existujícím seznamu, katalogová položka zmizí
  z dostupných (žádný seed, jen dispatch `startSkill`).
- #9: `getComputedStyle('.stats').gap` = `12px` (dřív 0 / žádné pravidlo).
- #3: recruit tlačítko v Bitva tabu čte živé `player.gold` (830) vs. cenu warriora (1080) →
  správně `disabled` s title "Nedostatek zlata" — potvrzuje reálné napojení na stav (ne mock).
  Skutečný úspěšný nábor nebyl v této konkrétní čerstvé session odzkoušen (start. zlato < cena
  jednotky, balanční fakt mimo scope); command `recruitUnit` samotný je pokryt core testy v CI.
