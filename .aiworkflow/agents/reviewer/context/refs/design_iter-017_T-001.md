# Design M7a-2 — Frakční automat + revolty/questy/tribute + AI-AI bitvy + UI (iter-017, T-001)

- **Task**: T-001, iter-017 (BRIEF-017-001)
- **Autor**: architect
- **Datum**: 2026-06-14
- **Milník**: M7a-2 (frakční AI ožívá). **Dokončuje M7a** (DoD M7a se vyhodnotí po této iteraci — DR-016-01). Navazuje na M7a-1 design (`design_iter-016_M7a-1.md`) §3/§4/§16 = základ; tento dokument je dotahuje na implementační úroveň pro Sonnet codera.
- **Zdroj pravdy mechanik**: originál `doc/original_source/modules/prosperity/services/world.js` (AISTATES ř.13–21, processAI ř.743–991, redistributeForces ř.636–742, findNeighboursOf ř.993–1016, revolt ř.282–369, quest ř.371–487, gatherTributes ř.527–565).
- **Architektura**: iter-002 §8.2 (zone tick), §8 (kontrakty/world), K16 (RNG streamy), K17 (schedule one-shot). Beze změny.
- **Scope OUT**: žádný kód; `battle.js` NEDOTČEN (AI-vs-player bitva = M7b/iter-018); žádná změna architektury iter-002 ani signatur kontraktů §8/§8.2.

> Kde se design odchyluje od originálu (RNG izolace, `scheduleInsert` místo `Engine.insert`, plain-data stav, idempotentní self-rearm), je odchylka uvedena s důvodem (determinismus/catch-up-safe) a označena gapem.

---

## 0. Shrnutí rozhodnutí (TL;DR pro Sonnet + orchestrátora)

| # | Rozhodnutí | Hodnota |
|---|---|---|
| **D-SPLIT** | **SPLIT M7a-2 = NE** (povinné rozhodnutí) | T2 (L) + T3 (M) + T6 (M) souzní do jedné iterace. Datová kostra (`world.zones`/`world.factions`/`hydrateZones`/katalog/`BALANCE.world`) je hotová v M7a-1 — M7a-2 jen čte a mutuje. Žádný nový L wiring. T3/T6 závisí na T2 jednosměrně a sdílí ho v review/test loopu. Odůvodnění §1. |
| **D1** | Frakční automat | AISTATES 0–6(+7) **přechodová tabulka jako data** (`zones.json.zones.aiStates`, rozšířená o `transitions`) + deterministická `processAI(state, factionId, rng)` (přesně originál ř.743–991). Plánování přes **`scheduleInsert` one-shot** (string-ID + K17), NE `Engine.insert`. §2. |
| **D2** | Self-rearm (KRITICKÉ) | `world.processFaction{factionId}` se **idempotentně re-schedulí** na konci handleru (perioda `aiTurnPeriod`). Boot/load re-arm přes **`armFactionAI(state)`** se `scheduleCountOf`-guardem per frakce (mirror `armContractOffer`, anti-DR-012-02 — **žádná load-only ani init-only větev**). §2.4. |
| **D3** | AI-AI bitvy | **RNG resolve vzorcem** v `processAI` state 6 (`aiBattleResolve` ve `formulas.js`, 1:1 originál ř.952–981). `battle.js` NEDOTČEN. AI-vs-player → `scheduleInsert(curStep+100,'startBattle',…)` = **M7b stub**. §4. |
| **D4** | Revolty | favour-drain na zone ticku, gated `curStep > revoltMechanicStart` (=630000). Naplní no-op blok z M7a-1 processZone. `favour` = **objekt per faction** (`{factionId:number}`) — oprava M7a-1 (viz §3.1, gap G-FAVOUR-SHAPE). §3. |
| **D5** | Questy | deterministicky generované (`world.questSeq`, rng 'world'), oceňování `getGoldValue`. `acceptQuest`/`rejectQuest` commands. `deadlineStep` absolutní. Store `state.world.quests[]` + `zone.curQuest=questId`. §5. |
| **D6** | Tribute výběr | `world.gatherTributes` periodikum (**month edge, order 25**) — naplní tribute split z M7a-1 §16.1. Player zóny → `grant`; AI zóny → `capital.resources.gold += getGoldValue`. §6 + §9. |
| **D7** | Determinismus / catch-up-safe | jediný `makeRng(state,'world')`; `processAI` deterministický v offline dávce; schedule serializovatelný; **idempotentní self-rearm bez load-only/init-only větve** (DR-012-02 třída); replay test (stejný seed → stejné přechody AISTATES). §7. |
| **D8** | UI (T6) | World/zones screen (`WorldScreen`): mapa zón (liege/policy/favour/ratingy), frakce/diplomacie panel, policy display, questy panel (accept/reject). **Selektory + commands, žádná logika v UI.** Nový tab. §8. |
| **D9** | Persist | `world.factions{}` dynamika (`state` 0–6/7, `wantToAttack`, `nextTarget`) — allowlist už hotový (M7a-1). `world.quests[]` + `world.questSeq` — **přidat do persist** (gap G-QUEST-PERSIST). Ratingy derivované — NEUKLÁDAT. §10. |

---

## 1. SPLIT M7a-2 — ROZHODNUTÍ: **NE** (povinné rozhodnutí)

**Doporučuji NEsplit** — celé M7a-2 (T2+T3+T6) do jedné iterace iter-017.

### 1.1 Odůvodnění (kritéria master plán §1.2)
1. **Datová a wiring kostra je hotová** (M7a-1, §16.2). `world.zones`/`world.factions` v persist, `hydrateZones` (id-based merge, fresh==load symetrie), G-LISTZONE data (aiStates/faction defs/topologie v `zones.json`), `BALANCE.world` konstanty, single rng 'world', `processZone` s **prázdnými gated bloky** pro revolt/quest. M7a-2 do těchto míst jen **dosadí logiku** — žádný nový L celek typu „založ doménu + persist + load merge".
2. **T2 je jediný L, ale ohraničený.** `processAI` je ~250 ř. čistého přepisu originálu s mechanickými odchylkami (rng, scheduleInsert) + 2 pomocné čisté fn (`redistributeForces`, `findNeighboursOf`) + 1 self-rearm smyčka (mirror `armContractOffer`). To je 1 L task se 4–5 Sonnet sub-kroky (§2.7), ne 2 nezávislé L.
3. **T3 je M a parazituje na T2 datech** (favour, questy, gatherTributes čtou/píší stejné `zone`/`faction` pole). Revolty a questy navíc jen **naplní existující gated no-op bloky** v `processZone` (M7a-1 §2.2.4/§2.2.5). Žádný nový tick wiring kromě 1 periodika (`gatherTributes`).
4. **T6 je M a čistě additivní** (selektory + screen + tab, vzor M3/M5-2/M6 UI). Bez logiky, izolovatelný, nízké riziko.
5. **Souznění review/test loopu.** Frakční replay-determinismus (T2) a revolt/quest/tribute (T3) se testují **na stejném zónovém substrátu** — jeden AI replay test (master plán §1.3) pokrývá oboje (frakce mění policies/útočí → zóny revoltují/generují questy). Rozdělení by zdvojilo test setup.

