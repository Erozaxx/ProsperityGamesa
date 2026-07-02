# Review Gate – iter-009 / T-004 – RE-REVIEW round 2 (M3, DoD M3)

- **Task**: T-004, iter-009 (BRIEF-035rr / RE-REVIEW round 2), gate **M3 = DoD M3**
- **Reviewer**: reviewer (Opus), s pravomocí re-run
- **Datum**: 2026-06-13
- **Verdikt**: **GO**
- **CI**: `npm run ci` ZELENÉ — typecheck (tsc --noEmit, 0 chyb) + lint:core (core bez DOM) + **633/633 testů pass** (předtím 622 → +11 nových testů pokrývajících opravy)

---

## Shrnutí

Oba blockery z předchozího review jsou opraveny a S-1 (forest fire jmenovatel) je vyřešen v souladu se zdrojem. Integrační vrstva je nyní reálně napojená: nové commandy jsou registrované v živém bootstrapu, `ctx.catalog` je naplněn v runtime, a UI obrazovky (Forest/Field/Mine/Jobs/Skills) jsou napojené na `send('assignJob'|'startSkill')`. Produkční smyčka je hratelná end-to-end přes aplikaci. DoD M3 je reálně splněno. Verdikt **GO**.

---

## Ověření oprav

### B-1 — commandy `assignJob`/`startSkill` + `ctx.catalog` v runtime — OPRAVENO (ověřeno v kódu i testem)
`src/app/main.js` `bootstrapEngine()` (řádky 79-89):
- Volá `registerSetSpeed(creg)`, **`registerAssignJob(creg)`**, **`registerStartSkill(creg)`** — všechny tři commandy jsou v živém `creg`. `send('assignJob'|'startSkill')` po bootu už nevrací „unknown command".
- `buildCtxCatalog()` (řádky 58-70) sestaví `ctx.catalog = { jobs, skills, houseTypes, food }` z globálního katalogu přes `hasCatalog`/`getCatalog`, vrací pole položek pod správným klíčem. Ověřeno, že `getCatalog('jobs')` vrací `{_meta, jobs}` a extrakce `cat['jobs']` vrací pole — shoda s konzumací v systémech.
- Konzumace v systémech sedí: `jobs.js:31` čte `ctx.catalog.jobs`, `jobs.js:46` `ctx.catalog.houseTypes`, `skills.js:29` `ctx.catalog.skills`. BL-3 Var. A (preload mimo hot-path) je tedy v runtime reálně realizován, ne jen v testech se syntetickým ctx.

**Test pokrytí (regrese):** `test/boot-integration.test.js` má dedikovaný blok „BLOCKER-1":
- `assignJob a startSkill jsou registrované v creg po bootSequence` — testuje přes reálné `send()` z `mountUI`, selhal by při „unknown command".
- `assignJob s delta=0 vrací ok` — pozitivní důkaz registrace.
- `regression: pokud creg má jen setSpeed, dispatch vrací unknown-command` — chytí náhodné odstranění registrace.
- `regression: se všemi třemi registrovanými jsou všechny dosažitelné`.

Testy by selhaly, kdyby fix nebyl v `bootstrapEngine` — splňuje požadavek „test to ověřuje (selhal by jinak)".

### B-2 — T5 UI obrazovky napojené na commands — OPRAVENO
- `src/ui/screens.js`: `ForestScreen` (forest/field/mine přehled), `JobsScreen` (+/- tlačítka → `send('assignJob', {jobId, delta})`, disabled při unemployed≤0 / number≤0), `SkillsScreen` (tlačítko „Spustit" → `send('startSkill', {skillId})`). Čisté view komponenty (preact+htm), žádné DOM importy.
- `src/ui/selectors.js`: doplněny `selectJobs`, `selectSkills`, `selectWorkforce` (total/assigned/unemployed/efficiency), `selectWorld` (forest/field/mine). Čisté, unit-testovatelné selektory (testy 204-208 zelené).
- `src/ui/App.js`: záložky Přehled / Příroda / Práce / Dovednosti; world/jobs/skills taby renderují příslušné obrazovky a předávají `snapshot`+`send`.
- Produkční smyčka je tím hratelná end-to-end: hráč může přiřazovat workery (assignJob) i startovat skilly (startSkill) přes UI, čímž se rozběhne `jobsProduction` a `skillsProgress`. Předchozí námitka („UI framework v repu JE") je tím vyřešena — žádný scope change nebyl potřeba.

### S-1 — forest fire jmenovatel `maxTrees` — OPRAVENO (dle zdroje)
- `src/core/systems/forest.js:21` `MAX_TREES = BALANCE.forest.maxTrees`; fire risk `Math.pow(f.curTrees / MAX_TREES, 2)` (řádek 66).
- `balance.js:50` `forest.maxTrees = 328327` s provenance odkazem na `config.js:688`. Riziko požáru je tím v souladu se zdrojem (≈0.0068 při startu místo dřívějších ≈0.68 s `forestArea`). Komentář korektně poznamenává, že forester tech modifikuje maxTrees až v M5+ (gap G-FOREST-TECHMODS), pro M3 statická hodnota.

---

## DoD M3 — potvrzení
- **Produkční smyčka hratelná end-to-end**: ANO — commandy registrované + UI napojené na assignJob/startSkill.
- **Jádro M3 (T1–T4 + BL-3)**: nezměněno, zůstává věrné zdroji, deterministické (potvrzeno v předchozím review).
- **Catch-up-safe nezhoršeno**: ANO — main.js používá `ctx` (vč. catalog) i v `runCatchupBatch` (řádek 257-268), stejný ctx jako live loop; žádný `Date.now()`/`Math.random()` přidán; selektory a UI jen čtou state. B-2 testy potvrzují catch-up nadále advancuje curStep.
- **Core bez DOM**: ANO — lint:core zelené; UI (screens.js/App.js/selectors.js) žije v `src/ui/`, mimo core.
- **CI**: zelené (typecheck + lint:core + 633/633 test).

---

## Zbylé nálezy (backlog, NEblokují gate)

- **NITPICK-1** (z round 1, beze změny): `timeSinceLastFire` inkrementuje vždy + reset na 0 po fire-checku; zdroj inkrementuje jen v else-větvi. Posun o 1 krok před prvním eligible požárem, nemateriální. Bez akce.
- **NITPICK-2** (z round 1): `startSkill` nevaliduje `canAfford(def.cost)` ani discovery; v M3 skilly `cost:{}` + `discovered:true`, bezvýznamné. Gapy G-SKILL-COST-M5 / G-SKILL-DISCOVERY existují pro M5+.
- **G-FOREST-TECHMODS** (existující gap): forester/pollination/animalGrowth tech modifikátory pro les odloženy na M5/M6.
- **UI polish** (mimo gate): JobsScreen `progress max="100"` je vizuální aproximace (job curStep není v rozsahu 0-100, ale 0..completionUnits); kosmetické, nezkresluje akce. Doporučeno doladit progress bar normalizaci v UI-zaměřeném tasku.

---

## Verdikt: GO

Oba blockery (B-1 registrace commandů + ctx.catalog runtime preload, B-2 T5 UI napojené na commandy) jsou opraveny a pokryté regresními testy; S-1 forest fire jmenovatel sjednocen se zdrojem. DoD M3 reálně splněno — produkční smyčka je hratelná end-to-end, jádro věrné zdroji, catch-up-safe nezhoršeno, core bez DOM, CI zelené (633/633). Gate **GO**. Zbylé nálezy jsou NITPICK/backlog a nebrání uzavření milníku M3.
