# Gap Report – iter-006 M1

**Iteration:** iter-006  
**Milestone:** M1 (katalogy & balanc data)  
**Date:** 2026-06-13  
**DR reference:** DR-001 (autonomní eskalace – nepotřebuje user blocker)

---

## Souhrn

M1 extrakce proběhla úspěšně pro 16 katalogů. Z původních 16 JSON listů ve hře je v repu fyzicky přítomen pouze `listfood.js`. Ostatní listy jsou buď rekonstruovány ze zdrojového kódu (derived) nebo doplněny odhadem (approximated).

| Provenance | Počet katalogů |
|---|---|
| extracted | 6 (food, houseTypes, companies, achievements, military, population) |
| derived | 4 (resources, jobs, buildings, balance) |
| approximated | 6 (techs, zones, skills, sectors, goods, marketBaseline) |

---

## Tabulka gapů

| Gap ID | Katalog | Závažnost | Milník dotěžení | MVP-blokující | Popis |
|---|---|---|---|---|---|
| G-LISTBUILDINGS | buildings | high | M5 | Ano | listBuildings.json chybí v repu; 4 budovy rekonstruovány z config.js (granary, warehouse, builderHut, townCenter). Úplný seznam bude dotěžen v M5. |
| G-LISTGOODS | goods | high | M4 | Ano | listGoods.json chybí; katalog goods je prázdný. Dotěžit v M4 rekonstrukcí ze source nebo re-extrakcí z runtime. |
| G-MARKETBASELINE | marketBaseline | high | M4/M9 | Ano | basePrice generován náhodně za běhu (config.js:562 `basePrice = basePrice || ceil(random*1000)`); server-side `available` neexistuje. Nelze doložit ze statického zdroje. Kalibrace M9. |
| G-LISTJOB | jobs | high | M3 | Ano | listJob.json chybí; 7 jobů rekonstruováno z home.js/config.js (baker, cheesefarmer, farmer, fisher, hunter, miner, woodcutter). Přesná produkční čísla jsou odhady – dotěžit v M3. |
| G-LISTTECHS | techs | medium | M6 | Ne (M6) | listTechs.json chybí; techTree.children prázdné. Doložitelný je jen vzorec 100×1.25^level a techBase/techScale. Strom dotěžit v M6. |
| G-LISTZONE | zones | low | M7 | Ne (M7) | listZone.json chybí úplně; doložitelné jsou jen policies/factions výčty ze source doc. Konkrétní zóny dotěžit v M7. |
| G-LISTSKILL | skills/sectors | medium | M3/M6 | Ne (M3) | listSkill.json a listSectors.json chybí; oba katalogy jsou prázdné kostry. |
| D-CHEESE-SPOILAGE | population | low | M9 | Ne | Vědomá odchylka: `spoilage.cheese=0.08` (aktivní) vs `baseSpoilage.cheese=0.10` (base) – obě hodnoty v config.js. Aktivní hodnota pro M2 = 0.08. Rozhodnutí: kalibrovat v M9. |

---

## Eskalace (DR-001 – autonomní, bez user blockeru)

Dle DR-001 se M1 **neblokuje na uživateli** kvůli chybějícím zdrojovým souborům. Postup:

- **Chybějící list-JSONy** → katalog vygenerován s `provenance: 'derived'` nebo `'approximated'` + gap entry.
- **Pipeline pokračuje** – všechny katalogy jsou validní a procházejí schématem.
- **Uživatel je informován** touto zprávou (gap report).

### Co je MVP-blokující a kdy se reálně dotěží

| Blokuje | Dotěžení |
|---|---|
| G-LISTJOB (jobs) | M3 – rekonstrukce ze source, nebo re-extrakce z running game |
| G-LISTBUILDINGS (buildings) | M5 – rekonstrukce ze source |
| G-LISTGOODS (goods) + G-MARKETBASELINE | M4 – rekonstrukce + M9 kalibrace |

### Co je odloženo na pozdní milníky

- **techs.json** (G-LISTTECHS) → M6, vzorec doložitelný, strom ne
- **zones.json** (G-LISTZONE) → M7, jen výčty policies/factions
- **skills.json / sectors.json** (G-LISTSKILL) → M3/M6

### Doporučení pro vyšší věrnost

Jediná cesta k plné věrnosti pro chybějící listy (listBuildings, listGoods, listTechs apod.) je **re-extrakce z běžící hry** – tyto JSON listy jsou fetchovány za runtime. Mimo scope M1. Pokud bude potřeba, navrhnout jako samostatný task v M3/M5.

---

*Konec gap reportu. Strojová verze: `src/data/gap-report.json`.*