Celková zátěž: **1×L (T2) + 2×M (T3, T6)** — pod hranicí „2×L+3×M" z M7a-1 (kde byl split nutný). Stejná struktura jako iter-014 (M5-2: 1×L+2×M, neсplit).

**Alternativa (zamítnutá): split T2 / (T3+T6).** Zamítnuto: T3 (revolt/quest) bez T2 nemá dynamiku frakcí, takže favour-drain by se nikdy nespustil naplno (lieges se nemění bez processAI) → polovičatý hratelný výsledek, jako kritizovaná „statická mapa" u T6/M7a-1. Split nemá architektonickou cenu, ale štěpí jeden souvislý test.

**Alternativa (zamítnutá): split T6 do navazující mini-iterace.** Zamítnuto: UI je levné a uzavírá DoD M7a vizuálně (mapa zón ožívá s frakční dynamikou); odložení by nechalo M7a bez UI a posunulo DoD vyhodnocení.

> **Orchestrátor**: iter-017 = celé M7a-2, jedna iterace. Po reviewer GO se vyhodnotí **DoD M7a** (M7a-1 + M7a-2). Downstream beze změny (M7b=iter-018, DR-016-01).

---

## 2. T2 — Frakční AI automat (`processAI`, AISTATES, schedule) [L]

### 2.1 AISTATES jako data (přechodová tabulka)

`zones.json.zones.aiStates` dnes obsahuje **placeholder stavy** (Neutral/Friendly/… — diplomatické popisky, **NEsedí** na originál chování). **Přepsat** na originálovou semantiku (ř.13–21, 750–758, DOLOŽITELNÉ z originálu, `provenance:'extracted'`):

| id | key | význam (originál) | přechod (cíl) |
|---|---|---|---|
| 0 | `default` | rozhodovací: vybere weakest neighbour, dle ratingů/agrese zvolí další stav | → 1/2/3/4 (nebo 7 pokud zničena) |
| 1 | `growPop` | capital `policy=1`; 30% (rng) konverze resources→gold | → 0 |
| 2 | `growMil` | vassal policies→2 (50% rng); weakest-AI bonus; capital `policy=2` | → 0 |
| 3 | `growRes` | capital `policy=0` | → 0 |
| 4 | `prepAttack` | spy detekce → `warningAIAttacking` (+50) | → 5 |
| 5 | `annoAttack` | spy detekce → `dangerAIAttacking` (+50) | → 6 |
| 6 | `attacking` | `AIIsAttacking`(+0); vs player → `startBattle`(+100, M7b stub); vs AI → `aiBattleResolve` + `takeOver`(+400) | → 0 |
| 7 | `incapacitated` | mrtvá frakce, no-op | (terminál) |

- Tvar: `aiStates: [{ id:0, key:'default', desc:'...' }, …, { id:7, key:'incapacitated', desc:'...' }]`. Přechodová logika je **kód** (`processAI`, přesně originál) — tabulka je dokumentační/validační vrstva (klíče + popisky), ne data-driven interpret. **Důvod**: originálová přechodová logika je nestriktní stavový stroj s vnořenými rng-rozhodnutími (state 0 vybírá target a větví na 1/2/3/4 dle ratingů), který se nedá rozumně serializovat do čisté tabulky bez ztráty věrnosti. Data-driven interpret = over-engineering (master plán §1.2: jednoduchost > elegance).
- **Gap G-AISTATES-REWRITE**: M7a-1 coder naplnil `aiStates` diplomatickými placeholdery (0–7 Neutral…Vassal) jako součást G-LISTZONE approximace. M7a-2 je **přepíše** na originál semantiku (extracted). Žádný save-impact (`aiStates` je katalog, ne persistovaný stav; `faction.state` je číslo 0–7 a re-mapuje se: M7a-1 frakce nepřecházely, takže všechny mají `state=0` = `default` → kompatibilní).

### 2.2 Frakční stav v `state.world.factions`

`hydrateZones` (M7a-1) už produkuje per faction objekt (world.js:399–414):
```
{ id, name, capitalId, aggression, backstab, allies, recallMin, unitStats,   // STATIKA z katalogu
  state, wantToAttack, nextTarget, allies_dyn }                              // DYNAMIKA ze save
```
- **Persistovaná dynamika** (allowlist `world.factions` hotový, persistSchema.js:24, save jen `{state,wantToAttack,nextTarget}` per faction, persistSchema.js:282–288): `state` (0–7), `wantToAttack` (bool), `nextTarget` (zoneId|null). **`state` je klíč replay-determinismu** — přežije save/load, processAI je deterministický → po loadu pokračuje stejně.
- **`capital` = zóna**, ne faction objekt. Originál drží unity/resources na **capital zóně** (`capital.warriors`, `capital.resources.gold`), `unitStats` (strength/defense) na **faction** (`character.warriors.strength`). M7a-2 to respektuje: `capital = zones.find(z => z.id === faction.capitalId)`. Faction defs v `zones.json` mají `capitalId` (warlord→silverInslet, princess→kitsilano, psychopath→hornCastle — pozn. **odlišné** od originálu ř.762–766 `dickinsonLanding/castleGrey`, ale capitalId je v katalogu jediný zdroj pravdy; coder čte `faction.capitalId`, ne hardcoded).
  - **Gap G-CAPITAL-MISMATCH**: originál ř.762–766 hardcoduje capital per frakci jiný než `capitalId` v zones.json (zones.json: silverInslet/kitsilano/hornCastle = zóny s `capital:true` daného liege). **Rozhodnutí**: zdroj pravdy = `faction.capitalId` z katalogu (přečíst přes `getCapital(state, factionId)` helper). Originál hardcode ignorovat (data-driven). Per faction musí v katalogu existovat zóna s tím `capitalId` a `liege==faction.id` — validovat v schema (§2.6).

### 2.3 `processAI(state, factionId, rng)` — přechodová fn (přesně originál)

Čistá fn (modul `world.js`), přepis originálu ř.743–991. **Odchylky (povinné, s důvodem):**

1. **`Math.random` → `rng.next()` / `rng.chance(p)` / `rng.int(n)`** všude (ř.771, 793, 835, 859, 873, 903, 952–979). Jediný stream `'world'` (D7). **NIKDY** `Math.random`/`Date.now` (grep gate, master plán §1.3).
2. **`Engine.insert(delay, id, params)` → `scheduleInsert(state, state.engine.curStep + delay, id, params)`** (K17, serializovatelné):
   - state 4: `scheduleInsert(curStep+50, 'warningAIAttacking', {factionId})` (ř.923)
   - state 5: `scheduleInsert(curStep+50, 'dangerAIAttacking', {factionId})` (ř.936)
   - state 6: `scheduleInsert(curStep+0, 'AIIsAttacking', {factionId})` (ř.943); vs player `scheduleInsert(curStep+100, 'startBattle', {attackerId, targetZoneId})` (ř.947, **M7b stub**); vs AI `scheduleInsert(curStep+400, 'world.takeOver', {attackerId, targetZoneId})` (ř.964).
   - **params: objekt** (`{factionId}`), ne pole (`[ai]`) — scheduler.js bere `params` objekt. Originálová pole `[ai]` → `{factionId: ai}`; `[ai, nextTarget.id]` → `{attackerId, targetZoneId}`.
