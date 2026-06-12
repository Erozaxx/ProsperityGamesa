# Brief

- **Brief ID**: BRIEF-003
- **Iteration**: iter-001
- **From**: Orchestrator
- **To**: reviewer
- **Date**: 2026-06-12

## Goal
Zreviewovat tři architektonické analýzy (T-001, T-002a, T-002b) – úplnost, technická správnost, proveditelnost – a zkonsolidovat jeden prioritizovaný refactoring seznam pro rebuild.

## Context
Iterace iter-001 je analytická: tým architekta (model Fable) dodal (1) analýzu klíčových
mechanik originálu Prosperity a (2) dvě analýzy refactoring kandidátů (výkon/offline/server +
údržba/architektura). Cíl projektu = věrný rebuild jako mobile-first PWA, offline. Tvoje review
je quality gate před schválením uživatelem (T-005). Nejsi autor – buď kritický, ale férový.

## Scope IN
- **Úplnost**: pokrývají analýzy všechny hlavní mechaniky/roviny? Chybí něco podstatného?
- **Technická správnost**: ověř namátkou klíčová tvrzení a „nalezené bugy" originálu proti
  zdroji v `doc/original_source/` (alespoň ty s vysokým dopadem – např. canAfford bez fish,
  Skills.step 2× za krok, /market precedence, home.js:970, Engine.curStep undefined). Označ,
  co je potvrzené / nepotvrzené / sporné.
- **Proveditelnost & priorita**: dávají doporučení a priority (High/Med/Low) smysl pro cíl
  PWA/offline? Nejsou over-engineered nebo naopak podceněné?
- **Konsolidace**: slož **jeden prioritizovaný seznam** refactoring kandidátů napříč T-002a+T-002b
  (sjednoť překryvy, vyřeš konflikty priorit), použitelný jako vstup pro plánování dalších iterací.
- Uveď všechny nálezy (nejen blockery): nesrovnalosti, mezery, doporučené úpravy.

## Scope OUT
- Nepřepisuj analýzy (to je případně T-004 architect rework dle tvých nálezů).
- Nenavrhuj kompletní novou architekturu ani stack.
- Žádná implementace.

## Task List (zkopíruj do svého dílčího checklistu)
- [ ] T-003: Review tří analýz + konsolidovaný prioritizovaný refactoring seznam.

## Inputs (soubory / reference)
- `agents/architect/artifacts/final/analysis_keymechanics_iter-001_T-001.md`
- `agents/architect/artifacts/final/analysis_refactoring_perf-offline_iter-001_T-002a.md`
- `agents/architect/artifacts/final/analysis_refactoring_maintainability_iter-001_T-002b.md`
- `doc/original_source/modules/prosperity/` – zdroj pro ověření tvrzení.
- `.aiworkflow/zadani_projektu.md` – cíl a kontext.

## Acceptance Criteria
- Verdikt o úplnosti, správnosti a proveditelnosti každé ze tří analýz.
- Namátkové ověření ≥5 high-impact tvrzení/bugů proti zdroji se závěrem potvrzeno/ne.
- Seznam konkrétních nálezů/úprav (i ne-blockerů) s tím, zda vyžadují T-004 rework.
- **Jeden konsolidovaný prioritizovaný refactoring seznam** (sjednocené T-002a+T-002b).
- Jasné doporučení: GO / GO s úpravami / NO-GO pro schválení uživatelem.

## Expected Outputs (cesty k souborům)
- `agents/reviewer/artifacts/final/review_iter-001_T-003.md`

## Risks / Constraints
- Neopisuj analýzy – posuzuj je. Konkrétní, doložené nálezy s odkazy.
- Model běhu: **Opus** (stabilní, důsledné ověřování).
