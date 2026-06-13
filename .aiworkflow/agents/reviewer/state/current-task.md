# Current Task

- **Task ID**: T-002 (Review architektury Playability hardening, iter-012)
- **Brief**: BRIEF-012-002
- **Iteration**: iter-012
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Co teď dělám
Hotovo: Review architektonického návrhu `architecture_playability_iter-012_T-001.md`.
Ověřeno proti reálnému kódu + empirické node probe skripty (resolver, start seed, crime,
populace, market UI/styles.css, save/persist, accounting test).
Výstup: agents/reviewer/artifacts/final/review_architecture_iter-012_T-002.md

## Výsledek
Verdikt: **GO S PODMÍNKAMI**.

Klíčové zjištění: A2 (jediný deklarovaný BLOCKER) v aktuálním kódu NEEXISTUJE.
`gold`/`techPt` JSOU v `src/data/resources.json` (kind gold/techPt), `resources` JE v ID_CATALOGS,
nahrává se na bootu i v testech. Empiricky: `resourceKindOf('gold')==='gold'`,
`handlerFor('gold').get` čte `player.gold`. Premisa A2 (a navazující §7 accounting, §3 A3,
§9 diagram, playtest finding #2) je fakticky vyvrácená. „Zlato 0" z playtestu plně vysvětluje A1
(prázdný start: pop 0, gold 0).

Reálně platné a hodnotné: A1 (start seed), A4 (denní sazba + housing sanity cap), A5 (market CSS).

## Nálezy (severity)
- BLOCKER: 1 (B1 – A2 premisa nesprávná, doporučená oprava je no-op)
- MAJOR: 3 (M1 §7 accounting; M2 A3 latentní riziko; M3 re-diagnóza playtest #2)
- MINOR: 5 (DAYS_PER_YEAR=364; market 6 sloupců; migrace sanity-cap; load.js smazat 211-212;
  population.test.js:254 rename)
- NIT: 3

## Podmínky GO (před dispatchem coderovi)
Přepsat §2/§3/§7/§9 (odstranit mylný A2/accounting narrativ), re-diagnóza playtest #2,
předepsat DAYS_PER_YEAR=364, doplnit migrační cap + test rename.
Nové pořadí implementace: A1 → A4 → A3(jen test) → A5; A2 odpadá / volitelný redundantní hardening.

## Kód neměněn (scope OUT).
