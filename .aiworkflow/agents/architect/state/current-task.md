# Current Task

- **Task ID**: T-002a + T-002b (paralelní běhy)
- **Brief**: context/inbox/brief_architect_T-002a_iter-001.md (BRIEF-002a), context/inbox/brief_architect_T-002b_iter-001.md (BRIEF-002b)
- **Iteration**: iter-001
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-12
- **Completed**: 2026-06-12

## Co teď dělám
Hotovo (oba paralelní tasky):
- **T-002a**: refactoring kandidáti – výkon & runtime + save/offline + serverové
  závislosti (pohledem mobile-first PWA offline). 16 nálezů (A1–A8, B1–B5, C1–C4),
  každý s problémem, dopadem, prioritou, alternativou a odhadem rizika/úsilí;
  závěrem prioritizovaný seznam 14 položek.
  Výstup: `artifacts/final/analysis_refactoring_perf-offline_iter-001_T-002a.md`
- **T-002b**: refactoring kandidáti v rovině údržba & architektura (provázanost
  centrálních uzlů, křehkost string-callback dispatchů a load pipeline,
  oddělení UI↔logika, balanc-as-code). 13 nálezů + prioritizovaný seznam.
  Výstup: `artifacts/final/analysis_refactoring_maintainability_iter-001_T-002b.md`

## Dílčí checklist
- [x] T-001: Architektonická analýza originálu – klíčové mechaniky + jejich engine/datový model + mapa závislostí. (hotovo dříve)
- [x] T-002a: Refactoring kandidáti – výkon & runtime + save/offline + serverové závislosti.
- [x] T-002b: Refactoring kandidáti – údržba & architektura (provázanost, křehkost, UI↔logika, balanc).

## Předpoklady
- Plné JSON katalogy (listBuildings/listGoods/listTechs/listZone…) nejsou v repu –
  struktura odvozena z linkovacích funkcí config.js a extracted dumpů; konkrétní
  položky nutno dotěžit při rebuildu (zaznamenáno v kap. 15 analýzy T-001).
  Pro offline řešení (T-002a C1) postačí dotěžení + precache.
- Serverová dynamika /market není ve zdrojích klienta – klientská náhrada
  (T-002a C2) vyžaduje balanční kalibraci.
- Odhady úsilí platí pro greenfield rebuild, ne přepis originálu.
- Nálezy T-002a A5 (dvojí Skills.step) a C2 (/market) mají balanční přesah do
  balanc-as-code agendy T-002b.

## Blockery
–
