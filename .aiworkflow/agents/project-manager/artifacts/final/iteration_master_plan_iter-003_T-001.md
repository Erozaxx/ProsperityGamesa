# Prosperity rebuild – Iteration Master Plan (iter-003, T-001)

- **Task**: T-001, iter-003 (BRIEF-008)
- **Autor**: project-manager
- **Datum**: 2026-06-13
- **Vstupy**: architektura `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md` (§0 D1–D13, §10 K0–K19, §11 M0–M9, §12 rizika), `zadani_projektu.md`, `project/done-criteria.md`
- **Účel**: kompletní end-to-end plán všech implementačních iterací (iter-004 → release). Plánovací deliverable – žádný produkční kód, žádná změna architektury. Detailní obsah tasků navrhne Opus agent v dané iteraci; zde jsou tasky nařezané na úroveň umožňující ten návrh.

---

## 1. Konvence plánu (platí pro všechny iterace)

### 1.1 Modely a role
| Role | Model | Poznámka |
|---|---|---|
| Detailní návrh tasku | **Opus** | u tasků S smí být návrh zkrácený (návrh = upřesněný brief), u M/L plný design |
| Provedení tasku | **Sonnet** | task nesmí přesáhnout schopnosti Sonnet agenta – příliš velký task se dělí, neponechává |
| Test loop | **Sonnet** (plný test loop) / **Haiku** (smoke-only re-runy) | tester agent |
| Review gate | **Opus** | reviewer agent, **pravomoc re-run** (viz 1.4) |

### 1.2 Komplexita
- **S** = malý, jednoznačně ohraničený task (≤ ~1 modul / ~1 sezení Sonneta bez rizika)
- **M** = střední (víc modulů nebo netriviální logika, ale jeden souvislý celek)
- **L** = velký/rizikový – v plánu se vyskytuje jen tam, kde jej nelze smysluplně dělit níž; Opus návrh u L tasku MUSÍ obsahovat dekompozici na kroky proveditelné Sonnетem, jinak orchestrátor task rozdělí na dva.

### 1.3 Povinný test loop (závěr KAŽDÉ iterace)
Každá iterace má předposlední task **T-TEST** (tester, Sonnet; opakované smoke re-runy smí Haiku). Základní sada, kumulativní (co jednou platí, platí navždy):

| Od iterace | Co tester ověřuje |
|---|---|
| iter-004 (M0a) | `tsc --noEmit --checkJs` zelené; `node:test` suite zelená; **determinismus**: `hash(simulate(seed, N))` stabilní; grep gate na zakázané importy v core (DOM/fetch/`Date.now()`/`Math.random()`) |
| iter-005 (M0b) | + **save round-trip** (save → load → identický stav dle persist schémat); **PWA smoke** (install + offline start) – od M0 při každé iteraci, ne až M9 (N-03) |
| iter-006 (M1) | + schema validace katalogů; **tabulkové testy vzorců** proti referenčním číslům originálu |
| iter-007+ (M2a dál) | + **catch-up-safe invariant (S-05)**: každý nově přidaný systém běží deterministicky a levně v catch-up dávce (žádný DOM, žádný `Date.now()`/`Math.random()`, žádné alokace/O(n²) v hot-path); **kontraktní testy §8** vč. negativního testu S-06 (stub world nevolá `getGoldValue`/`market.inject` před M4b) |
| iter-008+ (M2b dál) | + end-to-end catch-up scénář (load se starým `lastSimTimestamp` → dávka → cap → summary); migrace savů z předchozí verze schémat |

Kumulativní sada platí i tam, kde T-TEST dané iterace výčet neopakuje položku po položce – např. **PWA smoke běží od iter-005 při každé iteraci** (tedy i v iter-006 a iter-007), i kdyby ho výčet T-TEST výslovně nejmenoval. Tester se řídí touto tabulkou, výčty v T-TEST jsou jen zvýraznění nových priorit.

„Systém funguje live, ale rozbíjí catch-up" = neprošlá iterace.

### 1.4 Povinný review gate (úplný závěr KAŽDÉ iterace)
Poslední task každé iterace je **T-REV** (reviewer, **Opus**):
- Ověří DoD iterace bod po bodu + acceptance criteria tasků.
- Ověří platnost kontraktů §8 a aktuálnost **živých artefaktů** (tickOrder §4.3, ASCII diagram §3.5 – musí být aktualizovány ve stejném commitu jako strukturální změna; N-04).
- Ověří, že balanc čísla šla do `balance.js` s odkazem na zdroj (ne inline), a persist schéma vzniklo současně se systémem (doporučení §14.3–4).
- **Pravomoc re-run**: při nálezu reviewer vrací iteraci (orchestrátor: `make reopen-task` + re-dispatch přes `/dispatch-agent`); smyčka oprava → test loop → review se opakuje **dokola**, dokud reviewer nedá GO. Po 3. neúspěšném kole reviewer eskaluje orchestrátorovi/uživateli s analýzou příčiny (špatně nařezaný task vs. chybný návrh) – re-run právo tím nezaniká.
- **Dopad eskalace na kritickou cestu**: protože řetěz iterací je v podstatě lineární (§2.2), zaseklá iterace blokuje vše za sebou – po eskalaci se **navazující iterace nezahajují**, dokud zaseklá iterace není uzavřena (reviewer GO), nebo její rozsah re-scopován decision recordem (orchestrátor + PM, případně rozhodnutí uživatele). Orchestrátor nesmí pokračovat „okolo" zaseklé iterace; jedinou výjimkou je deklarovaný paralelismus iter-005 ∥ iter-006 (§2.2).

### 1.5 Struktura iterace
Každá iterace níže má: **Cíl · Milník/K mapování · Tasky (ID, popis, komplexita, model, závislosti) · DoD · Test loop · Review gate.** Task ID jsou plánovací (`Tn`); finální T-ID přiděluje orchestrátor v plan.md dané iterace. Test loop a review gate jsou vždy explicitní tasky T-TEST a T-REV.

---

## 2. Přehled: mapování milníků na iterace

