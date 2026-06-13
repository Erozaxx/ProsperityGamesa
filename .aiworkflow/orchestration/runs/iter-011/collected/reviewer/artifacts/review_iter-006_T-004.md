# Review Gate – iter-006 T-004 (DoD M1: katalogy & balanc data)

- **Task ID**: T-004
- **Brief**: BRIEF-022
- **Iteration**: iter-006 (M1)
- **Reviewer**: reviewer (Opus) – review gate s pravomocí re-run
- **Datum**: 2026-06-13
- **Verdikt**: **GO** (0 BLOCKER; 3 SUGGESTION + 2 NITPICK do M2 backlogu)
- **Re-planning checkpoint M2+**: **MŮŽE PROBĚHNOUT** (gap report je dostatečný podklad)

---

## 1. Shrnutí

M1 dodává reálně extrahované a validované katalogy, čisté vzorce s referenčními čísly
ověřenými testem, fail-fast schema validátor, opravu BUG-001 a strojový i lidský gap report
s autonomní eskalací dle DR-001. `npm run ci` je zelené (238/238, tsc 0, grep gate OK).
Extrakce je reprodukovatelná (druhý běh `extract.mjs` → 0 diff v `src/data/`). DoD M1 je
splněno. Nálezy jsou nebloketní odchylky proti detailnímu návrhu (loader robustnost), které
nemají v M1 konzumenta a logicky patří do M2, kdy se katalogy načítají do běžícího enginu.

## 2. Vlastní ověření

- `npm run ci` → **EXIT 0**: tsc --noEmit 0 chyb, lint:core PASS, node --test **238/238 PASS** (39 suites).
- `node tools/extract/extract.mjs && git diff src/data/` → **0 diff** (idempotence potvrzena nezávisle).
- Working tree po review beze změn (kód jsem neměnil – scope OUT respektován).

## 3. DoD M1 – bod po bodu (architektura §11, návrh §6.3)

| Kritérium DoD M1 | Stav | Důkaz |
|---|---|---|
| Extrakce projde bez chyby, reprodukovatelná | OK | 16 ok / 0 failed; 0 diff při re-run |
| Katalogy projdou loaderem fail-fast | OK | `assertCatalogValid` háze na první chybě; 16/16 validní; 7 fail-fast testů |
| Formulas testy zelené s referenčními čísly | OK | formulas.test.js + §4.3 tabulka; všechna čísla sedí (techCap, marketPrice, spoilage, natality, scaleCost, workerEfficiency) |
| Referenční čísla z katalogů potvrzena testem | OK | military 1620/162, 1080/108; houseTypes mansion/estate/publichouse; companies KuttingKorners/LawyeredUp/StrikeGoldInc; techBase 100/1.25 |
| Gap report existuje, MVP-blokující díry označené + plán dotěžení | OK | `src/data/gap-report.json` + `doc/gap-report-iter-006.md`; 3 MVP-blokující (jobs M3, buildings M5, goods/marketBaseline M4) |
| Balance/formulas základ, balance s odkazem na zdroj | OK | `balance.js` pojmenované konstanty s source ref komentáři; `formulas.js` čisté funkce, `balance` se nepředává implicitně |
| BUG-001 fix správný | OK | WeakSet `seen`, kontrola funkce PŘED add → sémantika zachována; 3 regresní testy zelené |

**Závěr DoD M1: SPLNĚNO.**

## 4. Soulad s návrhem & provenance (gap report)

- **Provenance flagy korektní.** 6 extracted / 4 derived / 6 approximated; každý katalog má
  `_meta.provenance` (ověřeno testem). Rozdělení odpovídá realitě dat (jen `listfood.js` fyzicky
  v repu; zbytek rekonstrukce ze zdroje nebo kostra) dle návrhu §0.
- **MVP-blokující díry (jobs/buildings/goods/marketBaseline) jsou řešitelné v M2–M4, ne blocker.**
  Gap report explicitně mapuje dotěžení: G-LISTJOB→M3, G-LISTBUILDINGS→M5, G-LISTGOODS/G-MARKETBASELINE→M4/M9.
  `marketBaseline` je korektně `approximated` (basePrice generován náhodně za běhu, config.js:562 –
  nedoložitelné staticky). Vědomá odchylka D-CHEESE-SPOILAGE (0.08 vs 0.10) zapsána s oběma hodnotami + gap (M9).
