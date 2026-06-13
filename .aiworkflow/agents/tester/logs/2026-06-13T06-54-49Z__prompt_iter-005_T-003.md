# Brief
- **Brief ID**: BRIEF-017
- **Iteration**: iter-005 (M0b)
- **To**: tester (Sonnet)
## Goal
Nezávislý test loop iter-005 dle §1.3/iter-005: save round-trip, PWA smoke (headless), determinismus po loadu, benchmark sanity.
## Scope IN
- `npm run ci` zelené (tsc, grep gate, node --test).
- Save round-trip: stav → save → load → identický (deep equal); rotace generací N=3; fallback na předchozí generaci při poškození poslední; kill-safe (pointer v jedné tx).
- Determinismus po loadu: load + pokračování simulace dává stejný hash jako nepřerušená simulace (G1).
- PWA smoke headless: manifest.webmanifest validní JSON s povinnými poli; service worker parsuje a precache list odpovídá src/precache.js (žádný soubor v precache neexistuje × neexistuje); gen-precache je deterministický (2× běh = stejný výstup).
- Benchmark sanity: tools/bench-step.mjs běží, produkuje čísla, ns/krok < práh 10000.
- Doplň chybějící edge testy; negativně ověř fallback (poškozená generace).
## Inputs
- src/, test/, tools/, docs/benchmark_iter-005.md; návrh design_iter-005_T-001.md; impl note; agents/tester/AGENTS.md
## Acceptance Criteria
- Verdikt PASS/FAIL s konkrétními výsledky. Při FAIL přesně co a proč.
## Expected Outputs
- agents/tester/artifacts/final/testreport_iter-005_T-003.md + případné nové testy
