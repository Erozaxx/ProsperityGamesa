# Prosperity rebuild – návrh architektury projektu (iter-002, T-001)

- **Task**: T-001, iter-002 (BRIEF-005)
- **Autor**: architect
- **Datum**: 2026-06-12
- **Revize**: T-003 (BRIEF-007), 2026-06-12 – zapracovány všechny nálezy review T-002 (S-01..S-06, N-01..N-04 + povýšení R-I); mapa změn v `rework_iter-002_T-003.md`. Podstata rozhodnutí D1–D13 beze změny.
- **Vstupy**: rozcestník `.aiworkflow/project/architecture/iter-02-input-rozcestnik.md`; zadání `.aiworkflow/zadani_projektu.md`; doména `doc/original_source_doc.md`; iter-01 artefakty: T-001 (mechaniky), T-002a (výkon/offline/server), T-002b (údržba/architektura), T-004 (rework G1/G2), review T-003 (**K0–K19**, **R1–R4**)
- **Účel**: realizační návrh projektu – stack, struktura a vrstvení, engine & čas, datový a save model, transakční vrstva, rozpad do iterací, rozhodnutí R1–R4, rizika. **Žádná implementace**; analýzy iter-01 se neopakují, jen odkazují (citace jako „T-002a A3“, „K3“ apod.).

---

## 0. Executive summary a registr rozhodnutí

Navrhuji **headless krokovou simulaci v čistých ES modulech (JS + JSDoc typy, bez build kroku)** s tenkou preact UI vrstvou, local-first persistencí v IndexedDB a jediným fixed-timestep mechanismem pro live běh, background i offline catch-up. Návrh je přímou realizací konsolidovaného seznamu K0–K19 z review T-003: bázou je **jediný serializovatelný stav vlastněný simulací (K0)**, nad ním deklarativní scheduler a tick-orchestrace (K3/K6), data-driven katalogy s vrstvou modifikátorů (K2/K13–K15), balanc jako data + čisté vzorce (K4), registry-based transakce (K5) a fail-fast string-ID registr (K10).

Registr klíčových rozhodnutí (detail v odkazovaných sekcích):

| # | Rozhodnutí | Sekce |
|---|---|---|
| D1 | Stack: ES2022 moduly + JSDoc typy + `tsc --checkJs` (bez emitu), **runtime zero-build** (žádný bundler; dev/CI tok vyžaduje Node toolchain, §2.2); vendorovaný preact+htm pro UI; `node:test` pro headless testy; ručně psaný service worker | §2 |
| D2 | Vrstvení: headless core (žádný DOM/I/O) ↔ UI přes **read-only snapshot + command/intent API**; UI-only stav mimo herní state | §3 |
| D3 | Engine: fixed-timestep 0.05 s/krok s akumulátorem; **jeden krokovací mechanismus** pro live/background/catch-up; min-heap schedule + deklarativní periodické úlohy; centrální tickOrder | §4 |
| D4 | RNG: seedovatelný PRNG s **pojmenovanými streamy per systém**, stav součástí save (K16/G1) | §4.4 |
| D5 | Katalogy: verzované statické JSONy v repu (extrakce = milník M1), schema validace při loadu, **immutable katalog + vrstva modifikátorů**, akce obsahu jako string-ID do registru efektů | §5 |
| D6 | Save: IndexedDB, rotující generace, `lastSimTimestamp`, deklarativní persist schéma per doména (allowlist), verzované migrace, load = čistá konstrukce; export/import savu jako string | §6 |
| D7 | Transakce: registry `resourceHandlers[kind]` + generické canAfford/pay/grant; účetnictví a achievementy jako observery transakčních událostí | §7 |
| D8 | Bitva: deterministický serializovatelný automat na jednotném časovém zdroji (sub-step 30 ms), commands místo click-mutací, auto-resolve v catch-upu – **navrženo teď, stavěno v M7** | §8 |
| D9 | **R1 rozhodnuto**: klientský trh – lokální `available` per zboží + denní mean-reversion drift k baseline; cenový vzorec beze změny; kalibrace v dedikované balanční fázi | §9.1 |
| D10 | **R2 rozhodnuto**: cap catch-upu = technický strop 8 h (potvrzení po benchmarku M0) + oddělená balanční hodnota (kalibruje M9); interaktivní eventy catch-up pozastaví a po odkliknutí pokračuje; bitvy auto-resolve | §9.2 |
| D11 | **R3 rozhodnuto + dílčí eskalace**: extrakční pipeline jako milník M1 s gap-reportem; eskalace uživateli jen pro díry, které z dumpu/zdroje dotěžit nejdou | §9.3 |
| D12 | **R4 rozhodnuto**: kontrakty pozdních systémů definovány teď (§8), vynucené stub-registrací a kontraktními testy od M2; implementace M7 | §9.4 |
| D13 | Simulace běží v main threadu (dávkový krok s frame budgetem); Web Worker jen jako eskalační cesta, pokud benchmark catch-upu nevyhoví | §4.6 |

---

## 1. Kontext, cíle a omezení (odkazy, ne duplikace)

- **Co se staví**: věrný rebuild Prosperity v0.9.5 – mechaniky a balanc, ne implementace (zadání; doménový popis `doc/original_source_doc.md`).
- **Cílová platforma**: mobile-first PWA, plně offline, bez serveru v jádře; vše (kód, data, stav workflow) v gitu – prostředí nemá persistentní storage (zadání, rozcestník §4).
- **Architektonická báze**: mapa závislostí a 9 vzorů originálu (iter-01 T-001 §13–14), refactoring nálezy (T-002a/b), konsolidace K0–K19 + R1–R4 (review T-003 §6–7). Verdikt iter-01: GO s úpravami; G1 (RNG) a G2 (bitvy v catch-upu) zapracovány (T-004) a tento návrh je přebírá jako D4 a D8/D10.
- **Acceptance criteria projektu**: instalovatelná na mobil, hratelná offline, funkční smyčka s offline progresem, spolehlivý save/restore (zadání). Návrh je strukturován tak, aby tato kritéria plnilo už MVP jádro (§11).

---

## 2. Volba stacku

### 2.1 Rozhodnutí (D1)

| Vrstva | Volba |
|---|---|
| Jazyk | **JavaScript ES2022 moduly + typy přes JSDoc**, `tsc --noEmit --checkJs` jako povinný quality gate (typová kontrola bez kompilace; sdílené typy v `*.d.ts`) |
| Build | **Žádný runtime build** – deploy = statické soubory přímo z gitu (`index.html`, `src/`, `vendor/`); žádný bundler, žádné generované artefakty kromě SW precache manifestu (commitnutý výstup skriptu). Dev/CI tok vyžaduje Node toolchain – viz upřesnění v §2.2 |
| UI runtime | **preact + htm**, vendorované jako ESM v `vendor/` (~13 kB, bez JSX → bez kompilace); deklarativní render nad snapshotem stavu |
| Testy | **`node:test`** (vestavěný runner) nad headless core – core nesmí importovat DOM, takže běží v Node bez jakékoli závislosti |
| PWA | Ručně psaný service worker (cache-first, verzovaný precache seznam) + `manifest.webmanifest` |
| Persistence | IndexedDB přímo (vlastní tenký promise wrapper ~100 ř.); lz-string ekvivalent jen pro export-string savu (§6.5) |
| Tooling | Jednorázové Node skripty v `tools/` (extrakce katalogů, generování precache manifestu) – výstupy commitnuté, skripty bez závislostí |

### 2.2 Zdůvodnění vůči cílům (trade-offs)

**Pro (vůči mobile-first PWA / offline / prostředí bez persistentního storage):**
- **Repo = deploy.** Bez build kroku neexistuje drift mezi zdrojem a artefaktem; agenti i CI pracují bez `node_modules`; hra jde spustit z libovolného statického serveru. To přímo plní omezení „vše v gitu“ a zjednodušuje SW precache (úplný výčet souborů, K2).
- **Headless core bez závislostí** → testovatelnost vzorců a determinismu v Node (K4/D2 z T-002b), catch-up je týž kód jako testovací harness.
- **Výkon:** žádná framework-digest daň (T-002a A1); preact rendruje jen ze snapshotu při dirty flagu (§3.4), simulační krok nic neplatí.
- **Mobilní footprint:** vendor ~13 kB + vlastní kód; žádný MB-engine.

