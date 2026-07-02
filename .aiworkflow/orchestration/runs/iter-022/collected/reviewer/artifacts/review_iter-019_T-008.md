# Review — iter-019 (M8: Příběh & meta vrstva) — T-008 (závěrečný review gate M8 + DoD M8)

- **Reviewer**: reviewer (Opus-level přísnost)
- **Brief**: BRIEF-019-008
- **Date**: 2026-06-15
- **Scope**: Produkční diff `adef6d3..HEAD -- src/ test/` (25 souborů, +3454/−57). Hodnoceno PROTI KÓDU, ne proti tvrzením QA.
- **QA vstup**: T-007 dal **GO** empiricky (11/11 AC, CI 1509/0). Tento review je nezávislé statické ověření correctness + invariantů + DoD.

---

## VERDIKT: **GO-s-podmínkami**

Implementace je architektonicky čistá, deterministická, a všechny tvrdé invarianty (C4 / engine-stopping serializovatelnost / catch-up pauza / UI bus efemérnost) **PLATÍ proti kódu**. Nalezeny **2 reálné correctness gapy v datech** (dead trigger `firstStarve`, jednorázový `survivedWinter`) — nejsou to engine/determinismus bugy ani C4/serializace porušení, ale způsobují, že 1 MVP story event z DoD sady je **nedosažitelný**. Doporučuji GO s podmínkou opravit MAJOR-1 (data-only fix `firstStarve`) v M9 kalibraci nebo follow-up; MINOR-1 (survivedWinter) je akceptovatelný pro MVP.

**Žádný nález není blocker.** Determinismus, serializovatelnost, C4 fix a UI efemérnost jsou bez výhrad.

---

## Stanovisko k tvrdým invariantům (ověřeno proti kódu)

### 1. C4 fix (achievementy/story deklarativní, jeden evaluator) — **PASS (bez výhrad)**
- Grep gate `unlocked\[…\]\s*=[^=]` napříč `src/`: **jediné přiřazení** = `achievements.js:61` `s.achievements.unlocked[id] = true;` (uvnitř `unlockAchievement`). Řádek 46 je komentář invariantu. (ověřeno bash grepem)
- `achievementsEval` (achievements.js:27-41) = centrální evaluator, čte `def.when` (predikát-jako-data) přes sdílený `evalPredicate`. Žádné imperativní `if(...) unlocked` rozseté po mechanikách.
- Story analogicky: `story.event=` se zapisuje jen ve `story.js:87` (load) a `commands/story.js` (ack/queue) — žádné imperativní `importantEvent.load` rozseté po doménových systémech. Triggery 100 % v datech (`story.json`), vyhodnocené jedním `storyCheck`.
- `buildings.js` čtení `unlocked[techId]` = tech-unlock READ (jiný namespace) — OK, není to achievement write.

### 2. emitEvent EFEMÉRNÍ (mimo state/hashState, engine bez DOM) — **PASS (bez výhrad)**
- `uiEventBus.js`: fronta `let queue=[]` žije v closure modulu **mimo `state`** → mimo `hashState`, neukládá se. `createUiEventBus` + `aggregateUiEvents`.
- `ctx.emitEvent?.()` volán optional na všech místech: `story.js:89`, `achievements.js:67`. Core funguje bez busu.
- `grep document|window` v `src/core/` = **NONE** (engine nikdy nesahá na DOM). (ověřeno)
- Test T4-1 (m8-t2t4.test.js:330-384) **reálně** porovnává `hashState(state1)` (ctx s busem) vs `hashState(state2)` (ctx bez emitEvent) po N krocích → assert rovnost; druhý case ověří, že bus reálně dostal eventy (`events.length>0`) a hash je přesto identický. Validní test efemérnosti.
- Core neimportuje `uiEventBus` (jen `app/main.js`). Wiring main.js:221-222.

