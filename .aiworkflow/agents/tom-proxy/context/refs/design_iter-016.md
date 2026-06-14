# Design M7a — AI svět, zóny, frakce, jednotky (iter-016, T-001)

- **Task**: T-001, iter-016 (BRIEF-016-001); **revize T-002a (BRIEF-016-002a)**
- **Autor**: architect
- **Datum**: 2026-06-14 (revize T-002a 2026-06-14)
- **Milník**: M7a (AI svět: zóny + frakční AI + revolty/questy/tribute + jednotky + napojení trhu). Renumbering DR-013-00 (M7a = iter-016). **Tento design po revizi T-002a pokrývá pouze M7a-1 (iter-016 = T1 zone tick + T4 jednotky + T5 market.inject); M7a-2 (T2/T3/T6) je odložen do iter-017 — viz §16.**
- **PLATNÝ DOKUMENT**: tento soubor (`design_iter-016_T-001.md`) — revidován in-place, žádný nový doc.

---

## Changelog — Revize T-002a (2026-06-14)

Revize zapracovává **2 major podmínky** z reviewer gate (review_design_iter-016_T-002, GO-s-podmínkami) a **zužuje scope na M7a-1** (DR-016-01). Ověřeno proti kódu (createInitialState.js, createHomeState.js, load.js, calendar.js, balance.js, world.js originál).

- **M-1 (round-robin day-edge correctness) — VYŘEŠENO** (§2.1): původní `if (curStep % dist === 0)` (převzato z originálu per-step, world.js ř.580–591) je na day-edge mrtvý (`900 % 347 ≠ 0` nikdy → `processZone` se nikdy nespustí → zónová ekonomika tichý no-op). **Přepočítáno na day-index round-robin** přes monotónní `season._absDay` (existuje, calendar.js:53, persistovaný). Přesný vzorec viz §2.1 — deterministický, bezstavový, přežije save/load.
- **M-2 (re-hydratace zón, DR-012-02 třída) — VYŘEŠENO** (§8, nová §8.1): (a) `createWorldState()` MUSÍ init `world.zones`+`world.factions` z katalogu (dnes chybí, createInitialState.js:18-49); (b) load **id-based merge** zón (ne generický `Object.assign` na pole — load.js:214-227); (c) sdílená `hydrateZones(state)` fn volaná z **load i createInitialState** (žádná load-only větev, M5-R1 gate, load.js:281-285) + povinný **fresh-vs-load hashState test**. Jasně oddělen PERSISTOVANÝ dynamický stav vs RE-HYDROVANÁ statika z katalogu.
- **Tribute split — UJASNĚNO** (§4.4 + §2.2): v M7a-1 se tribute jen **akumuluje** do `zone.resources` (uvnitř `processZone`); výběr/distribuce přes month-edge `gatherTributes` je **M7a-2**.
- **Scope zúžen na M7a-1**: §3 (T2 frakční automat), §4.1–4.4 (T3 revolty/questy/tribute výběr/AI-AI bitvy) a T6 UI jsou označeny `[M7a-2 — ODLOŽENO]` a shrnuty v nové **§16 "Odloženo na M7a-2/iter-017"**. M7a-1 = §2 (T1), §5 (T4), §6 (T5), §7, §8/§8.1, §9.
- Minor zapracovány: m-1 (gatherTributes = periodikum, ne schedule — §4.4, ale celé M7a-2), m-2 (idempotentní self-rearm guard — M7a-2 §3.4). Nity n-1 (AISTATES state 7 provenance z kódu ř.767/851 — §9), n-3 (orig bugy) potvrzeny.

> **Scope OUT revize**: žádný kód; žádná změna architektury iter-002; battle.js NEDOTČEN. Kapitoly §3/§4 frakčního automatu/revolt zůstávají v dokumentu jako **podklad pro iter-017** (designuje architekt v M7a-2), ale **nejsou součástí M7a-1 acceptance**.

---
- **Vstupy**: architektura iter-002 §8.2 (zone tick), §8 (kontrakty/world), §9.1 (D9 trh), §9.4 (R4/D12), K8/K16/K17; master plán §3/iter-014(M7a) T1–T6, §1.2 (komplexita), split-trigger; DR-013-00; originál `doc/original_source/modules/prosperity/services/world.js` (zdroj pravdy mechanik); kód `src/core/systems/world.js` (stub), `market.js`, `upkeep.js`, `scheduler.js`, `rng.js`, `tickOrder.js`, `persistSchema.js`, `contracts.js` (vzor schedule+RNG+seq), `balance.js`, `zones.json`, `military.json`.
- **Scope OUT**: žádný kód; battle automat = M7b/iter-017 (NEsahat `battle.js`/`battleTick`); žádná změna architektury iter-002 ani kontraktů §8 signatur (změna = decision record).

> **Zdroj pravdy mechanik = originál `world.js`.** Kde se design odchyluje (RNG izolace, schedule namísto `Engine.insert`, plain-data stav), je odchylka vždy uvedena s důvodem (determinismus/catch-up-safe) a označena gapem. Balanc čísla → `balance.js` s odkazem na řádek originálu, nikdy inline.

---

## 0. Shrnutí rozhodnutí (TL;DR pro Sonnet + orchestrátora)

| # | Rozhodnutí | Hodnota |
|---|---|---|
| **D-SPLIT** | **SPLIT M7a-1 / M7a-2 = ANO** | M7a-1 (iter-016a): T1 zone tick + T4 jednotky + T5 napojení trhu. M7a-2 (iter-016b): T2 frakční automat + T3 revolty/questy/tribute/AI-AI bitvy + T6 UI. Odůvodnění §1. |
| D1 | Zone tick tvar | `worldTick(state,{},ctx)` (už registrován, day order 30) → uvnitř round-robin výběr 1 zóny per dist-krok přes 5denní periodu → `processZone(state, zoneId, rng)` čistá nad `state.world.zones`. RNG `makeRng(state,'world')`. §2. |
| D2 | Frakční automat | AISTATES 0–7 **jako data** (`zones.json.aiStates` přechodová tabulka) + deterministická přechodová fn `processAI(state, factionId, rng)`. Plánování útoků/varování přes **schedule one-shot** (string-ID + index K17), ne `Engine.insert`. Aktivační prahy z `balance.world`. §3. |
| D3 | Revolty/questy/tribute | Revolty na zone ticku (favour vzorce, §4.1). Questy generované deterministicky (`questSeq`, RNG world), oceňování přes `getGoldValue`. Tribute měsíčně (`gatherTributes`, month edge). AI-AI bitvy = **RNG resolve vzorcem** v `processAI` state 6 (NE battle automat). §4. |
| D4 | Jednotky | Hráčovy jednotky už existují (`player.totWarriors/totArchers`, upkeep běží). M7a-1 přidá `recruitUnit` command (rekrutace za gold z `military.json`) + `homeZone` jako hráčova zóna ve `world.zones`. Upkeep beze změny (`upkeep.military` už měsíční). Zónové jednotky (`warriors/archers` per zóna) v persist. §5. |
| D5 | Napojení trhu | Produkční zóny (`originalLiege == liege`, policy resource) → konverze resources na gold přes `getGoldValue` (originál ř.193) + `marketInject` produkovaného zboží do tržní nabídky; válčící zóny `marketInject(-qty)`. Kontrakt §8.2 beze změny signatur `marketInject(state, goodsId, qty)`. §6. |
| D6 | Determinismus / catch-up-safe | Veškerý RNG přes `makeRng(state,'world')` (stream existuje, rng.js:10). Žádný `Math.random`/`Date.now`. Schedule one-shot serializovatelný (přežije save/load). Round-robin index = funkce `curStep` (bezstavový). §7. |
| D7 | G-LISTZONE | `zones.json` `zones[]`/`aiStates[]` prázdné → **approximovaná min. hratelná sada** (~10–13 zón + 4 capital zóny + AISTATES 0–7 tabulka), `provenance:'approximated'`, odvozeno z originálu. Eskalace ne (DR Q3 autonomně). §9. |
| D8 | Persist | `world.zones` (pole serializovatelných zón) + `world.factions` (frakční stav vč. `state` 0–7) do `PERSIST_SCHEMA.world` (klíče už allowlistované, jen se naplní). `questSeq`/scheduleCount už pokryté. Derivovaná data (militaryRating/economicRating) se **neukládají** — re-derivace. §8. |

