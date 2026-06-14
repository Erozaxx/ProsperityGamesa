# QA Report — iter-017 T-007 (M7a-2 + DoD M7a)

- **Task**: T-007 (tester), BRIEF-017-007
- **Iterace**: iter-017 (M7a-2)
- **Datum**: 2026-06-15
- **Tester**: Sonnet (QA agent)
- **Verdikt**: **GO** (DoD M7a)

---

## Souhrn ověření

Všech 11 AC empiricky ověřeno vlastním během. Žádný blocker nalezen. Všechny kritické oblasti (processAI replay determinismus, self-rearm, favour migrace, catch-up, regrese) jsou PASS s přímým důkazem z kódu a testů.

---

## AC1 — `npm run ci` zelené, `npm run smoke` OK

**PASS**

- `npm run ci`: **1255/1255 pass, 0 fail** (T2: 9 testů, T3: 35 testů, T6: 28 testů; M7a-1/M5/M6/M4b nedotčeny)
- `npm run smoke`: **SMOKE OK, 0 console errors**
- Smoke výstup obsahuje tab `Svět` v navigaci: `PřehledPřírodaPráceDovednostiRadaTrhStavbaKontraktyVedaSvět`

Důkaz: terminálový výstup npm run ci (1255/1255, 0 fail) + smoke output "SMOKE OK: app rendered, 0 console errors".

---

## AC2 — processAI replay determinismus (KRITICKÉ)

**PASS**

