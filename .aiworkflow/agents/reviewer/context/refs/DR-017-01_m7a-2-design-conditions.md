# DR-017-01 — M7a-2 designové podmínky (před implementací)

- **Datum**: 2026-06-15
- **Stav**: Rozhodnuto (reviewer GO-s-podmínkami T-002; revize T-002a, tom-proxy gate T-003)

## Rozhodnutí
Split M7a-2 NE (T2+T3+T6 jedna iterace). Self-rearm vzor OK. Před kódem zapracovat:
- **M-1 (major, anti M7a-1 regrese)**: favour se mění z number (M7a-1) na objekt {factionId:number} (originál ř.291-365). persistSchema.js:259 `favour: z.favour || 0` → `?? {}`; hydrateZones (world.js:377) musí migrovat number→objekt; zones.json favour:0 → {}. Revolt nebyl v M7a-1 aktivní (gated prázdný) → migrace nedestruktivní, ale MUSÍ být deterministická (fresh-vs-load identický hashState).
- **M-2 (major, determinismus)**: armFactionAI set-difference guard NESMÍ spoléhat na scheduleCountOf (scheduler.js:82 indexuje jen podle id, nerozliší 3 frakce processFaction) → per-faction guard: scan schedule entries dle factionId param, doplň jen chybějící frakce. Závazné, ne alternativa.
- **m-4 (minor)**: quest gating čte home.level/militaryCouncil.discovered které ve state NEEXISTUJÍ → deterministický fallback nebo existující pole (jinak reinforcement quest tichý no-op).

## Reference
- Design: agents/architect/artifacts/final/design_iter-017_T-001.md
- Review: agents/reviewer/artifacts/final/review_design_iter-017_T-002.md