**Proti (vědomě přijaté):**
- JSDoc typy jsou syntakticky ukecanější než TS a slabší v generikách. Mitigace: typové definice soustředit do `types.d.ts`, `tsc --checkJs` povinný v CI – typová síť zůstává (vynucuje K10/K15 disciplínu).
- Bez bundleru víc HTTP requestů při prvním načtení. Mitigace: SW precache po prvním loadu (offline beztak vyžaduje lokální kopii všeho); HTTP/2. Po instalaci PWA irelevantní.
- Vendorování preactu = ruční upgrade. Přijatelné: API je stabilní, upgrade je vzácná operace.

**Upřesnění „bez build kroku" – runtime vs. dev/CI (S-01 z review T-002):** *Runtime* je zero-build – běh hry = statické soubory z gitu, deploy nemá žádný build krok. *Dev/CI* tok ale vyžaduje Node toolchain pro tři nástroje: (1) `tsc --noEmit --checkJs` jako povinný CI gate, (2) `tools/extract` (M1), (3) generátor SW precache manifestu. Není to rozpor s D1 – hra nikdy nezávisí na build artefaktech (jediný generovaný soubor, precache manifest, je commitnutý) – ale rozdíl držíme explicitně, aby „no-build" nezastíral dev závislosti. Provoz v prostředí bez persistentního storage: výstupy toolingu jsou commitnuté (extrakce, manifest); `tsc` (typescript balík) je jediná dev-only závislost instalovaná per CI run / sezení, bez transitivního stromu – cache je optimalizace, ne podmínka. **Funkční `tsc --checkJs` CI gate je DoD milníku M0** (§11); bez něj se no-build výhoda mění v údržbovou past (riziko R-I, §12).

### 2.3 Alternativy (zamítnuté, s důvody)

**Alt A – TypeScript + Vite + React (zamítnuto).** Plusy: nejsilnější typový systém, ekosystém, DX. Zamítnuto protože: (1) build pipeline vyžaduje `node_modules` a build artefakty – v prostředí bez persistentního storage to znamená buď commitovat `dist/` (obří generované diffy, dvojí pravda), nebo závislost na build kroku při každém sezení; (2) React runtime + re-render model je přesně „digest daň“, kterou K3/A1 odstraňuje – šel by zkrotit, ale platili bychom za nástroj a pak za jeho krocení; (3) přínos TS syntaxe z větší části nahradí `checkJs`.

**Alt B – herní engine (Phaser / PixiJS) (zamítnuto).** Prosperity UI je formulářové a karetní (karty budov, listy, panely, progress bary – T-001 §8); DOM je pro to lepší nástroj než canvas (text, layout, přístupnost, mobilní zoom). Simulace je agregátní bez prostorové scény (T-001 §14.5; plný ECS už zamítnut v T-002b). Canvas engine = MB v bundle a horší mobilní text UX za nulový zisk.

**Alt C – čistě vanilla DOM bez preactu (zvážena, ponechána jako fallback).** Nulová závislost, ale ruční diffing/re-render pro ~10 obrazovek je trvalá údržbová daň a zdroj zbytečných re-renderů. Protože UI stojí za snapshot/command hranicí (§3), je render technologie vyměnitelná – pokud by preact na cílových zařízeních překážel, lze degradovat bez zásahu do core.

---

## 3. Struktura projektu a vrstvení (K0, K9)

### 3.1 Adresářová struktura

```
/index.html                  # PWA shell
/manifest.webmanifest
/sw.js                       # service worker (cache-first, verzovaný precache)
/vendor/                     # preact + htm (vendorované ESM)
/tools/                      # node skripty: extrakce katalogů, precache manifest (výstupy commitnuté)
/test/                       # node:test – tabulkové testy vzorců, determinismus, sim smoke testy
/src/
  core/                      # HEADLESS JÁDRO – zákaz importu DOM/UI/save/IO čehokoli mimo core/
    engine/                  #   clock (akumulátor), scheduler (heap + periodika), tickOrder, rng
    state/                   #   tvar stavu, createInitialState(catalog), invarianty, persist schémata
    systems/                 #   calendar, production, food, population, health, crime, economy,
                             #   construction, contracts, research, skills, market, world, battle, story
    catalog/                 #   loader + schema validace, byId index, effective() (modifikátory)
    balance/                 #   balance.js (pojmenované konstanty) + formulas.js (čisté vzorce)
    resources/               #   transakční vrstva (registry handlers, pay/canAfford/grant, observery)
    registry/                #   string-ID fns registr (fail-fast), registr efektů obsahu
    commands/                #   command/intent API + validace pravidel
    events/                  #   doménové události, gamelog/notifikace jako ring buffer ve stavu
  data/                      # KATALOGY – verzované JSONy (budovy, zboží, jídlo, joby, techy, zóny,
                             #   postavy, skilly, eventy, achievementy) + balance data (extrakce M1)
  save/                      # IndexedDB wrapper, generace savů, migrace, export/import string
  ui/                        # preact: screens, komponenty, selektory; UI-only stav (neukládá se)
  app/                       # bootstrap, rAF smyčka, visibilitychange/pagehide, catch-up UI, SW glue
```

**Pravidla závislostí (vynucovaná konvencí + CI grepem):**
- `core/` importuje výhradně `core/` (a typy). Žádný `document`, `window`, `fetch`, `Date.now()` uvnitř kroku – čas a náhoda vstupují jen přes engine clock a RNG streamy. Tím je core spustitelné v Node (testy, benchmark, případný Worker).
- `data/` je čistá data (JSON) – žádné funkce (K14/D4 z T-002b); chování referencované string-ID do `core/registry`.
- `ui/` čte snapshot + selektory, zapisuje **jen** přes `commands` API; `save/` mluví s core jen přes persist schémata; `app/` je jediné místo, kde se vrstvy potkávají.

### 3.2 Headless jádro: jediný serializovatelný stav (K0)

Celý herní stav je **jeden plain-data strom** vlastněný simulací (serializovatelný `structuredClone`/JSON by-design):

```
state = {
  meta:    { saveVersion, gameVersion, startedAt },
  engine:  { curStep, speed, running, schedule: [[step, [{id, params}]], …] },
  rng:     { streams: { population: s0, forest: s1, market: s2, world: s3, battle: s4, events: s5 } },
  season:  { curSeason, curDay, curMonth, curYear, dayInSeason },
  player:  { gold, techPt, inventory, profese, awesomeness komponenty, … },
  home:    { curWorkers, jobs, foodStore, projectQueue, contractQueue, nat, … },
  world:   { forest, field, mine, zones, factions, caravan, marketState, … },
  catalogState: { instances, created/totalMade per item, unlockedTechs, modifiers: […] },
  battle:  null | { …deterministický automat, §8 },
  story:   { importantEventUsed, storyProgress, tutorials },
  log:     { ring buffer N posledních záznamů },
  achievements: { unlocked: {id: true} }
}
```

Zásady (řeší A1/A2/B3 z T-002b):
- **Katalog není ve stavu.** Immutable definice žijí v `catalog/`; stav drží jen dynamiku (počty, progress, instance, modifikátory) – princip „stav minus katalog“ originálu (T-001 §12), ale explicitní (K11).
- **UI stav (otevřené panely, animace, vybraná záložka) žije v `ui/`** a nikdy se neukládá – odstranění vzoru `levelUpUI` v savu (T-002b A1).
- Mutace stavu provádějí výhradně systémy (`system(state, ctx)`) a command handlery; v dev módu `Object.freeze` na snapshotu pro UI.

### 3.3 Command/intent API (UI → core)

