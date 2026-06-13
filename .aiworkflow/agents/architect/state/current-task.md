# Current Task

- **Task ID**: T-001 (iter-010)
- **Brief**: context/inbox/brief_architect_T-001_iter-010.md (BRIEF-036)
- **Iteration**: iter-010 (M4a – gold/daně/upkeep/účetnictví observer + wiring + UI)
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Co teď dělám
Hotovo – DETAILNÍ implementační spec (pro Sonnet codera) pro iter-010 (M4a). NE implementace.
Výstup: `artifacts/final/design_iter-010_T-001.md`.

Pokrytí (čerpáno z REÁLNÝCH src/core/* + AUTORITATIVNÍCH services home.js/player.js/config.js/techs.js
+ architektura §7.2/§5.5/§4.3/§3.3/§11, čísla potvrzena subagentem):
- T1 daně + gold/techPt: gold/techPt handlery HOTOVÉ z M2a (jen použít, NEreimplementovat);
  taxes.js (localTaxes 5days grant gold, monthlyTaxes month grant gold); formulas localTaxAmount/
  monthlyTaxAmount (rate×curWorkers[×TAXCENTERBASE=22]); setTaxRate command REGISTROVAT v main.js
  bootstrapEngine (vzor setSpeed); balance tax.localRate/monthlyRate/rateMin/rateMax (approximated).
- T2 upkeep + burnWood + foodSpoilage: upkeep.js military month (w×108+a×162, insufficient→flag
  notEnoughMilitaryFunding bez výjimky); burnWood.js day order 60 (Zima 0.5×, Jaro/Podzim 0.2×, Léto 0,
  pay firewood); foodSpoilage refactor → pay s emitTx (consumed záznam); building upkeep = M5 gap.
- T3 účetnictví OBSERVER (K5/§7.2): accounting.js recordTx (ŽÁDNÁ mutace v pay/grant) agreguje do
  council.current {goldEarned,goldSpent,byCause,consumed,produced}; closeMonth month order 40 POSLEDNÍ
  → history cap 12; KRITICKÝ WIRING: ctx.emitTx=tx=>recordTx(state,tx) v bootSequence (pokrývá live i
  catchup). Účetní invariant Σ gold tx == Δ gold (test accounting-invariant).
- T4 UI: selectFinance, CouncilScreen (tab Rada: zlato, daň. sazba se setTaxRate ovladačem, poslední
  měsíční report příjmy/výdaje/čistý tok); App.js tab + import; send cesta jako setSpeed/assignJob.

## Klíčové wiring body (poučení M2b/M3 re-run)
ctx.emitTx zapojen v bootSequence (jinak observer mrtvý – RA-1); setTaxRate REGISTROVANÝ v
bootstrapEngine (jinak mrtvé UI tlačítko – RA-2); účetní invariant vynucen grep-gate „žádný player.gold
mimo handlers.js"; všechny platby přes pay/grant (žádná druhá cesta K5). Migrace v1→v2 (taxRate/tot*/
council/diseaseFromColdChance). tickOrder month: spoilage(10)→taxes(20)→upkeep(30)→closeMonth(40).

## Alternativy (zamítnuté)
Alt A účetnictví inline v pay (anti-pattern originálu player.js:146), Alt B emitTx globální singleton
(porušuje K0/determinismus), Alt C taxRate bez clamp (NaN ekonomika B4), Alt D burnWood/upkeep mimo
resource vrstvu (porušuje invariant + K5). Vše s důvody v §13.

## Dílčí checklist
- [x] Přečteno: AGENTS.md, brief BRIEF-036
- [x] POVINNÉ vstupy: architecture_proposal_iter-002 §7.2/§5/§4.3/§11, doc/original_source_doc.md §4/§6,
      AUTORITATIVNÍ services home.js (tax/upkeep/burnWood)/player.js (report observer)/config.js/techs.js
- [x] Prozkoumány REÁLNÉ src/core/resources/*, engine/*, commands/*, state/*, balance/*, systems/food.js,
      app/main.js (bootstrapEngine), ui/{App,selectors,screens,render}, save/persistSchema, src/data/*
- [x] Spec T1-T4 (cesty, JSDoc signatury, vzorce s reálnými čísly, jak ověří test)
- [x] End-to-end app integrace: command registrace v main.js + ctx.emitTx wiring + UI napojení
- [x] Účetní invariant Σ txEvent == delta goldu (testovatelný)
- [x] Persist schéma + migrace v1→v2; catch-up-safe (S-05)
- [x] Min. 1 alternativa (4 alternativy s důvody)
- [x] Výstup do artifacts/final + handoff

## Předpoklady
- Žádné nové architektonické rozhodnutí (D1-D13 beze změny). Scope OUT: trh/karavany/getGoldValue
  dynamika (M4b/iter-011), taxCenter/cityGuardHQ/hospital/inn budovy (M5), techPt produkce (M6).
- gold/techPt handlery hotové z M2a; localRate/monthlyRate/taxRate default approximated (gap M9);
  curWorkers≈workforce.assigned (G-TAX-CURWORKERS); season index dle selectors pořadí (G-SEASON-START);
  firewood bez producenta v M4a (G-FIREWOOD-SOURCE M5, alt wood).

## Blockery
–