3. **Lookup přes helpery, ne `$rootScope.itemList`**: `getCapital(state, factionId)`, `getZone(state, zoneId)`, `getFaction(state, factionId)` (čisté find/Map nad `state.world.zones`/`state.world.factions`, ~13 zón O(n) OK).
4. **`calcMilitaryRating`/`calcEconomicRating` (ř.607–634)**: čisté fn **na vyžádání** (derivované, NEukládat — §10). Zde se počítají inline při rozhodování state 0 (ř.785–824). `calcEconomicRating` volá `getGoldValue` (kontrakt §8.2, beze změny).
5. **Spy detekce (state 4/5, ř.917–938)**: čte `state.player.spy.deployed` (špioni). **Gap G-SPY-ABSENT**: spy systém není v M7a (je M8 story/meta). M7a-2: pokud `state.player.spy` neexistuje → větev se přeskočí (spies=undefined → no warning schedule), `state` přesto přejde 4→5→6. **Vědomě akceptováno**: warning/danger eventy jsou notifikace pro hráče (M8 napojí spy + notifikace), automat běží i bez nich. Schedule entry `warningAIAttacking`/`dangerAIAttacking` handler = M8 stub (no-op/notifikace).

### 2.4 Self-rearm `world.processFaction` (KRITICKÉ — idempotentní, anti-DR-012-02)

**Frakce se zpracovávají periodicky.** Originál nemá explicitní `processAI` scheduling ve `step` (volá se z eventů/UI). Zde nová schedule self-rearm smyčka, **přesný mirror `contracts.js` `contractOffer` + `armContractOffer`** (M7a-1 design §3.4):

**Handler** (`world.js`, registrován jako efekt):
```
function processFaction(state, params, ctx):
  factionId = params.factionId
  faction = getFaction(state, factionId)
  if !faction: return                                  // idempotentní no-op (frakce zmizela)
  // gate: AI aktivní jen po prahu
  if state.engine.curStep > BALANCE.world.aiMechanicStart:   // =567000
    if faction.state !== 7:                            // 7=incapacitated → neprocesuj (ale re-arm dál)
      const rng = makeRng(state, 'world')
      processAI(state, factionId, rng)
  // SELF-REARM (vždy, i pod prahem i incapacitated — drží smyčku živou, deterministicky):
  const period = BALANCE.world.aiTurnPeriod
  scheduleInsert(state, state.engine.curStep + period, 'world.processFaction', { factionId })
```
- **Re-arm je nepodmíněný** (vždy na konci handleru) → smyčka nikdy nevymizí, ani pod prahem (`aiMechanicStart`), ani u incapacitated frakce. To je **anti-DR-012-02**: žádná „pokud aktivní, jinak nic" větev, která by po loadu uprostřed neaktivního období ztratila schedule entry. Catch-up-safe: dávka odpálí přesně tolik `processFaction`, kolik live.

**Boot/load arm** (`world.js`, **mirror `armContractOffer`**):
```
export function armFactionAI(state):
  for each factionId in NON_PLAYER_FACTIONS (theWarlord/thePrincess/thePsychopath):
    if scheduleCountOf(state, 'world.processFaction') < (počet ne-player frakcí):
      // PER-FAKCE guard: viz níže
```
**Per-faction guard (přesný kontrakt):** `scheduleCountOf` indexuje podle **id** (`'world.processFaction'`), ne podle params. 3 frakce → 3 entries se **stejným id** → `scheduleCountOf` vrátí 3, nerozliší která frakce. **Řešení (rozhodnutí):** guard na **celkový počet** entries `world.processFaction`:
```
export function armFactionAI(state):
  const factionIds = ['theWarlord','thePrincess','thePsychopath']   // ne-player, mají AI
  const armed = scheduleCountOf(state, 'world.processFaction')
  for (let i = armed; i < factionIds.length; i++):
    // doplň chybějící frakce (od konce) — deterministicky podle pořadí
    const step = Math.max(state.engine.curStep, 1)
    scheduleInsert(state, step, 'world.processFaction', { factionId: factionIds[i] })
```
- **Idempotence**: fresh (`armed=0`) → vloží 3; load se 3 živými entries (`armed=3`) → vloží 0; starý save / částečný stav (`armed=1`) → doplní 2. **Žádná load-only ani init-only větev** — `armFactionAI(state)` se volá **z `bootSequence` jednou** (main.js za `armContractOffer`, ř.199), pokrývá fresh + M7a-2 save + starý M7a-1 save jedinou cestou (DR-012-02 třída, M5-R1 gate).
- **Pozn. k pořadí doplnění**: doplnění „od konce" (`i = armed`) předpokládá, že armed entries jsou prefix `factionIds`. Pro robustnost (kdyby chyběla prostřední) **alternativa**: enumeruj schedule a zjisti, které `factionId` chybí (scan `state.engine.schedule.filter(e=>e.id==='world.processFaction').map(e=>e.params.factionId)`), doplň množinový rozdíl v deterministickém pořadí `factionIds`. **Doporučuji tuto robustní variantu** (set-difference), guard je pak přesný i při neúplném stavu — viz §2.6 dekompozice.
- **Determinismus pořadí 3 frakcí**: 3 entries na stejném `step` se rozliší **`seq`** (scheduler.js `less()`: tie-break `seq` ascending = FIFO podle insertu). `armFactionAI` insertuje v pevném pořadí `factionIds` → deterministické pořadí zpracování, přežije save/load (seq je persistován, `_seq` v engine).

### 2.5 `redistributeForces` + `findNeighboursOf` (čisté)

- **`findNeighboursOf(state, factionId)`** (ř.993–1016): čistý průchod `state.world.zones`, vrátí sousední zóny (`zone.neighbours`) s `liege != factionId`, deduplikované. Topologie `neighbours` = data z katalogu (G-LISTZONE, M7a-1 §9, už v zones.json).
- **`redistributeForces(state, factionId, rng)`** (ř.636–742): přepis 1:1, `Math.random→rng`. Recall minima per frakce z **`faction.recallMin`** (zones.json: warlord {w:20,a:10}, princess {w:10,a:20}, psychopath {w:40,a:10}) — **pozn. odlišné** od originálu ř.686–695 (warlord 300/150…). **Rozhodnutí**: zdroj pravdy = katalog `faction.recallMin` (M7a-1 approximace, `provenance:'approximated'`, kalibrace M9, gap G-RECALL-MIN). AI „cheat" +10 % (ř.681–682) zachován. `aggression`/`backstab` z `faction` (katalog).
- Obě fn mutují `zone.warriors`/`zone.archers` a `capital.warriors`/`capital.archers` (čísla na zóně). **Floor** výsledky (originál `Math.floor`).

