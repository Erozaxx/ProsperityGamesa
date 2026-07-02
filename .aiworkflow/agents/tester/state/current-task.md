# Current Task

- **Task ID**: T-006
- **Brief**: finální re-verify Vlny 2 (#3/#4/#5/#6/#8/#9) + regrese Vlny 1 + Go/No-Go (iter-022)
- **Iteration**: iter-022
- **Status**: in-progress  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-07-02

## Co teď dělám
Re-verify Vlny 2 na HEAD `16f4ea4`. Harness `e2e-rum.mjs` aktualizován (F9 hardcoded
IMPORT-NO-ERROR-FEEDBACK nahrazen reálným DOM čtením `.banner-import-error`; F6 přepsán na
skutečný recruit-klik test s offline gold-accrual; F4 skills sekce testuje katalog + Spustit;
F1 měří computed gap `.stats`). Běží plný běh F1–F9 + reverify-wave1.mjs.

## Checklist (z briefu T-006)
- [x] Přečíst AGENTS.md, coder záznam wave2_iter-022.md, původní report #3–#9
- [x] Opravit hardcoded assert v e2e-rum.mjs F9 (reálné DOM čtení error banneru)
- [x] Rozšířit harness: #3 reálný recruit klik, #4 katalog+Spustit, #5 banner/fallback, #6 import→reload, #9 gap
- [x] `npm run ci` — 1566/1566 pass
- [x] Regrese Vlny 1 (reverify-wave1.mjs) — failures=0, RUM čistá
- [ ] Plný běh e2e-rum.mjs na HEAD → verdikty #3/#4/#5/#6/#8/#9
- [ ] Report `artifacts/final/reverify-wave2_iter-022.md` + Go/No-Go
- [ ] current-task.md → done + handoff-out.sh

## Blockery
–