| Iterace | Milník | Obsah (zkratka) | MVP |
|---|---|---|---|
| iter-004 | **M0a** | kostra repa, CI gate `tsc --checkJs`, engine core (clock, scheduler, tickOrder kostra, RNG, state, commands skeleton) | ✔ |
| iter-005 | **M0b** | PWA shell + SW precache, IndexedDB save minimal, benchmark ceny kroku, první PWA smoke → **M0 hotov** | ✔ |
| iter-006 | **M1** | extrakční pipeline, katalogy + schema validace, balance.js + formulas.js, registr efektů (kostra), **gap report + eskalace** | ✔ |
| iter-007 | **M2a** | resource vrstva (K5), persist schémata + migrace v1 (K11), systémy population/food/housing/health/crime, stuby world/battle + kontraktní testy | ✔ |
| iter-008 | **M2b** | offline catch-up MVP end-to-end, autosave triggery komplet, offline summary UI, export/import savu → **M2 hotov** | ✔ |
| iter-009 | **M3** | forest/field/mine, joby + workerEfficiency, skilly (2× kompenzace), area/used | ✔ |
| iter-010 | **M4a** | gold, daně, upkeep, účetnictví jako observer + měsíční reporty | ✔ |
| iter-011 | **M4b** | klientský trh (D9/K7), karavany, `getGoldValue` + `market.inject` kontrakt → **M4 hotov = MVP jádro** | ✔ **MVP hranice** |
| iter-012 | **M5** | building instances + opotřebení, projectQueue/builder, scaleCost, builder companies, kontrakty (contractQueue), modifikátory z budov | – |
| iter-013 | **M6** | tech strom (100×1.25^level), academy/university, techy jako modifikátory → K13 plně | – |
| iter-014 | **M7a** | AI svět: zóny + frakce + revolty + questy + tribute, jednotky + upkeep, napojení trhu na zóny | – |
| iter-015 | **M7b** | battle automat (§8.1) + battle UI, invaze/bandité, auto-resolve v catch-upu → **M7 hotov** | – |
| iter-016 | **M8** | story/importantEvent, intro/tutoriál, dialogy, achievementy (K18), notifikace/hudba/devlog | – |
| iter-017 | **M9a** | balanční kalibrace: trh proti hratelnostním cílům (S-03), balanční hodnota capu (R2b), balanc regression | – |
| iter-018 | **M9b** | mobile UX polish, závěrečný PWA audit (evikce, edge cases), licence/assety čistka (PROVENANCE) → **release kandidát** | – |

Pokrytí: **M0 → iter-004+005 · M1 → iter-006 · M2 → iter-007+008 (povolený split M2a/M2b dle §11/S-04) · M3 → iter-009 · M4 → iter-010+011 · M5 → iter-012 · M6 → iter-013 · M7 → iter-014+015 · M8 → iter-016 · M9 → iter-017+018.** Žádný milník bez iterace, žádná díra M0 → release.

### 2.1 MVP hranice
**MVP jádro = M0–M4 = iter-004 … iter-011** (§11 architektury). Po iter-011 jsou splnitelná acceptance criteria zadání: instalace na mobil, offline hraní, idle smyčka výdělek→nákup→pasivní příjem→offline progres, spolehlivý save vč. offline výpočtu. M5–M8 = věrnost plného rebuildu, M9 = ladění a release.

**MVP playtest checkpoint (rozhodnuto uživatelem, Q1/T-004):** po dokončení iter-011 se NEpokračuje rovnou na iter-012 – zařazuje se **povinný playtest checkpoint**: hratelný MVP se předá uživateli k hraní/vyhodnocení a uživatel smí **repriorizovat M5–M9** (pořadí milníků, případně přidat/odebrat rozsah) přes decision record. Teprve po tomto checkpointu orchestrátor zahájí iter-012 (nebo repriorizovanou variantu). Checkpoint je rozhodovací pauza, ne další implementační iterace.

### 2.2 Kritická cesta a závislosti iterací

```
iter-004 (M0a) ─→ iter-005 (M0b) ──┐
      │                            ├─→ iter-007 (M2a) → iter-008 (M2b) → iter-009 (M3)
      └─────────→ iter-006 (M1) ───┘                                          │
   (obě hrany do iter-007 jsou TVRDÉ závislosti:                              ▼
    M0b dává PWA/save, M1 katalogy – „M1 blokuje M2+")       iter-010 (M4a) → iter-011 (M4b) ══ MVP
                                                                              │
                                iter-012 (M5) → iter-013 (M6) → iter-014 (M7a) → iter-015 (M7b)
                                                                              │
                                                 iter-016 (M8) → iter-017 (M9a) → iter-018 (M9b) ══ RELEASE
```

- **Kritická cesta**: iter-004 → 005 → 006 → 007 → 008 → 009 → 010 → 011 → 012 → 013 → 014 → 015 → 016 → 017 → 018 (řetěz je v podstatě lineární – každá iterace staví na předchozí).
- **Jediný povolený paralelismus**: iter-006 (M1, čistě tooling + data) smí běžet souběžně s iter-005 (M0b, PWA/save) – obě závisí jen na iter-004. Nic jiného neparalelizovat: sdílený stav repa + lineární závislosti systémů.
- **Tvrdé závislosti uvnitř plánu** (z architektury): M1 blokuje M2+ (katalogy); trh (M4b) blokuje plné AI oceňování (M7a) – hlídá negativní test S-06; battle automat (M7b) potřebuje jednotky a zóny (M7a); kalibrace (M9a) potřebuje kompletní obsah (M8).
- **Re-planning checkpoint po iter-006**: obsahové milníky M2+ jsou *plán, ne závazek rozsahu*, dokud M1 gap report nepotvrdí úplnost dat (§13.1 architektury). Po gap reportu project-manager plán M2+ potvrdí nebo upraví (decision record při změně). **Jak se checkpoint promítne**: při materiální změně rozsahu (typicky díry v listTechs/listZone – riziko R-A) PM vydá decision record a iterace M6/M7 (iter-013–015) se re-scopují **před** jejich zahájením – ne za běhu. Kritická cesta MVP (iter-007 → iter-011) zůstává na gap reportu obsahu pozdních systémů **nezávislá**: staví na katalozích jádra (zdroje, budovy, joby, trh), takže se rozjíždí hned po iter-006 i při otevřených dírách v datech pozdních systémů.

---

## 3. Plány iterací

---

