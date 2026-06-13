# Review Gate – iter-009 / T-004 – M3 (Produkce, joby, workerEfficiency, skilly + BL-3)

- **Task**: T-004, iter-009 (BRIEF-035), gate **M3 = DoD M3**
- **Reviewer**: reviewer (Opus), s pravomocí re-run
- **Datum**: 2026-06-13
- **Verdikt**: **RE-RUN** (jeden BLOCKER proti DoD M3 „produkční smyčka hratelná")
- **CI**: `npm run ci` ZELENÉ — typecheck + lint:core (core bez DOM) + **622/622 testů pass**

---

## Shrnutí

Jádro M3 simulace (T1–T4 + BL-3) je implementačně správné, věrné zdroji, deterministické a catch-up-safe; CI zelené. **Problém je integrační vrstva**: nové commandy nejsou registrované v živém bootstrapu a UI (T5) zcela chybí, takže produkční smyčka **není hratelná end-to-end přes aplikaci** — běží jen autonomní simulace. To je přímý rozpor s DoD M3 („produkční smyčka **hratelná**"). Proto RE-RUN s úzkým scope (níže).

---

## Co je OK (ověřeno proti zdroji a návrhu)

### Pořadí uvnitř dne – tickOrder (§4.3 věrnost) — VĚRNÉ
`src/core/engine/tickOrder.js` přesně odpovídá návrhu §2 i zdroji:
- `skills.progress` step/20; `jobs.production` qd/10, `jobs.accidents` qd/20, `jobs.autoAssign` qd/30; `workerEfficiency.daily` day/5 (PŘED `food.meal1` day/10); `field.daily` day/40, `mine.daily` day/50; `forest.regen` 10days/10.
- `docs/tickOrder.md` aktualizován ve stejném smyslu (živý artefakt N-04). OK.

### Pořadí kroku Engine→World→Skills + 2× kompenzace skillů — VĚRNÉ (klíčové ověření)
Ověřeno přímo ve zdroji, že **`Skills.step()` se v originálu volá DVAKRÁT za engine krok**:
- `world.js:575` (`World.step()` → `Skills.step()`)
- `game.js:18` (`Game.run()` → `Skills.step()` znovu, po `World.step()`)

Skilly tedy v originálu progresují 2×/krok při prahu `curStep > maxStep`. Rebuild běží `skillsProgress` 1×/step (edge `step`) a kompenzuje prahem `effMaxStep = maxStep * 0.5`. To je **věrná reprodukce** 2× rychlosti. `BALANCE.skills.stepCompensation = 0.5`, completion na step 26 pro maxStep=50. Design rationale (§6.2) potvrzen zdrojem. OK.

### Jobs progress model — VĚRNÝ
`jobsProduction` (jobs.js:79-113) odpovídá home.js:1510-1547:
- `completionUnits = maxStep * STEPS_PER_DAY(900) * number`; `curStep += workerEfficiency * number`; completion → grant `products*number` (Math.round), reset `curStep=0`. OK.
- Pořadí inkrement→check je dle návrhu §4.2 (drobná odchylka od source pořadí else-větve, semanticky ekvivalentní pro catch-up). OK.
- `builder`/`noProduction` skip, prázdné products skip, `number<=0` skip. OK.

### workerEfficiency (T3) — OK
`workerEfficiencyDaily` (day/5) zapisuje `state.home.workerEfficiency` přes čistou formulu clamp [0.25,2]; M3 = konstanta 1 (G-MORALE-M5). Běží PŘED produkcí (day před quarterDay v dalším dni). OK.

### Catch-up-safe invariant (posouzeno i v KÓDU) — OK
- Čas jen `state.engine.curStep`/`state.season.curSeason`; náhoda jen `makeRng(state, stream)`. **Žádný `Date.now()`/`Math.random()`** v M3 systémech (potvrzeno čtením + lint gate + test TC-015 runtime patch).
- RNG streamy: forest/field/mine vlastní streamy; accidents sdílí `population` s crime (různé edge → deterministické pořadí). field/mine RNG se NEčerpá když není důvod (chanceOfRodents=0 / ores>=300) — věrné originálu (Math.random jen uvnitř if). Žádné skryté alokace v hot-path (products mapa jen při completion). OK.
- BL-3: try/catch control-flow nahrazen `hasCatalog` fallbackem; v M3 systémech (jobs/skills) primárně `ctx.catalog`. Anti-pattern z hot-path odstraněn. (Viz ale BLOCKER-1 — preload ctx.catalog není v live bootstrapu.)

### Kvalita / persist allowlist — OK
- `persistSchema.js`: `world.forest/field/mine`, `home.jobs{number,curStep}`, `home.skills{progressing,curStep}`, `home.workforce.assigned`, `home.workerEfficiency`. **`progPct` ani `area/used` NEjsou v payloadu** (derivované) — ověřeno v kódu i TC-005. OK.
- `stock` handler (handlers.js) s NaN guardem + clamp ≥0 + STOCK_PATH; resource kind `stock` v schématu. OK.
- balance.js: production/forestStocks/field/mine/space/accidents/skills s odkazy na zdroj a `approximated` provenance + gap záznamy. OK.
- Core bez DOM (lint:core 41 souborů OK).

---

## Nálezy

### BLOCKER-1 — Commandy `assignJob`/`startSkill` nejsou registrované + `ctx.catalog` není wired v live bootstrapu (DoD M3: „hratelná")
**Soubor:** `src/app/main.js:54-60` (`bootstrapEngine`).
```js
function bootstrapEngine() {
  const registry = createRegistry();
  const periodics = registerCorePeriodics(registry);
  const creg = createCommandRegistry();
  registerSetSpeed(creg);                       // <-- jen setSpeed
  return { ctx: { registry, periodics }, creg }; // <-- ctx bez .catalog
}
```
**Problém:**
1. **`registerAssignJob(creg)` a `registerStartSkill(creg)` se nikde nevolají** (grep: jen v definicích commandů, žádný call-site). V běžící aplikaci tedy `send('assignJob'|'startSkill')` selže → hráč nemůže přiřazovat workery ani startovat skilly. Skill bez `startSkill` má `progressing=false` napořád → `skillsProgress` nikdy nic neprodukuje. To je rozpor s **DoD M3 „produkční smyčka hratelná"** a s návrhem §8.4, který registraci explicitně vyžaduje.
2. **`ctx.catalog` se nikdy neplní** → BL-3 „Varianta A" (přednačtený katalog mimo hot-path) není v runtime realizována; systémy běží na `hasCatalog/getCatalog` fallbacku každý krok. Funkčně to neselže (fallback funguje, proto CI zelené), ale zamýšlený cíl BL-3 (preload do ctx) je naplněn jen v testech se syntetickým ctx, ne v aplikaci.

**Návrh opravy (úzký):** v `bootstrapEngine` přidat `registerAssignJob(creg); registerStartSkill(creg);` a sestavit `ctx.catalog = { jobs, houseTypes, food, skills }` z `getCatalog(...)` po načtení katalogů (návrh §7 Var. A, §8.4). Doplnit test, že obě commandy jsou v `creg` po bootstrapu (regrese registrace).

### BLOCKER-2 — T5 UI obrazovky a UI selektory zcela chybí (DoD M3: „hratelná")
**Stav:** `src/ui/screens/` neexistuje; `selectJobs/selectSkills/selectResourceAreas/selectWorkforce` nejsou v `src/ui/selectors.js`; žádné `send('assignJob'/'startSkill')` z UI. Coder to přiznává jako deviation (impl note „Deviations from Spec", důvod „no UI framework confirmed").
**Dopad:** I kdyby commandy byly registrované (BLOCKER-1), hráč nemá žádné UI pro forest/field/mine/jobs/skills. Produkční smyčka tedy běží pouze autonomně (autoAssign rozdělí workery, joby produkují), ale **není „hratelná"** ve smyslu interakce — což je doslovné znění DoD M3.
**Poznámka k závažnosti:** UI framework V REPU JE (preact+htm, App.js, selectors.js, send()) — odůvodnění „no framework confirmed" neobstojí; návrh §8 dává konkrétní rozpis. Pokud orchestrátor rozhodne, že autonomní smyčka stačí pro M3 a UI se přesune do samostatného tasku/milníku, je to **scope change** a musí být zapsán (project/scope-changes.md) + DoD M3 přeformulováno. Jinak je to blocker.

### SUGGESTION-1 — Forest fire: jmenovatel `forestArea` vs zdrojový `maxTrees` (balanc)
`forest.js:58` počítá `risk = (curTrees / area)^2`, kde `area = forestArea(level)` = 33000 (level 0). Zdroj (forest.js:98) používá `forest.maxTrees` (init 328327, config.js:688). Riziko požáru je tím **~100× vyšší** (≈0.68 vs ≈0.0068 při startovních stromech). **Coder postupoval dle návrhu §3.1 step 3**, který `forestArea(state)` jako jmenovatel explicitně předepsal — jde tedy o nepřesnost NÁVRHU, ne chybu codera. Doporučuji: zapsat jako gap (G-FOREST-FIRE-DENOM, balanc, M9) nebo opravit jmenovatel na `maxTrees` (vyžaduje zavést `maxTrees` do stavu/balance). Nezavírá gate, ale je to znatelná balanční odchylka od zdroje.

### NITPICK-1 — `timeSinceLastFire` inkrement
Zdroj inkrementuje `timeSinceLastFire` jen v `else` (když ≤23); impl inkrementuje vždy a po fire-checku resetuje na 0. Posun o 1 krok před prvním eligible požárem, nemateriální. Bez akce.

### NITPICK-2 — `startSkill` neřeší cost/discovered
Command nevaliduje `canAfford(def.cost)` ani discovery (zdroj skills.js:46 ano). V M3 jsou skilly `cost:{}` + `discovered:true`, takže bezvýznamné; gapy G-SKILL-COST-M5/G-SKILL-DISCOVERY existují. OK pro M3.

---

## Verdikt: RE-RUN

DoD M3 vyžaduje „produkční smyčka **hratelná**". Simulační jádro je hotové a korektní, ale **interakční vrstva (registrace commandů + UI) chybí** → smyčka není hratelná přes aplikaci. To gate blokuje.

**Přesně co re-run (úzký scope, jádro NEMĚNIT):**
1. **BLOCKER-1**: v `src/app/main.js` `bootstrapEngine` zaregistrovat `assignJob` + `startSkill` a sestavit `ctx.catalog` (jobs/houseTypes/food/skills) — návrh §7 Var. A, §8.4. + test registrace.
2. **BLOCKER-2**: dodat T5 — UI selektory (`selectJobs/selectSkills/selectResourceAreas/selectWorkforce`) a obrazovky Forest/Field/Mine/Jobs/Skills s `send('assignJob'/'startSkill')` (návrh §8). **NEBO** orchestrátor schválí scope change (autonomní smyčka = M3, UI → samostatný task) a zapíše ho do `project/scope-changes.md` + upraví DoD M3; pak BLOCKER-2 → odloženo.
3. **SUGGESTION-1** (volitelně v rámci re-runu): rozhodnout forest-fire jmenovatel (maxTrees vs forestArea) — opravit nebo zapsat gap.

Po opravě 1 (+2 nebo schválený scope change) je gate GO: jádro, věrnost zdroji, catch-up-safe, persist a CI jsou splněné.