### 2.6 Schema validace + registrace handlerů

- **Schema** (M1/K15, vzor M7a-1): rozšířit zones schema — `faction.capitalId` MUSÍ odkazovat na existující zónu s `liege==faction.id` && `capital:true` (G-CAPITAL-MISMATCH guard). `aiStates` má 0–7 s `key`.
- **Registrace efektů** — nová `registerWorldEffects(reg)` (`world.js`, mirror `registerContractEffects`, idempotentní module-level fn refs), volaná z `registerCorePeriodics` (tickOrder.js) a `bootstrapEngine` (main.js):
  - `world.processFaction`, `world.takeOver`, `world.gatherTributes` (i jako one-shot fallback), `AIIsAttacking`
  - `warningAIAttacking`, `dangerAIAttacking` → **M8 stub** (no-op/notifikace; spy systém M8)
  - `startBattle` → **M7b stub** (no-op/notifikace; battle automat M7b, `battle.js` NEDOTČEN)
  - `loadImportantEvent` → **M8 stub** (revolt event, §3)
- **Boot wiring** (main.js, za `armContractOffer` ř.199): `armFactionAI(state)`.

### 2.7 Dekompozice T2 (Sonnet sub-kroky)

1. `BALANCE.world` rozšíření: `aiTurnPeriod` (≈5 herních dní = 4500 kroků, `provenance:'approximated'`, gap G-WORLD-AITURN, kalibrace M9). Přepis `aiStates` v zones.json na originál semantiku (§2.1). Schema validátor (capitalId, §2.6).
2. `processAI(state, factionId, rng)` state 0–7 (přepis ř.743–991; rng + scheduleInsert; helpery getCapital/getZone/getFaction; calcMilitary/EconomicRating čisté).
3. `redistributeForces` + `findNeighboursOf` (čisté, ř.636–742/993–1016).
4. `processFaction` handler + `armFactionAI` self-rearm (set-difference guard, §2.4) + `registerWorldEffects` + boot wiring + gate aiMechanicStart.
5. AI replay determinismus test (§7.5) + schedule save/load round-trip test.

---

## 3. T3 — Revolty (favour-drain, zone tick, gated) [M]

Naplní **prázdný gated blok** z M7a-1 `processZone` (world.js:280–283, `if (curStep > revoltMechanicStart) {}`). Přepis originálu ř.282–369.

### 3.1 `favour` tvar — OPRAVA M7a-1 (gap G-FAVOUR-SHAPE)

- **Originál**: `zone.favour` je **objekt** `{factionId: number}` (ř.291–367 — `zone.favour[zone.liege] -= 2`, decay per faction). **M7a-1 hydrateZones inicializuje `favour: number` (0)** (world.js:377) — **NEKOMPATIBILNÍ** s revolt mechanikou.
- **Rozhodnutí**: M7a-2 změní `hydrateZones` default na `favour: {}` (prázdný objekt) a revolt blok lazy-inicializuje `zone.favour[liege] = 0`. **Save-impact**: M7a-1 ukládal `favour:0` (číslo); migrace v `hydrateZones` — pokud `saved.favour` je number → nahradit `{}` (revolt mechanika nebyla aktivní v M7a-1, žádná data se neztrácí). Undefined-guard, žádná destruktivní migrace (vzor M6-D11). Persist: `favour` zůstává v allowlistu (objekt místo čísla — generický průchod OK).
- **Gap G-FAVOUR-SHAPE**: resolved — `favour` = objekt `{factionId:number}` od M7a-2; M7a-1 number→{} migrace v hydrateZones.

### 3.2 Revolt logika (1:1 originál ř.282–369)

V `processZone`, uvnitř `if (state.engine.curStep > BALANCE.world.revoltMechanicStart)` (=630000):
- **Immune kombinace** (capital drží originalLiege, ř.285–288): `(hornCastle&thePsychopath) || (dickinsonLanding&theWarlord) || (castleGrey&thePrincess)` → skip. **Pozn.**: hardcode zón v originálu; M7a-2 zachová (gap G-REVOLT-IMMUNE, data v kódu věrně z originálu; alt: odvodit z `zone.immunity` flag — ale originál je explicitní seznam, držet věrně).
- **`liege != originalLiege`** (okupovaná zóna) → favour-drain:
  - lazy init `zone.favour[liege] = 0`; `-= 2` base
  - policy modifikátory: `policy==1 → +1`; `policy==2 → -4`; `policy==3 → -2` (ř.300–310)
  - unit-count modifikátory (`unitsAtZone = archers+warriors`, ř.312–324): `<5→-2`, `<100→-1`, `<500→0`, `<1000→+1`, `≥1000→+2`
  - regionální bonusy (ř.326–332, **data z G-LISTZONE**): princess region (winisk/burwash/corbyville/lemieux/kitsilano) `+2`; warlord region (dickinsonLanding/pointAnne/redWater/tomiko/silverInslet) `+2`
  - **`favour[liege] < 5` → REVOLT**: `liege=='player'` → `scheduleInsert(curStep+100,'loadImportantEvent',{event:'vassalRevolted', zoneId})` (M8 stub) + notifikace; non-player → notifikace (M8). Pak `zone.liege = zone.originalLiege; zone.policy = 1`.
  - `fixFavourLimits(zone)` (ř.351) — clamp favour do `BALANCE.world.favourLimits` (`{min:-100, max:100}`, `provenance:'approximated'`, gap G-FAVOUR-LIMITS).
- **`liege == originalLiege`** (neutrál, ř.352–367): favour decay k 0 per faction (`>0 → --`, `<0 → ++`) přes `['theWarlord','thePsychopath','thePrincess','player']`.

> **Pozn. ke quest-bloku v originálu**: originál má quest-generování **uvnitř** revolt-gate (ř.371–487, gated `revoltMechanicStart`). Viz §5 — questy sdílí stejný gate.

### 3.3 Determinismus
Revolt vzorce jsou **deterministické bez rng** (favour aritmetika je čistá funkce stavu zóny). Quest-generování (§5) uvnitř téhož bloku **používá rng 'world'**. Pořadí: revolt-drain → quest-gen (jako originál). Vše uvnitř `processZone` (round-robin 1 zóna/den, M7a-1 §2.1) → catch-up-safe.

---

## 4. T3 — AI-AI bitvy = RNG resolve VZORCEM (NE battle automat) [M]

**Kritické rozlišení M7a vs M7b.** `processAI` state 6, větev `nextTarget.liege != 'player'` (originál ř.948–984, zdroj pravdy):

