# Review Gate M7a-1 — iter-016 T-008 (final)

- **Task**: T-008 (reviewer, Opus) — závěrečný REVIEW GATE M7a-1 (zóny/jednotky/napojení trhu)
- **Agent**: reviewer
- **Datum**: 2026-06-14
- **Base→HEAD**: `afac3b9..HEAD` (jen iter-016)
- **Pravomoc**: re-run (NO-GO). QA (T-007) dala GO empiricky; tato review ověřuje proti KÓDU.

---

## VERDIKT: **GO**

M7a-1 splňuje DoD. Všech 6 tvrdých invariantů ověřeno **proti kódu** (ne proti tvrzením). Determinismus AI světa v dávce potvrzen: M-1 round-robin se **reálně tiká** na day-edge, M-2 re-hydratace je **bez load-only větve a bez driftu** (sdílená `hydrateZones`, id-based merge, fresh==load hashState). Kontrakt §8.2 beze změny signatur. CI 1179/1179 PASS (nezávisle ověřeno), M7a cílené suity 82/82 PASS.

Nálezy: **0 blocker, 0 major, 4 minor, 2 nit.** Žádný z nich neblokuje gate; doporučeny k zapracování v M7a-2 (kde se rozšiřuje processZone/processAI a zónové ratingy se reálně začnou číst).

---

## Stanovisko k DoD M7a-1

| DoD komponenta M7a-1 | Stav | Důkaz (kód) |
|---|---|---|
| **Zóny tikají + ekonomika** | ✅ SPLNĚNO | `worldTick` (day order 30) → round-robin `processZone` přes `_absDay`; ekonomika (goldDemand/goldProduction, policy 0/1/2, gold shortage) implementována 1:1 z originálu. |
| **Jednotky (rekrutace + upkeep)** | ✅ SPLNĚNO | `recruitUnit` command přes `pay`/`canAfford`, reuse `player.totWarriors/totArchers` + `upkeep.military` (M4a). `registerRecruitUnit` v bootstrapu (main.js:113). Žádný duplicitní upkeep. |
| **Napojení trhu (T5)** | ✅ SPLNĚNO | `marketInject(+)` produkční / `marketInject(−)` válčící, clamp [0,max] interní, `getGoldValue` konverze. Signatury beze změny. world.tick(30) < market.drift(35). |
| **Frakční AI** | ⛔ MIMO SCOPE | M7a-2 (DR-016-01 split). Stuby v processZone jasně označené no-op. Korektní. |

**DoD M7a-1 = SPLNĚNO.** (DoD celého M7a se vyhodnotí po M7a-2 dle split-triggeru.)

---

## Stanovisko k determinismu (povinné, ověřeno proti kódu)

### M-1: round-robin se REÁLNĚ tiká (silent-no-op bug opraven) — ✅ POTVRZENO
`worldTick` (world.js:343-360) gatuje na `state.season._absDay % slot === 0`, **NIKOLI** na mrtvý `curStep % dist`:
```js
const day  = state.season._absDay;                 // monotónní, persistovaný (season fully-saved)
const slot = Math.max(1, Math.ceil(PERIOD_DAYS / len));   // 5/13 → ceil=1
if (day % slot === 0) {
  const zoneIndex = Math.floor(day / slot) % len;  // bezstavový round-robin
  processZone(state, zones[zoneIndex].id, rng);
}
```
- Pro 13 zón `slot=1` → každý den 1 zóna; za 13 dní projdou všechny indexy (test T1-1 `processedIndices.size === len`).
- `zoneIndex` je čistá funkce `_absDay` + `zones.length` → **žádný kurzor v `state.world`** → přežije save/load triviálně.
- homeZone (index 0) se v jeho slotu zavolá, ale `processZone` ho na ř.55 přeskočí (early return) → 12 reálně zpracovaných zón. Korektní (homeZone = hráč).
- `_absDay` je persistovaný: season je v allowlistu „always-save" (persistSchema.js:44) → bezstavovost potvrzena.
- **Empiricky + kódem**: ověřeno, že processZone reálně mutuje zóny (goldDemand/goldProduction se nastaví) — NE tichý no-op.