### iter-004 — M0a: Kostra repa & engine core
**Cíl**: stojí headless engine v čistých ES modulech – čas běží, scheduler tiká, RNG je deterministické, stav je jeden serializovatelný strom; CI typový gate funguje.
**Milník/K**: M0 (1/2) · K0, K3, K6, K9, K10, K16, K17
**Závisí na**: – (první implementační iterace)

| ID | Task | Kompl. | Návrh | Provedení | Závislosti |
|---|---|---|---|---|---|
| T1 | Struktura repa dle §3.1 (adresáře, `index.html` placeholder, pravidla závislostí vrstev) + CI gate: `tsc --noEmit --checkJs` (typescript jako jediná dev závislost) + grep gate na zakázané importy v core | M | Opus | Sonnet | – |
| T2 | State container (K0): jeden plain-data strom dle §3.2, `createInitialState()`, dev `Object.freeze` snapshot, `types.d.ts` základ | M | Opus | Sonnet | T1 |
| T3 | Clock + akumulátor (K3): fixed-timestep 0.05 s, speed Pause/1×/2×, frame budget, dávková smyčka dle §4.1 (zatím bez catch-up UI) | M | Opus | Sonnet | T2 |
| T4 | Scheduler (K6/K17): one-shot min-heap (serializovatelný, index `id → počet` místo countEvent) + periodika jako data + výpočet hran času (isNewDay/isNoon/…) | L | Opus | Sonnet | T3 |
| T5 | RNG streamy (K16/D4): mulberry32/xoshiro, pojmenované streamy per systém, stav v `state.rng`, determinism hash test | S | Opus (zkrácený) | Sonnet | T2 |
| T6 | tickOrder kostra (§4.3) jako deklarovaná data + calendar/seasons systém (den/měsíc/rok/sezóna 4×91 dní) + fail-fast fns registr (K10, §5.6) + commands skeleton (§3.3: dispatch, validace, `setSpeed` jako první command) | L | Opus | Sonnet | T4, T5 |
| T-TEST | Test loop (tester **Sonnet**): sada dle 1.3/iter-004 + jednotkové testy clock/scheduler/RNG hran (přechod dne, sezóny, roku) | M | – | Sonnet/Haiku | T1–T6 |
| T-REV | Review gate (reviewer **Opus**, právo re-run dle 1.4): DoD, hranice vrstev, živé artefakty (tickOrder + diagram zavedeny) | M | – | Opus | T-TEST |

**DoD iter-004**: core běží v Node bez DOM; čas/sezóny se posouvají; determinism hash test v CI; `tsc --checkJs` + grep gate zelené a povinné v CI (S-01/R-I); tickOrder a ASCII diagram existují jako živé artefakty v repu; reviewer GO.

---

### iter-005 — M0b: PWA shell, save minimal, benchmark → M0 hotov
**Cíl**: „prázdná" hra je instalovatelná PWA běžící offline; save/load funguje; cena kroku je změřená a technický strop capu potvrzen/eskalován.
**Milník/K**: M0 (2/2) · K1, K2 (SW část), K19 (ne-přenášení online částí)
**Závisí na**: iter-004

| ID | Task | Kompl. | Návrh | Provedení | Závislosti |
|---|---|---|---|---|---|
| T1 | PWA shell: `index.html` + `app/` bootstrap (rAF smyčka, visibilitychange/pagehide), vendorovaný preact+htm, minimální UI (čas, sezóna, pauza/1×/2× přes commands) | M | Opus | Sonnet | – |
| T2 | `manifest.webmanifest` + ručně psaný SW (cache-first, verzovaný precache) + `tools/` generátor precache manifestu (výstup commitnutý) | M | Opus | Sonnet | T1 |
| T3 | IndexedDB save minimal (K1): promise wrapper, stores `slots`/`saves`, 1 slot + rotující generace (N=3), `lastSimTimestamp`, load fallback na předchozí generaci | L | Opus | Sonnet | – |
| T4 | Benchmark ceny kroku (DoD M0, §14.1): prázdný tick + scheduler, měření na low-end mobilu (viz Q2/A2), report → potvrzení/eskalace technického stropu capu 8 h (S-02, D10a) a rozhodnutí D13 (main thread vs. Worker) | S | Opus (zkrácený) | Sonnet | iter-004 |
| T5 | `navigator.storage.persist()` při startu + chybová obrazovka loaderu (fail stav katalogů/savu dle §5.1) | S | Sonnet | Sonnet | T3 |
| T-TEST | Test loop (tester **Sonnet**): sada 1.3/iter-005 – save round-trip, **první PWA smoke** (install + offline start), determinismus po loadu | M | – | Sonnet/Haiku | T1–T5 |
| T-REV | Review gate (reviewer **Opus**, právo re-run): DoD M0 komplet dle §11 vč. benchmark výsledku; při nevyhovujícím benchmarku nařizuje eskalaci (Worker/cap), ne pokračování | M | – | Opus | T-TEST |

**DoD iter-005 (= DoD M0)**: hra instalovatelná a startuje offline; čas běží, sezóny se střídají, save/load/pauza/rychlosti fungují; benchmark změřen **před** potvrzením technického stropu capu; CI gate funkční; reviewer GO.

---

### iter-006 — M1: Katalogy & balanc data (extrakce + gap report)
**Cíl**: kompletní, validovaná, verzovaná data v `src/data/` + balance vrstva; explicitní gap report a eskalace děr uživateli.
**Milník/K**: M1 · K2, K4, K14, K15
**Závisí na**: iter-004 (smí běžet paralelně s iter-005)