- Test T2-7 (`test/m7a2-world-t2.test.js`): stejný seed → stejný `faction.state` po `processAI` — PASS.
- Žádný `Math.random`/`Date.now` v core: grep přes `src/core/` — výsledky pouze v komentářích (dokumentace „nahrazeno rng"), žádný aktivní výskyt.
- Frakce reálně mění state 0–7: catch-up test `QA-CATCHUP-3` prokázal, že alespoň jedna frakce změnila stav po aktivaci `aiMechanicStart` — PASS.
- `processAI` (world.js:905) používá výhradně `rng.next()`/`rng.chance()`/`rng.int()` z `makeRng(state,'world')`, žádný `Math.random`.
- Všechny stavy 0–7 implementovány, AISTATES přechodová logika 1:1 originál (world.js:905–1139).

---

## AC3 — armFactionAI self-rearm (DR-012-02)

**PASS**

- T2-4: fresh state → 3 frakce naplánované (set-difference) — PASS.
- T2-5: idempotence — druhé volání nevytváří duplikáty — PASS.
- T2-6: asymetrický schedule (jen `thePrincess`) → doplní `theWarlord`+`thePsychopath`, bez duplikátu — PASS.
- T2-8: po save/load + `armFactionAI` — přesně 3 entry, žádný duplikát — PASS.
- QA-CATCHUP-5: po 10 dnech sim, save/load+rearm → 3 unique entries — PASS.
- Kód (world.js:1245–1263): set-difference scan `schedule.filter(e => e.id === 'world.processFaction').map(e => e.params.factionId)` + insert jen chybějící. `scheduleCountOf` NEPOUŽITO — potvrzeno kódem.
- Re-arm v `processFaction` (world.js:1167–1168): nepodmíněný (vždy po processFaction, i pod aiMechanicStart, i při state=7).

---

## AC4 — favour migrace (M7a-1 regrese)

**PASS**

- T2-1: fresh i load — všechny `zone.favour` jsou objekt (ne number) — PASS.
- T2-2: starý M7a-1 save (`favour: 0`, number) → load → `{}` deterministicky; hashState == fresh — PASS.
- T2-3: neprázdný round-trip `{thePrincess:-3, player:7}` → save/load → deep-equal — PASS.
- T3-17: favour objekt přežije save/load po revolt aktivitě — PASS.
- T3-18: hashState(fresh) == hashState(load(save(fresh))) s questy/favour inicializací — PASS.
- M7a-1 round-trip (m7a-world-t1): 34/34 testů PASS — M7a-2 nerozbilo M7a-1 favour migraci.
- `migrateFavour` (world.js:584–591): 4 větve v závazném pořadí (saved object > saved number > def object > {}). `persistSchema.js:259`: `typeof==='object' ? {...z.favour} : {}`. `zones.json`: favour `{}` (13 zón).

---

## AC5 — Revolty/questy/tribute deterministické

**PASS**

- T3-1: revolt favour-drain deterministický (stejný stav → stejný výsledek) — PASS.
- T3-2: gating `revoltMechanicStart` — pod prahem no-drain, nad prahem drain — PASS.
- T3-3: immune kombinace (hornCastle/thePsychopath, dickinsonLanding/theWarlord, castleGrey/thePrincess) — PASS.
- T3-4: revolt trigger (favour < 5 → zone.liege = originalLiege, policy=1) — PASS.
- T3-5: revolt decay (liege==originalLiege → per-faction decay toward 0) — PASS.
- T3-6/T3-7/T3-8: quest gating (settlementLevel, hasMilitary, liege==originalLiege) — PASS.
- T3-9: quest generování deterministické (stejný seed → stejné questy) — PASS.
- T3-10/T3-11/T3-12: accept/reject quest mění stav (warriors/archers deduct, reward grant, removeQuest) — PASS.
- T3-13/T3-14: gatherTributes — player zóny → grant; AI zóny → capital.resources.gold — PASS.
- Revolt RNG-free (deterministický bez rng), quest používá `rng('world')`, tribute deterministické.

---

## AC6 — AI-AI bitvy vzorcem

**PASS**

- T3-15: `aiBattleResolve` tabulkový test — 1:1 originál ř.952–981, attacker wins/loses scenáře — PASS.
- `aiBattleResolve` v `formulas.js:380–429`: čistá fn s `rng` parametrem, deterministická.
- `battle.js` (`src/core/systems/battle.js`): NEDOTČEN — poslední commit je z iter-007 (M2a-2), žádná změna v iter-017 (ověřeno `git log`).
- AI-vs-player → `scheduleInsert(curStep+100, 'startBattle', {...})` stub (world.js:1083–1087) — M7b stub, battle.js se nedotýká.
- Poznámka: `aiBattleResolve` je implementováno TAKÉ inline v `processAI` (world.js:1096–1132) — identická logika. `formulas.js` verze slouží jako čistá testovatelná fn. Není to duplikace chybou — oba přepisy jsou 1:1 originál.

---

## AC7 — Catch-up-safe (AI svět v dávce)

**PASS**

- QA-CATCHUP-1: 1 herní rok (365 × 900 = 328500 kroků) s frakční aktivitou — **bez crashe** — PASS.
- QA-CATCHUP-2: stejný seed → stejný hashState po 1 roce — **deterministický** — PASS.
- QA-CATCHUP-3: alespoň jedna frakce změnila stav po aiMechanicStart — **není no-op** — PASS.
- QA-CATCHUP-4: batch (1 volání) vs. incremental (7denní chunky) → **stejný hashState** — PASS.
- Vše schedule-driven nebo periodikum (O(1)/tick), bez O(n²). Test bežel ~0.8 s pro 5 scénářů.

---

## AC8 — M7a-2 NEROZBIL M7a-1/M5/M6/M4b

**PASS**

- m7a-world-t1: **34/34 PASS** — M7a-1 round-trip nedotčen.
- m7a2-world-t2: **9/9 PASS** — T2 automat, armFactionAI, migrace.
- m7a2-world-t3: **35/35 PASS** — T3 revolt/quest/tribute/AI bitvy.
- ui-selectors-world-t6: **28/28 PASS** — UI selektory.
- m5-contracts + m5-buildings-t1 + m6-tech-research + m4b-market-caravan: **165/165 PASS** — M5/M6/M4b nedotčeny.
- iter005-edge (G1 determinismus): **16/16 PASS** — G1 save determinismus nedotčen.
- Celkový CI: **1255/1255** (bez mého nového QA skriptu) nebo 1260/1260 (s ním).

---

## AC9 — Persist round-trip M7a-2 domén

**PASS**

- T2-9: `faction.state`, `wantToAttack`, `nextTarget` přežijí save/load — PASS.
- T3-16: `world.quests`, `world.questSeq` přežijí save/load — PASS.
- T3-17: `zone.favour` (objekt) přežije save/load po revolt aktivitě — PASS.
- T2-3: neprázdný favour round-trip `{thePrincess:-3, player:7}` — PASS.
- `persistSchema.js:24`: `world: ['zones','factions','forest','field','mine','marketState','caravan','quests','questSeq']` — quests/questSeq v allowlistu.
- Staré savy (undefined-guard): `hydrateZones` (world.js:688–691): `if (!Array.isArray(w.quests)) w.quests = []`; `if (typeof w.questSeq !== 'number') w.questSeq = 0`.

---

## AC10 — UI funkční

**PASS**

- `WorldZonesScreen` (`src/ui/screens.js:615`) renderuje bez chyb (smoke OK, tab "Svět" viditelný).
- Tab wiring: `App.js` řádek 27 `{ id:'world-ai', label:'Svět' }`, řádek 118 `WorldZonesScreen` wiring.
- Selektory: `selectWorldZones`/`selectFactions`/`selectQuests` v `selectors.js` — čisté read-only funkce, žádný DOM/side-effect.
- Accept/reject quest: `send('acceptQuest', {questId})` / `send('rejectQuest', {questId})` (screens.js:718–724) → volá T3 commandy.
- Žádná herní logika v UI — vše přes selektory (čtení) a send/commands (zápis).
- ui-selectors-world-t6: 28/28 PASS (ratingy derivované on-demand, favour undefined-safe, policyName, canAccept guard).

---

## AC11 — DoD M7a celkově

**PASS**

**Milník M7a je kompletní a hratelný:**

| Oblast | Stav |
|---|---|
| Zóny + tickování (M7a-1) | Implementováno, testováno, nedotčeno M7a-2 |
| Frakce mění state 0–7 deterministicky | Implementováno, replay test PASS |
| Frakce útočí (AI-AI bitvy vzorcem) | Implementováno, tabulkový test PASS |
| AI-vs-player stub (M7b) | scheduleInsert('startBattle') stub, battle.js NEDOTČEN |
| Revolty (favour-drain, gated) | Implementováno, immune/trigger/decay testy PASS |
| Questy (generate/accept/reject, deterministic) | Implementováno, gating/gen/commands testy PASS |
| Tribute (gatherTributes, month edge) | Implementováno, player/AI zóny testy PASS |
| Self-rearm (anti-DR-012-02) | Per-faction set-difference, idempotentní, testy PASS |
| Favour migrace (M-1) | number→{} deterministicky, 3 místa, starý save PASS |
| Catch-up-safe | 1 rok sim, batch==incremental, deterministický PASS |
| UI World/Zones/Factions/Quests | Tab Svět, selektory, accept/reject, smoke OK |
| M7a-1/M5/M6/M4b NEDOTČENY | 0 regresí v 1260 testech |

---

## Nalezené nové bugy

**Žádné blocker bugy nalezeny.**

Schválené gapy (NE bugy, dle briefu): G-LISTZONE, G-WORLD-DAYEDGE/INJECT-QTY/PERSIST-DERIVED, G-FAVOUR-SHAPE (resolved), G-CAPITAL-MISMATCH (resolved), G-QUEST-PERSIST (resolved), G-QUEST-TYPES, G-RECALL-MIN, G-MILITARY-STATS.

Poznámka — `aiBattleResolve` duplicita: logika bitvy je implementována jak v `formulas.js` (čistá fn pro test), tak inline v `processAI` (world.js:1096–1132). Jedná se o dvě konzistentní kopie originálu, nikoliv chybu. Konsolidace = M9 cleanup (NE blocker).

---

## Regresní rizika

- Nízká: `aiBattleResolve` duplicita (formulas.js vs inline) — kód shodný, ale dvojí maintenance point. Riziko divergence při M9 calibration.
- Nízká: G-QUEST-PERSIST — quests/questSeq v allowlistu, ale questExpire handler je idempotentní no-op pokud quest zmizel — správně.
- Nízká: G-SPY-ABSENT — state 4/5 bez spy systému přeskočí warning/danger eventy, ale přechody 4→5→6 probíhají správně (ověřeno kódem).

---

## Verdikt

**GO — DoD M7a**

Milník M7a (M7a-1 + M7a-2) je kompletní, hratelný a splňuje všechny AC. Všech 11 bodů PASS s empirickým důkazem. Žádné blocker bugy. Catch-up determinismus potvrzen 1-letou simulací. Regresní testy zelené.

**Downstream**: M7b (iter-018, battle automat hráčských bitev, DR-016-01).
