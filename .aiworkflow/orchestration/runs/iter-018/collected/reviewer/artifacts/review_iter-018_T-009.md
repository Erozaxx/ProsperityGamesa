# REVIEW GATE M7b + DoD M7 — iter-018 T-009 (Opus)

- **Review ID**: REVIEW-018-009
- **Iteration**: iter-018 (M7b — bitvy; dokončuje milník M7)
- **Task**: T-009 (reviewer, Opus) — závěrečný review gate M7b + ověření DoD M7
- **From**: reviewer (právo re-run)
- **Date**: 2026-06-15
- **Base→HEAD**: `0c4635e..HEAD` (0202d04)
- **Vstupy**: DESIGN-018-001 (vč. revize T-002a), QA-018-008 (GO), DR-018-01, architektura iter-002 §8.1/K8/D8/G2, originál `doc/original_source/.../battle.js`

---

## VERDIKT: **GO** ✓

DoD M7 **SPLNĚN** — milník kompletní. Všechny tvrdé invarianty (1-6) ověřeny **proti kódu i proti originálu**. Determinismus bitvy (replay, kill-resume serializovatelnost, G2 auto-resolve==live) i 1:1 originál (M-1/M-2/M-3, cd/crit/revival) potvrzeny. QA empirický GO koreluje s mým code-level ověřením. CI 1385/1385 zelené (ověřeno reviewerem, nejen převzato).

**Nálezy: 0 blocker · 0 major · 2 minor · 4 nit.** Žádný nález nebrání GO. Minory jsou neaktivní cesty / hraniční edge, nity jsou kvalita/dokumentace.

---

## Ověření tvrdých invariantů (proti KÓDU)

### Invariant 1 — Kontrakt §8.1 beze změny ✓
`battleStep(bs, commands, rng) → bs'` signatura zachována (battle.js:234). Top-level BattleState klíče `{zoneId, sides, state, tick, log, summary}` (battle.js:401-473) beze změny; runtime pole (`subAccMs/queue/reaction/startedAtStep/attackerSide/banditLoot/meta`) jsou naplnění obsahu BattleState, ne rozšíření signatury — kontrakt to delegoval na M7 (design §3.2 pozn.). `battleStep` je PURE (vrací nový objekt přes `cloneBs`, vstup nemutuje — QA BR-1 empiricky + ověřeno na battle.js:238).

### Invariant 2 — Serializovatelnost / kill-resume (F-1) ✓
- `liege: string` (battle.js:405 `'player'`, :435 `factionId`) — **NE objekt**. ✓
- `lastAttackId: string|null` (battle.js:417/429/446/458 init `null`; nastavováno `attack.id` battle.js:135) — **NE objekt attack**. ✓
- **Žádný `army` self-ref** — orig cyklus units↔side (ř.249/251) **vynechán**; `attackWith(units, attack, targetSide, …)` bere targetSide parametrem (battle.js:133). ✓
- **Žádné funkce/closury** v state.battle — `rng` se vytváří lokálně v `battleTick` přes `makeRng` (battle.js:846), nikdy se neukládá. thumbRing jako serializable boolean v `meta` (battle.js:485), ne objektová ref. ✓
- **Žádné `undefined`** — `createBattleState` inicializuje všechna pole číselně/null (battle.js:401-487). ✓
- Persist passthrough (persistSchema.js:300) + load (load.js:247) — staré savy `battle ?? null` guard → `selectBattle` má `!bs` guard (selectors.js:825), `battleTick` má `!st.battle` guard (battle.js:844). ✓
- JSON round-trip bez výjimky/cyklu — QA AC-3 + BR-2/BR-7 empiricky PASS; deepStrictEqual fresh==load PASS.

### Invariant 3 — G2 auto-resolve == live ✓ (jádro, ověřeno proti kódu)
- `battle.tick` = `{every:'step', order:30}` (tickOrder.js:230), `register(...,'battle.tick',battleTick)` (tickOrder.js:162). ✓
- `advance()` (clock.js) i `runCatchupBatch` (catchup.js:50) volají **identický `step()`** (clock.js:44 `step→runTick`). **Žádná druhá implementace.** Ověřeno čtením obou cest. ✓
- Offline = prázdná `queue` → `commandsApplied===0` → obranná AI politika v `battleStep` (battle.js:276-286) hraje za hráče stejnou cestou (charge[0]/volley[0], pevné pořadí warriors→archers). ✓
- QA AC-4: 5000× battleTick live == catchup (hashState, zones, battleLog deepStrictEqual) + QA-CATCHUP-4 batch==incremental PASS.

