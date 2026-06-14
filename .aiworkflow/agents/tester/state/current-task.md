# Current Task

- **Task ID**: T-006
- **Brief**: BRIEF-014-006
- **Iteration**: iter-014
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-14
- **Completed**: 2026-06-14

## Co teď dělám
Dokončeno. Nezávislá QA M5-2 (kontrakty K14 + build UI) + DoD M5 celkově.
Verdikt **GO** — všech 9 AC empiricky ověřeno vlastním během.

## Předpoklady
- T5 (kontrakty) implementoval coder iter-014.
- T6 (build UI + ContractsScreen) zachránil orchestrátor (coder zemřel před handoffem).
- Scope OUT: žádná změna produkčního kódu.

## Blockery
–

## Checklist (z briefu BRIEF-014-006)
- [x] AC1: `npm run ci` zelené — 990/990 pass, 0 fail; smoke OK (Stavba+Kontrakty taby renderují)
- [x] AC2: Kontrakty lifecycle — offer→accept→complete (pay+grant getGoldValue); expire (deadlineStep); reject. Registr efektů, deterministické
- [x] AC3: B2 re-arm — starý save BEZ offer → arm → 1 offer; M5-2 save → no-op; idempotentní (3× volání = 1)
- [x] AC4: Determinismus — seed → stejné kontrakty; rng stream 'contracts' izolovaný (G1 nedotčen); hash round-trip
- [x] AC5: Catch-up-safe — 365 herních dní (328,500 steps) bez crashe; determinismus (h1=h2)
- [x] AC6: Persist round-trip — contractQueue/contractSeq/schedule eventy přežijí; M5-1 domény nedotčeny
- [x] AC7: Build UI funkční (B1) — build reálně staví (wood odečten, projekt do fronty); buyCompany PASS; ContractsScreen accept/reject/complete PASS; žádná logika v UI
- [x] AC8: SAVE_VERSION = 3, starý save se načte
- [x] AC9: DoD M5 celkově — město roste, kontrakty běží, modifikátory čistě, vše z UI — M5 kompletní hratelný
- [x] QA report: artifacts/final/qa_report_iter-014_T-006.md (verdikt GO)
