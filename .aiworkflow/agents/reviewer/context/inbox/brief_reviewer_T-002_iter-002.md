# Brief

- **Brief ID**: BRIEF-006
- **Iteration**: iter-002
- **From**: Orchestrator
- **To**: reviewer
- **Date**: 2026-06-12

## Goal
Zreviewovat návrh architektury projektu rebuildu (T-001 iter-002) – správnost, úplnost, proveditelnost, konzistence s iter-01 (K0–K19, R1–R4) a s cíli PWA/offline.

## Context
Architekt (Fable) dodal realizační návrh architektury (stack, vrstvení, engine+catch-up, data/save
model, R1–R4, milníky M0–M9, mapování na K0–K19). Tvoje review je quality gate před schválením
uživatelem (T-004). Architekt sám doporučil kritickou kontrolu tří bodů – zahrň je.

## Scope IN
- **Správnost & proveditelnost** klíčových rozhodnutí (registr D1–D13): dávají smysl pro
  mobile-first PWA / offline a omezení „vše v gitu, bez build kroku"?
- **Cílená kritická kontrola** (architekt vyznačil): **D1** (ES2022+JSDoc, no-build – udržitelné
  pro rozsah hry? typová bezpečnost bez TS?), **D10/R2** (cap catch-upu 8 h – dopady), **R1 drift
  trhu** (§9.1 – je klientská tržní simulace věrná a stabilní?).
- **Úplnost**: pokrývá návrh všechny body zadání T-001 (stack, vrstvení, engine, data/save,
  resource vrstva, rozpad iterací, R1–R4, rizika)? Chybí něco?
- **Konzistence s iter-01**: sedí mapování na K0–K19? Jsou R1–R4 skutečně rozhodnuté nebo jen
  pojmenované? Nejsou tam rozpory s analýzami/review z iter-01?
- **Milníky M0–M9 / MVP M0–M4**: je dělení realistické a v dobrém pořadí závislostí?
- Uveď všechny nálezy (i ne-blockery); u každého, zda vyžaduje T-003 architect rework.
- Verdikt: GO / GO s úpravami / NO-GO pro schválení uživatelem.

## Scope OUT
- Nepřepisuj návrh (případný rework je T-003). Žádná implementace.
- Nenavrhuj alternativní architekturu od nuly – posuzuj předložený návrh.

## Task List (zkopíruj do svého dílčího checklistu)
- [ ] T-002: Review návrhu architektury + verdikt + nálezy (vyžaduje/nevyžaduje T-003).

## Inputs (soubory / reference)
- `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md` (předmět review).
- `.aiworkflow/project/architecture/iter-02-input-rozcestnik.md` – vstupní rozcestník.
- iter-01: `agents/reviewer/artifacts/final/review_iter-001_T-003.md` (K0–K19, R1–R4),
  analýzy `agents/architect/artifacts/final/analysis_*_iter-001_*.md`.
- `.aiworkflow/zadani_projektu.md` – cíl/omezení.

## Acceptance Criteria
- Verdikt o správnosti, úplnosti a proveditelnosti návrhu.
- Explicitní posouzení D1 (no-build), D10/R2 (cap 8 h), R1 (drift trhu).
- Kontrola mapování na K0–K19 a reálné rozhodnutí R1–R4.
- Posouzení milníků M0–M9 / MVP.
- Seznam nálezů s označením, zda vyžadují T-003 rework.
- Jasné doporučení GO / GO s úpravami / NO-GO.

## Expected Outputs (cesty k souborům)
- `agents/reviewer/artifacts/final/review_iter-002_T-002.md`

## Risks / Constraints
- Konkrétní, doložené nálezy s odkazy na sekce návrhu. Neposuzuj implementační detail, ale architekturu.
- Model běhu: **Opus** (stabilní, důsledné ověřování).
