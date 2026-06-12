# Current Task

- **Task ID**: T-001 (iter-002)
- **Brief**: context/inbox/brief_architect_T-001_iter-002.md (BRIEF-005)
- **Iteration**: iter-002
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-12
- **Completed**: 2026-06-12

## Co teď dělám
Hotovo – návrh architektury projektu rebuildu Prosperity:
`artifacts/final/architecture_proposal_iter-002_T-001.md` (sekce 0–14, 543 ř.).

Pokrytí Scope IN:
- **Stack (D1)**: ES2022 moduly + JSDoc/`tsc --checkJs` bez build kroku, vendorovaný
  preact+htm, node:test, ruční SW; 3 alternativy s důvody zamítnutí (§2).
- **Vrstvení (K0/K9)**: headless core ↔ UI přes read-only snapshot + command API,
  ASCII diagram (§3).
- **Engine & čas (K3/K6/K16/K17)**: fixed-timestep s akumulátorem – jeden mechanismus
  live/background/offline; scheduler heap + periodika jako data; centrální tickOrder
  (rozpad Home.step); RNG streamy per systém (§4).
- **Data & katalogy (K2/K4/K13–K15, K10)**: verzované JSONy, schema validace fail-fast,
  immutable katalog + modifikátory, balanc do dat + čisté vzorce (§5).
- **Save (K1/K11/K12)**: IndexedDB, rotující generace, lastSimTimestamp, allowlist
  persist schémata, load = čistá konstrukce, verzované migrace, export/import (§6).
- **Resource vrstva (K5)** + účetnictví/achievementy jako observery (§7).
- **Pozdní systémy (K8/R4)**: battle automat + zone tick kontrakty navržené teď (§8).
- **R1–R4 rozhodnuto** (D9–D12): klientský trh s mean-reversion driftem; cap 8 h jako
  balance konstanta + auto-resolve bitev + pokračování po eventu; extrakční pipeline M1
  s gap-reportem (dílčí eskalace jen pro nedotěžitelné díry); kontrakty+stuby+testy (§9).
- **Mapování K0–K19** na sekce a milníky (§10); **milníky M0–M9, MVP = M0–M4** (§11);
  **rizika R-A–R-J + mitigace** (§12); předpoklady (§13); handoff doporučení (§14).

## Dílčí checklist
- [x] T-001: Návrh architektury projektu rebuildu (stack, struktura, engine+čas+catch-up, data/save model, rozpad iterací, R1–R4, rizika).

### Pracovní rozpad (interní)
- [x] Přečteno: AGENTS.md, brief, rozcestník, zadání, original_source_doc
- [x] Přečteno: T-001/T-002a/T-002b analýzy, T-004 rework, T-003 review (K0–K19, R1–R4)
- [x] Sekce 1–3: cíle, stack, struktura+vrstvení
- [x] Sekce 4–6: engine+čas+RNG, data/katalogy, save model
- [x] Sekce 7–9: resource vrstva, registry, tick rozpad, pozdní systémy
- [x] Sekce 10–13(+14): R1–R4, mapování K0–K19, iterace/milníky, rizika+diagram
- [x] Validace artefaktu + handoff

## Předpoklady
- Plné katalogy nejsou v repu (R3) – dotěžení = milník M1 s gap-reportem; eskalace
  uživateli jen pro reálné díry.
- Cap catch-upu a drift konstanta trhu jsou balance data – kalibrace v M9, architektura
  na hodnotách nezávisí.
- Doporučená navazující kontrola: challenger review bodů D1 (no-build), D10 (cap), §9.1 (drift).

## Blockery
–
