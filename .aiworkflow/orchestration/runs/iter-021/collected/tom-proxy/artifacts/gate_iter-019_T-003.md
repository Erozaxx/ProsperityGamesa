# Human Gate — M8 design (iter-019 T-003)

- **Gate ID**: GATE-019-003
- **Iteration**: iter-019 (M8 — Příběh & meta vrstva; poslední obsahová vrstva před M9 release)
- **Brief**: BRIEF-019-003
- **From**: tom-proxy (human proxy — jménem Toma)
- **To**: Orchestrator
- **Date**: 2026-06-15
- **Mandát**: DR-013-00 (delegace human-in-the-loop gatů na tom-proxy v autonomním doběhu M5–M9; vč. licence)

---

## VERDIKT: **SCHVÁLENO** (proceed na implementaci M8)

Design M8 (DESIGN-019-001) se schvaluje jménem Toma. Technický review proběhl (reviewer T-002, GO bez podmínek; impl poznámky MAJ-1/MIN-2/MIN-4 carry do coder briefů přes DR-019-01). Posuzována jen **produktová rozhodnutí** — všechna v rámci schváleného scope a known preferences (věrný hratelný rebuild, MVP-first). Žádné rozhodnutí není nevratné ani mimo mandát → bez eskalace na skutečného uživatele.

---

## Stanovisko ke 4 produktovým rozhodnutím

### 1. M8 = poslední obsahová vrstva (intro/tutoriál, story/importantEvent+ack, achievementy, notifikace/gamelog) — **OK**
Uzavření obsahové vrstvy je správný milník. M8 dává hře začátek (intro řetězec, `gameStart` trigger), vedení hráče (tutoriály + story eventy na milnících) a meta-progres (achievementy + unlock) — přesně DoD M8 (master plán §3/iter-016, design §13). Je to naplnění **existujících slotů** (`state.story`/`state.achievements`/`state.log` + engine-stopping break už v repu od M2), ne nová infrastruktura → nízké riziko, MVP-first. SPLIT=NE je dobře zdůvodněn (žádný L task, T1/T3 nezávislé a oba M, T2/T4 tenké nástavby; precedens M5-2/M7a-2/M7b). Po M8 zbývá jen M9 kalibrace+release — souhlas, že tím se obsahová vrstva uzavírá.

### 2. R-G licence — VLASTNÍ/parafráze texty (provenance:'original-paraphrased') — **OK** (klíčové rozhodnutí)
**Přijatelné dodat vlastní texty místo originálních.** Toto je přímo v souladu se zadáním projektu: Scope OUT explicitně vylučuje „Převzetí původních grafik / chráněného obsahu 1:1 (viz PROVENANCE — řešit licenci / vlastní assety)" a Omezení uvádí „Licence / autorství originálu (assety, jména, příběh) — viz PROVENANCE". Design §9 tento postup naplňuje: originál slouží jen jako struktura/triggery/IDs + číselná data (army prahy 100/500/5000, 1M gold = faktická data hry, jako balance čísla K4), texty jsou vlastní/parafráze s `_meta.provenance` per katalog. Reviewer (T-REV) ověří, že texty nejsou 1:1 kopie — správný gate.

**Rozsah tohoto schválení:** schvaluji **přístup k textům pro M8** (vlastní/parafráze + provenance evidence). Tím se NEpredjímá finální plné licenční rozhodnutí před VEŘEJNÝM vydáním — to je explicitně až M9b/iter-021 T3. Pro M8 (interní obsahová vrstva, žádné veřejné vydání) je rozhodnutí **vratné** (texty jsou data, lze je kdykoli přepsat) a v rámci mandátu (DR-013-00 deleguje i licenci) → **neeskaluji**. Finální licence M9b zůstává otevřená a bude posouzena samostatně.

### 3. Achievementy deklarativně — predikáty-jako-data, jeden centrální evaluator (C4 fix) — **OK**
Deklarativní `when` predikáty + jeden evaluator (`achievementsEval` na denním ticku, sdílený `evalPredicate` se story triggery) místo imperativních háčků rozsetých po mechanikách je čistší a zároveň **věrnější duchu originálu** — originál byl C4-vadný (unlock check chyběl/by byl rozsetý). Grep gate (§6.6: přiřazení `unlocked[` jen v `unlockAchievement`) dává reviewerovi tvrdou kontrolu proti C4 regresi. Determinismus zachován (čistá fce dat→bool, žádný RNG/Date.now/DOM, idempotence přes `unlocked[id]`). Souhlas s čistším věrným přístupem.

### 4. UI event bus efemérní — notifikace/confetti/hudba mimo deterministický stav — **OK**
Engine emituje plain-data události do efemérní fronty (`ctx.emitEvent?.`) mimo `state`/`hashState`; UI je konzumuje v render cyklu (DOM/Audio jen v `app/`+`ui/`). Engine nikdy nesahá na DOM (řeší C1 vadu originálu — orig `musicPlayer.initialize()` v `$rootScope`). Kritické pro determinismus: bus je mimo hashState → stejný seed = stejný hash bez ohledu na notifikace; catch-up agreguje do offline summary místo spam toastů (MAJ-1 carry do coder briefu zajistí přesun autosave/offline summary ZA re-vstup smyčku). Gamelog zůstává deterministický v `state.log` ring bufferu (persist). Správné oddělení prezentace od stavu — OK.

---

## Klasifikace
- **Rozhodnuto v mandátu** (DR-013-00). Žádná eskalace na skutečného uživatele.
- Žádné rozhodnutí není nevratné: texty = data (přepisovatelné), determinismus a scope chráněny technickým reviewem + grep gaty.
- Plná licenční otázka před veřejným vydáním zůstává odložena na M9b/iter-021 — zde nepredjímána.

## Předpoklady
- Mandát DR-013-00 (delegace human gatů vč. licence na tom-proxy v autonomním doběhu M5–M9).
- Technický review hotový (reviewer T-002 GO bez podmínek; DR-019-01 impl poznámky MAJ-1/MIN-2/MIN-4 carry do coder briefů).
- Precedens gatů iter-013 / 014 / 015 / 016 / 017 / 018 T-003 (všechny SCHVÁLENO).

## Doporučený follow-up
- Coder dodrží MVP sadu eventů (~10–14, design §3.2) — kalibrace obsahu je M9, ne M8.
- T-REV (reviewer) provede R-G porovnání textů proti originálu + ověří `_meta.provenance` u všech nových katalogů (story.json/dialogues.json/tutorials.json/achievements.json).
- Carry DR-019-01 (MAJ-1 catch-up re-vstup smyčka + přesun autosave/offline summary; MIN-2 effects stuby na reálnou mutaci; MIN-4 path-getter bez env větve) do coder briefů.
- M9b/iter-021: finální licenční rozhodnutí před veřejným vydáním (mimo tento gate).

## Blockery
–
