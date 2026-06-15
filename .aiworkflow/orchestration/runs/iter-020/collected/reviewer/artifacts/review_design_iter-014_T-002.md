# Review — DESIGN M5-2 (kontrakty K14 + build UI), iter-014 T-002

- **Task**: T-002, iter-014 (BRIEF-014-002)
- **Autor**: reviewer (Opus)
- **Datum**: 2026-06-14
- **Reviewovaný artefakt**: `agents/architect/artifacts/final/design_iter-014_T-001.md` (M52-D1..D9, §1–§13)
- **Typ**: architektonický gate PŘED implementací (žádný produkční kód neexistuje — ověřeno grepem `contractQueue`/`registerContractEffects`/`systems/contracts` = 0 výskytů)
- **Reference ověřené proti kódu**: `effects.js`, `registry.js`, `tickOrder.js` (runTick), `scheduler.js`, `main.js` (bootstrapEngine), `rng.js` (STREAM_NAMES), `persistSchema.js`, `load.js`, `migrations.js`, `schema.js`, `dispatch.js`, `build.js`, `sendCaravan.js`, `createInitialState.js`, `createHomeState.js`, `ui/{App,selectors,screens}.js`

---

## Verdikt: **GO — s podmínkami**

Design je věcně správný, doložitelný z originálu, a v souladu s architekturou iter-002 (K0/K11/K13/K14/K16/K17, §5.4/§6/§7/§8). Klíčové invarianty (determinismus, serializovatelnost schedule, izolovaný rng stream, žádná změna command vrstvy) jsou v návrhu ošetřené a ověřitelné proti kódu. **M52-D8 (boot registrace) je reálný kritický bod — potvrzen proti kódu — a návrh ho řeší korektně.**

Podmínky před GO do implementace (BLOCKER+MAJOR, detail níže):
- **B1**: do boot wiring (M52-D8 §6.4) doplnit i `registerBuild(creg)` — dnes NENÍ wired, bez něj build UI (T6) nefunguje.
- **B2**: vyřešit bootstrap generátoru `contract.offer` pro EXISTUJÍCÍ savy (load cesta) — `createInitialState` se po loadu nevolá, takže staré savy bez naplánovaného offeru nikdy negenerují kontrakty.
- **M1**: explicitně potvrdit, že SAVE_VERSION (=3) se NEbumpuje a žádná migrace se nepřidává (nová pole jsou pod undefined-guardem); pokud se bumpne cokoliv jiného, přidat v3→v4 no-op/contract migraci.

Splitové doporučení: **NEsplitovat** — T5+T6 souzní do jedné iterace (zdůvodnění §7 níže).

---

## Posouzení M52-D8 (boot registrace) — KRITICKÉ, ověřeno proti kódu

**Potvrzuji tvrzení designu.** `bootstrapEngine` (`main.js:86-103`) skutečně **NEvolá `registerEffects(registry)`**. Registr (`createRegistry()`) je naplněn výhradně přes `registerCorePeriodics(registry)` (`tickOrder.js:144-176`), který registruje system fns + `'noop'` (řádek 146) + `'caravanReturns'` (řádek 162).

Řetězec selhání je reálný:
- `runTick` phase 2 (`tickOrder.js:117-121`) volá `resolve(ctx.registry, entry.id)` pro každou due schedule entry.
- `resolve` (`registry.js:44-51`) v DEV (vždy true, iter-004) **hodí `registry: unknown id`** pro neregistrované ID.
- Pokud `contract.offer`/`contract.expire` nejsou registrovány, první odpálení ze schedule = throw → runTick padá → loop crash.

