# Iteration Plan: iter-015

- **Created**: 2026-06-14
- **Goal**: M6 – Výzkum & tech strom: tech strom (cena 100×1.25^level), academy/university (research progres, techPt produkce), techy jako modifikátory → K13 uzavřeno plně. Dle master plánu §3/iter-013(M6). Posun číslování viz DR-013-00.
- **Status**: active

## Master Checklist
<!-- Orchestrátor udržuje a průběžně odškrtává – IHNED po přijetí done notifikace -->
- [x] T-001: architect – Design M6 hotový (design_iter-015_T-001.md). unlockedTechs plain object + buyTech (vzor buyCompany); techCap UŽ existuje formulas.js:31 (jen reuse+test); GENERALIZACE: rozšířit stávající rebuildBuildingDerived o krok b2 re-gen tech:* modifikátorů (helpery addTechModifiers/removeAllTechSourcedModifiers) → jedna cesta budovy+techy, M5-1 round-trip beze změny; academy research.daily (day order 75, grant techPt přes ctx, deterministický – university Math.random bonus vynechán=gap); G-LISTTECHS approximovaný strom (6 sektorů+~6 techů); split NE; nutno registerBuyTech do bootstrapu (anti-dark-code)
- [x] T-002: reviewer – Review designu M6: GO-s-podmínkami; split NE (souhlas). Generalizace rebuild BEZ regrese M5-1 (ověřeno proti buildings.js:475-518, unlockedTechs={}→no-op→bit-identické), determinismus/persist DRŽÍ. 0 blocker/2 major/4 minor/3 nit. Podmínky: M-1 createPlayerState init unlockedTechs/research (jinak fresh-vs-load desync), M-2 defenzivní guard proti chybějícímu techs katalogu, m-3 ověřit effective() cestu techů. Viz DR-015-01
- [x] T-002a: architect – Revize hotová (design §1.3a/§2.6/§2.7 dopsány): M-1 createPlayerState init unlockedTechs:{}+research:{sectors:{}} + fresh-vs-load test; M-2 hasCatalog('techs') guard + if(!tech)continue (getCatalog hodí Error bez katalogu); m-3 demo techy cílí storage.food(granary)/attractiveness(well) přes effective() building agregáty (jobsProduction čte přímo z katalogu → tech-on-jobs gap G-TECH-JOB-EFFECTIVE M9). Opravena chyba: demo cílil neexistující budovu house→well
- [x] T-003: tom-proxy – Human gate SCHVÁLENO s výhradou (M6 proceed): G-LISTTECHS approx OK, G-TECH-JOB-EFFECTIVE OK s pozn., univ RNG vynechán OK, K13 plně OK. Sledovací výhrady M9: V1 tech→joby napojení, V2 univ RNG náhrada, V3 TXAUDIT ctx. Bez eskalace (vratné, in-scope) → implementace M6 běží
- [x] T-004: coder – T1 hotový (+podstata T2): techs.json 6 sektorů+7 techů approximated (G-LISTTECHS uzavřen), techCap reuse+test, M-1 createPlayerState init unlockedTechs/research + fresh-vs-load test, buyTech+registerBuyTech (anti-dark-code), persist. Navíc: rebuildBuildingDerived krok b2 + addTechModifiers/applyTechModifiers (_modVersion reset = DR-012-02 invariant), demo techy přes effective() agregáty. ci 1027/1027, smoke OK, G1 16/16, M5-1 round-trip 44/44 nedotčen
- [x] T-005: coder – T2 dotažení hotové: m6-tech-roundtrip.test.js (19 testů, round-trip S techy BIT-IDENTICKÝ: buyTech budovy-cílící→save→load→rebuild; payload bez derivovaných tech dat; persist↔re-gen idempotentní; catch-up-safe). Žádná oprava nutná (T-004 správně). ci 1046/1046, G1 16/16, M5-1 44/44 nedotčen
- [x] T-006: coder – T3 hotový: research.js researchDaily (day order 75), exp z jobů (kategorie) + academy/university budov (researchExp přes effective×created), level-up while exp>=techCap → grant(techPt,ctx); balance.research, academy/university do buildings.json. Deterministické (univ Math.random vynechán=gap), catch-up-safe. ci 1071/1071, smoke OK, G1+M5-1+M6 nedotčeno
- [x] T-007: coder – T4 hotový: TechScreen (tech body, research progres 6 sektorů, tech strom dle sektoru s odemčením/cenou/prereqs/efekty, buyTech tlačítka), tab 'Veda', selektory selectTechTree/selectResearchProgress/selectTechPoints. ci 1097/1097, smoke OK (tab renderuje), G1+M5-1+M6 nedotčeno. M6 implementace kompletní
- [x] T-008: tester – Test loop M6 GO (DoD M6/K13 plně): všech 9 AC PASS empiricky (1097/1097, smoke OK tab Veda). buyTech lifecycle, tech round-trip bit-identický (payload bez derivovaných), K13 plně (building+tech ve stejné vrstvě jeden fold=600), research deterministický (400 dní sim 31 techPt, catch-up batch==incremental), M6 nerozbil M5 (44/44+G1 16/16), persist round-trip+undefined-guard, žádný Math.random/Date.now/DOM, UI bez logiky
- [ ] T-009: reviewer – Review gate M6: DoD bod po bodu, techy přes modifier vrstvu (K13 plně), žádná load-only derivace, derivovaná data se neukládají, tickOrder+diagram aktuální (právo re-run)
- [ ] T-010: human – Schválení uzavření iterace (tom-proxy, auto dle DR-013-00) → /close-iteration + PR + merge

## Quality Gates
- [ ] Architecture reviewed (T-002) + tom-proxy schválení (T-003)
- [ ] Code review (Reviewer) – T-009
- [ ] QA validace (Tester) – T-008
- [ ] Plán neobsahuje orchestratora jako agenta u žádného tasku

## Exit Criteria (DoD M6)
- Tech strom funkční: buyTech, cena 100×1.25^level, unlockedTechs persistováno.
- Techy jsou modifikátory (K13 plně): efekty výhradně přes modifier vrstvu, re-aplikace po loadu = fold, save=jen unlockedTechs/raw.
- Academy/university: research progres + techPt produkce, napojení na efficiency.
- `npm run ci` zelené, `npm run smoke` OK, determinismus G1 + catch-up-safe nedotčen.
- Reviewer GO. → **K13 zcela naplněno (budovy z M5-1 + techy z M6).**

## Decisions Made This Iteration
- DR-013-00: posun číslování, autonomní doběh; tom-proxy human gaty.

## Retrospective Notes
- Vstup: master plán §3/iter-013(M6), architektura §5.3 (K13), §5.4 (K14), formulas (techCap doložitelný 100×1.25^level).
- M6 staví nad modifier vrstvou z M5-1; techy = druhý zdroj modifikátorů (po budovách) → K13 plně.
- Carry-over z M5-2: G-BUILD-TXAUDIT stále směřuje na M9/iter-018.
- LL-005: hlídat živost dlouho běžících agentů (monitor 15min aktivní).