### M-2: re-hydratace bez load-only větve / bez driftu (DR-012-02) — ✅ POTVRZENO
- **Sdílená `hydrateZones(state)`** (world.js:373) volaná z **OBOU** cest: `createInitialState` (createInitialState.js:141) i `load` Step 5 (load.js:317). Žádná load-only ani init-only větev (M5-R1 gate splněn).
- **id-based merge** (world.js:392 `catalogZones.map` + `byId.get(def.id)`), **NE** generický `Object.assign` na pole. Statika z katalogu přepisuje stale save; dynamika se páruje per-`id`; stale tail (zóna v save mimo katalog) se zahodí; nová zóna v katalogu dostane fresh defaulty.
- **load.js vyjímá `zones`/`factions` z generického world-merge** (load.js:228-234) → ukládá raw dynamiku, kterou Step 5 `hydrateZones` přerovná. Generický `Object.assign` na pole je vědomě obejit — přesně dle §8.1.b.
- **persist = jen dynamický stav** (persistSchema.js:248-286): per zóna `id/liege/policy/numWorkers/warriors/archers/resources/tribute/favour/goldStore/notEnoughGold/curQuest`; statika (name/originalLiege/neighbours/targetWorkerNum/growth/immunity) re-hydratována z katalogu.
- **fresh-vs-load hashState identický**: test T1-3 (`hashState(createInitialState) == hashState(load(save(...)))`), round-trip break-uprostřed test — PASS. Žádný drift.
- **Staré savy** (undefined zones/factions): `hydrateZones` má guard `Array.isArray(...) ? ... : []` → re-hydratace z katalogu (13 zón / 4 frakce). Aditivní migrace, undefined-safe.

### Ostatní determinismus
- **Jediný `rng('world')`** (world.js:347 `makeRng(state,'world')`); stream existuje v STREAM_NAMES (rng.js:10). Žádný `Math.random`/`Date.now`/DOM v `world.js`/`recruitUnit.js` (ověřeno grepem). Stochastické zaokrouhlení přes `randRound(x, rng)`.
- **Catch-up-safe**: O(1)/den (max 1 zóna/den), žádné O(n²), žádné alokace v hot-path. Batch == incremental (QA empiricky + struktura kódu).

**Závěr determinismu: round-robin reálně tiká; re-hydratace bez driftu. Oba M-1/M-2 fixy korektní v kódu.**

---

## Kontrolní seznam tvrdých invariantů (proti kódu)

| # | Invariant | Stav | Lokace |
|---|---|---|---|
| 1 | M-1 zone tick reálně tiká (`_absDay` round-robin, ne `curStep%dist`, bezstavový) | ✅ | world.js:343-360 |
| 2 | M-2 sdílená `hydrateZones` (fresh+load), id-merge, persist=dynamika, fresh==load hash | ✅ | world.js:373-455, load.js:228-317, createInitialState.js:141, persistSchema.js:248-286 |
| 3 | §8.2: `marketInject`/`getGoldValue` beze změny signatur; inject(+)/drain(−)/clamp; world.tick<drift | ✅ | market.js:91/103, world.js:198-225, tickOrder.js:204-205 |
| 4 | battle.js NEDOTČEN | ✅ | git diff prázdný pro battle*.js |
| 5 | Jednotky: reuse totWarriors/totArchers + upkeep.military; recruitUnit přes pay; register v bootstrapu | ✅ | recruitUnit.js, main.js:113, upkeep.js (M4a beze změny) |
| 6 | Jediný `rng('world')`; žádný Math.random/Date.now/DOM v core; catch-up O(1)/den | ✅ | world.js:347; grep clean |

Schválené gapy (G-LISTZONE / G-WORLD-DAYEDGE / G-WORLD-INJECT-QTY / G-RECRUIT-TXAUDIT) — tom-proxy T-003 SCHVÁLENO; dokumentace ověřena (`provenance:'approximated'` v zones.json `_meta`, balance komentáře, recruitUnit JSDoc). **Neflagovány jako blocker.**

---

## Nálezy

