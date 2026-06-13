# Brief
- **Brief ID**: BRIEF-020
- **Iteration**: iter-006 (M1)
- **To**: coder (Sonnet)
## Goal
Implementuj celou iter-006 (M1) PŘESNĚ dle návrhu: extrakční pipeline, katalogy v src/data/, schémata+validace, balance/formulas, tabulkové testy s REÁLNÝMI referenčními čísly, registr efektů kostra, gap report. + BUG-001 fix. `npm run ci` zelené.
## Scope IN (dle design_iter-006_T-001.md – závazný)
- T1 tools/extract/ pipeline (čte doc/original_source/* → generuje JSON katalogy do src/data/, skripty i výstupy commitnuté).
- T2 katalogová schémata per typ + runtime validátor fail-fast + string-ID registr + byId index + cost/products validace.
- T3 src/core/balance/balance.js + formulas.js (čisté vzorce dle návrhu, s odkazem na zdroj).
- T4 tabulkové testy vzorců s referenčními čísly Z NÁVRHU (techCap 0→100/1→125/2→156/4→244/10→931, marketPrice (100,0,100)→337.5 / (100,50,100)→100 / (100,100,100)→12.5, workerEfficiency clamp [0.25,2], spoilage, natality matRate 0.04/retRate 0.02, archer upkeep 162, konstanty TAXCENTERBASE 22 atd.) + vědomé odchylky (spoilage.cheese 0.08 vs 0.10).
- T5 registr efektů kostra (string-ID fn per doména).
- T6 gap report (docs/ nebo src/data/) s provenance flagy (extracted/derived/approximated); autonomní eskalace dle Q3 (žádný user blocker).
- BUG-001 fix: assertSerializable WeakSet ochrana v src/core/registry/registry.js + regresní testy.
## Inputs
- ZÁVAZNÝ návrh: agents/architect/artifacts/final/design_iter-006_T-001.md
- Zdroje: doc/original_source/* ; engine core src/core/* ; agents/coder/AGENTS.md
## Acceptance Criteria
- `npm run ci` zelené (tsc, grep gate core OK, node --test vč. tabulkových testů a BUG-001 regresí).
- Katalogy vygenerované a commitnuté; schema validace prochází; gap report existuje s provenance.
- Core stále bez DOM (grep gate); balance čísla mají odkaz na zdroj.
## Expected Outputs
- Kód v tools/extract/, src/data/, src/core/balance/, src/core/catalog/; gap report; testy.
- Impl note: agents/coder/artifacts/final/impl_iter-006_T-002.md (co hotovo, tsc/test/grep, počty katalogů/položek, gap shrnutí).
