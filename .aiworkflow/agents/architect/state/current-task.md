# Current Task

- **Task ID**: T-001 (iter-012)
- **Brief**: context/inbox/brief_architect_T-001_iter-012.md (BRIEF-012-001)
- **Iteration**: iter-012 (Playability & onboarding hardening)
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Co teď dělám
Hotovo – architektonický návrh (NE implementace) pro 5 oblastí playability hardeningu.
Výstup: `artifacts/final/architecture_playability_iter-012_T-001.md`.

Pokrytí (čerpáno z REÁLNÝCH src/core/* + src/save/* + src/ui/*):
- A1 Start seed: createInitialState seeduje z BALANCE.start (population/gold/food/housing);
  createHomeState/createPlayerState přepsat aby četly správné klíče; load.js stejná cesta.
- A2 Resolver gold/techPt: resourceKindOf early-return pro 'gold'/'techPt' (před byId lookup).
- A3 Crime pay clamp: crimeDaily už má Math.min clamp; dodat allowDeficit/integer-floor pojistku.
- A4 Sanity-cap populace: healthBirths aplikuje ROČNÍ matRate denně → exploze; přepočet na denní
  sazbu + globální sanity housing cap (tent capacity null → fallback per-tent cap).
- A5 Market UI overflow: .market-table wrap do scroll containeru + CSS v styles.css.
- Dopad determinismus/save-hash: fresh-state hash testy se mění (nový start) – aktualizovat fixtures;
  save/load nedotčen (persist allowlist + override v testech).
- Dopad accounting invariant: gold přes handler nyní reálně teče do player.gold → Σtx==Δgold drží.

## Klíčové nálezy z kódu
- gold/techPt NEJSOU v ID_CATALOGS (loader.js) → byId() throw → resourceKindOf vrací 'resource' (čte
  home.store, ne player.gold). Root cause #2.
- createHomeState čte start['startTents']/['startPopulation'] – v balance.start NEEXISTUJÍ (jsou tam
  population/gold/food/housing.tent) → default 0 pop / 5 tent; gold vždy 0 (createPlayerState natvrdo).
- healthBirths: natality(pop, 0.04) volané každý DEN v noon → (1.04)^365 efekt; tent capacity=null →
  getHousingCapacity=0 → birth cap se NEAPLIKUJE. Root cause #4.
- crimeDaily UŽ clampuje goldLoss=Math.min(...,player.gold) – throw riziko je nízké, ale floor+guard.
- styles.css (54 řádků) NEMÁ žádné .market-table pravidlo → tabulka v přirozené šířce přetéká.

## Dílčí checklist
- [x] Přečteno: AGENTS.md, brief BRIEF-012-001
- [x] Prozkoumáno: createInitialState/createHomeState, balance.start, handlers/transactions,
      crime, health/population (births), tickOrder, save/load + persistSchema, ui screens/styles, main.js
- [x] Návrh 5 oblastí (soubory, funkce, varianta + alternativa, rizika)
- [x] Dopad determinismus/save-hash + accounting invariant
- [x] ASCII diagram (resource resolver + start-state cesta)
- [x] Doporučené pořadí implementace + potřebné testy
- [x] Výstup do artifacts/final + handoff

## Předpoklady
- Zero-build PWA, žádné nové runtime závislosti do src/. Populace jen sanity-cap (ne M9 tuning).
- Implementaci dělá coder (T-005..T-009). Pouze NÁVRH.

## Blockery
–
