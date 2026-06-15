# Review Gate M7a-2 + DoD M7a — iter-017 T-008

- **Task**: T-008 (reviewer), BRIEF-017-008
- **Iterace**: iter-017 (M7a-2), REVIEW GATE M7a-2 + ověření DoD M7a (celý milník)
- **Reviewer**: Opus
- **Datum**: 2026-06-15
- **Base→HEAD**: `bbaf10e..HEAD`
- **Metoda**: ověřeno proti KÓDU (ne proti tvrzením QA). QA (T-007) dala GO empiricky.

---

## VERDIKT: **GO**

DoD M7a **SPLNĚNO**. Determinismus frakčního automatu (processAI replay, self-rearm, favour migrace) **POTVRZEN proti kódu**. `battle.js` **NEDOTČEN** (ověřeno git). Žádný blocker, žádný major. 4 minor + 1 nit (vesměs living-artifact drift + dvojí maintenance point + nepřesnost QA tvrzení — žádný neblokuje gate).

---

## Stanovisko k tvrdým invariantům (proti kódu)

### INV-1 — processAI determinismus: **PASS**
- `processAI` (world.js:905–1139) implementuje AISTATES 0–7 1:1 s originálem (ř.743–991). Stavy: 0=default (rozhodovací, weakest-neighbour, mil/eco rating větvení 1/2/3/4), 1=growPop, 2=growMil, 3=growRes, 4=prepAttack, 5=annoAttack, 6=attacking, 7=incapacitated (terminál, early return ř.917–920).
- **Jediný rng stream `'world'`**: veškerý RNG přes `makeRng(state,'world')` (předáno jako param). Žádný `Math.random`/`Date.now`/DOM v core — ověřeno grepem přes `src/core/`: všechny výskyty jsou v komentářích ("nahrazeno rng"). `makeRng` (rng.js:32) je thin wrapper čtoucí/zapisující `state.rng.streams['world']` přímo → **vícenásobné `makeRng(state,'world')` volání sdílí jeden persistovaný kurzor** (processFaction:1161, processZone:285, worldTick:560) → deterministické, kurzor postupuje ve stavu, přežije save/load. **Žádná regrese.**
- `scheduleInsert` (K17, serializovatelné) místo `Engine.insert` všude; params objekty (`{factionId}`, `{attackerId,targetZoneId}`).
- `faction.state` persistován (persistSchema.js:283) → replay po loadu pokračuje stejně. Spy větve (state 4/5) přeskočeny pokud `player.spy` absent (G-SPY-ABSENT), přechod 4→5→6 proběhne korektně.

### INV-2 — Self-rearm bez load-only/init-only větve (DR-012-02): **PASS**
- `processFaction` (world.js:1151–1169): re-arm **NEPODMÍNĚNÝ** (ř.1166–1168, vždy na konci handleru — i pod prahem `aiMechanicStart`, i při `state===7`). processAI volán jen v gate `curStep > aiMechanicStart && state!==7` (ř.1159–1163). Smyčka nikdy nevymizí. **Anti-DR-012-02 splněno.**
- `armFactionAI` (world.js:1245–1263): **per-faction set-difference guard** — `live = Set(schedule.filter(id==='world.processFaction').map(e.params.factionId))`, insert jen chybějící v pevném pořadí `['theWarlord','thePrincess','thePsychopath']`. **`scheduleCountOf` NEPOUŽITO** (ověřeno — scan dle params.factionId). Idempotentní při libovolném stavu schedule (fresh→3, plný→0, asymetrický→doplní chybějící).
- **Call-sites ověřeny**: `armFactionAI` volán **JEDNOU** z `bootSequence` (main.js:208), za `armContractOffer` (ř.205). Jediná sdílená cesta fresh+M7a-2 save+starý M7a-1 save. Žádná load-only ani init-only větev. `registerWorldEffects` registrován v bootstrapEngine (main.js:99) i registerCorePeriodics (tickOrder.js:187) — handler `world.processFaction` dostupný v live i test ctx.