```
aiBattleResolve(atkFaction, capital, targetZone, targetLiegeFaction, rng):
  warrResults = max((atkFaction.unitStats.warriors.strength * capital.warriors
                   - (targetZone.warriors * targetLiegeFaction.unitStats.warriors.strength
                      * rng.next() * 0.5 + 0.7)) / atkFaction.unitStats.warriors.strength, 0)
  archResults = max((atkFaction.unitStats.archers.strength * capital.archers
                   - (targetZone.archers * targetLiegeFaction.unitStats.archers.strength
                      * rng.next() * 0.5 + 0.7)) / atkFaction.unitStats.archers.strength, 0)
  if warrResults + archResults > 0:   // attacker wins (ř.956–973)
     capital.warriors = floor(rng.next() * 1.4 * warrResults)
     capital.archers  = floor(rng.next() * 1.4 * archResults)
     targetZone.archers  = floor(rng.next() * 0.3 * archResults)
     targetZone.warriors = floor(rng.next() * 0.3 * warrResults)
     scheduleInsert(curStep+400, 'world.takeOver', {attackerId, targetZoneId})
     if attackerId == 'thePsychopath':   // ř.966–970
        targetZone.warriors += floor(targetZone.numWorkers * rng.next() * 0.7)
        targetZone.numWorkers = 1
     atkFaction.nextTarget = null
  else:                                // attacker loses (ř.974–981)
     capital.warriors = floor(rng.next() * 0.2 * capital.warriors)
     capital.archers  = floor(rng.next() * 0.2 * capital.archers)
     targetZone.archers  = floor(rng.next() * 0.7 * targetZone.archers)
     targetZone.warriors = floor(rng.next() * 0.7 * targetZone.warriors)
  redistributeForces(state, attackerId, rng)   // ř.983
```

- **Vzorec → `formulas.js`** (`aiBattleResolve(...)`) s **tabulkovým testem proti originálu** (master plán §1.3). Bere `rng` jako parametr → deterministické.
- **`unitStats.warriors.strength`**: faction stat (zones.json, `provenance:'approximated'`, G-MILITARY-STATS). Originál `character.warriors.strength`.
- **Žádný `battleStep`/`battleState`/`battle.js`** — to je §8.1/M7b. AI-vs-hráč (`nextTarget.liege == 'player'`) → `scheduleInsert(curStep+100, 'startBattle', {attackerId, targetZoneId})` (handler M7b stub).
- **`world.takeOver` handler** (registrován §2.6): přepis `changeZoneLiege` (originál ř.496+) — `zone.liege = attackerId`, quest-handling při změně liege (originál ř.500+; M7a-2: zruš `zone.curQuest` pokud zóna mění majitele). Čistá mutace + rng-free.
- **Gap G-AI-BATTLE-FORMULA**: vzorec 1:1 originál, RNG-izolovaný; deterministický replay test povinný.

---

## 5. T3 — Questy (deterministicky, oceňování, commands) [M]

Naplní quest sekci v `processZone` (originál ř.371–487, uvnitř revolt-gate). **`Math.random → rng 'world'`**.

### 5.1 Generování (zone tick, gated)
- Podmínka (ř.372): `!zone.curQuest && state.home.level >= 2` (home level proxy; **gap G-QUEST-HOMELEVEL**: pokud `home.level` chybí → použít `>= 2` jako `true` fallback nebo prahovou náhradu, kalibrace M9). `canMakeQuest` = zóna je player nebo má player-sousedy (ř.374–384).
- `rng.next() < BALANCE.world.questChance` (originál ř.386 má `< 1.20` = vždy true; M7a-2 `questChance:1.0`, `provenance:'extracted'` z originálu efektivně 100%, gap G-QUEST-CHANCE).
- **Typy** (originál aktivní `questTypes=['soldiers']`, ř.391): M7a-2 implementuje **`reinforcement`** (soldiers, ř.452–480) jako min. sadu; `goldSupply`/`foodSupply` (ř.395–448) jako **rozšíření** (data-ready, ale `questTypes` katalog řídí). **Rozhodnutí**: min. hratelná sada = `reinforcement` (1:1 originál aktivní typ). gold/food jako quest-type data v katalogu, aktivace kalibrací M9 (gap G-QUEST-TYPES).
- **`reinforcement`** (ř.452–480): `soldiersRequested = floor(rng.next() * zone.numWorkers / 8) - soldiersHave`; podmínky (`hasMilitary`, `liege==originalLiege`, `soldiersRequested>10`, hráč má dost). reward `{favour:60}` (+ gold pokud `favour.player>50`, ř.474–476 přes `getGoldValue` ekvivalent).

### 5.2 Quest stav + deterministické ID
- `createQuest(quest)` → deterministické ID `'quest_' + (state.world.questSeq++)` (monotónní čítač, vzor `contractSeq`, contracts.js:236). **Persist `world.questSeq`** (gap G-QUEST-PERSIST, §10).
- Store: `state.world.quests[]` (pole objektů) + `zone.curQuest = questId`. Quest objekt: `{ id, from:zoneId, type, title, req, reward, deadlineStep, description }`.
- **`daysRemaining:30` → `deadlineStep = curStep + 30 * stepsPerDay`** (absolutní krok, catch-up-safe, vzor contracts deadlineStep). Schedule one-shot `scheduleInsert(deadlineStep, 'world.questExpire', {questId})` → expirace (idempotentní no-op pokud quest nesplněn/zmizel, vzor contractExpire).
- **Oceňování**: req/reward gold přes `getGoldValue` (kontrakt §8.2) kde originál používá tržní hodnotu.

### 5.3 Commands `acceptQuest` / `rejectQuest` (vzor contracts commands)
- **`acceptQuest({questId})`** (`src/core/commands/quests.js`): najdi quest, validace (existuje, `from` zóna stále má vztah). Splní `req`: `pay(state, req, 'quest:'+id)` (pokud req jsou resources/units; **units** = `player.totWarriors/totArchers -= count`, vzor recruitUnit reverzně) → grant `reward` (`grant(state, reward.gold)`, `favour`: `zone.favour.player += reward.favour`). `removeQuest`, `zone.curQuest = null`. `canAfford` guard. `CommandResult {ok}`.
- **`rejectQuest({questId})`**: označ/odstraň quest (`zone.curQuest=null`, splice z `world.quests`). Žádná penalizace (min. sada).
- **Registrace** `registerQuestCommands(creg)` (vzor `registerContractCommands`, command vrstva bez ctx → G-BUILD-TXAUDIT třída, audit M9).
- **Gap G-QUEST-STORE**: questy v `state.world.quests` (M7a-2); M8 napojí na story/UI (M7a-1 §13 carry-over).

---

## 6. T3 — Tribute výběr (`gatherTributes`, month edge) [M]

Naplní **tribute split** z M7a-1 §16.1 (M7a-1 jen akumuluje do `zone.resources`; M7a-2 vybírá). Originál ř.527–565.

