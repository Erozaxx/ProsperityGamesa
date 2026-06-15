# Review — DESIGN M8 (iter-019, T-002, architektonický gate před implementací)

- **Review ID**: REVIEW-019-002
- **Reviewer**: reviewer (Opus)
- **Reviewuje**: `context/refs/design_iter-019_T-001.md` (DESIGN-019-001)
- **Date**: 2026-06-15
- **Metoda**: ověřeno PROTI KÓDU (clock.js, catchup.js, effects.js, main.js, dispatch.js, tickOrder.js, achievements.json, createInitialState.js, persistSchema.js, log.js) + PROTI ORIGINÁLU (config.js importantEvent ř.4281-4347, events.js importantEvent.load háčky) + PROTI ARCHITEKTUŘE iter-002 (§4.1, §7.2, D10/§9.2, K18, C4, R-I).

---

## VERDIKT: **GO** (bez podmínek pro design; níže 0 blocker / 1 major / 4 minor / 4 nit jako doporučení pro codera)

Design je **správný, soulad s architekturou ověřen, proveditelný Sonnetem bez dalších architektonických rozhodnutí.** Tři nejrizikovější body (C4 fix, engine-stopping serializovatelnost/catch-up pauza, UI bus efemérnost) jsou **vyřešeny korektně a ověřeny proti kódu.** Žádný nález nebrání GO. Major (MAJ-1) je upřesnění, ne vada — design ho z 90 % již pokrývá.

---

## 1. C4 ANTI-PATTERN FIX — POSOUZENÍ: **SPRÁVNĚ ŘEŠENO ✓**

**Originál JE C4-vadný (ověřeno):** `events.js` volá `importantEvent.load('foundField')`/`load('firstXimniVisit')`/`load('masterBuilder')`/`load('travellingPhysician')` **imperativně rozsetě** (ř.88/96/375/405/409), guardované `if (!importantEvent.X.used)`. To je doslova past C4.

**Design ji NEkopíruje a řeší centrálně:**
- Achievementy: `when: <predicate-as-data>` v `achievements.json` + **jeden** evaluator `achievementsEval` (§6.3); unlock **výhradně** v `unlockAchievement`.
- Story triggery: `trigger: <predicate-as-data>` v `story.json` + **jeden** checker `storyCheck` (§3.4); `state.story.event=` nastaveno **jen** v `loadStoryEvent`.
- Sdílený `evalPredicate(node, state)` = čistá fce dat→bool (`core/systems/predicate.js`), žádná mutace/RNG/Date/DOM.

**Grep gate ověřen proti kódu:** aktuálně `unlocked[` se v `src/` vyskytuje jen jako **čtení** (selectors.js:452-453 techtree, buildings.js:435 techId) — **žádný achievement `unlocked[id]=true` zápis neexistuje.** Gate je dnes čistý; po M8 musí být jediný zápis `state.achievements.unlocked[` v `unlockAchievement` (achievements.js) a jediný zápis `state.story.event=` v story.js. Návrh §6.6 to vyžaduje explicitně.

**Závěr C4:** Design nezavádí imperativní háčky; predikáty/triggery 100 % v datech, evaluace v 1 evaluatoru per doména. **Toto je správná inverze originálu.** Souhlasím s grep gate jako T-REV/CI kontrolou.

---

## 2. ENGINE-STOPPING SERIALIZOVATELNOST + CATCH-UP PAUZA (D10) — POSOUZENÍ: **SPRÁVNĚ ✓** (1 major upřesnění)

**Existující slot ověřen:**
- `advance()` clock.js:75-78 — `for` po `step()` má `if (state.engine.running === false) break;` (ř.77). ✓
- `runCatchupBatch` catchup.js:49-57 — `step()` + `if (running===false) { interrupted=true; break; }`, vrací `{stepsRun, stepsRequested, interrupted, capped}` (ř.61). ✓ Design tvrdí "BEZE ZMĚNY catchup.js" — **potvrzeno, kontrakt už přesně odpovídá.**

