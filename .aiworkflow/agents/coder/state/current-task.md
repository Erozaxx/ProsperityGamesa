# Current Task

- **Task ID**: T-014 (iter-012 reload-determinismus fix, Option A)
- **Brief**: brief_coder_T-014_iter-012.md
- **Iteration**: iter-012
- **Status**: blocked
- **Started**: 2026-06-13
- **Blocked**: 2026-06-13

## Checklist (T-014)
- [x] jobs.js: deriveWorkforceTotal(state, ctx?) přidán+exportován; autoAssignWorkers ho používá (bez změny chování); workerSlots běží bez ctx (globální katalog fallback)
- [x] load.js: Step 5 přepočítá state.home.workforce.total přes helper (po applyPayload, před validateInvariants), bez ctx
- [x] iter005-edge.test.js: G1 zpět na plný hashState; applyPersist obejití + A1 komentář + nepoužitý import odstraněny; before() katalogy ponechány
- [x] G1 iter005-edge na PLNÉM hashState ZELENÝ (16/16)
- [x] npm run typecheck zelené
- [x] npm run lint:core zelené
- [x] npm run smoke OK
- [ ] npm run ci ZELENÉ — BLOKOVÁNO: 2 preexistující determinismus testy (app-bootstrap, export-string) selhávají; fix je odhalil

## Blocker (eskalace – NEMASKOVÁNO dle pokynu briefu)
Self-fix T-014 je úplný a korektní pro svůj scope (G1 iter005-edge plný hashState zelený).
Po fixu plné `npm run ci` ČERVENÉ kvůli 2 testům mimo scope T-014:
- test/app-bootstrap.test.js → "hashState after round-trip (save→load) then N steps …"
- test/export-string.test.js → "export then run N steps … → same hash"

Root cause (ověřeno experimentem): oba testy savnou/exportují na curStep=0. jobsAccidents
(quarterDay order 20) běží před autoAssignWorkers (order 30); quarterDay edge nastane už na
kroku 1 (sid=0). Path A (kontinuální) tak vstupuje do kroku 1 se stale workforce.total=0
→ jobsAccidents přeskočí RNG draw; Path B (load) má díky Option A fixu workforce.total=9
→ čerpá RNG draw → rozejde se stream 'population' (jediné rozcházející pole). Před fixem obě
cesty bugově přeskočily (falešná shoda). Oprava vyžaduje zásah mimo scope (derive-on-init /
reorder=zamítnutá Option C / posun save pointu v cizích testech) → rozhodnutí architekta.

Detaily + důkaz + doporučené varianty: artifacts/final/impl_summary_iter-012_T-014.md