**Návrh `registerContractEffects(registry)` v bootstrapEngine je korektní:**
1. Registruje handlery do **téhož registru**, který `runTick` resolvuje v phase 2 (`ctx.registry`). Sedí — `bootstrapEngine` vrací `{ ctx: { registry, ... } }`, ten je předán do `runTick`.
2. **Nerozbije existující schedule resolve**: `register()` (`registry.js:30-35`) je idempotentní pro stejnou referenci a hodí jen na ID-kolizi s JINOU funkcí. Contract ID (`contract.offer`/`contract.expire`/`contract.complete`) jsou nové, žádná kolize s existujícími (`caravanReturns`, `population.*`, `noop`…). Precedent: `caravanReturns` je už dnes registrován v periodics a resolvuje se ve schedule fázi bez problémů (viz `sendCaravan.js:118` → `scheduleInsert(... 'caravanReturns' ...)`).
3. **`noop` už registrován** (`tickOrder.js:146`) → `onExpire/onReject = {effect:'noop'}` se resolvne. Korektní, design to tvrdí (§4.1, §6.4).
4. Bootstrap je volán fresh i po loadu (`main.js:172`, registry není v save) → handlery dostupné v obou cestách. Korektní.

**Pozn. k `registerEffects(registry)` (M1 stuby) v §6.4:** Design navrhuje přidat i `registerEffects(registry)` (effects.js: createScholars/unlockBuilding/… M1 stuby). To je **bezpečné, ale pro min. sadu M5-2 NENÍ nutné** — žádný contract v min. sadě (goodsSeller/goodsBuyer) tyto efekty nepoužívá. Není to blocker; pokud se přidá, hlídat, že M1 stuby (s `console.log`) neporušují gate-allow konvenci (mají `// gate-allow` komentáře — OK). **Doporučení (MINOR-3):** přidat `registerEffects` jen pokud nějaký onBuild/onUnlock efekt už je v boot potřeba; jinak nech jen `registerContractEffects` (menší povrch). Tím se vyhne riziku, že stub `console.log` poletí v tichém prod běhu.

**Verdikt M52-D8: KOREKTNÍ.** Reálný kritický bod, návrh ho řeší správně a bez rozbití existujícího resolve. Viz však B1 (registerBuild) — analogický boot-wiring gap, který design přehlédl.

---

## Posouzení determinismu contract streamu — ověřeno proti kódu

**Potvrzuji bezpečnost přidání `'contracts'` na KONEC `STREAM_NAMES`.**

Reálný kód (`rng.js:9`): `STREAM_NAMES = ['population','forest','mine','field','market','world','battle','events','buildings']`. **`'buildings'` už je přidán na konci** (M5-1, iter-013) — tj. **existuje přímý precedent** přesně téhož postupu, který tento design navrhuje. Review M5-1 (T-009) tento postup potvrdil jako G1-safe.

Mechanika (`rng.js:31-60`):
- `initRng` seeduje stream jako `(base + (i+1)*0x9E3779B9)`. Přidání jména na konec **nemění index `i` žádného existujícího streamu** → seedy existujících streamů beze změny. Determinismus zachován (G1/K16).
- `makeRng` (`rng.js:33`): `state.rng.streams[name] ?? 0` — staré savy bez `'contracts'` streamu → default 0, deterministicky. `initRng` je guardován `if (state.rng.streams[name] === undefined)` → nepřepíše existující, ale doplní chybějící POUZE pro fresh hru (NEvolá se po loadu — `main.js` volá `initRng` jen v `bootstrapNewState`, ne po loadu). Tj. starý save dostane `'contracts'` až při prvním `makeRng` (lazy default 0) — deterministicky.

**hashState test (M52-R4):** `hashState` (`rng.js:68`) serializuje celý state se sorted keys. Pro EXISTUJÍCÍ save (bez contractQueue/contractSeq/contracts stream) se hash NEmění, protože:
- `STREAM_NAMES` je modulová konstanta, NE součást state → přidání jména do pole hash neovlivní.
- `contractQueue`/`contractSeq` v starém save chybí; init je doplní (`[]`/0) — TO hash fresh hry změní (nová pole), ale ne hash existujícího save round-tripu (save→load→save dá totéž). **Reviewer gate pro codera:** ověřit, že fresh-game hashState reference se aktualizuje (přidání contractQueue=[]/contractSeq=0/contracts stream=0 změní fresh hash — to je OČEKÁVANÉ a testy referenčních hashů se musí přegenerovat, ne považovat za regresi). Tuto nuanci design v §6.3/M52-R4 zmiňuje, ale doporučuji ji explicitně uvést jako "fresh hash se mění, round-trip ne" (NIT-1).

