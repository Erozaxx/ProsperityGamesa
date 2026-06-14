# Current Task

- **Task ID**: T-002a (iter-013) — revize designu M5 (po T-001)
- **Brief**: context/inbox/brief_architect_T-002a_iter-013.md (BRIEF-013-002a)
- **Iteration**: iter-013 (M5-1 – Budovy & modifikátory)
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-14
- **Completed**: 2026-06-14

## Co teď dělám
Hotovo – REVIZE designu M5 (T-002a): zapracovány 4 major podmínky z reviewer gate (T-002) +
zúženo na M5-1 (T1–T4). Žádný kód. **Platný dokument: `artifacts/final/design_iter-013_T-001.md`**
(in-place revize; žádný separátní `design_iter-013_T-002a.md` se nevytváří).

## Jak vyřešeny 4 major (T-002a)
- **M-1** (effects→modifier mapování + JEDNA cesta agregátů): nová **§4.3** = úplné pravidlo
  (op add/mul/set z dat, dot-path mapové attr, **per-TYP** modifikátor `id=bld:${buildingId}:${attr}:${op}`,
  `source=building:${buildingId}`, **multiplicita `created` zapečená do `value`**). **§4.4 přepsána** =
  JEDNA kanonická cesta `Σ effective(id,attr)` BEZ násobení `created`; druhá cesta (`created×effective`)
  ODSTRANĚNA → žádné dvojí započtení.
- **M-2** (sdílený rebuild, žádná load-only větev): nová **§4.6** `rebuildBuildingDerived(state)` =
  created re-derivace + re-gen building modifikátorů + recalcAggregates; nová **§4.7** = mutace
  (completeBuild/destroyInstance/applyRepair) volají TUTÉŽ fn. Volaná z load Step 5 I z mutací.
  Load-only větev explicitně zakázána (M5-R1; reviewer grep). Ověřeno load.js:217-225 (dnes jen
  workforce.total — stejná třída bugu jako DR-012-02).
- **M-3** (deterministický fold): **§4.1 přepsána** = před foldem `sort by (source,id)` lexikograficky
  (cmpModifier), `set` bere POSLEDNÍ po sortu (ne insertion order). Tabulkový test 2× set různého source.
- **M-4** (build bez ctx → pay bez emitTx): **§2.3 přepsána** s ověřením kódu — `dispatch.js:44-59`
  volá `handler(state,params)` (žádný ctx); Volba A (předat ctx) = změna arch command vrstvy iter-002 →
  mimo scope, ZAMÍTNUTA. `transactions.js:45` potvrzuje ctx optional → **Volba B = vědomý gap
  G-BUILD-TXAUDIT** (M5-2/M9).

## Scope (T-002a)
- Zúženo na M5-1 (T1–T4). §5 (T5 kontrakty) + §6 (T6 build UI) označeny [ODLOŽENO M5-2],
  přesunuty do nové **§13 Odloženo na M5-2/iter-014** (krátká poznámka). Coder M5-1 je IGNORUJE.
- T4 dekompozice (§4.8, dříve §4.4): T4.1 (det. sort), T4.3 (mapování M-1), T4.4 (jedna cesta M-1),
  T4.6 (sdílený rebuildBuildingDerived M-2 + persist blok) přepsány. Stále 6 Sonnet-kroků T4.1–T4.6.
- Minor/nit: m-1 (dot-path zafixován), m-2 (payload grep test T4.6), m-5 (T4.5 ověřit fn za běhu),
  n-2/n-3 (už v T-001).

## Dílčí checklist
- [x] Přečteno: AGENTS.md, brief BRIEF-013-002a, design T-001, review T-002 (4 major+minor/nit)
- [x] Ověřeno proti kódu: load.js Step 5 (jen workforce.total), persistSchema.js:41 (catalogState celý,
      applyPersist imperativní per doména), effects.js (registr string-ID), transactions.js (pay ctx optional),
      dispatch.js (handler(state,params) bez ctx), createInitialState.js:115 (modifiers:[])
- [x] M-1 vyřešen (§4.3 + §4.4, jedna cesta)
- [x] M-2 vyřešen (§4.6 + §4.7, sdílená fn z load i mutací, load-only zakázána)
- [x] M-3 vyřešen (§4.1 deterministický sort by source,id)
- [x] M-4 vyřešen (§2.3 gap G-BUILD-TXAUDIT, Volba A zamítnuta z scope důvodů)
- [x] Scope zúžen na M5-1; §5/§6 → §13 odloženo
- [x] T4 dekompozice aktualizovaná, Sonnet-proveditelná
- [x] Výstup in-place + changelog T-002a; handoff

## Blockery
–