### 6.1 `gatherTributes` periodikum
- Nové periodikum **`world.gatherTributes`, MONTH edge, order 25** (M7a-1 §10.1/§16.1 rezervoval slot — před `upkeep.military` order 30, aby tribute příjem předcházel upkeep platbě).
- Logika (ř.527–565), průchod `state.world.zones` (skip `homeZone`):
  - **player zóny** (`liege=='player'`): `grant(state, zone.resources, 'tribute:'+zoneId, ctx)` (Player.insertInventory ekvivalent → home/player inventory). `zone.resources = {}`.
  - **AI zóny** (`liege` ∈ {warlord/princess/psychopath}): `capital = getCapital(state, zone.liege)`; `capital.resources.gold = (capital.resources.gold||0) + Math.round(getGoldValue(state, zone.resources))`. `zone.resources = {}`.
- **Tvar fn**: `gatherTributes(state, _params, ctx)` (periodikum, má ctx). Žádný rng (deterministické). Catch-up-safe (month edge, deterministické).

### 6.2 Registrace
- `register(registry, 'world.gatherTributes', gatherTributes)` v `registerCorePeriodics` (tickOrder.js).
- Periodikum data: `{ id:'world.gatherTributes', every:'month', order:25, systemFn:'world.gatherTributes' }` v periodics[] (tickOrder.js, mezi `taxes.monthly` order 20 a `upkeep.military` order 30).

---

## 7. Determinismus & catch-up-safe (KRITICKÉ — D7)

### 7.1 RNG izolace
- **Veškerý frakční/revolt/quest/bitva RNG přes `makeRng(state,'world')`** (jediný stream, rng.js:10, existuje). Žádný `Math.random`/`Date.now` (originál je používá masivně — všechna se nahrazují). Grep gate (master plán §1.3) hlídá core.
- `processAI`, `redistributeForces`, `aiBattleResolve`, quest-gen → všechny dostávají/používají **jeden** `world` rng. Stream `'battle'` **NEDOTČEN** (rezervován M7b).
- **Pořadí čerpání rng** musí být **bit-identické** s pořadím přechodů (replay). `processFaction` čte rng až po gate a jen pokud `state!==7` → **deterministická závislost na `faction.state`** (persistováno) a `curStep` (persistováno). Žádné skryté větve čerpající rng podmíněně mimo perzistovaný stav.

### 7.2 Schedule serializovatelný
- Frakční tahy (`world.processFaction`), varování (`warningAIAttacking`/`dangerAIAttacking`), AI útoky (`startBattle`/`world.takeOver`/`AIIsAttacking`), revolt eventy (`loadImportantEvent`), quest deadliny (`world.questExpire`) → **schedule one-shot** (`scheduleInsert`, K17). Entries plain-data (`{step,id,params,seq}`) — přežijí save/load (persistSchema engine.schedule/scheduleCount, persistSchema.js:65–66). **Žádný `Engine.insert`** (objektová ref originálu).

### 7.3 Idempotentní self-rearm (DR-012-02 třída — anti-pattern check)
- `armFactionAI(state)` (§2.4) volaná **z bootSequence jednou** (fresh + load + starý save jedinou cestou). **Žádná load-only větev** (jako `armContractOffer`, main.js:199). **Žádná init-only větev** (re-arm guard pokrývá i fresh).
- `processFaction` re-armuje **nepodmíněně** (i pod prahem, i incapacitated) → schedule entry nikdy nevymizí → po loadu uprostřed neaktivního období se smyčka nepřeruší. To je explicitní **anti-DR-012-02**: žádná „derivace jen při aktivaci", která by se po loadu neprovedla.
- **Guard set-difference** (§2.4): `armFactionAI` doplní jen chybějící `factionId` (množinový rozdíl proti živým entries) → idempotentní při libovolném stavu schedule (fresh/plný/částečný).

### 7.4 Round / randRound
- `randRound(x, rng)` už existuje (world.js:33, M7a-1) — reuse.

### 7.5 Replay test (POVINNÝ, acceptance-blokující)
- **AI replay determinismus** (master plán §1.3/iter-014): `hash(simulate(seed, N))` s aktivním AI světem (curStep > aiMechanicStart) **stabilní** — stejný seed → **stejná sekvence přechodů AISTATES** (frakce mění policies/útočí identicky).
- **Save/load round-trip uprostřed AI aktivity**: simuluj N kroků (frakce ve stavu 4/5/6, schedule entries pending) → save → load → pokračuj M kroků; `hashState` == nepřerušený běh. Ověřuje: `faction.state` přežije, schedule entries (`world.processFaction`/`startBattle`/`takeOver`) přežijí, `armFactionAI` po loadu **nevloží duplikát** (guard).
- **Fresh-vs-load** (DR-012-02): `hashState(fresh)` == `hashState(load(save(fresh)))` po `armFactionAI` na obou cestách (žádná asymetrie self-rearm).
- **Catch-up-safe**: offline dávka odpálí `processFaction`/revolt/quest/tribute **identicky** jako live (vše deterministické, schedule-driven, O(1)/tick).

---

## 8. T6 — UI World/zones screen [M]

Vzor M3/M5-2/M6 UI: čistá komponenta, **selektory + commands, žádná logika v UI**.

### 8.1 Selektory (`src/ui/selectors.js`)
- **`selectWorldZones(s)`**: pole `{ id, name, liege, liegeName, liegeColor, originalLiege, policy, policyName, numWorkers, warriors, archers, favour (player favour number derivovaná z favour objektu), militaryRating, economicRating, neighbours, curQuest }`. **Ratingy derivované** (volá `calcMilitaryRating`/`calcEconomicRating` čisté, NEukládá — §10). Color/name z faction katalogu.
- **`selectFactions(s)`**: pole `{ id, name, color, state, stateName (z aiStates key), capitalId, capitalName, aggression, totalZones (count liege==id), totalWarriors, totalArchers, wantToAttack }`. Diplomacie: vztah k hráči (favour agregace, `wantToAttack` vůči player zónám).
- **`selectQuests(s)`**: pole `{ id, from (zoneName), type, title, description, req, reward, deadlineStep, daysLeft (derivováno z curStep), canAccept (canAfford req) }`. Čte `state.world.quests`.

### 8.2 Screen (`src/ui/screens.js` — `WorldZonesScreen`)
- **Mapa zón**: tabulka/grid zón (liege barva, policy, numWorkers, warriors/archers, military/economic rating, favour). Topologie `neighbours` jako textový výčet (plná grafická mapa = M8/polish; min. sada = list/tabulka, vzor MarketScreen tabulka).
- **Frakce/diplomacie panel**: per frakce stav (`stateName`), počet zón, celková armáda, agrese, „chce zaútočit".
- **Policy display**: per zóna aktuální policy (read-only; změna policy player zón = M8 governance nebo budoucí command — **mimo M7a-2 scope**, jen zobrazení).
- **Questy panel**: nabídnuté questy (`selectQuests`), tlačítka `Accept`/`Reject` → `send('acceptQuest',{questId})` / `send('rejectQuest',{questId})` (vzor ContractsScreen accept/reject).