**Determinismus lifecycle:** `contract.id = 'contract_'+contractSeq` (čítač, ne Date.now), `deadlineStep = curStep + expDays*STEPSPERDAY` (herní čas), generátor jen `makeRng(state,'contracts')`. Žádný Date.now/Math.random/DOM v core. Ověřeno proti vzoru existujících systémů. **KOREKTNÍ.**

**Verdikt determinismu: KOREKTNÍ a G1-safe**, s precedentem 'buildings' streamu z M5-1.

---

## Nálezy podle závažnosti

### BLOCKER

**B1 — `registerBuild(creg)` chybí v boot wiringu; bez něj build UI (T6) nefunguje.**
- *Důkaz proti kódu:* `main.js:86-103` `bootstrapEngine` registruje commandy: setSpeed, assignJob, startSkill, setTaxRate, buyGoods, sellGoods, sendCaravan, **buyCompany** — ale **NE `registerBuild`**. `registerBuild` existuje (`build.js:147`), ale nikde se nevolá (grep: jen export + def). Build command z M5-1 je tedy "dark code".
- *Dopad:* T6 BuildScreen volá `send('build', {itemId})` (§7.3). `dispatch` (`dispatch.js:53-57`) vrátí `{ok:false, error:'unknown command: build'}` → tlačítko "Postavit" nic neudělá. Build UI je nefunkční navzdory existujícímu commandu.
- *Proč to design přehlédl:* §6.4 řeší jen NOVÉ contract wiring (`registerContractCommands`) a tvrdí "Build/buyCompany commands UŽ existují (M5-1)" (§1) — což je pravda pro existenci kódu, ale ne pro registraci. M52-D8 správně identifikoval, že registr efektů je nenavázaný; analogický command-wiring gap pro `build` ale unikl.
- *Návrh:* do `bootstrapEngine` přidat `registerBuild(creg);` (vedle `registerBuyCompany`). Doplnit do §6.4 boot bloku a do kroku T5.7 (boot wiring). Reviewer/tester gate: `send('build', {itemId:'<validní>'})` vrátí `{ok:true}` po boot.

**B2 — Bootstrap generátoru `contract.offer` se pro EXISTUJÍCÍ savy nikdy nenaplánuje.**
- *Důkaz proti kódu:* Design §5.1/§6.2 plánuje první `contract.offer` v `createInitialState.js` (guard `scheduleCountOf===0`). Ale `loadAndReconstruct` (`load.js:255`) volá `createInitialState` jako Step 3 — TZN. fresh init SE pro load volá. **Ale** `applyPayload` (Step 4) pak přepíše `state.engine.schedule = payload.engine.schedule` (`load.js:90`) **celým saved heapem** → naplánovaný `contract.offer` z createInitialState je ZAHOZEN a nahrazen saved schedule. Starý save (vytvořený před M5-2) saved schedule `contract.offer` NEobsahuje → po loadu žádný generátor → kontrakty se nikdy negenerují pro hráče s existující hrou.
- *Pozn.:* pro FRESH hru je to OK (createInitialState naplánuje, nic to nepřepíše). Problém je výhradně migrace existujících saveů na M5-2.
- *Návrh (vyber jednu cestu, design ji musí určit, ať Sonnet nerozhoduje):*
  - (a) **Re-arm po loadu**: v `load.js` Step 5 (nebo v boot po loadu) idempotentně `if (scheduleCountOf(state,'contract.offer')===0) scheduleInsert(state, max(curStep, firstOfferStep), 'contract.offer', {})`. Guard zajistí, že fresh save (který offer MÁ) se nepřeplánuje 2×. Toto je nejrobustnější (řeší fresh i starý save jednou cestou) a souzní s M52-R3 guardem.
  - (b) Migrace v3→v4, která doplní `contract.offer` do `payload.engine.schedule` + bump SAVE_VERSION. Funkční, ale dražší (nová verze, dotýká se víc savů).
  - *Doporučení:* cesta (a) — re-arm s `scheduleCountOf` guardem v load/boot. Současně to elegantně řeší i fresh hru (lze offer plánovat JEN přes tento re-arm a vynechat createInitialState plánování, aby byla jedna cesta — DRY, analogie M-2 "žádná load-only větev"). Design §5.1 dnes navrhuje plánovat v createInitialState + guard; doporučuji přesunout plánování VÝHRADNĚ do post-load/post-init re-arm helperu volaného z obou cest (mirror vzoru `rebuildBuildingDerived`/`marketInit`, které běží fresh i po loadu z `main.js`).
