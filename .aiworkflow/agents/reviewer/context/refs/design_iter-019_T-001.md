# Design M8 — Příběh & meta vrstva (importantEvent/story · intro/tutoriál+dialogy · achievementy K18 · notifikace/gamelog)

- **Doc ID**: DESIGN-019-001
- **Iteration**: iter-019 (M8 — Příběh & meta; **poslední obsahová vrstva**, M9 = kalibrace+release)
- **From**: architect (T-001)
- **Pro**: Sonnet coder (implementace bez dalších architektonických rozhodnutí)
- **Date**: 2026-06-15
- **Drží**: architektura iter-002 — §3.3 (commands), §3.4 (snapshot/doménové události/engine-stopping, K9), §4.1 (engine-stopping přeruší dávku), §4.3 (tickOrder, živý artefakt N-04), §5.4 (akce obsahu jako data K14), §5.6 (fail-fast fns registr K10), §7.2 (achievementy deklarativně K18, C4), §9.2 (D10 catch-up pauza)
- **Zdroj pravdy mechanik (triggery/struktura, NE text)**: `doc/original_source/modules/prosperity/services/` — `game.js` (save/load story/importantEvent/tutorials), `config.js` (importantEvent service ř.4281-4347, achievements ř.7376-7412, dialogueUI ř.7415), `home.js`/`events.js` (kde se `importantEvent.load(id)` imperativně volá), `engine.js` (Engine.stop/start ř.79-91), `dialogue.js`
- **Reference rozhodnutí**: DR-013-00 (renumbering — M8 = reálná iter-019, čte se „o jedna výš" vůči master plánu iter-016); master plán iter-003 §3/iter-016(M8) T1–T4 + §1.2 (komplexita) + §1.3 (test loop)

---

## 0. SHRNUTÍ ROZHODNUTÍ (TL;DR)

| Téma | Rozhodnutí |
|---|---|
| **SPLIT M8** | **NE.** T1(M)+T2(M)+T3(M)+T4(S) do jedné iterace. Žádný L task; T1 a T3 jsou nezávislé, T2 a T4 jsou tenké nástavby na T1. §1. |
| **T1 importantEvent engine-stopping** | Doménová událost + **využití existujícího slotu** `state.engine.running=false` — `advance()` (clock.js:77) i `runCatchupBatch()` (catchup.js:51) **už dnes break-ují** na `running===false`. Žádná nová engine smyčka. Story stav serializovatelný v `state.story.event`. Resume přes `acknowledgeEvent` command → `running=true`. §3, §4. |
| **T1 catch-up pauza (D10)** | engine-stopping event uprostřed catch-up dávky: `runCatchupBatch` se vrátí `interrupted:true`, **zbytek `totalSteps` se dotočí po ack** (re-vstup do `runCatchupBatch` s `totalSteps − stepsRun`). §4.2. |
| **T2 intro/tutoriál/dialogy** | Obsah = **data** (`story.json`/`dialogues.json`/`tutorials.json`), efekty options/onShow = **string-ID do registru efektů K14** (§5.4) — žádné closury (orig `options[].fn`). Intro = první importantEvent řetězec. §5. |
| **T3 achievementy deklarativně K18** | `achievements.json` rozšířen o `when: <predicate-as-data>` (DSL stromu). **Jeden centrální evaluator** (periodic `day` + na doménových/tx událostech) — **ZERO imperativní háčky** rozseté po mechanikách (C4 fix). Unlock = nastav `state.achievements.unlocked[id]=true` + volitelně K14 unlock efekt. §6. |
| **T4 notifikace/confetti/hudba/devlog** | **EFEMÉRNÍ UI event bus** — engine emituje doménové události do efemérní fronty `ctx.emitEvent(ev)`; UI je konzumuje (toast/confetti/zvuk). **Mimo `state`, mimo `hashState`, neukládá se.** Gamelog = existující `state.log` ring buffer (persist, deterministický). §7. |
| **Determinismus** | Story/achievementy: žádný `Date.now`/`Math.random`/DOM v core (RNG jen přes streamy, zde většinou bez RNG). Engine-stopping eventy serializovatelné → save uprostřed zastaveného eventu se obnoví identicky. UI event bus efemérní → **nikdy nevstupuje do hashState**. §8. |
| **R-G licence** | VLASTNÍ/parafráze texty; `_meta.provenance` per katalog; originál slouží jen jako **struktura/triggery/IDs**, ne jako text. §9. |
| **tickOrder dopady** | 2 nové periodiky: `story.check` (každý `day`, na konci dne — vyhodnotí event-triggery) a `achievements.eval` (každý `day`, po `story.check`). Plus inline eval na vybraných doménových událostech (settlement level-up). Žádná změna pořadí existujících systémů. §3.4, §6.4. |

---

## 1. SPLIT M8 — ROZHODNUTÍ: NE

**Doporučení: jedna iterace (bez splitu).** Trade-off explicitně.

**Komplexita tasků** (master plán §1.2): T1=M, T2=M, T3=M, T4=S. **Žádný L task** → §1.2 nevynucuje dekompozici, orchestrátor nemusí dělit.

**Proč NE split:**
1. **T1 a T3 jsou na sobě nezávislé** (paralelizovatelné, ale obě M — vejdou se do jedné iterace bez rizika). T1 staví story/event vrstvu; T3 staví achievement evaluator. Sdílejí jen **vzor** „deklarativní data + centrální evaluator + K14 unlock efekt", ne kód.
2. **T2 závisí na T1, T4 závisí na T1** (master plán: T2 dep T1, T4 dep T1). T2 (dialogy/tutoriál) je tenká nástavba — stejný importantEvent mechanismus, jen víc datových položek + dialogový pod-stav. T4 (event bus) je S a čistě prezentační (engine emit + UI konzum).
3. **Žádné nové engine riziko.** Největší potenciální riziko M8 — „druhá smyčka pro zastavený engine" — **neexistuje**: engine-stopping slot (`running===false` break) je v kódu od M2 (clock.js:77, catchup.js:51). M8 jen tenhle slot **naplní** (kdo a kdy nastaví `running=false`, jak resume). To eliminuje L-rozměr.
4. **Precedens.** M5-2/M7a-2/M7b šly jako jedna iterace s podobnou strukturou (data + evaluator + wiring). M8 je menší (žádné nové vzorce, žádná nová RNG mechanika).

**Alternativa (zvážená, zamítnutá): SPLIT M8-1 (T1+T3 jádro) / M8-2 (T2+T4 obsah+UI).**
- Plus: M8-1 by uzavřel determinismus-kritické části (engine-stopping serializace, achievement eval) samostatně.
- **Mínus (rozhodující):** M8-1 by byl **nehratelný/neúplný jako milník** — story bez intro/dialogů (T2) a bez notifikací (T4) nemá „začátek a vedení hráče" (DoD M8). Stejný argument jako DR-018-01 (M7b split NE, „M7b-1 nehratelný"). Obsahová vrstva dává smysl jen celá.
- **Fallback:** kdyby se T1 nečekaně rozrostl (např. víc event sub-typů než plán), orchestrátor smí oddělit T4 (S, čistě UI, nezávislé na zbytku po definici `emitEvent` kontraktu) do follow-up tasku. T1+T2+T3 musí zůstat spolu.

