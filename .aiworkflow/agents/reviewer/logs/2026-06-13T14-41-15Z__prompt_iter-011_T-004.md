# Brief
- **Brief ID**: BRIEF-043
- **Iteration**: iter-011 (M4b → MVP)
- **To**: reviewer (Opus) – **MVP GATE** s pravomocí re-run
## Goal
MVP GATE iter-011 = DoD M4 = MVP. Ověř, že MVP acceptance criteria jsou REÁLNĚ splněna v běžící aplikaci. Verdikt GO (=MVP hotové) / RE-RUN. Nesplnění = re-run, ne posun.
## MVP acceptance criteria (dle architektury §11 + zadání, MVP-level = M0–M4)
1. **Instalace + offline**: PWA instalovatelná, startuje offline (manifest + SW + precache).
2. **Reálný-čas engine**: čas běží, sezóny (4×91), pauza/1×/2×.
3. **Populace + bydlení + jídlo + úmrtí** (M2).
4. **Produkce surovin** (les/pole/důl) + joby/skilly (M3).
5. **Ekonomika**: gold, daně, **dynamické ceny na trhu, karavany** (M4).
6. **Idle smyčka uzavřená**: výdělek→nákup→pasivní příjem→offline progres.
7. **Spolehlivý save vč. offline výpočtu** (catch-up, autosave, export/import).
## Scope IN
- OVĚŘ body 1–7 v REÁLNÉM kódu (bootSequence, commandy registrované, UI napojené – ne jen unit). Spusť `npm run ci`.
- Trh M4b: buyGoods/sellGoods/sendCaravan dosažitelné v runtime; MarketScreen napojený; getGoldValue/marketInject kontrakt (S-06 pozitivní); arbitráž sanity.
- crime fix (DA5 grep-gate čistý); persist v2→v3.
- Posuď, zda je idle smyčka skutečně hratelná end-to-end (MVP e2e scénář z test reportu).
- Co je MIMO MVP (M5–M9: výzkum/budovy/AI/vojsko/příběh) NENÍ předmětem této gate – jen potvrď, že to plán řeší v dalších iteracích.
## Inputs
- src/core/systems/market*.js, src/core/commands/, src/app/main.js, src/ui/, src/save/; návrh, impl note, test report; zadani_projektu.md; architektura §11; agents/reviewer/AGENTS.md
## Acceptance Criteria
- Jasný verdikt GO (MVP hotové) / RE-RUN; pokud GO, explicitně potvrď body 1–7. Při RE-RUN přesně co chybí.
## Expected Outputs
- agents/reviewer/artifacts/final/review_iter-011_T-004_MVPgate.md
