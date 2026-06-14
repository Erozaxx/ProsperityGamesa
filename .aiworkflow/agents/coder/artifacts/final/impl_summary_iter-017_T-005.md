# Implementation Summary — iter-017 T-005 (M7a-2 T3)

- **Task ID**: T-005 (iter-017)
- **Task**: T3 milník M7a-2 — revolty + questy + tribute výběr + AI-AI bitvy vzorcem
- **Date**: 2026-06-15
- **Status**: done

## Změněné soubory a funkce

### src/core/systems/world.js
- **processZone**: naplněn revolt+quest gated blok (`if curStep > revoltMechanicStart`) — volá `processRevolt` a `processQuestGen`
- **processRevolt** (nová): revolt favour-drain vzorec 1:1 originál ř.282-369; immune kombinace, drain vzorec (base-2 + policy + units + region), revolt trigger (favour<5 → revert liege), decay (liege==originalLiege per-faction)
- **fixFavourLimits** (nová helper): clamp favour do BALANCE.world.favourLimits
- **processQuestGen** (nová): quest generování — gating (settlementLevel, hasMilitary proxy, liege==originalLiege), reinforcement quest, deterministické ID (questSeq), deadlineStep absolutní, scheduleInsert(world.questExpire)
- **gatherTributes** (nová, exportovaná): month periodikum order 25; player zóny → grant; AI zóny → capital.resources.gold; homeZone skip
- **findQuest** (nová, exportovaná): helper pro quest commands
- **removeQuest** (nová, exportovaná): helper pro quest commands
- **questExpire** (nová): schedule handler world.questExpire — idempotentní expirace
- **loadImportantEventStub** (nová): M8 stub pro revolt event
- **registerWorldEffects**: přidány handlary: loadImportantEvent (M8 stub), world.questExpire, world.gatherTributes
- **import grant**: přidán import z transactions.js

### src/core/balance/formulas.js
- **aiBattleResolve** (nová, exportovaná): AI-AI bitva RNG vzorec 1:1 originál ř.952-981; čistá fn s rng param; vrací { warrResults, archResults, attackerWins, newAtkWarriors, newAtkArchers, newDefWarriors, newDefArchers }

### src/core/commands/quests.js (nový soubor)
- **acceptQuest**: validace questId, warriors/archers deduct, gold grant, favour grant, removeQuest
- **rejectQuest**: validace questId, removeQuest, žádná penalizace
- **registerQuestCommands**: registrace do command registry

### src/core/engine/tickOrder.js
- **registerCorePeriodics**: přidán import `gatherTributes`, register `world.gatherTributes`, periodikum `{ id: 'world.gatherTributes', every: 'month', order: 25 }`

### src/app/main.js
- **bootstrapEngine**: přidán import `registerQuestCommands`, volání `registerQuestCommands(creg)` (anti-dark-code B1)

### test/m7a2-world-t3.test.js (nový soubor)
- 35 testů pro T3: revolt deterministické, gating, immune, trigger, decay; quest gating, generování deterministické, accept/reject; gatherTributes player+AI zóny; aiBattleResolve tabulkový; persist round-trip quests/questSeq/favour; fresh-vs-load hashState

## Gate výsledek

- **npm run ci**: 1227 tests, 0 fail (baseline bylo 1192, přiblo 35 nových T3 testů)
- **npm run smoke**: SMOKE OK, 0 console errors
- **G1 determinismus**: žádný Math.random/Date.now v core, jediný rng('world') stream
- **M7a-1 round-trip (m7a-world-t1)**: PASS
- **T2 (m7a2-world-t2)**: PASS
- **M5 (m5-contracts, m5-buildings-t1)**: PASS
- **M6 (m6-tech-research)**: PASS
- **M4b (m4b-market-caravan)**: PASS
- **battle.js**: NEDOTČEN
- **Determinismus**: revolt deterministický (bez rng), quest deterministický (rng('world')), tribute deterministický
- **fresh-vs-load**: hashState identický; favour migrace number→{} funguje
- **catch-up-safe**: vše schedule-driven nebo periodikum, O(1)/tick

## Scope IN splněno
- Revolty (§4.1): favour-drain gated revoltMechanicStart, immune, trigger, decay, fixFavourLimits
- Questy (§4+§5.1): questSeq, rng('world'), getGoldValue, absolutní deadlineStep, accept/rejectQuest commands, gating přes home.settlementLevel + totWarriors+totArchers; world.quests/questSeq v persist (already in PERSIST_SCHEMA.world)
- Tribute výběr (§4.4): gatherTributes month edge order 25, player→grant, AI→capital gold
- AI-AI bitvy: aiBattleResolve v formulas.js 1:1 originál; battle.js NEDOTČEN