### Invariant 4 — Determinismus 1:1 originál ✓
- **Jediný rng**: `makeRng(state,'battle')` (battle.js:846); žádný `Math.random` v battle path (QA monkey-patch test PASS). Orig ř.317/443 `Math.random` → `rng.next()`. ✓
- **Pevné pořadí** kroků (end-check → player cd-down → player commands → player AI → opponent AI → tick++) a útoků (player→opponent, warriors→archers) — battle.js:242-323. ✓
- **M-1 baseRevival**: `(st.player?.baseRevival) ?? BALANCE.battle.baseRevivalDefault` (battle.js:537) — **`??` ne `||`** (legitimní `0` neaktivuje fallback). `baseRevivalDefault=0.25` (balance.js:438, provenance:approximated). `bonuses` ze tří terms `?0.x:0` (battle.js:539) — žádný `undefined`/NaN. `revivePlayer` PURE bez rng (formulas.js:406). Ověřeno proti orig ř.311. ✓
- **M-2 cd double-decrement**: opponent warriors (battle.js:295-306) i archers (:308-320) — `attackWith` nastaví `cd=attack.cd`, **PAK samostatný `cd--`+clamp≥0 KAŽDÝ tick** (i v ticku útoku), guard `if number>0` obaluje celý blok. **1:1 orig ř.265-291** (přečteno, řádek po řádku shoda). Player cd-down JEN 1× na začátku (battle.js:252-253, orig ř.239-247) — asymetrie záměrná. QA BR-4: warriors cd=79 po tick=60, archers cd=119 po tick=80 PASS. ✓
- **M-3 crit rng**: `critRoll = rng.next() < units.critChance` **přesně 1× v bodu 5** (battle.js:165) — **PO guardu** (number>0 && cd===0, battle.js:138/142), **PO** kontrole `focus.length===0` (battle.js:157, útoky bez focus crit nehází), **1× per útok NE per cíl** (mimo focus loop, battle.js:169). QA BR-5: rng stream pozice identická 2 runy PASS. Orig getDamage ř.443 voláno 1× per attackWith s focus po guardu — počet rng.next() shoda. ✓
- **reviveAI** 2× v outcome, **archers→warriors pevné pořadí** (battle.js:548-549, orig ř.317-318). ✓

### Invariant 5 — battle.js stub plně nahrazen ✓
- `battleStep/battleTick/createBattleState/resolveBattleOutcome/startBattle/banditRaid/armBanditRaid` plně implementovány (battle.js:234-867). Žádný no-op zbytek.
- `startBattleStub` (world.js) → `startBattleHandler = startBattle`, registrováno (world.js:1190/1229). `banditRaid` registrováno (world.js:1230). `armBanditRaid` volán v bootSequence po armFactionAI (main.js:216). ✓
- M8 stuby (`warningAIAttacking/dangerAIAttacking/AIIsAttacking/loadImportantEvent`) **jasně označené no-op** a NEsahnuté (world.js diff) — správně mimo M7b scope. ✓

### Invariant 6 — UI bez logiky ✓
`BattleScreen` (screens.js:755) pure — čte výhradně `selectBattle(snapshot)`, píše `send('battleCommand',{side,action})` (screens.js:788). Žádná herní logika v UI. Deriváty (`cdPct`, `progressPct`, `available`) počítané v `selectBattle` selektoru (selectors.js:871-893), ne v UI. ✓

---

## Nálezy

### MINOR

**MIN-1 — Player ATTACKING výhra: přidaný `zone.liege='player'` + obsazení nad rámec orig end()**
`resolveBattleOutcome` battle.js:556-563 při player ATTACKING+výhra obsadí zónu a nastaví `liege='player'`. Originál (battle.js ř.324-326) v této větvi má **jen komentář** „successfully attacked a town" a převod zóny neřeší v end(). Navíc orig při ATTACKING-prohře vrací jednotky domů (`homeZone.warriors += …` ř.355-356) — implementace toto neimplementuje (battle.js:587-593 jen vynuluje).
**Dopad: nízký.** V M7b je player-ATTACKING **mrtvá cesta** — `startBattle` se schedule jen z `processAI` state 6 kde je zóna vždy player's (world.js:1082), takže player je vždy DEFENDING. UI nemá command pro zahájení útoku. Cesta existuje pro úplnost + kill-resume.
**Návrh:** Ponechat (korektní doplnění). Při zavedení útočného UI (pozdější milník) doplnit i orig návrat jednotek domů při ATTACKING-prohře. Označit `// M7b: player-attack path inactive (no offensive UI yet)` u battle.js:556.

