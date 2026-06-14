# Current Task

- **Task ID**: T-002 (Review DESIGN M5-2 iter-014 — kontrakty K14 + build UI, architektonický gate před implementací)
- **Brief**: BRIEF-014-002
- **Iteration**: iter-014
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-14
- **Completed**: 2026-06-14

## Co teď dělám
Hotovo: Architektonický REVIEW GATE designu M5-2 (design_iter-014_T-001.md) PŘED implementací.
Ověřeno proti KÓDU (ne tvrzení): effects.js, main.js (bootstrapEngine), rng.js (STREAM_NAMES),
tickOrder.js (runTick phase 2 resolve), scheduler.js, persistSchema.js, load.js, migrations.js,
schema.js, dispatch.js, build.js, sendCaravan.js, createInitialState.js, createHomeState.js, ui/.
Výstup: agents/reviewer/artifacts/final/review_design_iter-014_T-002.md

## Výsledek
Verdikt: **GO — s podmínkami** (B1+B2+M1 zapracovat do designu PŘED kódem; M2 upřesnit init cestu).

Klíčová zjištění:
- M52-D8 KOREKTNÍ: bootstrapEngine (main.js:86-103) NEvolá registerEffects → potvrzeno proti kódu.
  registerContractEffects v boot je nutný a správný, nerozbije existující schedule resolve (idempotent register).
- Determinismus contract streamu KOREKTNÍ + G1-safe: 'contracts' na konec STREAM_NAMES — precedent 'buildings'
  z M5-1 (rng.js:9). makeRng default 0 pro staré savy, seedy existujících streamů beze změny.
- B1 (BLOCKER, navíc): registerBuild NENÍ wired v main.js (jen buyCompany) → build UI by nefungoval.
- B2 (BLOCKER): contract.offer bootstrap se pro EXISTUJÍCÍ savy nikdy nenaplánuje (applyPayload přepíše
  schedule saved heapem) → re-arm s scheduleCountOf guardem v load/boot (mirror marketInit).
- Persist round-trip OK (engine.schedule persistován); migrace bez bumpu (M1 — rozhodnutí explicitně).
- Build UI: čisté selektory+commands, žádná logika v UI (vzor CouncilScreen/MarketScreen) — soulad §3.4.
- Split: NE — T5+T6 souzní do jedné iterace (lineární závislosti, oba uzavírají DoD M5).

## Nálezy (severity)
- BLOCKER: 2 (B1 registerBuild chybí; B2 offer bootstrap pro staré savy)
- MAJOR: 2 (M1 migrace/bump rozhodnutí; M2 init contractQueue v createHomeState + cesta)
- MINOR: 4 (contractSeq round-trip test; schedule cleanup gap; registerEffects jen pokud nutné; firstOfferStep ≥1)
- NIT: 3 (fresh vs round-trip hash; title neukládat/derivovat; goodsBuyer dark katalog)

## NEcommitnuto (scope per brief). Žádný produkční kód neexistuje (čistý design review).
</content>