- *Pozn. k `marketInit`:* precedent existuje — `main.js:180` volá `marketInit` po loadu i fresh (idempotentní, skips existing). Stejný vzor lze použít pro `armContractOffer(state)`.

### MAJOR

**M1 — Migrace savů: rozhodnutí "bump nebo ne" musí být v designu explicitní, ne otevřená otázka.**
- *Důkaz proti kódu:* `validateEnvelope` (`load.js:21-33`) hodí na `rec.saveVersion !== SAVE_VERSION` (=3, `schema.js:14`). `migrate` (`migrations.js`) řeší jen verze < 3. Nová pole `contractQueue`/`contractSeq` jsou v `applyPayload`/`applyPersist` pod `!== undefined` guardem (jako precedent projectQueue/ownedCompanies) → starý v3 save se načte bez nich, init je doplní (`[]`/0). **Tj. žádná nová migrace ani bump NENÍ nutný**, pokud SAVE_VERSION zůstane 3.
- *Dopad:* Design §6.2 ptá "potřeba migrace savů (nové pole)?" jako otevřenou otázku — to je architektonické rozhodnutí, které coder (Sonnet) nemá dělat. Pokud necháno otevřené, riziko, že coder zbytečně bumpne verzi (rozbije round-trip starých saveů, které pak vyžadují migraci) NEBO nechá pole bez init (NaN/undefined v selektoru).
- *Návrh:* design explicitně zafixuje: **"SAVE_VERSION zůstává 3; žádná migrace; contractQueue/contractSeq init v createHomeState (`[]`/0) pod allowlist undefined-guardem — starý v3 save se načte korektně bez migrace."** Provázat s B2: re-arm generátoru řeší chybějící schedule (to migrace pole NEpokrývá — schedule je v `engine`, ne v `home`). Tj. i bez bumpu pole je B2 nutný zvlášť.

**M2 — `contractQueue`/`contractSeq` chybí v PERSIST_SCHEMA allowlistu i ve factory; design specifikuje jen applyPersist/applyPayload větve.**
- *Důkaz proti kódu:* `PERSIST_SCHEMA.home` (`persistSchema.js:17`) je `['settlementLevel','workerEfficiency']` + sub-domény řešené ad-hoc bloky. projectQueue/projectSeq/ownedCompanies se řeší přímými `if (s.home.X !== undefined)` bloky (NE přes PERSIST_SCHEMA pole) — `persistSchema.js:201-215`. `createHomeState` (`createHomeState.js`) inicializuje projectQueue=[]/projectSeq=0/ownedCompanies={}.
- *Dopad:* Design §6.2 ukazuje applyPersist/applyPayload bloky korektně (analogicky projectQueue), ale **NEzmiňuje init v `createHomeState`**. Bez `contractQueue=[]`/`contractSeq=0` v factory bude fresh hra mít `state.home.contractQueue === undefined` → generátor `push` na undefined hodí, selektor `Object.entries(undefined)` hodí. Design §6.2 zmiňuje init v "createInitialState.js" (řádek 321) — ale reálně se home pole inicializují v `createHomeState.js` (volaný z createInitialState). Drobná nepřesnost cesty, ale codera může zmást.
- *Návrh:* design upřesní krok T5.2: **init `contractQueue=[]`/`contractSeq=0` v `createHomeState.js`** (vedle projectQueue/projectSeq, řádek 36-38), NE v createInitialState. applyPersist/applyPayload bloky jsou OK jak jsou navrženy. PERSIST_SCHEMA.home pole se rozšiřovat nemusí (precedent: projectQueue tam taky není, řeší se ad-hoc blokem).

