# Brief
- **Brief ID**: BRIEF-021
- **Iteration**: iter-006 (M1)
- **To**: tester (Sonnet)
## Goal
Nezávislý test loop iter-006 dle §1.3/iter-006: schema validace všech katalogů, tabulkové testy vzorců proti referenčním číslům, fail-fast na rozbitém katalogu, PWA smoke (kumulativní).
## Scope IN
- `npm run ci` zelené (tsc, grep gate, node --test).
- Schema validace VŠECH katalogů v src/data/ projde; každý katalog má validní strukturu + provenance.
- Tabulkové testy vzorců proti REÁLNÝM referenčním číslům (techCap 0→100/1→125/2→156/4→244/10→931, marketPrice 337.5/100/12.5, workerEfficiency clamp [0.25,2], spoilage trunc, natality 0.04/0.02, archer upkeep 162, konstanty). Pokud chybí, doplň.
- Fail-fast: uměle rozbitý katalog (chybějící povinné pole / kolize ID) → validátor hodí čistou výjimku (ne tichý průchod). Ověř, pak vrať zpět.
- BUG-001 regrese: cyklický objekt → čistá výjimka, ne RangeError stack overflow.
- Extrakce reprodukovatelná: spuštění tools/extract znovu dá identické katalogy (determinismus).
- PWA smoke (kumulativní sada 1.3) stále zelená.
## Inputs
- src/data/, src/core/catalog/, src/core/balance/, tools/extract/, test/; návrh design_iter-006_T-001.md; impl note; agents/tester/AGENTS.md
## Acceptance Criteria
- Verdikt PASS/FAIL s konkrétními výsledky (počet katalogů, položek, testů, hodnoty). Při FAIL přesně co.
## Expected Outputs
- agents/tester/artifacts/final/testreport_iter-006_T-003.md + případné nové testy
