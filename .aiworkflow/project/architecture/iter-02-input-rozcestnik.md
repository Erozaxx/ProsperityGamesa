# iter-02 – Vstupní rozcestník pro architekta (návrh projektu hry)

> **Co je tohle:** jediný vstupní dokument pro agenta (architekta), který v **iter-02**
> vytvoří **návrh projektu na vytvoření hry** – věrný rebuild „Prosperity" jako
> mobile-first PWA, hratelná offline. Nejde o další analýzu: iter-01 už analýzu i review
> dodal. Tvým úkolem v iter-02 je z těchto materiálů sestavit **realizační návrh projektu**.
>
> **Přečti materiály v uvedeném pořadí.** Vše je v gitu (prostředí nemá persistentní
> storage). Cesty jsou relativní ke kořeni repa.

---

## 0. Mise iter-02 (jednou větou)
Na základě hotové analýzy a review z iter-01 navrhnout **projekt/architekturu pro vytvoření
hry** (stack, struktura, herní engine & čas, datový + save model, vrstvení logika↔UI,
rozpad systémů do iterací a milníků) – pro cíl **mobile-first PWA, offline, věrný rebuild**.

---

## 1. Povinné čtení – pořadí a proč

### Krok 1 – Cíl a kontext projektu
- **`.aiworkflow/zadani_projektu.md`** – cíl, scope IN/OUT, omezení (mobile-first PWA, offline,
  bez serveru; vše v gitu). **Začni tady**, ať víš, co se staví a co je mimo scope.

### Krok 2 – Co se staví (popis původní hry)
- **`doc/original_source_doc.md`** – kompletní popis původní hry: žánr, engine & čas, sezóny,
  populace/bydlení, ekonomika/trh, výzkum, vojsko/AI svět, save + **source map** (kde co ve
  zdroji žije) a **potvrzená čísla balancu**. Tohle je tvůj „produktový a doménový" základ.

### Krok 3 – Architektonická analýza originálu (iter-01 výstup) – KLÍČOVÝ VSTUP
- **`.aiworkflow/agents/architect/artifacts/final/analysis_keymechanics_iter-001_T-001.md`**
  – 13 mechanik, pro každou datový + step model, **mapa závislostí** (centrální uzly:
  itemList, Player.pay/insertInventory, Engine.schedule+fns, Home.step) a 9 vzorů originálu.

### Krok 4 – Co přepracovat (refactoring kandidáti, iter-01) – KLÍČOVÝ VSTUP
- **`.aiworkflow/agents/architect/artifacts/final/analysis_refactoring_perf-offline_iter-001_T-002a.md`**
  – výkon & runtime, save/offline, serverové závislosti (16 nálezů). Klíčové pro PWA/offline.
- **`.aiworkflow/agents/architect/artifacts/final/analysis_refactoring_maintainability_iter-001_T-002b.md`**
  – provázanost, křehkost dispatchů, UI↔logika, balanc-as-code (13 nálezů).
- **`.aiworkflow/agents/architect/artifacts/final/rework_iter-001_T-004.md`**
  – co se v analýzách doupřesnilo (F1–F3) a doplnilo (G1 seedovatelný RNG, G2 bitvy v catch-upu).

### Krok 5 – Review a konsolidace (iter-01 výstup) – NEJDŮLEŽITĚJŠÍ ROZCESTNÍK PRO NÁVRH
- **`.aiworkflow/agents/reviewer/artifacts/final/review_iter-001_T-003.md`** – verdikt
  **GO s úpravami** a hlavně **jeden konsolidovaný prioritizovaný refactoring seznam K0–K19**
  (§6) + **otevřené otázky R1–R4** k rozhodnutí (§7). **Tohle ber jako páteř návrhu** – K0–K10
  (High) jsou doporučené jádro, K11–K19 navazující.

---

## 2. Zdroje pro ověření a dotěžení dat (dle potřeby)
- **`doc/original_source/modules/prosperity/`** – plný zdroj herního modulu originálu (services,
  controllers, directives). Sem chodíš ověřit detail nebo vytáhnout konkrétní vzorec/číslo.
- **`doc/original_source/extracted/config-extract.json`** – kurátorovaný výtah statické
  konfigurace (houseTypes, companies, achievements, season, engine konstanty, techScale…).
- **`doc/original_source/extracted/rootscope-raw-dump.json`** – širší syrový dump `$rootScope`.
- **`doc/original_source/PROVENANCE.md`** – původ a poznámka k autorství (cizí hra – řešit licenci/assety).

