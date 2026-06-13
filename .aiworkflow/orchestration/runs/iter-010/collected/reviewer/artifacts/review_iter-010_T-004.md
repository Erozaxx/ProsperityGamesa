# Review Gate – iter-010 T-004 (DoD M4a: ekonomika gold/daně/upkeep auditovatelná z událostí)

- **Verdikt**: **GO** (s jedním SUGGESTION follow-upem pro M4b – neblokuje M4a)
- **Reviewer**: reviewer (Opus), s pravomocí re-run
- **Brief**: BRIEF-039
- **Datum**: 2026-06-13
- **Scope**: M4a ekonomika – taxes/upkeep/burnWood/spoilage/accounting observer + WIRING + persist/migrace + UI

---

## Shrnutí

Implementace M4a odpovídá návrhu `design_iter-010_T-001.md` bez odchylek. Účetnictví je
realizováno jako čistý observer nad txEvent streamem, wiring je reálně zapojen v `bootSequence`
(ne jen unit), účetní invariant `Σ gold tx == Δ gold` je testovaný (live i catch-up) a zelený,
persist+migrace v1→v2 round-trip funguje, core zůstává bez DOM (lint:core gate prošel).
`npm run ci` zelené: tsc 0 chyb, lint:core OK, **693 testů pass / 0 fail**.

Všechny scope-IN položky M4a jsou splněné a auditovatelné. Nalezena jedna **preexistující**
díra v auditovatelnosti goldu mimo scope M4a (crime.js inline mutace) – klasifikováno jako
SUGGESTION s follow-upem do M4b, protože se v M4a fakticky nespouští a invariant testy jsou zelené.

---

## Ověřené scope-IN položky (důkazy v kódu)

### 1. Účetnictví OBSERVER – žádná inline mutace v platebních větvích ✓
- `core/resources/accounting.js`: `recordTx` je čistá agregace (byCause/goldEarned/goldSpent/
  produced/consumed), `closeMonth` jen přesouvá `current → history` (cap 12) a otevírá nový report.
  Žádná mutace goldu, žádná rekurze (recordTx neemituje další tx).
- `core/resources/transactions.js:45,61`: `pay`/`grant` emitují neutrální txEvent `{key,amount,cause,step}`
  jen pokud `ctx.emitTx` existuje – platební logika je oddělená od reportingu (anti-pattern originálu
  `player.js:146` opraven dle DA1/Alt A).

### 2. WIRING reálně (ne jen unit) ✓
- `app/main.js:165`: `ctx.emitTx = (tx) => recordTx(state, tx)` – closure nad finálním `state`,
  nastaveno PO `bootstrapEngine()` a PŘED loop/catchup. Pokrývá live loop i catch-up (sdílí `ctx`).
- `app/main.js:88`: `registerSetTaxRate(creg)` v `bootstrapEngine` vedle setSpeed/assignJob/startSkill.
- `app/main.js:209` (`onImport`): používá `Object.assign(state, result.state)` → zachovává referenci,
  takže `emitTx` closure dál ukazuje na správný objekt (kritické, dle §4.3 pozn. – OK).
- `core/engine/tickOrder.js:163-167,188-193`: `taxes.local`(5days,10), `taxes.monthly`(month,20),
  `upkeep.military`(month,30), `council.closeMonth`(month,40 – POSLEDNÍ), `home.burnWood`(day,60)
  registrované i zařazené v periodics. closeMonth je správně order 40 (po všech month txEventech).
- `ui/App.js:15,22,108`: `CouncilScreen` importovaný, tab `{id:'council',label:'Rada'}`,
  tab-content napojený přes `send`. `selectFinance` v selektorech, setTaxRate ovladač v screens.js.

### 3. Soulad s návrhem + reálnými čísly ✓
- `balance.js:84`: `tax.centerBase = 22` (TAXCENTERBASE). `army.warriorUpkeep = 108`,
  `archerUpkeep = 162` (balance.js:108,112).
- `formulas.js`: `localTaxAmount=floor(localRate×workers×rate)`, `monthlyTaxAmount=floor(rate×workers×
  taxRate×centerBase)`, `militaryUpkeep=w×108+a×162`, `firewoodNeeds` Zima(3)=floor(0.5×w),
  Jaro/Podzim(0/2)=floor(0.2×w), Léto(1)=0 – odpovídá §2.3.
- `food.js:102-116`: `foodSpoilage` napojen na observer přes `pay({[foodId]:lost},'spoilage:food',ctx)`
  per-foodId; spoilage formula beze změny (`Math.trunc(rate×count)`).
- Tabulkové testy (taxes/upkeep-burnwood/food) ověřují reálné hodnoty – PASS.