### 8.3 Tab + wiring
- `src/ui/App.js`: nový tab `{ id:'world-ai', label:'Svět' }` v `TABS` (pozn. tab `world`='Příroda' už existuje pro forest/field/mine — **nový tab samostatný**, label „Svět" nebo „Frakce"). `${activeTab === 'world-ai' ? html\`<${WorldZonesScreen} snapshot=${snapshot} send=${send} />\` : null}`.
- Import `WorldZonesScreen` v App.js. **Žádná logika v UI** — vše přes selektory/commands.

### 8.4 Dekompozice T6
1. Selektory `selectWorldZones`/`selectFactions`/`selectQuests` (čisté, ratingy on-demand).
2. `WorldZonesScreen` komponenta (mapa + frakce + questy panel).
3. Tab wiring v App.js + styles (vzor existujících screen).

---

## 9. tickOrder dopady + diagram

### 9.1 Změny v `tickOrder.js`
- **`world.tick`** (day order 30) — **beze změny pozice**, M7a-1 už naplnil. M7a-2 přidá revolt/quest logiku **dovnitř** `processZone` (gated bloky, žádná tickOrder změna).
- **NOVÉ periodikum `world.gatherTributes`** (month edge, **order 25**) — mezi `taxes.monthly` (order 20) a `upkeep.military` (order 30). Registrovat v `registerCorePeriodics` + přidat do periodics[] (§6.2).
- **NOVÉ schedule handlery** (`registerWorldEffects`, idempotentní): `world.processFaction`, `world.takeOver`, `AIIsAttacking`, `world.questExpire`; M7b stub `startBattle`; M8 stuby `warningAIAttacking`/`dangerAIAttacking`/`loadImportantEvent`. Registrace z `registerCorePeriodics` (test ctx) + `bootstrapEngine`.
- **Boot** (main.js): `armFactionAI(state)` za `armContractOffer` (ř.199).
- **TICK_ORDER konstanta** beze změny (fáze stejné).
- **Living artifact** `tickOrder.md` + ASCII diagram: aktualizovat ve stejném commitu (reviewer gate).

### 9.2 ASCII diagram
```
DAY EDGE:
  ... housing.settlementLevel (20)
  world.tick (30) ──── round-robin processZone(1 zóna/den)  [M7a-1 + M7a-2 dovnitř]
       ├─ gold ekonomika / policy switch / shortage      [M7a-1]
       ├─ if curStep > revoltMechanicStart:              [M7a-2 NAPLNĚNO]
       │     ├─ revolt: favour-drain → liege=originalLiege  (§3)
       │     └─ quest-gen: createQuest, rng 'world', getGoldValue  (§5)
       └─ marketInject(+/−) / ratingy derivované         [M7a-1]
  market.drift (35) ◄── mean-reversion po injekcích

MONTH EDGE:
  food.spoilage (10) → taxes.monthly (20)
       → world.gatherTributes (25, NOVÉ M7a-2) ─── výběr resources → player grant / capital gold  (§6)
       → upkeep.military (30) → council.closeMonth (40)
                          [tribute příjem PŘED upkeep platbou]

SCHEDULE (one-shot, K17, serializovatelné):  [M7a-2]
  armFactionAI(boot) ── per frakce (set-diff guard, idempotentní) ──┐
  world.processFaction{factionId} ◄─(self-rearm +aiTurnPeriod, NEPODMÍNĚNĚ)─┐
       │  gate: curStep > aiMechanicStart && state!==7 → processAI       │
       │     ├─ state 4/5: warning/dangerAIAttacking (+50) [M8 stub, spy]│
       │     ├─ state 6 vs AI: aiBattleResolve (formulas, rng 'world')   │
       │     │        + world.takeOver(+400)                             │
       │     └─ state 6 vs player: startBattle(+100) ──► [M7b stub, NEsahat battle.js]
       └──────────────────────────────────────────────────────────────►┘ (re-arm vždy)
  revolt(player) → loadImportantEvent(+100) [M8 stub]
  quest → world.questExpire(deadlineStep) [idempotentní no-op]

RNG: makeRng(state,'world') — JEDINÝ stream pro celý AI svět. 'battle' rezervován M7b.
```

---

## 10. Persist schéma (D9 — co se ukládá / co derivuje)

`PERSIST_SCHEMA.world` allowlistuje `'zones','factions'` (M7a-1). M7a-2 přidá `quests`/`questSeq`.

| Doména | UKLÁDAT | NEUKLÁDAT (derivace) |
|---|---|---|
| `world.factions{}` | `state (0–7), wantToAttack, nextTarget` (allowlist hotový, persistSchema.js:282–288) | `id,name,capitalId,aggression,backstab,allies,recallMin,unitStats` (re-hydrace z katalogu, `hydrateZones`) |
| `world.zones[]` | + `favour` (nově **objekt** `{factionId:number}`, G-FAVOUR-SHAPE), `curQuest` (questId) — allowlist hotový | `militaryRating,economicRating` (calc on-demand, §8.1) |
| `world.quests[]` | **PŘIDAT do allowlistu**: `id,from,type,title,req,reward,deadlineStep,description` | `daysLeft,canAccept` (selektory) |
| `world.questSeq` | **PŘIDAT** (monotónní čítač, vzor contractSeq) | — |

- **`world.quests`/`world.questSeq` → přidat do `PERSIST_SCHEMA.world` allowlistu** (persistSchema.js:24) + do `hydrateZones` init (`state.world.quests ??= []`, `state.world.questSeq ??= 0`). Gap **G-QUEST-PERSIST** resolved.
- **Migrace**: aditivní (`undefined`-guard). Starý M7a-1 save: `quests`/`questSeq` chybí → init []/0; `favour:number` → migrace na `{}` v hydrateZones (§3.1). **Žádná destruktivní migrace**, žádný bump SAVE_VERSION nutný (allowlist aditivní, vzor M6-D11). Coder ověří fresh-vs-load hashState (DR-012-02).
- **`faction.state` je jádro replay-determinismu** — persistováno, processAI deterministický → po loadu pokračuje bit-identicky.

---

## 11. Kontrakty §8 — beze změny signatur (reviewer gate)

| Kontrakt §8 | Signatura | M7a-2 status |
|---|---|---|
| Frakční automat §8.2 | AISTATES data + `processAI(state, factionId, rng('world'))`, schedule K17 | **Naplněn** T2. |
| `getGoldValue` §8.2 | `getGoldValue(state, basket)` | **Použit** T3/T4 (quest oceňování, tribute AI gold, calcEconomicRating) — beze změny. |
| `marketInject` §8.2 | `marketInject(state, goodsId, qty)` | M7a-1 (T5), M7a-2 nedotčen. |
| Battle automat §8.1 | `battleStep(...)`, `state.battle` | **NEDOTČEN** (M7b). AI-AI = RNG vzorec; AI-vs-player = `startBattle` schedule stub. |

**Žádná změna kontraktů §8 → žádný decision record nutný.** Kdyby coder potřeboval změnit signaturu → eskalace + DR (master plán §9.4).

---

## 12. Rizika a mitigace

