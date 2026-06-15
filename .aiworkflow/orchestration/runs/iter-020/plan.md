# Iteration Plan: iter-020

- **Created**: 2026-06-15
- **Goal**: M9a – Balanční kalibrace: hra vyladěná proti definovaným hratelnostním cílům (trh S-03, offline cap R2b/D10, celkový balanc populace/gold/jídlo). Master plán §3/iter-017(M9a). Posun číslování viz DR-013-00.
- **Status**: active

## Master Checklist
<!-- Orchestrátor udržuje a průběžně odškrtává – IHNED po přijetí done notifikace -->
- [ ] T-001: architect – Design M9a kalibrace (Opus): definice měřitelných hratelnostních cílů trhu (S-03, §9.1: "návrat k baseline do N dní", "arbitráž nezisková", "drift nevyhladí hráčův dopad za den"), simulační harness přístup (headless seedy), návrh hodnoty offline cap (R2b/D10 capRealHours) + zdůvodnění, balanc regression metodika (populace/gold/jídlo křivky, dekompozice dlouhých běhů na seedované segmenty pod limit prostředí), vědomé odchylky (home.js:970). DoD M9a proti CÍLŮM (ne proti neexistující serverové referenci)
- [ ] T-002: reviewer – Review designu M9a: cíle měřitelné a testovatelné, harness deterministický a pod časový limit, cap hodnota zdůvodněná, odchylky v datech ne v kódu, soulad s architekturou (§9.1 trh, D10 cap, K4); GO/NO-GO
- [ ] T-003: tom-proxy – Human gate M9a: produktová rozhodnutí (hratelnostní cíle, **offline cap hodnota R2b** = reverzibilní config → rozhodni v mandátu s návrhem+zdůvodněním, NEeskaluj pokud není mimo mandát), vědomé balanční odchylky. SCHVÁLENO/VRÁCENO
- [ ] T-004: coder – T1+T2: definice cílů jako měřitelné testy + kalibrace trhu (ladění driftu `k` a baseline proti cílům, simulační harness se seedy). Data-driven (balance.js/market data), žádná logika do UI
- [ ] T-005: coder – T3+T4: offline cap hodnota (capRealHours dle gate) + balanc regression (dlouhé seedované segmentované běhy, křivky populace/gold/jídlo vs očekávání, vědomé odchylky zapsány do dat/DR)
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
