# Brief

- **Brief ID**: BRIEF-017-008a
- **Iteration**: iter-017 (M7a-2)
- **Task**: T-008a = oprava minor z review gate (hygiena před close)
- **From**: Orchestrator
- **To**: coder (Sonnet)
- **Date**: 2026-06-15

## Goal
Drobné opravy minor nálezů z review gate T-008 (GO bez podmínek). Malé, lokalizované, hygiena před uzavřením M7a-2/M7a. Detaily: `agents/coder/context/refs/review_iter-017_T-008.md`.

## Scope IN
1. **F-1 — zones.json favour kontrakt**: `src/data/zones.json` má stále `"favour": 0` (number) u zón — 3. místo kontraktu §3.1.2 (favour má být objekt `{}`). Funkčně neškodné (`migrateFavour` to absorbuje), ale dokonči kontrakt: změň `"favour": 0` → `"favour": {}` u všech zón (13). Ověř, že `migrateFavour`/persist to zvládne (CI zelené, fresh-vs-load identický).
2. **F-3 (N-04) — tickOrder doc**: `docs/tickOrder.md` neobsahuje `world.gatherTributes` (month edge, order 25) ani nové schedule handlery (`world.processFaction`/`takeOver`/`questExpire` + M7b stub `startBattle`). Doplň do tabulky/diagramu, ať doc odpovídá kódu (registerCorePeriodics + registerWorldEffects).
3. **F-2 → gap (NErefaktorovat)**: `aiBattleResolve` (formulas.js) je volána jen z testů; produkční `processAI` má inline kopii (world.js ~1096-1132). **NErefaktoruj** (determinismus-citlivý processAI) — jen zapiš gap **G-AIBATTLE-DEDUP** do `src/data/gap-report.json` (severity low, milestone M9, provenance derived): "processAI inline battle resolve duplikuje formulas.aiBattleResolve; sjednotit v M9 cleanup".

Nit (1) dle uvážení jen pokud triviální.

## Scope OUT
- Žádná změna chování (jen data/doc/gap-report). NErefaktoruj processAI/determinismus logiku (F-2 je jen gap).
- battle.js NEDOTČEN.

## Gate (Definition of Done)
- `npm run ci` ZELENÉ (0 fail) — uveď počet testů. (zones.json favour {} nesmí nic rozbít — ověř fresh-vs-load + m7a-world-t1 + m7a2 testy.)
- `npm run smoke` OK.
- **Determinismus G1** + **M7a (m7a-world-t1, m7a2-world-t2/t3)** nedotčené.
- Precache regen jen při změně zdroje ovlivňujícího manifest (zones.json + gap-report.json jsou v precache → pravděpodobně regen; ověř).

## Inputs
- Review: `agents/coder/context/refs/review_iter-017_T-008.md` (F-1/F-2/F-3)
- Kód: `src/data/zones.json` (favour), `docs/tickOrder.md`, `src/data/gap-report.json`, `src/core/systems/world.js` (migrateFavour, gatherTributes — kontext)

## Workflow po dokončení (POVINNÉ — všechny 3)
- `agents/coder/state/current-task.md` → **Task ID: T-008a (iter-017)**, status: done
- `agents/coder/artifacts/final/impl_summary_iter-017_T-008a.md` (co opraveno, gate výstup)
- `bash agents/coder/scripts/handoff-out.sh T-008a "<stručně + gate výsledek>"`
- NEcommituj (git).
