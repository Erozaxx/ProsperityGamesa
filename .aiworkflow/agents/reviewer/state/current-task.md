# Current Task

- **Task ID**: T-007 (Závěrečný review gate M5-2 iter-014 — kontrakty K14 + build UI + DoD M5, právo re-run)
- **Brief**: BRIEF-014-007
- **Iteration**: iter-014
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-14
- **Completed**: 2026-06-14

## Co teď dělám
Hotovo: Závěrečný REVIEW GATE M5-2 + ověření DoD M5 (celý milník) PROTI KÓDU (diff ecfb479..HEAD).
Ověřeno: contracts.js (system+commands), main.js (B1 bootstrapEngine + B2 bootSequence/armContractOffer),
rng.js (stream 'contracts' na konci), tickOrder.js (phase2 resolve), scheduler.js, registry.js (idempotent register),
load.js/persistSchema.js (undefined-guard allowlist), createHomeState.js, transactions.js, market.js (getGoldValue),
selectors.js + screens.js + App.js (zachráněná build UI), balance.js, schemas.js, gap-report.json.
Nezávislý běh testů: m5-contracts 51/51, ui-selectors-t6 14/14, iter005-edge G1 16/16.
Výstup: agents/reviewer/artifacts/final/review_iter-014_T-007.md

## Výsledek
Verdikt: **GO** (jediná ne-funkční podmínka: doplnit gap-report — MINOR, neblokuje merge/hratelnost).
DoD M5: **KOMPLETNÍ a hratelný.**

Klíčová zjištění:
- Všech 6 tvrdých invariantů PLATÍ proti kódu (K14 string-ID v datech; determinismus+serializace; B2 idempotentní
  re-arm s scheduleCountOf guardem vedle marketInit; B1 registerBuild+contract commands/effects wired;
  žádná logika v UI; žádný Date.now/Math.random/DOM, SAVE_VERSION=3).
- Zachráněná build UI (T6): ÚPLNÁ a funkční — BuildScreen 4 sekce + ContractsScreen accept/reject/complete,
  taby, deriváty v selektorech, pure komponenty. Žádný nález.
- rng 'contracts' na konci STREAM_NAMES → seedy ostatních streamů beze změny; G1 hash nedotčen.
- Persist round-trip OK; staré savy přes undefined-guard + B2 re-arm.

## Nálezy (severity)
- BLOCKER: 0
- MAJOR: 0
- MINOR: 1 (gap-report.json neaktualizován: 4 contract gapy chybí, summary.byMilestone nekonzistentní, _meta stale iter-013)
- NIT: 2 (resolveEffect silent-fallback vs fail-fast; pctComplete heuristika bez acceptedStep reference)

## NEcommitnuto, kód neopravován (per brief).