---

## 2. STAV REPU (co už existuje — coder NESTAVÍ od nuly)

| Komponenta | Stav | Soubor |
|---|---|---|
| `state.story` | **Existuje, prázdný `{}`** | createInitialState.js:123 |
| `state.achievements` | **Existuje** `{ unlocked: {} }` | createInitialState.js:129 |
| `state.log` ring buffer | **Existuje + persist** | createInitialState.js:124-128, engine/log.js, persistSchema.js:44 |
| Engine-stopping slot | **Existuje** `if (state.engine.running === false) break;` | clock.js:77 (live), catchup.js:51 (catch-up) |
| `acknowledgeEvent` command | **NEEXISTUJE** (architektura ho jmenuje §3.3, ale handler chybí) | – |
| Story/importantEvent systém | **NEEXISTUJE** (staví se) | – |
| Achievement evaluator | **NEEXISTUJE** (jen statická data, žádné `when`) | src/data/achievements.json (15 položek, jen id/name/desc/level) |
| `ctx.emitEvent` (event bus) | **NEEXISTUJE** (ale `ctx.emitTx` precedens) | main.js:200 (`ctx.emitTx = tx => recordTx(...)`) |
| Registr efektů K14 | **Existuje (M1 stuby)** — `noop`, `createScholars`, `unlockBuilding`, `unlockMap`, `insertInventory`, `grantResource` | registry/effects.js |
| Command dispatch | **Existuje** — `dispatch(creg, state, {type, params})`, validuje serializovatelnost | commands/dispatch.js |
| Registrace v bootstrapEngine | **Existuje** — vzor `registerXxxCommands(creg)`, `registerXxxEffects(registry)` | main.js:95-127 |
| Persist `story`/`achievements` | **Existuje** — oba se ukládají celé (`applyPersist` ř.44) | persistSchema.js:44 |

**Klíčový závěr:** M8 = **naplnění existujících slotů**, ne nová infrastruktura. `state.story`/`state.achievements`/`state.log` i engine-stopping break už jsou v repu; coder dodává obsah, evaluátory, command handlery a UI konzument.

---

## 3. T1 — importantEvent + story progres (engine-stopping doménová událost)

### 3.1 Datový model `state.story` (serializovatelný)

`state.story` se z prázdného `{}` rozšíří na (vše plain-data, serializovatelné, žádné funkce/closury):

```
state.story = {
  // engine-stopping event právě zobrazený (null = engine běží)
  event: null | {
    id: string,            // ID eventu z story.json (= curEventId originálu, game.js:169)
    acked: false,          // čeká na acknowledgeEvent
  },
  // fronta čekajících eventů (orig importantEvent.loadQueue, config.js:4284)
  queue: string[],         // ID eventů ke zobrazení po odkliknutí aktuálního
  // které eventy už proběhly (orig evt.used, game.js:165) — idempotence triggerů
  used: Record<string, true>,
  // víceřádkové příběhové linky (orig story[id]={curLine,started,completed}, game.js:172-178)
  lines: Record<string, { curLine: number, started: boolean, completed: boolean }>,
  // tutoriály (orig tutorials[id]=used, game.js:152-159)
  tutorials: { done: Record<string, true>, curId: string | null, curStep: number },
}
```

**Pravidla:**
- **Serializovatelnost (vynuceno):** `state.story` projde `structuredClone` bez ztráty (žádné `fn`, žádné objektové reference na katalog jako orig `evt.speaker = itemList[speakerid]` config.js:4296 — speaker se **resolvuje v selektoru z dat**, ne ve stavu).
- **Žádný text ve stavu.** `state.story.event.id` je jen ID; text/options/speaker dohledá UI selektor v `story.json` (katalog, §5). Princip „stav minus katalog" (architektura §3.2/K11).
- `used`/`lines`/`tutorials.done` zajišťují **idempotenci triggerů** (event se spustí jen jednou — orig `if (!importantEvent.X.used)` home.js:61 atd.).

### 3.2 Story katalog `src/data/story.json` (data, K14/§5.4)

Nový katalog (per typ, K15). Struktura (text = vlastní/parafráze, §9):

```jsonc
{
  "_meta": { "provenance": "original-paraphrased", "source": "config.js importantEvent ř.4281-4900 (struktura/triggery), text vlastní" },
  "events": {
    "introWelcome": {
      "speakerId": "advisor",          // ID do characters.json (selektor dohledá jméno/portrét)
      "text": "...vlastní text...",    // R-G: parafráze, NE 1:1
      "stopsEngine": true,             // engine-stopping (default true pro importantEvent)
      "trigger": { "kind": "gameStart" },   // viz §3.3 trigger DSL
      "onShow": [{ "effect": "noop", "params": {} }],   // K14 efekty při zobrazení (orig curEvt.fn)
      "options": [
        {
          "text": "...vlastní...",
          "effects": [{ "effect": "startTutorial", "params": { "id": "build" } }],  // K14, orig opt.fn
          "next": "introWorld",        // řetězení (orig opt.next, config.js:4344)
          "nextDelaySteps": 0          // orig opt.nextDelay (config.js:4341) — schedule one-shot
        },
        { "text": "OK", "effects": [] }
      ]
    },
    "firstSettlement": {
      "speakerId": "advisor", "text": "...", "stopsEngine": true,
      "trigger": { "kind": "settlementLevel", "atLeast": 1 },   // orig home.js:61 townIsSettlement
      "options": [{ "text": "...", "effects": [] }]
    }
    // …firstStarve (home.js:451), firstSick (home.js:943), firstHovel/House/Mansion (home.js:2495), atd.
  }
}
```

