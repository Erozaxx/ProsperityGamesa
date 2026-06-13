# Current Task

- **Task ID**: T-003 (iter-012)
- **Brief**: context/inbox/brief_architect_T-003_iter-012.md (BRIEF-012-003)
- **Iteration**: iter-012 (Playability & onboarding hardening)
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Co teď dělám
Hotovo – REVIZE návrhu dle review T-002 + DR-012-01 (NE implementace).
Výstup: `artifacts/final/architecture_playability_iter-012_T-003.md` (supersedes T-001).

Zapracováno (vše ověřeno proti reálnému kódu + empirický node probe):
- A2: mylný BLOCKER narrativ odstraněn. gold/techPt JSOU v resources.json (kind), resources v
  ID_CATALOGS → s katalogem resolver vrací 'gold'/'techPt', handler čte player.gold=500 (no-op fix).
  Catalog-less mezera (resourceKindOf('gold')==='resource' → pay throw) potvrzena probe.
- VOLBA: Option A (defensivní early-return v resourceKindOf pro gold/techPt) — robustnost > křehkost
  testů; s katalogem no-op, chráněno testem invariance. (shoda s preferencí orchestrátora DR-012-01)
- §7 accounting: invariant NEBYL porušen v běhu (gold teče do player.gold už dnes) – přepsáno.
- §3 crime: clamp+guards správné samy o sobě (ne „po A2"); throw byl jen catalog-less – jen regress test.
- §9 diagram: přepracován (s katalogem 'gold'→'gold'; bug větev jen catalog-less).
- Playtest #2 „Zlato 0" re-diagnostikováno = A1 (fresh pop=0 → crime early-return, taxes 0), ne A2.
- Fakta opravena: DAYS_PER_YEAR=364 (4×seasonDays 91); market 6 sloupců; load.js smazat ř.211-212;
  sanity-cap i v migraci; rename test population.test.js:254 „allows unlimited growth…(tent)".
- Pořadí: A1 → A4 → A3(jen test) → A5 → A2(Option A hardening).

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
