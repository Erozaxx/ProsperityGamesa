# Review — DESIGN M7b (battle automat) — iter-018 T-002

- **Review ID**: REVIEW-018-002
- **Reviewuje**: DESIGN-018-001 (`context/refs/design_iter-018_T-001.md`)
- **From**: reviewer (Opus)
- **To**: Orchestrator / architect / Sonnet coder
- **Date**: 2026-06-15
- **Metoda**: ověřeno PROTI KÓDU (clock.js, catchup.js, tickOrder.js, battle.js stub, world.js, persistSchema.js, load.js, rng.js, formulas.js, military.json, originál battle.js)

---

## VERDIKT: **GO s podmínkami**

Design je architektonicky správný, drží kontrakt §8.1, a **nejrizikovější tvrzení (G2 auto-resolve == live „zadarmo" a serializovatelný kill-resume) jsou PROTI KÓDU POTVRZENA**. Implementace je proveditelná Sonnet coderem bez dalších architektonických rozhodnutí. Podmínky GO jsou drobné upřesnění semantiky (cd-decrement opponent AI, end-check fáze, crit-roll umístění vůči rng pořadí) + jeden gap (baseRevival fallback), které musí coder dodržet, aby determinismus a 1:1 originál skutečně platily. Žádný BLOCKER.

---

## 1. POSOUZENÍ G2 — auto-resolve catch-up == live (== ZADARMO?)

**ANO, strukturálně zadarmo. POTVRZENO PROTI KÓDU.** Toto je nejsilnější bod designu a držím ho.

Ověřeno:
- `battle.tick` je registrován jako `{ id:'battle.tick', every:'step', order:30, systemFn:'battle.tick' }` — **tickOrder.js:230** (přesně dle designu). `every:'step'` → `edgeActive` vrací `true` na každém stepu (tickOrder.js:85). `battleTick` importován (ř.25) a zaregistrován (ř.162). **Žádná změna pořadí není potřeba.**
- **Live path**: `advance()` → smyčka `step(state, ctx)` (clock.js:75) → `runTick` → Phase3 periodics včetně `battle.tick` (tickOrder.js:126-130).
- **Catch-up path**: `runCatchupBatch()` → smyčka `step(state, ctx)` (catchup.js:50) → **identický** `runTick`. Obě cesty importují `step` ze stejného `clock.js`.
- ⇒ Catch-up dávka a živý běh procházejí **bit-identickou cestou**. Auto-resolve = `battleStep` s prázdnou `queue` → obranná AI politika (design §7.2). **Žádná druhá implementace bitvy.** Tvrzení v TL;DR a §11 je správné.

**Důsledek pro split**: hlavní L-riziko T1 („dvě implementace live vs offline") **neexistuje** — eliminováno samotnou architekturou tick-loopu. To podpírá split=NE (viz §5 tohoto review).

**Podmínka G2-1 (major, viz F-2)**: „zadarmo" platí jen pokud `battleStep` je **plně deterministická funkce stavu + rng streamu 'battle'** a obranná AI politika **NEČTE nic mimo `bs`** (žádný `Date.now`, žádný globální stav, žádný jiný rng stream). Design to slibuje (§7.2 „čistě funkce stavu"), ale Sonnet to musí dodržet doslova. Test §10.4 (advance vs runCatchupBatch → identický `summary`+`hashState`) je **povinný gate** — bez něj nelze G2 prohlásit za splněné empiricky.

---

## 2. POSOUZENÍ SERIALIZOVATELNOSTI (kill-resume bit-identický)

**ANO, dosažitelné. Architektura to umožňuje. POTVRZENO + jedna ostraha.**

Ověřeno proti kódu:
- **Save**: `persistSchema.js:300` — `payload.battle = s.battle ?? null`. Je to **plný passthrough celého `state.battle`** (NE allowlist polí uvnitř battle). ⇒ Jakékoli pole přidané do `state.battle` (subAccMs, queue, cd, tick, meta, banditLoot, …) **automaticky přežije save**. Design §8.1 to tvrdí správně.
- **Load**: `load.js:247` — `state.battle = payload.battle ?? null`. Také plný passthrough.
- **RNG stream pozice**: `makeRng(state,'battle')` čte/zapisuje `state.rng.streams.battle` (rng.js:34/36). Stream `'battle'` JE ve fixním `STREAM_NAMES` (rng.js:10) a součástí save. ⇒ Posuv streamu přežije save → load pokračuje ze stejné rng pozice. **Kritické pro kill-resume — POTVRZENO.**
- **rng objekt = closures**, ALE se NEukládá do `state.battle` — design vytváří `rng` lokálně v `battleTick` přes `makeRng` (§3.1) a předává jako parametr do `battleStep`. ⇒ Žádná closure/funkce neproniká do `state.battle`. **Serializovatelnost zachována.**

**OSTRAHA (major, F-1) — plný passthrough je dvojsečný**: protože `persistSchema.js:300` ani `load.js:247` battle **nijak nesanitizují**, save zachová cokoli, co do `state.battle` vložíš — **včetně případné neserializovatelné hodnoty** (funkce, undefined, cyklická reference, `Side.army` self-ref z originálu ř.249-251). Originál `attackWith` nastavoval `units.army = player` (ř.249) → **cyklická reference player↔units**. Pokud to Sonnet portuje 1:1, `JSON.stringify` v save **selže nebo ztichne na cyklu**. Design správně tuto cyklickou referenci **neuvádí** ve své `BattleState` (§3.2 nemá `army`), ale musí být **explicitně zakázána**:
- **Podmínka F-1**: Sonnet NESMÍ zavést do `state.battle` žádné: (a) funkce/closury, (b) cyklické reference (orig `units.army`, `units.liege` jako objekt — design správně používá `liege: string`), (c) `undefined` hodnoty, (d) `lastAttack` jako **objekt** (orig ř.469) — design správně používá `lastAttackId: string` (§3.2). **Coder musí použít `liege:'player'|factionId|'bandits'` (string) a `lastAttackId` (string), NE objektové reference.** Doporučení testu: §10.3 kill-resume snapshot musí ověřit `JSON.parse(JSON.stringify(state.battle))` round-trip bez ztráty (nebo přes existující `hashState`).

Pokud F-1 dodrženo, kill-resume je bit-identický (test §10.3 to potvrdí). **A4 splněno.**

---

## 3. NÁLEZY

### BLOCKER — žádný

### MAJOR

**M-1 — `state.player.baseRevival` ve state NEEXISTUJE (gap).**
Ověřeno: `grep baseRevival` v `src/` = **0 výskytů**. Originál čte `$rootScope.player.baseRevival` (battle.js:311) — v repu žádné takové pole. Design §6.5 bod 4 to anticipuje („pokud chybí, deterministický fallback"), ale nechává to jako podmíněné. **Učiň to závazným**:
- *Návrh*: `revivePlayer` bere `baseRevival` parametrem; volající (`resolveBattleOutcome`) čte `state.player.baseRevival ?? BALANCE.battle.baseRevivalDefault` (např. 0.25, provenance:'approximated'). Vzor DR-017-01 m-4 (fallback při chybějícím poli). Bez toho `revivePlayer(cas, undefined+…)` → `NaN` → rozbije outcome + hashState. **Coder MUSÍ ověřit existenci pole PŘED kódem a mít deterministický fallback v BALANCE.**

**M-2 — Opponent AI cd-decrement: originál dekrementuje cd DVAKRÁT za tick (subtilní, určuje timing).**
Ověřeno v originálu: `attackWith` nastaví `units.cd = attack.cd` (ř.476), a ZÁROVEŇ fight-loop pro opponenta dělá `opponent.warriors.cd--` (ř.274-277) a `opponent.archers.cd--` (ř.287-290) **po** případném útoku, KAŽDÝ tick. Player side se dekrementuje na začátku (ř.239-247). Design §3.3 krok 2 řeší jen player cd-down a §7.3 píše `cd-- (clamp ≥0)` pro opponenta — ale **pořadí vůči `attackWith` a fakt, že opponent cd-- běží i v ticku útoku, je pro determinismus i 1:1 timing zásadní**. Pokud coder dekrementuje opponent cd jinak (např. jen na začátku jako player), reaction-gating `cB.curStep == reaction` + následné `cd==0` opakování **posune timing** → odchylka od originálu a od referenčních testů.
- *Návrh*: Sonnet **musí portovat opponent AI 1:1 vč. pořadí**: (1) reaction-gated/cd-gated útok, (2) `cd--` clamp≥0 **po** útoku, oboje warriors→archers. Přidat do design §7.3 explicitní poznámku „cd-- běží i v ticku útoku, po `attackWith`". Doporučen referenční test reaction timing (první útok přesně na `tick==reaction`).

**M-3 — Crit roll uvnitř `getDamage` v originálu vs. „bool venku" v designu — pořadí spotřeby rng.**
Originál: crit se rozhoduje **uvnitř** `getDamage` jako `Math.random() < critChance` (ř.443) — tj. **rng se spotřebuje až v momentě výpočtu damage, per útok**. Design §4 bod 5 + §6.1 přesouvá crit ven (`critRoll = rng.next() < critChance` v `battleStep`, `battleDamage` bere bool). **Architektonicky správné** (drží `battleDamage` tabulkově testovatelný bez rng — souhlasím s touto volbou, §15 alternativa zamítnuta korektně). ALE: tím se **mění pořadí/počet `rng.next()` vůči originálu** (to je OK — originál není referenční pro rng pořadí, jen pro vzorce). Kritické je, aby **počet `rng.next()` byl pevný a deterministický**:
- *Návrh (potvrzení)*: přesně **1× `rng.next()` na crit roll per útok** (design §4 „NE per focus cíl" — správně). Guard: crit roll se musí provést **i když `units.number==0`/`cd≠0`?** NE — design §4 bod 2 dělá guard PŘED damage; pak crit roll je jen na skutečně provedeném útoku. To je konzistentní, ale **musí být deterministicky stejné live i offline** (stejná větev guardu → stejný počet rng.next()). Test §10.7 (rng stream izolace + počet spotřeb) to pokryje. Doplnit do §11 explicitně: „crit roll JEN když útok skutečně proběhne (po guardu number>0 && cd==0)".

### MINOR

**m-1 — `military.json` NEMÁ žádné combat staty (G-MILITARY-STATS gap potvrzen).**
Ověřeno: `military.json` má jen `{goldCost,id,name,upkeep}` pro archer/warrior — **žádné strength/defense/critChance/cd**. `faction.unitStats` (world.js:678) má jen `{strength,defense}` (NE critChance). Design §6.5 to řeší approximací + provenance — **souhlasím, OK pro MVP** (viz §6 tohoto review). *Minor*, protože je to vědomý gap s mitigací, ne chyba designu. Coder přidá `combat` blok + `_meta.battleStatsProvenance:'approximated'`. **AI critChance**: originál 0.1 (ř.129/138) — `faction.unitStats` to nemá, coder doplní konstantu 0.1 (provenance) v create.

**m-2 — `opponent.invasion.warriors/archers` zdroj v repu nejistý.**
Originál `create()` bere `opponent.invasion.warriors` (ř.148). Design §9.1 přiznává „odkud v repu?" a navrhuje fallback na capital forces. Ověřeno: `processAI` state 6 (world.js:1083) vkládá `startBattle` jen s `{attackerId, targetZoneId}` — **žádný invasion paket**. ⇒ `createBattleState` musí útočnou armádu odvodit z `faction` capital (vzor AI-AI world.js:1097 `capital.warriors`). *Minor* — design to deleguje na coder s rozumným fallbackem; doporučuji **závazně**: attacker forces = `getCapital(attackerId).warriors/archers` (NE neexistující invasion paket), aby nevznikl `undefined`→NaN.

**m-3 — `resolveBattleOutcome` mapování na repo API (insertInventory/pay/cullWorker/getCapital) neověřeno designem.**
Design §8.3 to deleguje na codera („Sonnet ověří proti kódu"). Akceptovatelné, ale je to největší kus nejistoty wiringu (T4). *Minor* — doporučuji, aby coder **nejdřív ověřil existenci helperů** a kde chybí, použil deterministickou přímou mutaci s clampem (design to zmiňuje). `raidedByAI` handler neexistuje → design správně doporučuje „mechanické ztráty inline, story event odlož na M8". Souhlasím.

**m-4 — End-check fáze `tick % 80 == 30` má semantický předpoklad o startovní hodnotě `tick`.**
Originál `cB.curStep` startuje na 0 (ř.95) a end-check je `curStep % 80 == 30` (ř.231) → první kontrola na ticku 30. Design §3.3 krok 1 portuje `bs.tick % 80 === 30`. **Musí být zachováno, že `bs.tick` startuje na 0** (design §3.2 `tick:0` implicitně, krok 6 `tick++`). *Minor/nit* — potvrdit, že `createBattleState` inicializuje `tick:0` a `reaction:60` aby reaction-gating `tick==reaction` (=60) a end-fáze 30 seděly 1:1. Doplnit do §3.2 explicitní init hodnoty.

**m-5 — Persist battle není sanitizován při loadu (robustnost starých/poškozených savů).**
`load.js:247` dělá `state.battle = payload.battle ?? null` bez validace. Pokud by budoucí formát savu nesl částečný/legacy battle objekt, načte se as-is. Pro M7b OK (battle je nový), ale *minor* poznámka pro testera: kill-resume test (§10.3) + schedule round-trip (§10.6) musí pokrýt i load battle=null (žádná aktivní bitva) i load uprostřed bitvy.

### NIT

**n-1 — `subAccMs/queue/meta` jako top-level pole `state.battle` vs. kontrakt §8.1.**
Kontrakt §8.1 (battle.js:11) definuje top-level `{zoneId, sides, state, tick, log, summary}`. Design přidává `subAccMs, queue, startedAtStep, reaction, attackerSide, banditLoot, meta` na top-level a v §3.2 sám nabízí vnoření pod `runtime` sub-objekt „pokud reviewer trvá na čistotě". **Netrvám** — kontrakt explicitně delegoval naplnění `BattleState` na M7 (battle.js:7 „contract is established here for M7 to implement"), a typedef v stubu je beztak `summary: any`. Top-level runtime pole jsou pragmatická a serializovatelná. *Nit*: pro čitelnost bych **doporučil** vnořit ryze-runtime pole (`subAccMs`, `queue`) pod `runtime:{}` sub-objekt, ať je top-level blízko kontraktu — ale nechávám na coderovi, není blokující.

**n-2 — `battleStep` čistota: stub vrací `{...bs, tick}` (shallow).**
Stub (battle.js:33) dělá shallow `{...bs}`. Design §3.3 bod 8 správně upozorňuje, že shallow nestačí — `sides`/`Unit` objekty se mutují, takže je nutný **strukturální klon side/unit na začátku** `battleStep`, jinak se zmutuje vstupní `bs` sdílený s předchozím save snapshotem (rozbil by kill-resume test, který drží starý snapshot). *Nit/potvrzení*: design to zmiňuje („doporučeno strukturální klon"), ale udělej to **závazným** — bez hlubokého klonu (nebo immutable update) je determinismus testu §10.2 ohrožen. Levné: jen `sides.player/opponent` + jejich 2 Unit objekty.

**n-3 — Konstanty: design váhá `military.json._battle` vs `BALANCE.battle`.**
Design §3.1/§5 doporučuje BALANCE.battle pro konstanty a `military.json` pro attacks katalog. *Nit* — souhlasím s BALANCE.battle pro `BATTLE_TICK_MS/reactionDefault/endCheckPeriod` (konzistence s ostatními systémy); attacks katalog kamkoli, ať je u dat vojska. Jen ať je to **jedno místo**, ne rozprostřené.

---

## 4. OVĚŘENÍ KONTRAKTU §8.1 + tickOrder

- **`battleStep(bs, commands, rng) → bs'`** signatura **beze změny** — POTVRZENO proti stubu (battle.js:29). Design ji drží (§0, §13). ✅
- **`battle.tick` step order 30** — POTVRZENO (tickOrder.js:230), žádná změna pořadí potřeba. ✅
- **`battleTick` import + register** — POTVRZENO (tickOrder.js:25/162). M7b jen naplní tělo. ✅
- **`startBattle` handler** registrován jako `'startBattle'` (world.js:1228) a schedule insert používá `'startBattle'` (world.js:1083) — **názvy sedí**. ✅ Coder naplní `startBattleStub` (world.js:1189).
- **`world.takeOver`** existuje (world.js:1178). ✅
- **`aiBattleResolve`** existuje (formulas.js:380), M7a-2, **nesahat**. ✅

---

## 5. POSOUZENÍ SPLITU — SOUHLASÍM: **NE (split nedělat)**

Souhlasím s architektem. Odůvodnění držím proti kódu:
1. **G2 zadarmo POTVRZENO** (§1) → největší L-rozměr T1 zmizel. T1 je tím spíš M-velikosti než L.
2. **M7b-1 by NEBYL samostatně hratelný** — `startBattleStub` (world.js:1189) je jediný spouštěč a je v T4. Bez T4 je battle automat **mrtvý kód** bez UI/spouštěče. To je opačná situace než M7a-2 (kde T2→T3 byly hratelné samostatně, proto split=NE tam taky). Argument architekta je správný.
3. **T2/T3/T4/T5 jsou přírůstky**, ne paralelní L (ověřeno: aiBattleResolve hotové, takeOver hotové, stub existuje, UI vzor M7a-2).
4. **Fallback split M7b-1(T1+T2+T3)/M7b-2(T4+T5)** zůstává otevřen bez dopadu na architekturu (kontrakt stejný) — **rozumná pojistka** pokud Sonnet narazí na složitost (sub-step akumulátor + cyklus serializace + 5 attacků). Souhlasím s ponecháním otevřené.

**Doporučení**: jedna iterace, default. Split jen jako orchestrátorský fallback při zaseknutí na T1.

---

## 6. G-MILITARY-STATS (approx player staty, provenance, M9) — **OK**

Souhlasím s rozhodnutím (design §6.5). Ověřeno, že gap je reálný (m-1: `military.json` bez combat statů, `faction.unitStats` bez critChance, `baseRevival` neexistuje). Approximace + `provenance:'approximated'` + kalibrace M9 je **správný postup** — jsou to balanční čísla (R-F), neblokují determinismus ani correctness vzorců. **Eskalace na tom-proxy NENÍ nutná** (DR-001/Q3 vzor — balanční čísla ladí M9). Podmínka: **každá approximovaná hodnota MUSÍ nést provenance flag** (strength/defense/critChance/baseRevival/bandití staty/banditPeriod) a být v jednom konfiguračním místě, ať M9 kalibrace je triviální.

---

## 7. PODMÍNKY GO (co coder MUSÍ dodržet)

1. **M-1**: `revivePlayer` fallback `baseRevival` z BALANCE (deterministický, provenance) — pole ve state neexistuje. Ověřit PŘED kódem.
2. **M-2**: Opponent AI port 1:1 vč. **double cd-decrement** (cd-- po `attackWith`, každý tick, warriors→archers). Referenční test reaction timing.
3. **M-3**: Crit roll přesně 1× `rng.next()` per **skutečně provedený** útok (po guardu number>0 && cd==0). Doplnit do §11.
4. **F-1 (serializovatelnost)**: ŽÁDNÉ funkce/closury/cyklické reference/`undefined` v `state.battle`. `liege` a `lastAttackId` jako **string**. Žádný orig `units.army`. Kill-resume test (§10.3) + JSON round-trip.
5. **G2-1**: `battleStep` čte JEN `bs` + rng stream 'battle'. Povinný test §10.4 (advance vs runCatchupBatch → identický summary+hashState).
6. **n-2/§3.3-8**: hluboký klon `sides`+`Unit` na začátku `battleStep` (ne shallow `{...bs}`).
7. Všechny approx hodnoty s `provenance` flagem (m-1, G-MILITARY-STATS).

Testy §10.1-10.7 jsou **kompletní a správně pokrývají** determinismus, kill-resume (§10.3 s nenulovým subAccMs), G2 (§10.4) a edge (0 jednotek, dělení nulou). **§10.3 + §10.4 jsou release-critical** — bez nich GO neplatí empiricky.

---

## 8. SOUHRN NÁLEZŮ

| Severity | Počet | ID |
|---|---|---|
| BLOCKER | 0 | — |
| MAJOR | 3 | M-1 (baseRevival gap), M-2 (opponent cd double-decrement), M-3 (crit rng pořadí) + ostraha F-1 serializovatelnost |
| MINOR | 5 | m-1 (military combat staty gap), m-2 (invasion forces zdroj), m-3 (outcome API mapping), m-4 (tick/reaction init), m-5 (load battle sanitizace) |
| NIT | 3 | n-1 (runtime pole vs kontrakt), n-2 (hluboký klon), n-3 (konstanty místo) |

---

## 9. ZÁVĚR

**GO s podmínkami.** Design je solidní, drží kontrakt §8.1 beze změny, a klíčová tvrzení jsou PROTI KÓDU ověřena:

- **G2 auto-resolve == live = STRUKTURÁLNĚ ZADARMO** — POTVRZENO (advance i runCatchupBatch volají identický `step()`→`battleTick`→`battleStep`; tickOrder.js:230 `every:'step'`). Žádná druhá implementace. ✅
- **Kill-resume serializovatelný = DOSAŽITELNÝ** — POTVRZENO (persistSchema.js:300 + load.js:247 plný passthrough; rng stream 'battle' v save; žádné closury v `state.battle`). Podmíněno F-1 (žádné neserializovatelné hodnoty/cykly — orig `units.army` MUSÍ vypadnout). ✅
- **Split = NE** — SOUHLASÍM (M7b-1 nehratelný bez spouštěče v T4; fallback otevřen). ✅
- **G-MILITARY-STATS approx** — OK (provenance + M9, neblokuje). ✅

3 MAJOR jsou upřesnění pro 1:1 originál + determinismus (baseRevival fallback, opponent cd, crit rng pořadí) — žádné z nich nemění architekturu, jen vážou codera na přesnou implementaci. Povinné gate testy: §10.3 (kill-resume) a §10.4 (G2 == live). Po jejich zelené je M7b empiricky potvrzeno.

*Konec REVIEW-018-002.*
