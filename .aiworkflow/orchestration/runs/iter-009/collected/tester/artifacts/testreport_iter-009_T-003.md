# Test Report – iter-009 T-003 – M3 Production Systems

- **Verdict**: PASS
- **Brief**: BRIEF-034
- **Iteration**: iter-009 (M3)
- **Agent**: tester (Sonnet)
- **Date**: 2026-06-13
- **Model**: claude-sonnet-4-6

---

## Executive Summary

Všechny testy PASS. Žádné FAIL. Implementace M3 (forest/field/mine/jobs/workerEfficiency/skills) je správná, deterministická a catch-up-safe.

**CI výsledky:**
- Před přidáním nových testů: **577/577 PASS**
- Po přidání nových testů: **622/622 PASS** (+45 nových testů v `test/m3-production-extended.test.js`)
- `npm run ci`: ZELENÉ

---

## Testované Systémy

| Systém | Edge | Tests | Výsledek |
|--------|------|-------|---------|
| `forest.regen` | 10days | TC-001, TC-002, TC-008, TC-009 | PASS |
| `field.daily` | day | TC-013 | PASS |
| `mine.daily` | day | TC-007 | PASS |
| `workerEfficiency.daily` | day | TC-003 | PASS |
| `skillsProgress` | step | TC-010, TC-012 | PASS |
| `jobsProduction` | quarterDay | TC-006, TC-011 | PASS |
| Catch-up-safe (všechny) | – | TC-004, TC-015 | PASS |
| Save round-trip | – | TC-005 | PASS |
| RNG determinismus | – | TC-008 | PASS |
| `assignJob` command | – | TC-014 | PASS |

---

## Výsledky per oblast (Scope IN)

### 1. `npm run ci` zelené
- **Výsledek: PASS** – 622/622 test pass, 0 fail.

### 2. Tabulkové testy

**jobsProduction progress model** (TC-011):
- number=10, eff=1, maxStep=0.005 → completionUnits=45; QD1-4: curStep=10/20/30/40 (no completion); QD5: curStep=50>45 → reset, bread+=20. PASS.
- eff=2 → completion na QD3 (60>45). PASS.
- eff=0.25 → completion na QD19 (47.5>45). PASS.

**workerEfficiency clamp [0.25, 2]** (TC-003):
- base=1, minWorkerPenalty=-10 → 0.25 (clamp dolů). PASS.
- base=1, goodSpiritsBonus=10 → 2 (clamp nahoru). PASS.
- curfew=true → 0.75. PASS.
- M3 systém zapisuje do `state.home.workerEfficiency=1` na day edge. PASS.

**Area vzorce** (TC-009):
- `forestArea(0) = 33000` (28000 + 1.6^0 * 5000). PASS.
- `forestArea(1) = 36000`. PASS.
- `fieldArea(0) = 1650` (450 + 2^0 * 1200). PASS.
- `mineArea(0, true) = 1000`. PASS.
- `mineArea(3, true) = 3400` (1000 + 3*800). PASS.

**Forest regen (10days)** (TC-001, TC-002):
- Saplings queue: shift→push, délka zůstává 10. PASS.
- Animal growth = ceil(3864*0.0075 + 27173/(3864*10.5+20)) + 70 = správně. PASS.
- Fire risk reset timeSinceLastFire→0 po fire check. PASS.
- Periodika spouštěna přesně na step 9000 (10days edge). PASS.

**Skilly 2× kompenzace** (TC-012):
- woodworking maxStep=50, stepCompensation=0.5 → effMaxStep=25; completion na step 26 (ne step 51). PASS.
- scholarship maxStep=100 → effMaxStep=50; completion na step 51. PASS.

### 3. Catch-up-safe invariant VŠECH M3 systémů (TC-004)

Klíčový test: `live N kroků == dávka N kroků (identický hash)`.

| Test | N kroků | Edges | Výsledek |
|------|---------|-------|---------|
| 5 dní (4500 steps) | 4500 | day, quarterDay, noon | `hash(live) == hash(batch)` PASS |
| 30 dní (27000 steps) | 27000 | month, 10days (3× forestRegen) | `hash(live) == hash(batch)` PASS |
| forest detailní (10 dní) | 9000 | 10days | `world.forest deepEqual` PASS |
| jobs/skills/workerEfficiency (5 dní) | 4500 | quarterDay, step, day | `hash(live) == hash(batch)` PASS |

