# Brief

- **Brief ID**: BRIEF-ADV-001
- **Iteration**: post-iter-021 (mezi-iterační advisory; žádná aktivní iterace)
- **From**: Orchestrator
- **To**: architect
- **Date**: 2026-07-02

## Goal
Proveď nezávislou revizi aktuálního stavu projektu (po uzavření iter-021 / release kandidát M0–M9) a navrhni konkrétní další krok (obsah a rozsah případné iter-022), včetně alternativ a trade-offs.

## Context
- Master plán M0–M9 je dle orchestrátora KOMPLETNÍ; poslední milník M9b uzavřen v iter-021 jako "release kandidát".
- Hra je zero-build offline PWA (Preact/htm, no bundler), deterministické jádro (`src/core/`), data v `src/data/`, save přes IndexedDB, service worker s versioned precache.
- Licence rozhodnuta uživatelem: GPL-3.0 + fan disclaimer (LICENSE, NOTICE, PROVENANCE §6).
- CI zelené (1566/1566), smoke OK, audit-provenance 0 verbatim, determinismus G1 (golden-hash) drží.
- **DŮLEŽITÝ ČERSTVÝ NÁLEZ (orchestrátor, mimo iter-021):** GitHub Pages deploy (`.github/workflows/pages.yml`) opakovaně SELHÁVÁ (běhy #9–#12) na kroku configure-pages: „Create Pages site failed — Resource not accessible by integration". Příčina: Pages nejsou v repo Settings zapnuté (user gate). Runtime soubory se stagují správně, manifest/SW/precache používají relativní cesty (subpath-safe). Tzn. release kandidát reálně NENÍ nikde nasazený/hratelný přes https → uživatel ho nemůže nainstalovat na mobil, dokud se to nevyřeší.
- KNOWN_ISSUES.md eviduje carry-over gapy: TXAUDIT, G-WORLD-*, G-AIBATTLE-DEDUP, G-MILITARY-STATS, V1/V2, MIN-1 (žádný release-blokující, ale nedodělky).

## Scope IN
- Revize stavu: co je hotové a ověřené vs. co je deklarované ale reálně nedotažené (zvlášť: je "release kandidát" opravdu doručitelný, když deploy padá?).
- Posouzení KNOWN_ISSUES gapů z pohledu architektury: co je technický dluh, co je scope, co je bezpečné odložit.
- Návrh dalšího kroku = doporučená náplň iter-022 (min. 1 hlavní doporučení + alespoň 1 alternativa, s trade-offs a riziky).
- Explicitní rozhodnutí/doporučení: řešit nejdřív deploy/dostupnost (M9c "release skutečně live"), nebo dotažení gapů, nebo něco jiného? Zdůvodni prioritizaci.
- ASCII přehled komponent/toků pokud to pomůže rozhodnutí.

## Scope OUT
- Neprováděj žádné změny v kódu ani konfiguraci (žádné edity, žádný commit). Čistě analýza + návrh.
- Neřeš detailní implementaci gapů — jen rozsah a prioritu.
- Nezakládej iteraci (to udělá orchestrátor podle tvého doporučení).

## Task List (zkopíruj do svého dílčího checklistu)
- [ ] T-ADV-001a: Načti stav (master plán, iter-021 exit-summary, KNOWN_ISSUES, PROVENANCE, done-criteria, pages.yml) a shrň skutečný stav vs. deklarovaný
- [ ] T-ADV-001b: Analyzuj deploy/dostupnost blocker a jeho dopad na "release kandidát" status
- [ ] T-ADV-001c: Kategorizuj KNOWN_ISSUES gapy (dluh / scope / odložit) + rizika
- [ ] T-ADV-001d: Navrhni další krok (doporučení + ≥1 alternativa, trade-offs, prioritizace) a zapiš artefakt

## Inputs (soubory / reference)
- `.aiworkflow/project/architecture/iter-02-input-rozcestnik.md` (master plán / milníky)
- `.aiworkflow/project/done-criteria.md`
- `.aiworkflow/orchestration/runs/iter-021/exit-summary.md` a `plan.md`
- `.aiworkflow/shared/docs/lessons_learned.md`
- `KNOWN_ISSUES.md`, `PROVENANCE.md`, `README.md` (repo root)
- `.github/workflows/pages.yml`, `manifest.webmanifest`, `service-worker.js` (repo root)

## Acceptance Criteria
- Revize jasně odlišuje ověřené hotové vs. deklarované-ale-nedotažené (s odkazy na soubory/důkazy).
- Deploy blocker je posouzen včetně dopadu na doručitelnost release kandidáta.
- Návrh dalšího kroku má ≥1 hlavní doporučení + ≥1 alternativu, každou s trade-offs a riziky (dle DoD architekta).
- Prioritizace je zdůvodněná, ne arbitrární.
- Žádné změny v kódu/konfiguraci nebyly provedeny (jen artefakt).

## Expected Outputs (cesty k souborům)
- `.aiworkflow/agents/architect/artifacts/final/review_post-iter-021_next-step.md`

## Risks / Constraints
- Model: Fable (rychlejší, levnější) — drž se čtení + analýzy, nepouštěj se do rozsáhlých refaktoringů.
- Pracuješ read-only; jiné změny v repu ignoruj a nesahej na ně.
- Nefabuluj stav — pokud něco nejde ověřit, označ to jako neověřené.