### 3. Engine-stopping serializovatelnost (D10) — **PASS (bez výhrad)**
- `state.story.*` = plně plain-data: `{event:null|{id,acked}, queue:[], used:{}, lines:{}, tutorials:{done,curId,curStep}, pendingEffects:[]}` (createInitialState.js:123-131). Žádné closury/funkce/katalog-ref. Speaker je `speakerId` **string** (story.json), jméno/portrét se resolvuje v selektoru `selectActiveStoryEvent` (selectors.js:1073) — NE ve stavu. Splňuje §3.1/riziko „evt.speaker=itemList[id]".
- Effects = string-ID + plain params (`pendingEffects` = serializovatelné), žádné closury (orig `options[].fn` převedeno na data).
- `acknowledgeEvent` (commands/story.js:17-78) **NELOSUJE RNG** — čte katalog, mutuje jen `story.*`/`engine.running`, žádný `nextFloat`/RNG draw. (ověřeno + QA H3 deepStrictEqual rng snapshot)
- `advance()` (clock.js:64-69) zahodí akumulátor (`acc.accMs=0`) při `running===false` → žádný real-time „přeskok" po acku. Paralela k `factor===0` pauze. **Jediná core změna v engine** dle designu §3.4 pozn.
- Save uprostřed eventu → load: `loadAndReconstruct` seeduje z `createInitialState` (plná story shape) a překryje payload (load.js:283) → bit-identický round-trip (QA H2 hash 647467080).

### 4. Catch-up pauza MAJ-1 (D10) — **PASS (bez výhrad)**
- `runCatchupBatch` (catchup.js:46-59) breakuje na `state.engine.running===false` (ř.51), vrací `{stepsRun, stepsRequested, interrupted, capped}`. Beze změny (dle designu §4.2).
- main.js:370-395: `while (result.interrupted && state.story.event)` → `requestRender` → čeká na ack (`engine.running !== false`, ř.376) → `remaining = stepsRequested - stepsRun` (ř.382), `if(remaining<=0) break`, re-`runCatchupBatch({totalSteps: remaining})`.
- **autosave/buildOfflineSummary AŽ ZA smyčkou**: `autosave.requestSave('event')` jen `if(!result.interrupted)` (ř.398-400); `buildOfflineSummary` ř.411-419. Korektní.
- **Cap neporušen**: `totalSteps` ořezán capem (`catchupStepCount`) PŘED první dávkou; `remaining` jen dotáčí už-ořezaný zbytek. Re-vstupy nezvyšují rozpočet.
- UI eventy z catch-upu **agregovány** (`uiEvents.drain()` → `aggregateUiEvents` → `uiEventCounts` v summary, ř.404-418), ne spam toastů.

### 5. Determinismus — **PASS (bez výhrad)**
- `achievementsEval`: `if (unlocked[def.id]) continue` (idempotence, ř.35); `unlockAchievement` guard `if (s.achievements.unlocked[id]) return` (ř.58). Stejný stav → stejné unlocky.
- Unlock efekt = REÁLNÁ mutace (MIN-2): `unlockMap` (effects.js:63 → `catalogState.unlockedMaps[id]=true`), `grantResource` (effects.js:101 → `home.store[id]+=amount`), `startTutorial`/`setStoryFlag` reálné mutace. Žádný `console.log` stub na live efektech. (Pozn.: `unlockBuilding`/`createScholars`/`insertInventory` zůstávají M1 console.log stuby, ale **žádný story/achievement je nepoužívá** — viz NIT-2.)
- `grep Date.now|Math.random|new Date|performance.now` v `src/core/systems|commands|registry` = jen **komentáře** (žádné reálné volání). `predicate.js` čistá fce dat→bool.

### 6. UI bez logiky — **PASS (bez výhrad)**
- `GamelogScreen.js` (GamelogScreen/StoryEventOverlay/TutorialOverlay) = pure Preact, všechny čtení přes selektory (`selectLog`/`selectActiveStoryEvent`/`selectTutorial`), všechny zápisy přes `send()` command. Žádná herní logika.
- Deriváty v selektorech (selectors.js): `selectLog` (newest-first, limit), `selectActiveStoryEvent` (resolve z katalogu), `selectTutorial`, `selectAchievements`. Čistá data.

