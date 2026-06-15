# Design M7b — Battle automat (bitvy live i offline auto-resolve)

- **Doc ID**: DESIGN-018-001
- **Iteration**: iter-018 (M7b — Bitvy → dokončuje M7)
- **From**: architect (T-001)
- **Pro**: Sonnet coder (implementace bez dalších architektonických rozhodnutí)
- **Date**: 2026-06-15
- **Drží**: architektura iter-002 §8.1 (K8/D8/G2), kontrakt `battleStep` signatura beze změny
- **Zdroj pravdy mechanik**: `doc/original_source/modules/prosperity/services/battle.js`
- **Reference**: master plán iter-003 §3/iter-015(M7b) T1–T5 + §1.2; DR-013-00; DR-016-01; DR-017-01; DR-018-01; REVIEW-018-002

---

## CHANGELOG

### Revize T-002a (2026-06-15, reviewer gate REVIEW-018-002 GO-s-podmínkami → DR-018-01)
Zapracovány 3 major podmínky + serializovatelnost ostraha. **Žádná změna architektury ani kontraktu §8.1** — pouze závazné upřesnění implementace pro 1:1 originál + determinismus. Coder je nyní vázán doslova; podmíněné formulace („pokud chybí…", „doporučeno…") změněny na **POVINNÉ (MUST)**.

- **M-1 (baseRevival fallback, major)** — §6.1a (nový), §6.3, §6.5 bod 4: `state.player.baseRevival` v repu NEEXISTUJE (grep=0). Závazný deterministický zdroj: `BALANCE.battle.baseRevivalDefault = 0.25` (provenance:'approximated'). `revivePlayer` bere `baseRevival` parametrem; `resolveBattleOutcome` čte `state.player.baseRevival ?? BALANCE.battle.baseRevivalDefault`. Bonusy z `unlockedTechs` (existuje), chybějící → 0. Žádné pole nesmí dát `undefined`/`NaN`.
- **M-2 (opponent AI cd double-decrement, major)** — §7.3 přepsáno: opponent cd se dekrementuje **DVAKRÁT za tick** (jednou `attackWith` nastaví `cd=attack.cd`, jednou samostatný `cd--` clamp≥0 PO útoku, KAŽDÝ tick, i v ticku útoku). Přesná 1:1 sekvence orig ř.265-291. Player cd-down zůstává na začátku (orig ř.239-247).
- **M-3 (crit rng pevný počet, major)** — §4 bod 5 + §6.1 + §11: crit roll `rng.next() < critChance` se losuje **přesně 1× per skutečně provedený útok PO guardu** (number>0 && cd==0), NE před guardem, NE per focus cíl, NE 2×. Pevná pozice rng('battle') streamu.
- **F-1 (serializovatelnost ostraha, major)** — §3.2, §8.1a (nový): explicitní ZÁKAZ neserializovatelných hodnot v `state.battle`: žádná orig cyklická `units.army` ref (ř.249/251), žádné funkce/closury, `undefined`, ani objektové `liege`/`lastAttack`. POVINNĚ `liege: string`, `lastAttackId: string`.
- Minor/nit: m-1 (critChance konstanta AI 0.1 závazně), m-2 (attacker forces = capital, závazně), m-4 (init `tick:0`/`reaction:60` explicitně v §3.2), n-2 (hluboký klon side/Unit závazně v §3.3).

---

## 0. SHRNUTÍ ROZHODNUTÍ (TL;DR)

| Téma | Rozhodnutí |
|---|---|
| **SPLIT M7b** | **NE.** T1(L)+T2(M)+T3(M)+T4(M)+T5(M) do jedné iterace. Důvod níže §1. |
| **battleStep signatura** | **Beze změny** `battleStep(bs, commands, rng) → bs'` (kontrakt §8.1, stub ř.29). Pure, žádná mutace sdíleného stavu. |
| **G2 auto-resolve** | **Triviálně zadarmo**: `battle.tick` je periodic `every:'step'` (tickOrder.js:230) → běží na KAŽDÉM step edge stejně v `advance()` (live) i `runCatchupBatch()` (offline), protože obojí volá `step()` (clock.js:44, catchup.js:50). **Žádná druhá implementace.** Auto-resolve = `battleStep` s commands=[] (obranná AI politika uvnitř automatu). |
| **Sub-step 30 ms** | 1 herní step = 50 ms (STEP_MS). 1 battle tick = 30 ms (originál). Battle tick **NENÍ** vázán na herní step 1:1 — `battleTick(state)` na každém step edge spotřebuje akumulovaný čas a provede `floor(accBattleMs/30)` `battleStep` sub-stepů. Akumulátor `state.battle.subAccMs`. §3. |
| **Cooldowny** | 1:1 v battle-ticích z originálu: charge 80, shieldWall 150, flank 180, volley 120, fireArrows 220, reaction 60. Data v `military.json` (per attack). §5. |
| **Damage vzorec** | `battleDamage(number, strength, multiplier, crit)` = `ceil(max(sqrt(number), number/10) * strength * multiplier * (crit?1.5:1))` (orig ř.442). + defense model, revival. Do `formulas.js` + tabulkové testy. §6. |
| **Obranná AI** | Skriptované akce dle cooldownů uvnitř `battleStep` (player side když commands prázdné nebo auto). Politika §7. |
| **Persist** | `state.battle` = celý automat (allowlist už `payload.battle = s.battle ?? null`, persistSchema.js:300). Kill-resume bit-identický. §8. |
| **G-MILITARY-STATS** | Combat staty (strength/defense/critChance/cd) approximovat z originálu + `provenance:'approximated'`, kalibrace M9. §6.5. |
| **startBattle napojení** | Naplnit `startBattleStub` (world.js:1189) → `create` + nasazení `state.battle`. Bandité přes schedule. §9. |
| **tickOrder** | `battle.tick` step/30 už registrován (tickOrder.js:230). **Žádná změna pořadí.** §3.4. |

---

## 1. SPLIT M7b — ROZHODNUTÍ: NE

**Doporučení: jedna iterace (bez splitu).** Trade-off explicitně:

**Proč NE split** (i přes T1=L):
1. **G2 je strukturálně zadarmo.** Největší riziko M7b — „dvě implementace bitvy live vs. offline" — **neexistuje**: `battle.tick` je periodic `every:'step'`, takže catch-up dávka (`runCatchupBatch`) volá identický `step()` jako `advance()`. Auto-resolve = stejný `battleStep` s prázdnými commands. To eliminuje hlavní L-rizikový rozměr T1.
2. **T2/T3 jsou čisté přírůstky nad T1, ne paralelní L.** T2 = vzorce do `formulas.js` (vzor `aiBattleResolve` už existuje, ř.380) + tabulkové testy. T3 = data politiky + větev v `battleStep`. Žádný z nich není samostatný L.
3. **T4 = wiring stubu**, ne nový systém. `startBattle` stub (world.js:1189), `aiBattleResolve` (formulas.js, AI-AI hotovo M7a-2), `world.takeOver` (world.js:1178), schedule, offline summary — vše hotové z M7a-2. T4 jen propojí.
4. **T5 = UI selektory + commands** (vzor existuje, M7a-2 T6). UI nemá logiku (C3).
5. **Precedens**: M5-2 (1×L+více M v jedné iteraci, DR-013-01), M7a-2 (1×L+2×M, DR-017-01 split=NE). M7b je stejná třída.