### MINOR-1 — `calcMilitaryRating` / `calcEconomicRating` jsou mrtvý kód
**`src/core/systems/world.js:299-328`** — obě fn jsou definované (ne-exportované `function`), ale **nikde se nevolají** (grep src/+test = 0 callerů). processZone je nevolá (ř.287-288 komentář „computed on-demand by selectors"), ale žádný selektor neexistuje. → ~30 řádků nedosažitelného kódu v produkčním buildu.
**Návrh**: buď (a) odstranit a obnovit v M7a-2 spolu se selektory, které je čtou (processAI ratingy potřebuje), nebo (b) jasně označit `// M7a-2: wired by faction selectors` komentářem u definice (aktuálně chybí; ostatní M7a-2 stuby v processZone jsou označené, tyto ne). Preferuji (b) pro konzistenci s ostatními stuby.

### MINOR-2 — `goldDemand`/`goldProduction` persistovány navzdory design §8 (derivace)
**`src/save/persistSchema.js:263-265`**, **world.js:421-422** — design §8 tabulka explicitně řadí `goldDemand`/`goldProduction` mezi **NEUKLÁDAT (re-derivace)**. Implementace je **persistuje** (a hydrateZones je čte ze save), aby fresh==load hashState seděl. Jde o vědomou odchylku od designu (QA ji dokumentuje, regresní riziko #3). Funkčně korektní, ale **rozchází se s designem §8 bez decision recordu**.
**Návrh**: malá DR-poznámka (nebo doplnit do gap-reportu) „semi-derived persistované kvůli M-2 hashová stabilita". Alternativa (čistší, ale větší): nepersistovat a místo toho je v `hydrateZones`/`createWorldState` dopočítat z `warriors/archers/numWorkers` **na obou cestách identicky** (pak by hash seděl bez persistu). Pro M7a-1 ponechat jak je (nízké riziko), zapsat odchylku.

### MINOR-3 — homeZone mirror (`homeZone.warriors/archers ↔ player.totWarriors`) neimplementován
**`src/core/systems/world.js:179`** (komentář „handled in §5.2 T4") + recruitUnit.js — design §5.2 / G-HOMEZONE-MIRROR popisuje zrcadlení hráčových jednotek do `homeZone`. recruitUnit aktualizuje **jen** `player.totWarriors/totArchers`; homeZone.warriors/archers zůstávají na katalogových defaultech a homeZone je v processZone přeskočena. Single-source-of-truth (`player.tot*`) je OK, ale **mirror, na který odkazuje komentář ř.179, nikde není** → komentář je zavádějící (odkazuje na neexistující implementaci).
**Návrh**: upravit komentář ř.179 na „homeZone units NOT mirrored in M7a-1 (single source = player.tot*); mirror deferred to M7a-2 if processAI needs homeZone military rating". Funkčně bez dopadu v M7a-1 (homeZone se nezpracovává, frakce nečtou homeZone.warriors).

### MINOR-4 — Living artifact `docs/tickOrder.md` je stale (world.tick stále „STUB")
**`docs/tickOrder.md:33,54`** — tabulka uvádí `world.tick | day | 30 | world.tick | STUB` a ASCII diagram `worldTick(stub)`. Po M7a-1 už world.tick NENÍ stub (round-robin processZone + marketInject). Brief §5 výslovně žádá „tickOrder doc aktuální (world.tick pozice, gatherTributes je M7a-2)". Pozice (30 před market.drift 35) je správná, ale label „STUB" je neaktuální.
**Návrh**: změnit `STUB` → `ACTIVE (M7a-1: round-robin processZone + marketInject)` a diagram `worldTick(stub)` → `worldTick(round-robin)`. Reviewer-gate položka „living artifact ve stejném commitu" formálně nesplněna (drobné).

### NIT-1 — `immunity` typová nekonzistence (boolean v katalogu vs `>0` test)
**`src/data/zones.json` (`immunity: false`)** vs **world.js:300 (`if (zone.immunity > 0)`)** a **world.js:406 (`def.immunity || 0`)**. Katalog má boolean `false`; hydrateZones ho převede `false || 0 → 0`; `calcMilitaryRating` testuje `> 0`. Dnes konzistentní (vždy 0/falsy), ale kdyby katalog dostal `immunity: true`, `true || 0 → true`, a `true > 0 → false` (coerce) → tichá chyba. Navíc `calcMilitaryRating` je stejně mrtvý (MINOR-1).
**Návrh**: sjednotit na číslo v katalogu (`immunity: 0`) nebo normalizovat v hydrateZones (`def.immunity ? 1 : 0`). Nízká priorita.

### NIT-2 — `factions[].allies_dyn` vs design `allies` — dvojí klíč
**`src/core/systems/world.js:444,451`** — hydrateZones drží statické `allies` (z katalogu) i dynamické `allies_dyn` (ze save). Design §8.1.a uvádí `allies` jako mutovatelný (dynamický). Dvojí klíč je obrana proti přepisu statiky, ale `allies_dyn` se v M7a-1 nikde nečte (frakce = M7a-2) a v persistSchema.js:278-282 se `allies_dyn` ani neukládá (jen state/wantToAttack/nextTarget).
**Návrh**: pro M7a-1 neškodné; v M7a-2 sjednotit názvosloví s designem (`allies` dynamický, statická aliance jako `baseAllies`) nebo `allies_dyn` zdokumentovat. Zapsat jako TODO pro M7a-2.

---

## Soulad s designem + architekturou

- **§2.1 (M-1 round-robin)**: implementace přesně dle kanonického vzorce (slot/zoneIndex/_absDay). ✅
- **§2.2 (processZone)**: policy 0/1/2 pořadí dle originálu; bug-fixy aplikovány a označené — `archres→archers` (world.js:173, G-WORLD-ARCHRES), `notEnoughgold` sjednoceno (world.js:247, G-WORLD-NOTENOUGH). ✅
- **§8.1 (hydrateZones)**: id-merge, fresh==load, persist jen dynamiky — přesně dle kontraktu. ✅
- **§6 (T5)**: inject po tribute akumulaci, válčící drain, pořadí < drift. ✅
- **Odchylky**: goldDemand/goldProduction persist (MINOR-2, vědomá), ratingy mrtvé (MINOR-1), homeZone mirror neimpl. (MINOR-3) — všechny benigní v M7a-1 scope.
- **M7a-2 stuby**: revolt (world.js:280-282) a quest (world.js:284-285) jsou **jasně označené no-op** s odkazem na §2.2.4/§2.2.5/§16. Žádná polovičatá logika. ✅

---

## Reuse / simplify / mrtvý kód

- **Reuse OK**: upkeep.military (M4a) beze změny; pay/canAfford reuse; BALANCE.army cost reuse; rebuildBuildingDerived vzor pro hydrateZones; rng/market kontrakty beze změny.
- **Mrtvý kód**: calcMilitaryRating/calcEconomicRating (MINOR-1) — jediný reálný nález.
- **Simplify**: žádný velký přepis nutný. randRound je malá lokální čistá fn (OK, design povoluje formulas.js i lokální).

---

## Persist / migrace

- persist allowlist korektní (jen dynamika zón/frakcí; statika z katalogu). ✅
- Staré savy (prázdné/undefined zones) → hydrateZones z katalogu (undefined-guard). ✅
- Aditivní migrace, žádná destruktivní změna. ✅
- `home.store` přidán do persistu (load.js:139, persistSchema.js:146) kvůli round-trip determinismu — korektní vedlejší M-2 fix. ✅

---

## Doporučení dalšího kroku

**APPROVE (GO).** M7a-1 je hotové, deterministické, bez driftu, kontrakt §8.2 dodržen. Žádný re-run není potřeba.

Doporučené follow-upy pro **M7a-2** (ne blokující):
1. MINOR-1: zapojit nebo označit/odstranit calcMilitaryRating/calcEconomicRating (selektory ratingů potřebuje processAI).
2. MINOR-2: DR/gap-poznámka k persistu goldDemand/goldProduction (odchylka od §8).
3. MINOR-3 + MINOR-4: opravit zavádějící komentář homeZone (world.js:179); aktualizovat `docs/tickOrder.md` (STUB→ACTIVE).
4. NIT-1/NIT-2: immunity typ + allies/allies_dyn sjednotit při implementaci frakcí.

---

## Souhrn

- **VERDIKT**: **GO**
- **DoD M7a-1**: **SPLNĚNO** (zóny+ekonomika ✅, jednotky ✅, napojení trhu ✅; frakce = M7a-2)
- **Determinismus**: round-robin **reálně tiká** (M-1 ✅), re-hydratace **bez driftu / bez load-only větve** (M-2 ✅)
- **Nálezy**: 0 blocker, 0 major, 4 minor, 2 nit
- **CI**: 1179/1179 PASS (nezávisle ověřeno); M7a suity 82/82 PASS