### INV-3 — favour migrace bez M7a-1 regrese: **PASS** (s minor — viz F-1)
- `migrateFavour` (world.js:584–592): 4 větve v závazném pořadí (saved object → deep-copy; saved number → `{}`; def object → deep-copy; jinak `{}`). Deterministická, bez rng/Date.
- `persistSchema.js:259`: `(z.favour && typeof z.favour === 'object') ? {...z.favour} : {}` — typeof-object guard + deep-copy (přesně design §3.1.2, robustnější než `?? {}`).
- `hydrateZones:647`: `migrateFavour(saved?.favour, def.favour)` — jediná cesta normalizace pro fresh i load.
- **Fresh-vs-load symetrie**: fresh → migrateFavour větev 4 → `{}`; load(save(fresh)) → persist typeof guard → `{}` → hydrate větev 1 deep-copy `{}` → identický tvar. Starý M7a-1 save (`favour:0`) → větev 2 → `{}`. **Žádný load-only drift.**
- **m7a-world-t1 nedotčen**: 34/34 PASS (ověřeno vlastním během, viz Testy). M7a-2 nerozbilo M7a-1.
- Všechny favour čtenáře object-shape-safe (typeof guardy: world.js:318/362/375/432, quests.js:109, selectors.js:607, persistSchema.js:259). UI (screens.js:666) čte `z.favour` jako number ze selektoru (selectors.js:607 `zone.favour?.player`), ne raw objekt — konzistentní.

### INV-4 — AI-AI bitvy vzorcem, battle.js NEDOTČEN: **PASS** (s minor — viz F-2)
- `aiBattleResolve` (formulas.js:380–429): čistá fn, `rng` param, 1:1 originál ř.952–981 (warrResults/archResults vzorec + win/loss větve). Operator precedence ověřeno proti inline kopii — identické.
- **`battle.js` NEDOTČEN**: `git diff --stat bbaf10e..HEAD -- src/core/systems/battle.js` prázdný; poslední commit `b7d638a` (iter-007 M2a-2). **Ověřeno git.**
- AI-vs-player → `scheduleInsert(curStep+100, 'startBattle', {attackerId,targetZoneId})` (world.js:1083–1086) → `startBattleStub` no-op (world.js:1189) = M7b stub. AI-vs-AI → `world.takeOver` (+400) + `aiBattleResolve` logika inline.

### INV-5 — Questy/tribute determinismus: **PASS**
- Questy (`processQuestGen` world.js:391–459): `questSeq++` monotónní ID (`'quest_'+w.questSeq++`), rng `'world'`, **absolutní `deadlineStep = curStep + 30*stepsPerDay`** (ř.442, catch-up-safe). Gating přes **existující persistovaná pole**: `home.settlementLevel >= questSettlementMin` (ř.398) a `(player.totWarriors+totArchers)>0` hasMilitary proxy (ř.417) — m-4 oprava věrná designu. canMakeQuest (player zóna nebo player-soused, ř.404–411). questExpire idempotentní (ř.1206–1214).
- Tribute (`gatherTributes` world.js:473–509): month edge, **order 25** (tickOrder.js:219, mezi taxes.monthly:20 a upkeep.military:30). Player zóny → `grant`; AI zóny → `capital.resources.gold += round(getGoldValue)`. Žádný rng (deterministické). `zone.resources={}` po výběru.
- **Persist**: `world.quests`/`world.questSeq` v allowlistu (persistSchema.js:24), undefined-guard v hydrateZones (ř.690–691). Ratingy derivované — NEUKLÁDÁNY (počítány on-demand v selektorech). `goldDemand`/`goldProduction` persistovány záměrně (G-WORLD-PERSIST-DERIVED, dokumentováno persistSchema.js:263–267, severity low, M9).