**Alternativa (zvážena, zamítnuta)**: M7b-1 (automat T1+T2+T3) / M7b-2 (invaze T4 + UI T5).
- *Proč by dávala smysl*: T1 je formálně L; izolace battle automatu od wiringu by umožnila samostatné kontraktní testy automatu před napojením invazí.
- *Proč zamítnuto*: M7b-1 by **nebyl samostatně hratelný** (battle automat bez spouštěče = mrtvý kód; jediný způsob, jak ho otestovat ručně, je invaze z T4). Naopak M7a-2 split byl mrtvý zrovna proto, že T2→T3 byly hratelné samostatně. Tady T1 bez T4 nedává demo. Navíc by se zdvojil review gate. **Pokud** Sonnet při implementaci T1 narazí na nečekanou složitost (sub-step akumulátor + serializace + 5 attacků), orchestrátor smí split M7b-1(T1+T2+T3)/M7b-2(T4+T5) **bez dopadu na architekturu** — kontrakt §8.1 je stejný.

→ **Decision record podmínka**: split-trigger zůstává otevřený jako fallback, default = jedna iterace.

---

## 2. KOMPONENTNÍ DIAGRAM

```
                      ┌──────────────────── runTick (tickOrder) ────────────────────┐
                      │  Phase2: schedule due → startBattle / banditRaid handlers    │
                      │  Phase3: periodics → battle.tick (every:'step', order 30)    │
                      └──────────────────────────────┬──────────────────────────────┘
                                                      │ (state, {}, ctx)
                                                      ▼
   world.js processAI ──scheduleInsert──►   ┌──── battleTick(state) ─────────────┐
     state 6, vs player (ř.1083)            │  if !state.battle: return (no-op)   │
        'startBattle' handler               │  rng = makeRng(state,'battle')      │
              │                              │  acc += STEP_MS (50)                │
              ▼                              │  while acc >= 30:                   │
   startBattle(state,params) ───────────►   │     cmds = drain state.battle.queue │
     create battleState (orig.create)       │     state.battle =                  │
     → state.battle = {…}                    │        battleStep(state.battle,     │
                                             │                   cmds, rng)        │  ◄── PURE, §8.1
   UI command intent                         │     acc -= 30                       │
     battleCommand({side,action}) ──────►    │  if state.battle.state==='done':    │
        enqueue → state.battle.queue         │     resolveBattleOutcome(state)     │── orig end()
                                             └────────────────────────────────────┘
   formulas.js (PURE, tabulkové testy):                 │
     battleDamage / battleDefense / revival             ▼
                                            offline summary (state.battle outcomes)
                                            UI: selectors(state.battle) → progress/log
```

Klíč: **`battleStep` je jediná bitevní logika. `battleTick` je jen adaptér akumulátoru** (drainuje commands, volá `battleStep`, na konci řeší outcome). Live i catch-up volají identický `battleTick` přes identický `step()`.

---

## 3. T1 — BATTLE AUTOMAT (§8.1)

### 3.1 Sub-step akumulátor (jádro „30 ms z hlavního akumulátoru")

**Problém**: herní step = 50 ms (STEP_MS, clock.js:18), battle tick = 30 ms (originál tick=30). Není to 1:1. Řešení **bez** druhého časovače:

`battleTick(state, _params, _ctx)` (battle.js, systemFn `battle.tick`, signatura `(state, params, ctx)` per tickOrder runTick:Phase3) na každém herním step edge:

```
function battleTick(state):
    if (!state.battle || state.battle.state === 'done') return   // no-op (jako M2a)
    const rng = makeRng(state, 'battle')                          // izolovaný stream (rng.js:10)
    state.battle.subAccMs += STEP_MS                              // +50 ms herního času
    while (state.battle.subAccMs >= BATTLE_TICK_MS) {             // BATTLE_TICK_MS = 30
        const commands = state.battle.queue                       // hráčské commandy fronta
        state.battle.queue = []                                   // drain (spotřebovány tento sub-step)
        state.battle = battleStep(state.battle, commands, rng)    // PURE, advance jeden battle-tick
        state.battle.subAccMs -= BATTLE_TICK_MS
        if (state.battle.state === 'done') { resolveBattleOutcome(state, rng); break }
    }
```

- Při speed=2 herní step zůstává 50 ms (akumulátor v `advance()` násobí factor PŘED stepem, clock.js:70 → více herních stepů, ne delší step). Battle takto škáluje 1:1 s herní rychlostí. **Žádné přepočty cooldownů** (R-D mitigace, §12 architektury).
- **Catch-up**: `runCatchupBatch` volá `step()` v cyklu (catchup.js:50) → battleTick běží stejně, jen bez UI. Hráčská fronta `queue` je při offline prázdná → obranná AI politika hraje za hráče (§7). **Levné**: jeden battle-tick je pár aritmetických operací; bitva ~stovky battle-tiků = zanedbatelné v dávce 25 000 stepů/chunk.

**Konstanty** (do `military.json` `_battle` bloku nebo BALANCE; doporučeno BALANCE.battle pro konzistenci s ostatními systémy):
- `BATTLE_TICK_MS = 30` (originál tick).
- `endCheckPeriod` = orig `curStep % 80 == 30` → kontrola konce každých 80 battle-tiků s fází 30.
- `reactionDefault = 60`.

### 3.2 BattleState — naplnění kontraktu §8.1

Kontrakt (battle.js:11, NEMĚNIT klíče `zoneId/sides/state/tick/log/summary`):

```
state.battle = {
  zoneId: string,                       // cB.zone.id
  sides: {
    player:   Side,                     // sides.player
    opponent: Side,                     // sides.opponent
  },
  state: 'setup' | 'running' | 'done',  // orig numeric 0/1/2 → string (kontrakt)
  tick: number,                         // battle-tick counter (orig cB.curStep)
  log: [string, string|null][],         // [msg, nameClass] (orig battleLog, unshift)
  summary: BattleSummary | null,        // orig endSummary (kills/casualties per side/type)

  // — naplnění kontraktu (pole pod 'sides' a meta, NErozšiřuje top-level klíče §8.1):
  subAccMs: number,                     // sub-step akumulátor (§3.1)
  queue: BattleCommand[],               // pending hráčské commandy (drainuje battleTick)
  startedAtStep: number,                // orig started = engine.curStep (info)
  reaction: number,                     // opponent.reaction (default 60)
  attackerSide: 'player' | 'opponent',  // kdo ATTACKING (zóna liege rozhodne)
  banditLoot: object | null,            // pro bandity (§9.2)
  meta: { attackerId, targetZoneId, isBandit },  // pro outcome wiring
}

Side = {
  liege: string,                        // 'player' | factionId | 'bandits'  ← STRING (F-1, NE objekt)
  action: 'Attacking' | 'Defending',
  warriors: Unit,
  archers:  Unit,
  number: number,                       // warriors.number + archers.number (derived cache)
}

Unit = {
  number: number, startingNumber: number,
  strength: number, defense: number, critChance: number,
  cd: number, lastMaxCD: number,        // cooldown counters (battle-ticks)
  casualties: number,
  lastAttackId: string | null,          // pro shieldWall double-defense check (orig ř.501) ← STRING id (F-1, NE objekt attack)
  type: 'warriors' | 'archers',
  // ZÁKAZ (F-1): NE `army` self-ref (orig ř.249/251 cyklus units↔side), NE funkce/closury.
}
```

**Inicializace při create (m-4, POVINNÉ — orig 1:1)**: `createBattleState` MUSÍ nastavit `state.battle.tick = 0` (orig `cB.curStep` start 0, ř.95), `reaction = 60` (orig default; volitelně z `BALANCE.battle.reactionDefault`), `subAccMs = 0`, `queue = []`. Důvod: end-check fáze `tick % 80 === 30` (první kontrola na ticku 30) a reaction-gating `tick === reaction` (=60), `tick === reaction+20` (=80) sedí 1:1 **jen** při startu `tick:0`. Jednotky init `cd = 0`, `lastAttackId = null`, `casualties = 0`, `startingNumber = number`.

