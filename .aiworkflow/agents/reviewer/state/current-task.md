# Current Task

- **Task ID**: T-009 (REVIEW GATE M7b + DoD M7, iter-018, Opus, právo re-run)
- **Brief**: BRIEF-018-009
- **Iteration**: iter-018
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-15
- **Completed**: 2026-06-15

## Co teď dělám
Hotovo: Závěrečný review gate M7b + ověření DoD M7, ověřeno PROTI KÓDU i PROTI ORIGINÁLU (doc/original_source battle.js ř.54-629).

## Výsledek
Verdikt: **GO**. DoD M7 **SPLNĚN** — milník kompletní. CI 1385/1385 (ověřeno reviewerem).

Tvrdé invarianty 1-6 všechny ✓:
1. Kontrakt §8.1 beze změny (battleStep PURE, cloneBs).
2. Serializovatelnost F-1: liege=string, lastAttackId=string|null, žádný army self-ref, žádné closury (rng lokálně v battleTick), žádné undefined. JSON round-trip OK.
3. G2 == live: battle.tick every:'step' order 30; advance(clock.js:44) i runCatchupBatch(catchup.js:50) volají identický step(). Žádná druhá implementace. Offline=prázdná queue→obranná AI.
4. Determinismus 1:1: jediný rng('battle'), žádný Math.random. M-1 (?? ne ||, fallback 0.25), M-2 (opponent double cd-decrement 1:1 orig ř.265-291, ověřeno řádek-po-řádku), M-3 (crit 1× po guardu, NE per cíl, NE 2×).
5. battle.js stub plně nahrazen (862 ř.), startBattle/banditRaid/armBanditRaid wired (main.js:216, world.js:1229-1230).
6. UI bez logiky: BattleScreen pure, deriváty v selectBattle.

## Nálezy (severity)
- BLOCKER: 0
- MAJOR: 0
- MINOR: 2 (MIN-1 player-ATTACKING outcome větev neaktivní cesta nad rámec orig; MIN-2 atStep=startedAtStep hraniční offline filtr)
- NIT: 4 (validace battleCommand vs getAttacks DRY; lastMaxCD magic; thumbRing obě strany 1:1; bandit numbers inline)

Žádný nález nebrání GO. Determinismus (replay+kill-resume+G2+1:1) POTVRZEN.

Výstup: agents/reviewer/artifacts/final/review_iter-018_T-009.md

## NEcommitnuto (per brief).