- **Autonomní eskalace Q3/DR-001 dodržena.** Pipeline se neblokuje na uživateli; chybějící data →
  `derived`/`approximated` + gap entry; uživatel je INFORMOVÁN gap reportem. Doporučení re-extrakce
  z běžící hry pro plnou věrnost uvedeno a správně označeno mimo scope M1.

## 5. Nálezy

### SUGGESTION (non-blocking, M2 backlog)

- **S-1 (loader robustnost – odchylka od návrhu §3.1–3.3).** Implementovaný `src/core/catalog/`
  je tenčí než detailní spec:
  - `schemas.js` validuje pouze *přítomnost* required polí; návrh §3.1 chtěl deklarativní pravidla
    (type, min/max, enum, ref). Typové/rozsahové porušení dnes neprojde fail-fast.
  - `loader.js` je jen `name→data` store; **chybí byId registr napříč typy, detekce ID-kolize
    napříč katalogy (K10) a B4 cross-ref validace `cost`/`products` proti registru zdrojů** (návrh §3.3,
    architektura §5.2). „ID collision" test v repu se týká fns registru, ne cross-katalog ID.
  - **Proč to NENÍ blocker M1:** žádný M1 konzument katalogy do enginu nenačítá; DoD M1 (§6.3)
    vyžaduje fail-fast schema validaci (přítomna) a referenční čísla (potvrzena), ne plný byId/B4 aparát.
  - **Doporučení:** doplnit byId + ID-kolizi + B4 cross-ref na začátku M2 (kdy katalogy poprvé krmí
    systémy a NaN-ekonomika z překlepu by byla reálné riziko). Carry do M2 backlogu.
- **S-2 (gap-report.json schema).** Strojový report nemá per-gap `provenance` a `blocksMvp` flag ani
  `summary` blok dle návrhu §6.1 (lidský report MVP-blokující díry uvádí, strojový ne). Doporučení:
  doplnit `blocksMvp` + `summary` do JSON, ať jde konzumovat programově (re-planning, dashboard).
- **S-3 (jobs.products tvar).** `jobs.json.products` je pole stringů místo mapy `{resourceId: amount}`
  (návrh §2.3). Pro M1 (derived, produkční čísla = odhad) přijatelné a schématem tolerované, ale M3
  rekonstrukce musí přejít na mapu s množstvími, jinak B4 cross-ref (S-1) nebude mít co validovat.

### NITPICK

- **N-1 (resources.kind hodnota).** `resources.json` používá `kind: "resource"` pro wood/ore/stone,
  zatímco návrh §3.1 schema enum počítal s `['gold','techPt','goods','food','stock']`. Protože plný
  enum validátor není implementován (viz S-1), nevadí to dnes; při zavedení enum sjednotit slovník.
- **N-2 (food↔resource hranice pro B4).** Joby produkují food položky (bread, cheese…), které žijí
  ve `food.json`, ne v `resources.json`. Až vznikne B4 cross-ref (S-1), musí brát jako platný cíl
  i food katalog, jinak vyhodí false-positive na potravinových produktech.

## 6. Re-planning checkpoint M2+ – stanovisko

**MŮŽE PROBĚHNOUT.** Gap report (strojový + lidský) je dostatečný podklad:
- jasně odlišuje doložené (extracted/derived) od odhadu (approximated),
- identifikuje 3 MVP-blokující díry s konkrétním milníkem dotěžení (M3/M4/M5),
- odložené systémy (techs M6, zones M7, skills M3/M6) mají kostry + plán,
- eskalační cesta (re-extrakce z runtime) je popsaná jako samostatný budoucí task.

Re-planning by měl do backlogu zařadit: S-1 (loader byId/B4 na začátku M2), S-2 (gap JSON flags),
S-3/N-2 (jobs.products mapa + food jako cross-ref cíl pro M3).

---

*Verdikt: **GO**. DoD M1 splněno; CI zelené; extrakce reprodukovatelná; provenance a eskalace korektní.
Nálezy jsou nebloketní a přenášejí se do M2. Re-planning checkpoint M2+ schválen.*
