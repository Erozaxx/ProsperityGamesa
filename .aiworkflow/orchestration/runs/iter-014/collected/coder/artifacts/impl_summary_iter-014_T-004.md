# Impl Summary — iter-014 T-004 (M5-2 T5 kontrakty K14)

## Soubory : funkce

| Soubor | Co přibilo / změněno |
|---|---|
| `src/data/contracts.json` | Nový katalog — min. sada goodsSeller+goodsBuyer (provenance: derived z events.js) |
| `src/core/catalog/loader.js` | Přidán 'contracts' do ID_CATALOGS (byId indexování) |
| `src/core/catalog/schemas.js` | Schema pro 'contracts' (required id/title/expirationDays/kind + itemShape) |
| `src/app/catalogs.js` | 'contracts' přidán do CATALOG_NAMES |
| `src/core/balance/balance.js` | Nová sekce `BALANCE.contracts` (maxContracts/offerPeriodDays/offerJitterDays/firstOfferStep/rewardMult/supplyQty) |
| `src/core/engine/rng.js` | 'contracts' přidán na konec STREAM_NAMES (K16/D4, izolovaný, determinismus) |
| `src/core/state/types.d.ts` | StreamName += 'contracts'; HomeState += contractQueue/contractSeq |
| `src/core/state/createHomeState.js` | contractQueue=[], contractSeq=0 init (M2 §14.4) |
| `src/core/systems/contracts.js` | **Nový modul**: findContract/removeContract/applyContractComplete; contractExpire/contractOffer/contractComplete handlers; buildContractInstance; armContractOffer B2; registerContractEffects |
| `src/core/commands/contracts.js` | **Nový modul**: acceptContract/rejectContract/completeContract; registerContractCommands |
| `src/save/persistSchema.js` | contractQueue/contractSeq v applyPersist (undefined-guard, §14.3) |
| `src/save/load.js` | contractQueue/contractSeq v applyPayload (undefined-guard) |
| `src/core/engine/tickOrder.js` | Import + volání registerContractEffects v registerCorePeriodics (oprava pro test ctx idempotence) |
| `src/app/main.js` | B1: registerBuild+registerContractCommands+registerContractEffects v bootstrapEngine; B2: armContractOffer v bootSequence za marketInit |
| `src/precache.js` | Regenerovaný (nové soubory v manifestu) |
| `test/m5-contracts.test.js` | **Nový test soubor**: 51 testů (lifecycle, determinismus, persist, B1, B2, catch-up) |

## Gate výsledek

- **npm run ci**: 957/957 pass, 0 fail (bylo 906 před T5 → +51 nových testů)
- **npm run smoke**: SMOKE OK, 0 console errors
- **Determinismus G1** (iter005-edge): 16/16 pass, hashState nedotčen
- **Persist round-trip + B2 re-arm**: testy pass (starý save → arm → offer; M5-2 save → no dup)
- **B1 commands**: acceptContract/rejectContract/completeContract/build resolvovatelné přes dispatch

## Jak vyřešeny B1/B2

### B1 (§14.1 — registerBuild byl dark code)
- Import `registerBuild` z `commands/build.js` přidán do `main.js`
- `registerBuild(creg)` + `registerContractCommands(creg)` volány v `bootstrapEngine` za `registerBuyCompany`
- `registerContractEffects(registry)` volána v `bootstrapEngine` za `registerCorePeriodics`
- Navíc: `registerContractEffects` je nyní volána i v `registerCorePeriodics` (tickOrder.js) — tím jsou contract handlery dostupné ve všech test ctx harnesech (makeCtx()) bez nutnosti úpravy existujících testů. Idempotentní díky module-level function references.

### B2 (§14.2 — re-arm generátoru po loadu)
- `armContractOffer(state)` exportována z `systems/contracts.js`
- Volána v `bootSequence` v `main.js` hned za `marketInit` (mirror vzoru)
- Guard `scheduleCountOf(state,'contract.offer')===0` → insert na `Math.max(curStep, firstOfferStep)` jinak no-op
- Deterministické (žádný RNG/Date při armování), idempotentní (n-té volání = no-op)
- Pokrývá 3 případy jedinou cestou: fresh hra / M5-2 save / starý save (§14.2)

### SAVE_VERSION (§14.3 M1)
- Zůstává 3, žádná migrace polí, žádný bump
- contractQueue/contractSeq pod undefined-guard (precedent projectQueue load.js:189)

## Co zbývá pro T6

- `selectBuildableBuildings`, `selectProjectQueue`, `selectBuilderCapacity`, `selectBuilderCompanies` selektory (`ui/selectors.js`)
- `selectContracts` selektor s deriváty canComplete/daysLeft (`ui/selectors.js`)
- `BuildScreen` + `ContractsScreen` komponenty (`ui/screens.js`)
- Tab 'build' + 'contracts' v `App.js`
- Import screenů v `App.js`
- `cancelProject` command (volitelné, gap G-BUILD-CANCEL)
- Pozn: `registerBuild(creg)` je DONE (B1 v T5) — T6 jen přidá UI nad commandy které existují
