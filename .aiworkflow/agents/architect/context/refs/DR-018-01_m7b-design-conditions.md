# DR-018-01 — M7b designové podmínky (před implementací)

- **Datum**: 2026-06-15
- **Stav**: Rozhodnuto (reviewer GO-s-podmínkami T-002; revize T-002a, tom-proxy gate T-003)

## Rozhodnutí
Split M7b NE (T1-T5 jedna iterace; M7b-1 by byl nehratelný – spouštěč startBattleStub v T4). G2 auto-resolve==live potvrzeno STRUKTURÁLNĚ ZADARMO proti kódu (advance+runCatchupBatch→stejný step→battle.tick every:'step' order 30). Kill-resume serializovatelnost dosažitelná (full passthrough state.battle, žádné closury – makeRng lokální v battleTick). Před kódem zapracovat:
- **M-1 (major)**: state.player.baseRevival v repu NEEXISTUJE (grep=0) → deterministický fallback z BALANCE (jinak NaN v revival vzorci).
- **M-2 (major)**: opponent AI v originálu dekrementuje cd DVAKRÁT za tick (attackWith nastaví cd + samostatný cd-- ř.274-290) → portovat 1:1, jinak posun reaction timingu vs referenční testy.
- **M-3 (major)**: crit roll vytažený z getDamage ven jako bool → počet rng.next() musí být PEVNÝ (1× per skutečně provedený útok PO guardu), jinak divergence rng stream pozice.
- **Serializovatelnost ostraha (F-1)**: passthrough nesanitizuje → coder NESMÍ zavést neserializovatelné (originálova cyklická units.army ref ř.249, objektové liege/lastAttack) → string liege/lastAttackId.

## Reference
- Design: agents/architect/artifacts/final/design_iter-018_T-001.md
- Review: agents/reviewer/artifacts/final/review_design_iter-018_T-002.md