| # | Riziko | P/D | Mitigace |
|---|---|---|---|
| RW-1 | **Self-rearm load-only/init-only větev → DR-012-02 regrese** | Stř/Vys | `armFactionAI` jediná cesta (boot, fresh+load+starý save), set-diff guard, re-arm nepodmíněný; fresh-vs-load + round-trip hashState test (§7). |
| RW-2 | **processAI replay-nedeterministický** (skrytý Math.random / podmíněné rng mimo persist. stav) | Stř/Vys | Grep gate; jeden rng 'world'; rng závisí jen na perzistovaném `state`+`curStep`; AI replay test povinný (§7.5). |
| RW-3 | **`favour` shape mismatch** (M7a-1 number vs objekt) | Vys/Stř | G-FAVOUR-SHAPE: hydrateZones migrace number→{}, revolt nebyl aktivní v M7a-1 (žádná data); fresh-vs-load test. |
| RW-4 | **G-CAPITAL-MISMATCH** (originál hardcode capital ≠ zones.json capitalId) | Stř/Stř | Zdroj pravdy = `faction.capitalId` z katalogu; schema validace (capital zóna existuje, liege match). |
| RW-5 | **Sahnutí na battle.js** (záměna AI-AI s battle automatem) | Stř/Vys | Explicitní §4: AI-AI=formulas RNG; AI-player=`startBattle` schedule stub M7b; battle.js NEDOTČEN. Reviewer gate. |
| RW-6 | **Spy systém absent** (state 4/5 warning) | Níz/Níz | G-SPY-ABSENT: spy větev přeskočena pokud `player.spy` chybí; automat běží dál (4→5→6); warning handler M8 stub. |
| RW-7 | **Catch-up cena frakcí** | Níz/Stř | processFaction O(1)/tah, řídké (aiTurnPeriod ~5 dní); 3 frakce; zóny ~13; žádné O(n²). Benchmark T-TEST. |
| RW-8 | **Quest store vs M8 story konflikt** | Níz/Níz | G-QUEST-STORE: world.quests teď, M8 napojí; persist aditivní. |

---

## 13. Gap-list (provenance / carry-over)

| Gap | Popis | Řešení / kdy |
|---|---|---|
| **G-AISTATES-REWRITE** | M7a-1 placeholder aiStates → originál semantika | Resolved: přepis (extracted), state=0 kompatibilní |
| **G-FAVOUR-SHAPE** | M7a-1 favour:number → objekt | Resolved: hydrateZones migrace number→{} |
| **G-CAPITAL-MISMATCH** | originál capital hardcode ≠ zones.json capitalId | Resolved: zdroj pravdy = katalog capitalId + schema validace |
| G-WORLD-AITURN | aiTurnPeriod approximováno (~4500 kroků) | balance, kalibrace M9 |
| G-RECALL-MIN | recallMin katalog ≠ originál ř.686–695 | katalog = zdroj pravdy, approximated, M9 |
| G-AI-BATTLE-FORMULA | AI-AI bitva RNG vzorec | 1:1 originál + tabulkový test (formulas.js) |
| G-SPY-ABSENT | spy systém M8 | state 4/5 přeskočí, automat běží, handler M8 stub |
| G-QUEST-PERSIST | quests/questSeq do allowlistu | Resolved: přidat do PERSIST_SCHEMA.world + hydrateZones init |
| G-QUEST-TYPES | jen reinforcement aktivní | min. sada (orig aktivní typ); gold/food data-ready, M9 |
| G-QUEST-CHANCE / G-QUEST-HOMELEVEL | questChance≈1.0, home.level práh | extracted/approximated, M9 |
| G-FAVOUR-LIMITS | fixFavourLimits clamp | approximated {min:-100,max:100}, M9 |
| G-REVOLT-IMMUNE | revolt immune zóny hardcode | věrně z originálu (data v kódu) |
| G-MILITARY-STATS | unit strength/defense | approximated (zones.json faction defs), M9 |
| G-QUEST-STORE | questy world vs story (M8) | world.quests teď, M8 napojí |

---

## 14. Alternativy (povinné — min. 1)

1. **Data-driven AISTATES interpret** (přechodová tabulka jako vykonatelná data místo kódu). Zamítnuto: originálová přechodová logika (state 0 vybírá target + větví na 1/2/3/4 dle ratingů s vnořeným rng) se nedá serializovat do čisté tabulky bez ztráty věrnosti; interpret = over-engineering (§2.1, master plán §1.2 jednoduchost > elegance). Tabulka zůstává jako dokumentace/validace.
2. **Frakční tah jako periodikum** (místo schedule self-rearm). Zamítnuto: originál plánuje AI eventy delay-based (warning +50, startBattle +100, takeOver +400) — schedule nese delay-strukturu, periodikum ne; navíc self-rearm je vzor `contracts` (konzistence) a guard pokrývá fresh/load jedinou cestou (DR-012-02 mitigace). (M7a-1 design §15.2 stejný závěr.)
3. **AI-AI bitva přes battle automat** (sdílet §8.1). Zamítnuto: battle automat je M7b a drahý (sub-step); originál AI-AI je jednorázový RNG vzorec (ř.952–981) — věrnější a levnější v catch-upu. AI-vs-player jde přes battle automat (M7b). (M7a-1 §15.3.)
4. **SPLIT M7a-2 na T2 / (T3+T6)**. Zamítnuto: §1.1 (1×L+2×M pod kapacitou; T3 bez T2 polovičatý; split štěpí jeden souvislý AI test).
5. **`favour` jako number** (ponechat M7a-1 tvar, agregovat). Zamítnuto: originál favour je per-faction objekt s decay per faction (ř.352–367) — number ztrácí per-faction sémantiku; revolt mechanika by nesedla na originál.

---

## 15. Dekompozice pro Sonnet (souhrn)

- **T2 (L)**: §2.7 — balance/aiStates/schema → processAI → redistributeForces/findNeighboursOf → processFaction+armFactionAI self-rearm+registr → AI replay+round-trip test.
- **T3 (M)**: revolt favour-drain (§3, favour shape migrace) → aiBattleResolve formulas + tabulkový test (§4) + takeOver handler → quest-gen rng+getGoldValue (§5) → acceptQuest/rejectQuest commands → gatherTributes month periodikum (§6) → quests/questSeq persist (§10).
- **T6 (M)**: §8.4 — selektory (zones/factions/quests) → WorldZonesScreen → tab wiring.
- **T-TEST**: AI replay determinismus, save/load round-trip uprostřed AI aktivity, fresh-vs-load hashState, tabulkový test aiBattleResolve, catch-up benchmark, UI smoke.

---

*Konec designu. Zdroj pravdy: originál `world.js` (processAI ř.743–991 1:1, RNG-izolovaný, scheduleInsert). Architektura iter-002 §8.2/§8 beze změny. Self-rearm = idempotentní `armFactionAI` (boot, set-diff guard, nepodmíněný re-arm) — anti-DR-012-02. battle.js NEDOTČEN (M7b). SPLIT M7a-2 = NE.*
