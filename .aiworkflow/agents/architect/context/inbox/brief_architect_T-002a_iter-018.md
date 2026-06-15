# Brief

- **Brief ID**: BRIEF-018-002a
- **Iteration**: iter-018 (M7b)
- **From**: Orchestrator
- **To**: architect (revize tvého T-001 designu)
- **Date**: 2026-06-15

## Goal
Revize tvého `design_iter-018_T-001.md` — zapracuj **3 major** podmínky z reviewer gate (T-002, GO-s-podmínkami). Vážou codera na 1:1 originál + determinismus, NEmění architekturu. Stále design, ne kód. Detaily: `agents/architect/context/refs/review_design_iter-018_T-002.md`.

## Zapracuj (podmínky před implementací)
1. **M-1 (major) — baseRevival fallback**: `state.player.baseRevival` v repu NEEXISTUJE (reviewer grep = 0). Tvůj revival vzorec by dal NaN. Předepiš **deterministický fallback z `BALANCE`** (např. `BALANCE.army.baseRevival` s konkrétní approx hodnotou z originálu) — uveď přesně odkud revival vstup bere a že to musí být deterministické (žádné chybějící pole).
2. **M-2 (major) — opponent AI cd double-decrement**: V originálu opponent AI dekrementuje cooldown **DVAKRÁT za tick** — `attackWith` nastaví cd A samostatný `cd--` (orig ř.274-290). Předepiš coderovi **portovat 1:1** (zachovat dvojí dekrement), jinak se posune reaction timing a referenční tabulkové testy nesednou. Uveď přesnou sekvenci.
3. **M-3 (major) — crit rng pevný počet**: Přesunul jsi crit roll z `getDamage` (originál) ven jako bool — architektonicky OK, ALE počet `rng.next()` MUSÍ být **pevný = 1× per skutečně provedený útok PO guardu** (ne před guardem, ne 2×). Jinak divergence pozice rng('battle') streamu → nedeterminismus. Předepiš přesně KDY se crit rng losuje (po útok-guardu, 1×) a že replay/kill-resume to musí ověřit.
4. **Serializovatelnost ostraha (F-1)**: passthrough `state.battle` nesanitizuje → coder NESMÍ zavést neserializovatelné hodnoty: originálova **cyklická `units.army` reference** (ř.249), objektové `liege`/`lastAttack`. Předepiš **string `liege`/`lastAttackId`** (jak už design má) a explicitně zakaž cyklické/funkční reference v state.battle.

Minor/nit (5+3) zapracuj dle uvážení.

## Scope OUT
- Žádný kód. Žádná změna architektury iter-002 ani kontraktu §8.1. Frakční AI/zóny = M7a (NEsahej processAI).

## Inputs
- Tvůj design: `agents/architect/artifacts/final/design_iter-018_T-001.md`
- Review (3 major/5 minor/3 nit, vše s návrhem): `agents/architect/context/refs/review_design_iter-018_T-002.md`
- DR-018-01 (`context/refs/`)
- Kód/originál pro ověření: `src/core/state/createHomeState.js` (baseRevival? — neexistuje), `src/core/balance/balance.js` (kam baseRevival), originál `doc/original_source/modules/prosperity/services/battle.js` (ř.249 units.army, ř.274-290 cd double-decrement, getDamage crit, revival)

## Acceptance Criteria
- M-1, M-2, M-3 + F-1 explicitně vyřešeny (přesná místa/sekvence/zdroje).
- M-1: deterministický baseRevival zdroj.
- M-2: 1:1 cd double-decrement sekvence.
- M-3: pevný počet rng.next() (1×/útok po guardu).
- F-1: žádné neserializovatelné v state.battle (string liege/lastAttackId).

## Expected Outputs
- Aktualizuj `design_iter-018_T-001.md` in-place (changelog "Revize T-002a: …") nebo nový doc — zvol jedno, uveď v handoffu platný.

## Workflow po dokončení
- `agents/architect/state/current-task.md` → done
- `bash agents/architect/scripts/handoff-out.sh T-002a "<jak vyřešeny M-1/M-2/M-3/F-1 + platný doc>"`
- NEcommituj (git).
