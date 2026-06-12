# Brief

- **Brief ID**: BRIEF-005
- **Iteration**: iter-002
- **From**: Orchestrator
- **To**: architect
- **Date**: 2026-06-12

## Goal
Navrhnout architekturu projektu pro vytvoření hry – věrný rebuild Prosperity (mobile-first PWA, offline) – na základě materiálů z iter-01.

## Context
iter-01 dodal a uživatel schválil: analýzu klíčových mechanik originálu, dvě analýzy refactoring
kandidátů a review s konsolidovaným prioritizovaným seznamem **K0–K19** a otevřenými otázkami
**R1–R4**. Teď je úkol z toho sestavit **realizační návrh projektu** (architekturu), ze kterého
půjde stavět v dalších iteracích. Nejde o další analýzu originálu.

## Scope IN
- **Volba stacku** + zdůvodnění (trade-offs, min. 1 alternativa) vůči cílům mobile-first PWA / offline.
- **Struktura projektu a vrstvení**: headless jádro simulace (jediný serializovatelný stav) ↔ UI
  (read-only + command/intent API) – navázat na K0, K9.
- **Herní engine & čas**: fixed-timestep s akumulátorem; jeden mechanismus pro live + background
  + **offline catch-up**; seedovatelný/serializovatelný RNG (K3, K16/G1).
- **Datový model & katalogy**: data-driven obsah, immutable katalog + modifikátory, balanc do dat
  + čisté testovatelné vzorce (K4, K13–K15). Zohlednit, že plné katalogy nejsou v repu (R3).
- **Save model**: local-first (IndexedDB), generace savů, `lastSimTimestamp`, deklarativní schéma,
  verzované migrace (K1, K11).
- **Resource/transakční vrstva** (K5), string-ID registr fail-fast (K10), rozpad Home.step (K6).
- **Rozpad systémů do iterací/milníků** – co je MVP jádro (engine+čas+populace+ekonomika) a co
  navazuje (výzkum, AI svět, vojsko/bitvy, příběh) – navázat na prioritu K0–K19.
- **Rozhodnutí k R1–R4** (klientský trh, cap catch-upu, dotěžení katalogů, pozdní systémy) –
  rozhodni nebo explicitně eskaluj, kde je potřeba vstup uživatele.
- **Rizika + mitigace**, předpoklady a nejistoty. ASCII diagram komponent.

## Scope OUT
- Žádná implementace herního kódu (to jsou další iterace).
- Neopakuj analýzu mechanik z iter-01 (odkazuj na ni).
- Neřeš scope OUT zadání (multiplayer/backend/účty, monetizace, nativní app, převzetí assetů 1:1).

## Task List (zkopíruj do svého dílčího checklistu)
- [ ] T-001: Návrh architektury projektu rebuildu (stack, struktura, engine+čas+catch-up, data/save model, rozpad iterací, R1–R4, rizika).

## Inputs (soubory / reference)
- **POVINNÝ VSTUP:** `.aiworkflow/project/architecture/iter-02-input-rozcestnik.md` – projdi materiály v pořadí, které předepisuje.
- Odsud zejména: review `agents/reviewer/artifacts/final/review_iter-001_T-003.md` (K0–K19, R1–R4),
  analýzy `agents/architect/artifacts/final/analysis_keymechanics_iter-001_T-001.md`,
  `…_perf-offline_iter-001_T-002a.md`, `…_maintainability_iter-001_T-002b.md`.
- Cíl/omezení: `.aiworkflow/zadani_projektu.md`. Doména: `doc/original_source_doc.md`.

## Acceptance Criteria
- Pokryty všechny body Scope IN; každé zásadní rozhodnutí má zdůvodnění (trade-offs).
- Min. 1 alternativa u volby stacku (s důvodem zamítnutí).
- Architektura mapovaná na K0–K19 (je vidět, jak návrh adresuje prioritní kandidáty).
- Explicitní rozhodnutí nebo eskalace pro R1–R4.
- Rozpad do iterací/milníků s definicí MVP jádra.
- ASCII diagram komponent + sekce rizik/mitigací + předpoklady.
- Strukturovaný markdown; odkazy na iter-01, ne duplikace.

## Expected Outputs (cesty k souborům)
- `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md`

## Risks / Constraints
- Široký task – drž se architektonické roviny a rozhodnutí, ne implementačních detailů.
- Pokud Write tool blokuje .md, použij Edit/Bash – artefakt je povinný deliverable.
- Model: **Fable**, xhigh. Pokud hrozí délka, strukturuj výstup po sekcích a průběžně zapisuj.
