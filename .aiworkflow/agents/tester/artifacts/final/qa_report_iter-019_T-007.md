# QA Report — iter-019 (M8: Příběh & meta vrstva), T-007

- **Tester**: QA (tester agent)
- **Brief**: BRIEF-019-007
- **Date**: 2026-06-15
- **Scope**: Nezávislá QA M8 — story/importantEvent (T1), achievementy K18 (T3), intro/tutoriál+dialogy (T2), notifikace/gamelog UI event bus (T4). DoD M8.
- **Metoda**: Empirické ověření vlastním během (vlastní harness + vlastní spuštění suit), grep gate, srovnání s originálem. Produkční kód nebyl měněn.

## Verdikt: **GO** (DoD M8) — 11/11 AC PASS, 0 FAIL

---

## Souhrn důkazů (vlastní běhy)

| Důkaz | Výsledek |
|---|---|
| `npm run ci` | **1509 pass / 0 fail**; typecheck EXIT 0; lint:core OK (66 souborů) |
| `npm run smoke` | `SMOKE OK: app rendered, 0 console errors`; tab **Deník** renderuje |
| M8 suity (m8-story + m8-achievements + m8-t2t4) | **124 pass / 0 fail** (34 suites) |
| Regrese M7/M5/M6/M4 (m7b/m7a2/m5/m6/m4b/iter005-edge) | **292 pass / 0 fail** |
| Catch-up/persist/offline regrese | **302 pass / 0 fail** |
| Vlastní QA harness (H1–H6) | **6 PASS / 0 FAIL** |
| C4 grep gate (`unlocked[...] =`) | Jediné přiřazení = `achievements.js:61` (unlockAchievement) |
| DOM v core (`document`/`window`) | **NONE** |
| Math.random/Date v core story/ach/effects | **NONE** (jen komentáře) |
| R-G verbatim shoda story textů s originálem | **0** (paraphrase OK) |

---

## Acceptance Criteria

### AC1 — CI zelené + smoke OK — **PASS**
- `npm run ci`: `# tests 1509 / # pass 1509 / # fail 0`. `npm run typecheck` EXIT 0, `npm run lint:core` → `core import gate OK (66 file(s) checked)`.
- `npm run smoke`: `SMOKE OK: app rendered, 0 console errors`. Hlavička tabů obsahuje `…Bitva  Deník` — gamelog tab renderuje. (Story/Tutorial overlay komponenty importovány v `App.js`.)

### AC2 — emitEvent EFEMÉRNÍ (NEJKRITIČTĚJŠÍ) — **PASS**
- **Test T4-1** (test/m8-t2t4.test.js:330) reálně porovnává `hashState(state1)` (ctx s busem) vs `hashState(state2)` (ctx bez emitEvent) po 10 krocích → assert rovnost. Druhý case: `loadStoryEvent` na obou, bus reálně dostal event (`events.length > 0`), hash identický.
- **Vlastní harness H1**: 400 kroků s reálnými katalogy story+achievements, jeden stav s busem, druhý bez; oba acknowledgovány v lockstepu. `hashState` identický = **2274103360**. Bus eventy posbírány (mimo state), 1 ack.
- `uiEventBus.js`: fronta `let queue=[]` žije v closure modulu **mimo `state`** → neukládá se (potvrzeno H2 round-tripem). Core neimportuje uiEventBus; `grep document|window` v `src/core/` = NONE (engine nesahá na DOM).

### AC3 — Story engine-stopping + save/load round-trip — **PASS**
- `loadStoryEvent` nastaví `s.engine.running=false` + `s.story.event={id,acked:false}` (story.js:87-89). 
- **Vlastní harness H2**: save UPROSTŘED eventu (`introWelcome`, running=false) → `applyPersist`+`loadAndReconstruct` → `hashState` bit-identický = **647467080**, `story.event` deepStrictEqual. `JSON.stringify(s.story)` projde (serializovatelný, žádné closury).
- **Vlastní harness H3 (ack NELOSUJE RNG)**: snapshot `s.rng` před/po `acknowledgeEvent` → `deepStrictEqual` shoda (streams nezměněny). `acknowledgeEvent` (commands/story.js) jen čte katalog + mutuje story/engine, žádný `nextFloat`/RNG draw.

### AC4 — Catch-up pauza D10 (re-vstup remaining) — **PASS**
- **MAJ-1 while-smyčka** potvrzena v `main.js:370-395`: `while (result.interrupted && state.story.event)` → čeká na ack (`engine.running !== false`) → `remaining = stepsRequested - stepsRun` (řádek 382), `if (remaining<=0) break`, re-`runCatchupBatch({totalSteps: remaining})`.
- **autosave/buildOfflineSummary AŽ ZA smyčkou**: `autosave.requestSave('event')` (jen `if (!result.interrupted)`) a `buildOfflineSummary` na ř. 398-419 — za while-loop. Cap respektován (`wasCapped`/`result.capped` propagovány; remaining nikdy nezvýší rozpočet).
- **Agregace do offline summary** (ne spam toastů): `uiEvents.drain()` → `aggregateUiEvents` → `uiEventCounts` v summary (main.js:404-419; T4-7/T4-8 testy potvrzují).
- Suity SR-4 (m8-story.test.js:383+) + catchup/catchup-invariant/offline-summary = **302 pass/0 fail**.

