# Current Task

- **Task ID**: T-001 (iter-006)
- **Brief**: context/inbox/brief_architect_T-001_iter-006.md (BRIEF-019)
- **Iteration**: iter-006 (M1 – katalogy & balanc data)
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Co teď dělám
Hotovo – detailní implementační návrh (spec pro Sonnet codera) pro všech 6 tasků iter-006
(M1) + fix BUG-001. NE implementace – soubory, signatury (JSDoc), schémata, extrakční
mapování, referenční čísla, jak to ověří test. Výstup: `artifacts/final/design_iter-006_T-001.md`.

Pokrytí:
- T1: tools/extract/ Node pipeline – per-katalog extraktory, _meta+provenance, idempotentní
  výstup do src/data/. Reálné mapování dump/zdroj → katalog (food, houseTypes, companies,
  achievements, military, population doložitelné; jobs/buildings/goods/resources derived;
  techs/zones/skills/sectors approximated).
- T2: src/core/catalog/ schemas.js + validate.js (fail-fast s cestou) + loader.js
  (string-ID registr, kolize ID, byId index, cross-ref cost/products proti registru zdrojů B4).
- T3: balance.js (pojmenované konstanty + zdroj) + formulas.js (marketPrice, techCap,
  scholarLevelCap, scaleCost, workerEfficiency, spoilage, natality, goldValue).
- T4: formulas.test.js tabulkové testy s REÁLNÝMI referenčními čísly (techCap 100/125/156/244,
  marketPrice, scaleCost, workerEfficiency clamp 0.25-2, spoilage trunc, natality).
- T5: src/core/registry/effects.js kostra (string-ID efekty, idempotentní registrace, no-op MVP).
- T6: gap-report.json + doc/gap-report-iter-006.md – DR-001 autonomní eskalace, MVP-blokující
  díry (listBuildings/Goods/Job chybí v repu), provenance flagy.
- BUG-001: assertSerializable WeakSet ochrana proti stack overflow na cyklu.

## Dílčí checklist
- [x] T-001: Detailní návrh všech 6 tasků iter-006 (M1) + BUG-001.

### Pracovní rozpad (interní)
- [x] Přečteno: AGENTS.md, brief BRIEF-019, architektura §5/§5.2/§5.5/§5.6/§9.3/§11/§12
- [x] Prozkoumána REÁLNÁ data: rootscope-raw-dump.json (itemList/techTree/world PRÁZDNÉ!),
      config-extract.json, listfood.js, config.js (scaleCost, world.home defaults, techBase),
      home.js (workerEfficiency, spoilage, nat), market.js (marketPrice vzorec)
- [x] Klíčové zjištění: 16 list-JSONů se fetchovalo za běhu, v repu jen listfood.js → hlavní gap
- [x] src/core/state (createInitialState, types.d.ts) + registry.js (BUG-001 příčina)
- [x] Spec T1-T6 + BUG-001 fix (soubory, signatury JSDoc, schémata, mapování, referenční čísla, testy)
- [x] Výstup do artifacts/final + handoff

## Předpoklady
- Žádné nové architektonické rozhodnutí; gap eskalace AUTONOMNÍ (DR-001/Q3).
- MVP katalogy (jobs/buildings/goods) se rekonstruují ze zdrojového kódu (derived), ne z dumpu
  → vyšší riziko nepřesnosti produkčních čísel, vědomě označeno provenance, kalibrace M9.
- Implementaci provede Sonnet (coder).

## Blockery
–