| ID | Task | Kompl. | Návrh | Provedení | Závislosti |
|---|---|---|---|---|---|
| T1 | Extrakční pipeline `tools/extract/` (R3/D11): čte `rootscope-raw-dump.json` + `config-extract.json` + source map → generuje JSON katalogy; skripty i výstupy commitnuté | L | Opus | Sonnet | – |
| T2 | Katalogová schémata per typ (K15) + runtime validátor při loadu + string-ID registr s fail-fast kolizemi (K10) + `byId` index + validace `cost`/`products` map proti registru zdrojů (B4) | M | Opus | Sonnet | T1 |
| T3 | `balance.js` (pojmenované konstanty s jednotkami a odkazem na zdroj) + `formulas.js` (čisté vzorce: marketPrice, workerEfficiency, techCap, scaleCost, spoilage, natalita…) – první dávka dle §5.5 | M | Opus | Sonnet | T1 |
| T4 | Tabulkové testy vzorců s referenčními hodnotami z `original_source_doc.md` (houseTypes, companies, tech 100×1.25^level, upkeep…) + vědomé odchylky zapečené do dat s poznámkou (Skills 2×, market perioda V3, home.js:970 obě varianty) | M | Opus | Sonnet | T3 |
| T5 | Registr efektů obsahu – kostra (K14, §5.4): `onBuild`/`onUnlock`/event `options[].fn` jako string-ID s parametry v datech, typovaný modul per doména | S | Opus (zkrácený) | Sonnet | T2 |
| T6 | **Gap report** (DoD M1): která pole/položky nejsou doložitelné z dumpu/zdroje (zejm. listTechs/listZone) + eskalační dokument pro uživatele s volbou (a) dotěžit z runtime, (b) aproximace s `provenance: 'approximated'` | S | Opus (zkrácený) | Sonnet | T1, T2 |
| T-TEST | Test loop (tester **Sonnet**): sada 1.3/iter-006 – schema validace všech katalogů zelená, tabulkové testy vzorců, fail-fast na uměle rozbitém katalogu + PWA smoke (kumulativní sada 1.3) | M | – | Sonnet/Haiku | T1–T6 |
| T-REV | Review gate (reviewer **Opus**, právo re-run): úplnost extrakce vs. gap report, referenční čísla sedí, provenance flagy korektní | M | – | Opus | T-TEST |

**DoD iter-006 (= DoD M1)**: katalogy kompletní/validované nebo díry explicitně v gap reportu s eskalací uživateli; referenční čísla potvrzena testem; balance/formulas základ položen; reviewer GO. **Následuje re-planning checkpoint M2+ (viz 2.2).**

---

### iter-007 — M2a: Resource vrstva, persist schémata, první živé systémy
**Cíl**: osada žije – populace přichází, jí, umírá; transakce a persistence mají jedinou pravdu; sloty pro pozdní systémy existují.
**Milník/K**: M2 (1/2, split dle §11/S-04) · K5, K6, K11; stuby + kontraktní testy §8 (D12)
**Závisí na**: iter-005, iter-006

| ID | Task | Kompl. | Návrh | Provedení | Závislosti |
|---|---|---|---|---|---|
| T1 | Transakční vrstva (K5/D7, §7.1): `resourceHandlers[kind]`, generické `canAfford`/`pay`/`grant`, txEvent emise, invarianta ne-pod-nulu bez `allowDeficit` | L | Opus | Sonnet | – |
| T2 | Deklarativní persist schémata (K11, §6.3): allowlist per doména, generický save průchod, load = čistá konstrukce dle §6.4 (7 kroků), migrace v1 (očíslované kroky) | L | Opus | Sonnet | T1 |
| T3 | Systémy population + housing: migrační akumulátor (per step), births/retirement (noon), house tiery, settlementLevel (day) – dle tickOrder | M | Opus | Sonnet | T1 |
| T4 | Systémy food + health + crime: meal#1/#2, fair-share food handler + foodVariety, spoilage (month), disease, crime (noon) – dle tickOrder; balanc čísla rovnou do balance.js | L | Opus | Sonnet | T1, T3 |
| T5 | Stub-registrace world/battle v tickOrder a persist schématech (no-op fn) + kontraktní testy §8: determinismus prázdné bitvy, round-trip `state.battle/zones`, schedule s AI eventy přežívá save/load, **negativní test S-06** | M | Opus | Sonnet | T2 |
| T-TEST | Test loop (tester **Sonnet**): sada 1.3/iter-007 – poprvé **catch-up-safe invariant** pro všechny nové systémy, persist round-trip per doména, tx invarianty (žádné NaN/záporné zásoby) + PWA smoke (kumulativní sada 1.3) | M | – | Sonnet/Haiku | T1–T5 |
| T-REV | Review gate (reviewer **Opus**, právo re-run): persist schéma vzniklo se systémem (§14.3), tickOrder aktualizován ve stejných commitech, kontrakty §8 zavedeny | M | – | Opus | T-TEST |

**DoD iter-007 (= M2a)**: populace/jídlo/zdraví/krimi běží deterministicky live i v dávce; save round-trip všech nových domén; stuby + kontraktní testy existují; reviewer GO.
**Pozn. (split-trigger)**: iter-007 nese 3× L (T1, T2, T4) – pokud Opus návrhy ukážou, že transakční vrstva + persist + 4 systémy nesouzní do jedné iterace, orchestrátor smí split **M2a-1** (T1–T2 infrastruktura: transakce + persist) / **M2a-2** (T3–T5 systémy + stuby) – bez dopadu na architekturu, DoD M2a se vyhodnotí po M2a-2.

---

### iter-008 — M2b: Offline catch-up MVP, autosave → M2 hotov
**Cíl**: zavřu hru, vrátím se, osada mezitím žila – end-to-end offline progres splňující acceptance criteria zadání.
**Milník/K**: M2 (2/2) · K3-cap (D10), K1 (autosave komplet), K19 (export/import)
**Závisí na**: iter-007

| ID | Task | Kompl. | Návrh | Provedení | Závislosti |
|---|---|---|---|---|---|
| T1 | Catch-up smyčka end-to-end (§4.1 režim 3): load → `missedMs` z `lastSimTimestamp` → dávka (chunky ~25k kroků, yield na UI) → cap `min(technický, balanční)` → vědomě minimální: dohání jen systémy M2 (předpokládá **catch-up-safe invariant** zavedený a otestovaný v iter-007 T-TEST) | L | Opus | Sonnet | iter-007 |
| T2 | Přerušitelnost dávky interaktivními eventy (D10): `stopPending` přeruší dávku, zbytek akumulátoru zůstává, pokračování po odkliknutí | M | Opus | Sonnet | T1 |
| T3 | Offline summary UI (prostý textový výčet: produkce, události) + catch-up progress UI nad prahem | S | Sonnet | Sonnet | T1 |
| T4 | Autosave triggery komplet (§6.2): periodicky (herní den / 60–120 s), `visibilitychange→hidden`/`pagehide`, po významných událostech | M | Opus | Sonnet | – |
| T5 | Export/import savu jako string (K12/K19, §6.5): JSON → komprese → base64, UI pro copy/paste | S | Opus (zkrácený) | Sonnet | – |
| T-TEST | Test loop (tester **Sonnet**): sada 1.3/iter-008 – e2e catch-up scénáře (krátký výpadek / nad cap / event uprostřed dávky), determinismus catch-upu (stejný save + stejný čas → stejný výsledek, G1), export/import round-trip, PWA smoke | M | – | Sonnet/Haiku | T1–T5 |
| T-REV | Review gate (reviewer **Opus**, právo re-run): acceptance criterium „offline progres" reálně splněno na zařízení; catch-up MVP vědomě minimální = OK, ale invariant pro M3+ vyhlášen | M | – | Opus | T-TEST |

