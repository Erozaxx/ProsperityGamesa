# Decision Record

- **ID**: DR-001
- **Date**: 2026-06-13
- **Status**: accepted
- **Related Iteration**: iter-003

## Context
iter-003 (cizelování plánu) vytvořila kompletní end-to-end plán implementačních iterací (iter-004…iter-018, milníky M0–M9) – `agents/project-manager/artifacts/final/iteration_master_plan_iter-003_T-001.md`. Plán prošel review (reviewer Opus, T-002: GO s úpravami, 0 blockerů) a reworkem (PM Fable, T-003). Při schválení (T-004) položil plán 3 otevřené otázky (Q1–Q3), na které uživatel odpověděl.

## Decision
1. **Plán schválen** uživatelem (T-004) jako závazná osnova implementačních iterací iter-004…iter-018.
2. **Q1 – MVP playtest checkpoint**: po iter-011 (MVP jádro = M0–M4) se zařazuje **povinný playtest checkpoint** s možností repriorizace M5–M9 PŘED zahájením iter-012. Není to implementační iterace, ale rozhodovací pauza uživatele.
3. **Q2 – Syntetická náhrada benchmarku**: benchmark M0 (cena kroku) a PWA smoke testy se měří synteticky (Node + dostupný prohlížeč); reálné low-end zařízení potvrdí uživatel později. Benchmark report (iter-005 DoD) to musí uvést explicitně.
4. **Q3 – Autonomní eskalace gap reportu**: chybějící katalogová data (iter-006 T6) řeší workflow autonomně – označí `provenance: 'approximated'` a pokračuje; uživatel je informován, není to blocker. Decision record se vydá jen při materiální díře měnící rozsah M2+.

## Alternatives Considered
- **Q1 Option A (zvoleno)**: playtest checkpoint po MVP. **Option B**: pokračovat rovnou M5–M9 (původní předpoklad PM) – zamítnuto, uživatel chce po MVP vyhodnotit a případně přeskládat priority.
- **Q3 Option A (zvoleno)**: PM/orchestrátor autonomně. **Option B**: uživatel rozhoduje každou eskalaci na konci iter-006 (původní předpoklad PM) – zamítnuto kvůli plynulosti workflow.

## Trade-offs
- Playtest checkpoint (Q1) přidává pauzu po iter-011, ale snižuje riziko investice do špatně prioritizovaných pozdních milníků.
- Syntetický benchmark (Q2) je méně věrný než reálné zařízení, ale odblokovává DoD M0 v agentickém prostředí; reálné potvrzení se neztrácí, jen odkládá.
- Autonomní gap eskalace (Q3) zrychluje iter-006, za cenu toho, že některé hodnoty mohou být aproximované do pozdější kalibrace (M9).

## Consequences
- Plán (§2.1, §2.2, §5) aktualizován o rozhodnutí Q1–Q3.
- iter-004 (M0a) je připravená k zahájení jako další iterace (po uzavření iter-003).
- iter-011 dostává navíc rozhodovací bránu (playtest checkpoint); orchestrátor ji nesmí přeskočit.

## Follow-up Actions
- Uzavřít iter-003 (T-005) přes `/close-iteration`.
- Při zahájení iter-004 dispatchnout dle plánu (Opus návrh tasků → Sonnet provedení → Sonnet/Haiku tester → Opus reviewer).
- Před iter-012 vyžádat playtest checkpoint od uživatele (Q1).
