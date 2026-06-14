# Human Gate — M6 (Výzkum & tech strom) — iter-015 / T-003

- **Gate ID**: GATE-015-003
- **Iterace**: iter-015 (M6 — Výzkum & tech strom)
- **Rozhoduje**: tom-proxy (proxy za uživatele Tom, mandát DR-013-00)
- **Datum**: 2026-06-14
- **Vstupy**: design_iter-015.md (rev. T-002a), DR-015-01, DR-013-00, zadani_projektu.md, done-criteria.md
- **Klasifikace**: rozhodnuto v mandátu (žádná eskalace)

---

## VERDIKT: SCHVÁLENO s výhradou

M6 design je schválen jménem Toma; coder může pokračovat na implementaci. Všechna 4 produktová rozhodnutí jsou v rámci scope, vratná a mají precedens (G-LISTBUILDINGS, G-BUILD-TXAUDIT z iter-013/014). Jediná výhrada je sledovací, ne blokující: dva odložené gapy (tech→joby a deterministická náhrada university bonusu) MUSÍ být adresovány v M9, jinak eskalace.

---

## Stanovisko ke 4 rozhodnutím

### 1. G-LISTTECHS — approximovaný tech strom (6 sektorů + ~6 techů, techCap=100×1.25^level doložitelný, kalibrace M9) — **OK**
Plně v duchu „věrný rebuild, MVP-first". Vzorec `techCap=100×1.25^level` je doslova vyžadován zadáním (Scope IN: „Výzkum (tech strom, `100×1.25^level`)") a je doložitelný (formulas.js:31, originál techs.js:37) — žádná approximace jádra. Approximovaný je jen obsah stromu (`provenance:'approximated'`), což je přesně schválený precedens G-LISTBUILDINGS (iter-013) i G-CONTRACTS-CATALOG (iter-014): listing nebyl v dumpu (runtime fetch), takže se konstruuje min. hratelná sada teď a kalibruje M9. Vratné, neblokuje DoD.

### 2. G-TECH-JOB-EFFECTIVE — tech→joby zatím no-op, demo přes building agregáty (sklady/attractiveness) — **OK s poznámkou**
Přijatelné, že M6 demonstruje techy přes budovy. Návrh stojí na poctivém zjištění z kódu (jobsProduction nečte přes effective(), buildings agregáty ano) a volí jedinou dnes PROKAZATELNĚ funkční cestu — DoD „tech mění chování" je splnitelný bez M9 (granary/storage.food, well/attractiveness, ověřeno proti buildings.json). Job-cílené techy zůstávají jako obsah stromu s explicitním gapem. Poznámka/výhrada: plné napojení tech→joby (přepojení produkce na effective()) je závazek pro M9 — odložení je legitimní MVP trade-off, ne tichý dluh.

### 3. University Math.random bonus vynechán kvůli determinismu (catch-up-safe) — **OK**
Determinismus má přednost před věrností náhodného prvku. Determinismus a spolehlivý reload/offline progres jsou tvrdé požadavky projektu (AC: „postup se spolehlivě ukládá a obnovuje včetně offline výpočtu"; třída bugu DR-012-02). Náhodný RNG bonus v research by ohrozil catch-up/round-trip identitu. Obětování tohoto jednoho náhodného prvku je správná volba; deterministická náhrada (např. seedovaná) patří do M9. Gap je zdokumentovaný (G-RESEARCH-UNIV-RNG), vratný.

### 4. K13 se uzavírá plně — techy = druhý zdroj modifikátorů přes stejnou vrstvu — **OK**
Přesně žádaný architektonický stav: techy i budovy skládají do téhož `catalogState.modifiers`, čtené stejným `effective()`/fold, s jednou re-derivační cestou (rozšířený rebuildBuildingDerived, žádná load-only/tech-only větev → bez DR-012-02 desyncu). Žádná ad-hoc cesta, žádná regrese M5-1 (fresh hra bez techů = bit-identická). Konzistentní, čisté, plně v rámci architektury iter-002.

---

## Výhrady (sledovací, neblokující)
- **V1**: G-TECH-JOB-EFFECTIVE — plné napojení tech→joby (produkce přes effective()) adresovat v M9. Pokud by mělo vypadnout, eskalace.
- **V2**: G-RESEARCH-UNIV-RNG — deterministická náhrada náhodného university research bonusu adresovat v M9 (volitelně, nízká priorita).
- **V3**: G-TECH-TXAUDIT / G-BUILD-TXAUDIT (command bez ctx) — stejná třída jako už schváleno v iter-014; dořešit zavedením ctx do command vrstvy v M9. Mimo scope tohoto gate (technické, vyřešeno reviewerem).

## Předpoklady
- Mandát DR-013-00: tom-proxy zastupuje human-in-the-loop gaty (architektura, gap/cap hodnoty) v autonomním doběhu M5–M9.
- Technický review hotový: reviewer T-002 GO-s-podmínkami; architekt T-002a zapracoval M-1 (player init determinismus), M-2 (catalog guard), m-3 (prokazatelná effective() cesta).
- Gap-politika: approximated obsah s `provenance` + kalibrace M9 je zavedený precedens (G-LISTBUILDINGS, G-CONTRACTS-CATALOG).

## Reverzibilita
Všechna rozhodnutí jsou vratná: approximovaná data lze překalibrovat (M9), odložené gapy jsou zdokumentované a sledované. Žádné nevratné, scope-měnící ani mimo-mandátní rozhodnutí → bez eskalace na skutečného uživatele.
