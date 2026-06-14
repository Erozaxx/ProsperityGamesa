# Iteration Plan: iter-017

- **Created**: 2026-06-14
- **Goal**: M7a-2 – Frakční AI & svět ožívá: frakční automat (AISTATES 0–7 přechodová fn processAI), revolty/questy/tribute výběr, AI-AI bitvy RNG vzorcem, UI world/zones screen. Dokončuje M7a (DoD M7a se vyhodnotí zde). Dle master plánu §3/iter-014(M7a) T2/T3/T6 + design iter-016 §3/§4/§16. Posun číslování viz DR-013-00/016-01.
- **Status**: active

## Master Checklist
<!-- Orchestrátor udržuje a průběžně odškrtává – IHNED po přijetí done notifikace -->
- [ ] T-001: architect – Detailní design M7a-2 (navazuje na design_iter-016 §3/§4/§16, zdroj originál world.js): (1) frakční automat – AISTATES 0–7 jako data (aiStates přechodová tabulka v zones.json) + deterministická processAI(state, factionId, rng('world')), plánování útoků/varování přes schedule one-shot (string-ID+K17), idempotentní self-rearm guard, aktivační prahy z balance.world; (2) revolty (favour vzorce na zone ticku) + questy (deterministicky questSeq, RNG world, getGoldValue) + tribute výběr (gatherTributes month edge) + AI-AI bitvy RNG resolve vzorcem (NE battle automat, state 6); (3) UI world/zones screen (mapa zón, frakce, diplomacie/policy – selektory+commands). Determinismus/catch-up-safe (AI svět v dávce, jediný rng world, serializovatelný schedule). Rozhodnout split. Výstup: design doc
- [ ] T-002: reviewer – Review designu M7a-2 (frakční automat deterministický+serializovatelný schedule bez load-only/init-only větve, idempotentní self-rearm, AI-AI bitvy vzorcem battle.js nedotčen, UI bez logiky, soulad s architekturou) + posouzení splitu
- [ ] T-003: tom-proxy – Human gate: schválení M7a-2 designu (mandát dle DR-013-00, auto-ano v rámci scope)
- [ ] T-004: coder – T2: frakční automat – processAI(state, factionId, rng('world')) přechodová fn AISTATES 0–7, schedule one-shot plánování (string-ID+K17) + idempotentní self-rearm guard (boot+load, anti-DR-012-02), aktivační prahy z balance.world; persist frakční stav; determinismus + replay test
- [ ] T-005: coder – T3: revolty (favour vzorce zone tick) + questy (questSeq deterministicky, RNG world, getGoldValue oceňování, accept/reject commands) + tribute výběr (gatherTributes month edge, do home gold/resources) + AI-AI bitvy RNG resolve vzorcem (state 6, battle.js NEDOTČEN); persist
- [ ] T-006: coder – T6: UI world/zones screen (mapa zón, frakce/diplomacie, policy, questy panel – selektory + commands, žádná logika v UI) + tab
- [ ] T-007: tester – Test loop M7a-2 + DoD M7a komplet (sada §1.3): determinismus world streamu, AI automat replay test (stejný seed → stejné přechody), schedule self-rearm pro staré savy, catch-up-safe (AI svět v dávce ≥1 rok), revolty/questy/tribute/AI-AI bitvy deterministické, UI smoke, M7a-2 nerozbil M7a-1/M5/M6/M4b, persist round-trip, plné `npm run ci` + `npm run smoke`
- [ ] T-008: reviewer – Review gate M7a-2 + DoD M7a: frakční automat serializovatelný/deterministický bez load-only větve, kontrakty §8 beze změny, battle.js nedotčen, derivovaná data se neukládají, UI bez logiky, tickOrder+diagram aktuální (právo re-run)
- [ ] T-009: human – Schválení uzavření iterace (tom-proxy, auto dle DR-013-00) → /close-iteration + PR + merge → DoD M7a hotovo

## Quality Gates
- [ ] Architecture reviewed (T-002) + tom-proxy schválení (T-003)
- [ ] Code review (Reviewer) – T-008
- [ ] QA validace (Tester) – T-007
- [ ] Plán neobsahuje orchestratora jako agenta u žádného tasku

## Exit Criteria (DoD M7a komplet)
- Frakční svět ožívá: frakce mění politiky/útočí (AISTATES processAI), revolty/questy/tribute běží, AI-AI bitvy vzorcem.
- UI world/zones screen funkční (mapa, frakce, diplomacie, questy).
- `npm run ci` zelené, `npm run smoke` OK, determinismus G1 + catch-up-safe (AI svět v dávce) nedotčen; battle.js NEDOTČEN (M7b).
- Žádná logika v UI; serializovatelný schedule bez load-only větve; derivovaná data se neukládají.
- Reviewer GO. → **DoD M7a (AI svět tiká deterministicky: zóny + frakce + jednotky + napojení trhu) kompletní.**

## Decisions Made This Iteration
- DR-013-00 / DR-016-01: posun číslování, split M7a-1/M7a-2, autonomní doběh; tom-proxy human gaty.

## Retrospective Notes
- Vstup: master plán §3/iter-014(M7a) T2/T3/T6, design iter-016 §3 (frakční automat) / §4 (revolty/questy/tribute/AI-AI) / §16 (odloženo M7a-2), architektura §8.2/§8.
- M7a-1 (iter-016) dodalo zóny/jednotky/napojení trhu; M7a-2 uzavírá M7a frakční AI + UI.
- Bitvy (battle automat hráčských bitev) = M7b/iter-018; M7a-2 AI-AI bitvy jen RNG vzorcem.
- Carry-overy na M9: G-BUILD-TXAUDIT, G-RECRUIT-TXAUDIT, V1 tech→joby, V2 univ RNG, G-WORLD-* (kalibrace).
- LL-005: monitor hlídá živost přes working-tree mtime (ne .output stub); reclaim kontejneru může zabít agenty+monitor (re-dispatch, kód v gitu bezpečný).