**MVP sada eventů (závazná, z originálních triggerů):** intro řetězec (3–5 obrazovek), `firstSettlement`/`firstVillage`/`firstTown`/`firstCity` (settlement level-upy, home.js:61/148), `firstStarve` (home.js:451), `firstSick` (home.js:943), `firstHovel`/`firstHouse`/`firstMansion` (home.js:2495-2500), `survivedWinter` (rok přežit). Rozsah ~10–14 eventů; víc je M9/post-MVP — coder se drží této sady (kalibrace obsahu = mimo M8 scope).

### 3.3 Trigger DSL (predikát-jako-data — žádný imperativní `importantEvent.load`)

**C-anti-pattern (paralela C4):** originál volá `importantEvent.load(id)` **imperativně rozsetě** přímo v home.js/events.js (settlement, starve, sick, build…). To je stejná past jako achievement háčky. **M8 to NESMÍ kopírovat.** Místo toho: každý event v `story.json` nese **deklarativní `trigger`** vyhodnocený **jedním centrálním checkerem** `storyCheck` (§3.4) — identický princip jako achievement evaluator (§6), sdílí predikátový DSL (§6.2).

```jsonc
"trigger": { "kind": "gameStart" }                          // jednou na startu (intro)
"trigger": { "kind": "settlementLevel", "atLeast": 1 }      // home.settlementLevel >= 1
"trigger": { "kind": "stateGte", "path": "home.population.total", "value": 50 }
"trigger": { "kind": "flagTrue", "path": "home.health.diseaseActive" }   // firstSick
"trigger": { "kind": "buildingBuilt", "id": "hovel" }       // firstHovel
"trigger": { "kind": "calendar", "every": "year" }          // survivedWinter
"trigger": { "kind": "and", "all": [ … ] }                  // skládání
```

Trigger se vyhodnotí proti read-only stavu; predikát je **čistá funkce dat → bool** (žádná mutace, žádný RNG, žádný `Date.now`). Sdílí evaluator predikátů s achievementy (§6.2) — jeden modul `core/systems/predicate.js`.

### 3.4 Engine-stopping mechanismus + tickOrder

**Periodik `story.check`** (nový, tickOrder): `every:'day'`, order na **konci dne** (po všech doménových systémech, před `eventFlush`). Volá `storyCheck(state, ctx)`:

```
storyCheck(state, ctx):
  if (state.story.event) return;                  // už zobrazený event drží engine → neplánovat další inline
  for (def of catalog.story.events, deklarovaném pořadí):
    if (state.story.used[def.id]) continue;       // idempotence (orig evt.used)
    if (!evalTrigger(def.trigger, state)) continue;
    loadStoryEvent(state, ctx, def.id); return;   // jen JEDEN za check (orig: curEvent drží zbytek ve queue)
```

`loadStoryEvent(state, ctx, id)`:
```
  def = catalog.story.events[id]
  state.story.used[id] = true                     // orig curEvt.used = true (config.js:4298)
  for (eff of def.onShow ?? []) resolve(ctx.registry, eff.effect)(state, eff.params, ctx)   // K14, orig curEvt.fn
  if (def.stopsEngine !== false):
    if (state.story.event):                        // už jeden běží → enqueue (orig loadQueue, config.js:4315)
      state.story.queue.push(id); return
    state.story.event = { id, acked: false }
    state.engine.running = false                   // ENGINE-STOPPING (orig Engine.stop, config.js:4293)
    ctx.emitEvent?.({ type: 'storyEventShown', id })   // EFEMÉRNÍ UI signál (§7) — animace/zvuk
  logEntry(state, `story:${id}`)                   // gamelog ring buffer (deterministický, persist)
```

**Klíč: `state.engine.running = false`** zastaví engine přes **existující** slot:
- **Live (clock.js:77):** `advance()` loop `for` po `step()` testuje `if (state.engine.running === false) break;`. Event nastavený uprostřed `storyCheck` (na konci `runTick`) ukončí dávku kroků pro daný frame; další framy nedělají nic (0 stepsDue se sčítá do akumulátoru? — viz pozn. níže).
- **Catch-up (catchup.js:51):** identický break → `runCatchupBatch` vrátí `interrupted:true` (§4.2).