**DoD iter-008 (= DoD M2)**: osada žije offline – progres se dopočítá po návratu vč. capu a summary; autosave pokrývá mobilní „swipe away"; export/import funguje; reviewer GO.

---

### iter-009 — M3: Produkce, joby, skilly
**Cíl**: produkční smyčka – dřevo/jídlo/ruda, přiřazování pracovníků, efektivita, skilly.
**Milník/K**: M3 · K4, K6
**Závisí na**: iter-008

| ID | Task | Kompl. | Návrh | Provedení | Závislosti |
|---|---|---|---|---|---|
| T1 | Systémy forest/field/mine: stocky (trees/animals/ores/livestock/farmland) jako resource handlery, regenerace lesa (10 dní), mine/field periodika, area/used plocha | L | Opus | Sonnet | – |
| T2 | Joby + produkce (quarterDay): jobsProduction vč. builder slotu, autoAssignWorkers, accidents; `assignJob` command | M | Opus | Sonnet | T1 |
| T3 | workerEfficiency (day) jako čistá formula + napojení na produkci; balanc čísla do balance.js s odkazem na zdroj | M | Opus | Sonnet | T2 |
| T4 | Skilly: skillsProgress (per step, **2× kompenzace** `maxStep/2` dle K4), `startSkill` command, UI panel | M | Opus | Sonnet | – |
| T5 | UI obrazovky forest/field/mine/jobs (karty, listy, progress) nad selektory + commands | M | Opus | Sonnet | T1–T4 |
| T-TEST | Test loop (tester **Sonnet**): sada 1.3 – tabulkové testy produkce/efficiency proti referenčním hodnotám, catch-up-safe invariant nových systémů, save round-trip, PWA smoke | M | – | Sonnet/Haiku | T1–T5 |
| T-REV | Review gate (reviewer **Opus**, právo re-run): pořadí uvnitř dne ověřeno proti zdroji a zapsáno do tickOrder (závazek věrnosti §4.3) | M | – | Opus | T-TEST |

**DoD iter-009 (= DoD M3)**: produkční smyčka hratelná na mobilu; skilly progresují s kompenzací; vše catch-up-safe; reviewer GO.

---

### iter-010 — M4a: Gold, daně, upkeep, účetnictví
**Cíl**: peníze tečou – daně, upkeep a finanční reporty z transakčních událostí.
**Milník/K**: M4 (1/2) · K5 (observery), K4
**Závisí na**: iter-009

| ID | Task | Kompl. | Návrh | Provedení | Závislosti |
|---|---|---|---|---|---|
| T1 | Gold/techPt handlery + daně: localTaxes (5 dní), taxes (month), `setTaxRate` command, tax vzorce do formulas.js | M | Opus | Sonnet | – |
| T2 | Upkeep (month) + burnWood (day) + foodSpoilage napojení na ekonomiku | S | Opus (zkrácený) | Sonnet | T1 |
| T3 | Účetnictví jako observer (K5/§7.2): txEvent → měsíční finanční report, consumption/productionHistory; žádná inline mutace v platebních větvích | M | Opus | Sonnet | T1 |
| T4 | UI: finanční přehled/council panel (daně, reporty) | S | Sonnet | Sonnet | T3 |
| T-TEST | Test loop (tester **Sonnet**): sada 1.3 – účetní konzistence (suma txEventů = delta goldu), tabulkové testy daní/upkeep, catch-up-safe, round-trip, PWA smoke | M | – | Sonnet/Haiku | T1–T4 |
| T-REV | Review gate (reviewer **Opus**, právo re-run) | M | – | Opus | T-TEST |

**DoD iter-010 (= M4a)**: ekonomika gold/daně/upkeep funguje a je auditovatelná z událostí; reviewer GO.

---

### iter-011 — M4b: Trh & karavany → MVP jádro hotové
**Cíl**: dynamické ceny a obchod; tím je uzavřená idle smyčka výdělek→nákup→pasivní příjem→offline progres = **MVP**.
**Milník/K**: M4 (2/2) · K7 (D9/R1)
**Závisí na**: iter-010

| ID | Task | Kompl. | Návrh | Provedení | Závislosti |
|---|---|---|---|---|---|
| T1 | Klientský trh (D9, §9.1): `marketState[goodsId] = {available, max}`, cenová kubika 1:1, spread haggle 1.35/0.6, clamp `available ∈ [0, max]` (N-02), `buyGoods`/`sellGoods` commands | L | Opus | Sonnet | – |
| T2 | Denní mean-reversion drift (`k` v balance datech, default 0.2/den) na denním ticku (marketDailyDrift) | S | Opus (zkrácený) | Sonnet | T1 |
| T3 | `getGoldValue(koš)` jako jediné oceňovací API + `market.inject(goodsId, qty)` kontrakt (od teď smí být volán; negativní test S-06 se obrací na pozitivní kontrakt) | S | Opus (zkrácený) | Sonnet | T1 |
| T4 | Karavany: `sendCaravan` command, cesty/návraty přes schedule, zboží/ceny vůči marketState | M | Opus | Sonnet | T1, T3 |
| T5 | UI: market screen (ceny, nákup/prodej, haggle) + karavany | M | Opus | Sonnet | T1, T4 |
| T-TEST | Test loop (tester **Sonnet**): sada 1.3 – formulas testy ceny vč. clampu a mezí, arbitrážní sanity (okamžitý nákup→prodej není ziskový), drift chování, catch-up-safe, **plný MVP e2e scénář** (install → hraj → zavři → offline → vrať se → progres) | M | – | Sonnet/Haiku | T1–T5 |
| T-REV | Review gate (reviewer **Opus**, právo re-run): **MVP gate** – ověření všech acceptance criteria zadání; nesplnění = re-run, ne posun dál | M | – | Opus | T-TEST |

