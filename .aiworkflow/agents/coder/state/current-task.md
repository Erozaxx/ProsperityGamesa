# Current Task

- **Task ID**: T-004 (iter-014 M5-2 T5 — kontrakty K14)
- **Brief**: brief_coder_T-004_iter-014.md
- **Iteration**: iter-014
- **Status**: done
- **Started**: 2026-06-14
- **Done**: 2026-06-14

## Checklist (T-004)

- [x] T5.1: contracts.json katalog (goodsSeller/goodsBuyer) + loader index (ID_CATALOGS)
- [x] T5.2: BALANCE.contracts sekce; createHomeState contractQueue=[]/ contractSeq=0; 'contracts' stream v STREAM_NAMES; types.d.ts (StreamName + HomeState)
- [x] T5.3: systems/contracts.js: findContract/removeContract/applyContractComplete; contractExpire/contractOffer/contractComplete handlers; resolveEffect; registerContractEffects
- [x] T5.4: contract.offer generátor (rng 'contracts', getGoldValue, re-schedule); armContractOffer B2 (idempotentní)
- [x] T5.5: commands/contracts.js: acceptContract/rejectContract/completeContract + registerContractCommands
- [x] T5.6: persist contractQueue/contractSeq v applyPersist+applyPayload; round-trip
- [x] T5.7: boot wiring B1+B2 v main.js (registerBuild+registerContractCommands+registerContractEffects+armContractOffer)
- [x] catalog schema pro 'contracts' v schemas.js
- [x] tickOrder.js: registerContractEffects v registerCorePeriodics (fix test ctx idempotence)
- [x] precache regenerovaný
- [x] npm run ci: 957/957 pass, 0 fail
- [x] npm run smoke: OK
- [x] Determinismus G1: iter005-edge 16/16 pass
- [x] persist round-trip + B2 re-arm: testy pass
- [x] B1 commands resolvovatelné: testy pass