### INV-6 — UI bez logiky: **PASS**
- `WorldZonesScreen` (screens.js) čistá komponenta; data ze selektorů, akce přes `send('acceptQuest'/'rejectQuest')`.
- Ratingy on-demand v `selectWorldZones` (selectors.js:621–622 `calcMilitaryRating`/`calcEconomicRating`), `daysLeft` derivováno z curStep (selectors.js:728–729, 755–756), `stateName` z aiStates key (selectors.js:686). Žádná herní logika v UI.

---

## Nálezy

### F-1 (minor) — Katalogový default favour neopraven (3. místo coder-kontraktu vynecháno)
- **Soubor**: `src/data/zones.json:176,198,226,…` (13 zón) — stále `"favour": 0` (number).
- **Design §3.1.2 bod 1** závazně požadoval `"favour": 0 → "favour": {}` na 3 místech (zones.json + hydrateZones + persistSchema). Provedena byla jen 2 (hydrateZones, persistSchema); **katalog nezměněn**.
- **Dopad**: ŽÁDNÝ funkční — `migrateFavour` větev 3 má `typeof === 'object'` guard, takže `def.favour=0` (number) propadne na větev 4 → `return {}`. Fresh start tedy stejně vyústí v `{}`. Invariant fresh-vs-load drží (absorbováno defenzivním helperem).
- **Pozn.**: QA report (T-007 AC4, ř.65) tvrdí "`zones.json`: favour `{}` (13 zón)" — **NEPŘESNÉ tvrzení** (favour je stále `0`). QA verdikt tím není ohrožen (kód robustní), ale tvrzení je faktická chyba.
- **Návrh**: M9 cleanup — sjednotit katalog na `"favour": {}` pro konzistenci s designem; bez něj se spoléhá na defenzivní guard. NE blocker.

### F-2 (minor) — `aiBattleResolve` duplikováno (formulas.js vs inline processAI)
- **Soubor**: `src/core/balance/formulas.js:380` vs `src/core/systems/world.js:1096–1132`.
- Bojový vzorec je implementován dvakrát: čistá testovatelná fn `aiBattleResolve` (formulas.js, volaná POUZE z testů — ověřeno grepem) a inline kopie v `processAI`. Design §4 zamýšlel "vzorec → formulas.js" tj. produkce měla čistou fn volat. Produkce ji NEvolá → `formulas.aiBattleResolve` je de facto test-only, inline verze je živý kód.
- **Dopad**: obě jsou 1:1 originál a aktuálně shodné → žádná divergence DNES. Riziko: dvojí maintenance point, divergence při M9 kalibraci.
- **Návrh**: M9 — refaktorovat `processAI` state 6 aby volal `aiBattleResolve` (formulas.js), eliminovat inline kopii. NE blocker (QA potvrdila shodu).

### F-3 (minor) — Living artifact `docs/tickOrder.md` neaktualizován (gate požadavek)
- **Soubor**: `docs/tickOrder.md` (řádky 42–58, month sekce + diagram).
- Design §9.1 explicitně: "Living artifact tickOrder.md + ASCII diagram: aktualizovat ve stejném commitu (reviewer gate)." **Chybí**: `world.gatherTributes` (month, order 25) v tabulce i diagramu (ř.44/58 stále jen taxes.monthly→upkeep.military→…); nové schedule handlery (processFaction, takeOver, questExpire, AIIsAttacking, startBattle/warning/danger/loadImportantEvent stuby) nejsou zdokumentovány.
- **Dopad**: dokumentační drift; tickOrder.js kód je správný (order 25 zaregistrován). Riziko zmatení při dalším milníku.
- **Návrh**: doplnit řádek `| world.gatherTributes | month | 25 | … | LIVE (M7a-2) |` + month diagram `taxes.monthly → world.gatherTributes → upkeep.military` + sekci schedule handlerů. NE blocker (živý kód koreuje), ale gate-požadavek formálně nesplněn — doporučeno doplnit před close-iteration.