UI nikdy nemutuje stav; posílá **intenty**: `build(itemId)`, `assignJob(jobId, delta)`, `setTaxRate(r)`, `setRation(level)`, `buyGoods(id, qty)`, `sendCaravan(order)`, `startSkill(id)`, `buyTech(id)`, `battleCommand(action)`, `setSpeed(s)`, `acknowledgeEvent(optionId)` … Každý command má handler v core, který: (1) validuje pravidla (canAfford, limity, unlocky – jediné místo pravdy, řeší C2), (2) provede transakci přes resource vrstvu (§7), (3) emituje doménové události. Commandy jsou serializovatelné `{type, params}` → zdarma replay/debug log (deterministický s D4).

### 3.4 Snapshot a doménové události (core → UI) (K9)

- UI čte stav přímo (read-only konvence + dev freeze), přes **selektory** (`selectHousing(state)`, `selectMarketRows(state)`...). Žádná kopie per frame; render řízen čítačem verze stavu (dirty flag po dávce kroků) a `requestAnimationFrame`, cílově ≤ 10–15 re-renderů/s (T-002a A1).
- **Gamelog a notifikace jsou data**: ring buffer ve `state.log` (přežije save) + efemérní event bus pro UI (toasty, confetti, zvuk). Engine/systémy nikdy nesahají na DOM (řeší C1: gamelog rendrovaný schedulerem, jQuery notifikace, `$("header").hide()` ve fns).
- Story režim („zastav engine, ukaž dialog“) je doménová událost + stav `engine.running/stopPending` – UI je jen projekce.

### 3.5 ASCII diagram komponent

```
┌─────────────────────────────── PWA shell (app/) ────────────────────────────────┐
│  bootstrap · rAF smyčka (akumulátor) · visibilitychange/pagehide · catch-up UI  │
│  service worker registrace · install prompt                                     │
└──────────┬──────────────────────────────────────────────────────┬───────────────┘
           │ dispatch(command)                                    │ snapshot (read-only)
           │                                                      │ + doménové události
┌──────────▼──────────────────────────────────────────────────────┴───────────────┐
│                                UI (ui/, preact+htm)                              │
│   screens (home/forest/mine/field/market/academy/council/battle/story)          │
│   selektory · komponenty (karty, listy, progress) · UI-only stav (neukládá se)  │
└──────────┬──────────────────────────────────────────────────────▲───────────────┘
           │ commands (intents)                                   │ events / log ring buffer
┌──────────▼──────────────────────────────────────────────────────┴───────────────┐
│                          HEADLESS CORE (src/core/)                               │
│  ┌────────────────┐   ┌────────────────────────────────────────────────────┐    │
│  │ ENGINE         │   │ SYSTEMS – tickOrder deklarovaný jako data           │    │
│  │ clock+akumulát.│──▶│ calendar → schedule(one-shot) → production → food   │    │
│  │ scheduler heap │   │ → population → health/crime → economy/market        │    │
│  │ periodika=data │   │ → construction → contracts → research → skills      │    │
│  │ RNG streamy    │   │ → world(zóny round-robin) → battle sub-step → story │    │
│  └────────────────┘   └────────────────────────────────────────────────────┘    │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐  ┌────────────────┐   │
│  │ RESOURCES    │  │ REGISTRY      │  │ BALANCE         │  │ COMMANDS       │   │
│  │ handlers per │  │ fns string-ID │  │ konstanty (data)│  │ validace +     │   │
│  │ kind; pay/   │  │ fail-fast;    │  │ + čisté vzorce  │  │ transakce +    │   │
│  │ canAfford/   │  │ efekty obsahu │  │ (testovatelné)  │  │ události       │   │
│  │ grant; observ│  └───────────────┘  └─────────────────┘  └────────────────┘   │
│  │ (účetnictví, │            ▲                                                  │
│  │ achievementy)│            │ string-ID reference z dat                        │
│  └──────────────┘            │                                                  │
│        STATE – jediný serializovatelný strom (engine·season·player·home·world·  │
│        catalogState/modifiers·battle·story·log) – vlastněný simulací            │
└──────────┬───────────────────────────────────────────────▲──────────────────────┘
           │ persist schémata (allowlist per doména)       │ immutable katalogy
┌──────────▼─────────────────┐                   ┌─────────┴──────────────────────┐
│ SAVE (save/)               │                   │ DATA (src/data/)               │
│ IndexedDB · rotující       │                   │ verzované JSON katalogy        │
│ generace · lastSimTimestamp│                   │ + balance data; schema validace│
│ verzované migrace ·        │                   │ při loadu; extrakce z originálu│
│ export/import string       │                   │ (tools/extract, milník M1, R3) │
└────────────────────────────┘                   └────────────────────────────────┘
```

Pozn. (N-04): tento diagram je **živý artefakt** – udržuje se spolu s tickOrder (§4.3) při každé strukturální změně (nová vrstva, systém, kontrakt) ve stejném commitu; zastaralý diagram/tickOrder je reviewer nález, kontrola je součástí milestone reviewer gate (§11).

---

## 4. Herní engine & čas (K3, K6, K16, K17)

### 4.1 Fixed-timestep s akumulátorem – jeden mechanismus pro všechno (K3)

Časové konstanty originálu se přebírají 1:1: krok = **0.05 s** (1× rychlost), **900 kroků/den** (den = 45 s), sezóna 91 dní = 81 900 kroků, rychlosti Pause/1×/2× (T-001 §1–2).

```
loop (rAF nebo timer):
  now = performance.now()
  accumulator += (now − lastTime) × speedFactor      // 0 při pauze, 1 při 1×, 2 při 2×
  stepsDue = floor(accumulator / STEP_MS)
  steps = min(stepsDue, FRAME_BUDGET)                // budget per frame, zbytek příští frame
  for i in 1..steps: engine.step(state)              // levný krok bez render daně
  accumulator −= steps × STEP_MS
  if (steps > 0) markDirty()                         // render max ~10–15×/s
```

Tentýž mechanismus pokrývá tři režimy (T-002a A3/B5 var. a):
1. **Live**: rAF smyčka, budget pár kroků na frame.
2. **Background/throttling**: po `visibilitychange → visible` akumulátor přirozeně obsahuje zameškaný čas → dávka kroků (s budgetem a progress UI nad prahem).
3. **Offline catch-up**: po loadu `missedMs = now − save.lastSimTimestamp` → tatáž dávková smyčka, chunky po ~25 k kroků s yieldem na UI (progress), cap dle §9.2.

Interaktivní (engine-stopping) eventy umějí dávku **přerušit**: `engine.step` po události se `stopPending` vrátí řízení; zbytek akumulátoru zůstává (pokračování po odkliknutí, §9.2).

**Catch-up-safe invariant (S-05, průřezový):** catch-up není jednorázová feature jednoho milníku – v M2 vznikne end-to-end mechanismus, ale **rozšiřuje se s každým nově přidaným systémem**. Každý systém přidaný v M2–M8 musí být *catch-up-safe*: deterministický (čas a náhoda jen přes engine clock a RNG streamy, žádný `Date.now()`/`Math.random()`), levný v dávkovém běhu (žádné alokace/O(n²) v hot-path) a bez závislosti na DOM/UI. Invariant je součástí DoD každého milníku (§11) – „systém funguje live, ale rozbíjí catch-up" je neprošlý milník.

### 4.2 Scheduler: one-shot heap + periodika jako data (K6, K17, A5)

Dvojí časový režim originálu (schedule vs. modulo testy rozeseté ve službách) se sjednocuje do jednoho deklarativního scheduleru:

- **One-shot události**: min-heap / setříděná mapa keyed číselným krokem, položky `{step, id, params}` – **serializovatelné beze změny principu originálu** (string-ID, T-001 §14.3). `countEvent` nahrazen udržovaným indexem `id → počet` (K17); žádné GC skeny.
- **Periodické úlohy**: registrované při startu jako data `{id, every: 'step'|'quarterDay'|'noon'|'day'|'5days'|'10days'|'month'|'season'|'year'|N, order, systemFn}` – idempotentní registrace řeší i load (žádná `Events.startCheck` heuristika). Engine spočítá **hrany času jednou za krok** (`isNewDay`, `isNoon`, `isQuarterDay`, `isNewMonth`, …) a volá jen úlohy, jejichž hrana nastala – per-service modulo prology a alokace v hot-path zmizí (A2/A6), krok je levný (předpoklad catch-upu).

