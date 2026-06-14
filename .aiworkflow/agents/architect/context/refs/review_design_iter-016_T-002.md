# Review designu M7a — AI svět/zóny/frakce/jednotky/market.inject (iter-016, T-002)

- **Task**: T-002, iter-016 (BRIEF-016-002)
- **Reviewer**: reviewer (Opus)
- **Datum**: 2026-06-14
- **Předmět**: `agents/reviewer/context/refs/design_iter-016_T-001.md` (DESIGN, ne kód) — architektonický gate před tom-proxy schválením a před implementací.
- **Metoda**: ověřeno PROTI KÓDU (world.js stub, market.js, upkeep.js, rng.js, scheduler.js, contracts.js, tickOrder.js, persistSchema.js, load.js, createInitialState.js, balance.js, zones.json, military.json) + proti originálu `doc/original_source/.../world.js`.

---

## VERDIKT: **GO-s-podmínkami**

Design je architektonicky správný, věrný originálu, a jeho determinismus/catch-up-safe model je solidně promyšlený (jeden `world` rng, schedule one-shot, bezstavový round-robin, re-hydratace statiky). Split M7a-1/M7a-2 doporučuji **schválit (ANO)**. K postupu do implementace je nutné vyřešit **2 MAJOR nálezy** (round-robin gating na day-edge je v pseudokódu chybný; re-hydratace zón vs. persist allowlist/load-merge potřebuje explicitní kontrakt). Žádný BLOCKER.

**Podmínky GO** (musí být v zadání pro coder M7a-1):
- **C-1 (z M-1)**: Round-robin gating přepočítat na **day-index** (ne `curStep % dist`), viz M-1. Bez toho processZone na day-edge prakticky neběží.
- **C-2 (z M-2)**: Re-hydratace zón: definovat, že `world.zones` v persist drží **jen mutovatelný stav**, statika se re-deriguje z katalogu **stejnou fn** ve fresh i load (anti-DR-012-02), a vyřešit array-merge v load.js (viz M-2).

---

## Posouzení determinismu AI v dávce (round-robin + re-hydratace + schedule) — KRITICKÉ

| Aspekt | Verdikt | Doloženo proti kódu |
|---|---|---|
| **Bezstavový round-robin** (žádný uložený kurzor) | Koncept **OK**, ale **formule chybná na day-edge** (M-1) | `worldTick` běží jako periodikum day order 30 (tickOrder.js:204); na day-edge je `curStep` násobek 900. Design §2.1 přebírá originálovo `if (curStep % dist === 0)` (orig ř.583) — to v originále běží **per-step** (World.step), ne day-edge. Na day-edge `900 % 347 ≠ 0` (dist=ceil(4500/13)=347) → processZone se prakticky nikdy nespustí. Bezstavovost (žádný kurzor) je správná a přežije save/load triviálně — ale gating je vadný. |
| **Jediný `rng('world')` stream, žádný nový** | **OK** | rng.js:10 `STREAM_NAMES` obsahuje `'world'` (index 5). `'battle'` (index 6) rezervován. Žádný nový stream → pořadí STREAM_NAMES beze změny, `initRng` deterministický. `makeRng(state,'world')` čte/zapisuje `state.rng.streams.world` → serializovatelné (rng.js:32-45). Frakční automat + AI-AI bitvy + questy + redistributeForces přes tento stream = correct, replay-safe. |
| **Žádný `Math.random`/`Date.now`** | **OK** (s povinným grep gate) | Originál používá `Math.random` masivně (ř.771,793,835,859,873,903,952…); design je všude nahrazuje `rng`. Grep gate (master §1.3) + AI replay test jsou v designu zmíněny — povinné. |
| **Schedule serializovatelný (K17, ne objektová ref)** | **OK** | `scheduleInsert(state, step, id, params)` (scheduler.js:71) vkládá plain-data `{step,id,params,seq}`; `seq` z `state.engine._seq++` → stabilní tie-break (less() scheduler.js:15). persistSchema.js:240-249 ukládá `schedule`/`scheduleCount`/`_seq`; load.js:90-92 obnovuje. → schedule přežije save/load bit-identicky. Design správně nahrazuje `Engine.insert` → `scheduleInsert`. |
| **Self-rearm `world.processFaction` přežije save/load** | **OK** (precedent existuje) | Vzor `contract.offer` self-rearm doložen (contracts.js:161-175: `makeRng('contracts')` + `scheduleInsert(state, nextStep, 'contract.offer', {})`; idempotentní re-arm `armContractOffer` contracts.js:265 přes `scheduleCountOf`). Frakční smyčka je 1:1 stejný vzor. Re-arm entry je v `schedule` → persistován. **Pozor (m-2)**: idempotentní bootstrap re-armu (aby po load nevznikly duplicitní smyčky) musí použít `scheduleCountOf`-guard jako `armContractOffer` — design to zmiňuje ("bootstrap nebo při překročení prahu") ale neukotvuje na idempotentní guard explicitně. |
| **Re-hydratace static zón z katalogu na load (anti-DR-012-02)** | Koncept **správný**, ale **kontrakt s persist/load-merge nedotažený** (M-2) | Precedent doložen: load.js:284-295 + komentář M5-R1 "MUST call the SAME fn as mutations — no load-only derivation branch" + DR-012-02 odkaz explicitně. Design §8/G-WORLD-ZONEHYDRATE jde správným směrem (ukládat jen mutovatelný stav, statiku re-derivovat). ALE: (a) `world.zones`/`world.factions` **nejsou inicializovány v `createWorldState()`** (createInitialState.js:18-49 — chybí!), takže fresh-vs-load symetrie závisí na novém init kroku, který design předpokládá ale nepojmenoval jako bod dekompozice; (b) load.js:217-226 world-merge dělá `Object.assign` jen pro objektová pole — pro **pole `zones[]`** to má vadnou sémantiku (viz M-2). |
| **Catch-up-safe invariant (S-05)** | **OK** | worldTick O(1)/den (max 1 zóna), processFaction řídké přes schedule, gatherTributes month. Zóny ~13. Žádné O(n²). AI běží v dávce identicky jako live (vše deterministické + schedule-driven). |

