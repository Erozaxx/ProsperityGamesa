# Human Gate M9a — Balanční kalibrace (iter-020, T-003)

- **Gate ID**: GATE-020-003
- **Iteration**: iter-020 (M9a — Balanční kalibrace)
- **Role**: tom-proxy (human proxy — rozhodnuto jménem uživatele Tom)
- **Brief**: BRIEF-020-003 (`context/inbox/brief_tom-proxy_T-003_iter-020.md`)
- **Datum**: 2026-06-15
- **Vstupy posouzeny**: design_iter-020_T-001 (DESIGN-020-001), DR-020-01, zadani_projektu.md, project/done-criteria.md
- **Předchozí gate**: reviewer T-002 = GO-s-podmínkami (0 blocker / 0 major)

---

## VERDIKT: SCHVÁLENO (proceed na implementaci M9a)

Design M9a balanční kalibrace je schválen jménem Toma. Produktová rozhodnutí jsou v souladu s preferencemi uživatele (věrný rebuild, MVP-first, idle-friendly hra, plynulost workflow). **Bez eskalace** — zvolená cap varianta (A) i ostatní rozhodnutí leží v mandátu.

**Klasifikace: rozhodnuto v mandátu.** (Žádné nevratné / scope-měnící / mimo-mandát / právní rozhodnutí. Cap je reverzibilní config; finální R-G licence je samostatný gate M9b/iter-021 a zde se nepredjímá.)

---

## 1. HLAVNÍ ROZHODNUTÍ — Offline cap (R2b / D10) → **VARIANTA A = 8 h**

**Volba: `offline.capBalanceRealHours = 8` (varianta A).** Engine aplikuje `min(capTech=8h, capBalance=8h)`.

### Zdůvodnění
1. **Žánr & preference uživatele.** Zadání = casual mobilní idle/budovatelská PWA s explicitním acceptance criteria „zavři a vrať se" (offline progres je MVP feature). Tomova doložená preference je *idle-friendly hra*. V idle žánru je velkorysý offline cap feature, ne bug — frustrace z „přišel jsem o offline progres" je horší než „mám hodně zdrojů". A = maximální idle-friendly, nulové riziko frustrace.
2. **Nulová operační změna teď, čistá deklarace záměru.** A se rovná dnešnímu efektivnímu capu (technický strop 8 h). Zavedení `capBalanceRealHours = 8` tedy nemění aktuální chování hry, jen **explicitně odděluje balanční hodnotu od technického stropu** (separace §9.2a) a zapouzdřuje záměr do dat.
3. **Reverzibilita = bezpečná default strategie.** Konstanta v `balance.js`; utažení na 2 / 0.5 později je triviální a nemění architekturu. Začít štědře a případně utahovat po **reálném playtestu (M9b)** je bezpečnější než opačně (utahování po vydání = negativní feel pro hráče). Architekt i orchestrátor doporučují A — souhlasím.
4. **Žádný exploit.** Catch-up je deterministická simulace téže logiky — hráč nedostane nic navíc oproti aktivnímu hraní. Anti-exploit už řeší to, že nad cap se čas nepřičítá (norma žánru).

### Proč ne B / C
- **B (2 h)** je validní a rovněž by byla v mandátu (mírnější idle, blíž §9.2b). Zamítnuto jako default, protože pro idle PWA upřednostňuji velkorysost > konzervatismus; B zůstává jako triviálně dostupná alternativa, pokud playtest M9b ukáže potřebu.
- **C (0.5 h)** by zásadně měnila herní feel směrem k „comeback loop" / denní retenci → to by vyžadovalo eskalaci skutečnému uživateli. **Nevolím C** — odporuje preferenci idle-friendly hraní a měnila by produktový charakter bez explicitního Tomova pokynu.