**MIN-2 — `_recordBattleHistory` používá `startedAtStep` jako `atStep`**
battle.js:741 `atStep: bs.startedAtStep` = step zahájení bitvy, ne ukončení. `selectOfflineBattles` filtruje `atStep >= startStep` (OfflineSummary.js:66). Bitva, která **začala před** offline oknem ale **doběhla během** něj, se do offline summary nezahrne.
**Dopad: nízký** (hraniční edge; pro M7b dostatečné, QA AC-6 PASS). **Návrh:** zvážit záznam `resolvedAtStep = state.engine.curStep` pro přesnější offline filtr (M9 / playtest).

### NIT

**NIT-1 — Inkonzistentní zdroj attacks katalogu mezi battleCommand a battle.js.** `battleCommand.js:31` má hardcoded `VALID_ACTIONS` set, zatímco `battle.js:60 getAttacks()` čte z `military.json _battle.attacks` s `ATTACKS_FALLBACK`. Při změně katalogu hrozí drift validace vs exekuce. Návrh: validační set odvodit z `getAttacks()` (DRY) — kvalita, ne korektnost.

**NIT-2 — `lastMaxCD: 100` magická konstanta** v create (battle.js:415/428/444/458). Orig ř.106/117 stejně (1:1), ale stojí za komentář „init placeholder; přepíše se na attack.cd při prvním útoku".

**NIT-3 — thumbRing aplikace na obě strany.** `attackWith` battle.js:152 aplikuje thumbRing cd-redukci na jakékoli archers pokud `bs.meta.thumbRing` (odvozeno z `state.player.unlockedTechs`). Orig ř.478 měl stejnou podmínku bez rozlišení strany (`units.type=='archers'`), takže **1:1** — ale efekt: hráčův thumbRing zrychluje i opponent archers. Záměr (1:1 orig). Návrh: ponechat, komentář pro M9 kalibraci.