### MINOR

**MINOR-1 — `contractSeq` round-trip a kolize ID po loadu — gate ano, ale ověř i fresh→save→load→generate.**
- Design §6.2 reviewer gate ověřuje "contractSeq pokračuje (žádná kolize)". Doplnit konkrétně: po loadu save s contractSeq=N musí další generovaný kontrakt dostat `contract_N` (ne `contract_0`). Protože contractSeq je v home allowlistu (M2), přežije — OK, ale test to musí explicitně pokrýt (analogie projectSeq). Akceptovatelné jak navrženo, jen zdůraznit v T5.6 testu.

**MINOR-2 — Úklid schedule při předčasném dořešení (§4.4) ponechán jako "idempotentní no-op" — souhlas, ale heap-growth při dlouhé hře.**
- `completeContract`/`rejectContract` nechá osiřelý `contract.expire` v heapu (idempotentní no-op přes guard `status==='active'`). Korektní funkčně (ověřeno: `scheduleDue`/`popMin` udržuje scheduleCount, handler je no-op). Pro min. sadu M5-2 OK (heap malý). Ale při dlouhé hře s mnoha completed kontrakty heap roste o mrtvé entry až do jejich deadlineStep. `scheduleCancel` (`scheduler.js:131`) EXISTUJE a funguje (re-heapify). *Návrh:* ponechat default (no-op) pro M5-2 jak navrženo, ale do gap/backlog poznamenat `G-CONTRACT-SCHED-CLEANUP` (volitelný scheduleCancel) pro M9, ať to není ztracené. Není blocker.

**MINOR-3 — `registerEffects` (M1 stuby) v boot (§6.4): přidávat jen pokud nutné.**
- Viz M52-D8 posouzení výše. M1 stuby mají `console.log` (`effects.js`). Pro min. sadu kontraktů nejsou potřeba. Doporučení: registrovat jen `registerContractEffects` (`contract.offer`/`contract.expire`), `registerEffects` vynechat, dokud onBuild/onUnlock datový efekt skutečně neběží v boot. Sníží povrch + riziko stub console.log v běhu.

**MINOR-4 — `getGoldValue` před market init v catch-up (M52-R7) — ověřeno, OK, ale upřesnit firstOfferStep.**
- `marketInit` běží v `main.js:180` PŘED loop i catch-up → marketState existuje, když se generátor odpálí. `getGoldValue` (`market.js:91`) čte marketState. Riziko jen pokud `firstOfferStep=0` a offer by se odpálil v kroku 0 před marketInit — ale boot pořadí (`marketInit` ř.180, catch-up ř.275) garantuje market dřív. Design `BALANCE.contracts.firstOfferStep:0` (§5.3). *Návrh:* nastavit `firstOfferStep ≥ 1` (alespoň 1 quarterDay) pro jistotu a konzistenci s M52-R7 textem, který sám doporučuje "firstOfferStep ≥ 1 quarterDay". Drobná nekonzistence designu (§5.3 dává 0, §10 R7 dává ≥1). Sjednotit.

### NIT