**DoD iter-011 (= DoD M4, MVP)**: acceptance criteria zadání splněna (instalace, offline, idle smyčka, spolehlivý save vč. offline výpočtu); `getGoldValue`/`market.inject` kontrakty živé; reviewer GO.

---

### iter-012 — M5: Budovy, stavba, kontrakty
**Cíl**: město roste – stavební fronta, firmy, opotřebení, kontraktové eventy; modifikátory z budov.
**Milník/K**: M5 · K13 (z budov), K14
**Závisí na**: iter-011

| ID | Task | Kompl. | Návrh | Provedení | Závislosti |
|---|---|---|---|---|---|
| T1 | Building instances: created/totalMade, opotřebení (ageBuildings, day) + opravy (oceňování přes getGoldValue), persist schéma | M | Opus | Sonnet | – |
| T2 | projectQueue + builder systém (quarterDay slot z M3) + `build(itemId)` command + `scaleCost` čistá funkce `cost(base, created)` | M | Opus | Sonnet | T1 |
| T3 | Builder companies (katalogová data + logika výběru/kapacit) | M | Opus | Sonnet | T2 |
| T4 | Vrstva modifikátorů plně pro budovy (K13, §5.3): `effective(itemId, attr)`, fold add→mul→set, memoizace + event-driven agregáty (maxWorkers, kapacity, attractiveness), save = jen seznam modifikátorů | L | Opus | Sonnet | T1 |
| T5 | Kontrakty: contractQueue, onComplete/onExpire/onReject přes registr efektů (K14), kontraktové eventy přes schedule | M | Opus | Sonnet | T2 |
| T6 | UI: build screen (karty budov, ceny se scalingem, fronta), kontrakty panel | M | Opus | Sonnet | T2–T5 |
| T-TEST | Test loop (tester **Sonnet**): sada 1.3 – scaleCost/effective tabulkové testy, modifikátory round-trip (save jen modifikátory → load → přepočet), catch-up-safe, PWA smoke | M | – | Sonnet/Haiku | T1–T6 |
| T-REV | Review gate (reviewer **Opus**, právo re-run): žádné `applyUpgrade` mutace in-place; derivovaná data se neukládají | M | – | Opus | T-TEST |

**DoD iter-012 (= DoD M5)**: město roste, stavby mají scaling a opotřebení, kontrakty běží, modifikátory čistě; reviewer GO.
**Pozn. (split-trigger)**: pokud Opus návrhy ukážou, že T4 (modifikátory) + T5 (kontrakty) nesouzní do jedné iterace, orchestrátor smí split **M5-1** (T1–T4) / **M5-2** (T5–T6) – bez dopadu na architekturu. *(Názvosloví splitů jednotně `<milník>-1/<milník>-2`; písmenné sufixy a/b zůstávají vyhrazeny pro milníkové splity přes hranici iterací – M2a/M2b, M7a/M7b.)*

---

### iter-013 — M6: Výzkum & dovednosti (dlouhodobá progrese)
**Cíl**: tech strom pohání dlouhodobou progresi; techy jsou modifikátory → K13 uzavřeno plně.
**Milník/K**: M6 · K13 (plně), K4
**Závisí na**: iter-012 (vrstva modifikátorů)

| ID | Task | Kompl. | Návrh | Provedení | Závislosti |
|---|---|---|---|---|---|
| T1 | Tech strom: sektory, cena `100×1.25^level` (formulas), unlockedTechs ve stavu, `buyTech` command | M | Opus | Sonnet | – |
| T2 | Techy jako modifikátory (K13 plně): tech efekty výhradně přes modifier vrstvu + registr efektů; re-aplikace po loadu = fold | M | Opus | Sonnet | T1 |
| T3 | Academy/university systém (research progres, techPt produkce) + napojení na joby/efficiency | M | Opus | Sonnet | T1 |
| T4 | UI: academy/tech strom screen | M | Opus | Sonnet | T1–T3 |
| T-TEST | Test loop (tester **Sonnet**): sada 1.3 – techCap tabulkové testy, tech→modifier→effective řetěz, save round-trip unlocked techů, catch-up-safe, PWA smoke | M | – | Sonnet/Haiku | T1–T4 |
| T-REV | Review gate (reviewer **Opus**, právo re-run) | M | – | Opus | T-TEST |

**DoD iter-013 (= DoD M6)**: dlouhodobá progrese funkční; K13 zcela naplněno; reviewer GO.

---

### iter-014 — M7a: AI svět, jednotky
**Cíl**: svět ožívá – zóny, frakce, revolty, questy, tribute; vojsko existuje a stojí upkeep; trh dostává injekce ze zón.
**Milník/K**: M7 (1/2) · R4/D12 (naplnění slotů world), K8 částečně
**Závisí na**: iter-013 (a kontrakt trhu z iter-011)

| ID | Task | Kompl. | Návrh | Provedení | Závislosti |
|---|---|---|---|---|---|
| T1 | Zone tick (§8.2): `processZone(state, zoneId, rng('world'))`, round-robin přes 5denní periodu, ekonomika/politika zóny vzorci z balance dat (goldDemand 150×units, production 50×workers, favour) | L | Opus | Sonnet | – |
| T2 | Frakční AI: stavový automat AISTATES 0–7 jako data + přechodová funkce, plánování přes schedule (string-ID + index K17), aktivační prahy z balance dat | L | Opus | Sonnet | T1 |
| T3 | Revolty + questy + tribute (oceňování přes getGoldValue) + AI–AI bitvy RNG resolve vzorcem | M | Opus | Sonnet | T2 |
| T4 | Jednotky: warriors/archers, rekrutace, upkeep (army.warriorUpkeep 108…), persist schéma | M | Opus | Sonnet | – |
| T5 | Napojení trhu na zóny: produkční zóny `market.inject`, válčící odčerpávají (kontrakt z M4b se plní) | S | Opus (zkrácený) | Sonnet | T1, T4 |
| T6 | UI: world/zones screen (mapa zón, frakce, diplomacie/policy) | M | Opus | Sonnet | T1–T3 |
| T-TEST | Test loop (tester **Sonnet**): sada 1.3 – determinismus world streamu, zone round-robin přežívá save/load, AI automat replay test, catch-up-safe (AI svět běží v dávce), PWA smoke | M | – | Sonnet/Haiku | T1–T6 |
| T-REV | Review gate (reviewer **Opus**, právo re-run): kontrakty §8.2 naplněny beze změny signatur (změna = decision record) | M | – | Opus | T-TEST |

