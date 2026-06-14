# Impl Summary: iter-016 T-008a — Hygiena 4 minor (M7a-1 review gate)

- **Task**: T-008a
- **Iteration**: iter-016 M7a-1
- **Agent**: coder (Sonnet)
- **Date**: 2026-06-14

## Co bylo opraveno

### MINOR-1: Mrtvý kód odstraněn (world.js)
- Odstraněny funkce `calcMilitaryRating` (19 ř.) a `calcEconomicRating` (12 ř.) z `src/core/systems/world.js`
- Grep přes celý `src/` potvrdil 0 callerů (funkce nebyly exportovány, volány jen z `doc/original_source/` — referenční archiv, ne zdrojový kód)
- Ratings section (~ř.288-290) zachována jako komentář: "computed on-demand by selectors" (no-op placeholder pro M7a-2)
- **Rozhodnutí**: Odstranit (ne označit jako M7a-2 stub) — funkce v designu M7a-1 nezmíněny; selektory pro processAI patří do M7a-2

### MINOR-2: Persist odchylka dokumentována (persistSchema.js + gap-report.json)
- `src/save/persistSchema.js` ř.263-267: komentář rozšířen z jednořádkové poznámky na 5-řádkové vysvětlení (G-WORLD-PERSIST-DERIVED, severity:low, M9, M-2 hash stabilita, trade-off)
- `src/data/gap-report.json`: přidán gap `G-WORLD-PERSIST-DERIVED` (catalog: world, severity: low, milestone: M9, provenance: derived)
- _meta a summary.total/byMilestone aktualizovány (total 34→35, M9 12→13, iteration iter-014→iter-016, milestone M5-2→M7a-1)
- Žádná změna logiky — pouze dokumentace vědomé odchylky

### MINOR-3: Opraveno zavádějící komentář homeZone (world.js ~ř.179)
- Starý: `// homeZone mirror: handled in §5.2 T4 (G-HOMEZONE-MIRROR), skip here`
- Nový: `// homeZone units NOT mirrored in M7a-1 (single source = player.totWarriors/totArchers); // mirror into homeZone.warriors/archers deferred to M7a-2 if processAI needs homeZone military rating`
- Realita: mirror není implementován; single-source = player.tot*; homeZone skip v processZone je záměrné

### MINOR-4: docs/tickOrder.md aktualizován (STUB → LIVE)
- Tabulka ř.33: `world.tick | day | 30 | world.tick | STUB` → `LIVE (M7a-1: day-index round-robin processZone + marketInject)`
- ASCII diagram ř.54: `worldTick(stub)` → `worldTick(round-robin)`
- Hlavička souboru: přidáno `/ iter-016 M7a-1`

### Precache regen
- `src/precache.js` regenerován (gap-report.json je v manifestu — ovlivněn změnou)

## Gate výsledek

| Check | Výsledek |
|---|---|
| `npm run ci` | **1179/1179 PASS, 0 fail** |
| `npm run smoke` | **SMOKE OK** |
| m7a-world-t1 (determinismus) | **34/34 PASS** |
| G1 + M5/M6/M4b nedotčeno | ✅ (ci celý zelený) |
| Mrtvý kód odstraněn | ✅ (grep src/ = 0 výsledků) |
| battle.js nedotčen | ✅ |
| Logika nedotčena | ✅ (jen komentáře/doc/gap-report) |

## Soubory změněny

- `src/core/systems/world.js` — MINOR-1 (odstranění calc*), MINOR-3 (komentář)
- `src/save/persistSchema.js` — MINOR-2 (komentář persist odchylky)
- `src/data/gap-report.json` — MINOR-2 (gap G-WORLD-PERSIST-DERIVED)
- `docs/tickOrder.md` — MINOR-4 (STUB→LIVE)
- `src/precache.js` — regen (auto, gap-report.json v manifestu)

## NEcommitováno (dle scope — git mimo scope T-008a)