### F-4 (minor) — `world.quests`/`questSeq` persist přes generický fallback (shallow)
- **Soubor**: `src/save/persistSchema.js:291–292` (`else world[field] = s.world[field]`).
- `quests` (pole objektů) a `questSeq` (number) padají do generické větve → shallow copy reference do payloadu (na rozdíl od zones/factions, které mají explicitní deep mapping). `questSeq` (primitiv) OK; `quests` array sdílí ref se state do serializace.
- **Dopad**: žádný za normálního save (JSON serializace přeruší ref). Hrana: pokud by se payload mutoval před serializací, sdílel by ref se state. Aktuálně bezpečné.
- **Návrh**: konzistence — explicitní `world.quests = s.world.quests.map(q => ({...q}))` deep-copy (vzor zones). NE blocker (round-trip test T3-16 PASS).

### F-5 (nit) — Stub handlery jasně označené
- `startBattleStub`/`warningAIAttackingStub`/`dangerAIAttackingStub`/`AIIsAttackingStub`/`loadImportantEventStub` (world.js:1189–1197): všechny no-op s jasným `/* M7b stub */` resp. `/* M8 stub */` komentářem a JSDoc milníkem. **Správně označené.** Bez nálezu — jen potvrzení.

---

## Schválené gapy (tom-proxy, NEflagovány jako blocker)
Ověřeno dokumentačně, korektně označené v kódu: G-FAVOUR-SHAPE (resolved), G-CAPITAL-MISMATCH (resolved, `faction.capitalId` jako zdroj pravdy, hydrateZones:673), G-QUEST-PERSIST (resolved, allowlist), G-QUEST-SETTLEMENT/G-QUEST-MILITARY-PROXY (m-4 proxy), G-SPY-ABSENT, G-RECALL-MIN, G-MILITARY-STATS, G-WORLD-PERSIST-DERIVED (dokumentováno persistSchema.js:263). Žádný flagován jako blocker.

---

## Testy (vlastní běh)
`node --test test/m7a2-world-t2.test.js test/m7a2-world-t3.test.js test/ui-selectors-world-t6.test.js test/m7a-world-t1.test.js` → **110/110 pass, 0 fail** (t2 automat/armFactionAI/migrace, t3 revolt/quest/tribute/AI-AI, t6 UI selektory, t1 M7a-1 round-trip nedotčen). Konzistentní s QA (1255/1255 CI).

---

## Stanovisko k DoD M7a (celý milník)

**DoD M7a SPLNĚNO.** AI svět tiká deterministicky:
- Zóny + round-robin tick (M7a-1) — nedotčeno, 34/34 PASS.
- Frakce mění politiky/útočí (processAI 0–7, replay deterministický, jediný rng 'world').
- Jednotky (redistributeForces, recall minima z katalogu).
- Napojení trhu (getGoldValue v ratingových/tribute výpočtech, kontrakt §8.2 nedotčen).
- Revolty (favour-drain gated, immune/trigger/decay).
- Questy (generate/accept/reject deterministicky, absolutní deadline).
- Tribute (gatherTributes month order 25).
- UI (tab Svět, selektory, accept/reject) bez logiky.
- AI-vs-player → startBattle stub (M7b); `battle.js` NEDOTČEN.

**Determinismus**: processAI replay, armFactionAI self-rearm (set-difference, idempotentní, nepodmíněný re-arm) a favour migrace (number→{} bez M7a-1 regrese) **POTVRZENY proti kódu**.

---

## Souhrn nálezů
| Závažnost | Počet |
|---|---|
| Blocker | 0 |
| Major | 0 |
| Minor | 4 (F-1 katalog favour, F-2 aiBattleResolve duplicita, F-3 tickOrder.md drift, F-4 quests persist shallow) |
| Nit | 1 (F-5 stub potvrzení) |

Všechny minory jsou non-blocking (funkčně absorbované defenzivními guardy / dvojí maintenance bez aktuální divergence / dokumentační drift při korektním živém kódu). **Doporučeno** před close-iteration doplnit F-3 (tickOrder.md — formální gate požadavek §9.1). F-1/F-2/F-4 → M9 cleanup.

**Verdikt: GO. DoD M7a splněno. Determinismus potvrzen. battle.js nedotčen.**
