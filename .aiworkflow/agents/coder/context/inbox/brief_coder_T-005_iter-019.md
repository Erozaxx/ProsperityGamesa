# Brief

- **Brief ID**: BRIEF-019-005
- **Iteration**: iter-019 (M8)
- **Task**: T-005 = T3 (achievementy deklarativně K18)
- **From**: Orchestrator
- **To**: coder (Sonnet)
- **Date**: 2026-06-15

## Goal
Implementuj **T3 (achievementy deklarativně K18)** dle designu. Achievementy jako **deklarativní predikáty** (data) vyhodnocené JEDNÍM centrálním evaluatorem — NE imperativní háčky (C4 anti-pattern). Sdílí `predicate.js`/`evalPredicate` z T1 (hotové). Design je source of truth.

## Source of truth
`agents/coder/context/refs/design_iter-019.md` — čti **T3 (achievementy K18, §7.2)**. DR-019-01 (MIN-2, MIN-4). T-004 summary (predicate.js evalPredicate sdílený).

## ⚠️ Tvrdé invarianty
1. **C4 anti-pattern fix**: achievementy NESMÍ být imperativní háčky rozseté po mechanikách. JEDEN centrální evaluator (`achievementsEval`, day order 95 + volitelně tx přes `ctx.emitTx`). **Grep gate**: přiřazení `unlocked[`/`achievements.unlocked[` JEN v `unlockAchievement` (nikde jinde po mechanikách).
2. **Deklarativní**: `achievements.json` + `when: predicate-as-data`; predikáty přes sdílený `evalPredicate` (`src/core/systems/predicate.js` z T1).
3. **MIN-2 effects stuby**: `effects.js` stuby `unlockMap`/`grantResource` (dnes jen `console.log`) → přepsat na **REÁLNOU mutaci** (jinak tichý no-op při unlocku).
4. **MIN-4 evalPredicate path-getter**: ŽÁDNÁ runtime větev dle `process.env` v core (no-build/R-I) — pokud predicate.js má dev/prod path-getter, řeš lintem na neexistující path, ne nedeterministickou větví.
5. **Determinismus**: achievementy idempotentní (stejný stav → stejné unlocky, žádný re-unlock); žádný Date.now/Math.random/DOM v core; `state.achievements` (unlocked) persist.

## Scope IN (T3)
- `achievements.json`: doplnit `when: predicate-as-data` ke každému achievementu (dnes jen id/name/description/level). Texty vlastní/parafráze (R-G, provenance flag).
- `achievementsEval` systém (day order 95) + tx hook (ctx.emitTx) — centrální vyhodnocení deklarativních predikátů → `unlockAchievement(id)`.
- `unlockAchievement`: zapíše `state.achievements.unlocked[id]`, spustí unlock efekt (mapy/mechaniky dle designu přes registr efektů K14, MIN-2 reálná mutace).
- `state.achievements` persist (unlocked) + round-trip.

## Scope OUT
- importantEvent/story = T1 (hotovo, predicate.js sdílený). Intro/tutoriál + gamelog UI = T2+T4 (T-006). NEsahej M7.

## Gate (Definition of Done)
- `npm run ci` ZELENÉ (0 fail, typecheck projde) — uveď počet testů. Přidej testy (NOVÝ soubor např. `test/m8-achievements.test.js`): achievement unlock při splnění predikátu (deterministicky), idempotence (stejný stav → žádný re-unlock), unlock efekt reálná mutace (MIN-2), persist round-trip, **grep gate test** (žádné imperativní `unlocked[` přiřazení mimo unlockAchievement — můžeš jako meta-test nebo dokumentovat).
- `npm run smoke` OK.
- **Determinismus G1** + **M8 story (m8-story)** + M7/M5/M6 nedotčené; žádný Date.now/Math.random/DOM v core.
- Precache regen jen při změně zdroje ovlivňujícího manifest (achievements.json změna → pravděpodobně regen).

## Inputs
- Design: `context/refs/design_iter-019.md` (T3), DR-019-01
- T-004 summary (predicate.js evalPredicate)
- Kód: `src/data/achievements.json`, `src/core/systems/predicate.js` (evalPredicate sdílený), `src/core/registry/effects.js` (unlockMap/grantResource stuby MIN-2), `src/core/state/createInitialState.js` (achievements stav), `src/save/persistSchema.js`, `src/core/engine/tickOrder.js`, `src/app/main.js` (ctx.emitTx), originál `game.js` (achievement triggery)

## Workflow po dokončení (POVINNÉ — všechny 3)
- `agents/coder/state/current-task.md` → **Task ID: T-005 (iter-019)**, status: done
- `agents/coder/artifacts/final/impl_summary_iter-019_T-005.md` (soubor:funkce, gate výstup, C4 grep gate, MIN-2/MIN-4)
- `bash agents/coder/scripts/handoff-out.sh T-005 "<stručně + gate výsledek>"`
- NEcommituj (git).