**DoD iter-014 (= M7a)**: AI svět tiká deterministicky, jednotky existují, trh dostává zónové injekce; reviewer GO.
**Pozn. (split-trigger)**: T1 (zone tick) a T2 (frakční AI automat) jsou dva nezávislé L celky – pokud Opus návrhy ukážou, že nesouzní do jedné iterace, orchestrátor smí split **M7a-1** (T1, T4, T5: zóny + jednotky + napojení trhu) / **M7a-2** (T2, T3, T6: frakční AI + revolty/questy/tribute + UI) – bez dopadu na architekturu, DoD M7a se vyhodnotí po M7a-2.

---

### iter-015 — M7b: Bitvy → M7 hotov
**Cíl**: bitevní automat dle §8.1 – live s commandy hráče, auto-resolve v catch-upu, korektní resume po killu.
**Milník/K**: M7 (2/2) · K8/D8, G2
**Závisí na**: iter-014

| ID | Task | Kompl. | Návrh | Provedení | Závislosti |
|---|---|---|---|---|---|
| T1 | Battle automat (§8.1): `battleState` + `battleStep(state, commands, rng('battle'))`, sub-step 30 ms z hlavního akumulátoru, cooldowny v ticích 1:1 (charge 80, volley 120…), serializovatelný v `state.battle` | L | Opus | Sonnet | – |
| T2 | Damage/revival vzorce do formulas.js + tabulkové testy proti originálu (battleDamage, crit) | M | Opus | Sonnet | T1 |
| T3 | `battleCommand` commands + obranná AI politika (skriptované akce dle cooldownů) = auto-resolve v catch-upu bez druhé implementace (G2) | M | Opus | Sonnet | T1 |
| T4 | Invaze + bandité: spouštění přes schedule/frakční automat, výsledky do offline summary | M | Opus | Sonnet | T3, iter-014 T2 |
| T5 | Battle UI (commands, progress, log) + playtest „feel" checklist (R-D) | M | Opus | Sonnet | T1, T3 |
| T-TEST | Test loop (tester **Sonnet**): sada 1.3 – determinismus bitvy (replay), kill-resume uprostřed bitvy, auto-resolve v catch-up dávce = stejný automat, tabulkové damage testy, PWA smoke | M | – | Sonnet/Haiku | T1–T5 |
| T-REV | Review gate (reviewer **Opus**, právo re-run): kontrakt §8.1 dodržen; battle feel playtest poznámky pro M9 | M | – | Opus | T-TEST |

**DoD iter-015 (= DoD M7)**: pozdní hra funguje – invaze, bitvy live i offline auto-resolve; stuby z M2a plně nahrazeny; reviewer GO.

---

### iter-016 — M8: Příběh & meta vrstva
**Cíl**: kompletní obsahová vrstva – story, tutoriál, dialogy, achievementy, notifikace.
**Milník/K**: M8 · K18, K14
**Závisí na**: iter-015

| ID | Task | Kompl. | Návrh | Provedení | Závislosti |
|---|---|---|---|---|---|
| T1 | importantEvent systém + story progres ve stavu (`story.*`), engine-stopping eventy jako doménová událost + `acknowledgeEvent` (§3.4); interakce s catch-up pauzou (D10) | M | Opus | Sonnet | – |
| T2 | Intro/tutoriál + dialogy (obsah jako data přes registr efektů K14; texty vlastní – pozor R-G) | M | Opus | Sonnet | T1 |
| T3 | Achievementy deklarativně (K18, §7.2): `{id, when: predicate-as-data}`, vyhodnocení na denním ticku + tx/doménových událostech; unlock mechanismus pro mapy/mechaniky | M | Opus | Sonnet | – |
| T4 | Notifikace/confetti/hudba/devlog: efemérní UI event bus (engine nikdy nesahá na DOM), gamelog ring buffer UI | S | Sonnet | Sonnet | T1 |
| T-TEST | Test loop (tester **Sonnet**): sada 1.3 – story event uprostřed catch-upu (pauza → pokračování), achievementy deterministické a save round-trip, tutoriál e2e, PWA smoke | M | – | Sonnet/Haiku | T1–T4 |
| T-REV | Review gate (reviewer **Opus**, právo re-run): žádné imperativní achievement háčky rozseté po mechanikách (C4); texty bez 1:1 převzetí (R-G evidence) | M | – | Opus | T-TEST |

**DoD iter-016 (= DoD M8)**: obsahová vrstva kompletní; hra má začátek, vedení hráče i meta-progres; reviewer GO.

---

### iter-017 — M9a: Balanční kalibrace
**Cíl**: hra je vyladěná proti definovaným hratelnostním cílům – trh, offline cap, celkový balanc.
**Milník/K**: M9 (1/2) · K4; uzavírá R1 (S-03) a R2b
**Závisí na**: iter-016