**Závěr**: Všechny M3 systémy jsou catch-up-safe (deterministické, bez `Date.now`/`Math.random`).

### 4. Save round-trip nových domén (TC-005)

- `world.forest/field/mine` přítomny v payloadu s dynamickými fieldy (curTrees, curAnimals, saplings, health, …). PASS.
- `area`, `used` NEJSOU v payloadu (derivované). PASS.
- `home.jobs.{number, curStep}` přítomno. PASS.
- `home.skills.{progressing, curStep}` přítomno, **progPct NENÍ** v payloadu. PASS.
- `loadAndReconstruct` → progPct=0 (re-derivovaný po loadu). PASS.
- Celý round-trip (save→load): `curTrees/curAnimals/saplings/curOres/curLivestock/curStep jobs` identické. PASS.

### 5. Determinismus RNG streamů (TC-008)

- forest, mine, field streamy inicializovány na různé hodnoty (nezávislé). PASS.
- `mineDaily` neovlivňuje forest stream. PASS.
- `forestRegen` neovlivňuje mine stream. PASS.
- Dva runy se stejným seed → identický výsledek. PASS.

### 6. PWA smoke (nepřímé)

PWA smoke je krytý integrací CI – `npm run ci` zahrnuje `gen-precache.test.js`. PASS.

### 7. Negativní edge cases

- **Vytěžený stock (mine curOres=0)**: `mineDaily` spustí RNG roll (curOres<300), ale no-op v M3 (expander M8). curOres zůstává 0. PASS.
- **Nikdo nepřiřazen (number=0)**: `jobsProduction` job přeskočí, curStep=0, žádná produkce. PASS.
- `curStep` se nemění ani když je non-zero a number=0. PASS.
- field.daily bez farem: field RNG stream NOT spotřebován (chanceOfRodents=0). PASS.
- mine s curOres>=300: mine RNG NOT spotřebován. PASS.

### 8. Math.random NEvolán (TC-015)

Runtime patch `Math.random` + spuštění všech M3 systémů → `called=false`. PASS.

---

## Nové testy přidané testerem

Soubor: `/home/user/ProsperityGamesa/test/m3-production-extended.test.js`

Celkem **45 nových testů** ve 15 suite:

| Suite | Počet testů | Oblast |
|-------|------------|--------|
| TC-001: forestRegen tabular | 3 | Přesné hodnoty forest regen |
| TC-002: forest 10days edge | 1 | Periodicita přes tickOrder |
| TC-003: workerEfficiency clamp | 6 | Clamp [0.25,2] + systém |
| TC-004: Catch-up-safe | 4 | live==batch hash |
| TC-005: Save round-trip | 4 | progPct, derived, fields |
| TC-006: Negative no workers | 2 | 0 produkce bez workerů |
| TC-007: Mine 0 ores | 2 | Exhausted stock |
| TC-008: RNG determinism | 4 | Stream nezávislost |
| TC-009: Forest area cap | 4 | Cap vzorce |
| TC-010: Skills no progress | 2 | progressing=false |
| TC-011: Jobs tabular | 3 | Přesná QD tabulka |
| TC-012: Skills 2× comp | 2 | effMaxStep=maxStep*0.5 |
| TC-013: field no RNG | 3 | field no-op M3 |
| TC-014: assignJob edges | 4 | delta=0, float, unassign |
| TC-015: Math.random gate | 1 | Runtime patch |

---

## Regresní rizika

- Nízké. Všechny stávající 577 testů nadále prochází.
- Klíčová riziková oblast pro M4+: catch-up-safe invariant při přidání ekonomiky/trhu – nové systémy musí splňovat stejný invariant (test TC-004 lze rozšířit).
- G-JOB-MAXSTEP (high): přesné maxStep/products jobů jsou approximated; kalibrace M9. Tabulkové testy ověřují model, ne absolutní balanc.

---

## Recommendation

**Go** – M3 produkční systémy jsou plně otestovány. Implementace je deterministická, catch-up-safe a persist schémata jsou správná.
