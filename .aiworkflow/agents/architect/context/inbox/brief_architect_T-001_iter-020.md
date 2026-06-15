# Brief

- **Brief ID**: BRIEF-020-001
- **Iteration**: iter-020 (M9a – Balanční kalibrace)
- **Task**: T-001 (architect) — design M9a kalibrace
- **From**: Orchestrator
- **To**: architect (Opus)
- **Date**: 2026-06-15

## Goal
Navrhni **design balanční kalibrace M9a** (NE produkční kód): měřitelné hratelnostní cíle trhu (S-03), metodiku kalibrace driftu/baseline, návrh hodnoty offline capu (R2b/D10) + zdůvodnění, a balanc-regression metodiku (dlouhé deterministické běhy). Klíč: **DoD se formuluje proti EXPLICITNÍM hratelnostním cílům, NE proti neexistující serverové referenci** (originál serverovou dynamiku ve zdroji nemá — §9.1/D9, R-C riziko).

## Source of truth
- Architektura `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md`: **§9.1 (D9 R1 klientská tržní simulace)** — cenový vzorec, denní drift mean-reversion `available += k×(baseline−available)`, příklady cílů; **§9.2a/D10 (offline cap)**; K4, K7, R1(S-03), R2b, R-C.
- Master plán `agents/project-manager/artifacts/final/iteration_master_plan_iter-003_T-001.md` §3/iter-017(M9a) — tasky T1–T4, DoD.

## Scope IN (navrhni)
1. **T1 — Hratelnostní cíle trhu (S-03, §9.1) jako MĚŘITELNÉ testy**: finalizuj cíle z §9.1 příkladů na měřitelné, např.:
   - "cena se po velkém výprodeji vrátí k baseline do N herních dní" (urči N).
   - "arbitráž okamžitý nákup→prodej NENÍ zisková díky spreadu (haggleBuy 1.35 / haggleSell 0.6)".
   - "drift `k` NEVYHLADÍ hráčův cenový dopad během jednoho dne".
   Pro každý cíl: přesná měřitelná podmínka + jak se testuje (seedovaný headless běh).
2. **T2 — Kalibrace trhu metodika**: jak ladit `driftK` (dnes `balance.js:80 driftK:0.2`, gap G-MARKET-DRIFT) a baseline proti cílům; simulační harness (headless běhy se seedy, deterministické). Co měnit = DATA (balance.js/market data), ne logika.
3. **T3 — Offline cap hodnota (R2b/D10)**: dnes `balance.js:208 offline.capTechRealHours:8`. Navrhni hodnotu + UX/balanc zdůvodnění (idle hra, kolik offline progresu je fér vs exploit). **Pozn.: reverzibilní config — tom-proxy rozhodne v mandátu dle tvého návrhu (gate T-003); user-eskalace jen pokud navrhneš zásadní změnu feel.** Uveď doporučenou hodnotu + alternativy.
4. **T4 — Balanc regression metodika**: dlouhé simulační běhy (rok+ herního času) — křivky populace/gold/jídlo vs referenční OČEKÁVÁNÍ (definuj, ne serverová data). **POVINNÁ dekompozice (L)**: rozděl běhy na seedované segmenty / checkpointované úseky tak, aby jednotlivý test zůstal pod časovým limitem prostředí. Rozhodnutí vědomých odchylek (home.js:970 faktická vs zamýšlená varianta — najdi a posuď).

## Scope OUT
- Mobile UX / PWA audit / licence = M9b (iter-021). NEsahej M8 obsah (carry-over nálezy = kalibrace, ne re-design).
- Žádný produkční kód — jen design + metodika + měřitelné cíle.

## Tvrdé invarianty
- Determinismus: harness seedovaný, žádný Date.now/Math.random/DOM v core; dlouhé běhy segmentované (pod limit, neuříznou se).
- Kalibrace = změna DAT (balance), ne přepis logiky; cenový vzorec beze změny (§9.1).
- Cíle měřitelné a testovatelné jako automatizované testy (tester je převezme).
- Vědomé odchylky → zapsané v datech/DR, ne skryté.

## Acceptance Criteria
- Design `design_iter-020.md` (nebo `_T-001`): T1 cíle (měřitelné), T2 metodika+harness, T3 cap návrh+zdůvodnění, T4 regression metodika+dekompozice, vědomé odchylky.
- Split? (T1+T2 trh, T3+T4 cap+regression — navrhni rozdělení coder tasků).
- DR-020-01 impl poznámky pro coder/tester (carry rizik, gap G-MARKET-DRIFT closure).
- Implementační poznámky proveditelné Sonnet coderem.

## Inputs
- Architektura §9.1/§9.2a/D9/D10, K4/K7, R1(S-03)/R2b/R-C
- Master plán §3/iter-017
- Kód: `src/core/systems/market.js` (cenový vzorec, drift), `src/core/balance/balance.js` (market.driftK:0.2, offline.capTechRealHours:8), `src/core/engine/catchup.js` (offline cap aplikace), originál `home.js` (balanční hodnoty, home.js:970 vědomá odchylka)

## Expected Outputs
- `agents/architect/artifacts/final/design_iter-020_T-001.md`
- `orchestration/decisions/` DR-020-01 (pokud vyžaduje)

## Workflow po dokončení
- `agents/architect/state/current-task.md` → done
- `bash agents/architect/scripts/handoff-out.sh T-001 "<design hotový + split + cap návrh>"`
- NEcommituj (git).
