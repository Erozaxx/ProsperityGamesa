# Human Gate — M5-2 design (Kontrakty + Build UI), iter-014 T-003

- **Brief**: BRIEF-014-003 (human gate před implementací M5-2)
- **Posuzuje**: tom-proxy (proxy za Toma)
- **Datum**: 2026-06-14
- **Vstupy**: design_iter-014_T-001.md (po revizi T-002a, §14 závazná), DR-014-01, DR-013-00/01, zadani_projektu.md, done-criteria.md
- **Mandát**: DR-013-00 (delegace human-in-the-loop gatů na tom-proxy v rámci autonomního doběhu M5–M9); gap-politika Q3/DR-001 (informativní gapy ne-blocker).

---

## VERDIKT: SCHVÁLENO s výhradou

Proceed na implementaci M5-2 (T5 kontrakty + T6 build UI). Výhrada je jediná, ne-blokující sledovací poznámka (viz níže rozhodnutí 4 + DoD M5). Žádné rozhodnutí není nevratné, scope-měnící ani mimo mandát → rozhodnuto v mandátu, bez eskalace na skutečného Toma.

---

## Stanoviska ke 4 produktovým rozhodnutím

### 1. Contract data doložitelná (events.js, 8 typů); M5-2 dělá min. hratelnou sadu (dodávkové kontrakty), zbytek na M6/M7; G-CONTRACTS-CATALOG informativní, kalibrace M9 — **OK**

Plně v souladu s MVP-first i s "věrným rebuildem". Klíčové: mechanika i lifecycle kontraktu jsou **doložitelné z originálu** (events.js insertContract, home.js, config.js completion vzorec pay+grant), katalog `contracts.json` je **přepis**, ne vymyšlený obsah — to je přesně to, na čem Tomovi záleží (věrnost). Zúžení na min. sadu (goodsSeller supply, volitelně goodsBuyer demand) je legitimní, protože zbylé typy (marbleSeller / mercenaryForHire / mineBuilder / houseBuilder / ximniTrader) reálně závisí na M6/M7 systémech, které M5-2 nemá — dodat je teď by znamenalo buď vymýšlet, nebo stubovat mrtvý obsah. Briefem požadovaný "dodávkový kontrakt → odměna, oceňování getGoldValue" je pokryt. **Přímý precedens: G-LISTBUILDINGS (iter-013 T-003), který jsem schválil za identické logiky** (min. doložitelná sada teď, zbytek s pozdějšími milníky, kalibrace M9). Konzistentní rozhodnutí.

### 2. B1 — registerBuild dark code z M5-1 (build nebyl wired do bootstrapEngine), M5-2 to opravuje — **OK**

Zacelit teď je jednoznačně správně. M5-1 build command existoval, ale nebyl registrovaný v `bootstrapEngine` → `send('build')` = unknown command → bez opravy by nově dodané build UI nefungovalo (tlačítko "Postavit" nic nedělá). Oprava je čistá a nízkoriziková: přidává nové command-ID (žádná kolize), `bootstrapEngine` běží fresh i po loadu → build dostupný v obou cestách. Z pohledu hratelnosti to teprve **zpřístupňuje stavbu hráči** — bez toho by M5 nebylo reálně hratelné. Latentní díra z M5-1 se uzavírá ve chvíli, kdy ji UI poprvé skutečně potřebuje; není to scope-creep, je to dokončení M5. Reviewer (T-002) i architekt (T-002a §14.1) mají přesná místa + AC.

### 3. Build UI (budovy / fronta / opravy / firmy + kontrakty panel) dokončuje M5 — **OK**

Tohle je vlastní hodnota iterace pro hráče: budovy se staví z appky, fronta projektů a oprav je vidět, builder kapacita i stavební firmy jsou ovladatelné, kontrakty se přijímají/plní/odmítají. Design drží správnou hranici — **UI jen selektory (read) + commands (write), žádná herní logika v UI** (§7, M52-D7), v souladu s architekturou (§3.4). DoD M5 (build screen) se tím legitimně naplňuje až teď, jak bylo plánováno při splitu (DR-013-01). Plynulé a v rámci scope.

### 4. G-BUILD-TXAUDIT zůstává (stavební/contract výdaje bez tx audit eventu, ctx se commandu nepředává), odloženo na M9 — **OK s poznámkou**

Přijatelné odložit. **Funkčně je to korektní**: gold/zboží/techPt se přes pay/grant mění správně (transactions.js), chybí pouze emitTx audit event → výdaj se neobjeví v měsíčním reportu. Hru to nerozbíjí, jen audit/report je neúplný. Plné dořešení by vyžadovalo změnu signatury command vrstvy (`handler(state,params,ctx)`) = zásah do architektury iter-002, což je mimo scope M5-2. Stejnou třídu gapu jsem už akceptoval u M5-1 (iter-013 T-003, rozhodnutí 3) — kontrakty ji jen dědí, ne zhoršují.

**Poznámka (výhrada k verdiktu, ne-blokující):** G-BUILD-TXAUDIT se odkládá podruhé. Pro Toma je report/účetnictví součást "věrného rebuildu" (originál výdaje sleduje), takže nesmí tiše zapadnout. **Podmínka:** G-BUILD-TXAUDIT musí být explicitně veden jako otevřený gap a **adresován nejpozději v M9 (balanční kalibrace)** spolu s ctx-předáním do command vrstvy; pokud by se M9 odsouvalo, eskalovat na orchestrátora, ať nezůstane viset do konce projektu. Toto je sledovací podmínka, ne blocker implementace M5-2.

---

## Klasifikace a předpoklady

- **Rozhodnuto v mandátu** (DR-013-00): všechna 4 rozhodnutí jsou vratná, v rámci schváleného scope (M5 budovy/stavba/kontrakty), bez dopadu na rozpočet/MVP-rozsah/bezpečnost. Žádná eskalace na skutečného Toma.
- Technický review je hotový (reviewer T-002 GO-s-podmínkami; architekt zapracoval B1/B2/M1 v revizi T-002a) — technické detaily (re-arm guard, SAVE_VERSION, determinismus, round-trip) neposuzuji, dle briefu jsou vyřešené.
- Gap-politika Q3/DR-001: informativní gapy (G-CONTRACTS-CATALOG, G-CONTRACT-GEN, G-BUILD-CANCEL, G-CONTRACT-SCHED-CLEANUP) jsou ne-blocker; G-BUILD-TXAUDIT je vědomý odklad s podmínkou výše.

## Follow-up

1. Coder může zahájit implementaci M5-2 (T5 §2–§6 + T6 §7) z designu bez dalšího produktového rozhodnutí.
2. DoD M5 se vyhodnotí po dokončení M5-2 (DR-013-01).
3. Otevřený gap G-BUILD-TXAUDIT → ledger pro M9 (viz výhrada u rozhodnutí 4).
