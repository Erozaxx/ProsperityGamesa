# Brief

- **Brief ID**: BRIEF-002b
- **Iteration**: iter-001
- **From**: Orchestrator
- **To**: architect
- **Date**: 2026-06-12

## Goal
Na základě T-001 identifikovat refactoring kandidáty v rovině **údržba & architektura**: provázanost, křehkost, oddělení vrstev a balanc.

## Context
T-002 (celé) na Fable vypršelo idle timeoutem, proto je rozděleno na dva kratší tasky.
Tento task (T-002b) pokrývá údržbu/architekturu. Paralelní task (T-002a) řeší výkon/offline/
server. Stále jde o analýzu/doporučení, ne implementaci.

## Scope IN
- **Provázanost**: centrální uzly z mapy závislostí (`itemList`, `Player.pay/insertInventory`,
  `Engine.schedule+fns`, `Home.step`) – kde je coupling rizikový pro údržbu/rozšiřitelnost.
- **Křehkost dispatchů**: string-callback `callFn`/`fns` (~1200 ř. funkcí), re-link katalogů po
  loadu, polymorfní transakční vrstva – kde hrozí tiché chyby / obtížná typová bezpečnost.
- **UI↔logika**: přímá DOM manipulace v herní logice (jQuery v Engine/notifikacích), mísení
  prezentace a simulace, vázanost na AngularJS `$rootScope` jako globální stav.
- **Balanc-as-code**: čísla/vzorce zadrátované v kódu vs. data-driven; udržovatelnost balancu.
- Pro každý nález: problém, dopad/odůvodnění, priorita (High/Med/Low), doporučená alternativa, odhad rizika/úsilí.

## Scope OUT
- NEŘEŠ výkon/runtime, save/offline, serverové závislosti (to je T-002a).
- Neopakuj popis mechanik z T-001 (odkazuj). Žádná implementace.

## Task List (zkopíruj do svého dílčího checklistu)
- [ ] T-002b: Refactoring kandidáti – údržba & architektura (provázanost, křehkost, UI↔logika, balanc).

## Inputs (soubory / reference)
- `agents/architect/artifacts/final/analysis_keymechanics_iter-001_T-001.md` (začni tady; hlavně mapa závislostí a vzory).
- `doc/original_source/modules/prosperity/` (services + directives + config.js fns) pro ověření.
- `.aiworkflow/zadani_projektu.md` – cílový kontext.

## Acceptance Criteria
- Pokryty roviny: provázanost, křehkost dispatchů, UI↔logika oddělení, balanc-as-code.
- Každý nález má: problém, dopad, prioritu, alternativu, odhad rizika/úsilí.
- Prioritizovaný seznam nálezů tohoto domeny na závěr.
- Strukturovaný markdown, odkazy na T-001 a zdroj (ne duplikace).

## Expected Outputs (cesty k souborům)
- `agents/architect/artifacts/final/analysis_refactoring_maintainability_iter-001_T-002b.md`

## Risks / Constraints
- Drž doménu (neukousni T-002a). Konkrétní, odůvodněné nálezy, ne fráze.
- Model: **Fable**, xhigh. Cíl je kratší fokusovaný běh.