### 4.3 Centrální tickOrder (K6 – rozpad Home.step)

`Home.step` originálu (8 domén v jedné funkci, T-002b A2) se rozpadá na samostatné systémy; **pořadí vyhodnocení je deklarované na jednom místě** a stává se testovatelným artefaktem:

```
tickOrder (v rámci jednoho kroku):
  1. calendar/seasons        (posun dne/měsíce/roku/sezóny – hrany pro ostatní)
  2. schedule one-shot       (schedule[curStep] přes fns registr)         [jako Engine.step originálu]
  3. periodika dle hran, v deklarovaném pořadí:
     every step   : populationMigrationAccumulator, skillsProgress
     quarterDay   : jobsProduction (vč. builder), accidents, autoAssignWorkers
     noon         : births, retirement, crime, meal#2
     day          : meal#1, burnWood, workerEfficiency, settlementLevel,
                    mine/field periodika, ageBuildings, marketDailyDrift (§9.1)
     10 days      : forestRegeneration
     5 days       : localTaxes, zoneRoundRobin slot (rozprostřeno, T-001 §9)
     month        : taxes, upkeep, foodSpoilage, financeReport
     season/year  : changeSeason efekty, natalita reset
  4. eventFlush + dev-invarianty (záporné zásoby, NaN → výjimka v dev)
```

**Závazek věrnosti**: pořadí uvnitř dne (efektivita → joby → jídlo → daně…) je nedokumentovaný kontrakt originálu s balančním dopadem (T-002b A2) – při portu každé mechaniky se přesné pořadí ověří proti zdroji a zapíše do tickOrder; tickOrder je tím i dokumentací. tickOrder je (stejně jako ASCII diagram §3.5) **živý artefakt** (N-04): každá změna pořadí nebo registrace systému jej musí aktualizovat ve stejném commitu, jinak zastará – hlídá milestone reviewer gate (§11). Známé balanční pasti se zapékají do dat s poznámkou: Skills 2×/krok → efektivní `maxStep/2` (A5/K4), market perioda denně dle bugu V3 (vědomá reference, K4).

### 4.4 Seedovatelný a serializovatelný RNG (K16/G1, D4)

- Implementace: malý PRNG (mulberry32/xoshiro128**), stav = pár čísel v `state.rng`.
- **Pojmenované streamy per systém** (`rng.stream('forest')`, …'population', 'market', 'world', 'battle', 'events'): izolují pořadí spotřeby – přidání/změna jednoho systému nerozhodí determinismus ostatních; každý stream má vlastní serializovaný stav.
- Determinismus testovatelný: `hash(simulate(seed, commands, N kroků))` je stabilní → regression testy enginu i replay debugging. Catch-up je reprodukovatelný (stejný save + stejný zameškaný čas → stejný výsledek), což byl přesně požadavek G1.

### 4.5 Bitevní čas (K8 – princip; automat v §8)

Bitva neběží na vlastním `$interval` (A4), ale jako **sub-step z téhož akumulátoru**: 1 bitevní tick = 30 ms simulovaného času (původní takt 1:1 → cooldowny/reaction časy v ticích zachovávají „feel“ originálu). Pauza, rychlost, throttling i catch-up tím řeší jediný mechanismus; stav bitvy je součást `state` a přežije save/kill.

### 4.6 Main thread vs. Worker (D13)

Default: simulace v main threadu – dávkový krok s frame budgetem stačí, pokud je krok levný (cíl ~0,01 ms/krok; 8h cap ≈ 576 000 kroků ≈ jednotky sekund, T-002a B5). Web Worker je **eskalační cesta**, ne default: workery throttlingu timerů na pozadí stejně nepodléhají jen částečně a přidávají serializační hranici (T-002a A3). Díky K0 (čistý serializovatelný stav, žádný DOM v core) je pozdější přesun do Workeru levný – rozhodnutí padne po benchmarku v M0/M2 (riziko R-B, §12).

---

## 5. Datový model & katalogy (K2, K4, K10, K13–K15)

### 5.1 Katalogy jako verzované assety v repu (K2)

16 fetchovaných JSON listů originálu (T-001 §14.2, T-002a C1) nahrazují **statické, verzované katalogy v `src/data/`**, členěné per typ (K15): `buildings.json`, `goods.json`, `food.json`, `jobs.json`, `techs.json`, `zones.json`, `characters.json`, `skills.json`, `events.json`, `achievements.json`, `houseTypes.json`, `companies.json`. Bundlované = žádná fetch fáze a race „hra běží dřív než configged“; SW je precachuje spolu s kódem. Loader má explicitní fail stav (chybějící/nevalidní katalog = obrazovka chyby, ne tichý nedoběh).

### 5.2 Schéma a fail-fast validace (K15, K10, B4)

- Každý katalog má **deklarované schéma** (JSDoc typ + runtime validátor spouštěný při loadu a v testech): povinná pole per typ, typy hodnot, jednotky v komentářích.
- **String-ID registr**: všechna ID (položky, fns, efekty, modifikátory) se validují při loadu katalogů – kolize ID napříč typy a odkazy na neexistující ID jsou **chyba startu**, ne runtime log (`no such item`).
- Všechny `cost`/`products` mapy v datech (katalogy, kontrakty, eventy) se validují proti registru zdrojů (§7) při loadu – překlep v balančních datech nemůže fabrikovat NaN ekonomiku (B4).
- Tenký index `byId` přes všechny katalogy existuje pro místa, která opravdu potřebují lookup napříč (save aplikace, efekty) – ale typované přístupy (`catalog.jobs.farmer`) jsou default.

### 5.3 Immutable katalog + vrstva modifikátorů (K13)

Katalog je **immutable** (v dev `Object.freeze`). Žádné `applyUpgrade` mutace in-place s `base*` dvojníky (D3 z T-002b):

```
effective(itemId, attr) = base(itemId, attr) ⊕ fold(state.catalogState.modifiers
                                                    .filter(m => m.target===itemId && m.attr===attr))
modifier = { id, source: 'tech:bookKeeping', target: 'baker', attr: 'products.bread',
             op: 'mul'|'add'|'set', value: 1.15 }
```

- Techy, eventy i efekty budov **přidávají modifikátory** (data), neefektivní hodnoty se počítají deterministicky; pořadí skládání je definováno (add → mul → set, v rámci op dle priority/source).
- Save ukládá **jen seznam aktivních modifikátorů + unlocked techy** – re-aplikace upgradů po loadu (dobrý vzor originálu, T-001 §12) se mění z „přehraj imperativní funkce a doufej v idempotenci“ na „přepočti fold čistou funkcí“.
- `scaleCost` (růst cen s počtem) je čistá funkce `cost(base, created)` – derivát, nikdy se neukládá.
- Memoizace `effective` per (item, attr) s invalidací při změně modifikátorů – agregáty (maxWorkers, sloty jobů, kapacity, attractiveness) se přepočítávají **event-driven** (po stavbě/techu/loadu), ne pollingem (A2b).

### 5.4 Akce obsahu jako data (K14)

`onBuild`, `onUnlock`, event `options[].fn`, kontraktové `onComplete/onExpire/onReject` – vše jako **string-ID do registru efektů s parametry v datech**: `onBuild: {effect: 'createScholars', count: 2}`. Registr efektů je malý, typovaný modul per doména (rozbití config.js monolitu, B2). Tím je obsah 100% JSON a dotěžování katalogů ze zdroje (R3) má kam cílit.

### 5.5 Balanc do dat + čisté vzorce (K4)

