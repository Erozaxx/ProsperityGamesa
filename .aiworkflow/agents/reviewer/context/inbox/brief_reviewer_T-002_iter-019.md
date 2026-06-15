# Brief

- **Brief ID**: BRIEF-019-002
- **Iteration**: iter-019 (M8 – Příběh & meta vrstva)
- **From**: Orchestrator
- **To**: reviewer
- **Date**: 2026-06-15

## Goal
Review **designu M8** (architektonický návrh, ne kód) před implementací. Ověř correctness, soulad s architekturou iter-002 (§3.4, §7.2, K14, K18, D10, C4), proveditelnost Sonnet coderem, a **determinismus** (engine-stopping eventy serializovatelné, catch-up pauza, UI event bus EFEMÉRNÍ mimo hashState). Posuď C4 fix (achievementy deklarativní), split a R-G postup. Architektonický gate před tom-proxy.

## Co reviewuješ
`agents/reviewer/context/refs/design_iter-019_T-001.md`

## Na co se zaměřit (kritické)
1. **C4 anti-pattern fix (klíčové)**: achievementy + story triggery jako **deklarativní predikáty** (`when: predicate-as-data`) vyhodnocené JEDNÍM centrálním evaluatorem — NE imperativní háčky rozseté po mechanikách. Design tvrdí grep gate (přiřazení `unlocked[` jen v `unlockAchievement`). Ověř, že návrh nezavádí imperativní achievement/story háčky do existujících systémů.
2. **Engine-stopping eventy serializovatelnost + catch-up pauza (D10)**: design využívá EXISTUJÍCÍ `running===false` break (`advance()` clock.js:77 + `runCatchupBatch` catchup.js:51). `acknowledgeEvent` command. `state.story.*` serializovatelné (žádné closury, speaker resolve v selektoru). Catch-up: `runCatchupBatch` vrací `interrupted`, re-vstup s `remaining` (cap neporušen). **Jediná core změna**: `advance()` zahodí akumulátor při `running===false` (paralela factor===0 pauzy). Ověř, že to nerozbije catch-up determinismus/cap a že save uprostřed eventu → identický load. **Ack nelosuje RNG** (stream nezměněn).
3. **UI event bus EFEMÉRNÍ (kritické)**: `ctx.emitEvent` (vzor `ctx.emitTx`) push do fronty **MIMO `state`** → MIMO `hashState`, neukládá se. Notifikace/confetti/hudba jen prezentace. Ověř, že engine NIKDY nesahá na DOM a že event bus neovlivní deterministický stav/hashState. Gamelog = existující `state.log` ring buffer (deterministický, persist) + UI panel.
4. **Determinismus**: story/achievementy deterministické (žádný Date.now/Math.random/DOM v core); achievementy idempotentní (stejný stav → stejné unlocky); persist (story/achievements/log).
5. **R-G licence**: texty vlastní/parafráze (`story.json`/`dialogues.json`/`tutorials.json`/přepsaný `achievements.json`, provenance:'original-paraphrased'); číselná data (army prahy, gold) = fakta, nepodléhají R-G. Posuď postup.
6. **Soulad** s architekturou (§3.4/§7.2/K14/K18/D10) + proveditelnost Sonnet; tickOrder (story.check day 90, achievements.eval day 95, story.applyEffects step 5 — append na konec, žádné přeskupení); split NE — souhlasíš?

## Acceptance Criteria
- Každý nález: blocker / major / minor / nit + konkrétní návrh.
- Explicitní verdikt: GO / GO-s-podmínkami / NO-GO.
- Explicitní posouzení C4 fix + engine-stopping/catch-up pauza determinismu + UI event bus efemérnosti + splitu.

## Inputs
- Design: `context/refs/design_iter-019_T-001.md`
- Architektura: `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md` (§3.4, §7.2, K14, K18, D10, C4)
- Master plán: `agents/project-manager/artifacts/final/iteration_master_plan_iter-003_T-001.md` (§3/iter-016(M8))
- DR-013-00
- Kód pro ověření: `src/core/engine/clock.js` (advance, running break ~77), `src/core/engine/catchup.js` (runCatchupBatch ~51), `src/core/registry/effects.js` (K14, ctx.emitTx vzor), `src/app/main.js` (ctx.emitTx ~200), `src/data/achievements.json`, `src/core/state/createInitialState.js` (story/achievements/log), `src/save/persistSchema.js`, originál `events.js`/`game.js`

## Expected Outputs
- `agents/reviewer/artifacts/final/review_design_iter-019_T-002.md`

## Workflow po dokončení
- `agents/reviewer/state/current-task.md` → done
- `bash agents/reviewer/scripts/handoff-out.sh T-002 "<verdikt + C4/event/UI-bus + split + počet nálezů>"`
- NEcommituj (git).

## Constraints
- C4 fix (deklarativní achievementy bez imperativních háčků) + engine-stopping serializovatelnost/catch-up pauza + UI event bus efemérnost (mimo hashState) prověř obzvlášť pečlivě — ověřuj proti kódu. Toto jsou nejrizikovější body.
