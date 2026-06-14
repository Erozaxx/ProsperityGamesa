# Impl Summary — iter-015 T-009a

- **Task**: T-009a — oprava M-A (double-count researchExp) + m-1 (tickOrder doc drift)
- **Datum**: 2026-06-14
- **Coder**: Sonnet (claude-sonnet-4-6)

## Co bylo opraveno

### M-A (major correctness) — double-count researchExp v research.js

**Soubor**: `src/core/systems/research.js` (~ř. 93-99)

**Před opravou** (chybný kód):
```js
const perBuilding = effective(buildingId, 'researchExp', state);
const totalBonus = perBuilding * bSt.created;  // ← ×created PODRUHÉ = kvadratická chyba
```

**Po opravě** (správný kód):
```js
const totalBonus = effective(buildingId, 'researchExp', state);  // already aggregated
```

**Proč**: `addBuildingModifiers` (buildings.js:316-317) bakuje `created` do `add` modifier value (`value = atom.value * created`). Proto `effective('academy','researchExp')` vrací JIŽ sumu přes created instance — stejně jako u `recalcBuildingAggregates` (který komentuje „Do NOT multiply by created here"). Dvojí násobení způsobovalo kvadratickou exp produkci pro `created > 1`.

**Správná hodnota exp po opravě**:
- 1 academy (researchExp=2, created=1): `effective()` = 2×1 = **2 exp/sektor/den**
- 2 universities (researchExp=5, created=2): `effective()` = 5×2 = **10 exp/sektor/den**
- (dříve chybně: 2 universities → 5×2×2 = 20 exp/sektor/den)

Komentář nad blokem aktualizován: přidáno vysvětlení `addBuildingModifiers` sémantiky a „Do NOT multiply by created here".

### Test zpřísnění — m6-tech-research.test.js

**Soubor**: `test/m6-tech-research.test.js` (ř. 234-249)

Změněno:
- `assert.ok(sectors[sid] && sectors[sid].exp >= 10, ...)` → `assert.strictEqual(sectors[sid]?.exp ?? 0, 10, ...)`
- Komentář zpřesněn: popsána sémantika `addBuildingModifiers` + `effective()`, správná očekávaná hodnota 10

### m-1 (minor doc drift) — docs/tickOrder.md

**Soubor**: `docs/tickOrder.md`

Přidáno:
1. Do tabulky Core Periodics: `| research.daily | day | 75 | research.daily | LIVE (M6) |` (za `buildings.age | day | 70`)
2. Do ASCII diagramu day-edge: `→ [research.daily]NEW(M6)` (za `[buildings.age]NEW(T1)`)

Kód v `tickOrder.js:218` byl správný — jen living doc zaostal.

## Gate výstup

| Gate | Výsledek |
|------|---------|
| `npm run ci` | **1097/1097 PASS, 0 FAIL** |
| `npm run smoke` | **SMOKE OK** (0 console errors) |
| Research exact-match test | **ZELENÝ** (`strictEqual(10)` pro 2 universities) |
| Determinismus G1 | **NEDOTČEN** (catchup.test.js 22/22 pass) |
| M5-1 round-trip (m5-buildings-t4) | **NEDOTČEN** (44/44 pass) |
| M6 round-trip (m6-tech-roundtrip) | **NEDOTČEN** (19/19 pass) |
| Precache regen | **NEpotřeba** (research.js correctness fix neovlivňuje manifest) |
| git commit | **NEcommitováno** (dle zadání) |
