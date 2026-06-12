# Brief

- **Brief ID**: BRIEF-002
- **Iteration**: iter-001
- **From**: Orchestrator
- **To**: architect
- **Date**: 2026-06-12

## Goal
Na základě analýzy z T-001 identifikovat neefektivní/problematické mechaniky původní hry a doporučit konkrétní kandidáty na refactoring pro další vývoj.

## Context
T-001 dodal architektonickou analýzu klíčových mechanik originálu Prosperity (datový + step
model, mapa závislostí, 9 vzorů). Teď navazujeme hodnotící vrstvou: kde má originál
architektonický nebo výkonnostní dluh, křehkost, nebo špatně škálovatelné/udržovatelné
řešení – a co by se při dalším vývoji (rebuildu) mělo cíleně přepracovat. Stále jde o
**analýzu/doporučení**, ne implementaci.

## Scope IN
- Projít mechaniky a vzory z T-001 a identifikovat **neefektivní / problematické** prvky:
  výkon (každý-krok step funkce, agregace), křehkost (string-callback `callFn`/`fns`,
  re-link po loadu), provázanost (centrální uzly itemList/Player/Home.step), serverové
  závislosti (katalogy, /market, gamesaves), save model (diff „stav minus katalog"),
  přímá DOM manipulace v logice, mísení UI a herní logiky, balanc-as-code apod.
- Pro každý nález uvést: **co je problém**, **proč** (dopad – výkon/údržba/škálování/mobil/offline),
  **priorita** (High/Med/Low), **doporučená alternativa / směr refactoringu**, a **odhad rizika/úsilí**.
- Explicitně zohlednit cílový kontext rebuildu: **mobile-first PWA, offline** (žádný server),
  a tedy které originální závislosti/řešení jsou v tomto kontextu nevhodné.
- Na závěr **prioritizovaný seznam** (top kandidáti na refactoring) jako vstup pro pozdější iterace.

## Scope OUT
- Neopakuj kompletní popis mechanik z T-001 (odkazuj se na něj).
- Nenavrhuj kompletní novou architekturu rebuildu ani konkrétní stack (jen směr/alternativy u nálezů).
- Žádná implementace, žádné změny kódu.

## Task List (zkopíruj do svého dílčího checklistu)
- [ ] T-002: Identifikace neefektivních mechanik + prioritizovaná refactoring doporučení.

## Inputs (soubory / reference)
- `agents/architect/artifacts/final/analysis_keymechanics_iter-001_T-001.md` – výstup T-001 (hlavní vstup, začni tady).
- `doc/original_source_doc.md` a `doc/original_source/modules/prosperity/` – pro ověření detailů.
- `.aiworkflow/zadani_projektu.md` – cílový kontext (mobile-first PWA, offline).

## Acceptance Criteria
- Každý nález má: problém, dopad/odůvodnění, prioritu, doporučenou alternativu, odhad rizika/úsilí.
- Pokryty minimálně tyto roviny: výkon, údržba/provázanost, save/offline, serverové závislosti, UI↔logika oddělení, balanc.
- Zohledněn cíl mobile-first PWA offline (co z originálu v tomto kontextu nefunguje).
- Závěrečný **prioritizovaný seznam** top kandidátů na refactoring.
- Strukturovaný markdown, navazuje na T-001 (odkazy, ne duplikace).

## Expected Outputs (cesty k souborům)
- `agents/architect/artifacts/final/analysis_refactoring_iter-001_T-002.md`

## Risks / Constraints
- Drž se architektonické roviny a konkrétních, odůvodněných nálezů – ne obecných frází.
- Rozliš „problém originálu" vs. „nevhodné jen pro náš cílový kontext (PWA/offline)".
- Model běhu: **Fable**, maximální analytická hloubka (xhigh).
