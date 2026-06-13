# Brief

- **Brief ID**: BRIEF-012-003
- **Iteration**: iter-012
- **From**: Orchestrator
- **To**: architect
- **Date**: 2026-06-13

## Goal
Zapracovat nálezy z review (T-002) do architektonického návrhu — odstranit mylný narrativ A2, re-diagnostikovat, opravit pořadí a fakta, rozhodnout robustnost catalog-less.

## Context
Reviewer (T-002) + orchestrátor empiricky ověřili: **A2 jako produkční fix je no-op**. `gold`/`techPt` JSOU v `src/data/resources.json` (kind), takže s načteným katalogem `resourceKindOf('gold')==='gold'` a handler čte `player.gold` správně. Mylně z toho plyne i §7 (accounting NEBYL porušen — test je zelený) a §3 (crime nehází vždy). Pozorované „Zlato 0" je důsledek A1 (prázdný start), ne A2.

ALE: ověřeno, že **bez načteného katalogu** (catalog-less test harnessy jako `calendar.test`, který katalogy nenahrává) `resourceKindOf('gold')==='resource'` → `pay({gold})` hází. A1 seed (pop>0) tyto testy rozbije, protože crime začne platit gold. Tuto robustness mezeru musíš v návrhu vyřešit.

**Přečti DR-012-01** (`orchestration/decisions/DR-012-01_A2-resolver-no-op-vs-catalog-less-hardening.md`) — shrnuje rozhodnutí a varianty A/B.

## Scope IN
- Revidovat `agents/architect/artifacts/final/architecture_playability_iter-012_T-001.md` (uprav přímo tento soubor nebo vydej v2 — viz Expected Outputs).
- §2 (A2): přepsat — není produkční blocker; vyřešit catalog-less robustnost volbou **Option A** (defensivní early-return v `resourceKindOf` pro gold/techPt) NEBO **Option B** (načíst katalogy v dotčených test harnessech). Doporuč a zdůvodni. Orchestrátor preferuje A.
- §3 (A3): opravit tvrzení „crime hází vždy"; crime má clamp, throw byl jen catalog-less. Ponech pojistku + test.
- §7 (accounting): opravit — invariant NEBYL v běhu porušen.
- §9 (diagram): srovnat s realitou (s katalogem `gold`→`gold`).
- Re-diagnostikovat playtest finding #2 („Zlato 0" = A1, ne A2).
- Opravit fakta: `DAYS_PER_YEAR = 364` (ne 360/365); market má 6 sloupců (ne 5); `load.js` smazat příslušné řádky; migrační sanity-cap; rename v `population.test.js`.
- Aktualizovat doporučené pořadí implementace na: **A1 → A4 → A3 (jen test) → A5** + zvolená varianta robustnosti.

## Scope OUT
- Implementace (coder T-005+).
- Plná balanc kalibrace (M9).

## Task List (zkopíruj do svého dílčího checklistu)
- [ ] T-003: Zapracovat review T-002 do návrhu (revize §2/§3/§7/§9 + re-diagnóza + fakta + pořadí + volba A/B)

## Inputs (soubory / reference)
- `agents/reviewer/artifacts/final/review_architecture_iter-012_T-002.md` (nálezy — řiď se jimi)
- `agents/architect/artifacts/final/architecture_playability_iter-012_T-001.md` (revidovaný dokument)
- `orchestration/decisions/DR-012-01_A2-resolver-no-op-vs-catalog-less-hardening.md`
- Reálný kód dle potřeby (resources.json, handlers.js, crime.js, populace, calendar/DAYS_PER_YEAR, market UI)

## Acceptance Criteria
- Mylný A2/accounting narrativ odstraněn; §2/§3/§7/§9 odpovídají realitě.
- Catalog-less robustnost vyřešena explicitní volbou (A/B) s odůvodněním.
- Pořadí implementace aktualizováno (A1→A4→A3→A5 + robustnost); fakta (DAYS_PER_YEAR=364 ap.) opravena.
- Coder může implementovat bez dalšího architektonického rozhodování.

## Expected Outputs (cesty k souborům)
- `agents/architect/artifacts/final/architecture_playability_iter-012_T-003.md` (revidovaná verze; v hlavičce odkaz „supersedes T-001")

## Risks / Constraints
- Zero-build PWA. Determinismus je tvrdý požadavek. Resolver je core — Option A měň minimálně a defensivně.
