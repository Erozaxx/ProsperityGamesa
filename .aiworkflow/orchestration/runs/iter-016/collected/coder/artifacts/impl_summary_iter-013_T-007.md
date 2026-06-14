# impl_summary_iter-013_T-007

**Task**: T-007 — Modifier vrstva K13 (T4.1–T4.6 full implementation)
**Iteration**: iter-013 M5-1
**Gate result**: npm run ci: 906 tests, 0 fail | npm run smoke: OK

---

## Soubory a funkce (changes)

### src/core/systems/buildings.js — FULL REWRITE (modifier layer)
- `cmpModifier(a,b)` — deterministic sort by (source,id) lexicographically (M-3)
- `fold(base, mods)` — add→mul→set order; deterministic sort; LAST set wins
- `ensureCache(cs)` — lazy-init `_effCache`/`_modVersion` on catalogState
- `normalizeEffects(effects)` — handles array and object forms of building.effects
- `effective(itemId, attr, state)` — full memoized lookup; cache key = `${itemId}:${attr}`; version check invalidates stale entries
- `invalidateModifiers(state)` — resets `_effCache.map`, bumps `_modVersion`
- `addBuildingModifiers(state, buildingId)` — ONE modifier per (source, attr, op); `value = atom.value × created` for 'add' op (multiplicty baked in)
- `removeBuildingModifiers(state, buildingId)` — filter by `source === buildingId`
- `recalcBuildingAggregates(state)` — ONE path: `Σ effective(id, attr)` WITHOUT ×created; writes `home.derived.maxWorkers/storageCapacity/attractiveness`
- `rebuildBuildingDerived(state)` — resets `_modVersion=0` before `invalidateModifiers` (hashState consistency); calls `addBuildingModifiers` per building, then `recalcBuildingAggregates`, then `deriveWorkforceTotal` to sync `workforce.total`
- `buildersProcess` — uses `getMasonProvided(state)` for G-BUILDER-MASON `maxActiveProjects`

### src/core/commands/buyCompany.js — NEW `companyMasonTotal`
- `companyMasonTotal(state)` — sums `masonProvided` from owned companies → feeds `maxActiveProjects` in `buildersProcess`

### src/core/systems/jobs.js — T4.5 workerSlots
- Added `derived.maxWorkers` to `workerSlots()` so building-provided workers contribute to `workforce.total`

### src/core/systems/housing.js — T4.5 attractiveness
- `housingSettlementLevel` reads `home.derived.attractiveness` and adds to migration attractiveness

### src/core/state/createInitialState.js — shared derivation path
- Added `rebuildBuildingDerived(state)` call (same as load Step 5) → fresh game and loaded game both have `_modVersion=1` and `_effCache` initialized identically (hashState consistent)

### src/save/persistSchema.js — invariant 1: save=only modifiers
- Removed `catalogState` from blanket infra-key loop
- Added explicit `payload.catalogState = { modifiers: s.catalogState.modifiers ?? [] }` block
- `_effCache`/`_modVersion` are NEVER saved

### src/save/load.js — catalogState clone (reference aliasing fix)
- Removed `catalogState` from blanket infra-key loop in `applyPayload`
- Added explicit clone: `state.catalogState = { modifiers: payload.catalogState.modifiers.slice() }`
- Prevents `rebuildBuildingDerived` mutations from propagating back into the caller's payload object

### test/m5-buildings-t4.test.js — NEW (44 tests)
- T4.1: effective/fold table tests (add→mul→set, 2×set deterministic, dot-path, map attr)
- T4.2: cache hit, invalidation, `_effCache` not in payload
- T4.3: addBuildingModifiers (1 modifier per type, value doubles on 2nd instance, round-trip)
- T4.4: aggregate no-double-count
- T4.5: G-BUILDER-MASON (companyMasonTotal, maxActiveProjects increased by masonProvided)
- T4.6: round-trip payload identity (save→load→save payloads identical), payload grep (no _effCache/_modVersion), `created===instances.length` after load

---

## Invariant verification

**Invariant 1 (Save = ONLY catalogState.modifiers)**:
- `applyPersist` in `persistSchema.js` explicitly builds `payload.catalogState = { modifiers: [...] }`
- `_effCache`/`_modVersion` are excluded by construction
- Test: "T4.6 – payload não contém _effCache/_modVersion" — passes

**Invariant 2 (Single shared `rebuildBuildingDerived`)**:
- Called from both `createInitialState.js` (fresh game) and `load.js` Step 5 (loaded game)
- No load-only derivation branches anywhere

**Invariant 3 (Deterministic fold)**:
- `cmpModifier` sorts by `(source, id)` lexicographically before fold
- LAST set after sort wins (not insertion-order)

**Invariant 4 (ONE aggregate path, no ×created)**:
- `recalcBuildingAggregates` calls `effective()` only
- Multiplicty baked into modifier.value by `addBuildingModifiers` (`value = atom.value × created`)

**Invariant 5 (No Date.now/Math.random/DOM)**:
- All new code is pure functions; no side effects outside state mutations

---

## Resolved gaps

- **G-BUILDER-MASON**: `companyMasonTotal` now feeds `maxActiveProjects` in `buildersProcess`
- **Reference aliasing bug**: `applyPayload` clones `catalogState` to prevent payload mutation
- **hashState consistency**: `_modVersion` reset to 0 before `invalidateModifiers` in `rebuildBuildingDerived`; always 1 after full rebuild
- **workforce.total sync**: `rebuildBuildingDerived` calls `deriveWorkforceTotal` to keep `workforce.total` aligned with `derived.maxWorkers`
