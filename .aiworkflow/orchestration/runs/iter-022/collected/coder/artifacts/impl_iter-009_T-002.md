# Impl Note – iter-009 T-002 (M3 Production) — RE-RUN 1

## CI Results (RE-RUN 1 final)
- tsc: **0 errors**
- lint:core (grep gate): **OK** (41 files checked)
- tests: **633/633 pass** (11 new tests: 4 bootstrap/command-registration + 7 UI-selectors + new bootstrap describe)

## Changes in RE-RUN 1 (T-002rr)

### BLOCKER-1 VERIFIED: commandy assignJob + startSkill + ctx.catalog v runtime
- `src/app/main.js` – `bootstrapEngine()` již registruje `registerAssignJob(creg)`, `registerStartSkill(creg)` i `buildCtxCatalog()` (BL-3 Var. A).
- **Nový test registrace** přidán do `test/boot-integration.test.js`:
  - `bootSequence` posílá `send('assignJob', {delta:0})` → nesmí vrátit "unknown command"
  - `bootSequence` posílá `send('startSkill', ...)` → nesmí vrátit "unknown command"
  - Regresní test: creg jen s `setSpeed` → obě commandy vrátí "unknown command" (potvrzuje bug před opravou)
  - Regresní test: creg se všemi třemi registrovanými → všechny commandy dosažitelné

### BLOCKER-2 DONE: T5 UI obrazovky
- `src/ui/screens.js` – nový soubor; obsahuje:
  - `ForestScreen` – zobrazí stromy, zvířata, zdraví lesa, čas od požáru; pole (dobytek, hlodavci, farmland); důl (rudy)
  - `JobsScreen` – tabulka jobů s přiřazenými pracovníky, progress bar, tlačítka +/− volá `send('assignJob', {jobId, delta})`
  - `SkillsScreen` – seznam dovedností s progress bar + tlačítko "Spustit" volá `send('startSkill', {skillId})`
- `src/ui/App.js` – přepsán: přidány záložky (Přehled / Příroda / Práce / Dovednosti); používá `useState` pro aktivní záložku; renderuje příslušný screen
- `src/ui/selectors.js` – přidány selektory:
  - `selectJobs(s)` → `[{ id, number, curStep }]`
  - `selectSkills(s)` → `[{ id, progressing, curStep, progPct }]`
  - `selectWorkforce(s)` → `{ total, assigned, unemployed, efficiency }`
  - `selectWorld(s)` → `{ forest:{...}, field:{...}, mine:{...} }` (plně typováno via JSDoc)
- Nové testy v `test/ui-selectors.test.js` pro selectJobs, selectSkills, selectWorkforce, selectWorld (7 testů)

### SUGGESTION-1 DONE: forest fire jmenovatel → maxTrees
- `src/core/systems/forest.js` – konstanta `MAX_TREES = BALANCE.forest.maxTrees` (328327); fire risk = `(curTrees / MAX_TREES)^2` místo `(curTrees / forestArea)^2`
- Původní kód s `forestArea(~33000)` dával ~100× vyšší riziko požáru než zdroj (config.js:688)
- `balance.js` již obsahoval `forest.maxTrees: 328327` (bylo připraveno)
- Opraveny testy v `test/m3-production-extended.test.js`:
  - Testy nastavují `curTrees = maxTrees - 100` (ne `forestArea(0) - 100`) pro riziko ≈ 1
  - Komentáře aktualizovány

## Původní scope T-002 (zachováno nezměněno)

### T1: World Stocks (forest/field/mine)
- `src/core/systems/forest.js` – `forestRegen` (10days, order 10)
- `src/core/systems/field.js` – `fieldDaily` (day, order 40)
- `src/core/systems/mine.js` – `mineDaily` (day, order 50)
- `src/core/resources/handlers.js` – `stock` resource kind
- `src/core/balance/balance.js` – forestStocks, field, mine, space, accidents, skills
- `src/core/balance/formulas.js` – forestArea, fieldArea, mineArea, forestUsed
- `src/core/state/createInitialState.js` – createWorldState()

### T2: Jobs + Production Progress Model
- `src/core/systems/jobs.js` – progress model, accidents, autoAssign
- `src/core/commands/assignJob.js` – new command

### T3: workerEfficiency
- `src/core/systems/workerEfficiency.js` – workerEfficiencyDaily (day/5)

### T4: Skills
- `src/core/systems/skills.js` – skillsProgress (step/20), 2× compensation
- `src/core/commands/startSkill.js` – new command

### BL-3: ctx.catalog
- M3 systémy čtou z ctx.catalog (ne getCatalog() v hot-path)

### Persist Schema
- world.forest/field/mine, home.jobs, home.skills, home.workforce.assigned, home.workerEfficiency

## Approximated Values (gaps M9)
- jobs.maxStep=0.005, jobs.max=50, skills.maxStep=50/100, skills.stepCompensation=0.5
- forest.startTrees=27173, forest.startAnimals=3864, forest.saplingQueueLen=10
- workerEfficiency M3 baseline=1.0 (G-MORALE-M5)

## Zbývající odchylky
- assignJob nevaliduje `autoAssignable` (hráč může ručně přepisovat)
- BL-3 Variant B (hasCatalog refactor v population.js/food.js) stále odložen; hot-path M3 čistý
