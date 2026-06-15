# Current Task

- **Task ID**: T-007
- **Brief**: BRIEF-019-007
- **Iteration**: iter-019
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-15
- **Completed**: 2026-06-15

## Co teď dělám
Dokončeno. Nezávislá QA M8 (story/importantEvent T1 + intro/tutoriál T2 + achievementy K18 T3 + notifikace/gamelog UI event bus T4) + DoD M8.
Verdikt **GO** — všech 11 AC empiricky ověřeno vlastním během. CI 1509/1509 pass/0 fail, smoke OK (tab Deník renderuje, 0 console errors).

## Předpoklady
- T-004..T-006 implementoval coder (iter-019, M8 T1-T4).
- Scope OUT: žádná změna produkčního kódu (necommituji — orchestrátor).

## Blockery
–

## Checklist (z briefu BRIEF-019-007)
- [x] AC1: `npm run ci` zelené — 1509 pass / 0 fail; typecheck EXIT 0; lint OK; smoke OK (tab "Deník" renderuje, 0 console errors)
- [x] AC2: emitEvent EFEMÉRNÍ — hashState identický s/bez busu (T4-1 + vlastní harness H1, 400 kroků, hash=2274103360); fronta mimo state; core nesahá na DOM (grep NONE)
- [x] AC3: Story engine-stopping save/load — mid-event bit-identický (H2 hash=647467080, deepStrictEqual story.event); story serializovatelný; ack NELOSUJE RNG (H3 deepStrictEqual rng)
- [x] AC4: Catch-up pauza D10 — MAJ-1 while-smyčka (main.js:370-395) re-vstup remaining; autosave/summary AŽ ZA smyčkou; cap neporušen; agreguje do offline summary (302 pass/0 fail)
- [x] AC5: Achievementy deterministické + idempotentní (H4 dvojí unlock no-op); reálná mutace MIN-2 (H5 grantResource/unlockMap); persist round-trip (H6)
- [x] AC6: C4 grep gate — jediné přiřazení unlocked[] = achievements.js:61 (unlockAchievement)
- [x] AC7: Tutoriál/intro e2e + persist (state.story.tutorials round-trip); texty jako data, žádná logika v UI
- [x] AC8: R-G — provenance='original-paraphrased' ve všech 4 (story12/dial2/tut3/ach15); 0 verbatim shod s originálem
- [x] AC9: Gamelog/notifikace UI — GamelogScreen nad state.log ring buffer; Deník tab; 0 console errors
- [x] AC10: M8 NEROZBIL M7/M5/M6/M4 — 292+302 pass / 0 fail; CI 1509/0
- [x] AC11: DoD M8 celkově — začátek/vedení/meta-progres/notifikace; obsahová vrstva kompletní a hratelná
- [x] QA report: artifacts/final/qa_report_iter-019_T-007.md (verdikt GO — DoD M8)