**NIT-4 — `banditRaid` numbers (warriors:10, archers:5) inline magic** (battle.js:797-798) bez provenance flagu na hodnotě (komentář „provenance: approximated" je inline). G-BANDIT-PERIOD/bandit stats jsou schválené gapy (M9). OK, jen by patřily do BALANCE.battle pro konzistenci s ostatními battle konstantami.

---

## Soulad s designem + architekturou

- **Design §3.1 sub-step akumulátor**: `battleTick` battle.js:842-867 — `subAccMs += STEP_MS(50)`, `while ≥ BATTLE_TICK_MS(30)`, drain queue, `battleStep`, na done → `resolveBattleOutcome` + break. **1:1 design.** ✓
- **Design §6 formulas**: battleDamage (formulas.js:365, orig ř.442), battleDefense (:384, orig ř.494-499 + focusNumber≤0 guard), revivePlayer/reviveAI (:406/:422). Tabulkové testy QA AC-5 PASS. ✓
- **Design §7.3 opponent AI** 1:1 vč. M-2. ✓ **§9.1 m-2** invasion forces z `getCapital` (battle.js:389 `_getCapitalZone`), ne neexistující `opponent.invasion`. ✓
- **Design §5 attacks katalog** 1:1 orig (cd/multiplier/focus ověřeno proti orig ř.586-629). ✓
- **Architektura G2/D10/A4/K8/D8** — žádná změna tickOrder pořadí (battle.tick order 30 zachován), žádná druhá implementace, kill-resume serializovatelný, tick 30ms 1:1 bez ms↔tick přepočtu. ✓
- **Žádné odchylky od kontraktu §8.1** ani od scope OUT (§13) — processAI/zóny/aiBattleResolve nedotčeny (world.js diff = jen wiring startBattle/banditRaid).

## Reuse / simplify / mrtvý kód
- Reuse správný: `grant/pay/canAfford` (transactions), `makeRng`, `scheduleInsert/scheduleCountOf`, `getCatalog`. `armBanditRaid` zrcadlí `armContractOffer/armFactionAI` (anti-DR-012-02 idempotence, scheduleCountOf===0 guard). ✓
- Mrtvý kód: player-ATTACKING outcome větev neaktivní v M7b (MIN-1) — označeno, ne odstraňovat (potřebné pro budoucí útočné UI + serializaci).
- M8 stuby jasně označené no-op (world.js). ✓

## Persist / migrace
- state.battle round-trip bit-identický (QA BR-2). Staré savy: `payload.battle ?? null` (load.js:247) + guardy v battleTick/selectBattle/battleCommand. `armBanditRaid` pokrývá staré savy bez banditRaid v schedule (QA BT4-2). battleLog rotace max 50 (battle.js:744-747, R-J). ✓

## Živé artefakty
- tickOrder.js:230 `battle.tick` order 30 aktivní; world.js:1229-1230 startBattle/banditRaid registrace aktivní; main.js:216 armBanditRaid aktivní. Žádné dark-code (registrace přes registerBattleCommands main.js:123). ✓

## Gapy (NEflagováno jako blocker — schválené tom-proxy proxy)
G-MILITARY-STATS (player combat staty approx, balance.js + military.json provenance), baseRevivalDefault=0.25 approx (M-1 fallback), G-AIBATTLE-DEDUP (M7a-2 scope OUT), G-BANDIT-PERIOD. Všechny v gap-reportu / QA Nálezy, provenance flagy přítomny, kalibrace M9 (R-F). Korektně označené. ✓

---

## Stanovisko k DoD M7

**DoD M7 SPLNĚN — milník kompletní.**

| Požadavek M7 | Stav | Důkaz (kód) |
|---|---|---|
| AI svět (zóny/frakce/jednotky/trh/revolty/questy/tribute) — M7a | ✓ | M7a-1/M7a-2 hotovo, nedotčeno (QA AC-9, 316+ testů zelených) |
| Bitvy live (battleCommand) | ✓ | battleCommand.js + battleStep player commands (battle.js:255-271) |
| Bitvy offline auto-resolve | ✓ | G2 obranná AI, queue prázdná (battle.js:276-286), catch-up identický |
| Invaze frakční AI → reálná bitva | ✓ | startBattle handler (battle.js:759) ← processAI state 6 (world.js:1084) |
| Bandité | ✓ | banditRaid + armBanditRaid idempotent (battle.js:783-825, main.js:216) |
| stub M2a world.js (startBattleStub) nahrazen | ✓ | startBattleHandler (world.js:1190) |
| stub M2a battle.js nahrazen | ✓ | 862 řádků plné implementace, žádný no-op zbytek |

## Stanovisko k determinismu

**Determinismus POTVRZEN na úrovni kódu i empiricky.**
- **Replay**: jediný rng('battle'), pevné pořadí, žádný Math.random → identický bs pro identický vstup (QA BR-1).
- **Kill-resume**: state.battle plně serializovatelný (F-1: žádné cykly/funkce/objektové liege-lastAttack/undefined), rng stream pozice v save, subAccMs ve state → fresh==load bit-identický (QA AC-3, save uprostřed sub-stepu).
- **G2 auto-resolve==live**: jeden `battleStep`, jedna cesta přes `step()`; advance==catchup ověřeno strukturálně proti kódu (clock.js:44 + catchup.js:50) i empiricky (QA AC-4 + QA-CATCHUP-4). DR-012-02 catch-up-safe ≥1 rok (328500 kroků, 50 bitev, hashState finite, QA AC-7).
- **1:1 originál**: M-1 (`??` ne `||`, fallback 0.25), M-2 (double cd-decrement), M-3 (crit 1× po guardu) ověřeny proti originálu řádek-po-řádku.

---

## Doporučení dalšího kroku
**APPROVE — uzavřít M7b a milník M7.** Žádný re-run nutný. Minor/nit nálezy jsou nezávazné, vhodné pro M9 backlog (MIN-1 útočné UI, MIN-2 resolvedAtStep, NIT-1 DRY validace).

---

*Konec REVIEW-018-009. Ověřeno proti KÓDU (battle.js/formulas.js/battleCommand.js/world.js/main.js/selectors.js/screens.js) i proti ORIGINÁLU (doc/original_source battle.js ř.54-629). 0 blocker, 0 major, 2 minor, 4 nit. GO. DoD M7 splněn. Determinismus (replay+kill-resume+G2+1:1) potvrzen.*