> ⚠️ **Pozor (R3):** plné katalogy (buildings/goods/techs/zóny) se v originále fetchovaly ze
> serveru a v repu **nejsou kompletní** – jejich dotěžení dle source map je samostatný předpoklad
> (viz K2/K4 a R3 v review).

---

## 3. Otevřené otázky, které musí návrh rozhodnout (z review §7)
- **R1** – Klientská tržní simulace (K7): jediná část, kterou **nelze věrně opsat** (serverová
  dynamika `available` není ve zdroji) → vlastní návrh + balanční kalibrace.
- **R2** – Cap offline catch-upu a chování bitev/eventů během něj (K3/K8) = balanc/UX rozhodnutí.
- **R3** – Plné katalogy nejsou v repu → dotěžení je předpoklad K2/K4.
- **R4** – Pozdní systémy (AI svět, bitvy) = „navrhnout teď, stavět později" – ohlídat, ať
  návrh nezůstane jen na papíře.

---

## 4. Tvrdá omezení (nepřekračovat bez eskalace)
- **Mobile-first PWA, plně offline** – žádný server v jádře (viz K1/K2/K7).
- **Žádné persistentní úložiště prostředí** → veškerý stav i kód musí být v gitu.
- **Věrný rebuild** – přenášíme mechaniky a balanc, **ne** AngularJS implementaci 1:1.
- **Stack je otevřený** – volbu (vanilla vs framework/engine, jazyk, build) navrhni a zdůvodni
  ty; není předem dané.
- Scope OUT (zadání): online multiplayer/backend/účty, monetizace, nativní app, převzetí
  chráněných assetů 1:1.

---

## 5. Co má iter-02 vyprodukovat (doporučený obsah návrhu projektu)
Není to závazná osnova, ale návrh by měl pokrýt:
1. **Volba stacku** + zdůvodnění (trade-offs, min. 1 alternativa) vůči cílům PWA/offline.
2. **Struktura projektu** a vrstvení: jádro simulace (headless, serializovatelný stav) ↔ UI
   (read-only + command/intent API) – viz K0, K9.
3. **Herní engine & čas**: fixed-timestep s akumulátorem, jeden mechanismus pro live + background
   + **offline catch-up** (K3), seedovatelný RNG (G1/K16).
4. **Datový model & katalogy**: data-driven obsah, immutable katalog + modifikátory (K13–K15),
   balanc do dat + čisté testovatelné vzorce (K4).
5. **Save model**: local-first (IndexedDB), generace, `lastSimTimestamp`, deklarativní schéma
   (K1, K11).
6. **Resource/transakční vrstva** (K5), string-ID registr fail-fast (K10), rozpad Home.step (K6).
7. **Rozpad do iterací a milníků** (co je MVP jádro, co navazuje) – navázat na prioritu K0–K19.
8. **Rozhodnutí k R1–R4** (nebo explicitní eskalace, kde je potřeba vstup uživatele).
9. **Rizika + mitigace**, předpoklady a nejistoty.

---

## 6. Mapa artefaktů (rychlý přehled cest)
| Materiál | Cesta |
|---|---|
| Zadání projektu | `.aiworkflow/zadani_projektu.md` |
| Popis původní hry + source map | `doc/original_source_doc.md` |
| Plný zdroj originálu | `doc/original_source/modules/prosperity/` |
| Extrahovaná data | `doc/original_source/extracted/` |
| T-001 analýza mechanik | `.aiworkflow/agents/architect/artifacts/final/analysis_keymechanics_iter-001_T-001.md` |
| T-002a refactoring (výkon/offline/server) | `.aiworkflow/agents/architect/artifacts/final/analysis_refactoring_perf-offline_iter-001_T-002a.md` |
| T-002b refactoring (údržba/architektura) | `.aiworkflow/agents/architect/artifacts/final/analysis_refactoring_maintainability_iter-001_T-002b.md` |
| T-004 rework note | `.aiworkflow/agents/architect/artifacts/final/rework_iter-001_T-004.md` |
| T-003 review + K0–K19 + R1–R4 | `.aiworkflow/agents/reviewer/artifacts/final/review_iter-001_T-003.md` |

> Pozn.: po uzavření iter-01 (`/close-iteration`) jsou tytéž artefakty zkopírované i v
> `.aiworkflow/orchestration/runs/iter-001/collected/`. Primárně používej cesty výše.

---

## 7. Jak to použít při dispatchi iter-02
Orchestrátor v iter-02 vloží tento rozcestník (a artefakty z tabulky §6) do
`agents/architect/context/refs/` nebo je odkáže v briefu jako primární vstupy. Architekt
**musí** projít materiály v pořadí §1, než začne navrhovat.