> **Pozn. (akumulátor během pauzy):** Když je `running===false`, `advance()` proběhne `step()` 0× (break hned po případném prvním). Aby zastavený engine **nehromadil real-time dluh** (jinak po acku „přeskočí"), `advance()` při `running===false` musí akumulátor zahodit — **paralela k `factor===0` pauze** (clock.js:64-67). **MUST (T1):** v `advance()` přidat na začátek `if (state.engine.running === false) { acc.accMs = 0; acc.lastTimeMs = nowMs; return { stepsRun: 0, dirty: false }; }` — **před** výpočtem `elapsed×factor`. Tím je engine-stopping ekvivalent pauze co do akumulace. (Toto je **jediná změna v clock.js**; je catch-up-safe a deterministická.)

### 3.5 `acknowledgeEvent` command (resume)

Nový command (architektura §3.3 ho jmenuje). Registrace `registerStoryCommands(creg)` v bootstrapEngine (anti-dark-code B1, vzor quests.js:164).

```
acknowledgeEvent(state, params): CommandResult
  // params: { optionIndex?: number }  (kterou option hráč zvolil; default 0)
  if (!state.story.event) return { ok:false, error:'acknowledgeEvent: no active event' }
  def = catalog.story.events[state.story.event.id]
  opt = def.options?.[params.optionIndex ?? 0]
  if (!opt) return { ok:false, error:'invalid optionIndex' }
  // 1. provést efekty zvolené option (K14, orig opt.fn — ale jako string-ID data, NE closura)
  for (eff of opt.effects ?? []) resolve(ctx.registry, eff.effect)(state, eff.params, ctx)
     // POZN: command vrstva nemá ctx (dispatch.js:59 volá handler(state,params)) → viz §3.6
  // 2. unload (orig config.js:4318)
  state.story.event = null
  // 3. řetězení (orig opt.next / opt.nextDelay, config.js:4341-4346)
  if (opt.next) state.story.queue.unshift(opt.next)   // hned další
  if (opt.nextDelaySteps>0) scheduleInsert(state, curStep+delay, 'loadStoryEvent', {id: opt.nextId})
  // 4. resume nebo další z fronty
  if (state.story.queue.length > 0):
     nextId = state.story.queue.shift()
     state.story.event = { id: nextId, acked:false }   // engine zůstává stopnutý
     // (loadStoryEvent onShow efekty se aplikují — viz §3.6 ohledně ctx)
  else:
     state.engine.running = true                       // RESUME (orig Engine.start, config.js:4324)
  return { ok:true }
```

### 3.6 Problém `ctx` v command vrstvě (známý gap G-*-TXAUDIT) — ŘEŠENÍ

`dispatch.js:59` volá `handler(state, params)` **bez `ctx`** → command handler nemá `registry` pro `resolve(effect)`. Stejný gap jako `quests.js`/`build`/`contracts` (G-QUEST-TXAUDIT). **Dvě varianty:**

- **Var. A (DOPORUČENO):** efekty options/onShow, které potřebují registr, **NEvolat v command vrstvě**, ale **odložit na nejbližší tick**: command jen zapíše `state.story.pendingEffects = [{effect,params}, …]` a nastaví `state.story.event=null`/`queue`. Periodik `story.applyEffects` (`every:'step'`, order 5, **před** `story.check`) je vykoná s `ctx` a vyprázdní. **Plus:** plný `ctx` přístup, serializovatelné (pendingEffects = plain data), deterministické (běží v tick fázi). **Mínus:** efekt se projeví o 1 step později (neviditelné — engine stejně resumuje až dalším framem).
- **Var. B:** rozšířit `dispatch` o `ctx` parametr (`dispatch(creg, state, cmd, ctx)`). **Mínus:** mění kontrakt dispatch.js sdílený všemi commandy → větší blast radius, riziko regrese. **Zamítnuto** pro M8 (mimo „žádná změna architektury").

**ROZHODNUTÍ: Var. A.** `acknowledgeEvent` a `loadStoryEvent` zapisují efekty do serializovatelné fronty `state.story.pendingEffects`; tick periodik je aplikuje s `ctx`. Tím i save uprostřed acku (mezi commandem a tickem) přežije (efekty ve frontě). Registr efektů zůstává jediným místem chování (§5.4), command nemutuje doménu mimo story stav.

### 3.7 Story katalog → `ctx.catalog`

Selektory a `storyCheck` čtou `story.json` přes `ctx.catalog.story` (preload jako ostatní katalogy, main.js:125 `buildCtxCatalog()`). UI selektor `selectActiveStoryEvent(state, catalog)` → `{ id, speaker:{name,portrait}, text, options:[{text}] } | null`. **Katalog do `ctx`, ne do stavu** (architektura §3.2).

---

## 4. T1 — Interakce s catch-up pauzou (D10)

### 4.1 Princip (architektura §4.1 + §9.2/D10)

> „Interaktivní (engine-stopping) eventy umějí dávku **přerušit**: zbytek akumulátoru zůstává (pokračování po odkliknutí)." (§4.1)
> „catch-up se na eventu **pozastaví** (dávka se přeruší), zbytek zameškaného času zůstává a **pokračuje po odkliknutí**, až do capu." (§9.2/D10)

### 4.2 Mechanika v `runCatchupBatch` (BEZE ZMĚNY catchup.js — už hotovo)

`runCatchupBatch` (catchup.js:40-62) **už dnes**: v chunk `for` po `step()` testuje `if (state.engine.running === false) { interrupted = true; break; }` a vrací `{ stepsRun, stepsRequested, interrupted, capped }`. Když `storyCheck` (poslední fáze tick na konci dne) nastaví `running=false`, batch se zastaví na hraně dne. **Žádná změna catchup.js.**

**Re-vstup po acku (orchestrace v main.js / bootSequence, §2.4):**
```
result = await runCatchupBatch({ state, ctx, totalSteps, wasCapped, onChunk })
while (result.interrupted && state.story.event):
    // engine zastaven na story eventu uprostřed catch-upu
    requestRender()                                  // UI ukáže event (selektor čte state.story.event)
    await waitForAck(state)                           // UI dispatch acknowledgeEvent → running=true
    // dotočit zbytek zameškaných kroků
    remaining = result.stepsRequested − result.stepsRun
    if (remaining <= 0) break
    result = await runCatchupBatch({ state, ctx, totalSteps: remaining, wasCapped, onChunk })
```
- **`remaining` drží cap (D10):** `totalSteps` byl už ořezán capem (`catchupStepCount(missedMs, capMs)`, main.js:228) **před** první dávkou → re-vstupy jen dotáčejí už-ořezaný zbytek, cap se neporušuje.
- **Determinismus:** ack nemění RNG stream pozici (acknowledgeEvent nelosuje); kroky před i po pauze jsou identické bez ohledu na to, jestli pauza nastala (stejný `step()` v stejném pořadí). **Save uprostřed pauzy** (před ackem): `state.story.event` + `engine.running=false` + `engine.curStep` + akumulátor-zbytek (zameškané kroky se dopočtou z `lastSimTimestamp` znovu při dalším loadu) → po loadu se obnoví zastavený event identicky.

> **Edge (vícenásobný event v jedné dávce):** každý event přeruší dávku samostatně; smyčka `while` je obslouží jeden po druhém. `queue`/`used` zajišťují, že se každý event spustí jen jednou a v deklarovaném pořadí.

### 4.3 Test (tester, sada §1.3 — „story event uprostřed catch-upu")
- Seedovaný stav s `lastSimTimestamp` před triggerem (např. settlement level-up uprostřed dávky) → `runCatchupBatch` vrátí `interrupted:true`, `state.story.event` nastaven, `running:false`.
- Po `acknowledgeEvent` → `running:true`, zbytek dávky doběhne, `hashState` identický jako kdyby běh proběhl bez pauzy (event je side-effect-free na doménu kromě svých deklarovaných K14 efektů).

---

## 5. T2 — Intro / tutoriál / dialogy (obsah jako data přes K14)

### 5.1 Intro = první importantEvent řetězec

Intro (orig `storyScreens.intro`, game.js:491) = **sekvence engine-stopping eventů** (§3) s `trigger:{kind:'gameStart'}` na prvním a `next`-řetězením dál. Žádný zvláštní mechanismus — reuse T1. Intro běží jen u **nové hry** (`state.meta.startedAtStep===0 && !state.story.used.introWelcome`); u loadu se přeskočí (idempotence přes `used`).

### 5.2 Tutoriály (data)

`src/data/tutorials.json` — krokové nápovědy (orig `tutorials`, game.js:152). Stav v `state.story.tutorials` (§3.1). Tutoriál = sekvence kroků `{ text, anchor?: string }`; `anchor` je UI hint (který tab/prvek zvýraznit) — **čistě prezentační, UI ho čte, engine ne**. Tutoriál se spustí K14 efektem `startTutorial({id})` (volaný z option eventu) nebo trigger-deklarativně. Posun kroku = UI command `advanceTutorial`/`dismissTutorial` (zapisuje `state.story.tutorials.curStep`/`done`). Tutoriály **nezastavují engine** (na rozdíl od importantEvent) — jsou to overlay nápovědy.

### 5.3 Dialogy (data)

`src/data/dialogues.json` — víceřádkové rozhovory s NPC (orig `dialogue.js`/`dialogueList`, jen kostra v originálu — `milontiDialogue1` prázdný). MVP: dialogy jako **pod-typ story eventu** s `lines[]` (víc replik, navigace `curLine` v `state.story.lines[id]`). Reuse `story.json` event struktury s polem `lines` místo jediného `text`. Speaker resolve z `characters.json`.

### 5.4 Registr efektů K14 — rozšíření (effects.js)

Nové efekty (registrované `registerStoryEffects(reg)` v bootstrapEngine, vzor registry/effects.js:111). **Všechny: čistá mutace stavu, validace params, žádný DOM/Date/Math.random, serializovatelné params:**

| Effect ID | Params | Akce |
|---|---|---|
| `startTutorial` | `{ id }` | `state.story.tutorials.curId=id; curStep=0` |
| `unlockMap` | `{ map }` | **už existuje (stub)** → naplnit (odemkne mapu ve `state`, unlock systém §6.5) |
| `unlockBuilding` | `{ id }` | **už existuje (stub)** → naplnit |
| `grantResource` | `{ resourceId, amount }` | **už existuje (stub)** → naplnit (event reward) |
| `setStoryFlag` | `{ flag }` | `state.story.used[flag]=true` (gating dalších eventů) |
| `noop` | – | **existuje** |

Reuse existujících stubů (effects.js) — M8 je naplní reálnou implementací (byly stuby od M1 přesně pro tohle). **Žádné closury** — orig `options[].fn` (config.js:4355) se převádí na `effects: [{effect, params}]` (data). To je **K14 §5.4 doslova** a zároveň **serializovatelnost** (žádná funkce ve story.json/save).

---

## 6. T3 — Achievementy deklarativně (K18, §7.2) — C4 FIX

### 6.1 Princip (architektura §7.2/K18)

> „Achievementy deklarativně (K18): `{id, when: predicate-as-data}` vyhodnocované centrálně na denním ticku + na transakčních/doménových událostech — odemčení není imperativně rozseté po mechanikách (C4)." (§7.2)

**Originál byl C4-vadný:** achievementy definované deklarativně (config.js:7376 `createAchievement`), ale **unlock check chyběl/byl by rozsetý** (jako `importantEvent.load` v home.js). M8 zavádí **jeden centrální evaluator** — **ZERO `if (army>100) achievements.X=true` rozseté po systémech.**

### 6.2 Predikát-jako-data DSL (`achievements.json` rozšíření)

`src/data/achievements.json` (existuje, 15 položek) se **rozšíří** o pole `when` per achievement (zpětně kompatibilní — `_meta`, `id`/`name`/`description`/`level` zůstávají). `name`/`description` se **přepíší vlastními R-G texty** (§9).

```jsonc
{ "id": "achieveSettlement",  "name":"…(vlastní)", "description":"…(vlastní)", "level":0,
  "when": { "kind": "stateGte", "path": "home.settlementLevel", "value": 1 } }

{ "id": "achieveCenturion",   "level":1,
  "when": { "kind": "sumGte", "paths": ["player.totWarriors","player.totArchers"], "value": 100 } }

{ "id": "achieveGoldHoarder", "level":2,
  "when": { "kind": "stateGte", "path": "player.gold", "value": 1000000 } }   // orig "1 million gold"

{ "id": "achievementSurvivedWinter", "level":0,
  "when": { "kind": "stateGte", "path": "season.curYear", "value": 2 } }      // orig "A year has passed"

{ "id": "achieveUnhygienic", "level":0,
  "when": { "kind": "flagTrue", "path": "home.health.diseaseActive" } }       // orig "everyone is sick"
```

**Predikát kinds (sdílené se story triggery §3.3, modul `core/systems/predicate.js`):**

| kind | params | význam |
|---|---|---|
| `stateGte` | `{ path, value }` | hodnota na path ≥ value |
| `stateEq` | `{ path, value }` | rovnost |
| `flagTrue` | `{ path }` | truthy bool |
| `sumGte` | `{ paths[], value }` | součet hodnot na paths ≥ value |
| `and` / `or` | `{ all[] }` / `{ any[] }` | skládání |
| `gameStart` / `calendar` / `buildingBuilt` / `settlementLevel` | (viz §3.3) | story-specifické (sdílí evaluator) |

`evalPredicate(node, state)` = **čistá funkce dat → bool** (čte read-only stav přes path-getter; **žádná mutace, žádný RNG, žádný `Date.now`/DOM**). `path` = tečková cesta (`"home.settlementLevel"`) — bezpečný getter (chybějící path → `undefined` → predikát false, ne throw v prod; throw v dev pro typo). Mapování achievement→aktuální combat/benevolence stavy (`achieveBenevolence`/`achieveFeared`/`achieveMight` z world takeOver módu): predikát na `state.world` takeover countery — pokud daný counter v repu neexistuje, achievement dostane `when:{kind:'never'}` + `provenance` poznámku (kalibrace/wiring M9, **ne** blokující M8).

### 6.3 Centrální evaluator + tickOrder

**Periodik `achievements.eval`** (nový): `every:'day'`, order **po `story.check`** (story event může změnit stav, který achievement čte). Volá:
```
achievementsEval(state, ctx):
  for (def of catalog.achievements.achievements):
    if (state.achievements.unlocked[def.id]) continue;       // už odemčeno (idempotence)
    if (!def.when) continue;
    if (evalPredicate(def.when, state)):
      unlockAchievement(state, ctx, def.id)
```
`unlockAchievement(state, ctx, id)`:
```
  state.achievements.unlocked[id] = true                       // persist (persistSchema.js:44)
  logEntry(state, `achievement:${id}`)                         // gamelog (deterministický, persist)
  ctx.emitEvent?.({ type:'achievementUnlocked', id })          // EFEMÉRNÍ confetti/zvuk (§7) — mimo state
  def = catalog.achievements... ; for (eff of def.onUnlock ?? []) // volitelný K14 unlock efekt (§6.5)
     resolve(ctx.registry, eff.effect)(state, eff.params, ctx)
```

### 6.4 Eval na doménových/tx událostech (architektura §7.2 „+ na transakčních událostech")

Denní eval pokryje vše s 1-denní latencí (přijatelné — achievementy nejsou time-critical). **Pro „okamžitý" pocit** u ekonomických milníků (gold hoarder) lze achievementy navázat i na `txEvent` přes **existující `ctx.emitTx` observer** (main.js:200): `recordTx` zavolá i `achievementsEvalForEvent(state, ctx, {kind:'tx'})` (vyhodnotí jen achievementy s `evalOn:['tx']` tagem). **MVP rozhodnutí:** denní eval **stačí pro DoD M8**; tx-trigger je volitelné zpřesnění — coder ho zapojí pouze pokud `evalOn` tag v datech existuje, jinak vše jede na `day`. Drží to evaluátor jednoduchý a deterministický.

> **Determinismus tx-evalu:** `ctx.emitTx` běží uvnitř `step()` (deterministicky), nikoli z UI/DOM. Eval nelosuje. Catch-up volá stejné `step()` → stejné tx události → stejné unlocky. ✓

### 6.5 Unlock mechanismus (achievement → mapy/mechaniky)

Architektura §7.2: „Stejný mechanismus poslouží unlock systémům (odemykání map/mechanik eventy)." Implementace: achievement (nebo story event) nese `onUnlock: [{effect:'unlockMap', params:{map:'...'}}]` → K14 efekt zapíše unlock do stavu. **MVP:** unlock zapisuje do `state.catalogState` / `state.world` flag (např. `unlockedMaps`); konkrétní mapy/mechaniky odemykané v M8 jsou jen ty, co dnes existují (zóny už hydratované M7a). Žádné nové mechaniky se M8 nezavádějí — unlock je **wiring na existující** (mimo M8 scope je tvořit nový odemykatelný obsah). Pokud cílová mapa/mechanika v repu není, `unlockMap` jen nastaví flag (no harm) + `provenance` poznámka.

### 6.6 C4 verifikace (reviewer gate, master plán §3 T-REV)
- **Grep gate (doporučeno do CI/review):** `state.achievements.unlocked[` se smí přiřazovat (`=true`) **jen v `unlockAchievement`** (jeden soubor). Jakýkoli jiný výskyt v `systems/` = C4 nález.
- Achievement logika je **100 % v datech (`when`)** + 1 evaluator. Žádný `if(...) unlocked` v doménových systémech.

---

## 7. T4 — Notifikace / confetti / hudba / devlog (EFEMÉRNÍ UI event bus)

### 7.1 Princip (architektura §3.4/K9, C1 fix)

> „Gamelog a notifikace jsou data: ring buffer ve `state.log` (přežije save) + **efemérní event bus pro UI** (toasty, confetti, zvuk). Engine/systémy nikdy nesahají na DOM (řeší C1)." (§3.4)

**Dvě oddělené vrstvy:**

| Vrstva | Kde žije | Persist | hashState | Příklad |
|---|---|---|---|---|
| **Gamelog** | `state.log` ring buffer (existuje) | **ANO** (persistSchema.js:44) | **ANO** (součást stavu) | „Achievement odemčen", „Příchod zimy" — trvalý herní deník |
| **Efemérní UI event bus** | **mimo `state`** — fronta v `app/` vrstvě | **NE** | **NE (vyloučeno)** | toast, confetti, zvukový efekt, hudba — jednorázová prezentace |

### 7.2 Event bus kontrakt (`ctx.emitEvent`)

Vzor `ctx.emitTx` (main.js:200). V `bootSequence`:
```
const uiEvents = createUiEventBus()             // app/uiEventBus.js — fronta MIMO state
ctx.emitEvent = (ev) => uiEvents.push(ev)        // engine emituje doménové události
```
- **`emitEvent` je optional** (`ctx.emitEvent?.(…)`) → core/testy bez UI běží bez busu (žádná závislost core na busu; **engine nikdy nevolá DOM přímo**).
- **Engine emituje plain-data událost** `{ type, …payload }` (např. `{type:'achievementUnlocked', id}`, `{type:'storyEventShown', id}`, `{type:'seasonChanged', season}`). **Žádná mutace stavu, žádný hashState dopad** — `emitEvent` jen tlačí do externí fronty.
- **UI konzumuje** v rAF/render cyklu: `uiEvents.drain()` → pro každou událost spustí toast/confetti/zvuk (DOM/Audio API **jen v `app/`+`ui/`**, nikdy v core).

### 7.3 Determinismus (KRITICKÉ)
- **Bus je mimo `state` → `hashState` ho nevidí.** Dvě běhy se stejným seedem dají identický `hashState` bez ohledu na to, kolik notifikací/zvuků se přehrálo. ✓
- **`emitEvent` se volá uvnitř `step()`** (deterministicky), ale **jeho efekt (push do externí fronty) je side-effect mimo stav** → catch-up dávka vyemituje stejné události (UI je při catch-upu typicky ignoruje/agreguje do offline summary, ne sprška toastů). **MUST:** během `runCatchupBatch` UI bus **drainuje do offline summary** (ne spam toastů) — řeší `app/` (počet eventů per typ → OfflineSummary, vzor buildOfflineSummary main.js:335).
- **Hudba/zvuk** = `app/` reaguje na události (`seasonChanged`→změna ambientní hudby); **core o audio neví**. (orig `musicPlayer.initialize()` game.js:83 ve `$rootScope` = C1 vada, M8 ji nereplikuje.)

### 7.4 Gamelog UI (ring buffer, S)
- **Gamelog se NEzavádí znovu** — `state.log` + `logEntry` (engine/log.js) existují a persistují. M8 přidá jen **UI tab/panel** `GamelogScreen` (selektor `selectLog(state)` → posledních N záznamů z ring bufferu, čte `log.entries`/`log.head`).
- Log zápisy jsou **deterministické** (`logEntry` zapisuje `{step, msg}`, žádný `Date.now`) → součást hashState, save round-trip ✓.
- **Devlog** = stejný gamelog filtrovaný (UI filtr), žádný zvláštní stav.

### 7.5 Nové soubory T4
- `src/app/uiEventBus.js` — `createUiEventBus()` (push/drain, žádná core závislost).
- `src/ui/screens.js` rozšíření / `src/ui/GamelogScreen.js` — gamelog panel + toast/confetti komponenty (efemérní, z busu).
- Wiring v `main.js bootSequence`: `ctx.emitEvent`, drain v render/rAF, catch-up agregace.

---

## 8. DETERMINISMUS & CATCH-UP-SAFE (souhrn, kritické — architektura §4.1/S-05)

| Aspekt | Záruka | Mechanismus |
|---|---|---|
| Story/achievement bez `Date.now`/`Math.random`/DOM | ✓ | predikáty = čisté fce dat→bool; eval v tick fázi; žádný RNG ani čas. Grep gate na zakázané importy v core (architektura §11/R-I) chytá porušení. |
| Engine-stopping eventy serializovatelné | ✓ | `state.story.event`/`queue`/`used`/`lines`/`pendingEffects` = plain-data; `structuredClone`-safe (žádné `fn`/closury/katalog-ref). Save uprostřed zastaveného eventu → load obnoví `event`+`running=false` identicky. |
| Catch-up pauza (D10) | ✓ | `running=false` break v `runCatchupBatch` (catchup.js:51, beze změny); re-vstup s `remaining` drží cap; ack nelosuje → RNG stream pozice nezměněna. |
| Akumulátor během pauzy | ✓ | `advance()` při `running===false` zahodí akumulátor (paralela `factor===0`, §3.4 pozn.) → po acku žádný „přeskok". **Jediná změna clock.js.** |
| Achievementy deterministické | ✓ | stejný stav → stejné `when` → stejné unlocky; idempotence přes `unlocked[id]`. Eval v `step()` (live i catch-up identicky). |
| UI event bus EFEMÉRNÍ (mimo hashState) | ✓ | bus mimo `state`; `emitEvent` push do externí fronty; `hashState` ho nevidí; catch-up agreguje do summary, ne spam. |
| Gamelog deterministický + persist | ✓ | `state.log` ring buffer, `logEntry` bez `Date.now`; součást hashState i save. |

**Catch-up-safe invariant (S-05):** nové systémy `story.check`/`story.applyEffects`/`achievements.eval` jsou levné (O(#events+#achievements), malá konstanta), deterministické, bez DOM/RNG/alokací v hot-path (predikáty čtou stav, nealokují). Běží jen na `day` edge (ne každý step) kromě `story.applyEffects` (`step`, ale no-op když `pendingEffects` prázdné). ✓

---

## 9. R-G LICENCE (vlastní/parafráze texty) — POSTUP

**Pravidlo (master plán §3 T-REV, brief):** intro/tutoriál/dialogy/achievement/event texty = **vlastní nebo parafráze**, NE 1:1 převzetí originálu. Eviduj provenance.

**Postup pro codera:**
1. **Originál = jen struktura, triggery a IDs.** Z `config.js`/`home.js`/`dialogue.js` se přebírá: které eventy existují, kdy se spouští (trigger), pořadí/řetězení, mapování speaker→postava, hodnoty achievement prahů (100/500/5000 units, 1M gold). **Text NE.**
2. **Texty napsat vlastní** v duchu (středověká budovatelská hra, rádce/NPC). Parafráze zachová **smysl/funkci** (co hráči říká, jakou volbu nabízí), ne formulaci. Příklad: orig `achieveUnhygienic` „Well done, everyone is sick, even the cows" → vlastní např. „Epidemie nešetří nikoho — ani dobytek." (jiné znění, stejný vtip).
3. **Provenance evidence** — každý nový datový katalog má `_meta`:
   ```jsonc
   "_meta": {
     "provenance": "original-paraphrased",   // nebo "original-rewritten" / "original" pro číselné prahy
     "source": "config.js/home.js (struktura+triggery); texty vlastní (R-G)",
     "note": "číselné prahy (army 100/500/5000, gold 1M) = faktická data; texty parafrázované"
   }
   ```
   `achievements.json` už má `provenance:'extracted'` (číselné prahy/IDs zůstávají) — při přepisu `name`/`description` přidat poznámku, že texty jsou přepsané (provenance se posune na `original-paraphrased` pro textová pole, prahy zůstávají faktická data).
4. **Reviewer gate (T-REV, Opus):** ověří „texty bez 1:1 převzetí" — porovná `story.json`/`dialogues.json`/`tutorials.json`/`achievements.json` texty proti originálu; identické věty = nález. `_meta.provenance` musí být u všech nových katalogů.

**Číselná/strukturální data nejsou text** — achievement prahy, trigger podmínky, event pořadí jsou faktická data hry (jako balance čísla, K4) a přebírají se věrně s `provenance`.

---

## 10. SOUBORY (mapa pro codera)

**Nové (core):**
- `src/core/systems/story.js` — `storyCheck`, `loadStoryEvent`, `storyApplyEffects` (periodiky), trigger eval delegace.
- `src/core/systems/achievements.js` — `achievementsEval`, `unlockAchievement`.
- `src/core/systems/predicate.js` — `evalPredicate(node, state)` (sdíleno story+achievement; čistá fce).
- `src/core/commands/story.js` — `acknowledgeEvent`, `advanceTutorial`, `dismissTutorial` + `registerStoryCommands`.

**Nové (data, R-G texty):**
- `src/data/story.json` (eventy + intro řetězec), `src/data/dialogues.json`, `src/data/tutorials.json`.
- `src/data/achievements.json` — **rozšířit** o `when` predikáty + přepsat texty (R-G).

**Nové (app/ui, T4 efemérní):**
- `src/app/uiEventBus.js`, `src/ui/GamelogScreen.js` (+ toast/confetti/hudba konzument).

**Změny existujících:**
- `src/core/engine/clock.js` — `advance()` zahodí akumulátor při `running===false` (§3.4 pozn., **jediná core změna v engine**).
- `src/core/engine/tickOrder.js` — registrace + 3 periodiky: `story.applyEffects` (`step`, order 5), `story.check` (`day`, order **na konci dne**, po doménách ~order 90), `achievements.eval` (`day`, order **po** story.check ~95). **Žádná změna pořadí existujících systémů** (jen append na konec dne). Aktualizovat `TICK_ORDER` komentář (živý artefakt N-04).
- `src/core/registry/effects.js` — naplnit stuby `unlockMap`/`unlockBuilding`/`grantResource` + přidat `startTutorial`/`setStoryFlag`; `registerStoryEffects`.
- `src/app/main.js` — `bootstrapEngine`: `registerStoryCommands(creg)`, `registerStoryEffects(registry)`; `bootSequence`: `ctx.emitEvent = uiEvents.push`, catch-up re-vstup smyčka (§4.2), bus drain v render + catch-up agregace.
- `src/ui/App.js` — nový tab „Deník" (gamelog) + story event overlay (selektor `selectActiveStoryEvent`) + tutoriál overlay.
- `src/ui/selectors.js` — `selectActiveStoryEvent`, `selectLog`, `selectTutorial`, `selectAchievements`.
- `src/save/persistSchema.js` — **žádná změna nutná** (story/achievements už se ukládají celé, ř.44); ověřit, že rozšířený `state.story` tvar (event/queue/used/lines/tutorials/pendingEffects) je serializovatelný (`structuredClone` test).

**Zdroj pravdy (struktura/triggery, NE text):** `config.js` (importantEvent ř.4281-4347, achievements ř.7376-7412), `home.js`/`events.js` (trigger místa), `engine.js` (stop/start ř.79-91), `game.js` (save/load story ř.139-179, 410-435), `dialogue.js`.

---

## 11. tickOrder (živý artefakt N-04) — dopady

Append na **konec dne** (po existujících `day` systémech, viz tickOrder.js:207-228 končící `research.daily` order 75); žádné přeskupení:

```
periodics (day edge, append):
  …existující (workerEfficiency 5 … research.daily 75 … buildings.age 70)…
  story.check        every:'day'   order:90   // vyhodnotí event triggery na konci dne (po level-upu atd.)
  achievements.eval  every:'day'   order:95   // PO story.check (event může změnit stav)
periodics (step edge, append):
  story.applyEffects every:'step'  order:5    // PŘED ostatními step systémy; no-op když pendingEffects prázdné
```
- `story.check` **po** doménách: settlement level-up (housing.settlementLevel `day` order 20) proběhne dřív → trigger `settlementLevel` ho vidí týž den.
- `achievements.eval` **po** `story.check`: event reward (K14 grantResource) se promítne před achievement checkem.
- `story.applyEffects` na `step` order 5 (před vším): odložené ack efekty (§3.6 Var. A) se aplikují na začátku dalšího kroku po acku.
- **Aktualizovat `TICK_ORDER` komentář** (tickOrder.js:45-50) + ASCII diagram §3.5 zmínku „story" (už tam je „→ story" ř.177) — N-04 vyžaduje ve stejném commitu.

---

## 12. RIZIKA & MITIGACE

| Riziko | Závažnost | Mitigace |
|---|---|---|
| **C4 regrese** — coder zavede `unlocked[id]=true` / `story.load` imperativně v systému | Vysoká (DoD/T-REV blocker) | Grep gate (§6.6): přiřazení `unlocked[` jen v `unlockAchievement`; `state.story.event=` jen ve story.js. Reviewer kontroluje (T-REV). Predikáty/triggery 100 % v datech. |
| **`ctx` v command vrstvě** (§3.6) | Střední | Var. A (pendingEffects fronta + tick apply) — nemění dispatch kontrakt, serializovatelné. |
| **Akumulátor přeskok po acku** | Střední (determinismus) | `advance()` zahodí akumulátor při `running===false` (§3.4) — paralela pauzy, otestováno. |
| **Neserializovatelný story stav** (orig `evt.speaker=itemList[…]`, `options[].fn`) | Vysoká | Speaker resolve v selektoru (ne ve stavu); efekty = string-ID K14 (ne closury); `structuredClone` test na `state.story`. |
| **UI bus prosákne do hashState** | Vysoká (determinismus) | Bus mimo `state`, optional `ctx.emitEvent?.`; testy hashState identický s/bez UI. |
| **R-G 1:1 text** | Střední (licence/T-REV) | Vlastní texty + `_meta.provenance`; reviewer porovná. Číselná data ≠ text. |
| **Story event spam v catch-upu** | Nízká | Bus drain→offline summary během catch-upu, ne sprška toastů (§7.3). Eventy ale **zastavují** dávku → uživatel je odklikne sekvenčně (D10). |

---

## 13. DoD M8 (master plán §3/iter-016) — pokrytí

- ✓ **Obsahová vrstva kompletní:** intro+tutoriál (T2), story eventy (T1), achievementy (T3), notifikace/gamelog (T4).
- ✓ **Hra má začátek** (intro řetězec, gameStart trigger), **vedení hráče** (tutoriály, story eventy na milnících), **meta-progres** (achievementy + unlock).
- ✓ **Test loop §1.3:** story event uprostřed catch-upu (pauza→ack→pokračování, §4.3), achievementy deterministické + save round-trip, tutoriál e2e, PWA smoke.
- ✓ **T-REV:** žádné C4 háčky (§6.6 grep), R-G evidence (§9 provenance).
```
