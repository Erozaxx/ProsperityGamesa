# Impl Summary – iter-017 T-008a

- **Task**: T-008a — minor opravy z review gate (hygiena před close M7a-2/M7a)
- **Datum**: 2026-06-14
- **CI**: 1260 tests, 0 fail
- **Smoke**: OK
- **Determinismus**: m7a-world-t1 (34/34) + m7a2-world-t2 + m7a2-world-t3 = 82/82 pass

## Co bylo opraveno

### F-1 — zones.json favour kontrakt (§3.1.2)
**Stav při příchodu**: Již opraveno předchozím agentem. Všech 13 zón v `src/data/zones.json` má `"favour": {}` (object). Žádný výskyt `"favour": 0`. Ověřeno grepem: 13 shod `"favour": {}`, 0 shod `"favour": 0`. CI zelené, fresh-vs-load identický (migrateFavour větev 1 deep-copy `{}`).

### F-3 (N-04) — tickOrder.md doc drift
**Stav při příchodu**: Již opraveno předchozím agentem. `docs/tickOrder.md` obsahuje:
- Řádek s `world.gatherTributes` (month, order 25) v tabulce Core Periodics
- ASCII diagram aktualizovaný: `month: food.spoilage → taxes.monthly → world.gatherTributes → upkeep.military → council.closeMonth`
- Sekce "Schedule Handlers" s kompletní tabulkou: processFaction, takeOver, questExpire, startBattle stub, AIIsAttacking stub, warningAIAttacking stub, dangerAIAttacking stub, loadImportantEvent stub

### F-2 → G-AIBATTLE-DEDUP (NErefaktorovat)
**Provedeno**: Přidán gap `G-AIBATTLE-DEDUP` do `src/data/gap-report.json`.
- severity: low, milestone: M9, provenance: derived
- Popis: processAI inline battle resolve (world.js:1096-1132) duplikuje formulas.aiBattleResolve (formulas.js:380-429). formulas.aiBattleResolve volána pouze z testů; produkce používá inline kopii. Obě jsou 1:1 identické. Riziko: dvojí maintenance point při M9 kalibraci.
- Summary aktualizováno: total 36→37, M9 bucket 14→15.
- processAI NEDOTČEN (determinismus-citlivý).

## Gate výstup

| Kritérium | Výsledek |
|---|---|
| npm run ci | 1260/1260 PASS, 0 fail |
| npm run smoke | OK (0 console errors) |
| Determinismus G1 | nedotčeno |
| m7a-world-t1 (34 testů) | 34/34 PASS |
| m7a2-world-t2/t3 (48 testů) | 48/48 PASS |
| fresh-vs-load identický | ANO (migrateFavour + persistSchema) |
| battle.js NEDOTČEN | ANO |
| processAI NEDOTČEN | ANO |
| precache regen | N/A (precache.js statický, zdroje zahrnuty; regen probíhá runtime) |