**NIT-1 — hashState: explicitně odlišit "fresh hash se mění (nová pole) vs. round-trip hash stabilní".** Viz determinismus výše. Přidat větu do §6.3, ať tester nepovažuje změnu fresh referenčního hashe za regresi.

**NIT-2 — `title` jako serializovaný UI text v contractQueue (§2).** Ukládá se `title` (lidský popis) do save. Funkčně OK (plain string, serializovatelné), ale je to UI-text v core/save — drobné porušení "žádný UI v core" ducha (precedent: žádné jiné pole nedrží lokalizovaný text v save). Alternativa: držet jen `type` v save a `title` derivovat z katalogu v selektoru (`byId(type).entry.title`). Úspora a čistší. Není blocker (title je z katalogu, deterministický), ale doporučuji `title` NEukládat a derivovat v `selectContracts` (§7.2) — konzistentní s "deriváty se neukládají". Pro generované cost/reward to nejde (jsou dynamické), ale title je statický z katalogu.

**NIT-3 — `kind` pole katalogu (§3.3) vs. generátor jen 'supply'.** Min. sada generuje jen `kind:'supply'`. `goodsBuyer` (demand) je v katalogu, ale `pickContractType` v min. sadě vybírá jen supply (§5.1). Tj. goodsBuyer je v katalogu, ale negeneruje se → "dark" katalog entry. Buď generovat oba (demand i supply), nebo goodsBuyer označit jako M6+ a nedávat do min. katalogu (vyhne se matení, že entry existuje, ale nikdy se nenabídne). Drobnost.

---

## Odpovědi na 7 zaměřených bodů briefu

**1. Kontrakty přes registr efektů K14 — mapování z events.js korektní?**
ANO. Klíčové zjištění designu (M52-D1, §2 pozn.) je správné a ověřitelné: originál `onComplete/onExpire/onReject` jsou UŽ string-ID callbacky (`'contractGoodsBuyerComplete'`) volané přes `callFn` — NE imperativní háčky. Design je mapuje 1:1 na `{effect:string, ...params}` v datech (K14/§5.4). Žádné imperativní callbacky rozseté po kódu se nezavádějí. Generický `contract.complete` (pay+grant) je legitimní DRY sjednocení per-typ completion z originálu (config.js:3251-3264 uniformní vzorec). **Soulad s K14/§5.4: PLNÝ.**

**2. Serializovatelnost/determinismus — survive save/load, deadlineStep, rng stream.**
ANO, s podmínkou B2. contractQueue/contractSeq = plain-data (structuredClone-safe). Schedule eventy (`contract.offer`/`contract.expire`) v `engine.schedule` jsou persistovány (`persistSchema.js:62-64`, `load.js:90-91`) → expirace přežije round-trip (deadlineStep absolutní → odpálí se na původním kroku, ne přeplánovaný). Izolovaný rng stream 'contracts' na KONEC STREAM_NAMES — G1-safe (precedent 'buildings', ověřeno). Deriváty (canComplete/daysLeft) se NEukládají (selektor §7.2) — korektní. **JEDINÁ trhlina: B2 (offer bootstrap pro staré savy).**

**3. M52-D8 (kritické) — boot registrace.**
KOREKTNÍ, viz dedikovaná sekce výše. registerContractEffects v boot je nutný a správný, nerozbije existující schedule resolve, command vrstva beze změny (G-BUILD-TXAUDIT zůstává). **PŘEHLÉDNUTO: B1 (registerBuild analogicky chybí).**

**4. Persist schéma + round-trip + migrace.**
Schéma korektní (M2: init patří do createHomeState, ne createInitialState — upřesnit). Round-trip OK pro schedule + pole. **Migrace: M1 — rozhodnutí musí být explicitní (žádný bump, žádná migrace pole; ale B2 řeší schedule re-arm zvlášť).**

