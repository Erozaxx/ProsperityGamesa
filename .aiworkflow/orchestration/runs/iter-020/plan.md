# Iteration Plan: iter-020

- **Created**: 2026-06-15
- **Goal**: M9a – Balanční kalibrace: hra vyladěná proti definovaným hratelnostním cílům (trh S-03, offline cap R2b/D10, celkový balanc populace/gold/jídlo). Master plán §3/iter-017(M9a). Posun číslování viz DR-013-00.
- **Status**: active

## Master Checklist
<!-- Orchestrátor udržuje a průběžně odškrtává – IHNED po přijetí done notifikace -->
- [x] T-001: architect – Design M9a hotový (design_iter-020_T-001.md): **3 měřitelné cíle trhu** — CÍL-1 recovery k baseline ≤5% za N=14 dní (0.8^14≈0.044), CÍL-2 arbitráž neztrátová (invariant spread 0.6<1.35), CÍL-3 impact persistence ≥60%/den (1−k=0.8); **driftK=0.2 POTVRZENO** (střed okna [0.10,0.40], uzavírá G-MARKET-DRIFT). **Cap T3**: nová konstanta `offline.capBalanceRealHours` oddělená od capTechRealHours=8, engine `min(tech,balance)`; doporučeno **8h (var.A)** reverzibilní→tom-proxy; alt B=2h/C=0.5h (C eskalace). **Regression T4**: invarianty křivek (pop 0–10000, gold≥0, food≤max, žádný NaN) + golden-hash checkpointy; **dekompozice L**: kvartální segmenty 91dní přes save/load, multi-seed smoke/plný. home.js:970 JS precedence bug → zamýšlená varianta. **Split**: C-020-A trh / C-020-B cap+regression (paralelní Sonnet). DR-020-01 navržen
- [x] T-002: reviewer – **GO-s-podmínkami** (review proti kódu i architektuře): 0 blocker/0 major/4 minor/3 nit. Cíle-proti-referenci PASS (3 cíle matematicky ověřeny: 0.8^14=0.044<0.05, okno driftK [0.10,0.40], spread 0.444), determinismus harness+dekompozice PASS (kvartální it() 81900 kroků+save/load+multi-seed), kalibrace=data PASS (signatury neměněny grep-gate), cap separace+min PASS, home.js:970 PASS (mechanika v core neexistuje grep=0 → deferred správně), split A/B SOUHLAS. **Podmínky DR-020-01**: MINOR-1 (CATCHUP_CAP_MS main.js:58 hardcoded 8*3600*1000 → coder MUSÍ přepojit main.js:250 na min(capTech,capBalance) jinak konstanta mrtvá — firstStarve-class past), MINOR-2 (sampler cesty §4.3 home.food.store ne home.foodStore — NaN riziko), MINOR-4 (capBalanceRealHours vs arch capRealHours = vědomá odchylka)
- [x] T-003: tom-proxy – **SCHVÁLENO** (v mandátu, bez eskalace): **cap = var. A = 8h** (`offline.capBalanceRealHours=8`) — idle-friendly žánr + Tomova preference, nulová operační změna (= dnešní efektivní cap, jen oddělení balance/tech), reverzibilní (utáhnout po playtestu M9b lze). Cíle trhu OK (driftK=0.2, kalibrace=data). Vědomé odchylky OK (home.js:970 original-intended, capBalanceRealHours separace). Finální R-G licence = M9b samostatný gate. gate_iter-020_T-003.md
- [x] T-004: coder – C-020-A Trh hotový [ověřeno orchestrátorem]: harness `test/helpers/marketHarness.mjs` (deterministický, staví na engine), `test/m9a-market.test.js` (11 testů: CÍL-1 recovery ≤5%/14dní + ≥48%/3dny, CÍL-2 arbitráž sell<buy + round-trip ztrátový, CÍL-3 impact ≥60%/den, T2 sweep+determinismus); **driftK=0.2 POTVRZENO** (provenance approximated→calibrated, G-MARKET-DRIFT closed). Cenový/drift vzorec BEZE ZMĚNY (market.js diff = jen komentář, grep-gate čistý). **ci 1526/1526**, smoke OK, M8/M7/M5/M6 nedotčeno, precache regen
- [x] T-005: coder – C-020-B Cap+Regression hotový [ověřeno orchestrátorem]: **T3** capBalanceRealHours=8 (var.A, oddělená od capTechRealHours), **MINOR-1 vyřešeno** — `CATCHUP_CAP_MS=Math.min(capTechRealHours,capBalanceRealHours)*3600*1000` (main.js:64, ODVOZENO z BALANCE+exportováno, ne hardcoded; konstanta žije, ne no-op), test m9a-offline-cap.test.js (re-derivace≠literál, min-kontrakt, capBalance není no-op, D10 over-cap 576000 kroků). **T4** m9a-regression.test.js: kvartální segmenty 81900 kroků přes save/load checkpointy (bit-identické s kontinuálním, ~0.05-0.2s/kvartál), invarianty (pop 0-10000, gold≥0, food≤max, žádný NaN/kolaps>30dní, MINOR-2 cesty home.food.store ošetřeny), golden-hash 3 seedy×4 kvartály (REGEN_GOLDEN=1 dokumentováno). home.js:970 evidence (original-intended, mechanika v core neexistuje grep=0→jen evidence). **ci 1550/1550** (+24), smoke OK, M8/M7/M5/M6 nedotčeno, precache regen
- [ ] T-006: tester – Test loop M9a (sada §1.3): cílové metriky z T1 jako automatizované testy, determinismus dlouhých běhů (segmentované, pod limit), žádná regrese tabulkových testů, PWA smoke, plné ci
- [ ] T-007: reviewer – Review gate M9a + DoD M9a (Opus, právo re-run): DoD formulován proti hratelnostním cílům, odchylky zdokumentované v datech, cap zdůvodněný; GO/NO-GO
- [ ] T-008: human – Schválení uzavření iterace (tom-proxy, auto dle DR-013-00) → /close-iteration + PR + merge → **M9a hotov** (kalibrace)