**Jediná core změna (`advance()` zahodí akumulátor při `running===false`) — POTVRZENA jako NUTNÁ a SPRÁVNÁ:**
clock.js dnes zahazuje `accMs` **jen** při `factor===0` (ř.64-68), **NE** při `running===false`. Bez navrhované změny by zastavený engine (event drží `running=false`) sčítal real-time dluh v `accMs` a po acku „přeskočil" o nahromaděné kroky. Návrh §3.4 (early `if (running===false) { acc.accMs=0; acc.lastTimeMs=nowMs; return {stepsRun:0,dirty:false}; }` **před** výpočtem elapsed×factor) je přesná paralela `factor===0` pauzy (ř.64-67). **Deterministické, catch-up-safe** (mění jen live `advance`, ne `runCatchupBatch`; cap se počítá z `lastSimTimestamp` při loadu, ne z `accMs`). Souhlasím.

**Serializovatelnost `state.story.*`:** plain-data (`event:{id,acked}`, `queue:string[]`, `used`, `lines`, `tutorials`, `pendingEffects`) — **žádné closury, žádná katalog-ref.** Design správně eliminuje obě orig pasti: orig `evt.speaker = itemList[speakerid]` (config.js:4296, objektová ref) → resolve v selektoru; orig `options[].fn`/`curEvt.fn` (config.js:4304/4338, closury) → string-ID K14 efekty. `structuredClone`-safe. Persist ověřen: persistSchema.js:44 ukládá `story` i `achievements` **celé** → rozšířený tvar přežije bez změny schématu (návrh §10 jen žádá `structuredClone` test). ✓

**Catch-up re-vstup + cap (D10):** `remaining = stepsRequested − stepsRun`, re-vstup `runCatchupBatch(totalSteps: remaining)`. `totalSteps` byl ořezán capem (`catchupStepCount(missedMs, capMs)` main.js:228) **před** první dávkou → re-vstupy dotáčejí už-ořezaný zbytek, **cap neporušen.** ✓ Odpovídá architektuře §9.2/D10 doslova.

**Ack nelosuje RNG:** `acknowledgeEvent` jen čte option, zapisuje `pendingEffects`/`queue`/`event=null`/`running`. Žádný `rng()` draw → **stream pozice nezměněna** → kroky před/po pauze identické bez ohledu na pauzu. ✓

**Save uprostřed eventu → identický load:** `engine.running=false` + `engine.curStep` (oba persist, persistSchema.js:61-64) + `state.story.event` (persist) → load obnoví zastavený event identicky; zameškané kroky se dopočtou z `lastSimTimestamp` znovu. ✓

**MAJ-1 (major, upřesnění — NEblokuje GO): catch-up re-vstup smyčka v main.js NEEXISTUJE, je to NOVÝ kód, ne „beze změny".**
Ověřeno: main.js:315-345 volá `runCatchupBatch` **jednou** a pokračuje; `while (result.interrupted && state.story.event)` z §4.2 tam dnes **není**. Design to v §10 sice zmiňuje ("catch-up re-vstup smyčka §4.2"), ale TL;DR a §4.2 formulace ("BEZE ZMĚNY catchup.js — už hotovo") může codera svést k dojmu, že re-vstup je hotový. **Beze změny je jen `catchup.js`; orchestrace re-vstupu v `main.js` je nový kód.** Navíc dnešní `if (!result.interrupted) autosave.requestSave('event')` (ř.329) a `buildOfflineSummary` (ř.335) běží i při `interrupted` — po zavedení smyčky musí summary/autosave proběhnout až po **finálním** dokončení dávky (po vyčerpání eventů), jinak se postaví offline summary z částečného `stepsRun`.
**Návrh:** Coder MUSÍ (a) vložit `while`-smyčku mezi ř.326 a ř.328; (b) `await waitForAck` přes UI render + dispatch `acknowledgeEvent`; (c) `autosave`/`offlineSummary` přesunout za smyčku (akumulovat `stepsRun` napříč re-vstupy do summary). Tester §4.3 to musí pokrýt (event uprostřed catch-upu → ack → dotočení → `hashState` identický s během bez pauzy). Doporučuji v designu §4.2 nadpis upravit z „BEZE ZMĚNY catchup.js — už hotovo" na „BEZE ZMĚNY catchup.js; re-vstup orchestrace v main.js = NOVÝ kód".