- **`core/balance/balance.js`**: všechna balanční čísla pojmenovaná, s jednotkami a odkazem na zdroj v originálu (`disease.baseChancePer20kPop`, `crime.basePerDay`, `market.haggleBuy: 1.35`, `tax.centerBasePerWorkerMonth: 22`, `army.warriorUpkeep: 108`, …) – extrakce čísel z originálu (která se stejně musí udělat, D1 z T-002b) jde rovnou sem.
- **`core/balance/formulas.js`**: klíčové křivky jako čisté funkce `f(inputs, balance) → number`: `marketPrice(basePrice, available, max)` (kubika beze změny), `workerEfficiency(parts)`, `awesomeness(parts)`, `techCap(level)` (=`100×1.25^level`), `battleDamage(units, strength, mult, crit)`, migrační akumulátor, spoilage, natalita… Tabulkové testy s referenčními hodnotami spočtenými z originálu = jediný způsob, jak „věrnou replikaci balancu“ verifikovat jinak než hraním (D2 z T-002b).
- **Vědomé odchylky originálu zapečené do dat s poznámkou** (K4): Skills 2×/krok → poloviční efektivní `maxStep`; `/market` perioda denní (bug V3 jako reference); opravený záměr vzorce nemoci (`home.js:970` precedence, V8) – zapsat **obě** varianty (faktickou i zamýšlenou) a rozhodnout v balanční kalibraci M9.

### 5.6 Fail-fast fns registr (K10)

Princip string-callback dispatch originálu se **zachovává** (nutný pro serializovatelný schedule), ale bezpečně:
- `registry.register(id, handler, paramsSchema?)` – moduly per doména se registrují při startu; registrace je idempotentní.
- `schedule.insert(step, id, params)` **validuje ID při plánování** (neznámé ID = výjimka v dev, strukturovaná telemetrie v prod) a `structuredClone`-testem vynucuje serializovatelnost params (kontrakt „params must be primitive“ z komentáře originálu se stává vynuceným).
- Vykonání bez polykajícího catch-all: chyba handleru se loguje strukturovaně (step, id, payload) a událost je replayovatelná; v dev se vyhazuje.

---

## 6. Save model (K1, K11, K12)

### 6.1 Úložiště: IndexedDB, local-first (K1)

- **Primární úložiště IndexedDB** (localStorage jen pro drobné preference; má ~5 MB limit a synchronní API – T-002a B1). Object story: `slots` (metadata slotů + ukazatel na aktivní generaci), `saves` (záznamy `{slotId, generation, savedAt, lastSimTimestamp, version, payload}`).
- **Rotující generace** (N=3 per slot): zapiš nový záznam → fsync transakce → přepni ukazatel → smaž nejstarší. Kill uprostřed zápisu nikdy nekorumpuje poslední funkční save; poškozený load automaticky padá na předchozí generaci.
- `navigator.storage.persist()` při startu (ochrana proti evikci, zejm. iOS – riziko R-F §12).

### 6.2 Autosave triggery (K1, B2)

1. **Periodicky**: každý herní den (45 s reálného času při 1×) nebo min. 60–120 s – save je po K11 levný a malý.
2. **`visibilitychange → hidden` / `pagehide`**: okamžitý save – na mobilu je „swipe away“ standardní ukončení (B2).
3. **Po významných událostech**: konec bitvy, level města, dokončený kontrakt/tech, návrat karavany.
4. Vždy se ukládá **`lastSimTimestamp`** (wall-clock) – vstup offline catch-upu (§4.1, §9.2).

### 6.3 Deklarativní persist schéma (K11)

Princip originálu „stav minus katalog + re-aplikace modifikátorů“ se zachovává, ale **invertuje na allowlist**: každá doména deklaruje svůj persistentní tvar (`persistSchema` vedle systému – `building: {created, totalMade, instances}`, `zone: {liege, numWorkers, warriors, archers, favour, policy, …}`). Save = generický průchod schématy; co není deklarováno, neukládá se (žádný drift ukládaných polí, B3). Derivovaná data (ceny, capy, effective hodnoty) se **nikdy neukládají** – počítají se jedinou cestou, stejnou při nové hře i po loadu (žádná „load-only“ větev).

### 6.4 Load = čistá konstrukce + verzované migrace (K11, B4-load)

```
load(payload):
  1. validuj obálku (version, integrity)               → fail = předchozí generace
  2. migrations[vN→vN+1→…→aktuální] (očíslované kroky, žádný monolitický fixup)
  3. state = createInitialState(catalog)               → čistá konstrukce z katalogu
  4. aplikuj save přes persist schémata                → jediný vstup, žádný deep-merge
  5. přepočti modifikátory fold + event-driven agregáty (calcAll ekvivalent)
  6. validuj invarianty (žádné NaN/záporné zásoby)     → porušení = chyba loadu, ne tichá oprava
  7. spočti missedMs z lastSimTimestamp → catch-up (§4.1)
```

Sanitizace typu `fixNaNs` (T-002b B3) se nepřenáší – invarianty jsou asserty; selhání loadu nabízí starší generaci, nikdy „tiše pokračuj s půlkou stavu“ (B4 z T-002a).

### 6.5 Serializace a export (K12, K19)

- Payload = plain objekt (structured clone) bez komprese – v IndexedDB není komprese nutná (lz-string měl smysl pro REST payload originálu); žádné deep-copy + denylist, žádné logy celé v savu (ring buffer má pevný strop).
- Pokud by serializace měřitelně zdržovala (velké pozdně-herní stavy), přesun stringify/komprese do Workeru – stejná eskalační cesta jako D13.
- **Export/import savu jako string** (JSON → komprese → base64): přenos mezi zařízeními bez serveru; jediný „online“ pozůstatek, který stojí za náhradu (K19). Socket.io chat, market admin API, účty: nepřenáší se.

---

## 7. Resource/transakční vrstva (K5) + účetnictví, achievementy

### 7.1 Registry handlers místo 4 dispatcherů

Polymorfní platby originálu (`cost`/`products` `{key: amount}` napříč gold/suroviny/jídlo/pracovníci/techPt/zboží – dobrý vzor, T-001 §14.4) se zachovávají, ale nad **jediným registrem**:

```
resourceHandlers[kind] = { get(state,key), add(state,key,n), remove(state,key,n), capacity?(state,key) }
// kind odvozen z katalogového typu klíče: gold | techPt | goods | food | foodAggregate |
// stock (trees/animals/ores/livestock/farmland) | job | unit
canAfford(state, cost)  = ∀k: get(k) ≥ cost[k]
pay(state, cost, cause) = ∀k: remove(k)  + emit txEvent{key, amount:−n, cause, day}
grant(state, prod, cause)= ∀k: add(k, capped) + emit txEvent{key, amount:+n, cause, day}
```

- Jedna pravda o sémantice klíče → mizí třída defektů 4 rozjetých dispatcherů (fish v canAfford, osiřelý monthly report, NaN dělení – V5–V7 review).
- **Invarianta**: `remove` nikdy pod nulu bez explicitního `allowDeficit` (jídlo má vlastní fair-share politiku uvnitř food handleru – přebírá rozdělení napříč druhy a foodVariety z originálu, T-001 §4); porušení = chyba, ne tiché NaN.
- Speciální klíče (`food` agregát s fair-share, `job` odvádějící pracovníky) jsou handlery, ne větve if/else.

### 7.2 Účetnictví a achievementy jako observery (K5, K18)

- Každá transakce emituje `txEvent` → **měsíční finanční reporty a consumption/productionHistory se skládají z událostí** (observer), nejsou inline mutací v platebních větvích – jdou vypnout, testovat a rozšířit zvlášť.
- **Achievementy deklarativně** (K18): `{id, when: predicate-as-data}` vyhodnocované centrálně na denním ticku + na transakčních/doménových událostech – odemčení není imperativně rozseté po mechanikách (C4). Stejný mechanismus poslouží unlock systémům (odemykání map/mechanik eventy).

---

## 8. Pozdní systémy navržené teď: bitvy a AI svět (K8, R4)

Aby „navrhnout teď, stavět později“ nezůstalo na papíře (R4), definuje tento návrh **kontrakty**, které MVP jádro od začátku respektuje a kontraktní testy je hlídají:

### 8.1 Bitva jako deterministický automat (K8, D8)