### 4. Účetní invariant Σ tx == Δ gold ✓
- `test/accounting-invariant.test.js`: manuální tx, full tick run (27000 kroků přes month edge),
  per-měsíc report net == gold delta – PASS.
- `test/m4a-edge.test.js`: catch-up multi-měsíc (54000 kroků, 2 měsíce) Σ gold tx == Δ gold,
  determinismus live==batch – PASS.

### 5. catch-up-safe; persist + migrace v1→v2; core bez DOM ✓
- Nové systémy deterministické (žádný Math.random/Date.now), běží na edge (ne každý step).
- `save/schema.js`: `SAVE_VERSION = 2`. `save/migrations.js`: v1→v2 doplňuje taxRate/totWarriors/
  totArchers/diseaseFromColdChance/notEnoughMilitaryFunding/council + bump saveVersion.
- `save/persistSchema.js:11,137-139,185-190` + `save/load.js:80-84,173-181`: player M4a pole, home flag
  a council blok serializované i obnovené symetricky (round-trip). Testy persist/m4a-edge PASS.
- lint:core gate (CI) prošel → core bez DOM zachováno.

---

## Nálezy

### SUGGESTION-1 (follow-up M4b, NEblokuje M4a): crime.js obchází resource vrstvu
- **Soubor**: `src/core/systems/crime.js:42-44`
- **Popis**: `crimeDaily` (noon edge) odečítá gold přímou mutací
  `state.player.gold = Math.max(0, state.player.gold - goldLoss)` – mimo `pay`/`grant`, bez emitTx.
  Toto porušuje design DA5/§5 grep-gate „žádný `player.gold` mimo handlers.js" a vytváří latentní
  díru v auditovatelnosti: při `incidents>0` by se gold změnil bez txEventu → invariant by se rozbil.
- **Proč NEBLOCKER pro M4a**:
  1. Preexistující kód z iter-007 M2a-2, **mimo scope-IN** tasku M4a (taxes/upkeep/burnWood/spoilage).
  2. V M4a se cesta fakticky nespouští: `crimeCount(pop≈50, crime.level≈baseline)` dává `incidents=0`,
     proto invariant test (27000 kroků) i catch-up test (54000 kroků) jsou ZELENÉ.
  3. DoD M4a (ekonomika gold/daně/upkeep auditovatelná) je funkčně splněna – všechny M4a toky goldu
     jdou přes pay/grant a jsou v reportu.
- **Doporučená oprava (M4b, kdy crime gold-loss reálně škálovat)**: přesměrovat odpočet přes
  `pay(state, { gold: goldLoss }, 'crime:loss', ctx, state.engine.curStep)` (crimeDaily už `ctx`
  v signatuře má – nyní `_ctx`). Doplnit do grep-gate test, který selže na `state.player.gold =`
  v `core/systems/*`. (Pozn.: spadá to spíš do M4b/security ekonomiky než do M4a.)

### NITPICK-1: `persistSchema.applyPersist` zapisuje `payload.council = undefined`
- `save/persistSchema.js:189`: else-větev nastaví `payload.council = undefined` (vytvoří klíč
  s hodnotou undefined). Neškodné (council vždy existuje po createInitialState/migraci), ale čistší
  by bylo klíč vynechat. Bez dopadu na funkčnost.

---

## Rizika / regrese
- **Nízké**: nové systémy izolované přes resource vrstvu; observer je čistá funkce.
- **Střední (dokumentováno)**: `council.closeMonth` musí zůstat order 40 (POSLEDNÍ v month edge);
  přidání month systému s order>40 bez aktualizace by způsobilo neúplné reporty. Ošetřeno komentáři.
- **Latentní (SUGGESTION-1)**: crime.js gold-loss obejde audit, jakmile populace/crime poroste (M4b).

---

## Gap flags (dokumentované, mimo M4a – OK)
G-TAX-LOCALRATE, G-TAX-MONTHLYRATE, G-TAX-CURWORKERS, G-FIREWOOD-SOURCE, G-SEASON-START
(provenance:approximated, kalibrace M9 / zdroj M5) – v souladu s návrhem.

---

## Závěr
**GO** – DoD M4a splněno: ekonomika gold/daně/upkeep funguje a je auditovatelná z událostí
(účetní invariant Σ tx == Δ gold ověřen live i catch-up), wiring reálně zapojen, účetnictví je
observer, persist+migrace v1→v2 round-trip zelené, core bez DOM, `npm run ci` zelené (693/0).
SUGGESTION-1 (crime.js audit) doporučen jako follow-up do M4b – neblokuje uzavření iter-010.
