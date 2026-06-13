# Brief
- **Brief ID**: BRIEF-019
- **Iteration**: iter-006 (M1)
- **To**: architect (Opus – detailní návrh)
## Goal
Detailní implementační spec (pro Sonnet) pro všechny tasky iter-006 (M1): extrakční pipeline, katalogová schémata + validace, balance/formulas, tabulkové testy, registr efektů kostra, gap report. + fix BUG-001.
## Context
- M0 hotovo (engine core + PWA + save). Teď M1 = data vrstva: data-driven katalogy v src/data/, balance konstanty, čisté vzorce.
- Zdroje k extrakci: doc/original_source/extracted/rootscope-raw-dump.json (22KB), doc/original_source/extracted/config-extract.json, doc/original_source/modules/, doc/original_source/application-config.js. Reference čísel/mechanik: doc/original_source_doc.md (source map §10 dle architektury).
- Q3 rozhodnuto (DR-001): gap eskalace AUTONOMNÍ – chybějící data → provenance:'approximated', pokračuje se; uživatel jen informován.
## Scope IN (navrhni všechny)
- T1 extrakční pipeline tools/extract/: Node skripty čtou rootscope dump + config-extract + source map → generují verzované JSON katalogy do src/data/ (per typ). Skripty i výstupy commitnuté (reprodukovatelnost, prostředí bez storage).
- T2 katalogová schémata per typ (K15) + runtime validátor při loadu (fail-fast §5.2) + string-ID registr s kolizemi (K10) + byId index + validace cost/products map proti registru zdrojů (B4).
- T3 balance.js (pojmenované konstanty s jednotkami + odkaz na zdroj) + formulas.js (čisté vzorce: marketPrice kubika, workerEfficiency, techCap 100×1.25^level, scaleCost, spoilage, natalita) – první dávka §5.5.
- T4 tabulkové testy vzorců s referenčními hodnotami z original_source_doc.md (houseTypes, companies, tech, upkeep) + vědomé odchylky zapečené do dat s poznámkou (Skills 2×, market perioda, home.js:970).
- T5 registr efektů obsahu kostra (K14, §5.4): onBuild/onUnlock/event options[].fn jako string-ID s parametry v datech, typovaný modul per doména.
- T6 gap report (DoD M1): co není doložitelné z dumpu/zdroje (zejm. listTechs/listZone) + provenance:'approximated' flagy; eskalační dokument (autonomní dle Q3).
- BUG-001 fix: assertSerializable WeakSet ochrana proti stack overflow na cyklu (src/core/registry/registry.js).
## Inputs (POVINNÉ)
- Architektura: architecture_proposal_iter-002_T-001.md (§5 datový model/katalogy, §5.2 validace, §5.5 balanc, §5.6 fail-fast, §9.3 R3/gap)
- Zdrojová data: doc/original_source/* a doc/original_source_doc.md
- Engine core API: src/core/* (state, registry); agents/architect/AGENTS.md
## Acceptance Criteria
- Spec pokrývá T1–T6 + BUG-001: cesty, signatury, schéma katalogů (které typy: jobs/buildings/houses/resources/techs/companies/goods…), extrakční mapování (které pole z dumpu → který katalog), formulas signatury + referenční čísla pro testy, gap report formát.
- Definuje, co je v MVP scope dat (M2–M4 potřebuje: zdroje, joby, budovy, jídlo, populace, trh/goods) vs. co lze approximovat (techs/zones pro pozdní milníky).
## Expected Outputs
- agents/architect/artifacts/final/design_iter-006_T-001.md
## Constraints
- Zero-build: katalogy jsou statické JSON/JS moduly importované enginem. Core bez DOM. Extrakční skripty běží v Node (tools/), výstup commitnutý.
