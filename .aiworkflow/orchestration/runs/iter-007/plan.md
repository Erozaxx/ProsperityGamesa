# Iteration Plan: iter-007

- **Created**: 2026-06-13
- **Goal**: M2a – Resource vrstva, persist schémata, první živé systémy: osada žije (populace přichází/jí/umírá), transakce a persistence mají jedinou pravdu, sloty pro pozdní systémy. Dle master plánu §3/iter-007 (T1–T5). Povolený split M2a-1/M2a-2 (3× L). Plus catalog hardening z M1 review (S-1/S-2/S-3).
- **Status**: closed

## Master Checklist
- [x] T-001: architect – Detailní návrh (Opus) tasků iter-007: T1 transakční vrstva (K5/D7, resourceHandlers, canAfford/pay/grant, txEvent, ne-pod-nulu), T2 deklarativní persist schémata (K11, allowlist, load=čistá konstrukce 7 kroků, migrace v1), T3 population+housing systémy, T4 food+health+crime systémy, T5 stub world/battle + kontraktní testy §8 (vč. negativní S-06). NAVÍC catalog hardening (S-1: byId registr, K10 kolize, B4 cross-ref, typová validace; S-2 gap metadata; S-3 jobs.products mapa). Posuď split M2a-1/M2a-2. Model: Opus.
- [x] T-002a: coder – Implementace M2a-1 (Sonnet): catalog hardening + T1 transakce + T2 persist + pure formulas. Model: Sonnet.
- [x] T-002b: coder – Implementace M2a-2 (Sonnet): T3 population/housing + T4 food/health/crime + T5 stuby/kontrakty §8. Model: Sonnet.
- [x] T-003: tester – Test loop (Sonnet): catch-up-safe invariant nových systémů, persist round-trip per doména, tx invarianty (žádné NaN/záporné), kontraktní testy §8, PWA smoke. Model: Sonnet.
- [x] T-004: reviewer – Review gate (Opus, právo re-run): persist schéma se systémem, tickOrder aktualizován, kontrakty §8. Model: Opus.

## Quality Gates
- [x] Plan neobsahuje orchestratora jako agenta u žádného tasku
- [x] Implementace prošla test loop (catch-up-safe + persist round-trip + tx invarianty)
- [x] Kontraktní testy §8 (vč. negativní S-06) zelené
- [x] Review gate GO (= DoD M2a)

## Exit Criteria
- populace/jídlo/zdraví/krimi běží deterministicky live i v dávce; save round-trip všech nových domén; stuby + kontraktní testy existují; reviewer GO.

## Carry-over do iter-008 (M2b) — z review T-004
- **S-1 (HIGH, PRVNÍ úkol M2b)**: napojit persist pipeline na reálnou cestu – saveStore.saveGame ukládá celý stav (structuredClone) místo applyPersist allowlistu; main.js volá loadGame bez katalogu a nenačítá katalogy. M2b = end-to-end bootstrap → tady to vyřešit.
- S-2: BALANCE.start mrtvý kód (napojit nebo odstranit). S-3: food cap per-druh vs agregát (M3). N-1/N-2/N-3 (RNG komentář/sdílený stream/migrate verze) → M3/M9.
