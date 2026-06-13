# Brief

- **Brief ID**: BRIEF-008
- **Iteration**: iter-003
- **From**: Orchestrator
- **To**: project-manager
- **Date**: 2026-06-13

## Goal
Ze schválené architektury a milníků M0–M9 vytvoř kompletní end-to-end plán VŠECH iterací od kostry po release – nařezaný tak, aby každý task šel detailně navrhnout Opus agentem a provést Sonnet agentem, s povinným test loop + review gate na konci každé iterace.

## Context
- iter-001 = analýza originálu; iter-002 = schválená architektura (registr rozhodnutí D1–D13, R1–R4 vyřešeno, milníky M0–M9). Teď iter-003 = **cizelování plánu**: převést milníky do realizovatelného plánu iterací.
- Hra = věrný rebuild „Prosperity" jako mobile-first offline PWA (viz `zadani_projektu.md`).
- Architektura výslovně říká: **„Milník ≈ 1–2 workflow iterace"** a u M2 povoluje split M2a/M2b. Tj. **milník ≠ nutně jedna iterace** – řež podle komplexity tasků, ne podle čísel milníků.
- Model-driven workflow tohoto repa: detailní návrh tasku dělá **Opus** agent, provedení **Sonnet** agent, testy **Sonnet/Haiku** tester, review **Opus** reviewer (s pravomocí nechat iteraci proběhnout znovu).

## Scope IN
- Návrh členění VŠECH milníků M0–M9 do konkrétních workflow iterací (iter-004, iter-005, …) až do release.
- Pro každou iteraci: cíl, mapování na milník(y)/klíčové mechaniky (K0–K19), rozpad na tasky.
- Pro každý task: stručný popis, odhad komplexity (S/M/L), doporučený model (Opus = návrh, Sonnet = provedení), závislosti.
- Pro každou iteraci: **Definition of Done** + povinný **závěrečný test loop** (tester Sonnet/Haiku: co se testuje – vzorce, determinismus, save round-trip, od M2 catch-up-safe invariant, PWA smoke) + **review gate** (reviewer Opus s pravomocí re-run dokola).
- Závislosti mezi iteracemi, pořadí a kritická cesta. MVP hranice (architektura: MVP jádro = M0–M4) explicitně vyznačit.

## Scope OUT
- Neimplementuj nic (žádný produkční kód) – tohle je plánovací deliverable.
- Neměň architekturu ani rozhodnutí D1–D13 / R1–R4 (jsou schválená). Když najdeš rozpor, zapiš ho jako poznámku/riziko, neřeš ho přepisem architektury.
- Neřeš detailní obsah jednotlivých tasků (to je práce Opus agenta v dané iteraci) – jen je nařež a popiš na úrovni umožňující pozdější detailní návrh.

## Task List (zkopíruj do svého dílčího checklistu)
- [ ] T-001: Vytvořit kompletní end-to-end plán iterací (M0–M9 → iter-004+), s rozpadem na tasky, komplexitou, modely, závislostmi, DoD a test loop + review gate u každé iterace.

## Inputs (soubory / reference)
- Architektura (POVINNÝ vstup): `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md`
  - §11 = rozpad do milníků M0–M9 (tabulka + pozn. k M2 splitu); §10 = mapování na K0–K19; §0 = registr rozhodnutí; §12 = rizika.
- Zadání + scope: `zadani_projektu.md`; done-criteria: `project/done-criteria.md`
- Detailní mechaniky/čísla originálu (kontext rozsahu): `doc/original_source_doc.md`
- Tvoje role a quality gate: `agents/project-manager/AGENTS.md`

## Acceptance Criteria
- Plán pokrývá souvislou cestu **M0 → release** bez děr; každý milník M0–M9 je namapován na ≥1 iteraci (a je vidět, kde se milník dělí nebo kde 1 iterace nese víc).
- Každá iterace má: cíl, tasky s komplexitou + doporučeným modelem (Opus/Sonnet), závislosti, DoD.
- Každá iterace končí **test loop (Sonnet/Haiku)** + **review gate (Opus, právo re-run)** – explicitně, ne jen obecně.
- Tasky jsou nařezané tak, aby provedení zvládl Sonnet agent (větší/rizikové → rozděleny); příliš velký task je rozdělen, ne ponechán.
- MVP hranice (M0–M4) a kritická cesta jsou vyznačené.
- Konzistence s architekturou: catch-up-safe invariant od M2, M1 jako extrakční pipeline, PWA smoke od M0, `tsc --checkJs` CI gate jako DoD M0.

## Expected Outputs (cesty k souborům)
- `agents/project-manager/artifacts/final/iteration_master_plan_iter-003_T-001.md`

## Risks / Constraints
- Nepřeplánuj: cílem je realizovatelný, ne vyčerpávající dokument. Drž úroveň „dost detailu pro pozdější Opus návrh tasku".
- Obsahové milníky (M2+) jsou dle architektury *plán, ne závazek rozsahu*, dokud M1 gap report nepotvrdí úplnost dat – zohledni to (M1 brzy, závislost obsahu na něm).
- Když narazíš na něco, co vyžaduje rozhodnutí uživatele (např. priorita milníků, termíny), zapiš max 3 cílené otázky do výstupu jako „Otázky na orchestrátora/uživatele", ale plán přesto dokonči s explicitním předpokladem.