---

## Nálezy

### MAJOR-1 — `firstStarve` story trigger je DEAD (nedosažitelný event)
- **Soubor:** `src/data/story.json:53` — `"trigger": { "kind": "flagTrue", "path": "home.food.starvation" }`
- **Důkaz:** `grep -rn "starvation" src/` → vyskytuje se **JEN** v story.json:53. State field `home.food.starvation` **NEEXISTUJE** (createHomeState.js:18 má jen `food:{store:{...}}`). Food systém (`food.js:58-69`) počítá `starved` jako **lokální proměnnou** v `meal1` a aplikuje úmrtí, ale nikdy nenastaví perzistentní flag.
- **Dopad:** `evalPredicate` na chybějící path → `getPath` vrátí `undefined` → `flagTrue` vrátí `false` **navždy**. Event `firstStarve` (jeden z MVP sady deklarované v design §3.2 a DoD) se **nikdy nespustí**. Není to crash (graceful false), ale je to nefunkční obsah.
- **Návrh:** buď (a) food.js v `meal1` nastaví `state.home.food.starvation = (starved > 0)` (nebo trvalý flag „už hladověli"), nebo (b) přepsat trigger na existující signál (např. `stateGte` na počet starvation deaths / `flagTrue` na jiný existující health/food flag). Data+1řádek-core fix. Vhodné pro M9 kalibraci nebo follow-up; ne blocker M8 (engine/determinismus nedotčen).

### MINOR-1 — `survivedWinter` se spustí JEN JEDNOU (ne každý rok)
- **Soubor:** `src/core/systems/story.js:31-47` + `src/data/story.json:84-90`
- **Důkaz:** `storyCheck` pro `calendar:every:year` nastaví `s.story.used[yearKey]=true` (ř.47), ale poté `loadStoryEvent` nastaví `s.story.used["survivedWinter"]=true` (story.js:72). Při dalším roce ř.27 `if (s.story.used[id]) continue` event přeskočí. → fire právě jednou (první den roku ≥2), `yearKey` mechanika je tím efektivně mrtvá.
- **Dopad:** design §3.2 zmiňuje „survivedWinter (rok přežit)" jako milník — jednorázový event je legitimní MVP chování (idempotence eventů), ale je nekonzistentní s komentářem „fire survivedWinter once per year" (story.js:45). Achievement `achievementSurvivedWinter` (year≥2) je rovněž jednorázový — konzistentní.
- **Návrh:** buď akceptovat jednorázovost (a smazat zavádějící `yearKey`/per-year komentáře ř.42-47 jako mrtvý kód), nebo pokud má být per-year, nemarkovat `used[id]` pro calendar eventy a místo toho gate-ovat přes `yearKey`. Pro DoD M8 stačí jednorázový → doporučuji jen vyčistit mrtvý `yearKey` kód + komentář (NIT-úroveň cleanup). Ne blokující.

### MINOR-2 — Chained event z `queue` přeskočí `loadStoryEvent` (žádné onShow/log/used)
- **Soubor:** `src/core/commands/story.js:62-71` (a defensivní větev ř.36-41)
- **Důkaz:** Při `opt.next`/neprázdné `queue` ack provede `s.story.event = { id: nextId, acked:false }` **přímo**, NEvolá `loadStoryEvent`. Důsledek: chained event nedostane `onShow` efekty, `logEntry`, ani `s.story.used[id]=true`.
- **Dopad:** V aktuálních datech jediný chained event je `introWelcome→introWorld`; `introWorld` má `onShow` = (žádné), `trigger:null` (storyCheck ho přeskočí ř.29, takže nepotřebuje `used`). → **dnes neškodí.** Ale je to latentní past: jakýkoli budoucí chained event s `onShow` efekty nebo potřebou logu se rozbije. Odchylka od `loadStoryEvent` jako single-entry-pointu.
- **Návrh:** v `acknowledgeEvent` při přechodu na další event volat `loadStoryEvent(state, ctx, nextId)` místo přímého zápisu — sjednotí onShow/log/used/emitEvent. Pozor: command vrstva nemá `ctx` (G-STORY-CTXGAP, Var A) → onShow efekty by se musely přidat do `pendingEffects` a `logEntry`/`used` zapsat v command. Alternativa: dokumentovat, že chained events nesmí mít onShow (data constraint). Pro MVP akceptovatelné, ale doporučuji aspoň komentář-constraint v story.json/kódu.

### NIT-1 — `unlockAchievement` polyká chyby onUnlock efektů tiše
- **Soubor:** `src/core/systems/achievements.js:75-81` — `try {...} catch (_e) {}` (prázdný catch, „non-fatal: unknown effect")
- **Dopad:** Pokud by někdo dal do `achievements.json` onUnlock s nevalidním effect ID nebo špatnými params (effects házejí na validaci, viz effects.js:34/49/65/...), unlock projde, ale efekt se tiše ztratí. Dnes všech 15 ach. má `onUnlock:[]` → loop se nespustí (no harm). Stejný vzor je v `storyApplyEffects` (story.js:108-113). Konzistentní s „fail-soft" volbou codera, ale skrývá data chyby.
- **Návrh:** aspoň `console.warn` (gate-allow) v catch pro dev viditelnost, nebo nechat — nízká priorita (žádný live onUnlock).

### NIT-2 — Story/achievement efekty omezené na naplněné stuby; část K14 stubů stále console.log
- **Soubor:** `src/core/registry/effects.js:32-53,82-91` (`createScholars`/`unlockBuilding`/`insertInventory` = M1 console.log stuby)
- **Dopad:** Žádný story event ani achievement je nepoužívá (story.json onShow = noop/[], options.effects = [], achievements onUnlock = []), takže DoD M8 nedotčeno. Jen poznámka, že K14 registr má mix reálných (unlockMap/grantResource/startTutorial/setStoryFlag) a stub efektů. Doplnit dle potřeby v M9.

### NIT-3 — `achieveBenevolence`/`achieveFeared`/`achieveMight` mají `when:{kind:'never'}`
- **Soubor:** `src/data/achievements.json:103/113/123`
- **Dopad:** 3 achievementy jsou trvale neodemykatelné. Design §6.2 to **explicitně sanguje** (world takeover countery zatím nejsou v repu → `never` + M9 wiring). NE bug, jen evidovaný gap pro M9 kalibraci. Provenance/note v `_meta` to nezmíňuje konkrétně — drobnost.

---

## Soulad s designem (design_iter-019_T-001.md T1–T4) — **OK**
- T1 (story engine-stopping): §3 dodrženo — `state.engine.running=false` slot, serializovatelný `state.story`, `acknowledgeEvent` resume, Var A pendingEffects (commands bez ctx), clock.js akumulátor fix. ✓
- T2 (intro/tutoriál/dialogy): §5 — obsah jako data, efekty string-ID K14, intro = importantEvent řetězec (introWelcome trigger:gameStart → introWorld next), tutoriály non-blocking overlay. ✓
- T3 (achievementy K18/C4): §6 — `when` predikát-jako-data, jeden `achievementsEval`, grep gate čistý. ✓
- T4 (UI event bus): §7 — efemérní bus mimo state, gamelog = `state.log` ring buffer (persist), catch-up agregace. ✓
- Architektura: §3.4 engine-stopping (existující slot naplněn), §7.2/K18 (deklarativní ach.), K14 (efekty data), D10 (catch-up pauza), C4 (žádné háčky) — vše dodrženo.

## R-G provenance — **OK (neflaguji, finální licence M9b)**
- Všechny 4 katalogy (story/dialogues/tutorials/achievements) mají `_meta.provenance:'original-paraphrased'`.
- Namátkové porovnání: story texty jsou CZ parafráze (např. `achieveUnhygienic` „Epidemie nezná hranic — ... Příště možná zkuste mýdlo." vs orig „everyone is sick, even the cows"). Struktura/IDs/číselné prahy (army 100/500/5000, gold 1M, year≥2) převzaty věrně = faktická data (R-G OK). 0 verbatim shod (QA AC8). Není 1:1 originál. Finální licenční gate = M9b.

## Persist / migrace — **OK**
- `persistSchema.js:44` ukládá celé `story`/`achievements`/`log`. Shape plain-data → round-trip bezpečný (QA H2/H6).
- Staré savy (bez `story`): `loadAndReconstruct` seeduje z `createInitialState` (plná story shape) PAK překryje payload (load.js:283) → chybějící klíče doplněny ze seedu, žádný crash. Guard splněn.

## tickOrder (živý artefakt N-04) — **OK**
- tickOrder.js:50 komentář aktualizován („Konec dne: story.check(90) → achievements.eval(95)"). Periodiky appendovány na konec (story.applyEffects step:5, story.check day:90, achievements.eval day:95) bez přeskupení existujících systémů. Order korektní: story.check po doménách (settlement level-up day:20 < 90), achievements.eval po story.check (event reward propaguje první). ✓

## Reuse / mrtvý kód
- Reuse: engine-stopping slot (clock.js/catchup.js), `state.log`/`logEntry`, `ctx.emitTx` vzor pro `emitEvent`, existující K14 stuby naplněny. Dobré.
- Mrtvý kód: `yearKey`/per-year logika v storyCheck (MINOR-1) je efektivně mrtvá. Jinak čisté.

---

## Stanovisko k DoD M8 — **SPLNĚN (s 1 data-gapem k opravě)**
- ✓ **Hra má začátek**: intro řetězec (introWelcome gameStart → introWorld), engine-stopping, serializovatelný progres.
- ✓ **Vedení hráče**: story eventy na milnících (settlement L1-4, buildingBuilt, firstSick) + `acknowledgeEvent` engine-stopping + chaining + non-blocking tutoriály.
- ✓ **Meta-progres**: 15 achievementů K18 deklarativně, deterministicky, idempotentně (3 `never` = M9 wiring, 1 dead `firstStarve` story event).
- ✓ **Notifikace/gamelog**: Deník tab (ring buffer), efemérní UI bus (toast/confetti mimo state), offline agregace.
- ⚠ **1 MVP story event (`firstStarve`) je nedosažitelný** (MAJOR-1) — obsahová vrstva je hratelná a kompletní co do mechaniky, ale tento konkrétní event nikdy nevystřelí. Doporučuji opravit (data + 1 řádek core) před release M9, ne jako blocker M8.

Obsahová vrstva je mechanicky kompletní, deterministická, serializovatelná a hratelná. Smoke renderuje celý app vč. Deníku (0 chyb, QA).

---

## Doporučení dalšího kroku
**GO-s-podmínkami** → milník M8 lze uzavřít. Podmínky (řešit v M9 kalibraci/follow-up, NE re-run M8):
1. **MAJOR-1**: zprovoznit `firstStarve` trigger (nastavit `home.food.starvation` flag ve food.js, nebo přepsat trigger na existující signál).
2. **MINOR-1/MINOR-2**: vyčistit mrtvý `yearKey` kód NEBO sjednotit chained-event přes `loadStoryEvent` (data-constraint dokumentace stačí pro MVP).
3. NIT-1/2/3: volitelné, M9.

Žádný blocker. C4 fix, engine-stopping serializovatelnost, catch-up pauza determinismus a UI event bus efemérnost — **všechny PASS bez výhrad proti kódu**.