**Pozn. k §8.1 kontraktu**: top-level klíče zůstávají `{zoneId, sides, state, tick, log, summary}`. Doplňková pole (`subAccMs, queue, …`) jsou potřebná runtime data automatu — to NENÍ změna kontraktu signatury `battleStep`, jen naplnění obsahu `BattleState` (kontrakt to explicitně ponechával na M7: „BattleState contract is established here for M7 to implement", battle.js:7). Pokud reviewer trvá na čistotě, `subAccMs/queue/meta` lze vnořit pod `summary`/dedikovaný `runtime` sub-objekt — architektonicky nezáleží, vše je v save.

**F-1 SERIALIZOVATELNOST (POVINNÉ, ostraha — passthrough nesanitizuje)**: viz §8.1a. Persist (persistSchema.js:300) i load (load.js:247) dělají **plný passthrough** `state.battle` BEZ sanitizace → coder NESMÍ do `state.battle` vložit nic neserializovatelného. Detaily a kontrolní seznam v §8.1a.

### 3.3 battleStep — pure advance jednoho battle-ticku (orig startBattle interval ř.224-294)

Pořadí uvnitř `battleStep(bs, commands, rng)` (1:1 originál fight-loop):

1. **End check** (orig ř.231): `if (bs.tick % 80 === 30 && (player.number===0 || opponent.number===0))` → `bs.state='done'`, return.
2. **Tick down cooldowny** player (orig ř.239-247): `warriors.cd--`, `archers.cd--` (clamp ≥0), přepočet `cdPct` pro UI.
3. **Aplikuj hráčské commands** (orig: hráč klikal akce; tady fronta): pro každý `cmd` ve `commands` → `attackWith(playerSide[cmd.side], attackById(cmd.action), opponentSide)` pokud `cd===0` (jinak ignor/log „on cooldown"). §4.
4. **Obranná AI za hráče** pokud `commands` prázdné A side má cd===0 (auto-resolve / offline) — politika §7.
5. **Opponent AI** (orig ř.265-291): reaction-gated první útok + cooldown opakování; warriors útočí charge[0], archers volley[0] (orig používá `attacks.warriors[0]`/`attacks.archers[0]`). **POVINNĚ vč. double cd-decrement (M-2) — přesná 1:1 sekvence v §7.3** (`cd--` po `attackWith`, každý tick, warriors→archers).
6. `bs.tick++` (orig `cB.curStep++`).
7. Update `side.number = warriors.number + archers.number` (derived).
8. return nový `bs` (pure: vrací nový objekt). **POVINNÉ (n-2, závazné — ne „doporučeno")**: na začátku `battleStep` proveď **hluboký klon** `sides.player`/`sides.opponent` + jejich 2 `Unit` objekty (NE shallow `{...bs}` ze stubu ř.33). Shallow nestačí — kroky 1-5 mutují `sides`/`Unit` (cd, number, casualties, lastAttackId), a bez hlubokého klonu by se zmutovala vstupní `bs` reference sdílená s předchozím save snapshotem → rozbil by kill-resume test §10.3 (drží starý snapshot) i determinismus test §10.2. Levné: 2 side + 4 Unit objekty. `subAccMs/queue/meta` lze přenést mělce (battleTick je drainuje/přepisuje vně).

**Determinismus**: jediný zdroj náhody = `rng` (stream 'battle'). Každé volání `rng.next()` posune serializovaný stav streamu (rng.js:34 zapisuje `state.rng.streams.battle`). Crit roll v `battleDamage` bere `rng.next()` (NE Math.random jako originál ř.443). **Pořadí spotřeby rng MUSÍ být deterministické** — proto pevné pořadí kroků 1-6 a pevné pořadí útoků (player→opponent, warriors→archers). §11.

### 3.4 tickOrder — žádná změna

`battle.tick` = `{every:'step', order:30, systemFn:'battle.tick'}` (tickOrder.js:230) **už registrováno** (M2a stub). `battleTick` import (tickOrder.js:25), `register(registry,'battle.tick',battleTick)` (tickOrder.js:162) hotovo. M7b jen **naplní tělo** `battleTick`. Step edge je poslední periodic (po day/month/season) — battle běží po ekonomice téhož stepu, korektní (invaze nasazená schedule handlerem v Phase2 → battle.tick v Phase3 téhož stepu už vidí `state.battle`).

---

## 4. attackWith — damage aplikace (orig ř.465-584)

Čistá funkce nebo metoda uvnitř `battleStep` (NE v formulas.js — formulas drží jen číselné vzorce; `attackWith` je orchestrace mutace bitvy). Signatura: `attackWith(units, attack, targetSide, bs, rng)`.

1. `units.lastAttackId = attack.id` (pro shieldWall check).
2. Guard: `units.number > 0` && `units.cd === 0` → jinak log + return.
3. Set `units.cd = attack.cd`, `units.lastMaxCD = attack.cd`. (thumbRing tech 0.9× pro archery — orig ř.478; v MVP technstrom: pokud `state.player.unlocked.thumbRing`, jinak vynech — viz §6.5 provenance.)
4. **Pokud `attack.focus.length===0`** (shieldWall/rally/retreat): jen nastaví cd + log; shieldWall efekt se aplikuje pasivně v obraně (ř.501). rally recover (orig ř.571 `~~(casualties*0.25)`) — **přidat do MVP nebo skip?** → **Skip rally/retreat v MVP** (orig je má jako TODO prázdné větve ř.565-572, nikdy nedokončené). Pouze charge/flank/volley/fireArrows + shieldWall (pasivní obrana). Provenance: `R-D` poznámka pro M9.
5. **Útok s focus** (charge/flank/volley/fireArrows): **crit roll PŘESNĚ ZDE** (viz M-3 níže) — `critRoll = rng.next() < units.critChance`, pak `damage = battleDamage(units.number, units.strength, attack.multiplier, critRoll)`. Pak loop přes `attack.focus` cíle (orig ř.491-555):
   - `defense = battleDefense(focus.number, units.number, focus.defense)` (§6.2).
   - shieldWall: pokud `focus.type==='warriors' && focus.lastAttackId==='shieldWall' && focus.cd>0` → `defense *= 2` (orig ř.501).
   - `dmg = floor(damage / defense)` (units killed); `d0 = focus.number * defense`; `damage -= d0`.
   - clamp `dmg = min(dmg, focus.number)`; aplikuj na `focus.number`, `focus.casualties`, `targetSide.number`.
   - akumuluj do `bs.summary` kills/casualties per side/type (orig ř.522-548).
   - log řádek (orig ř.550).
   - pokračuj na další focus cíl pokud `damage > 0`. **Crit roll se NEopakuje per cíl** — `critRoll` spočtený 1× nahoře platí pro celý loop.

**M-3 (crit rng pevný počet, major — POVINNÉ). Přesné KDY se crit losuje (ověřeno PROTI ORIGINÁLU ř.443):**
Originál losoval crit `Math.random() < critChance` **uvnitř** `getDamage` (ř.443), volaného z `attackWith` až **po** guardu `units.number > 0` (orig ř.472). Design přesouvá crit ven jako bool (architektonicky OK, drží `battleDamage` tabulkově testovatelný — §15 alternativa zamítnuta korektně), ALE **počet `rng.next()` MUSÍ zůstat PEVNÝ**, jinak se posune pozice streamu `rng('battle')` → nedeterminismus (live ≠ catch-up, fresh ≠ load).

ZÁVAZNÁ pravidla (MUST):
- **Crit roll = přesně 1× `rng.next()` per SKUTEČNĚ PROVEDENÝ útok s focus**, a to **AŽ v bodu 5** (kód výše), tj.:
  - **PO guardu** (bod 2: `number > 0 && cd === 0`) — když guard útok zahodí (na cooldownu / 0 jednotek), `rng.next()` se **NElosuje** (orig: `getDamage` se vůbec nezavolá). NE před guardem.
  - **PO** kontrole `attack.focus.length === 0` (bod 4: shieldWall/rally/retreat) — útoky bez focus **NEhází crit** (orig `getDamage` voláno jen pro damage útoky). Pouze charge/flank/volley/fireArrows hází.
  - **1× per útok, NE per focus cíl** — jeden roll pro celý focus loop.
  - **NE 2×** — žádný druhý roll v loopu ani v shieldWall větvi.
- **Pevné pořadí spotřeby** v `battleStep` (§3.3 / §11): player commands → player AI → opponent (warriors→archers). Každý útok, který projde guardem a má focus, spotřebuje 1× `rng.next()` v tomto pořadí. Guard MUSÍ být deterministicky stejný live i offline (stejný `bs` → stejná větev → stejný počet rolů).
- **`reviveAI` (§6.3)** je jediný další `rng.next()` v bitvě (2× v outcome: archers→warriors, pevné pořadí). `revivePlayer` rng NEbere.

**RNG pořadí v attackWith**: přesně 1× `rng.next()` na crit roll na útok s focus PO guardu (NE per focus cíl, NE před guardem, NE pro útoky bez focus, NE 2×). Pevné.

**Test (povinný gate, §10.7)**: replay/kill-resume MUSÍ ověřit shodnou pozici streamu `state.rng.streams.battle` po bitvě (fresh==load, advance==catchup). Negativní test: počet spotřeb `rng('battle')` = (počet útoků s focus po guardu) + (2× reviveAI v outcome).

---

## 5. Cooldowny + attacks katalog (1:1 originál ř.586-629)

Do `military.json` přidat `_battle.attacks` (NEBO BALANCE.battle.attacks; doporučeno `military.json` u jednotek, ať data sedí u katalogu vojska). Hodnoty **1:1 z originálu** (battle-ticky):

```json
"warriors": [
  { "id":"charge",     "name":"Charge",      "multiplier":1,   "cd":80,  "focus":["warriors","archers"] },
  { "id":"shieldWall", "name":"Shield Wall", "multiplier":0,   "cd":150, "focus":[] },
  { "id":"flank",      "name":"Flank",       "multiplier":1.8, "cd":180, "focus":["archers","warriors"] }
],
"archers": [
  { "id":"volley",     "name":"Volley",      "multiplier":0.7, "cd":120, "focus":["archers","warriors"] },
  { "id":"fireArrows", "name":"Fire Arrows", "multiplier":1.5, "cd":220, "focus":["archers","warriors"] }
]
```

`reactionDefault = 60`, `endCheckPeriod = 80`/fáze 30. Cooldowny v **battle-ticích** (1:1, žádný ms↔tick přepočet — R-D, §12 architektury, K8 „tick 30ms 1:1").

---

## 6. T2 — DAMAGE / DEFENSE / REVIVAL VZORCE → formulas.js

Všechny PURE, `rng` jako parametr (vzor `aiBattleResolve` formulas.js:380). Tabulkové testy proti originálu (referenční čísla spočtená ručně z orig vzorců).

### 6.1 battleDamage (orig ř.442)
```
battleDamage(number, strength, multiplier, isCrit) =
    ceil( max(sqrt(number), number/10) * strength * multiplier * (isCrit ? 1.5 : 1) )
```
- **crit** se rozhoduje VENKU (`rng.next() < critChance`) a předává jako bool — drží formulas pure bez rng tam, kde stačí bool. (Alternativa: `battleDamage(..., rng, critChance)` s rng uvnitř — zamítnuto, ať je tabulkový test bez rng deterministický pro oba větve crit/nocrit.)
- Tabulkové testy: např. `(100,5,1,false)`=`ceil(max(10,10)*5)`=50; `(100,5,1,true)`=`ceil(10*5*1.5)`=75; `(50,3,0.7,false)`=`ceil(max(7.07,5)*3*0.7)`=`ceil(14.85)`=15; `(9,5,1.8,false)`=`ceil(max(3,0.9)*5*1.8)`=`ceil(27)`=27.

### 6.1a baseRevival — ZÁVAZNÝ DETERMINISTICKÝ ZDROJ (M-1, major — POVINNÉ)

**Problém (ověřeno PROTI KÓDU)**: originál čte `$rootScope.player.baseRevival` (battle.js ř.311-312). V repu **`state.player.baseRevival` NEEXISTUJE** — `grep -rn baseRevival src/` = **0 výskytů** (ověřeno; `createPlayerState` createHomeState.js:68-75 pole nemá). Bez fallbacku by `revivePlayer(cas, undefined + bonuses)` → `NaN` → rozbije outcome (number += NaN) i `hashState`. Toto je **gap**, ne volba — coder MUSÍ mít deterministický fallback.

**ZÁVAZNÉ řešení (MUST, ne „pokud chybí")**:

1. **Nová konstanta v `BALANCE.battle`** (jediné konfigurační místo, viz §3.1/§5):
   ```
   BALANCE.battle.baseRevivalDefault = 0.25   // approx z originálu, provenance:'approximated', kalibrace M9 (R-F)
   ```
   `BALANCE.battle` blok v repu **NEEXISTUJE** (ověřeno `grep battle balance.js` = 0) → coder ho zakládá; sem patří i `BATTLE_TICK_MS`, `reactionDefault`, `endCheckPeriod`, `critChanceDefault` (m-1), `banditPeriod`. Všechny approx hodnoty nesou `provenance:'approximated'` flag (G-MILITARY-STATS, §6.5).

2. **`revivePlayer` bere `baseRevival` PARAMETREM** (pure, bez čtení globálního stavu — drží determinismus a tabulkovou testovatelnost):
   ```
   revivePlayer(casualties, baseRevival, bonuses) = floor(casualties * (baseRevival + bonuses))
   ```

3. **Vstup `baseRevival` se čte VÝHRADNĚ v `resolveBattleOutcome` (§8.3), s pevným fallbackem**:
   ```
   const baseRevival = state.player.baseRevival ?? BALANCE.battle.baseRevivalDefault   // nikdy undefined → nikdy NaN
   ```
   `??` (ne `||`) aby legitimní `0` ve state (kdyby pole přibylo v budoucnu) neaktivovalo fallback.

4. **Vstup `bonuses` (orig ř.311 fieldHospital 0.15 + blessingOfHoney 0.1)** se odvodí z `state.player.unlockedTechs` (**toto pole EXISTUJE** — createPlayerState.js:73 `unlockedTechs:{}`):
   ```
   const bonuses = (unlockedTechs.fieldHospital ? 0.15 : 0) + (unlockedTechs.blessingOfHoney ? 0.1 : 0)
   ```
   Chybějící klíč v `unlockedTechs` → `undefined` → falsy → příspěvek `0`. **Žádný člen vzorce nesmí být `undefined`/`NaN`** — `casualties` je z `bs.summary` (vždy number init 0, §3.2), `baseRevival` z `??` fallbacku, `bonuses` ze tří terms s `?0.x:0`.

5. **Vstup `casualties` per typ** bere `resolveBattleOutcome` z `bs.summary` (orig `endSummary.p_warriors.casualties` / `p_archers.casualties`, ř.311-312) — pevné pořadí warriors→archers.

**Determinismus**: `revivePlayer` je čistě deterministická (žádné rng). `reviveAI` (§6.3) bere `rng.next()` — to je jediný náhodný vstup revival fáze. → fresh-vs-load i live-vs-catchup identické.

### 6.2 battleDefense (orig ř.494-499)
```
battleDefense(focusNumber, attackerNumber, baseDefense):
    defenseCount = sqrt(min(focusNumber, attackerNumber)) / 2
    if defenseCount > 5: return ceil(baseDefense)
    else:                return ceil(baseDefense * defenseCount)
```
- Tabulkové testy: malé armády (defenseCount<5) škálují defense dolů; velké (>5) plný `ceil(defense)`.

### 6.3 battleRevival (orig ř.311-318)
Dvě varianty (player deterministický, AI random):
```
revivePlayer(casualties, baseRevival, bonuses) = floor(casualties * (baseRevival + bonuses))
   // bonuses: fieldHospital 0.15 + blessingOfHoney 0.1 (pokud unlocked); jinak 0
reviveAI(casualties, rng) = floor(casualties * rng.next() / 4)   // orig ř.317 Math.random→rng
```
- `revivePlayer` PURE bez rng (deterministický). `reviveAI` bere `rng.next()` (1× per unit type, pevné pořadí archers→warriors per orig ř.317-318).

### 6.4 Volání outcome (resolveBattleOutcome, §8.3) používá tyto vzorce.

### 6.5 G-MILITARY-STATS — combat staty do military.json

`military.json` (warrior/archer) NEMÁ strength/defense/critChance. **Originál tyto staty bral z `liege.warriors.strength` atd.** (ř.103-138) — tedy z per-liege definice, ne z globálního katalogu jednotek. V repu jsou `unitStats` per faction (world.js:678 `{warriors:{strength,defense},archers:{strength,defense}}`, default `{strength:1,defense:1}`).

**Rozhodnutí G-MILITARY-STATS**:
1. **Player combat staty** → přidat do `military.json` per jednotka: `combat: {strength, defense, critChance, baseCd}` s `provenance:'approximated'` flagem v `_meta`. Originál nemá player staty v dumpu (byly v `itemList.player.warriors`, mimo config-extract) → **approximovat**: `warrior {strength: ?, defense: ?}`, `archer {strength: ?, defense: ?}`, `critChance: 0.1` (orig ř.109/129 baseline 0.1; blessingOfWind +0.1 pokud unlocked).
   - **Hodnoty strength/defense**: nejsou v repu doložitelné (gap). Návrh approx: warrior `strength:2, defense:2`, archer `strength:3, defense:1` (archery vyšší útok/nižší obrana — kvalitativně dle attack multiplierů). **Označit `provenance:'approximated'`, kalibrace M9** (R-F, §12 architektury; master plán §A4 R-F→iter-018 T2). Eskalace na tom-proxy NENÍ blokující — jsou to balanční čísla, ladí M9.
2. **AI combat staty** už existují (`faction.unitStats`, M7a-2). Player přidá obdobné `state.player.unitStats` derivované z `military.json combat` při create (nebo přímo čteno z katalogu).
3. **critChance**: `0.1 + (blessingOfWind unlocked ? 0.1 : 0)` player; AI `0.1` (orig ř.129/138).
4. `baseRevival`: **POVINNĚ dle §6.1a** (M-1). Pole `state.player.baseRevival` v repu **NEEXISTUJE** (grep=0, ověřeno) → coder NESMÍ na něj spoléhat. Závazný deterministický zdroj: `state.player.baseRevival ?? BALANCE.battle.baseRevivalDefault` (=`0.25`, provenance:'approximated'). Bonusy z `state.player.unlockedTechs` (EXISTUJE), chybějící klíč → `0`. Žádný člen → `undefined`/`NaN`. Detaily a přesný vzorec v §6.1a (vzor DR-017-01 m-4 fallback).

**Provenance flag**: `military.json._meta.battleStatsProvenance: 'approximated'` + per-item `combat._provenance: 'approximated'`. M9 kalibruje (R-F).

---

## 7. T3 — battleCommand + OBRANNÁ AI (G2 KRITICKÉ)

### 7.1 battleCommand (hráčské intenty, C3)
UI posílá intent `battleCommand({side:'warriors'|'archers', action:'charge'|'flank'|'shieldWall'|'volley'|'fireArrows'})`. Handler v core (vzor §3 architektury, command `{type,params}` serializovatelný):
```
handleBattleCommand(state, {side, action}):
    if (!state.battle || state.battle.state !== 'running') return  // validace
    // validace: action patří k side; side má jednotky; (cd se kontroluje až v battleStep)
    state.battle.queue.push({ side, action })
```
- **Žádná mutace bitvy v handleru** — jen enqueue. Bitvu mění výhradně `battleStep` v dalším sub-stepu (determinismus, C3 „žádné click-mutace"). Fronta je v `state.battle.queue` → serializovatelná (přežije save uprostřed čekání na sub-step).

### 7.2 Obranná AI politika = skriptované akce dle cooldownů (G2)

**Toto je G2**: když `commands` prázdné (offline catch-up NEBO hráč needá příkaz), automat hraje za hráče **stejnou** `battleStep` cestou — žádná druhá implementace. Politika (skript, deterministický, BEZ rng kromě crit v damage):

Pro **player side** v `battleStep` pokud `commands` prázdné:
```
for unitType in [warriors, archers]:   // pevné pořadí
    u = playerSide[unitType]
    if u.number > 0 and u.cd === 0:
        attack = (unitType==='warriors' ? charge[0] : volley[0])   // default útok, orig opponent vzor ř.269/282
        attackWith(u, attack, opponentSide, bs, rng)
```
- **Reaction gating** pro player NENÍ (player by reagoval okamžitě; offline = max efektivita základním útokem). Pokud hráč ZADAL command (live), použije se jeho akce místo defaultu (override pro daný sub-step; pokud command nesedí na cd, fallback na default nebo skip — doporučeno **skip** ten unit type ten sub-step, ať hráčův command nepřebíjí svým cd default).
- **Determinismus**: politika je čistě funkce stavu (cd, number) → stejný vstup = stejná akce. RNG jen v `battleDamage` crit roll (pevné pořadí). → **auto-resolve catch-up == live bez commandů, bit-identicky**.

### 7.3 Opponent AI (orig ř.265-291) — 1:1 PORT VČ. DOUBLE CD-DECREMENT (M-2, major — POVINNÉ)

**KRITICKÉ (M-2, ověřeno PROTI ORIGINÁLU ř.265-291)**: opponent cooldown se za jeden battle-tick dekrementuje **DVAKRÁT** — jednou nastaví `attackWith` (`units.cd = attack.cd`, orig ř.476), a **NAVÍC samostatný `cd--`** běží **KAŽDÝ tick** (orig ř.274-277 warriors, ř.287-290 archers), **i v ticku, kdy útok proběhl**, **PO** `attackWith`. Tím se efektivní cooldown opponenta zkrátí o 1 tick oproti naivní implementaci. Pokud coder dekrementuje opponent cd jen na začátku (jako player, §3.3 krok 2) nebo vynechá `cd--` v ticku útoku, **posune se reaction timing** (následné `cd==0` opakování přijde o tick dřív/později) → odchylka od originálu i od referenčních tabulkových testů. **Coder MUSÍ portovat 1:1 — zachovat dvojí dekrement.**

**PŘESNÁ 1:1 SEKVENCE (warriors→archers, pevné pořadí; orig ř.265-291)**:
```
target = playerSide
// --- warriors ---
if opponent.warriors.number > 0:
    if   bs.tick === bs.reaction:               attackWith(opponent.warriors, charge[0], target, bs, rng)   // první útok (ř.268-269)
    elif bs.tick >  bs.reaction && opponent.warriors.cd === 0:
                                                attackWith(opponent.warriors, charge[0], target, bs, rng)   // opakování (ř.270-272)
    // ↓ SAMOSTATNÝ cd-- — běží VŽDY (i v ticku útoku), PO attackWith (orig ř.274-277):
    opponent.warriors.cd--
    if opponent.warriors.cd < 0: opponent.warriors.cd = 0          // clamp ≥0
// --- archers ---
if opponent.archers.number > 0:
    if   bs.tick === bs.reaction + 20:          attackWith(opponent.archers, volley[0], target, bs, rng)   // (ř.281-282)
    elif bs.tick >  bs.reaction + 20 && opponent.archers.cd === 0:
                                                attackWith(opponent.archers, volley[0], target, bs, rng)   // (ř.283-285)
    // ↓ SAMOSTATNÝ cd-- — VŽDY, PO attackWith (orig ř.287-290):
    opponent.archers.cd--
    if opponent.archers.cd < 0: opponent.archers.cd = 0            // clamp ≥0
```

**Důsledky pořadí (MUST)**:
- `attackWith` nastaví `cd = attack.cd` (např. charge=80); pak **tentýž tick** `cd--` → opponent vychází z útoku s `cd = 79`, ne 80. Tohle je originálové chování — NEoptimalizovat.
- `cd--` běží i když útok NEproběhl (number>0 ale tick mezi útoky) — odpočet pokračuje každý tick.
- Guard `if number > 0` obaluje CELÝ blok (útok i `cd--`) — když je `number === 0`, `cd--` se NEprovede (1:1 orig ř.267/280).
- **Player cd-down zůstává odděleně** na začátku `battleStep` (orig ř.239-247, §3.3 krok 2) — player se dekrementuje **JEDNOU za tick** (na začátku), opponent **DVAKRÁT** (set v attackWith + tento `cd--`). Tato asymetrie je ZÁMĚRNÁ a originálová.

Orig `attacks.warriors[0]`=charge, `attacks.archers[0]`=volley. `reactionDefault = 60` (BALANCE.battle), archers reaction+20 (=80). Init `bs.tick = 0` (§3.2) → první warriors útok přesně na tick 60, archers na tick 80.

**Referenční test (povinný gate, §10)**: reaction timing — první opponent warriors útok PŘESNĚ na `bs.tick === 60`, archers na `bs.tick === 80`; následné opakování v intervalu `attack.cd - 1` ticků (kvůli double-decrement). Bez tohoto testu M-2 neplatí empiricky.

**G2 shrnutí**: live = hráčské commands ∪ obranná AI pro neobsazené unit types; offline = jen obranná AI (queue prázdná). Opponent AI identický oběma. **Jeden `battleStep`, jedna cesta** (catch-up == live G2; §9.2/D10 architektury, master plán DoD M7 „bitvy live i offline auto-resolve").

---

## 8. PERSIST `state.battle` — kill-resume (A4)

### 8.1 Co se ukládá
**Celý `state.battle`** je v save. persistSchema.js:300 už má `payload.battle = s.battle ?? null` (allowlist hotový z M2a). Zahrnuje: `zoneId, sides (s plnými Unit: number/cd/casualties/lastMaxCD/lastAttackId/…), state, tick, log, summary, subAccMs, queue, reaction, attackerSide, meta, banditLoot`.

### 8.1a SERIALIZOVATELNOST `state.battle` — ZÁKAZ NESERIALIZOVATELNÝCH HODNOT (F-1, major — POVINNÉ)

**Ostraha (ověřeno PROTI KÓDU)**: persist (`persistSchema.js:300` — `payload.battle = s.battle ?? null`) i load (`load.js:247` — `state.battle = payload.battle ?? null`) dělají **plný passthrough celého `state.battle` BEZ jakékoli sanitizace** uvnitř objektu. ⇒ Cokoli, co coder vloží do `state.battle`, **přežije do savu as-is** — včetně případné neserializovatelné hodnoty. To je dvojsečné: serializovatelnost není vynucena vrstvou persist, **musí ji zaručit coder**. Pokud do `state.battle` pronikne cyklická reference nebo funkce, `JSON.stringify` v save **selže nebo ztichne na cyklu** → rozbitý save / kill-resume.

**ZÁVAZNÝ ZÁKAZ (MUST) — v `state.battle` (vč. `sides`/`Unit`/`summary`/`log`/`meta`/`queue`) NESMÍ být:**

| # | Zakázáno | Originál (zdroj rizika) | POVINNÁ náhrada v repu |
|---|---|---|---|
| (a) | **Cyklická reference** `units.army = side` (units↔side cyklus) | battle.js **ř.249/251** `player.warriors.army = player.archers.army = player` | **VYNECHAT úplně.** `attackWith` dostává `targetSide` parametrem (§4 signatura `attackWith(units, attack, targetSide, bs, rng)`) → žádné `army` self-ref pole na `Unit`. `Unit` v §3.2 `army` NEMÁ. |
| (b) | **Objektové `liege`** (reference na side/faction objekt) | orig `cB.player.liege` jako objekt | **`liege: string`** — `'player' | factionId | 'bandits'` (§3.2). |
| (c) | **Objektové `lastAttack`** (reference na attack objekt) | battle.js **ř.469** `units.lastAttack = attack` | **`lastAttackId: string | null`** — jen `attack.id` (§3.2, §4 bod 1). shieldWall check porovnává `focus.lastAttackId === 'shieldWall'` (string, §4). |
| (d) | **Funkce / closury / metody** | — | Logika je v `battleStep`/`attackWith` (moduly), NE na datech. `rng` se NEukládá — `makeRng` lokálně v `battleTick` (§3.1), předáno parametrem. |
| (e) | **`undefined` hodnoty** | — | Init všech polí v `createBattleState` (§3.2: `tick:0`, `reaction:60`, `subAccMs:0`, `queue:[]`, `cd:0`, `lastAttackId:null`, `casualties:0`, `summary` s number-init 0). `undefined` ≠ `JSON` round-trip identita → rozbil by hashState. |
| (f) | **Třídní instance / non-plain objekty** (Date, Map, Set) | — | Pouze plain objekty/pole/primitiva. `log` = `[string, string|null][]`, `queue` = pole plain `{side, action}`. |

**Pozitivní kontrakt (co JE povoleno)**: plain objekty, pole, `string`/`number`/`boolean`/`null`. `side.number` derived cache (number). `bs.summary` plain `{p_warriors:{casualties,kills}, ...}`.

**Test (povinný gate, §10.3)**: kill-resume snapshot MUSÍ projít `JSON.parse(JSON.stringify(state.battle))` round-trip **bez ztráty a bez výjimky na cyklu** (nebo ekvivalentně přes existující `hashState` — fresh==load). Negativní kontrola: žádné pole `army` na žádném `Unit`; `typeof liege === 'string'`; `typeof lastAttackId === 'string' || lastAttackId === null`. Bez tohoto testu F-1 neplatí empiricky.

### 8.2 Co se NEukládá / derivuje
- **Nic kritického se nederivuje** — battle je plně serializovaný (cd counters, subAccMs, tick = vše ve state). `side.number` je derived cache, ale ukládá se taky (levné, konzistence). RNG stream 'battle' je v `state.rng.streams.battle` (rng.js, už v save) → posuv streamu přežije.
- **Kill-resume bit-identický**: save uprostřed bitvy (libovolný sub-step, libovolný `subAccMs`) → load → `battleTick` pokračuje z `subAccMs` + spotřebovává herní stepy stejně → další `battleStep` čte stejný stav + stejný rng stream pozici → **fresh-vs-load identický `hashState`** (test §10). Žádný „nedefinovaný stav" (A4, §8.1).
- **Schedule eventy bitvy** (`startBattle`, bandit raid, outcome follow-upy jako `raidedByAI` orig ř.425) jsou v `state.schedule` → přežijí save (M7a-2 vzor).

### 8.3 resolveBattleOutcome (orig end() ř.298-437) — volá se 1× když `state.battle.state==='done'`
Mutuje **trvalý state** (zóny, player inventář, faction kapitály) podle vítěze + aplikuje revival (§6.3). Klíčové větve (1:1 orig):
1. **Revival** obou stran (§6.3). **baseRevival vstup POVINNĚ dle §6.1a** (M-1): `const baseRevival = state.player.baseRevival ?? BALANCE.battle.baseRevivalDefault` (pole neexistuje → fallback `0.25`); `bonuses` z `unlockedTechs`; `casualties` z `bs.summary` per typ. `reviveAI` bere `rng.next()` (2×, archers→warriors, pevné pořadí).
2. **Vítěz = player**:
   - ATTACKING + výhra → obsadí zónu (zone.warriors/archers ← player units; liege change pokud invaze na AI zónu).
   - DEFENDING + výhra → zóna drží; **bandité dropnou loot** (orig ř.334-346: `gold = o_warriors.cas*40 + o_archers.cas*60`, sword/armour/longbow `~~(cas*0.25)`) → `Player.insertInventory` (= přičti do `state.player.inventory`). Log do offline summary (§9.3).
3. **Vítěz = opponent**:
   - player ATTACKING prohrál → ztratí jednotky, zóna zůstává opponentu (orig ř.351-359).
   - player DEFENDING prohrál homeZone → razie: bandité demand (gold/armour/sword/longbow/quiver, orig ř.370-376, `Player.pay`); AI razie (orig ř.399-426: pay demand, cull workers `~~(curWorkers/4)`, `homeZone.immunity=210`, schedule `raidedByAI` +20). Vassal zóna → `world.takeOver(opponent.liege, zone)` (world.js:1178 existuje).
4. `state.battle = null` na konci (uvolní slot; další invaze ho znovu nasadí). **Outcome zapsán do `state.battle.summary` PŘED nullováním** → zkopírovat do `state.world.battleHistory[]` nebo offline buffer (§9.3) pro summary.

**Mapování originálu na repo API** (Sonnet ověří proti kódu):
- `Player.insertInventory(loot)` → přičti do `state.player.inventory[id]`.
- `Player.pay(demand)` / `cullWorker` → existující resource vrstva (§7 architektury). Pokud helper neexistuje, deterministická přímá mutace s clampem.
- `fns.takeOver` → `world.takeOver` schedule handler nebo přímé volání (world.js:1178/1183).
- `fns.getCapital(liege)` → existující world helper (M7a-2). Ověřit.
- `homeZone.immunity=210`, schedule `raidedByAI` → handler může zůstat M8 stub pokud story; pro M7b stačí immunity + ztráty. (Pozn: `raidedByAI` je M8 stub world.js:1190+? — ne, to je warningAIAttacking. `raidedByAI` neexistuje → buď přidej minimal handler nebo skip story-flavor, jen aplikuj demand+cull. Doporučeno: aplikuj mechanické ztráty inline, story event odlož na M8.)

---

## 9. T4 — INVAZE + BANDITÉ → napojení startBattle stub (M7a-2)

### 9.1 startBattle handler (naplnit world.js:1189 startBattleStub)
Schedule entry `'startBattle'` s `{attackerId, targetZoneId}` se vkládá v `processAI` state 6 (world.js:1083) když AI útočí na player zónu. M7b naplní handler:
```
function startBattle(state, {attackerId, targetZoneId}, ctx):
    if (state.battle) return            // už běží bitva — orig guard ř.55 (jedna bitva naráz);
                                        // doporučeno: re-schedule +N nebo drop (orig drop/log). Drop + log.
    const zone = getZone(state, targetZoneId); const faction = getFaction(state, attackerId)
    if (!zone || !faction) return
    state.battle = createBattleState(state, zone, faction, /*isBandit*/false)   // §9.2
    // battle.tick (Phase3 téhož stepu) převezme automat
```
- `createBattleState` = port orig `create()` (ř.54-193): naplní sides z `zone` (defender) + `faction.capital`/invasion forces (attacker). Player jednotky z `zone.warriors/archers` pokud zóna je player's; opponent z `faction` capital nebo invasion paketu. Combat staty z `military.json combat` (player) / `faction.unitStats` (AI). action dle `zone.liege==='player'` (player DEFENDING).
- **Invasion forces (m-2, ZÁVAZNĚ)**: orig bere `opponent.invasion.warriors/archers` (ř.148), ALE `processAI` state 6 (world.js:1083) vkládá `startBattle` jen s `{attackerId, targetZoneId}` — **žádný invasion paket** (ověřeno reviewerem). ⇒ attacker forces se POVINNĚ odvodí z **`getCapital(attackerId).warriors/archers`** (vzor AI-AI world.js:1097), NE z neexistujícího `opponent.invasion` (jinak `undefined`→NaN). Coder ověří helper `getCapital` (M7a-2); pokud chybí, čte `faction.capital.warriors/archers` přímo s clamp/fallback `0`.

### 9.2 Bandité (orig bandit raid)
Spouštění přes **schedule** (jako AI invaze, ale attacker = `'bandits'` pseudo-faction). Trigger: periodický schedule event `'banditRaid'` (perioda v BALANCE.battle.banditPeriod) NEBO event-driven (M8 story). Pro M7b minimum: schedule handler `banditRaid` → `createBattleState(state, homeZone, banditsLiege, isBandit=true)`. Bandit liege staty: approximace (provenance) nebo dedikovaný `_battle.bandits` v military.json. `isBandit=true` přepíná outcome větev na loot/demand (§8.3 bod 2/3).
- **Pozn.**: pokud bandit spawning není v M7a-2 datech, T4 přidá minimální schedule self-rearm `banditRaid` (vzor processFaction self-rearm world.js:1166). Frekvence = balanc (M9). Provenance flag.

### 9.3 Výsledky → offline summary
Catch-up bitvy doběhnou v dávce (battleTick běží v každém step). `resolveBattleOutcome` zapíše výsledek do bufferu, který offline summary přečte:
- Přidat `state.world.battleLog[]` (nebo `state.offlineBuffer.battles[]`) — pole outcome záznamů `{zoneId, winner, playerCasualties, kills, loot/demand, atStep}`. Mutuje se v `resolveBattleOutcome`.
- `OfflineSummary.js buildOfflineSummary` rozšířit o `battles: state.world.battleLog filtrovaný na offline okno` (between startStep a endStep catch-upu). Model PURE (žádný DOM). `formatOfflineSummary` přidá řádek „Proběhlo N bitev: výhry/prohry, ztráty, kořist".
- **Determinismus**: buffer je ve state → součást save, fresh-vs-load konzistentní. Ořezat/rotovat buffer (max N záznamů) ať save neroste neomezeně (R-J měření savu).

---

## 10. T2/T1 TABULKOVÉ + DETERMINISMUS TESTY (povinné)

1. **formulas tabulkové** (battleDamage, battleDefense, revivePlayer, reviveAI) — referenční čísla z orig vzorců, oba crit/nocrit. §6.1-6.3.
2. **battleStep determinismus**: stejný `bs`+commands+rng seed → identický výstup (N opakování stejný hashState dílčího bs).
3. **Kill-resume (A4)**: spusť bitvu K battle-tiků → snapshot save → load → doběhni → `hashState` == fresh doběh bez save/load. Snapshot uprostřed sub-stepu (nenulový `subAccMs`).
4. **G2 auto-resolve == live**: bitva přes `advance()` (queue prázdná) vs. přes `runCatchupBatch()` stejný počet stepů → identický výsledný `state.battle.summary` + `hashState`. **Jádro G2 testu.**
5. **Empty/edge battle**: 0 jednotek na straně → okamžitý end check, korektní winner, žádné NaN/dělení nulou (battleDefense focus.number=0 guard).
6. **Schedule round-trip**: `startBattle` event + state.battle přežije save/load (vzor M2a S-05).
7. **rng stream izolace + PEVNÝ počet (M-3)**: bitva spotřebuje jen stream 'battle' — ostatní streamy beze změny (negativní test). **Navíc**: počet spotřeb `rng('battle')` = (počet útoků s focus PO guardu) + (2× reviveAI v outcome); pozice `state.rng.streams.battle` po bitvě identická fresh==load i advance==catchup. Crit roll JEN po guardu, NE 2×, NE per focus cíl, NE pro útoky bez focus. §4 M-3.
8. **Reaction timing (M-2, double cd-decrement)**: první opponent warriors útok PŘESNĚ na `bs.tick === 60` (=reaction), archers na `bs.tick === 80` (=reaction+20); opakování v intervalu `attack.cd - 1` ticků (efekt dvojího dekrementu). Ověř, že opponent `cd--` běží i v ticku útoku PO `attackWith`. §7.3 M-2.
9. **Serializovatelnost (F-1)**: `JSON.parse(JSON.stringify(state.battle))` round-trip bez výjimky/ztráty (žádný cyklus). Negativní kontrola: žádné `army` pole na `Unit`; `typeof liege === 'string'`; `lastAttackId` string nebo null. §8.1a F-1.

---

## 11. DETERMINISMUS — souhrn (KRITICKÉ)

| Aspekt | Mechanismus |
|---|---|
| **Izolovaný rng** | `makeRng(state,'battle')` (rng.js:32), stream 'battle' existuje (rng.js:10). Žádný `Math.random` (orig ř.317/443 → `rng.next()`). |
| **battleStep deterministický** | Pevné pořadí kroků (end-check → cd-down → player commands → player AI → opponent AI → tick++). Pevné pořadí útoků (warriors→archers, player→opponent). 1× `rng.next()` na crit per útok, `reviveAI` rng v pevném pořadí. |
| **Serializovatelný kill-resume** | Celý `state.battle` (vč. `subAccMs/cd/tick/queue`) v save (persistSchema:300). rng stream pozice v save. Load pokračuje bit-identicky → fresh==load hashState (test §10.3). |
| **Auto-resolve catch-up == live (G2)** | `battle.tick` `every:'step'` → `runCatchupBatch` a `advance` volají identický `step()`→`battleTick`→`battleStep`. Offline = queue prázdná → obranná AI (skript) hraje za hráče stejnou cestou. **Žádná druhá implementace.** Test §10.4. |
| **Sub-step v akumulátoru** | `subAccMs += STEP_MS` per herní step; `while ≥30: battleStep`. Identické live i offline (catchup volá stejný battleTick). Levné (pár operací/tick). |

---

## 12. RIZIKA + MITIGACE

| ID | Riziko | Pravd./Dopad | Mitigace |
|---|---|---|---|
| R-D | Battle „feel" po ms→tick převodu | Nízká/Stř | Cooldowny 1:1 v ticích (žádný přepočet), tick 30ms. Playtest M7b T5, poznámky M9. |
| R-F | Player combat staty approximovány (gap) | Stř/Stř | provenance flag, kalibrace M9 (master plán §A4 R-F→iter-018 T2). |
| R-G | RNG vzorce vs orig odchylka | Nízká/Stř | Tabulkové testy proti orig (master plán §A4 R-G→iter-018 T3). |
| R-J | state.battle / battleLog roste save | Nízká/Nízká | battle=null po outcome; battleLog buffer rotace (max N). Tester měří save. |
| — | sub-step akumulátor drift při speed change | Nízká/Stř | subAccMs ve state, speed mění počet herních stepů (ne délku); battleTick deterministický per step. Test §10.4 přes catch-up. |
| — | „jedna bitva naráz" guard (orig ř.55) blokuje souběžnou invazi | Stř/Nízká | startBattle drop+log pokud state.battle≠null (orig chování). Souběžné invaze = M9 balanc, ne M7b. |

---

## 13. CO NESAHAT (scope OUT)

- **Žádná změna §8.1 signatury** `battleStep(bs, commands, rng)` (kontrakt, stub ř.29). Naplnění BattleState obsahu = OK (kontrakt to delegoval na M7).
- **Frakční AI / zóny** = hotovo M7a (NEsahej `processAI`, `redistributeForces`, `processZone`, `processFaction`). M7b jen **čte** `faction.unitStats/capital`, naplní `startBattleStub`.
- **`aiBattleResolve`** (AI-AI, formulas.js:380) = hotovo M7a-2, beze změny. M7b je AI-vs-player a player-defend.
- **Žádná změna tickOrder pořadí** (battle.tick step/30 už registrován).
- `warningAIAttacking/dangerAIAttacking/AIIsAttacking/loadImportantEvent` = M8 stuby (world.js:1190+), NEsahat.

---

## 14. IMPLEMENTAČNÍ POŘADÍ PRO SONNET

1. **T2 formulas** (battleDamage/battleDefense/revive) + tabulkové testy — nezávislé, nejdřív (zelené testy = jistota vzorců).
2. **G-MILITARY-STATS**: `military.json combat` bloky + provenance; ověř `state.player.baseRevival/unitStats` existenci (fallback dle DR-017-01 m-4 vzoru).
3. **T1 battleStep + battleTick + BattleState** (battle.js): sub-step akumulátor, attackWith, opponent AI. + determinismus/kill-resume testy.
4. **T3 battleCommand + obranná AI** (politika v battleStep) + G2 test (§10.4).
5. **T4 startBattle/banditRaid handlers** (world.js naplnit stub) + resolveBattleOutcome + offline buffer + summary.
6. **T5 battle UI** (selektory state.battle → progress/log/commands; battleCommand intent; žádná logika v UI) + playtest feel checklist (R-D, poznámky M9).

---

## 15. ALTERNATIVY (povinné, min. 1)

- **Split M7b-1/M7b-2** — §1, zamítnuto (M7b-1 nehratelný bez spouštěče; fallback zůstává otevřen).
- **Vlastní battle časovač místo sub-step akumulátoru** — zamítnuto: zavedl by druhý časový zdroj mimo `step()`, rozbil by G2 (catch-up by battle neběžel) a determinismus. Sub-step v `battleTick` je jediný správný (vše přes `step()`).
- **battleDamage s rng uvnitř** (místo bool crit) — zamítnuto: tabulkové testy by potřebovaly rng mock; bool crit drží formuli čistě číselnou, crit roll je explicitní v `battleStep`.
- **state.battle minimální + outcome dopočítat** — zamítnuto: porušuje kill-resume (A4); plný serializovaný automat je levný a korektní.

---

*Konec DESIGN-018-001. Pokrývá T1–T5 pro Sonnet bez dalších architektonických rozhodnutí. Determinismus: serializovatelný battleStep (kill-resume A4) + auto-resolve catch-up == live (G2, jeden battleStep, žádná druhá implementace) + sub-step akumulátor (živě i offline). SPLIT=NE (fallback M7b-1/M7b-2 otevřen). G-MILITARY-STATS=approx+provenance, M9. Cituje §8.1/§9.2/K8/D8/G2/D10/A4, DR-013-00/016-01/017-01, orig battle.js ř.442/494/311/231/265/586.*
