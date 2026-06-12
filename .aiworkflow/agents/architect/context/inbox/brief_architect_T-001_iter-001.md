# Brief

- **Brief ID**: BRIEF-001
- **Iteration**: iter-001
- **From**: Orchestrator
- **To**: architect
- **Date**: 2026-06-12

## Goal
Architektonicky zanalyzovat původní hru Prosperity (v0.9.5) a vypíchnout klíčové mechaniky včetně jejich engine/datového modelu.

## Context
Projekt = věrný rebuild hry „Prosperity" jako mobile-first PWA hratelná offline. Originál je
středověká ekonomická simulace městského státu (AngularJS/MEAN). Kompletní zdroj originálu i
strojový výtah dat jsou v repu. Tato iterace je **analytická** (žádná implementace) – výstup
poslouží jako podklad pro pozdější rebuild a pro rozhodnutí, co z originálu převzít a co
přepracovat. Navazující task T-002 (jiný brief) bude stavět na téhle analýze a hledat
neefektivní mechaniky + kandidáty na refactoring – tady se tím **nezabývej**, jen popiš stav.

## Scope IN
- Identifikovat a vypíchnout **klíčové mechaniky** originálu (čas/engine & scheduler, sezóny,
  populace & bydlení, jídlo, produkce surovin, ekonomika & trh, výzkum/tech strom, dovednosti,
  budovy & stavba, AI svět/diplomacie, vojsko & bitvy, příběh/eventy, ukládání).
- Pro každou klíčovou mechaniku popsat její **engine/datový model**: jak je reprezentována
  v datech (`$rootScope`, itemList, schedule…), jak se aktualizuje v čase (step model), jaké
  má vstupy/výstupy a vazby na ostatní mechaniky.
- Vyznačit **architektonicky podstatné vzory** originálu (step scheduler, data-driven katalogy,
  oddělení služeb, save model) a klíčová čísla balancu, kde jsou relevantní pro architekturu.
- Stručná **mapa závislostí** mezi mechanikami (co na čem stojí).

## Scope OUT
- NEŘEŠ doporučení na refactoring ani hodnocení efektivity (to je T-002).
- NEŘEŠ návrh nové architektury rebuildu ani volbu stacku (pozdější iterace).
- Žádná implementace, žádné změny kódu hry.

## Task List (zkopíruj do svého dílčího checklistu)
- [ ] T-001: Architektonická analýza originálu – klíčové mechaniky + jejich engine/datový model + mapa závislostí.

## Inputs (soubory / reference)
- `doc/original_source_doc.md` – kompletní popis hry + source map (začni tady).
- `doc/original_source/modules/prosperity/` – plný zdroj herního modulu (services, controllers, directives).
- `doc/original_source/extracted/config-extract.json` – strojový výtah statické konfigurace.
- `.aiworkflow/zadani_projektu.md` – cíl a scope projektu.

## Acceptance Criteria
- Pokryty **všechny** hlavní mechaniky ze source mapy (žádná klíčová oblast nechybí).
- U každé mechaniky je jasně popsán **datový model a způsob aktualizace v čase** (ne jen co dělá).
- Uvedeny konkrétní odkazy na zdrojové soubory (source map: soubor/oblast) pro dohledatelnost.
- Obsahuje **mapu závislostí** mezi mechanikami.
- Výstup je strukturovaný markdown, srozumitelný jako podklad pro T-002 i pozdější rebuild.
- Žádný obsah mimo Scope IN (žádná refactoring doporučení).

## Expected Outputs (cesty k souborům)
- `agents/architect/artifacts/final/analysis_keymechanics_iter-001_T-001.md`

## Risks / Constraints
- Originál je rozsáhlý a provázaný – drž se architektonické roviny, nezabředni do každého řádku.
- Některé katalogy (budovy/zboží/techy) jsou stavěné dynamicky – odkazuj na source map, nehádej čísla.
- Model běhu: **Fable**, požadavek na **maximální analytickou hloubku (xhigh)**.