---

## 1. SPLIT M7a-1 / M7a-2 — ROZHODNUTÍ: **ANO** (povinné rozhodnutí)

**Doporučuji split** dle split-triggeru master plánu §3/iter-014 pozn. + §A3:

| Část | Iterace | Tasky | Komplexita | Hratelný výsledek |
|---|---|---|---|---|
| **M7a-1** | iter-016a | **T1** zone tick (L) + **T4** jednotky (M) + **T5** napojení trhu (S) | 1×L + 1×M + 1×S | Zóny tikají (ekonomika/politika round-robin), produkční zóny krmí trh `marketInject`, hráč rekrutuje jednotky, tribute běží. Hratelné přes commandy/testy bez frakční AI. |
| **M7a-2** | iter-016b | **T2** frakční automat (L) + **T3** revolty/questy/tribute/AI-AI bitvy (M) + **T6** UI (M) | 1×L + 2×M | Frakce mění politiky/útočí (AISTATES), revolty/questy/AI-AI bitvy, world/zones screen. DoD M7a se vyhodnotí po M7a-2. |

### 1.1 Odůvodnění (kritéria §1.2)
1. **Dva nezávislé L celky.** T1 (zone tick: per-zóna ekonomika/politika, ~250 řádků originálu `processZone`) a T2 (frakční automat: `processAI` 7-stavový automat + `redistributeForces` + `findNeighboursOf` + AI-AI bitvy, ~270 řádků originálu) jsou **architektonicky oddělené**: T1 zpracovává *jednu zónu* (mikro), T2 zpracovává *jednu frakci napříč zónami* (makro). Master plán je explicitně označuje jako „dva nezávislé L celky".
2. **Direkce závislosti je jednosměrná.** T2 čte zónová data (`liege`, `warriors`, `militaryRating`), která T1 udržuje; T1 nepotřebuje T2 (zóny tikají i bez frakční AI — jen se nemění lieges). → M7a-1 je samostatně hratelné a testovatelné (precedent: M5-1 hratelné bez M5-2, DR-013-01).
3. **Sonnet-velikost (§1.2).** L task vyžaduje dekompozici na Sonnet-kroky. T1 i T2 jsou každý sám o sobě plný design + ~4–6 sub-kroků. Jedna iterace se 2×L + 3×M (T3/T5/T6) by přesáhla jeden Sonnet průchod a riskovala nedotažení (LL: příliš velký task se dělí, neponechává).
4. **Riziko izolace.** Frakční automat (T2) je nejrizikovější — 7-stavový automat s AI-AI bitvami, replay-determinismem a schedule plánováním. Izolace do M7a-2 dovolí samostatný review/test loop (AI replay test, §1.3 master plánu) bez svázání se zónovou ekonomikou.
5. **Kontrakt trhu (T5).** T5 patří do M7a-1, protože napojuje *zónovou ekonomiku* (T1) na trh — uzavírá negativní test S-06 → pozitivní kontrakt v rámci infrastruktury. Nepotřebuje frakční AI.

**Alternativa (zamítnutá): NE-split, vše v iter-016.** Zamítnuto: 2×L + 3×M je nad kapacitou jednoho Sonnet průchodu (§1.2/A3); review jednoho velkého celku by smísil zónový determinismus s AI replay-determinismem a ztížil lokalizaci nálezů. Split nemá architektonickou cenu (žádné zdvojení wiring — `world.zones`/`world.factions`/persist zavedeny už v M7a-1, M7a-2 jen čte a mutuje `liege`/`state`).

**Alternativa (zamítnutá): split T1/T2 ale UI (T6) do M7a-1.** Zamítnuto: UI mapy zón má smysl až s frakční dynamikou (jinak statická mapa); master plán řadí T6 do M7a-2.

> **Orchestrátor**: M7a-1 a M7a-2 jsou dvě iterace na lineární kritické cestě (M7a-1 → M7a-2 → M7b). DoD M7a se vyhodnotí po M7a-2 (split-trigger). Downstream (M7b/iter-017 …) se neposouvá — split je uvnitř milníkové dvojice M7.

---

## 2. T1 — Zone tick (§8.2, K16) [M7a-1]

### 2.1 Tvar a vstup [M7a-1]
- `worldTick` (už registrován `world.tick`, day edge, **order 30**, tickOrder.js:204) přestane být no-op. **Tvar volání beze změny** — `worldTick(state, {}, ctx)`. RNG: `const rng = makeRng(state, 'world')` (stream existuje, rng.js:10).

#### M-1 OPRAVA — round-robin na DAY-INDEX (ne `curStep % dist`)

**Problém (M-1, reviewer T-002, correctness):** `worldTick` je **day-edge periodikum** (order 30), takže na day-edge je `curStep` vždy násobek `STEPSPERDAY=900` (balance.js:14). Originálové `if (curStep % dist === 0)` (world.js ř.584) běží v originále **per-step** (`World.step`), kde `curStep` nabývá všech hodnot. Na day-edge s `period=4500`, `dist=ceil(4500/zones.length)`: pro ~13 zón `dist=347`, a `900 % 347 = 206`, `1800 % 347 = 66`, … — **nikdy 0** → `processZone` se prakticky nikdy nespustí → **zónová ekonomika tichý no-op** (S-05/catch-up test by „prošel", protože se nic neděje). Gap G-WORLD-DAYEDGE byl tedy podceněn (ne „řidší", ale ~0 zón).

**Řešení — round-robin přes day-index pomocí monotónního `season._absDay`:**
`worldTick` neoperuje na `curStep`, ale na **počtu dní**. V kódu už existuje **monotónní absolutní denní čítač** `state.season._absDay` (calendar.js:53, inkrementovaný v `advanceDay`, persistovaný v PERSIST_SCHEMA.season). Použij ho jako day-index — je deterministický, bezstavový vůči world doméně a přežije save/load.

```js
// uvnitř worldTick (day edge, order 30):
const zones = state.world.zones;
const len = zones.length;
if (len > 0) {
  const day        = state.season._absDay;                      // monotónní day-index (calendar.js:53)
  const PERIOD_DAYS = BALANCE.world.zonePeriodDays;             // = 5 (orig "period = STEPSPERDAY*5")
  const slot       = Math.max(1, Math.ceil(PERIOD_DAYS / len)); // daysPerZoneSlot; ≥1 day per slot
  if (day % slot === 0) {                                        // gating na den, ne na curStep
    const zoneIndex = Math.floor(day / slot) % len;             // round-robin index
    processZone(state, zones[zoneIndex].id, rng);
  }
}
```

- **Přesný vzorec (kanonický, pro coder + AC):**
  - `daysPerZoneSlot = max(1, ceil(zonePeriodDays / zones.length))` (=`slot`)
  - **gate**: `processZone` se spustí v den `day`, právě když `day % daysPerZoneSlot === 0`
  - `zoneIndex = floor(day / daysPerZoneSlot) % zones.length`
  - kde `day = state.season._absDay`, `zonePeriodDays = BALANCE.world.zonePeriodDays = 5`.
