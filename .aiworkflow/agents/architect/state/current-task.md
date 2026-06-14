# Current Task

- **Task ID**: T-001 (iter-018) — Detailní DESIGN M7b (battle automat: bitvy live i offline auto-resolve)
- **Brief**: context/inbox/brief_architect_T-001_iter-018.md (BRIEF-018-001)
- **Iteration**: iter-018 (M7b – Bitvy; dokončuje M7)
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-15
- **Completed**: 2026-06-15

## Checklist (z briefu)
- [x] T1 battle automat (§8.1): battleState + battleStep, sub-step 30ms akumulátor, cooldowny 1:1, serializovatelný kill-resume
- [x] T2 damage/defense/revival vzorce → formulas.js + tabulkové testy vs orig; combat staty → military.json (G-MILITARY-STATS)
- [x] T3 battleCommand + obranná AI politika (skript dle cooldownů) = auto-resolve catch-up bez druhé implementace (G2)
- [x] T4 invaze + bandité: napojení startBattle stub (M7a-2) + bandit schedule; výsledky do offline summary
- [x] T5 battle UI (commands/progress/log, selektory + commands)
- [x] Povinná rozhodnutí: determinismus, SPLIT, G-MILITARY-STATS, tickOrder, persist state.battle

## Výstup
**`artifacts/final/design_iter-018_T-001.md`** — pokrývá T1–T5 pro Sonnet codera.

Ověřeno proti kódu: battle.js (stub battleStep/battleTick ř.29/44, BattleState kontrakt ř.11),
world.js (startBattleStub :1189, processAI state6 :1083, aiBattleResolve wiring, takeOver :1178),
clock.js (step :44, STEP_MS=50), catchup.js (runCatchupBatch volá step :50), tickOrder.js
(battle.tick step/30 :230, runTick systemFn signatura), rng.js (makeRng 'battle' :32, stream :10),
persistSchema.js (battle allowlist :300), formulas.js (aiBattleResolve :380 vzor, battle vzorce přidat),
OfflineSummary.js (buildOfflineSummary PURE model), military.json (warrior/archer bez combat statů).
Originál battle.js (create/startBattle/end/attackWith/attacks/getDamage ř.54-629 = zdroj pravdy).

## Klíčová rozhodnutí
- **SPLIT M7b = NE** (fallback M7b-1/M7b-2 otevřen). G2 strukturálně zadarmo (battle.tick every:'step'
  → catch-up i live volají identický step()); T2/T3/T4/T5 jsou přírůstky/wiring, ne paralelní L. Vzor M5-2/M7a-2.
- **battleStep signatura beze změny** (kontrakt §8.1). Sub-step akumulátor v battleTick: subAccMs += STEP_MS(50);
  while ≥30: battleStep (BATTLE_TICK_MS=30, žádný druhý časovač → drží G2+determinismus).
- **Cooldowny 1:1** z orig: charge 80/shieldWall 150/flank 180/volley 120/fireArrows 220, reaction 60.
- **Damage** ceil(max(sqrt(n),n/10)*str*mult*(crit?1.5:1)) + battleDefense + revive(player det / AI rng/4) → formulas.js.
- **G2 auto-resolve**: obranná AI politika (skript dle cd) uvnitř battleStep když queue prázdná = stejná cesta live i offline.
- **Kill-resume**: celý state.battle (subAccMs/cd/tick/queue) v save → fresh==load hashState.
- **G-MILITARY-STATS**: combat staty approx + provenance flag, kalibrace M9 (R-F).
