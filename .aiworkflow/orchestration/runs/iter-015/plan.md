# Iteration Plan: iter-015

- **Created**: 2026-06-14
- **Goal**: M6 – Výzkum & tech strom: tech strom (cena 100×1.25^level), academy/university (research progres, techPt produkce), techy jako modifikátory → K13 uzavřeno plně. Dle master plánu §3/iter-013(M6). Posun číslování viz DR-013-00.
- **Status**: active

## Master Checklist
<!-- Orchestrátor udržuje a průběžně odškrtává – IHNED po přijetí done notifikace -->
- [ ] T-001: architect – Detailní design M6 dle master plánu §3/iter-013(M6) + architektury §5.3 (K13 modifikátory – tech efekty výhradně přes modifier vrstvu), §5.4 (K14 registr efektů): (1) tech strom – sektory, cena `techCap`=100×1.25^level (formulas), `unlockedTechs` ve stavu, `buyTech` command, persist; (2) techy jako modifikátory K13 plně (re-aplikace po loadu = fold přes sdílený rebuild, žádná load-only větev); (3) academy/university systém (research progres, techPt produkce, napojení na joby/efficiency); (4) UI academy/tech strom screen. Řešit gap G-LISTTECHS (techs.json approximated kostra → navrhnout doložitelný/approximated tech strom, vzorec doložitelný). Rozhodnout split. Determinismus/catch-up-safe. Výstup: design doc
- [ ] T-002: reviewer – Review designu M6 (techy přes modifier vrstvu K13 bez load-only větve, deterministické, persist jen unlockedTechs/raw, soulad s architekturou, G-LISTTECHS postup) + posouzení splitu
- [ ] T-003: tom-proxy – Human gate: schválení M6 designu (mandát dle DR-013-00, auto-ano v rámci scope)
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