**5. Build UI — jen selektory + commands, žádná logika v UI.**
ANO. §7 sleduje vzor existujících screenů (CouncilScreen/MarketScreen: `select*` → render → `send`). scaleCost je v selektoru přes `scaleCostByCount` (formulas.js, existuje), canComplete/canAfford v selektoru přes `canAfford` (transactions.js). Žádná herní logika v komponentách. **Soulad s §3.4: PLNÝ.** (Pozor: B1 — build command musí být wired, jinak je read-only UI bez funkčního write.)

**6. Soulad s architekturou + gapy.**
PLNÝ soulad s §5.4/§6/§7/§8 a K0/K11/K13/K14/K16/K17. Gapy korektně označené: G-CONTRACTS-CATALOG (zúžen na rozsah+kalibraci M9, informativní), G-CONTRACT-GEN (perioda/výběr approximated), G-BUILD-TXAUDIT (zděděný z M5-1/DR-013-01 M-4, akceptovaný — pay/grant bez ctx mění gold/goods správně, jen emitTx audit chybí; ověřeno proti build.js precedentu). Žádná nehlášená odchylka od arch. Návrh G-CONTRACT-SCHED-CLEANUP (MINOR-2) doplnit do backlogu.

**7. Proveditelnost pro Sonnet + split T5/T6.**
Design je dostatečně konkrétní (§12 dekompozice na T5.1–T5.7 + T6.1–T6.4 s testy a závislostmi). Po doplnění B1/B2/M1 (3 architektonická rozhodnutí, která coder nemá dělat sám) je Sonnet-proveditelný bez dalšího arch rozhodnutí. **Split: NE** — viz níže.

---

## Doporučení splitu: **NEsplitovat (ano do jedné iterace)**

- M5-2 je menší než M5-1 (2 impl tasky vs. 4). T5 (kontrakty, 7 sub-kroků) je samostatně testovatelný přes commandy bez UI. T6 (build UI + contracts panel) je tenká vrstva selektory+screeny+taby nad existujícím vzorem.
- Závislosti jsou čisté a lineární (§12): T6.1 build selektory NEzávisí na T5 (jen M5-1 stav). T6.2 selectContracts závisí na T5.5 (commands). Tj. T6 se dá implementovat hned po T5 ve stejné iteraci.
- T5+T6 dohromady uzavírají DoD M5 (DR-013-01). Split by odložil vyhodnocení DoD bez zisku — žádný z tasků není rizikově velký.
- Jediné cross-cutting riziko (boot wiring) je centralizované v jednom souboru (main.js) a pokryté B1+B2 — ne důvod ke splitu.

**Závěr: jedna iterace, pořadí T5 (→ T5.7 boot wiring vč. B1/B2) → T6.**

---

## Souhrn nálezů

| Závažnost | Počet | ID |
|---|---|---|
| BLOCKER | 2 | B1 (registerBuild chybí), B2 (offer bootstrap pro staré savy) |
| MAJOR | 2 | M1 (migrace/bump rozhodnutí), M2 (init v createHomeState + cesta) |
| MINOR | 4 | M-1 (contractSeq round-trip test), M-2 (schedule cleanup gap), M-3 (registerEffects jen pokud nutné), M-4 (firstOfferStep ≥1 sjednotit) |
| NIT | 3 | N-1 (fresh vs round-trip hash), N-2 (title neukládat/derivovat), N-3 (goodsBuyer dark katalog) |

**Verdikt: GO — s podmínkami** (B1+B2+M1 zapracovat do designu PŘED kódem; M2 upřesnit cestu init). M52-D8 KOREKTNÍ. Determinismus contract streamu KOREKTNÍ a G1-safe. Split NEdoporučen.

*Konec review. Zdrojem pravdy pro K/D/§ je architektura iter-002; pro lifecycle originál (events.js/home.js/config.js). Nálezy ověřeny proti reálnému kódu (effects.js/main.js/rng.js/tickOrder.js/scheduler.js/persistSchema.js/load.js/migrations.js/dispatch.js/build.js/sendCaravan.js/createInitialState.js/createHomeState.js/ui).*
</content>
</invoke>