---

## 3. UI EVENT BUS EFEMÉRNÍ — POSOUZENÍ: **SPRÁVNĚ ✓**

- **Vzor `ctx.emitTx` ověřen:** main.js:200 `ctx.emitTx = (tx) => recordTx(state, tx)`. Design `ctx.emitEvent = (ev) => uiEvents.push(ev)` je identický vzor, ale **bus žije mimo `state`** (fronta v `app/uiEventBus.js`) → **nevstupuje do `hashState`** (hashState čte jen `state`). ✓
- **`emitEvent` optional (`ctx.emitEvent?.(...)`):** core/testy bez UI běží bez busu → **žádná závislost core na DOM/busu.** Engine emituje plain-data `{type, id}`, push je side-effect mimo stav. ✓ Odpovídá architektuře §3.4 C1 fix (engine nikdy nesahá na DOM).
- **Catch-up:** `emitEvent` se volá uvnitř `step()` (deterministicky), efekt (push) je mimo stav → catch-up vyemituje stejné události, ale UI je **agreguje do offline summary** (ne spam toastů), §7.3. Správný princip; orig `musicPlayer.initialize()` v `$rootScope` (game.js:83) = C1 vada, kterou M8 nereplikuje. ✓
- **Gamelog = `state.log` ring buffer** (existuje, persistSchema.js:44, `logEntry` log.js:16 zapisuje `{step,msg}` bez `Date.now`) → deterministický, persist, součást hashState. UI panel je jen selektor. ✓ Správné oddělení: gamelog (stav, persist, hash) vs. efemérní bus (mimo stav, mimo hash, neukládá se).

**Závěr bus:** Bus **neovlivní deterministický stav/hashState.** Dvě běhy se stejným seedem → identický hash bez ohledu na notifikace/zvuky. Engine nikdy nesahá na DOM. Ověřeno proti `ctx.emitTx` precedentu.

---

## 4. DETERMINISMUS — POSOUZENÍ: **SPLNĚNO ✓**

- Predikáty/triggery = čisté fce dat→bool, eval v tick fázi (`day` edge), žádný `Date.now`/`Math.random`/DOM. R-I grep gate (architektura §11) na zakázané importy v core to mechanicky chytá. ✓
- Achievementy idempotentní: `if (unlocked[id]) continue` → stejný stav → stejné unlocky. Eval v `step()` (live i catch-up identicky volá tentýž `step()`). ✓
- tx-eval (§6.4) běží uvnitř `step()` (deterministicky), nelosuje; MVP rozhodnutí „denní eval stačí, tx je volitelné zpřesnění přes `evalOn` tag" je rozumné a drží evaluator jednoduchý. ✓
- pendingEffects (§3.6 Var. A) = plain data, aplikované v tick fázi `story.applyEffects` s `ctx` → save mezi commandem a tickem přežije (efekty ve frontě). ✓

---

## 5. R-G LICENCE — POSOUZENÍ: **POSTUP OK ✓**