**Souhrn determinismu**: Model je **správně navržen** (jeden stream, schedule, bezstavovost, re-hydratace). Dvě konkrétní díry brání tomu, aby byl „GO bez podmínek": (1) round-robin gating na day-edge je matematicky vadný (M-1, correctness, ne jen drift), (2) re-hydratace potřebuje explicitní fresh-init + opravu array-merge (M-2, jinak hrozí přesně DR-012-02 drift). Obojí je opravitelné v zadání, ne přepisem návrhu.

---

## Nálezy

### MAJOR

**M-1 — Round-robin gating `curStep % dist === 0` je na day-edge prakticky mrtvý (correctness, ne jen „řidší")**
Design §2.1 / §14 T1-5 / ASCII diagram přebírá doslova originálovou podmínku `if (curStep % dist === 0)` (orig world.js ř.583), ale `worldTick` je registrován jako **day-edge periodikum** (tickOrder.js:204, order 30), zatímco v originále round-robin běží v `World.step` **každý krok**. Na day-edge je `curStep` vždy násobek `STEPSPERDAY=900` (balance.js:14, clock.js:20). S `period=STEPSPERDAY*5=4500`, `dist=ceil(4500/13)=347`: `900 % 347 = 206`, `1800 % 347 = 66`, `2700 % 347 = 273` — **nikdy 0** (kromě LCM koincidencí jednou za stovky dní). Důsledek: `processZone` se na day-edge prakticky **nikdy nespustí** → zónová ekonomika tichý no-op, S-05/catch-up test by „prošel" (nic se neděje), ale milník je nefunkční. Gap G-WORLD-DAYEDGE tuto díru **podceňuje** ("výběr zóny řidší než v originálu") — ve skutečnosti je to ~0 zón, ne řidší.
**Návrh**: gating přepočítat na **day-index round-robin**, ne na `curStep % dist`. Doporučení: `const day = Math.floor(curStep / STEPSPERDAY); const stride = Math.max(1, Math.ceil(zones.length / 5)); if (day % stride === 0) { zoneIndex = Math.floor(day / stride) % zones.length; processZone(...) }` — pokrývá záměr „round-robin přes 5 dní" (každá zóna 1× / ~5 dní) a zůstává **bezstavový** (funkce `day` = funkce `curStep`). Coder MUSÍ mít v zadání: *period/dist počítat z day-indexu, ne z curStep modulo*. Doplnit do zadání assertion-test: „za 5*len dní se každá zóna zpracuje ≥1×".

**M-2 — Re-hydratace zón vs. persist allowlist + load-merge: chybí dotažený kontrakt → riziko DR-012-02 driftu**
Design §8/§9 správně volí „ukládat jen mutovatelný stav, statiku re-derivovat z katalogu", ale tři kódové detaily nejsou v návrhu vyřešené a každý sám o sobě může způsobit fresh-vs-load drift (třída DR-012-02):
1. **`world.zones`/`world.factions` nejsou v `createWorldState()`** (createInitialState.js:18-49 — domény forest/field/mine/marketState/caravan, **zones/factions chybí úplně**). Re-hydratace „na load" funguje jen když **fresh** prochází identickou konstrukcí. Design to předpokládá ("createInitialState musí inicializovat world.zones/factions ze stejného katalogu jako load", §8 migrace) ale **nepojmenoval to jako samostatný krok dekompozice** — přidat do §14 T1 jako explicitní bod „createWorldState() init zones/factions z katalogu (jediná cesta, sdílená s load)".
2. **load.js world-merge je objektový, ne polní** (load.js:217-226): pro každé pole `PERSIST_SCHEMA.world` dělá `Object.assign(state.world[field], payload.world[field])` *jen když oba jsou object*. `zones` má být **pole** → `Object.assign(arr, arr)` kopíruje indexy (funguje povrchně), ALE pokud saved pole je kratší/jiného pořadí než fresh re-hydrované, vznikne **stale tail / mismatch index↔id**. Bezpečnější: zóny mergovat **podle `id`** (ne podle indexu) — fresh re-hydruje statiku per-id, save přepíše mutovatelný stav per-id. Design musí coderovi předepsat **id-based merge**, ne spoléhat na generický `Object.assign`.
3. **Symetrie „no load-only branch"** (M5-R1 gate, load.js:284 komentář): re-hydratace zón musí volat **stejnou fn** jako fresh init (vzor `rebuildBuildingDerived`). Design to říká slovně ("vzor: buildings re-derivace") — ukotvit jako reviewer-gate položku: *žádná load-only derivační větev pro zóny; fresh i load volají `hydrateZones(state, catalog)`*.
**Návrh**: do designu/zadání doplnit explicitní kontrakt re-hydratace (3 body výše) + povinný fresh-vs-load `hashState` test (design ho zmiňuje v §8 — dobře, jen ho udělat acceptance-blokujícím pro M7a-1).

### MINOR

**m-1 — `world.gatherTributes` month order 25: ověřeno volné, ale pozor na „month edge" pro player grant**
Návrh řadí `gatherTributes` na month order 25 (mezi `taxes.monthly` order 20 a `upkeep.military` order 30, tickOrder.js:211-212). Slot je **volný a konzistentní** (tribute příjem PŘED upkeep platbou — správně). Nit: design v §4.4 míchá „month edge" periodikum a zároveň v §10.1 registruje `world.gatherTributes` i jako schedule one-shot handler — ujasnit, že tribute je **periodikum** (month), ne schedule, aby nevznikly dvě cesty. (Player grant přes `grant(state, …, ctx)` vyžaduje `ctx` — periodikum ho má, schedule handler typicky ne; další důvod držet to jako periodikum.)

**m-2 — Idempotentní bootstrap frakční self-rearm smyčky (anti-duplikace po load)**
§3.4 popisuje self-rearm „při startu (bootstrap) nebo při překročení prahu". Bez idempotentního guardu (vzor `armContractOffer` + `scheduleCountOf`, contracts.js:265) hrozí, že re-bootstrap po load (kdy už re-arm entry leží v schedule) vloží **druhou** smyčku per frakci → zdvojený tah → drift. Předepsat coderovi: bootstrap re-armu MUSÍ být guarded přes `scheduleCountOf('world.processFaction', {factionId})` jako u kontraktů.

**m-3 — `getGoldValue`/`marketInject` signatury: potvrzeno beze změny — S-06 → pozitivní OK**
Ověřeno proti market.js: `getGoldValue(state, basket)` (market.js:91), `marketInject(state, goodsId, qty)` (market.js:103, clamp `[0,max]` ř.107). Design je nemění → kontrakt §8.2 naplněn bez decision record. S-06 (stub world nevolá oceňování) → pozitivní (world legitimně volá po M4). **OK, žádná akce** — uvádím jen jako explicitní potvrzení gate.

### NIT

**n-1 — AISTATES „0–7" vs. originálový enum (0–6)**
Design uvádí AISTATES 0–7 (§3.1). Originálový enum `AISTATES` (world.js ř.13-21) má jen 0–6 (default..attacking); stav **7 (incapacitated)** v enum-dictu chybí, ale **v kódu existuje** (`character.state == 7`, ř.767-768; nastavení ř.851). Design je tedy **kód-faithful** (správně), ale provenance `'extracted'` pro tabulku aiStates by měla poznamenat: *state 7 doložen z kódu (ř.767/851), ne z enum dictu* — jinak hrozí dojem aproximace. Drobnost, doplnit komentář.

**n-2 — `military.json` cross-check OK**
`military.json`: warrior goldCost 1080, archer goldCost 1620, upkeep 108/162. Design §5.2 ("warrior 1080, archer 1620") + reuse `balance.army` (warriorCost 1080 / archerCost 1620 / upkeep 108/162, balance.js:106-114) — **konzistentní, žádná duplicitní konstanta, žádný nový upkeep systém** (upkeep.military hotový, upkeep.js:23-39 čte player.totWarriors/totArchers). Potvrzení bodu 4 briefu.

**n-3 — Originálové bugy G-WORLD-ARCHRES / G-WORLD-NOTENOUGH**
Design správně identifikuje a opravuje originálové překlepy (`zone.archres`→`archers` ř.162; `notEnoughgold`/`notEnoughGold` ř.222/239). Dobrý katch — jen potvrzuji, že oprava je správná (ne věrnost bugu).

---

## Posouzení splitu M7a-1 / M7a-2 — **DOPORUČUJI ANO (schválit)**

Split je **opodstatněný a hranice správná**:
- **M7a-1 = T1 (zone tick L) + T4 (jednotky M) + T5 (market.inject S)** je **samostatně hratelné/testovatelné bez frakční AI**. Doloženo: T1 udržuje zónová data (liege/warriors/militaryRating), T2 je jen **čte** → jednosměrná závislost (design §1.1 bod 2). Zóny tikají i bez frakční AI (jen se nemění lieges). T5 (market.inject) napojuje zónovou ekonomiku na trh — uzavírá negativní S-06 → pozitivní kontrakt **v rámci M7a-1**, nepotřebuje AI. Jednotky (T4) reuse existující `player.totWarriors/totArchers` + upkeep (hotový M4a) → žádný nový subsystém. → **M7a-1 dává end-to-end hratelný přírůstek.**
- **M7a-2 = T2 (frakční automat L) + T3 (revolty/questy/tribute/AI-AI M) + T6 (UI M)**: izoluje nejrizikovější část (7-stavový automat, replay determinismus, AI-AI bitvy, schedule) do vlastního review/test loopu (AI replay test). UI mapy zón má smysl až s frakční dynamikou.
- **Sonnet-velikost**: 2×L + 3×M v jedné iteraci je nad kapacitou jednoho průchodu (master §1.2/A3). Split = 1×L+1×M+1×S (M7a-1) a 1×L+2×M (M7a-2) → každá iterace průchozí.
- **Žádná architektonická cena**: wiring (`world.zones`/`world.factions`/persist) zaveden už v M7a-1, M7a-2 jen čte/mutuje `liege`/`state`. Žádné zdvojení.

**Drobná hranice k ujasnění**: T3 obsahuje **tribute** (`gatherTributes`, §4.4), který je v briefu/designu řazen do M7a-2. Ale tribute **akumulace do `zone.resources`** probíhá už v `processZone` (T1, policy větve, §2.2) → část tribute logiky nutně žije v M7a-1. Doporučení: v M7a-1 **akumulovat** tribute do `zone.resources` (součást processZone), v M7a-2 **vybírat** přes month-edge `gatherTributes`. Ujasnit, ať není v M7a-1 prázdná tribute akumulace bez výběru (akceptovatelné — resources se prostě hromadí dokud M7a-2 nepřidá výběr; ale pojmenovat to). → nemění verdikt splitu, jen hranici.

---

## G-LISTZONE (bod 6 briefu) — postup **OK** (Q3/DR-001 autonomně, bez eskalace)

§9 postup je správný a doložitelný:
- **Doložitelné (extracted)**: AISTATES 0–7 (world.js ř.13-21 + 750-758 + ř.767/851 pro state 7), capitals `dickinsonLanding/castleGrey/hornCastle` (ř.762-766), faction names, vzorce (processZone/processAI/aiBattle 1:1). → `provenance:'extracted'` oprávněné.
- **Approximated**: topologie `neighbours`, `targetWorkerNum`, unit growth/stats, aggression/backstab/allies (server/runtime mimo dump). → `provenance:'approximated'` + per-zóna flag + `_meta` notes + kalibrace M9. Správně.
- **Schema validace + CATALOG_NAMES wiring** (vzor M6 G-LISTTECHS) — správně předepsáno.
- **Autonomní řešení bez blokeru** je v souladu s DR Q3 (aproximace stačí pro hratelnou sadu). **OK.**

Jediná podmínka (spadá pod M-2): re-hydratovaná statika z `zones.json` MUSÍ být deterministicky stejná ve fresh i load (id-based), jinak `provenance` flag nepomůže proti driftu.

---

## battle.js NEDOTČEN (bod 3 briefu) — **OK**

Design správně odděluje (§4.3, §11): AI-AI bitvy = **RNG resolve vzorcem** v `formulas.js` (`aiBattleResolve`, 1:1 originál ř.948-984, rng 'world'), **žádný `battleStep`/`state.battle`**. AI-vs-player → `scheduleInsert('startBattle')`, handler = **M7b stub** (no-op/notifikace, NEsahat battle.js). Battle automat (§8.1) odložen na M7b/iter-017. Gap G-AI-BATTLE-FORMULA + povinný tabulkový/replay test. **Reviewer gate splněn** — žádné dotčení battle.js v M7a. (Pozn.: `state.battle` se v load.js:229 čte jako `payload.battle ?? null` — beze změny, M7a se ho netýká.)

---

## Soulad s architekturou + proveditelnost Sonnet (bod 7)

- **§8.2 kontrakty** (processZone, frakční automat, marketInject, getGoldValue) naplněny **beze změny signatur** → žádný decision record. Potvrzeno proti kódu.
- **K17 schedule** (string-ID + seq, ne objektová ref) — dodrženo (scheduleInsert).
- **K16 RNG izolace** (jeden `world` stream) — dodrženo.
- **tickOrder**: `world.tick` 30 < `market.drift` 35 (inject před driftem) — ověřeno (tickOrder.js:204-205), beze změny. `gatherTributes` month 25 (mezi taxes 20 a upkeep 30) — volný slot, konzistentní.
- **Persist**: `PERSIST_SCHEMA.world` už allowlistuje `zones`/`factions` (persistSchema.js:24, „legacy M7 placeholders") → jen se naplní, allowlist beze změny. **OK** (s výhradou load-merge sémantiky, M-2).
- **Proveditelnost Sonnet**: dekompozice §14 (T1 6 kroků, T2 5 kroků) je rozumná; po doplnění C-1 (day-index round-robin) a C-2 (re-hydratace kontrakt) je M7a-1 implementovatelná v jednom Sonnet loopu.

---

## Souhrn nálezů

| Severita | Počet | ID |
|---|---|---|
| BLOCKER | 0 | — |
| MAJOR | 2 | M-1 (round-robin gating day-edge), M-2 (re-hydratace zón / fresh-init / array-merge) |
| MINOR | 3 | m-1 (gatherTributes periodikum vs schedule), m-2 (idempotentní self-rearm bootstrap), m-3 (potvrzení kontraktu market — bez akce) |
| NIT | 3 | n-1 (AISTATES 7 provenance), n-2 (military.json cross-check OK), n-3 (originálové bugy správně opraveny) |

## Nejdůležitější 3 nálezy
1. **M-1 (MAJOR, correctness)** — round-robin `curStep % dist === 0` je na day-edge prakticky mrtvý (900 % 347 ≠ 0); processZone by se téměř nikdy nespustil. Přepočítat na **day-index** round-robin. Catch-up test by tuto díru zamaskoval (nic se neděje = „stabilní hash").
2. **M-2 (MAJOR, DR-012-02 třída)** — re-hydratace zón potřebuje: (a) init `world.zones/factions` v `createWorldState()` (dnes chybí), (b) **id-based** merge v load.js místo generického `Object.assign` na pole, (c) sdílenou `hydrateZones` fn (no load-only branch, M5-R1 gate). Bez toho hrozí přesně fresh-vs-load drift.
3. **Split = ANO** — hranice M7a-1 (T1+T4+T5, samostatně hratelné, uzavírá market kontrakt) / M7a-2 (T2+T3+T6, izoluje rizikový AI automat) je správná; jen ujasnit tribute akumulaci (M7a-1) vs výběr (M7a-2).

---

*Determinismus AI v dávce: model správný (1 stream world / schedule K17 / bezstavovost / re-hydratace), GO podmíněno opravou M-1 (gating) a dotažením M-2 (re-hydratace kontrakt). Zdroj pravdy ověřen proti originálu world.js a aktuálnímu kódu. NEcommitováno (per brief).*
</content>
</invoke>