| ID | Task | Kompl. | Návrh | Provedení | Závislosti |
|---|---|---|---|---|---|
| T1 | Definice hratelnostních cílů trhu (S-03, §9.1): finalizace cílů typu „návrat k baseline do N dní", „arbitráž neziskovou", „drift nevyhladí hráčův dopad za den" → měřitelné testy | M | Opus | Sonnet | – |
| T2 | Kalibrace trhu: ladění `k` driftu a baseline proti cílům z T1; simulační harness (headless běhy se seedy) | M | Opus | Sonnet | T1 |
| T3 | Balanční hodnota capu `offline.capRealHours` (R2b/D10): UX/balanc rozhodnutí, návrh hodnoty + zdůvodnění → **eskalace uživateli k potvrzení** | S | Opus (zkrácený) | Sonnet | – |
| T4 | Balanc regression: dlouhé simulační běhy (rok+ herního času), porovnání křivek (populace, gold, jídlo) s referenčním očekáváním; rozhodnutí vědomých odchylek (home.js:970 – faktická vs. zamýšlená varianta) | L | Opus | Sonnet | T2 |
| T-TEST | Test loop (tester **Sonnet**): sada 1.3 – cílové metriky z T1 jako automatizované testy, determinismus dlouhých běhů, žádná regrese dřívějších tabulkových testů, PWA smoke | M | – | Sonnet/Haiku | T1–T4 |
| T-REV | Review gate (reviewer **Opus**, právo re-run): DoD M9-kalibrace formulován proti hratelnostním cílům (ne proti neexistující serverové referenci); odchylky zdokumentované v datech | M | – | Opus | T-TEST |

**DoD iter-017 (= M9a)**: trh a cap kalibrovány proti explicitním cílům; balanc regression zelená; vědomé odchylky rozhodnuty a zapsány; reviewer GO.
**Pozn. (T4, L)**: dlouhé simulační běhy (rok+ herního času) mohou narazit na časové limity test loopu – Opus návrh T4 (povinná dekompozice L dle §1.2) musí běhy rozdělit na seedované segmenty / checkpointované úseky tak, aby jednotlivý testovací běh zůstal pod limitem prostředí.

---

### iter-018 — M9b: Release kandidát
**Cíl**: mobilní UX polish, finální PWA audit a licenční čistka → release.
**Milník/K**: M9 (2/2) · uzavírá R-F, R-G
**Závisí na**: iter-017

| ID | Task | Kompl. | Návrh | Provedení | Závislosti |
|---|---|---|---|---|---|
| T1 | Mobile UX polish: dotykové cíle, layout obrazovek, výkon renderu (≤10–15 re-renderů/s), iOS Safari specifika | M | Opus | Sonnet | – |
| T2 | Závěrečný PWA audit: evikce storage (R-F – výzva k exportu po dlouhé době), update flow SW, offline edge cases, install na iOS/Android | M | Opus | Sonnet | T1 |
| T3 | Licence/assety čistka (R-G, PROVENANCE): vlastní assety/jména/texty, evidence → **rozhodnutí uživatele před veřejným vydáním** | M | Opus | Sonnet | – |
| T4 | Release dokumentace: README hry, known issues, export/import návod | S | Sonnet | Sonnet | T1–T3 |
| T-TEST | Test loop (tester **Sonnet**): plná kumulativní sada 1.3 + kompletní e2e release scénář na cílových zařízeních (install → plná smyčka → offline → save/restore → bitva → story) | L | – | Sonnet/Haiku | T1–T4 |
| T-REV | Review gate (reviewer **Opus**, právo re-run): **release gate** – done-criteria projektu, acceptance criteria zadání, otevřené nálezy = re-run; GO = release kandidát | M | – | Opus | T-TEST |

**DoD iter-018 (= DoD M9, release)**: done-criteria projektu splněna, PWA audit čistý, licenční otázka rozhodnuta uživatelem; reviewer GO → release.

---

## 4. Předpoklady a poznámky k rizikům plánu

1. **A1 – Rozsah M2+ podmíněn M1**: gap report (iter-006) může změnit rozsah iter-007+; plán platí s checkpointem 2.2. Při dírách v techs/zones se posouvá obsah M6/M7, ne architektura.
2. **A2 – Benchmark „na low-end mobilu"** (DoD M0): předpokládám, že v agentickém prostředí se měří syntetickým benchmarkem v Node + na dostupném prohlížeči, a reálné zařízení potvrdí uživatel; benchmark report to musí explicitně uvést (viz Q2).
3. **A3 – Délka iterace**: iterace jsou řezané na ~4–6 implementačních tasků + test + review, aby je workflow zvládl v jednom průchodu; orchestrátor smí iteraci dál dělit (explicitní split-triggery: M2a-1/M2a-2 v iter-007, M5-1/M5-2 v iter-012, M7a-1/M7a-2 v iter-014), nikdy slučovat přes hranici milníku bez decision recordu.
4. **A4 – Rizika architektury** (§12) mapována do plánu: R-A → iter-006 T6; R-B → iter-005 T4; R-C → iter-017 T1–T2; R-D → iter-015 T5; R-E → iter-007 T5 + iter-014/015; R-F → iter-018 T2; R-G → iter-016 T2 + iter-018 T3; R-H → tabulkové testy průběžně; R-I → iter-004 T1 + každý review gate; R-J → měření velikosti savu od iter-007 (tester).
5. **Žádný rozpor s D1–D13/R1–R4 nenalezen** – plán architekturu pouze sekvencuje.

## 5. Otázky na uživatele — ZODPOVĚZENO (T-004, schválení uživatelem 2026-06-13)

1. **Q1 → ROZHODNUTO: MVP playtest checkpoint.** Po iter-011 (MVP jádro) se zařadí **povinný playtest checkpoint s možností repriorizace M5–M9** PŘED zahájením iter-012 (viz §2.1, §2.2). iter-011 T-REV (MVP gate) je tedy i rozhodovací bod uživatele o pořadí/rozsahu pozdních milníků.
2. **Q2 → ROZHODNUTO: syntetická náhrada.** Benchmark M0 a PWA smoke se měří synteticky (Node + dostupný prohlížeč); reálné zařízení potvrdí uživatel později. Benchmark report (iter-005 DoD) to uvede explicitně (A2).
3. **Q3 → ROZHODNUTO: PM/orchestrátor autonomně.** Eskalaci gap reportu (iter-006 T6) řeší workflow autonomně dle pravidla: chybějící data → `provenance: 'approximated'` a pokračuje se; uživatel je jen informován (ne blocker). Decision record při materiální díře.

> Záznam: `orchestration/decisions/DR-001_iter-003-plan-approval.md`.

---

*Konec plánu. Navazuje na architekturu iter-002 (D1–D13, K0–K19, M0–M9); kde plán cituje §/K/D/R/S/N položky, zdrojem pravdy je architecture_proposal_iter-002_T-001.md.*