## Quality Gates
- [ ] Architecture/design reviewed (T-002) + tom-proxy schválení (T-003)
- [ ] Code review (Reviewer) – T-007
- [ ] QA validace (Tester) – T-006
- [ ] Plán neobsahuje orchestratora jako agenta u žádného tasku

## Exit Criteria (DoD M9a)
- Trh a offline cap kalibrovány proti EXPLICITNÍM hratelnostním cílům (ne proti neexistující serverové referenci).
- Balanc regression zelená (populace/gold/jídlo křivky proti referenčnímu očekávání); dlouhé běhy deterministické a segmentované pod limit prostředí.
- Vědomé odchylky rozhodnuty a zapsány (data/DR), ne skryté v kódu.
- `npm run ci` zelené, `npm run smoke` OK, determinismus G1 nedotčen.
- Reviewer GO.

## Decisions Made This Iteration
- DR-013-00: posun číslování (iter-017 master plán = iter-020 zde), autonomní doběh; tom-proxy human gaty.
- R2b offline cap: reverzibilní config → tom-proxy rozhodne v mandátu (návrh+zdůvodnění); finální release licence = M9b (iter-021) explicitní user gate.

## Retrospective Notes
- Vstup: master plán §3/iter-017(M9a), architektura §9.1 (trh drift/baseline), D10 (offline cap), K4, R1(S-03)/R2b, originál home.js (balanční hodnoty, home.js:970 vědomá odchylka).
- M9a závisí na M8 (kompletní obsah). M9b (iter-021) = release kandidát (mobile UX, PWA audit, licence) + finální user license gate.
- Carry-over z M8: MINOR-1 (survivedWinter once), MINOR-2 (chained event skip loadStoryEvent), 3 nit; + dříve evidované gapy (G-BUILD/RECRUIT-TXAUDIT, V1 tech→joby, V2 univ RNG, G-WORLD-*, G-AIBATTLE-DEDUP, G-MILITARY-STATS, MIN-1 player-ATTACKING) – kalibrace/cleanup zvážit v M9a/M9b.
- LL-005 (monitor živost přes working-tree mtime), LL-006 (duplicitní spawny + ověřuj proti CI/working-tree ne tvrzení).
