# Brief (RE-DISPATCH – předchozí běh nevytvořil soubory)
- **Brief ID**: BRIEF-020b
- **Iteration**: iter-006 (M1)
- **To**: coder (Sonnet)
## DŮLEŽITÉ
Předchozí běh skončil po naplánování BEZ vytvoření souborů. Tentokrát SKUTEČNĚ vytvoř soubory na disku a průběžně ověřuj `npm run ci`. Nekonči, dokud není CI zelené a impl note + handoff hotové. Pracuj v tomto POŘADÍ (každý krok dokončit než jdeš dál):

### Krok 1 (rychlá jistá hodnota): BUG-001 fix
- src/core/registry/registry.js: do `checkNoFunctions`/`assertSerializable` přidej `WeakSet seen` ochranu proti stack overflow na cyklu (kontrola funkcí PŘED přidáním do seen). + 3 regresní testy (cyklus → čistá výjimka, ne RangeError). Ověř `npm run ci`.

### Krok 2: balance + formulas + tabulkové testy (jádro M1, testovatelné)
- src/core/balance/balance.js (pojmenované konstanty s odkazem na zdroj: TAXCENTERBASE 22, CITYGUARDBASE 56, TREEMATURETIME 36, haggleBuy 1.35, haggleSell 0.6, AIMechanicStart 567000, revoltMechanicStart 630000, matRate 0.04, retRate 0.02, spoilage hodnoty…).
- src/core/balance/formulas.js (čisté vzorce): techCap=round(100*1.25^level), scholarLevelCap=round(300*1.25^level), marketPrice=round(basePrice*(1.5-min(avail,max)/max)^3*1000)/1000, workerEfficiency (clamp [0.25,2], curfew -0.25), spoilage=trunc(pct*amt), upkeep.
- test/formulas.test.js s REÁLNÝMI čísly z návrhu: techCap 0→100,1→125,2→156,4→244,10→931; marketPrice (100,0,100)→337.5,(100,50,100)→100,(100,100,100)→12.5; archer upkeep round(108*1.5)=162; spoilage meat 0.18*100→18. Ověř `npm run ci`.

### Krok 3: katalogy + schémata + validátor
- tools/extract/ pipeline (čte doc/original_source/extracted/rootscope-raw-dump.json + config-extract.json + doc/original_source/lists/listfood.js + modules) → generuje JSON katalogy do src/data/ (commitnuté). Co je v dumpu prázdné, rekonstruuj ze zdroje (modules/, application-config.js) nebo approximuj.
- src/core/catalog/ schémata per typ + runtime validátor (fail-fast §5.2) + string-ID registr + byId index. test/catalog-validate.test.js. Ověř `npm run ci`.

### Krok 4: registr efektů kostra + gap report
- src/core/registry/effects.js kostra (string-ID fn per doména).
- docs/gap-report_iter-006.md (nebo src/data/gap-report.json): provenance per katalog (extracted/derived/approximated), co chybí (techs/zones/skills/sectors prázdné v dumpu). Autonomní – žádný user blocker (Q3/DR-001).

## Inputs
- ZÁVAZNÝ návrh: agents/architect/artifacts/final/design_iter-006_T-001.md (cesty, schémata, čísla)
- Zdroje: doc/original_source/* ; engine src/core/* ; agents/coder/AGENTS.md
## Acceptance
- `npm run ci` ZELENÉ (tsc 0, grep gate core OK, node --test vše pass vč. nových testů).
- Katalogy v src/data/ existují a jsou validní; gap report existuje; BUG-001 opraven.
## Outputs
- Reálné soubory; impl note agents/coder/artifacts/final/impl_iter-006_T-002.md; handoff-out.sh T-002.
