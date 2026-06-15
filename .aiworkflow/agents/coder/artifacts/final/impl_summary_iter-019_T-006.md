# Implementation Summary — iter-019 T-006 (M8 T2+T4)

- **Task**: T-006 = T2 (intro/tutoriál+dialogy) + T4 (notifikace/gamelog UI event bus)
- **Iteration**: iter-019 (M8)
- **Date**: 2026-06-15
- **Gate result**: ci 1509 pass / 0 fail; smoke PASS (0 console errors); determinism OK

---

## Soubory: funkce

### Nové soubory

| Soubor | Funkce |
|---|---|
| `src/app/uiEventBus.js` | `createUiEventBus()` (push/drain/size), `aggregateUiEvents()` — efemérní bus MIMO state |
| `src/ui/GamelogScreen.js` | `GamelogScreen` (ring buffer panel), `StoryEventOverlay` (engine-stopping dialog), `TutorialOverlay` (non-blocking nápověda) |
| `src/data/dialogues.json` | Dialog katalog (milontiDialogue1, advisorIntroDialogue); vlastní texty, `_meta.provenance:'original-paraphrased'` |
| `test/m8-t2t4.test.js` | 42 nových testů: T2 (tutoriál progres/persist/dismiss/startTutorial/setStoryFlag/data katalogy), T4 (emitEvent hash-safe, bus, aggregate, selectLog, selectTutorial, selectAchievements, offline summary) |

### Změněné soubory

| Soubor | Změna |
|---|---|
| `src/core/registry/effects.js` | `startTutorial(state,params,ctx)` + `setStoryFlag(state,params,ctx)` + `registerStoryEffects(reg)` + napojení v `registerEffects` |
| `src/core/commands/story.js` | `advanceTutorial(state,params)` + `dismissTutorial(state,params)` + registrace v `registerStoryCommands` |
| `src/ui/selectors.js` | `selectLog(s,limit)`, `selectTutorial(s)`, `selectAchievements(s)`, `selectActiveStoryEvent(s)` |
| `src/ui/App.js` | Tab "Deník" přidán; `StoryEventOverlay` + `TutorialOverlay` napojeny jako overlay komponenty |
| `src/app/catalogs.js` | `tutorials` a `dialogues` přidány do `CATALOG_NAMES` |
| `src/app/main.js` | `ctx.emitEvent = (ev) => uiEvents.push(ev)` wiring; catch-up drain+aggregate (`aggregateUiEvents`); `uiEventCounts` předán do `buildOfflineSummary`; import `createUiEventBus`/`aggregateUiEvents` |
| `src/ui/OfflineSummary.js` | `OfflineSummaryModel` rozšíren o `uiEventCounts`; `buildOfflineSummary` přijímá `opts.uiEventCounts`; `formatOfflineSummary` zobrazuje agregované eventy |
| `src/core/catalog/schemas.js` | Schémata pro `tutorials` (required: id, itemShape: id/string) a `dialogues` (required: id/speakerId, itemShape) |
| `src/precache.js` | Regen po přidání nových souborů (113 souborů, nová verze hash) |

---

## R-G licence (texty)

- `src/data/dialogues.json`: vlastní texty, `_meta.provenance:'original-paraphrased'`
- `src/data/tutorials.json`: vlastní texty, `_meta.provenance:'original-paraphrased'` (existovalo z T1)
- `src/data/story.json`: vlastní texty, `_meta.provenance:'original-paraphrased'` (existovalo z T1)
- `src/data/achievements.json`: vlastní texty, `_meta.provenance:'original-paraphrased'` (existovalo z T3)
- Žádné texty 1:1 z originálu; číselné prahy = faktická data (R-G OK)

---

## emitEvent efemérnost (T4 determinismus)

- `ctx.emitEvent` = push do `uiEvents` fronty vytvořené v `bootSequence` — **MIMO `state`**
- `emitEvent?.()` je optional — core/testy bez UI bežně (žádná závislost core na busu)
- `hashState` nevidí frontu → hashState identický s/bez busu (T4-1 test: 2 state se stejným seedem a různou emitEvent konfigurací dají identický hash po N krocích)
- Catch-up: `uiEvents.drain()` po dávce → `aggregateUiEvents()` → `uiEventCounts` v offline summary (ne spam toastů)
- `state.log` ring buffer = deterministický, persist, součást hashState — gamelog/Deník tab čte z něj

---

## Gate výsledek

| Kritérium | Výsledek |
|---|---|
| `npm run ci` | 1509 pass / 0 fail (typecheck + lint:core + test) |
| `npm run smoke` | SMOKE OK, 0 console errors, "Deník" tab viditelný |
| Determinismus G1 | OK — T4-1 test ověřuje hash identity |
| M8 (m8-story, m8-achievements) | 1467 original + 42 nových = 1509 total, 0 fail |
| M7/M5/M6 nedotčené | OK — žádné M7/M5/M6 testy nepadly |
| emitEvent NESMÍ ovlivnit hashState | OK — T4-1 test; bus je MIMO state |
| Precache regen | Provedeno (113 souborů, nový version hash) |

---

## Co UI pokrývá (T2+T4)

- **GamelogScreen / tab "Deník"**: ring buffer `state.log` (newest-first, limit 100); deterministický, persist
- **StoryEventOverlay**: engine-stopping event dialog (speaker, text, options → `acknowledgeEvent`); zobrazí se přes celé UI
- **TutorialOverlay**: non-blocking nápověda overlay (text, krok N/M, Další/Hotovo/Zavřít → `advanceTutorial`/`dismissTutorial`)
- **Selektory**: `selectLog`, `selectTutorial`, `selectAchievements`, `selectActiveStoryEvent` — čistá data bez logiky v UI
- **Offline summary**: catch-up UI eventy agregované do `uiEventCounts` (ne spam toastů) — zobrazeny v OfflineSummary
