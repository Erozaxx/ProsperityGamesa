# Brief
- **Brief ID**: BRIEF-030
- **Iteration**: iter-008 (M2b)
- **To**: tester (Sonnet)
## Goal
Nezávislý test loop M2b dle §1.3/iter-008 + vyřešit benchmark regresi. Doveď `npm run ci` do ZELENÉ.
## Scope IN
- e2e catch-up scénáře: krátký výpadek, nad cap (cap se uplatní), event uprostřed dávky (přerušení/resume).
- **Determinismus catch-upu G1**: stejný save + stejný čas → stejný výsledek; chunked dávka == single-batch == live N kroků (identický hash).
- Export/import round-trip (export→import = identický stav přes loadAndReconstruct).
- Save přes allowlist (ne celý stav); autosave triggery (throttle, hide-bypass).
- PWA smoke kumulativní.
- **BENCHMARK REGRESE (nález coder T-002)**: cena kroku narostla ~73→~8000 ns po M2a; bench sanity test (práh 10000 ns) je FLAKY. Prošetři příčinu (pravděpodobně devInvariants/assertSerializable běží v DEV každý krok). Oprav bench tak, aby měřil REPREZENTATIVNÍ produkční cestu (DEV off) a test nebyl flaky (měř DEV-off cenu; pokud DEV-on, uveď oboje a práh nastav na realisticky stabilní hodnotu s rezervou). Ověř, že catch-up 8h reálně < strop. Toto je test/bench soubor – smíš upravit.
- Doplň chybějící edge testy.
## Inputs
- src/core/engine/catchup.js, src/save/*, src/app/*, tools/bench-step.mjs, test/; návrh design_iter-008_T-001.md; impl note; agents/tester/AGENTS.md
## Acceptance Criteria
- `npm run ci` ZELENÉ. Verdikt PASS/FAIL s konkrétními výsledky (catch-up shody, bench DEV-off ns/krok). Při FAIL bug (mimo bench) → neopravuj produkční kód, nahlas.
## Expected Outputs
- agents/tester/artifacts/final/testreport_iter-008_T-003.md + testy/bench úpravy
