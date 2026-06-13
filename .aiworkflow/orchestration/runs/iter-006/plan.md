# Iteration Plan: iter-006

- **Created**: 2026-06-13
- **Goal**: M1 – Katalogy & balanc data: kompletní, validovaná, verzovaná data v src/data/ + balance/formulas vrstva; extrakční pipeline z doc/original_source + explicitní gap report a eskalace děr. Dle master plánu §3/iter-006 (T1–T6). Plus fix BUG-001 (assertSerializable WeakSet).
- **Status**: active

## Master Checklist
- [x] T-001: architect – Detailní návrh (Opus) tasků iter-006: T1 extrakční pipeline tools/extract/ (čte rootscope-raw-dump.json + config-extract.json + source map → JSON katalogy, commitnuté), T2 katalogová schémata per typ + runtime validátor + string-ID registr fail-fast + byId index + validace cost/products map (B4), T3 balance.js + formulas.js (čisté vzorce: marketPrice, workerEfficiency, techCap 100×1.25^level, scaleCost, spoilage, natalita), T4 tabulkové testy vzorců proti referenčním hodnotám z original_source_doc.md + vědomé odchylky, T5 registr efektů kostra (K14), T6 gap report + eskalační dokument. Plus BUG-001 fix. Model: Opus.
- [x] T-002: coder – Implementace (Sonnet) dle návrhu; tsc/test/grep zelené; katalogy vygenerované a commitnuté. Model: Sonnet.
- [x] T-003: tester – Test loop (Sonnet): schema validace všech katalogů, tabulkové testy vzorců, fail-fast na rozbitém katalogu, PWA smoke. Model: Sonnet.
- [ ] T-004: reviewer – Review gate (Opus, právo re-run): úplnost extrakce vs. gap report, referenční čísla, provenance flagy. Model: Opus.

## Quality Gates
- [ ] Plan neobsahuje orchestratora jako agenta u žádného tasku
- [x] Implementace prošla test loop (schema validace + tabulkové testy)
- [x] Gap report existuje s eskalací (provenance flagy)
- [ ] Review gate GO (= DoD M1)

## Exit Criteria
- Katalogy kompletní/validované nebo díry explicitně v gap reportu; referenční čísla potvrzena testem; balance/formulas základ; reviewer GO. Re-planning checkpoint M2+ následuje.
