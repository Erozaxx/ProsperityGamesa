# Human Gate (tom-proxy) — M5-1 design, iter-013 T-003

- **Gate ID**: GATE-013-003
- **Iterace**: iter-013 (M5-1 — Budovy & modifikátory)
- **Zastupuji**: uživatele Toma (proxy, mandát DR-013-00 — autonomní doběh + delegace human gatů)
- **Vstupy**: design `design_iter-013_T-001.md` (po revizi T-002a), DR-013-00, DR-013-01, `zadani_projektu.md`, `project/done-criteria.md`
- **Povaha**: produktový gate (NE technický review — ten proběhl: reviewer GO-s-podmínkami T-002, architekt podmínky zapracoval T-002a)
- **Datum**: 2026-06-14

---

## VERDIKT: SCHVÁLENO

Implementace M5-1 (T1–T4) může pokračovat. Žádná z výhrad není blokující; dvě poznámky níže patří do gap-reportu/M9, ne do M5-1.

**Zdůvodnění (jak by to viděl Tom):** Všechna čtyři rozhodnutí ctí jádro zadání — *věrný, hratelný rebuild* (`zadani_projektu.md` §Cíle: „věrně replikovat mechaniky a balanc") s kalibrací/polish plánovanými na M9. Žádné z rozhodnutí nemění scope projektu, není nevratné a žádné neodporuje acceptance criteria. Naopak: scaleCost default=1.0 a TXAUDIT-gap volí explicitně **věrnost a stabilitu architektury** nad spekulativní herní progresí / účetním pohodlím, což je přesně Tomova preference (věrný rebuild > předčasná feature). Vše je laditelné/dořešitelné později bez přepisu. Mandát na rozhodnutí mám z DR-013-00 (delegace human gatů na tom-proxy); nic zde nespadá pod ask-first triggery (nevratné / scope / chybějící precedens) — precedens gap-politiky je Q3/DR-001.

---

## Stanoviska ke 4 rozhodnutím

### 1. scaleCost aproximace (default factor=1.0, gap G-BUILD-COSTSCALE) — **OK**
Originál budovy NEškáluje cenu podle počtu (architekt to doložil: buildingcard.js:88 fixní cost). Default `costScaleFactor=1.0` = **přesně věrné originálu** = žádný per-count růst. To je správná volba: věrnost má přednost před přidanou herní progresí. Per-count scaling je vědomá designová addice připravená jako vypínatelná balance konstanta — balancér ji v M9 může zvednout (např. 1.15) bez zásahu do kódu. `provenance:'approximated'` + gap + tabulkový test pokrývají budoucí kalibraci. Nic neblokuje hratelnost.

### 2. G-LISTBUILDINGS — doplnit ≥6 budov `provenance:'approximated'` — **OK**
Plný `listBuildings` originál fetchoval za runtime a není v dumpu — to je reálná díra v datech, ne volba. Postup přesně dle Q3/DR-001 (chybějící data → aproximovat autonomně, uživatel informován, ne blocker, DR jen při materiální balanční díře). Min. sada ≥6 budov je zvolena tak, aby pokryla **mechaniky** M5-1 (opotřebení, agregáty, storage, attractiveness, maxWorkers) — tedy přesně to, co je potřeba pro hratelnost a testy. Čísla (resistance/maxProgress/builders) jsou kalibrace = M9. Souhlasím s autonomním postupem; eskalace je jen informativní v shrnutí.

### 3. G-BUILD-TXAUDIT (stavba odečte gold, negeneruje tx audit event) — **OK s poznámkou**
Akceptuji jako vědomý gap. Klíčové, co Toma zajímá: **gold se odečte korektně** (ověřeno `transactions.js:45` — ctx je optional, `pay` bez ctx neháže, jen vynechá emitTx). Chybí pouze řádek v měsíčním finančním reportu — accounting enhancement, ne korektnost stavu ani hratelnost. Volba A (předat ctx) by změnila signaturu command vrstvy = změna architektury iter-002 = mimo povolený scope; její zamítnutí je správné. 
> **Poznámka pro M5-2/M9:** stavební výdaje musí být v měsíčním tx reportu dořešeny, jakmile se ctx zavede do command vrstvy (čistá změna ve vlastní iteraci). Coder/reviewer ať před implementací potvrdí, že žádný invariant (K5/K18) nevyžaduje povinné emitTx pro korektnost stavu (jen pro report) — design tvrdí, že ne; ať to ověření zůstane zachyceno. Gap zapsat do gap-reportu.

### 4. Split M5 → M5-1 (teď) + M5-2 (kontrakty + build UI, iter-014) — **OK**
Souhlasím. M5-1 je samostatně koherentní a hratelné přes commandy/testy (build command + builder + builderHut kapacita); čistá dependency hranice (T5/T6 závisí na T2+T4, ne naopak). Split izoluje dva nezávislé review gates (K13 infra vs. K14 obsah) a snižuje riziko re-runu celé iterace. Build screen legitimně až M5-2 je v pořádku — DoD celého M5 se vyhodnotí po M5-2 (dle DR-013-01). Konzistentní s preferencí na plynulost workflow a MVP-first dělení.
> **Poznámka:** DoD M5 zůstává otevřené do M5-2; orchestrátor ať to drží v master plánu (downstream milníky +1, orientačně, finalizují se při init každé iterace).

---

## Klasifikace
- **Rozhodnuto v mandátu** (DR-013-00 delegace human gatů + Q3/DR-001 gap-politika). Žádná eskalace na skutečného uživatele — nic nevratného, scope-měnícího ani mimo mandát. Tom může toto rozhodnutí zpětně přečíst a případně zvrátit (zejm. bod 3 a default scaleCost v M9).

## Follow-up (spouští implementaci)
- Coder může zahájit M5-1 (T1–T4) dle designu po T-002a.
- Do gap-reportu zanést/potvrdit: G-BUILD-COSTSCALE, G-LISTBUILDINGS, G-BUILD-TXAUDIT (+ ostatní M5-1 gapy dle §13).
- M5-2/M9 si nese: tx audit pro stavbu (ctx v command vrstvě), kalibrace scaleCost + aproximovaných budov.