```
battleState = { zoneId, sides: { player: {warriors:{n,strength,defense,cd,casualties,critChance},
                                          archers:{…}, action}, opponent:{…} },
                state: setup|running|done, tick, log[], summary }
battleStep(battleState, commands[], rng.stream('battle')) → battleState'   // 1 tick = 30 ms sim času
```

- **Čas**: sub-step z hlavního akumulátoru (§4.5); cooldowny/reakce v ticích 1:1 s originálem (charge cd 80, volley 120, … – T-001 §10) → zachovaný „feel“.
- **Vstupy hráče = commands** (`battleCommand({side:'warriors', action:'charge'})`), žádné click-mutace (C3); damage model a revival vzorce jdou do `formulas.js` s tabulkovými testy.
- **Serializovatelný**: `state.battle` je součást save – kill aplikace uprostřed bitvy je korektní resume, ne nedefinovaný stav (A4).
- **Auto-resolve v catch-upu (G2)**: tentýž `battleStep` bez hráčových commandů – obranná AI politika (skriptované akce dle cooldownů) za hráče; výsledek jde do offline summary. Žádná druhá implementace bitvy.

### 8.2 AI svět: zone tick + frakční automat (R4)

- **Zone tick kontrakt**: `processZone(state, zoneId, rng.stream('world'))` – round-robin rozprostřený přes 5denní periodu (jak v originálu, T-001 §9); ekonomika/politika/revolty/questy zóny = vzorce v balance datech (goldDemand `150×units`, production `50×workers`, favour pravidla).
- **Frakční AI**: stavový automat (AISTATES 0–7) jako data + přechodová funkce; plánuje se přes standardní schedule (string-ID, deduplikace indexem K17); AI–AI bitvy RNG resolve vzorcem, AI–hráč přes battle automat (§8.1).
- **Aktivační prahy** (`AIMechanicStart`, `revoltMechanicStart`) jsou balance konstanty – MVP je má v datech od začátku, systém world je do M7 stub (registrace v tickOrder existuje, fn je no-op). Tribute/oceňování závisí na `getGoldValue` z tržního modulu (§9.1) – kontrakt existuje od M4. **Pořadí závislostí hlídá negativní kontraktní test (S-06)**: v M2–M6 (resp. do registrace market modulu v M4) stub `world` nesmí volat oceňovací API (`getGoldValue`, `market.inject`) – volání před existencí trhu je selhání testu, ne tichý no-op. Tím se vynucuje, že AI svět (M7) staví na trhu (M4), nikdy obráceně.

---

## 9. Rozhodnutí k otevřeným otázkám R1–R4

### 9.1 R1 – Klientská tržní simulace (K7) → ROZHODNUTO (D9)

Jediná část, kterou nelze věrně opsat (serverová dynamika `available` není ve zdroji – T-002a C2). Návrh:

- **Lokální tržní stav per zboží**: `marketState[goodsId] = {available, max}`, inicializovaný z katalogu (baseline z extrakce dumpu, §9.3); **cenový vzorec beze změny**: `price = round(basePrice × (1.5 − min(available,max)/max)³, 3)`, spread haggleBuy 1.35 / haggleSell 0.6 (balance data).
- **Hráčovy transakce hýbou `available`**: nákup snižuje, prodej zvyšuje (okamžitá zpětná vazba ceny – v originálu šla přes server). **Clamp `available ∈ [0, max]`** (N-02): velký nákup nesnižuje pod 0 (cena se zastaví na horní mezi `(1.5−0)³`), velký výprodej nezvyšuje nad `max` (cena se zastaví na dolní mezi vzorce) – vynuceno v market handleru a validováno ve formulas testech.
- **Denní drift (mean-reversion)**: `available += k × (baseline − available)` na denním ticku (`k` v balance datech, výchozí návrh 0.2/den) – simuluje „okolní svět“; perioda denně = vědomá reference dle chování originálu (bug V3).
- **Volitelné napojení na AI zóny od M7**: produkční zóny (policy Resource) injektují do `available`, válčící odčerpávají – kontrakt `market.inject(goodsId, qty)` existuje od M4, do M7 jej krmí jen drift.
- `getGoldValue(koš)` zůstává jediným oceňovacím API (AI ratingy, kontrakty, opravy) – závislost world→market je explicitní kontrakt; pořadí (trh M4 → AI svět M7) hlídá negativní kontraktní test S-06 (§8.2).
- **Kalibrace (S-03)**: dedikovaná balanční fáze (M9). Serverová dynamika originálu není ve zdroji, takže „referenční křivky" **nemají serverový zdroj – referencí jsou definované hratelnostní cíle**, ne rekonstrukce serverových dat. Příklady cílů (finalizuje balancér v M9): „cena se po velkém výprodeji vrátí k baseline do N herních dní", „arbitráž okamžitý nákup→prodej není zisková díky spreadu 1.35/0.6", „drift `k` nevyhladí hráčův cenový dopad během jednoho dne". DoD M9 se formuluje proti těmto cílům (§11/M9). Riziko věrnosti R-C (§12). Eskalace uživateli není potřeba pro návrh, jen pokud kalibrace ukáže zásadní odchylku herního feel.

### 9.2 R2 – Cap offline catch-upu a chování bitev/eventů (K3/K8) → ROZHODNUTO (D10)

- **Cap – dvě oddělené hodnoty (S-02; kanonická formulace, jinde se neopakuje – N-01):**
  - **(a) Technický strop `offline.capTechRealHours: 8`** – co engine prokazatelně unese, ne herní záměr. Aritmetika: 8 h = 28 800 s ÷ 0,05 s/krok = **576 000 kroků** ≈ **640 herních dní** (900 kroků/den); při cílových ~0,01 ms/krok jednotky sekund catch-upu (T-002a B5). Hodnota 8 h se **potvrzuje až po benchmarku ceny kroku v M0** (benchmark je DoD M0, §11/§14.1) – do té doby je to hypotéza, ne závazek.
  - **(b) Balanční hodnota `offline.capRealHours`** – kolik offline progresu je pro hru *zdravé*. Ladí ji M9 jako balanc/UX rozhodnutí pro uživatele; očekává se **výrazně nižší než technický strop** (640 herních dní je balančně velmi silné; cílově spíš ekvivalent desítek herních dní). Do kalibrace M9 platí dočasný default = technický strop.
  - Engine vždy uplatňuje `min(a, b)`; obě hodnoty jsou balance konstanty v datech – architektura je na nich nezávislá. Nad cap se čas nepřičítá (norma idle žánru); UI ukáže offline summary (produkce, události, bitvy).
- **Interaktivní (engine-stopping) eventy**: catch-up se na eventu **pozastaví** (dávka se přeruší, §4.1), zbytek zameškaného času zůstává v akumulátoru a **pokračuje po odkliknutí**, až do capu. Důvod: story event krátce po odchodu nesmí sežrat celý offline progres; zahazování zbytku by bylo nepredikovatelné.
- **Bitvy v catch-upu**: auto-resolve týmž deterministickým automatem bez hráčových commandů (§8.1, G2); výsledek v summary. Žádné odkládání bitvy „na návrat hráče“ – odložená invaze by rozbila kauzalitu schedule (AI stavový automat pokračuje).
- Eskalace: hodnota capu a tón offline summary jsou **balanc/UX rozhodnutí pro uživatele v balanční fázi** – architektura je na hodnotě nezávislá (konstanta v datech).

### 9.3 R3 – Dotěžení plných katalogů → ROZHODNUTO s dílčí eskalací (D11)

Plné katalogy (buildings/goods/techs/zones…) nejsou v repu (T-001 §15). Rozhodnutí:

- **Milník M1 = extrakční pipeline** (`tools/extract/`): Node skripty čtou `doc/original_source/extracted/rootscope-raw-dump.json` + `config-extract.json` + linkovací funkce ze zdroje (source map v `doc/original_source_doc.md` §10) → generují verzované JSONy do `src/data/` + **gap report** (která pole/položky se nepodařilo doložit). Skripty i výstupy commitnuté (reprodukovatelnost, prostředí bez storage).
- Schema validace (§5.2) běží nad extrahovanými daty hned – extrakce je hotová, až když katalogy projdou validací a referenční čísla (potvrzená v `original_source_doc.md`: houseTypes, companies, tech 100×1.25^level, upkeep…) sedí testem.
- **Eskalace uživateli jen pro reálné díry**: položky, které nejsou v dumpu ani odvoditelné ze zdroje (pravděpodobně části listTechs/listZone). Pro ně uživatel rozhodne: (a) dotěžit z běžící hry znovu, (b) aproximovat s označením v datech (`provenance: 'approximated'`).
- M1 blokuje obsahové milníky (M2+ potřebují joby/jídlo/budovy), proto je hned po kostře.

### 9.4 R4 – Pozdní systémy (AI svět, bitvy) → ROZHODNUTO (D12)

„Navrhnout teď, stavět později“ s pojistkami, aby návrh nezůstal na papíře:

1. **Kontrakty definované v tomto dokumentu** (§8): battle automat (signatura, čas, serializace), zone tick, frakční automat, `market.inject`, oceňování přes `getGoldValue`.
2. **Stub-registrace od M2**: systémy `world` a `battle` jsou v tickOrder a persist schématech od začátku (no-op fn) – architektonické sloty existují, žádné pozdější „dolepování“ do hotového enginu.
3. **Kontraktní testy od M2**: determinismus battle automatu (prázdná bitva), serializace `state.battle/zones` round-trip, schedule s AI eventy přežívá save/load; **negativní test S-06** – stub world nevolá oceňování (`getGoldValue`/`market.inject`) před registrací trhu v M4 (§8.2).
4. **Milestone DoD**: každý milník ověřuje, že kontrakty §8 stále platí (reviewer gate); změna kontraktu = decision record.

---

## 10. Mapování návrhu na K0–K19 (review T-003 §6)

| K | Položka (zkráceně) | Kde v návrhu | Milník |
|---|---|---|---|
| K0 | Jediný serializovatelný stav; UI read-only + commands | §3.2–3.4 (D2) | M0 |
| K1 | Local-first IndexedDB, generace, autosave triggery, lastSimTimestamp | §6.1–6.2 (D6) | M0 |
| K2 | Katalogy jako verzované assety, precache, fail loader | §5.1, §2 (SW) | M0–M1 |
| K3 | Fixed-timestep + akumulátor; live/background/catch-up; cap | §4.1, §9.2 (D3, D10) | M0 (cap UX M2) |
| K4 | Balanc do dat + čisté vzorce; Skills 2× a market perioda zapečené | §5.5 | M1+ průběžně |
| K5 | Transakční registry + validace costů; účetnictví observer | §7 (D7) | M2 |
| K6 | Rozpad Home.step; deklarativní scheduler; jeden zdroj časových hran | §4.2–4.3 | M0 (kostra), M2–M5 (systémy) |
| K7 | Klientská tržní simulace | §9.1 (D9) | M4 |
| K8 | Bitva: deterministický automat, commands, auto-resolve v catch-upu | §8.1, §9.2 (D8) | návrh teď, M7 |
| K9 | DOM/UI ven z core; události/log jako data (ring buffer) | §3.4 | M0 |
| K10 | Fail-fast string-ID registr; rozbití config monolitu | §5.6, §5.2 | M0–M1 |
| K11 | Deklarativní persist schémata, load = čistá konstrukce, verzované migrace | §6.3–6.4 | M2 (s prvními systémy) |
| K12 | Serializace mimo main thread / levný save | §6.5 (eskalační cesta) | dle benchmarku |
| K13 | Immutable katalog + modifikátory | §5.3 | M5–M6 (plně), princip od M1 |
| K14 | Akce obsahu jako data (registr efektů) | §5.4 | M1+ |
| K15 | Katalogy per typ se schématem + byId | §5.1–5.2 | M1 |
| K16 | Seedovatelný/serializovatelný RNG (streamy) | §4.4 (D4) | M0 |
| K17 | Schedule heap, countEvent → index, bez GC | §4.2 | M0 |
| K18 | Deklarativní achievementy/unlocky | §7.2 | M8 |
| K19 | Nepřenášet chat/admin; export/import savu | §6.5 | M0 (export M2) |

---

## 11. Rozpad do iterací a milníků

Milník ≈ 1–2 workflow iterace (orchestrátor mapuje na iter-003+). Každý milník končí: zelené testy (vzorce, determinismus, save round-trip; od M2 navíc **catch-up-safe invariant** – každý nový systém běží deterministicky a levně v catch-up dávce, §4.1/S-05), hratelný stav v repu, **průběžný PWA smoke check** (install + offline start na cílovém zařízení – od M0, ne až M9; N-03), reviewer gate vč. kontroly kontraktů §8 a aktuálnosti živých artefaktů (tickOrder §4.3, diagram §3.5; N-04).

| Milník | Obsah | Klíčové K | Hratelný výsledek |
|---|---|---|---|
| **M0 – Kostra & engine** | struktura repa, PWA shell (manifest+SW precache), clock+akumulátor, scheduler (heap+periodika), tickOrder kostra, RNG streamy, state container + commands skeleton, IndexedDB save minimal (1 slot+generace), benchmark ceny kroku. **DoD M0 navíc**: funkční CI gate `tsc --checkJs` (S-01/R-I); benchmark změřen na low-end mobilu *před* potvrzením technického stropu capu (§9.2a, S-02); první PWA smoke check (install+offline, N-03) | K0 K1 K2 K3 K6 K9 K10 K16 K17 K19 | „prázdná“ hra: čas běží, sezóny se střídají, save/load/pauza/rychlosti fungují offline |
| **M1 – Katalogy & balanc data** | extrakční pipeline + gap report (R3), katalogy per typ + schema validace, balance.js + formulas.js s prvními tabulkovými testy, registr efektů (kostra) | K2 K4 K14 K15 | data kompletní a validovaná; eskalace děr uživateli |
| **M2 – Populace, bydlení, jídlo** | resource vrstva (K5), persist schémata + migrace v1 (K11), systémy population/food/housing/health/crime, **offline catch-up MVP**: end-to-end smyčka (load → missedMs → dávka → cap → summary UI), vědomě minimální – dohání jen systémy M2; summary UI = prostý textový výčet, autosave triggery komplet | K5 K6 K11 K3-cap | osada žije: lidé přicházejí, jedí, umírají; offline progres splňuje acceptance criteria |
| **M3 – Produkce & joby & skilly** | forest/field/mine systémy, joby + workerEfficiency, skilly (s 2× kompenzací), plocha area/used | K4 K6 | produkční smyčka: dřevo/jídlo/ruda, přiřazování pracovníků |
| **M4 – Ekonomika & trh** | gold, daně, upkeep, klientský trh (R1/K7), karavany, getGoldValue, účetnictví reporty | K7 K5 | **MVP jádro hotové** (engine+čas+populace+ekonomika dle briefu): idle smyčka výdělek→nákup→pasivní příjem→offline progres |
| **M5 – Budovy & stavba & kontrakty** | building instances + opotřebení/opravy, projectQueue/builder, scaleCost, builder companies, contractQueue, modifikátory z budov | K13 K14 | město roste; kontraktové eventy |
| **M6 – Výzkum & dovednosti** | tech strom (sektory, 100×1.25^level), academy/university, techy jako modifikátory (K13 plně) | K13 K4 | dlouhodobá progrese |
| **M7 – AI svět, vojsko, bitvy** | zóny+frakce+revolty+questy+tribute, jednotky+upkeep, battle automat (§8.1) + battle UI, invaze/bandité, napojení trhu na zóny | K8 R4 | pozdní hra; auto-resolve v catch-upu |
| **M8 – Příběh & meta** | importantEvent systém, intro/tutoriál, story, dialogy, achievementy (K18), notifikace/confetti/hudba, devlog | K18 K14 | kompletní obsahová vrstva |
| **M9 – Balanční kalibrace & release** | kalibrace trhu (R1) **proti hratelnostním cílům** (§9.1, S-03 – serverová reference neexistuje, cíle definuje balancér) a **balanční hodnoty capu** (R2, §9.2b), mobile UX polish, **závěrečný PWA audit** (evikce, edge cases – průběžné install/offline checky běží od M0, N-03), licence/assety čistka (PROVENANCE) | K4 | release kandidát |

