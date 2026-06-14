# Iteration Plan: iter-015

- **Created**: 2026-06-14
- **Goal**: M6 – Výzkum & tech strom: tech strom (cena 100×1.25^level), academy/university (research progres, techPt produkce), techy jako modifikátory → K13 uzavřeno plně. Dle master plánu §3/iter-013(M6). Posun číslování viz DR-013-00.
- **Status**: active

## Master Checklist
<!-- Orchestrátor udržuje a průběžně odškrtává – IHNED po přijetí done notifikace -->
- [x] T-001: architect – Design M6 hotový (design_iter-015_T-001.md). unlockedTechs plain object + buyTech (vzor buyCompany); techCap UŽ existuje formulas.js:31 (jen reuse+test); GENERALIZACE: rozšířit stávající rebuildBuildingDerived o krok b2 re-gen tech:* modifikátorů (helpery addTechModifiers/removeAllTechSourcedModifiers) → jedna cesta budovy+techy, M5-1 round-trip beze změny; academy research.daily (day order 75, grant techPt přes ctx, deterministický – university Math.random bonus vynechán=gap); G-LISTTECHS approximovaný strom (6 sektorů+~6 techů); split NE; nutno registerBuyTech do bootstrapu (anti-dark-code)
- [x] T-002: reviewer – Review designu M6: GO-s-podmínkami; split NE (souhlas). Generalizace rebuild BEZ regrese M5-1 (ověřeno proti buildings.js:475-518, unlockedTechs={}→no-op→bit-identické), determinismus/persist DRŽÍ. 0 blocker/2 major/4 minor/3 nit. Podmínky: M-1 createPlayerState init unlockedTechs/research (jinak fresh-vs-load desync), M-2 defenzivní guard proti chybějícímu techs katalogu, m-3 ověřit effective() cestu techů. Viz DR-015-01
- [x] T-002a: architect – Revize hotová (design §1.3a/§2.6/§2.7 dopsány): M-1 createPlayerState init unlockedTechs:{}+research:{sectors:{}} + fresh-vs-load test; M-2 hasCatalog('techs') guard + if(!tech)continue (getCatalog hodí Error bez katalogu); m-3 demo techy cílí storage.food(granary)/attractiveness(well) přes effective() building agregáty (jobsProduction čte přímo z katalogu → tech-on-jobs gap G-TECH-JOB-EFFECTIVE M9). Opravena chyba: demo cílil neexistující budovu house→well
- [ ] T-003: tom-proxy – Human gate: schválení revidovaného M6 designu (mandát dle DR-013-00, auto-ano v rámci scope)
- [ ] T-004: coder – T1: tech strom (sektory, techCap=100×1.25^level do formulas.js, unlockedTechs stav, buyTech command, persist) + tabulkové testy techCap; doplnit techs.json (G-LISTTECHS, provenance:'approximated')
- [ ] T-005: coder – T2: techy jako modifikátory K13 plně (tech efekty výhradně přes modifier vrstvu + registr efektů, re-aplikace po loadu = fold přes sdílený rebuild, žádná load-only větev, save=jen unlockedTechs+modifikátory)
- [ ] T-006: coder – T3: academy/university systém (research progres, techPt produkce, napojení na joby/efficiency) + persist
- [ ] T-007: coder – T4: UI academy/tech strom screen (selektory + commands, žádná logika v UI)
- [ ] T-008: tester – Test loop M6 (sada §1.3): techCap tabulkové testy, tech→modifier→effective řetěz round-trip (save jen unlockedTechs → load → fold == identita), catch-up-safe, persist round-trip, determinismus G1 nedotčen, smoke (academy screen renderuje), plné `npm run ci` + `npm run smoke`
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
