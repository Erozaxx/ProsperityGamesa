# Iteration Plan: iter-012

- **Created**: 2026-06-13
- **Goal**: Zprovoznit MVP jako reálně hratelné — opravit start seed, resolver gold/techPt, crime pay a sanity-cap populace; zavést browser-smoke + dlouhý sim do gate.
- **Status**: active

## Master Checklist
<!-- Orchestrátor udržuje a průběžně odškrtává – IHNED po přijetí done notifikace -->
- [x] T-001: architect – Navrhnout architekturu řešení playability hardeningu (start seed přes BALANCE.start, resolver gold/techPt, crime pay clamp, populace cap, market UI overflow); struktura, dotčené moduly, alternativy, rizika, dopad na determinismus/save-hash
- [x] T-002: reviewer – Review architektury (všechny nálezy, nejen blockery) → GO s podmínkami: 1 blocker (mylná A2 premisa), 3 major, 5 minor, 3 nit; viz DR-012-01
- [x] T-003: architect – Zapracovat nálezy z review (přepsáno §2/§3/§7/§9, re-diagnóza, pořadí A1→A4→A3→A5→A2(Option A), DAYS_PER_YEAR=364) → architecture_playability_iter-012_T-003.md (supersedes T-001)
- [x] T-004: human – Review a schválení architektury uživatelem (blocker před implementací) → SCHVÁLENO (varianta „Schvaluji, implementuj"; architektovo doporučení vč. A2 Option A)
- [x] T-005: coder – Start seed: createInitialState předá katalog do factory + createHomeState/createPlayerState čtou BALANCE.start (population/gold/food/housing); fresh hra startuje populovaná (pop 50, gold 500) → CI zelená, smoke „Populace 50". POZN: A1 seed odhalil reload-determinismus regres → DR-012-02, řeší T-013/T-014
- [x] T-006: coder – Fix resolveru zdrojů (A2 Option A): resourceKindOf vrací pro 'gold'/'techPt' dedikovaný handler před byId lookupem; +test invariance s katalogem i bez
- [x] T-007: coder – Crime pay robustnost (A3): crime.js beze změny logiky; +regresní no-throw testy (broke osada, pop/gold grid)
- [x] T-008: coder – Sanity-cap populace (A4): denní sazba annualRate/DAYS_PER_YEAR (=364) v births/retirement + globální hard-cap sanityMaxPop=10000; deterministické, calcHousingDerivedFromCatalog nezměněna
- [x] T-009: coder – Market UI overflow (A5): .table-scroll wrapper + responsivní CSS pro 6sl. market tabulku; bez přepisu komponenty
- [x] T-013: architect – Rozhodnutí fixu reload-determinismu → Option A (rebuild-on-load): deriveWorkforceTotal helper + přepočet v load.js Step 5; B/C zamítnuty; DR-012-02 decided; design pro codera hotový
- [x] T-014: coder – Option A (rebuild-on-load) aplikován a korektní (G1 plný hashState 16/16) + REVERT oslabeného G1 testu hotový. Odhalil hlubší preexist. díru (stale workforce.total=0 na 1. ticku spojitého simu) → eskalováno (NEMASKOVÁNO) → vyřešeno v T-016
- [x] T-015: architect – Rozhodnutí dotažení → Derive-on-init (přepočet workforce.total v createInitialState přes deriveWorkforceTotal, jeden řádek). Varianta 2 (uznat testy křehké) zamítnuta jako maskování. Fixtures k regeneraci pro CI: ŽÁDNÉ (v repu nejsou stored golden hashe). DR-012-02 decided-extended. POZN: architekt DOPORUČUJE user-gate (behavior-change spojitého simu) → T-015a
- [x] T-015a: human – Gate SCHVÁLENO: uživatel zvolil „Derive-on-init" (přepočet workforce.total v createInitialState; akceptována změna RNG-průběhu fresh-simu jako korektní)
- [x] T-016: coder – Derive-on-init aplikován (createInitialState dopočte workforce.total přes deriveWorkforceTotal, single source of truth na 3 místech); precache regenerován (čistý diff, jen PRECACHE_VERSION). Plné `npm run ci` ZELENÉ (778/778), smoke OK, app-bootstrap 8/8 + export-string 12/12 + G1 16/16 + playability 9/9 zelené; tvar save v3 nezměněn
- [ ] T-010: tester – QA: npm run ci zelené (+ aktualizace testů na seedovaný start), npm run smoke OK, dlouhý seedovaný sim (≥2 herní roky) bez crashe; ověřit accounting invariant u gold po fixu resolveru; ověřit G1 determinismus po load drží na plném hashState
- [ ] T-011: reviewer – Code review celé implementace (correctness + reuse/simplify)
- [ ] T-012: human – Schválení uzavření iterace (review výsledků před /close-iteration)

## Quality Gates
- [ ] Plan neobsahuje orchestratora jako agenta u žádného tasku
- [ ] Architect návrh prošel reviewer review a případnou opravou (T-002, T-003)
- [ ] Architect návrh schválen uživatelem (T-004)
- [ ] Code review (Reviewer)
- [ ] QA validace (Tester)

## Exit Criteria
- Fresh hra startuje populovaná (populace/zlato/jídlo > 0) a v UI se zlato reálně hýbe (taxes/grant → state.player.gold).
- `npm run ci` zelené, `npm run smoke` OK, dlouhý seedovaný sim ≥2 herní roky bez crashe a bez explozivního růstu populace.
- Accounting invariant (Σ tx == Δ gold) drží i po fixu resolveru.

## Decisions Made This Iteration
- DR-012-01: A2 resolver hardening Option A (accepted, schváleno T-004).
- DR-012-02: Reload-determinismus regres (workforce.total) odhalený A1 seedem. T-013 architekt → Option A (rebuild-on-load). T-014 coder: Option A korektní (G1 zelený), ale odhalil hlubší preexist. díru (stale workforce.total=0 na 1. ticku spojitého simu). T-015 architekt → Derive-on-init (dotažení). T-015a uživatel SCHVÁLIL Derive-on-init (akceptuje změnu RNG-průběhu fresh-simu). decided-extended → T-016 coder.

## Retrospective Notes
- Vstup: doc/playtest-findings-mvp.md (nálezy z reálného browser playtestu po M0–M4).
