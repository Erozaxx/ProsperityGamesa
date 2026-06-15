# Current Task

- **Task ID**: T-002a (iter-018) — Revize DESIGN M7b (3 major + serializovatelnost ostraha z reviewer gate)
- **Brief**: context/inbox/brief_architect_T-002a_iter-018.md (BRIEF-018-002a)
- **Předchozí**: T-001 (BRIEF-018-001) — done
- **Iteration**: iter-018 (M7b – Bitvy; dokončuje M7)
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-15
- **Completed**: 2026-06-15

## Revize T-002a — výstup
**`artifacts/final/design_iter-018_T-001.md`** aktualizován IN-PLACE (jediný platný doc; changelog "Revize T-002a"). Zapracovány 3 major + F-1:
- **M-1** (baseRevival): nový **§6.1a** — závazný deterministický zdroj `state.player.baseRevival ?? BALANCE.battle.baseRevivalDefault (=0.25, provenance)`, pole v repu neexistuje (grep=0, ověřeno createHomeState.js); bonusy z `unlockedTechs` (existuje); `??` ne `||`; revivePlayer bere baseRevival parametrem; čte se v resolveBattleOutcome (§8.3 bod 1 + §6.5 bod 4 zpřísněno).
- **M-2** (opponent cd double-decrement): **§7.3 přepsáno** — přesná 1:1 sekvence orig ř.265-291 (`cd--` clamp≥0 PO attackWith, KAŽDÝ tick i v ticku útoku, warriors→archers; player jen 1× na začátku — záměrná asymetrie). §3.3 krok 5 odkazuje. Reaction test §10.8.
- **M-3** (crit rng pevný počet): **§4 bod 5 + M-3 blok** — crit `rng.next()<critChance` PŘESNĚ 1× per útok s focus PO guardu (number>0 && cd==0), NE před guardem, NE per focus cíl, NE pro útoky bez focus, NE 2×. §11 + test §10.7 (počet spotřeb + pozice streamu).
- **F-1** (serializovatelnost): nový **§8.1a** — tabulka zákazu: žádná cyklická `units.army` (orig ř.249/251), objektové liege/lastAttack (ř.469), funkce, undefined; POVINNĚ `liege:string`, `lastAttackId:string|null`. JSON round-trip test §10.9.
- Ověřeno PROTI ORIGINÁLU: ř.249/251 (army cyklus), ř.274-291 (double cd--), ř.311-318 (revival/baseRevival), ř.443 (crit v getDamage po guardu ř.472). PROTI REPU: baseRevival grep=0, BALANCE.battle neexistuje, unlockedTechs existuje.

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