> **Pozn. pro coder (carry, NErozhoduji technicky):** odvození capu z `BALANCE` (MINOR-1, `CATCHUP_CAP_MS` v `main.js`) je podmínka reviewera — jinak je nová konstanta mrtvá. To je technická podmínka DR-020-01, ne předmět tohoto gate.

---

## 2. Hratelnostní cíle trhu (S-03) — **OK jako definice vyladěného trhu**

Tři měřitelné cíle (CÍL-1 recovery k baseline ≤5 % za N=14 dní + ≥48 % za 3 dny; CÍL-2 arbitráž neztrátová `sell<buy` + round-trip ztrátový; CÍL-3 impact persistence ≥60 % za 1 den) **schvaluji jako produktovou definici „vyladěného trhu"**, `driftK = 0.2` potvrzeno.

- Souhlasí s preferencí věrného rebuildu: protože originál nemá serverová tržní data (R-C, §9.1), je správné definovat věrnost jako **feel přes explicitní měřitelné cíle**, ne jako shodu s neexistujícím referenčním logem. To je rozumný, falsifikovatelný a verzovatelný surrogát.
- `driftK = 0.2` leží uprostřed bezpečného okna [0.10, 0.40] a splňuje všechny tři cíle s rezervou; matematicky ověřeno reviewerem. Kalibrace = jen DATA (cenový/drift vzorec beze změny) → drží invariant „kalibrace ≠ změna logiky".
- Zbytkové riziko (cíle jsou *náš* návrh feel): akceptováno, protože re-kalibrace driftK v okně je čistě datová a vratná po playtestu M9b.

---

## 3. Vědomé balanční odchylky — **OK (obě schváleny)**

| Odchylka | Stanovisko |
|---|---|
| **home.js:970** — JS precedence-bug (`?:` < `+` → inoculation tech bezcenný); zvolena **ZAMÝŠLENÁ** varianta `0.02 + (inoc?0.01:0)`, provenance `original-intended` | **OK.** Věrný rebuild = věrnost **záměru hry**, ne reprodukce JS-precedence bugů. Faktická varianta dělá inoculation tech bezcennou (poškozuje balanc tech stromu) — zjevně nezamýšlené. Mechanika v core dnes neexistuje (grep=0) → korektně **deferred jako evidence** (žádná změna kódu v M9a, jen zápis rozhodnutí). |
| **`capBalanceRealHours`** název diverguje od arch `capRealHours` (§9.2b) — **záměrná separace** tech/balance | **OK.** Separace (a) technický strop / (b) balanční hodnota je žádoucí a čitelná; název je explicitnější. Zaznamenáno jako vědomá odchylka (MINOR-4). |
| baseline goods `baselineFraction=0.5` ponecháno | OK (nulová citlivost na CÍL-1/3, čistá startovní pozice; playtest-volitelné). |

---

## 4. Co NEbylo řešeno (mimo scope tohoto gate)
- **Technické podmínky DR-020-01** (MINOR-1 `CATCHUP_CAP_MS` drátování, MINOR-2 sampler cesty `home.food.store`): vyřešeno reviewerem, carry do coder briefů — ne předmět human gate.
- **Finální R-G licence před veřejným vydáním**: samostatný explicitní user gate M9b (iter-021), **NE teď** — nepredjímáno.

---

## Předpoklady
- Mandát: default = rozhodni a pokračuj; eskaluj jen nevratné / scope / mimo-mandát / právní (precedens gatů iter-013..019 T-003, všechny SCHVÁLENO).
- Reviewer T-002 = GO-s-podmínkami (0 blocker / 0 major); podmínky jsou technické a carry do coder briefů.
- Cap je reverzibilní config — volba A je revidovatelná po playtestu M9b bez architektonického dopadu.

## Blockery
–

## Follow-up (spouští se tímto verdiktem)
- Orchestrátor: dispatch coder tasků **C-020-A (Trh)** + **C-020-B (Cap + Regression)** s `capBalanceRealHours = 8` (var. A) a podmínkami DR-020-01.