Postup §9 je správný: originál = jen struktura/triggery/IDs/číselné prahy (100/500/5000 units, 1M gold = faktická data, nepodléhají R-G); texty vlastní/parafráze s `_meta.provenance:'original-paraphrased'`. `achievements.json` dnes má `provenance:'extracted'` + anglické 1:1 texty (ověřeno: „Well done, everyone is sick, even the cows" atd.) → **MUSÍ se přepsat** (name/description) + posunout provenance pro textová pole. Reviewer gate T-REV (porovnání proti originálu, identické věty = nález) je správně zařazen. Souhlasím.

---

## 6. SOULAD S ARCHITEKTUROU + PROVEDITELNOST + tickOrder + SPLIT

**Soulad:** §4.1 (engine-stopping přeruší dávku, zbytek akumulátoru pokračuje) ✓; §7.2/K18 (deklarativní achievementy + unlock mechanismus reuse) ✓; D10/§9.2 (catch-up pauza, zbytek do capu) ✓; C4 (žádné rozsetí) ✓; R-I (grep gate determinismus) ✓. **Žádný rozpor s architekturou.**

**tickOrder (§11, N-04):** Ověřeno proti tickOrder.js — `day` edge má `edgePriority=3`, uvnitř řazeno dle `order`; max existující `day` order = `research.daily` 75. Návrh `story.check` order 90 + `achievements.eval` order 95 na `day` → **korektní append na konec dne, žádné přeskupení** existujících. `story.applyEffects` `step` order 5 (no-op když fronta prázdná) — `step` edge `edgePriority=0`, order 5 je před existujícími step systémy (migration 10, skills 20, battle 30); to je OK, protože no-op při prázdné frontě a aplikace odložených ack efektů má proběhnout na začátku kroku po acku. Pořadí `achievements.eval` PO `story.check` je správné (event reward se promítne před achievement checkem). **N-04: komentář TICK_ORDER (tickOrder.js:45-50) + registrace musí být ve stejném commitu** — design to v §11 vyžaduje. ✓

**Proveditelnost Sonnet:** Design je dostatečně preskriptivní (datové tvary, pseudokód `storyCheck`/`loadStoryEvent`/`acknowledgeEvent`/`achievementsEval`, mapa souborů §10, K14 efekt tabulka, predikát DSL tabulka). Var. A pro `ctx` gap je jednoznačně rozhodnutá. Žádné otevřené architektonické rozhodnutí nezbývá. ✓ Jediné riziko proveditelnosti = MAJ-1 (re-vstup smyčka v main.js), kvantifikováno výše.

**SPLIT M8 — SOUHLAS: NE.** Argumentace §1 je správná: žádný L task (T1=M,T2=M,T3=M,T4=S → §1.2 nevynucuje); největší riziko („druhá smyčka pro zastavený engine") **neexistuje** — slot je v kódu od M2 (ověřeno clock.js:77, catchup.js:51). M8-1 split by byl nehratelný milník (DR-018-01 precedens). Fallback „oddělit T4 kdyby se T1 rozrostl" je rozumný. **Souhlasím s NE-split.**

---

## 7. NÁLEZY (severity + návrh)

### MAJOR
- **MAJ-1 — catch-up re-vstup smyčka v main.js je NOVÝ kód, ne „hotovo".** (detail §2 výše) `main.js:315-345` dnes volá `runCatchupBatch` jednou; `while (interrupted && story.event)` neexistuje, a `autosave`/`buildOfflineSummary` (ř.329/335) běží i při `interrupted` z částečného `stepsRun`. **Návrh:** coder vloží smyčku, `waitForAck` přes render+dispatch, a přesune autosave/summary za smyčku s akumulací `stepsRun`. Upravit nadpis §4.2 ať codera nesvede ("BEZE ZMĚNY catchup.js; re-vstup v main.js = nový kód"). Tester §4.3 pokrývá. **NEblokuje GO** — design záměr je správný, jen formulačně podceňuje rozsah main.js změny.

### MINOR
- **MIN-1 — `scheduleInsert`/`nextDelaySteps` (§3.5) potřebuje existující schedule API.** Návrh `scheduleInsert(state, curStep+delay, 'loadStoryEvent', {id})` předpokládá one-shot schedule a registrovaný handler `loadStoryEvent` ve fns registru. Orig používá `Engine.insert(nextDelay[0], 'loadImportantEvent', ...)` (config.js:4342). **Návrh:** coder ověří podpis existujícího schedule insertu (`state.engine.schedule`/`_seq`) a zaregistruje `loadStoryEvent` jako schedule handler; jinak `nextDelaySteps` zjednodušit na okamžité `queue.unshift` pro MVP (delay je kosmetika). Drobné, ale design to nechává implicitní.
- **MIN-2 — `effects.js` stuby dnes `console.log` (gate-allow), ne reálná mutace.** `unlockMap`/`unlockBuilding`/`grantResource` validují params a logují (ř.52/67/103). Design §5.4 počítá s naplněním — OK, ale coder musí **odstranit `console.log` gate-allow** a zapsat reálný `state` mutace, jinak efekty eventů/achievementů nic nedělají (tichý no-op). Explicitně zmínit v §5.4.
- **MIN-3 — `state.story.tutorials` tvar vs. `used`/`lines` — overlap rizika.** §3.1 `tutorials.done` i `used` slouží k idempotenci; `setStoryFlag` zapisuje do `used` (§5.4). Doporučuji v designu 1 větu, že `used` (event idempotence) a `tutorials.done` (tutorial idempotence) jsou disjunktní namespace, ať coder neslučuje klíče (kolize ID eventu a tutoriálu).
- **MIN-4 — `evalPredicate` path-getter chování při chybějící path.** §6.2 říká „prod → false, dev → throw". Rozumné, ale coder potřebuje vědět, jak rozliší dev/prod bez `process.env` v core (no-build). **Návrh:** path-getter vrací `undefined`→predikát false vždy; „throw v dev" řešit grep/lint testem na neexistující path v datech (CI), ne runtime větví v core (jinak nedeterministická větev dle prostředí). Sjednotit s R-I.

### NIT
- **NIT-1 —** `state.story.event.acked` pole je v praxi vždy `false` (ack rovnou nastaví `event=null`). Buď ho využít (animace pending), nebo vypustit ze schématu (méně stavu k serializaci).
- **NIT-2 —** `achievements.json` je dnes `{achievements:[...]}` (pole), evaluator iteruje `catalog.achievements.achievements` — ověřit, že preload do `ctx.catalog.achievements` zachová tvar (vs. ostatní katalogy mohou být mapy). Drobná konzistence.
- **NIT-3 —** `_meta.provenance` u `achievements.json`: po přepisu textů bude katalog mít smíšenou provenance (prahy=extracted, texty=paraphrased). Doporučuji per-pole poznámku v `_meta.note`, ne jen jeden řetězec — návrh §9 to naznačuje, jen explicitněji.
- **NIT-4 —** `achieveBenevolence`/`achieveFeared`/`achieveMight` (world takeOver countery) + `when:{kind:'never'}` fallback (§6.2): zajistit, že `never` predikát je v DSL tabulce (§6.2 ho v tabulce kinds nemá, jen v textu) — coder ho potřebuje registrovat.

---

## 8. ZÁVĚR

| Kritérium | Verdikt |
|---|---|
| C4 fix (deklarativní, bez imperativních háčků) | **SPRÁVNĚ ✓** (grep gate dnes čistý, ověřeno) |
| Engine-stopping serializovatelnost + catch-up pauza (D10) | **SPRÁVNĚ ✓** (jediná clock.js změna nutná+správná; cap/RNG/save OK); MAJ-1 = main.js re-vstup je nový kód |
| UI event bus efemérnost (mimo hashState) | **SPRÁVNĚ ✓** (mimo state, optional, vzor emitTx) |
| Determinismus | **SPLNĚNO ✓** |
| R-G postup | **OK ✓** |
| Soulad architektura + proveditelnost + tickOrder | **OK ✓** (append na konec dne, N-04 ve stejném commitu) |
| SPLIT M8 | **NE — SOUHLASÍM ✓** |

**VERDIKT: GO.** Nálezy: **0 blocker / 1 major / 4 minor / 4 nit.** Major (MAJ-1) je formulační upřesnění rozsahu main.js re-vstupu — design záměr správný, neblokuje. Doporučuji předat design Sonner coderovi s MAJ-1/MIN-1..4 jako implementační poznámkami a T-REV/tester gate dle §4.3/§6.6/§9.

**Doporučení dalšího kroku: APPROVE → dispatch coder (Sonnet) s touto review jako přílohou.**
