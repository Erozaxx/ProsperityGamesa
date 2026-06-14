# DR-014-01 — M5-2 designové podmínky (před implementací)

- **Datum**: 2026-06-14
- **Stav**: Rozhodnuto (reviewer GO-s-podmínkami T-002; revize T-002a, tom-proxy gate T-003)

## Rozhodnutí
Split M5-2 NE (T5+T6 jedna iterace). Před kódem zapracovat do designu:
- **B1 (blocker)**: `registerBuild(creg)` přidat do `bootstrapEngine` (main.js) — build command z M5-1 NENÍ wired → "dark code", build UI by selhal (`unknown command`). Latentní díra z iter-013, odhalena build UI.
- **B2 (blocker)**: `contract.offer` generátor se pro EXISTUJÍCÍ savy nenaplánuje (applyPayload přepíše engine.schedule saved heapem). Re-arm se `scheduleCountOf` guardem v load/boot (mirror `marketInit`, který už běží fresh i po loadu).
- **M1 (major)**: rozhodnutí o `SAVE_VERSION`/migraci explicitně v designu. Nová pole pod undefined-guardem → bump nemusí být nutný, ALE B2 (schedule re-arm) je nutný zvlášť (migrace pole nepokrývá schedule).

## Reference
- Design: agents/architect/artifacts/final/design_iter-014_T-001.md
- Review: agents/reviewer/artifacts/final/review_design_iter-014_T-002.md