**Pozn. k zátěži M2 (S-04):** M2 je nejhustší milník – nese několik „prvních" věcí najednou (první resource transakce, první persist round-trip + migrace, první end-to-end catch-up, autosave). Drží se vědomě pohromadě, protože se tyto prvky navzájem ověřují (catch-up bez resource vrstvy a persist schémat nelze end-to-end otestovat). Rozsah se ale snižuje dvěma rozhodnutími: (1) **catch-up MVP je minimální** – dohání jen systémy M2 (populace/jídlo/zdraví/krimi), summary UI je textový výčet bez grafiky; rozšiřování na další systémy je práce M3–M8 přes catch-up-safe invariant (§4.1, S-05), catch-up tedy **není „hotový" v M2**; (2) **povolený split**: pokud se M2 ukáže příliš velký pro 1–2 iterace, orchestrátor jej smí bez dopadu na architekturu rozdělit na M2a (resource vrstva + persist schémata + systémy) a M2b (catch-up MVP + autosave + summary) – M2a je pak prerekvizita M2b.

**MVP jádro = M0–M4.** Acceptance criteria zadání (instalace, offline, idle smyčka, spolehlivý save vč. offline výpočtu) jsou splnitelná po M4; M5–M8 přidávají věrnost plného rebuildu; M9 ladí.

Řazení minimalizuje riziko R4: nejdražší nejistoty (cena kroku, extrakce dat, catch-up) jsou v M0–M2; pozdní systémy mají kontrakty a stuby od M0/M2, takže M7 je „naplnění slotů“, ne přestavba.

---

## 12. Rizika a mitigace

| # | Riziko | Pravděp./Dopad | Mitigace |
|---|---|---|---|
| R-A | **Extrakce katalogů neúplná** (R3) – dump nepokryje vše (zejm. techs/zones) | Střední / Vysoký | M1 gap report; schema validace odhalí díry hned; eskalace s volbou dotěžit-z-runtime vs. aproximace s `provenance` flagem; referenční čísla testem proti `original_source_doc.md` |
| R-B | **Cena kroku** nedovolí 8h catch-up v rozumném čase | Střední / Střední | Benchmark v M0 (DoD: změřeno na low-end mobilu); levný krok by-design (K6, žádné alokace v hot-path); chunking s progress UI; eskalace: Worker (D13), snížení capu (balance konstanta) |
| R-C | **Klientský trh diverguje od feel originálu** (R1) | Střední / Střední | Vzorec ceny 1:1; jediný nový prvek je drift `k` (jedna konstanta); kalibrace M9 s referenčními křivkami; volitelné napojení na zóny zlepšuje věrohodnost |
| R-D | **Battle „feel“** po převodu ms→tick | Nízká / Střední | Tick 30 ms 1:1 (žádné přepočty cooldownů); playtest v M7; damage vzorce tabulkově testované proti originálu |
| R-E | **Pozdní systémy zůstanou na papíře** (R4) | Střední / Vysoký | Kontrakty §8 + stub registrace od M2 + kontraktní testy + milestone DoD (D12); master checklist orchestrátora drží M7 jako samostatný milník |
| R-F | **iOS/Safari evikce IndexedDB** (PWA bez používání) | Střední / Vysoký pro hráče | `navigator.storage.persist()`; export/import savu jako string (K19); výzva k exportu v UI po dlouhé době; autosave generace |
| R-G | **Licence/assety originálu** (PROVENANCE) | Jistá / Vysoký při release | Scope OUT zadání pro 1:1 převzetí; vlastní assety/jména/příběhová textace v M8–M9; evidováno, rozhodnutí uživatele před veřejným vydáním |
| R-H | **Balanc drift vs. originál** při portu mechanik | Střední / Střední | K4: balance data + čisté vzorce + tabulkové testy s referenčními hodnotami; vědomé odchylky (Skills 2×, market perioda, home.js:970) explicitně v datech s poznámkou |
| R-I | **Disciplína bez build kroku** (JSDoc, hranice vrstev) – dle review T-002 **největší reálné riziko návrhu** (větší než D1/D10/R1 samotné) | Střední / **Vysoký** | CI gate: `tsc --checkJs` povinný a **funkční už jako DoD M0** (§11; bez něj se no-build výhoda mění v údržbovou past), grep na zakázané importy v core (DOM/fetch/`Date.now()`/`Math.random()` – chrání i determinismus catch-upu), reviewer checklist; pravidla v §3.1 jsou vynutitelná mechanicky |
| R-J | **Velikost savu v pozdní hře** (zóny, schedule, log) | Nízká / Nízký | Allowlist schémata (jen dynamika), log ring buffer se stropem, schedule kompaktní pole; měřit od M2 |

Pozn. k R2 (N-01): kanonická formulace capu – technický strop 8 h (potvrzení po benchmarku M0) vs. oddělená balanční hodnota laděná v M9 – je **pouze v §9.2**; zde se záměrně neopakuje, aby neexistovala dvě mírně odlišná znění.

---

## 13. Předpoklady a nejistoty

1. **Katalogová data lze z dumpu + zdroje zrekonstruovat v úplnosti dostatečné pro věrný balanc** – ověří M1 gap report; do té doby jsou obsahové milníky (M2+) plánem, ne závazkem rozsahu.
2. **Cena kroku ~0,01 ms je dosažitelná** na low-end mobilu (řádový odhad T-002a B5) – ověří benchmark M0; návrh má dvě eskalační cesty (Worker, cap).
3. **Serverová dynamika trhu originálu zůstane neznámá** – klientská náhrada (§9.1) je vlastní návrh; „věrnost“ se měří proti feel, ne proti referenci. Kalibrační referencí v M9 jsou proto **definované hratelnostní cíle** (§9.1, S-03), ne rekonstrukce serverových křivek – jinak by DoD M9 byl nesplnitelnou podmínkou.
4. Pořadí vyhodnocení uvnitř dne v originálu (Home.step) bude **dotěžováno per mechanika při portu** – tickOrder je živý artefakt; chybné pořadí má balanční dopad (mitigace: testy proti referenčním scénářům).
5. Vendorovaný preact+htm funguje bez kompilace na cílových prohlížečích (iOS Safari ≥ 16, Android Chrome) – nízké riziko, ověřit v M0 PWA auditu.
6. Žádný server, účty, multiplayer, monetizace, nativní obal – Scope OUT zadání, návrh s nimi nepočítá ani „pro jistotu“ (YAGNI; export/import string je jediný ústupek přenositelnosti).

---

## 14. Doporučení pro implementaci (handoff pro coder/challenger)

1. **M0 začít benchmarkem kroku** (prázdný tick + scheduler) dřív, než se zapustí systémy – rozhoduje o D13 a capu. Benchmark je **DoD M0** a technický strop capu (§9.2a) se potvrzuje až po něm, ne paušálně předem (S-02).
2. Determinismus testovat od prvního dne: `hash(state)` po N krocích se seedem v CI – každý PR, který jej změní bez změny balance dat, je podezřelý.
3. Persist schémata psát **současně se systémem** (ne dodatečně) – reviewer gate: nový systém bez persist schématu a testu round-trip neprochází.
4. Balanc čísla extrahovat **při portu každé mechaniky rovnou do balance.js** s odkazem na řádek originálu – nikdy inline do kódu.
5. Kontrakty §8 zanést do repa jako typy + kontraktní testy už v M2 (stub world/battle), ať R4 pojistky reálně existují.
6. Tento návrh nechat projít **challenger** review zejména v bodech: D1 (no-build), D10 (cap 8 h a jeho herní ekvivalent), §9.1 (drift konstanta).

---

*Konec návrhu. Navazuje na iter-01 artefakty (T-001/T-002a/T-002b/T-004, review T-003) – tam, kde tento dokument cituje K/R/A/B/C/D položky, je zdrojem pravdy review T-003 §6–7 a příslušné analýzy.*