- **Pokrytí periody (AC-test):** Pro `zones.length ≥ zonePeriodDays` (typicky 13 ≥ 5) je `slot=1` → **každý den se zpracuje právě 1 zóna**, takže za `zones.length` dní (≤ ~13 dní) projdou **všechny zóny** (`day mod len` cykluje přes 0..len-1). Záměr „každých ~5 dní jiná zóna a za periodu všechny" je splněn s rezervou (ještě hustěji než 5 dní, protože zón je víc než 5). Pro `zones.length < zonePeriodDays` (degenerovaný malý katalog) je `slot>1` → zpracování řidší, ale stále round-robin přes všechny zóny za `slot*len ≤ zonePeriodDays + len` dní. **AC assertion: „za `daysPerZoneSlot * zones.length` dní se každá zóna zpracuje ≥1×"** (pro slot=1 ⇒ za `len` dní).
- **Determinismus / bezstavovost:** `zoneIndex` je čistá funkce `_absDay` a `zones.length` — **žádný kurzor v `state.world`**. `_absDay` je už persistovaný (season) a inkrementuje se deterministicky → **přežije save/load triviálně** (load→pokračování = bit-identické). Catch-up-safe: O(1) per worldTick, max 1 zóna/den.
- **Balance:** nová konstanta `BALANCE.world.zonePeriodDays = 5` (orig „period = STEPSPERDAY * 5", world.js ř.580; `provenance:'extracted'`). Nahrazuje krokovou `period/dist` aritmetiku — den-based ekvivalent stejného záměru.
- **Gap G-WORLD-DAYEDGE — RESOLVED (M-1):** odchylka od originálu (per-step → day-index round-robin) je teď **funkčně korektní** (zóny se reálně zpracovávají), ne mrtvý no-op. Hustota: 1 zóna/den (vs. orig variabilní per-step) — vědomá odchylka pro catch-up cenu (S-05), kalibrace M9. **Coder**: gating MUSÍ být na `_absDay % slot`, NIKDY `curStep % dist`.

### 2.2 `processZone(state, zoneId, rng)` — čistá fn nad zónou
Pořadí dle originálu ř.33–494 (zdroj pravdy). Vstup `zoneId` (string-ID), čte `state.world.zones[idx]` přes `byId`/lineární find (zóny ~13, O(n) OK). `homeZone` přeskočit (ř.36). Sekce:

1. **Gold ekonomika** (ř.38–39, vzorce do `balance.world`):
   - `goldDemand = BALANCE.world.goldDemandPerUnit (=150) * (warriors + archers)`
   - `goldProduction = BALANCE.world.goldProdPerWorker (=50) * numWorkers`
   - `goldStore` init 0.
2. **Policy switch** (ř.45–213) — 3 větve dle `zone.policy` (mapování ZONEPOLICIES originál ř.8: `resource=0, population/growth=1, military=2`):
   - **policy 1 (growth)**: addedWorkers (`numWorkers>3800 → rng.int(20)`; jinak `~~(numWorkers*0.01+3)`); non-player pod targetWorkerNum/3 → +15; over target → `floor(-20*rng.next())` + (player) notifikace + switch policy 0; clamp `numWorkers≥1`; speciál `hornCastle+thePsychopath` → policy 2 (ř.71–75); tribute akumulace do `resources` (`amount*numWorkers/2`, ř.78–93).
   - **policy 2 (military)**: práh `numWorkers>100` (jinak switch policy 1, ř.171–179); warrior/archerGrowth × liege-multiplikátory (warlord 1.5/1.3, princess 0.6/1.6, psychopath 2/0.5 — `balance.world.factionGrowth`, ř.108–120); `randRound` → **`rng`-based round** (viz §7.3); škálování dle numWorkers (>1600 ×3, >500 ×2, ř.125–134); odečet workerů; **25% chance (`rng.chance(0.25)`) non-player nákup jednotek za gold** (ř.144–155); originalLiege drain (ř.157–164, pozn. originál má bug `zone.archres` — opravit na `archers`, gap G-WORLD-ARCHRES); player → update totMilitary.
   - **policy 0 (resource, default)**: tribute → resources pool (`tribute*numWorkers`, ř.185–190); **`if liege==originalLiege` → konverze resources na gold přes `getGoldValue`** (ř.191–197) — **napojení T5** (§6); worker dynamika dle goldProduction vs goldDemand (`rng.int(20)`); clamp ≥1.
3. **Gold shortage** (ř.216–271): `goldProduction<goldDemand` → diff; `goldStore` drain; eskalace `notEnoughGold` (1→2→3) → player notifikace; >3 → ztráta workerů/jednotek (`rng`-vážená volba worker/warrior/archer, ř.247–264). **Gap G-WORLD-NOTENOUGH**: originál má překlep `notEnoughgold` vs `notEnoughGold` (ř.222 vs 239) — sjednotit na jeden klíč.
4. **Revolt** (ř.283–369) → **T3/M7a-2** (gated `curStep > revoltMechanicStart`). V M7a-1 sekce existuje jako `if (curStep > BALANCE.world.revoltMechanicStart) { /* M7a-2 */ }` — prázdný blok / no-op, naplní M7a-2.
5. **Quest** (ř.372–487) → **T3/M7a-2**.
6. **Ratingy** (ř.490–493): `calcMilitaryRating`/`calcEconomicRating` — **derivované**, počítají se na konci processZone do `zone.militaryRating`/`economicRating`. **NEUKLÁDAT** (re-derivace, §8). `calcEconomicRating` volá `getGoldValue` → napojení trhu (T5).

### 2.3 Balance konstanty (do `balance.world`, s odkazem na originál)
Coder rozšíří `BALANCE.world` (dnes jen aiMechanicStart/revoltMechanicStart). Nové: `goldDemandPerUnit:150` (ř.38), `goldProdPerWorker:50` (ř.39), `growthBasePct:0.01`, `growthBaseAdd:3` (ř.51), `militaryWorkerThreshold:100` (ř.97), `factionGrowth:{theWarlord:{w:1.5,a:1.3}, thePrincess:{w:0.6,a:1.6}, thePsychopath:{w:2,a:0.5}}` (ř.108–120), `aiBuyUnitChance:0.25` (ř.144), `tributeGrowthDivisor:2` (ř.86). Vše `provenance` dle originálu (čísla doložitelná z `world.js`).

---

## 3. T2 — Frakční AI automat (AISTATES 0–7, K17/K16) [M7a-2]

### 3.1 AISTATES jako data
- `zones.json.aiStates` (dnes `[]`) se naplní **přechodovou tabulkou / popisem stavů** (G-LISTZONE, §9). Stavy (originál ř.13–21, 750–758, zdroj pravdy):
  | id | název | význam |
  |---|---|---|
  | 0 | default | rozhodovací stav (vybírá další stav dle ratingů/agrese) |
  | 1 | growPop | capital policy=1, konverze resources na gold (30% rng) → 0 |
  | 2 | growMil | vassal policies=2 (50% rng), weakest-AI bonus → 0 |
  | 3 | growRes | capital policy=0 → 0 |
  | 4 | prepAttack | spy detekce → 5 |
  | 5 | annoAttack | spy detekce → 6 |
  | 6 | attacking | AI-AI bitva RNG resolve / startBattle vůči hráči (M7b) → 0 |
  | 7 | incapacitated | mrtvá frakce, no-op |
- Tabulka = **data** (string-ID + parametry), přechodová fn = deterministický kód (přesně originál `processAI`). Frakce `theWarlord/thePrincess/thePsychopath` + jejich capitals (`dickinsonLanding/castleGrey/hornCastle`, ř.762–766).

### 3.2 Frakční stav v `state.world.factions`
`world.factions` (allowlist už v PERSIST_SCHEMA.world:24) = mapa `{factionId: {state:0..7, wantToAttack, nextTarget, aggression, backstab, allies, capitalId, warriors:{strength,defense}, archers:{strength,defense}}}`. `state` (0–7) **persistovaný** (přežije save/load — replay determinismus). `aggression/backstab/allies` z `zones.json` faction defs (approximováno, §9).

### 3.3 `processAI(state, factionId, rng)` — přechodová fn
Přesně originál `processAI` (ř.743–991), s odchylkami:
- **`Math.random` → `rng` (stream 'world')** všude (ř.771,793,835,859,873,903,952…).
- **`Engine.insert(delay, id, params)` → `scheduleInsert(state, curStep+delay, id, params)`** (K17, serializovatelné):
  - state 4: `warningAIAttacking` (delay 50, spy, ř.923)
  - state 5: `dangerAIAttacking` (delay 50, ř.936)
  - state 6 (vs player): `startBattle` (delay 100, ř.947) — **handler = M7b stub** v M7a-2 (schedule entry se vloží, handler `startBattle` registruje no-op/notifikaci do M7b; NEsahat battle.js). `AIIsAttacking` (delay 0), `takeOver` (delay 400, ř.964).
  - Handlery registrované přes registr efektů (vzor `contracts.js` `registerContractEffects`).
- **`redistributeForces`** (ř.636–742): rng místo Math.random; recall minimum per frakci (warlord 300/150, princess 100/250, psychopath 500/50, ř.686–695 → `balance.world.recallMin`). AI „cheat" +10 % (ř.681–682).
- **`findNeighboursOf`** (ř.993–1016): čistý průchod zón dle `neighbours` (zóny mají `neighbours:[zoneId]` — G-LISTZONE musí dodat topologii).
- State 6 AI-AI bitva = **RNG resolve vzorcem** (§4.3), ne battle automat.

### 3.4 Plánování frakčního ticku přes schedule
- **Frakce se zpracovávají periodicky** — originál nemá explicitní `processAI` scheduling v `step` (volá se z eventů/UI). Zde: nová **schedule self-rearm** smyčka (vzor `contracts.js` generator re-arm): handler `world.processFaction` (params `{factionId}`) → zpracuje frakci, na konci `scheduleInsert(state, curStep + BALANCE.world.aiTurnPeriod, 'world.processFaction', {factionId})`. Perioda = balance (návrh ~5 herních dní = 4500 kroků, `provenance:approximated`, gap G-WORLD-AITURN, kalibrace M9).
- **Gate**: frakční AI aktivní jen `curStep > BALANCE.world.aiMechanicStart` (=567000). Re-arm se nasadí při startu (bootstrap) nebo při překročení prahu. **Catch-up-safe**: schedule one-shoty se vykonají v dávce přesně jako live (K17, serializovatelné).
- **Determinismus pořadí**: 3 frakce → 3 nezávislé schedule self-rearm smyčky se stabilním tie-breakem (`seq`, scheduler.js less()). Pořadí dané `seq` při insertu → deterministické, přežije save/load.

---

## 4. T3 — Revolty + questy + tribute + AI-AI bitvy [M7a-2]

### 4.1 Revolty (zone tick, gated `curStep > revoltMechanicStart`)
Naplní prázdný blok z §2.2.4. Přesně originál ř.283–369:
- Immune kombinace (capital+originalLiege drží, ř.285–288) → skip.
- `liege != originalLiege` → favour drain: `-2` base, policy modifikátory (+1 growth, −4 military, −2 res, ř.300–310), unit-count modifikátory (ř.312–324), regionální bonusy princess/warlord (ř.326–332 — **data z G-LISTZONE**, seznam zón per frakce). `favour < 5` → **revolt**: player → `scheduleInsert(curStep+100,'loadImportantEvent',['vassalRevolted',zoneId])` (ř.336, handler M8 stub — schedule entry validní, notifikace teď); non-player → notifikace; `liege = originalLiege`, `policy = 1`.
- `liege == originalLiege` (neutral) → favour decay k 0 (ř.352–367).
- `fixFavourLimits` (ř.351) — clamp favour, do `balance.world.favourLimits`.

### 4.2 Questy (zone tick, gated, deterministicky)
Originál ř.372–487. **`Math.random` → `rng`**, `createQuest` → deterministické ID `quest_<questSeq>` (monotónní čítač `state.world.questSeq`, vzor `contractSeq`). Typy: `goldSupply`/`foodSupply`/`reinforcement` (originál `questTypes=['soldiers']` aktivní, ř.391). **Oceňování** (req/reward gold) přes `getGoldValue` kde originál používá tržní hodnotu. Quest stav: `zone.curQuest = questId`, `state.world.quests[]` nebo `state.player.quests[]` (sjednotit s M8 story — gap G-WORLD-QUESTSTORE: questy v M7a-2 do `state.world.quests`, M8 napojí na story/UI). `daysRemaining` → **absolutní `deadlineStep`** (catch-up-safe, vzor contracts).

### 4.3 AI-AI bitvy = RNG resolve VZORCEM (NE battle automat)
**Kritické rozlišení M7a vs M7b.** `processAI` state 6, větev `nextTarget.liege != 'player'` (originál ř.948–984, zdroj pravdy):
```
warrResults = max((atk.warriors.str * cap.warriors
                   - (tgt.warriors * dLiege.warriors.str * rng.next()*0.5 + 0.7)) / atk.warriors.str, 0)
archResults = max((atk.archers.str * cap.archers
                   - (tgt.archers * dLiege.archers.str * rng.next()*0.5 + 0.7)) / atk.archers.str, 0)
if warrResults+archResults > 0:  // attacker wins
    cap.warriors = floor(rng.next()*1.4*warrResults); cap.archers = floor(rng.next()*1.4*archResults)
    tgt.archers = floor(rng.next()*0.3*archResults);  tgt.warriors = floor(rng.next()*0.3*warrResults)
    scheduleInsert(curStep+400, 'world.takeOver', [atkId, tgtId])
    if atk==thePsychopath: tgt.warriors += floor(tgt.numWorkers*rng.next()*0.7); tgt.numWorkers=1
else: // attacker loses (ř.974–981)
    ...
redistributeForces(...)
```
- **Vzorce → `formulas.js`** (`aiBattleResolve(...)`) s tabulkovým testem proti originálu (master plán §1.3). **Žádný `battleStep`/`battleState`** — to je §8.1/M7b. AI-vs-hráč (`nextTarget.liege=='player'`) → `scheduleInsert('startBattle')` (handler M7b; v M7a-2 stub).
- **Gap G-AI-BATTLE-FORMULA**: vzorec je 1:1 originál, ale RNG-izolovaný; deterministický replay test povinný.

### 4.4 Tribute (month edge)
`gatherTributes` (originál ř.527–565). Nový periodikum **`world.gatherTributes`, month edge**. Player zóny → `Player.insertInventory` = `grant(state, resources, 'tribute:<zoneId>', ctx)`; AI zóny → capital.resources.gold += `getGoldValue(zone.resources)` (ř.558). `zone.resources = {}` po výběru. Catch-up-safe (deterministické, month edge).

---

## 5. T4 — Jednotky (rekrutace, upkeep, persist) [M7a-1]

### 5.1 Stav (co už existuje)
- **Hráčovy jednotky existují**: `state.player.totWarriors`/`totArchers` (createHomeState.js:71, persist player allowlist persistSchema.js:14). **Upkeep běží** (`upkeep.military`, month order 30, upkeep.js:23, čte totWarriors/totArchers × `balance.army.warriorUpkeep/archerUpkeep`). → **M7a-1 NEpřidává upkeep systém** (hotový M4a).
- **Zónové jednotky**: každá zóna `warriors`/`archers` (číselné) v `world.zones` (persist world allowlist), používané T1/T2.

### 5.2 Rekrutace (nový command)
`recruitUnit({unitId:'warrior'|'archer', count})` — vzor `buyCompany.js`/`build.js`:
- Validace `unitId` proti `military.json` (`byId`), `count>0`.
- Cost = `byId(unitId).goldCost × count` (warrior 1080, archer 1620, military.json). `canAfford({gold})` → `pay(state,{gold:cost},'recruit:<unitId>',ctx,curStep)` → `player.totWarriors += count` (nebo totArchers).
- **Gap G-RECRUIT-TXAUDIT**: command bez `ctx` → pay bez emitTx (třída G-BUILD-TXAUDIT, DR-013-01 M-4) — akceptováno, audit M9. (Pokud command dostává ctx, použít.)
- **homeZone** = hráčova zóna ve `world.zones` (`liege:'player'`, `id:'homeZone'`), jednotky hráče se zrcadlí (originál `updateTotalMilitaryUnits`, ř.169). M7a-1: `homeZone.warriors/archers` ↔ `player.totWarriors/totArchers` sync (jeden zdroj pravdy = `player.tot*`; homeZone derivuje, NEUKLÁDAT homeZone units zvlášť — gap G-HOMEZONE-MIRROR).

### 5.3 Balance
`military.json` doložitelné (extracted). `balance.army` má warriorCost/archerCost/upkeep (balance.js:106–114) — reuse, žádné nové konstanty. Unit strength/defense (pro ratingy/bitvy) → `zones.json` faction defs nebo `military.json` rozšíření (G-LISTZONE/G-MILITARY-STATS approximováno, kalibrace M9).

---

## 6. T5 — Napojení trhu na zóny (kontrakt §8.2) [M7a-1]

### 6.1 Kontrakt (BEZE ZMĚNY signatur)
`marketInject(state, goodsId, qty)` (market.js:103) + `getGoldValue(state, basket)` (market.js:91) — **existují, signatury se nemění** (acceptance: kontrakt §8.2 naplněn, reviewer gate). Negativní test S-06 (stub world nevolá oceňování) → **pozitivní kontrakt** (world teď legitimně volá).

### 6.2 Produkční zóny → trh (inject)
- **Konverze resources na gold** (processZone policy 0, originál ř.191–197): `getGoldValue(state, zone.resources)` — již napojení (T1 §2.2.2c).
- **Inject produkce**: produkční zóny (policy resource, `liege==originalLiege`) injektují vyrobené zboží do tržní nabídky: pro každý `goodsId` v `zone.resources` → `marketInject(state, goodsId, +producedQty)`. Zvyšuje `available` → tlačí cenu dolů (více nabídky). Čte se po tribute akumulaci.
- **Válčící zóny odčerpávají**: zóna ve válce (`liege != originalLiege`, nebo frakce ve state 6 spotřebovává) → `marketInject(state, goodsId, -consumedQty)` (snižuje nabídku, tlačí cenu nahoru). Vzorec spotřeby (~`units × rate`) → `balance.world.warConsumption`, approximováno.
- **Gap G-WORLD-INJECT-QTY**: konkrétní inject množství nejsou v originálu (server-side) → approximováno (`provenance`), kalibrace M9. Clamp `[0,max]` zajišťuje `marketInject` interně (market.js:107) — bezpečné.

### 6.3 Pořadí (catch-up-safe)
worldTick (day order 30) běží **před** market.drift (day order 35, tickOrder.js:205). → inject ze zón se aplikuje, pak drift mean-reversion → konzistentní s architekturou (drift „dorovnává" zónové injekce směrem k baseline). **Bez změny tickOrder** (order 30 vs 35 už správně).

---

## 7. Determinismus & catch-up-safe (KRITICKÉ — D6)

### 7.1 RNG izolace
- **Veškerý náhodný výběr přes `makeRng(state,'world')`** (stream 'world' existuje, rng.js:10). Žádný `Math.random` (originál ho používá masivně — všechna volání se nahrazují). Žádný `Date.now`. Grep gate (master plán §1.3) hlídá v core.
- `processZone`, `processAI`, questy, AI-AI bitvy, redistributeForces — všechny dostávají/používají **jeden** `world` rng (čtený ze `state.rng.streams.world`, zapisovaný zpět → serializovatelný, přežije save/load).
- **Stream battle se v M7a NEdotýká** (AI-AI bitvy jdou přes 'world'; 'battle' stream rezervován pro battle automat M7b). Pořadí streamů v STREAM_NAMES beze změny (rng.js:10) — **žádný nový stream** (acceptance: rng 'world' izolovaný).

### 7.2 Schedule serializovatelný
- Frakční tahy, varování (warning/dangerAIAttacking), AI útoky (startBattle/takeOver/AIIsAttacking), revolt eventy, quest deadlines → **schedule one-shot** (`scheduleInsert`, K17). Entries plain-data (`{step,id,params,seq}`) — přežijí save/load (persistSchema engine.schedule/scheduleCount uloženy, persistSchema.js:66–67). **Žádný `Engine.insert`** (originál) — nahradit `scheduleInsert(state, curStep+delay, id, params)`.
- Handlery registrované přes registr efektů (vzor `registerContractEffects`, contracts.js) — string-ID, idempotentní registrace v `registerCorePeriodics`.

### 7.3 Round / randRound
- Originál `$rootScope.fns.randRound(x)` (stochastické zaokrouhlení) → deterministická varianta `randRound(x, rng)` ve `formulas.js`: `floor(x) + (rng.next() < frac(x) ? 1 : 0)`. Tabulkový test.

### 7.4 Catch-up-safe invariant (S-05)
- worldTick O(1) per tick (max 1 zóna/den round-robin). processFaction periodicky přes schedule (řídké). gatherTributes month. **Žádné O(n²)**, žádné alokace v hot-path (zóny ~13). AI svět běží v offline dávce **identicky** jako live (vše deterministické, schedule-driven). Acceptance: „AI svět běží v dávce".
- **Replay test** (master plán §1.3/iter-014): `hash(simulate(seed, N))` stabilní s aktivním AI světem; zone round-robin + frakční state přežije save/load uprostřed (load→pokračování = bit-identické).

### 7.5 Bezstavový round-robin (M-1 opraveno)
`zoneIndex = floor(_absDay / daysPerZoneSlot) % zones.length` (§2.1) — **žádný kurzor v `state.world`**, gating na `_absDay` (persistovaný monotónní day-index, calendar.js:53). Save/load triviálně deterministický (na rozdíl od uloženého kurzoru, který by mohl driftovat). Při změně `zones.length` (revolt/takeover v M7a-2 nemění počet zón, jen liege) zůstává stabilní. **Pozn.**: původní `curStep % dist` (M-1) byl na day-edge mrtvý — viz §2.1.

---

## 8. Persist schéma (D8 — co se ukládá / co derivuje)

`PERSIST_SCHEMA.world` (persistSchema.js:24) už allowlistuje `'zones','factions'` (legacy M7 placeholdery) — **jen se naplní obsahem**, žádná změna allowlistu nutná. world průchod (persistSchema.js:236–243) je generický.

| Doména | UKLÁDAT | NEUKLÁDAT (derivace) |
|---|---|---|
| `world.zones[]` | `id, liege, originalLiege, policy, numWorkers, warriors, archers, targetWorkerNum, resources, tribute, goldStore, favour, notEnoughGold, curQuest, neighbours, warriorGrowth, archerGrowth, immunity` | `goldDemand`, `goldProduction` (re-derivace v processZone), `militaryRating`, `economicRating` (calc fns) |
| `world.factions{}` | `state (0–7), wantToAttack, nextTarget, aggression, backstab, allies, capitalId, warriors/archers stats` | — |
| `world.questSeq` | ano (monotónní čítač) | — |
| `world.quests[]` | `id, from, type, req, reward, deadlineStep, title` | `daysLeft`, `canComplete` (selektory) |
| player units | `totWarriors/totArchers` (už persistováno player allowlist) | `homeZone.warriors/archers` (zrcadlí player.tot*, G-HOMEZONE-MIRROR) |

- **`neighbours` (topologie zón)** je **statická data z katalogu** (`zones.json`), ne herní stav — ale ukládá se v zone objektu pro jednoduchost (alt: re-hydratace z katalogu na load). **Doporučení**: topologie/originalLiege/targetWorkerNum/warriorGrowth re-hydratovat z `zones.json` na load (čistá konstrukce §6.4), ukládat jen **mutovatelný stav** (liege, policy, numWorkers, warriors, archers, resources, tribute, favour, goldStore, notEnoughGold, curQuest). **Gap G-WORLD-ZONEHYDRATE**: rozhodnuto re-hydratovat statiku z katalogu (menší save, žádný drift) — coder M7a-1 dodá load-step merge katalog+save (vzor: buildings re-derivace).
- **Migrace**: SAVE_VERSION — zóny dnes prázdné (`zones:[]`), naplnění = aditivní; load starého savu (prázdné zóny) → init z katalogu. **Žádná destruktivní migrace** (undefined-guard, vzor M6-D11). Coder ověří fresh-vs-load determinismus (třída DR-012-02): `createInitialState` musí inicializovat `world.zones`/`world.factions` ze stejného katalogu jako load → `hashState` shoda. **Plný kontrakt re-hydratace viz §8.1.**

---

## 8.1 M-2 OPRAVA — re-hydratace zón: sdílená `hydrateZones`, id-based merge, fresh-init (DR-012-02 třída) [M7a-1]

**Problém (M-2, reviewer T-002, DR-012-02 třída):** tři kódové díry, každá sama o sobě může způsobit fresh-vs-load drift:
1. `createWorldState()` (createInitialState.js:18-49) **NEinicializuje** `world.zones`/`world.factions` (domény jen forest/field/mine/marketState/caravan) → fresh state má `zones=undefined`, load má data ⇒ asymetrie.
2. Load world-merge je generický `Object.assign` na pole (load.js:217-226, ověřeno: `Object.assign(state.world[field], payload.world[field])` pro objekty) — na **pole `zones[]`** to kopíruje **po indexu**; je-li uložené pole kratší / jiného pořadí než fresh re-hydrované, vznikne **stale tail / mismatch index↔id**.
3. Žádná garance „no load-only branch" (M5-R1 gate, load.js:281-285: *"MUST call the SAME fn as mutations — no load-only derivation branch"*) pro zóny.

### 8.1.a Oddělení PERSISTOVANÝ dynamický stav vs RE-HYDROVANÁ statika z katalogu (kanonické)

| | UKLÁDÁ SE do save (per zone, **dynamický mutovatelný** stav) | RE-HYDRUJE SE z `zones.json` katalogu (**statika**, NEukládá se) |
|---|---|---|
| **zóna** | `liege, policy, numWorkers, warriors, archers, resources, tribute, favour, goldStore, notEnoughGold, curQuest` | `id, name, originalLiege, capital/capitalId, topology (neighbours), targetWorkerNum, warriorGrowth, archerGrowth, immunity, base unit stats` |
| **frakce** | `state(0–7), wantToAttack, nextTarget, allies (mutovatelné)` | `id, name, capitalId, aggression, backstab, recallMin, base unit stats` |
| player | `player.totWarriors/totArchers` (už player allowlist) | `homeZone` static (id/liege='player'); `homeZone.warriors/archers` = mirror player.tot* (NEukládat, G-HOMEZONE-MIRROR) |

> **`id` je primární klíč** — merge dynamiky a statiky probíhá **podle `id`**, nikdy podle indexu pole. `id` se nemění revoltem/takeoverem (mění se jen `liege`/`state`), takže párování je stabilní napříč M7a-2.

### 8.1.b Sdílená `hydrateZones(state)` — JEDINÁ cesta (fresh i load)

Nová čistá fn `hydrateZones(state)` (modul world systému), volaná z **createInitialState i load** — **žádná load-only větev** (M5-R1 gate, vzor `rebuildBuildingDerived`). Kontrakt:

```js
// hydrateZones(state): re-hydruje statiku zón/frakcí z katalogu a NAMERGUJE dynamiku per-id.
// Idempotentní. Volaná z createWorldState (fresh) i load Step 5 (po applyPayload).
export function hydrateZones(state) {
  const catalog = getZonesCatalog();                 // zones.json (CATALOG_NAMES, §9)
  const savedZones = state.world.zones || [];        // fresh: [] ; load: applyPayload naplnil dynamiku
  const byId = new Map(savedZones.map(z => [z.id, z]));
  // Re-hydratace statiky z katalogu + merge uloženého dynamického stavu PER ID:
  state.world.zones = catalog.zones.map(def => {
    const saved = byId.get(def.id);                  // může být undefined (fresh / nová zóna v katalogu)
    return {
      // STATIKA z katalogu (vždy z def, přepisuje stale save):
      id: def.id, name: def.name, originalLiege: def.originalLiege,
      neighbours: def.neighbours, targetWorkerNum: def.targetWorkerNum,
      warriorGrowth: def.warriorGrowth, archerGrowth: def.archerGrowth,
      immunity: def.immunity,
      // DYNAMIKA: ze save, jinak default z katalogu (fresh start values):
      liege:       saved?.liege       ?? def.liege,
      policy:      saved?.policy      ?? def.policy,
      numWorkers:  saved?.numWorkers  ?? def.numWorkers,
      warriors:    saved?.warriors    ?? def.warriors,
      archers:     saved?.archers     ?? def.archers,
      resources:   saved?.resources   ?? {},
      tribute:     saved?.tribute     ?? def.tribute ?? {},
      favour:      saved?.favour      ?? def.favour ?? 0,
      goldStore:   saved?.goldStore   ?? 0,
      notEnoughGold: saved?.notEnoughGold ?? 0,
      curQuest:    saved?.curQuest    ?? null,
    };
  });
  // factions: identicky id-based (statika z katalogu, dynamika {state,wantToAttack,nextTarget,allies} ze save)
  hydrateFactions(state, catalog);
}
```

- **id-based merge** (NE `Object.assign` na pole): `catalog.zones.map` produkuje pole **v pořadí katalogu**, dynamika se páruje přes `byId.get(def.id)`. Stale tail (zóna v save, co už není v katalogu) se **zahodí**; nová zóna v katalogu (není v save) dostane fresh defaulty. Žádný index-mismatch.
- **Pořadí v load**: `applyPayload` (Step 4) zatím nechá `state.world.zones` = raw payload (dynamika); pak **Step 5 zavolá `hydrateZones(state)`** (vedle `rebuildBuildingDerived`/`deriveWorkforceTotal`), který přepíše statiku z katalogu a přerovná pole podle katalogu po `id`. **load.js musí pro `zones`/`factions` přeskočit generický `Object.assign`-merge** (řádek 217-226) a nechat re-konstrukci na `hydrateZones` — jinak by `Object.assign` na pole zavedl stale tail dřív, než `hydrateZones` přerovná. Doporučení coderovi: vyjmout `zones`/`factions` z generické world-merge smyčky (nebo merge přeskočit pro pole) a hydratovat výhradně přes `hydrateZones`.
- **fresh cesta**: `createWorldState()` musí `world.zones=[]`, `world.factions={}` inicializovat (aby klíče existovaly), a `createInitialState` zavolat `hydrateZones(state)` **stejně jako load** (vedle `rebuildBuildingDerived`, ř.133). Tím fresh prochází identickou konstrukcí jako load (M5-R1 symetrie). Fresh `savedZones=[]` ⇒ všechny zóny dostanou katalogové defaulty.

### 8.1.c Fresh-vs-load determinismus test (POVINNÝ, acceptance-blokující M7a-1)

- **Test**: `hashState(createInitialState(seed))` == `hashState(loadAndReconstruct(save(createInitialState(seed))))` — bit-identický (třída DR-012-02, precedent buildings/workforce). Naplněné `world.zones`/`world.factions` se musí shodovat (pořadí podle katalogu, statika z katalogu, dynamika ze save).
- **Round-trip test**: simuluj N kroků s aktivními zónami → save → load → pokračuj M kroků; hash == nepřerušený běh (round-robin přes `_absDay` + hydrateZones determinismus).
- **Reviewer-gate položka**: žádná load-only derivační větev pro zóny/frakce; `hydrateZones` je jediná cesta (fresh i load), vzor `rebuildBuildingDerived` (load.js:281-285).

### 8.1.d Dekompozice (doplnění §14 T1)
- T1-5 rozšířen: `createWorldState()` init `world.zones=[]`/`world.factions={}` + `createInitialState` volá `hydrateZones` (vedle rebuildBuildingDerived).
- T1-6 rozšířen: load Step 5 volá `hydrateZones` (po applyPayload); load `zones`/`factions` vyjmuty z generického `Object.assign`-merge; **fresh-vs-load hashState test** + round-trip save/load test.

> **Gap G-WORLD-ZONEHYDRATE — RESOLVED (M-2):** re-hydratace přes sdílenou `hydrateZones` (id-based), persist jen dynamiky, fresh==load symetrie, povinný hashState test. RW-7 mitigace dotažena.

---

## 9. G-LISTZONE postup (D7 — povinné rozhodnutí)

**Problém**: `zones.json` má `zones:[]` a `aiStates:[]` prázdné (`_meta.notes:"listZone not fully extracted; gap G-LISTZONE"`, `provenance:'approximated'`). Min. hratelná sada chybí.

**Postup (autonomně, DR Q3 — bez eskalace blokeru)**:
1. **AISTATES 0–7 tabulka** (`zones.json.aiStates`): doplnit z originálu `world.js` ř.13–21 + 750–758 (DOLOŽITELNÉ — stavy jsou ve zdroji). Tvar: `[{id:0,key:'default',...},…,{id:7,key:'incapacitated'}]` + přechodová pravidla (§3.1). `provenance:'extracted'` (z originálu).
2. **Frakce defs** (`zones.json.factions` → rozšířit ze stringů na objekty): `{id, name, capitalId, aggression, backstab, allies, recallMin:{w,a}, unitStats:{warriors:{strength,defense},archers:{...}}}`. Capitals DOLOŽITELNÉ (ř.762–766: dickinsonLanding/castleGrey/hornCastle). aggression/backstab/allies/unitStats **approximováno** (originál je čte z runtime config nedostupného v dumpu) — `provenance:'approximated'`.
3. **Min. sada zón** (`zones.json.zones`): ~10–13 zón. Doložitelné z originálu (názvy zón v revolt/regionálních blocích ř.285–332): `hornCastle, dickinsonLanding, castleGrey` (capitals), `winisk, burwash, corbyville, lemieux, kitsilano` (princess region ř.326), `pointAnne, redWater, tomiko, silverInslet` (warlord region ř.330) + `homeZone` (hráč). Každá zóna: `{id, name, originalLiege, liege, policy, numWorkers, targetWorkerNum, warriors, archers, warriorGrowth, archerGrowth, neighbours:[zoneId], resources:{}, tribute:{}, immunity, provenance:'approximated'}`. Topologie `neighbours` approximovaná (sousednosti nejsou ve zdroji) — vytvořit souvislý graf (každá zóna 2–4 sousedi, capitals propojené přes vassaly).
4. **`_meta`**: `provenance:'approximated'`, `notes:'G-LISTZONE resolved by approximation from world.js; calibration M9'`, `source:'doc/original_source/modules/prosperity/services/world.js'`. Per-zóna `provenance` flag.
5. **Schema validace** (master plán M1/K15): nový `zones` schema (factions/policies/aiStates/zones tvar) + runtime validátor při loadu (fail-fast string-ID kolize K10). Přidat `zones` do CATALOG_NAMES/ID_CATALOGS (vzor M6 G-LISTTECHS wiring).
6. **Gap-report**: G-LISTZONE **resolved approximací**, žádný blocker, žádná eskalace uživateli (DR Q3 autonomně). Decision record při materiální díře — zde aproximace stačí (hratelná sada), kalibrace M9.

**Provenance shrnutí**: AISTATES + capitals + faction names + vzorce = **extracted/doložitelné** (z originálu). Topologie + targetWorkerNum + unit growth/stats + aggression/backstab = **approximated** (server/runtime data mimo dump).

---

## 10. tickOrder dopady + diagram

### 10.1 Změny v `tickOrder.js`
- **`world.tick`** (day order 30) — **beze změny pozice**, jen přestane být no-op (naplní worldTick logiku). Pořadí vůči `market.drift` (day 35) zachováno → inject před driftem (§6.3).
- **Nové periodikum** `world.gatherTributes` (month edge, **order 25** — před upkeep.military order 30, aby tribute příjem předcházel upkeep platbě). Registrovat + přidat do periodics[].
- **Schedule handlery** (registr efektů, idempotentní v `registerCorePeriodics` jako `registerWorldEffects`): `world.processFaction`, `world.takeOver`, `world.gatherTributes` (i jako one-shot), `AIIsAttacking`, `warningAIAttacking`, `dangerAIAttacking`, `startBattle` (M7b stub), `loadImportantEvent` (M8 stub). **M7a-1** registruje jen zónové (žádné, zone tick je periodikum); **M7a-2** registruje frakční handlery.
- **TICK_ORDER konstanta** (tickOrder.js:45) beze změny (fáze stejné).
- **Living artifact** `tickOrder.md` + ASCII diagram (§3.5/N-04): aktualizovat ve stejném commitu (reviewer gate).

### 10.2 ASCII diagram (day edge, relevantní výřez)
```
DAY EDGE (po quarterDay/noon):
  workerEfficiency.daily (5)
  food.meal1 (10)
  housing.settlementLevel (20)
  world.tick (30) ──────────────┐  M7a: round-robin processZone(1 zóna/den)
       │  policy switch (eco/pol)│    ├─ getGoldValue (resource policy konverze)  ── T5
       │  revolt/quest gated      │    └─ marketInject(+/−) produkce/válka          ── T5
       ▼                          │
  market.drift (35) ◄─────────────┘  mean-reversion PO zónových injekcích
  field.daily (40) / mine.daily (50) / home.burnWood (60) / buildings.age (70) / research.daily (75)

MONTH EDGE:
  food.spoilage (10) → taxes.monthly (20) → world.gatherTributes (25, NOVÉ)
       → upkeep.military (30) → council.closeMonth (40)
                          [tribute příjem PŘED upkeep platbou]

SCHEDULE (one-shot, K17, serializovatelné):  [M7a-2]
  world.processFaction{factionId} ──(self-rearm +aiTurnPeriod)──► processAI(state 0..7)
       ├─ state 4/5: warning/dangerAIAttacking (spy)
       ├─ state 6 vs AI: aiBattleResolve (formulas, rng 'world') + world.takeOver(+400)
       └─ state 6 vs player: startBattle(+100) ──► [M7b stub, NEsahat battle.js]
  revolt → loadImportantEvent (+100) [M8 stub]
  quest  → deadlineStep (absolutní krok)

RNG: makeRng(state,'world') — JEDINÝ stream pro celý AI svět. 'battle' rezervován M7b.
```

---

## 11. Kontrakty §8 — naplnění beze změny signatur (reviewer gate)

| Kontrakt §8 | Signatura | M7a status |
|---|---|---|
| Zone tick §8.2 | `processZone(state, zoneId, rng('world'))` | **Naplněn** T1 (round-robin 5day, goldDemand 150×units, production 50×workers, favour). Signatura beze změny. |
| Frakční automat §8.2 | AISTATES 0–7 data + přechodová fn, schedule K17 | **Naplněn** T2 (`processAI`, scheduleInsert). |
| `marketInject` §8.2/§9.1 | `marketInject(state, goodsId, qty)` | **Naplněn** T5 (produkce inject, válka withdraw). **Signatura beze změny** (market.js:103). |
| `getGoldValue` §8.2 | `getGoldValue(state, basket)` | **Naplněn** T1/T3/T4 (zone resource konverze, quest/tribute oceňování, ratingy). Beze změny (market.js:91). |
| Negativní S-06 → pozitivní | world volá oceňování až po M4 | **Splněno** — M4 hotov (iter-011), world teď legitimně volá. |
| Battle automat §8.1 | `battleStep(...)`, `state.battle` | **NEDOTČEN** (M7b/iter-017). AI-AI bitvy = RNG vzorec, ne automat. AI-vs-player = schedule stub. |

**Žádná změna kontraktů §8 → žádný decision record nutný** (acceptance). Kdyby coder narazil na potřebu změnit signaturu → eskalace + DR (master plán §9.4 bod 4).

---

## 12. Rizika a mitigace

| # | Riziko | P/D | Mitigace |
|---|---|---|---|
| RW-1 | **G-LISTZONE aproximace nesedí s feel originálu** | Stř/Stř | provenance flag, kalibrace M9; vzorce 1:1 z originálu, jen data approximovaná; min. hratelná sada ověřena testem (zóny tikají, revolty/questy se spustí). |
| RW-2 | **Frakční automat replay-nedeterministický** (skrytý Math.random) | Stř/Vys | Grep gate (žádný Math.random/Date.now v core); jeden rng 'world'; povinný AI replay test (master plán §1.3); contracts.js precedent. |
| RW-3 | **Round-robin drift po save/load** | Níz/Vys | Bezstavový `zoneIndex` z curStep (§7.5) — žádný uložený kurzor. |
| RW-4 | **Catch-up cena AI světa** | Níz/Stř | O(1) zone tick (1 zóna/den), řídké schedule tahy; zóny ~13; žádné O(n²). Benchmark v T-TEST. |
| RW-5 | **Záměna AI-AI bitvy s battle automatem** (sahnutí na battle.js) | Stř/Vys | Explicitní §4.3: AI-AI = formulas RNG vzorec; AI-player = schedule stub do M7b; battle.js NEDOTČEN. Reviewer gate. |
| RW-6 | **homeZone/player.tot* dvojí zdroj pravdy** (desync) | Stř/Stř | Jeden zdroj = player.tot*; homeZone derivuje, neukládá se (G-HOMEZONE-MIRROR). Fresh-vs-load test. |
| RW-7 | **Persist statiky zón → drift** (jako DR-012-02) | Stř/Vys | Re-hydratace topologie/static z katalogu na load (G-WORLD-ZONEHYDRATE), ukládat jen mutovatelný stav; fresh-vs-load hashState test. |

---

## 13. Gap-list (provenance / carry-over)

| Gap | Popis | Řešení / kdy |
|---|---|---|
| **G-LISTZONE** | prázdné zones[]/aiStates[] | **Resolved** approximací (§9), provenance flag, kalibrace M9 |
| G-WORLD-DAYEDGE | round-robin na day edge (orig: per-step) | vědomá odchylka (catch-up), kalibrace M9 |
| G-WORLD-ARCHRES | originál bug `zone.archres` (ř.162) | opravit na `archers` |
| G-WORLD-NOTENOUGH | originál překlep notEnoughgold/Gold | sjednotit klíč |
| G-AI-BATTLE-FORMULA | AI-AI bitva RNG vzorec | 1:1 originál + tabulkový test |
| G-WORLD-AITURN | aiTurnPeriod approximováno | balance, kalibrace M9 |
| G-WORLD-INJECT-QTY | inject množství server-side | approximováno, kalibrace M9 |
| G-RECRUIT-TXAUDIT | recruit pay bez emitTx | třída G-BUILD-TXAUDIT, audit M9 |
| G-HOMEZONE-MIRROR | homeZone units = mirror player.tot* | neukládat homeZone units |
| G-WORLD-ZONEHYDRATE | re-hydratace static zón z katalogu | load-step merge |
| G-WORLD-QUESTSTORE | questy world vs story (M8) | world.quests teď, M8 napojí |
| G-MILITARY-STATS | unit strength/defense | approximováno (zones.json faction defs) |

---

## 14. Dekompozice pro Sonnet (L tasky — povinné §1.2)

### T1 zone tick (L) — M7a-1
1. `BALANCE.world` rozšíření (konstanty §2.3) + zones schema/validátor + zones do CATALOG_NAMES.
2. G-LISTZONE data do `zones.json` (§9: aiStates, factions defs, ~13 zón, topologie).
3. `processZone` — gold ekonomika + policy switch (3 větve) — čistá fn, rng 'world'.
4. gold shortage + clamps + ratingy (calc*, derivované).
5. round-robin v `worldTick` (bezstavový, day-index `_absDay`, M-1 §2.1) + `createWorldState()` init `world.zones=[]`/`world.factions={}` + `createInitialState` volá `hydrateZones` (vedle rebuildBuildingDerived) — §8.1.b/d.
6. load Step 5 volá `hydrateZones` (po applyPayload); `zones`/`factions` vyjmuty z generického `Object.assign`-merge (load.js:217-226) — id-based merge přes `hydrateZones` (§8.1.b); **fresh-vs-load hashState test** + round-trip save/load test (§8.1.c).

### T2 frakční automat (L) — M7a-2
1. AISTATES tabulka data + `world.factions` stav + persist.
2. `processAI` přechodová fn (state 0–7) — rng 'world', scheduleInsert.
3. `redistributeForces` + `findNeighboursOf` (čisté).
4. schedule self-rearm `world.processFaction` + registr handlerů (vzor registerContractEffects) + gate aiMechanicStart.
5. AI replay determinismus test + schedule save/load test.

### T3/T4/T5/T6 (M/S) — dekompozice viz §4/§5/§6 + master plán.

---

## 15. Alternativy (povinné — min. 1)

1. **Uložený round-robin kurzor v state** (místo bezstavového). Zamítnuto: drift po save/load (RW-3), zbytečný stav; bezstavový z curStep je deterministicky robustnější.
2. **Frakční tah jako periodikum** (místo schedule self-rearm). Zamítnuto: originál plánuje AI eventy přes Engine.insert (delay-based) — schedule je věrnější a dovoluje delay-based varování/útoky (warning +50, startBattle +100); periodikum by neslo delay-strukturu. Schedule je navíc vzor contracts (konzistence).
3. **AI-AI bitva přes battle automat** (sdílet §8.1). Zamítnuto: battle automat je M7b a je drahý (sub-step 30ms); originál AI-AI je jednorázový RNG vzorec (ř.952–981) — věrnější a levnější v catch-upu. AI-vs-player jde přes battle automat (M7b).
4. **NE-split (vše iter-016)**. Zamítnuto: §1.1 (2×L nad Sonnet kapacitu).

---

## 16. Odloženo na M7a-2 / iter-017 (mimo acceptance M7a-1)

Tato revize (T-002a) **zužuje M7a-1 na T1 (zone tick) + T4 (jednotky) + T5 (market.inject)**. Následující části zůstávají v dokumentu jako **podklad pro architekta iter-017** (plný design udělá v M7a-2), ale **nejsou součástí M7a-1 acceptance** a coder M7a-1 je **NEimplementuje**:

| Část | Sekce designu | Co je odloženo | Stav v M7a-1 |
|---|---|---|---|
| **T2 — Frakční AI automat** | §3 (AISTATES 0–7, `processAI`, `world.factions` přechody, schedule self-rearm, `redistributeForces`, `findNeighboursOf`) | celý frakční automat | `world.factions` se jen **inicializuje + hydratuje** (§8.1), ale **nepřechází** (state se nemění); žádné `processFaction` schedule. |
| **T3 — Revolty** | §4.1 | favour-drain revolt mechanika | blok v `processZone` existuje jako `if (curStep > revoltMechanicStart) { /* M7a-2 */ }` = **no-op** (§2.2.4). |
| **T3 — Questy** | §4.2 | generování/oceňování questů | `processZone` quest sekce = **no-op** v M7a-1 (§2.2.5). |
| **T3 — Tribute výběr/distribuce** | §4.4 | `gatherTributes` (month-edge výběr → player grant / capital gold) | **viz tribute split níže** — v M7a-1 jen **akumulace**. |
| **T3 — AI-AI bitvy** | §4.3 | `aiBattleResolve` RNG vzorec (formulas), `world.takeOver` | žádné — frakce neútočí v M7a-1. battle.js NEDOTČEN (M7b). |
| **T6 — UI** | (mimo design) | world/zones screen, mapa | žádné UI v M7a-1. |

### 16.1 Tribute split (UJASNĚNO)
- **M7a-1 (T1, `processZone`)**: tribute se pouze **AKUMULUJE** do `zone.resources` (policy větve, §2.2.2 — `resources += amount*numWorkers/...`). Žádný výběr. Resources se prostě hromadí dokud M7a-2 nepřidá výběr — **vědomě akceptováno** (reviewer T-002, hranice splitu).
- **M7a-2 (T3, `gatherTributes`)**: month-edge periodikum **vybírá** `zone.resources` → player zóny `grant(ctx)`, AI zóny `capital.gold += getGoldValue(resources)`, pak `zone.resources={}`. Registrace `world.gatherTributes` (month order 25) je M7a-2.
- **Důsledek pro M7a-1**: `world.gatherTributes` periodikum se v M7a-1 **NEregistruje** (ASCII diagram §10.2 „NOVÉ" platí pro M7a-2). tickOrder M7a-1 = jen `world.tick` (day 30) přestane být no-op.

### 16.2 Co M7a-1 přesto zavádí pro M7a-2 (wiring bez logiky)
Aby M7a-2 jen četl/mutoval (žádné zdvojení wiringu): `world.zones`/`world.factions` v persist + `hydrateZones` (§8.1), G-LISTZONE data (§9: aiStates tabulka + faction defs + topologie), `BALANCE.world` konstanty (§2.3). M7a-2 pak jen naplní `processFaction`/revolt/quest/tribute logiku nad existující datovou kostrou.

---

*Konec designu. Zdroj pravdy mechanik: originál `world.js`. Architektura: iter-002 §8.2/§9.1/§9.4 (D/K/R citováno průběžně). Renumbering: DR-013-00. **Po revizi T-002a: M7a-1 acceptance = §2 (T1, M-1 vzorec §2.1), §5 (T4), §6 (T5), §7, §8/§8.1 (M-2 re-hydratace), §9; M7a-2 odloženo = §3/§4/§16.***
