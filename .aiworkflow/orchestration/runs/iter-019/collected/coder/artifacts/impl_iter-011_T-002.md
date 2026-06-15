# impl_iter-011_T-002 – M4b Market / Caravans / MVP

**Task**: T-002 iter-011  
**Date**: 2026-06-13  
**Model**: claude-sonnet-4-6

## CI Results
- tsc: 0 errors
- lint:core: OK (52 files)
- node --test: **700 pass, 0 fail**

## What Was Implemented

### T1 – Client Market (buyGoods / sellGoods)
- `src/core/systems/market.js`: `marketInit`, `priceOf`, `buyingPrice` (×1.35), `sellingPrice` (×0.6), `getGoldValue`, `marketInject`, `marketDailyDrift`
- `src/core/commands/buyGoods.js`: validate → canAfford gold → pay gold → grant goodsId → clamp available−qty
- `src/core/commands/sellGoods.js` (new): validate → canAfford goods → pay goods → grant gold → clamp available+qty
- State: `world.marketState: Record<string, {available,max,baseline}>` — empty at init, filled by `marketInit`

### T2 – Market Daily Drift
- `marketDailyDrift` registered in `tickOrder.js` as periodic: `every:'day'`, `order:35`
- Formula: `available += 0.2 × (baseline − available)`, clamp `[0, max]`

### T3 – getGoldValue / marketInject / S-06 Contract Flip
- `getGoldValue(state, basket)`: uses `formulas.goldValue`, gold counts 1:1
- `marketInject(state, goodsId, qty)`: clamp `[0, max]`, no-op for unknown good
- `test/contracts.test.js`: 2 negative tests replaced by 8 positive assertions covering exports, value semantics, clamp, no-op

### T4 – Caravans
- `src/core/commands/sendCaravan.js` (new): validates buy/sell objects, capacity check, sets `caravan.sentOut`, schedules `caravanReturns` event
- `src/core/systems/caravan.js` (new): `caravanReturns` handler grants `recGoods` via resource layer (`grant`), resets caravan
- `maxSteps = 900 × (30 − speed)` = 27000 at speed=0
- `caravanReturns` registered in `tickOrder.js`

### T5 – UI
- `src/ui/selectors.js`: `selectMarket(s)` → `{rows:[{id,available,max,buy,sell,owned}], caravan:{sentOut,capacity,onRoad}}`
- `src/ui/screens.js`: `MarketScreen` with goods table + buy/sell buttons (qty=10) + caravan section
- `src/ui/App.js`: tab `{id:'market', label:'Trh'}` added; render branch for MarketScreen

### Crime Fix (DA5 grep-gate)
- `src/core/systems/crime.js`: replaced `state.player.gold = Math.max(0, ...)` with `pay(state, {gold:goldLoss}, 'crime:loss', ctx, step)`
- Direct gold mutation removed from systems/ directory

### Persist v2→v3
- `src/save/schema.js`: `SAVE_VERSION = 3`
- `src/save/migrations.js`: v2→v3 migration adds `world.marketState={}` and `world.caravan={capacity:10000,speed:0,sentOut:0,recGoods:{}}`
- `src/save/persistSchema.js`: allowlist extended with `'marketState'`, `'caravan'`
- `src/core/state/createInitialState.js`: DEFAULT_SAVE_VERSION=3, world includes marketState+caravan

### Types
- `src/core/state/types.d.ts`: added `MarketEntry`, `CaravanState` interfaces; extended `world` in `GameState`; added `goods?` to `CatalogCache`

### goods.json Seed Catalog (Gap G-LISTGOODS)
- 5 commodities: tools(25), cloth(15), gems(120), spice(50), silk(80)
- IDs chosen to not collide with resources.json (K10-safe): no wood/ore/stone
- `test/iter006-catalog-schema.test.js`: `SEEDED_CATALOG_CONTENT` constant ensures goods.json survives extract.mjs runs that would otherwise overwrite it with empty

## Key Decisions

- **K10 ID Collision avoidance**: goods use market-exclusive IDs (tools/cloth/gems/spice/silk) because `byId()` is a flat cross-catalog index. If wood/ore were reused as goods, `resourceKindOf` would route production job outputs to wrong handler.
- **DR-011-A**: `buyGoods`/`sellGoods` are command handlers (no ctx) so no txEvent emitted. `caravanReturns` is a schedule handler (has ctx) so caravan returns emit tx records.
- **Approximated numbers**: basePrice/max values are approximated (G-LISTGOODS gap). Design doc values used for spread (1.35/0.6) and drift (0.2).
- **Extraction reproducibility**: iter006 test runs `extract.mjs` twice; goods.json would be overwritten with empty. Fix: hard-coded `SEEDED_CATALOG_CONTENT` constant (not a disk backup) so the constant is always the authoritative source of truth.