### AC5 — Achievementy deterministické + idempotentní + reálná mutace — **PASS**
- `achievementsEval` (achievements.js:35): `if (unlocked[def.id]) continue` (idempotence). `unlockAchievement:58`: `if (s.achievements.unlocked[id]) return` (guard re-unlock).
- **Vlastní harness H4**: dvojí `unlockAchievement(id)` → druhé volání no-op (deepStrictEqual snapshot). 
- **Vlastní harness H5 (MIN-2 reálná mutace)**: `grantResource{wood,7}` → `home.store.wood 0→7`; `unlockMap{northland}` → `catalogState.unlockedMaps.northland=true`. Reálné mutace, ne stuby.
- **Vlastní harness H6**: `achievements.unlocked` přežije `applyPersist`+`loadAndReconstruct` round-trip.
- Pozn.: V `achievements.json` jsou `onUnlock:[]` (prázdné) u všech 15 ach. — žádný ach. dnes nepoužívá K14 efekt (H4 `hasEffect=false`). Konzistentní s impl summary; efekty samotné ověřeny H5. NE bug.

### AC6 — C4 grep gate — **PASS**
- `grep -rEn "unlocked\[[^]]*\]\s*=[^=]" src/`: jediné přiřazení = `achievements.js:61  s.achievements.unlocked[id] = true;` (řádek 46 je komentář invariantu). Žádné imperativní achievement/story háčky rozseté po systémech. Ostatní výskyty `unlocked[...]` jsou **čtení** (selectors `=== true`/`!!`, buildings `!unlocked[techId]` = tech-unlock, jiný namespace).

### AC7 — Tutoriál/intro e2e + persist — **PASS**
- T2-1..T2-5: `advanceTutorial` postupuje curStep, na poslední krok complete + `done[id]=true`; `dismissTutorial`; `startTutorial`/`setStoryFlag` efekty. T2-2 persist: `state.story.tutorials` přežije `persistSchema`+`loadAndReconstruct` round-trip.
- Intro: `selectActiveStoryEvent` čte `introWelcome` z katalogu (T4-9); intro řetězec (introWelcome→introWorld trigger:null chained) ověřen H2 (introWelcome stopuje engine).
- Texty jako data (K14): žádná herní logika v UI (grep Math.random/Date.now/new Date v `src/ui/*log/story/tutor*` = NONE).

### AC8 — R-G evidence (texty ne 1:1) — **PASS**
- `_meta.provenance='original-paraphrased'` ve VŠECH 4: story.json (12 eventů), dialogues.json (2), tutorials.json (3), achievements.json (15).
- Verbatim sken: 0 story textů z `story.json` se vyskytuje doslovně v originálu `doc/original_source/.../events.js`. Originál = anglická engine logika (`Engine.once(...)`), naše texty = CZ parafráze ("Vítejte, pane! Tato země čeká…"). Triggery/IDs/struktura zachovány (`trigger:{kind:'settlementLevel',atLeast:1}` apod.).

### AC9 — Gamelog/notifikace UI render — **PASS**
- `GamelogScreen.js` renderuje nad `state.log` ring bufferem (selektor `selectLog` newest-first, limit param — T4-4). Tab `{id:'gamelog', label:'Deník'}` v App.js:30, renderován App.js:123. `StoryEventOverlay`/`TutorialOverlay` importovány. Notifikace z `uiEvents.drain()` (main.js:311). Smoke: 0 console errors. UI = selektory+komponenty, žádná logika.

### AC10 — M8 nerozbil M7/M5/M6/M4 — **PASS**
- m7b-battle (t1/t3/t4) + m7a2-world (t2/t3) + m5-buildings (t1-t4) + m6-tech + m4b-market + iter005-edge: **292 + 302 pass / 0 fail** napříč dvěma běhy. Celkové CI 1509/0.

### AC11 — DoD M8 celkově — **PASS**
- Hra má začátek (intro/tutoriál se serializovatelným progresem), vedení hráče (story/importantEvent + acknowledge engine-stopping + chaining), meta-progres (15 achievementů K18 deterministicky), notifikace/gamelog (Deník tab, efemérní bus). Obsahová vrstva kompletní a hratelná. Smoke renderuje celý app vč. Deníku, 0 chyb.

---

## Bug reporty
Žádné. Žádný produkční kód nebyl měněn.

## Známé gapy (NE bug — schváleno, kalibrace M9)
- achievements `onUnlock:[]` prázdné (žádný ach. nepoužívá K14 efekt zatím) — designově ok, efekty (grantResource/unlockMap) ověřeny funkční pro M9.
- balanc/kalibrace (market, offline cap), G-BUILD/RECRUIT-TXAUDIT, V1/V2, G-WORLD-*, G-AIBATTLE-DEDUP, G-MILITARY-STATS, MIN-1 — viz brief Scope OUT.

## Regresní rizika
- emitEvent efemérnost je invariant závislý na tom, že bus zůstane mimo `state`; budoucí změny musí udržet `queue` v closure (ne v state). Pokrylo H1 + T4-1.
- C4 gate: jakýkoli nový zápis `unlocked[...]` mimo `unlockAchievement` poruší determinismus/idempotenci — udržovat grep gate.

## Recommendation: **GO** — DoD M8 splněn, milník Příběh & meta vrstva kompletní a hratelný.
