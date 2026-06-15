# Human Gate — iter-018 (M7b Bitvy) — verdikt jménem Toma

- **Gate ID**: GATE-018-003
- **Brief**: BRIEF-018-003
- **Iteration**: iter-018 (M7b — Bitvy → dokončuje M7)
- **From**: tom-proxy (human proxy, zastupuje Toma)
- **To**: Orchestrator
- **Date**: 2026-06-15
- **Posuzovaný design**: DESIGN-018-001 (revize T-002a) + DR-018-01
- **Typ rozhodnutí**: produktový gate PŘED implementací (technický review hotový: reviewer GO-s-podmínkami T-002, architekt zapracoval M-1/M-2/M-3/F-1 v T-002a)

---

## VERDIKT: SCHVÁLENO

Proceed na implementaci M7b (T1–T5 v jedné iteraci, SPLIT=NE, fallback M7b-1/M7b-2 zůstává otevřen bez dopadu na architekturu).

Rozhodnuto **v mandátu** (DR-013-00: delegace human-in-the-loop gatů na tom-proxy v autonomním doběhu M5–M9). Žádné rozhodnutí není nevratné, mimo scope ani scope-měnící — bitvy (bandité, invaze, dobývání) jsou explicitně **Scope IN** (zadani_projektu.md ř.22) a jsou jádrem věrného rebuildu. Eskalace na skutečného Toma NENÍ potřeba.

---

## Stanovisko ke 4 produktovým rozhodnutím

### 1. Bitvy dokončují M7 (battle automat: live battleCommand + offline auto-resolve G2, invaze + bandité) — **OK**
Dává smysl, že pozdní hra (bitvy) se rozjede a M7 (AI svět + bitvy) je tím hotové. Je to přesně účel milníku M7b a Scope IN ("vojsko a bitvy: bandité, invaze, dobývání"). Kostra je připravená (battleStep stub z M2a, startBattleStub a aiBattleResolve z M7a-2) — M7b jen naplňuje tělo, žádný nový systém. Konzistentní s precedentními gaty iter-016/017 (SCHVÁLENO). Riziko "nedotažení pozdních systémů" z zadání (ř.49) se tímto naopak adresuje.

### 2. G2 auto-resolve == live (zdarma, stejný automat, obranná AI místo commandů, deterministické) — **OK**
Přesně preference Toma: věrný + jednoduchý. Největší riziko M7b ("dvě implementace live vs. offline") strukturálně neexistuje — `battle.tick` je `every:'step'`, takže `advance()` i `runCatchupBatch()` volají identický `step()`. Offline = stejná `battleStep` cesta s prázdnou frontou commandů (obranná AI hraje za hráče). Jedna implementace, deterministické, levné v catch-up dávce. Ověřeno proti kódu reviewerem. Nejlepší možný přístup.

### 3. G-MILITARY-STATS — approximované combat staty (strength/defense/critChance/cooldown z originálu, baseRevival 0.25 default, kalibrace M9) — **OK s pozn.**
Přijatelné, plně analogické předchozím gap-rozhodnutím (G-LIST*, G-CAPITAL-MISMATCH v iter-017, fallback vzor DR-017-01 m-4). Combat staty hráče nejsou v dumpu (gap, ne volba) → approximace z originálu s `provenance:'approximated'` flagem je správná cesta; deterministický fallback `baseRevival 0.25` odstraňuje jinak NaN-blokující mezeru (M-1). **Poznámka (nezávazná, informativní):** jde o balanční čísla — věrnost "feelu" bitev se prokáže až kalibrací v M9 (R-D/R-F). Provenance flag MUSÍ zůstat, aby M9 vědělo, co ladit. Eskalace není potřeba — jsou to laditelná čísla, ne produktové rozhodnutí.

### 4. battle.js stub naplněn 1:1 originálem (damage/revival vzorce, cooldowny, AI reakce vč. kuriozit jako dvojí dekrement cd) — **OK**
Přesně v duchu "věrný rebuild" (zadani_projektu.md ř.3/6: replikovat mechaniky a balanc originálu, ne implementaci). 1:1 port včetně originálových zvláštností (M-2 dvojí dekrement opponent cd, M-3 pevný počet crit rolů, fix-pozice rng streamu) je správně — odchylka by znamenala nevěrný balanc a rozbité referenční testy. Determinismus a serializovatelnost (F-1) jsou ošetřeny architektem a kryté povinnými testy (§10). Originálové kuriozity se portují záměrně, ne "opravují".

---

## Předpoklady
- Mandát DR-013-00 (delegace human gatů na tom-proxy v autonomním doběhu M5–M9).
- Technický review hotový: reviewer T-002 GO-s-podmínkami → architekt T-002a zapracoval všechny 4 major podmínky (M-1 baseRevival fallback, M-2 double cd-decrement, M-3 crit rng pevný počet, F-1 serializovatelnost).
- Precedens gatů iter-016 / iter-017 T-003 (oba SCHVÁLENO) — M7b je stejná třída rozhodnutí.

## Výhrady / follow-up
- Žádná blokující výhrada.
- Informativní (pro M9): approximované combat staty + baseRevival + bandit frekvence držet s `provenance:'approximated'` flagem; M9 kalibruje "feel" bitev (R-D/R-F/R-G dle §12 designu).
- Split-trigger M7b-1/M7b-2 zůstává otevřený jako fallback (default = jedna iterace), bez dopadu na kontrakt §8.1 — orchestrátor smí použít při nečekané složitosti T1.

## Klasifikace
**Rozhodnuto v mandátu** (proxy za Toma). Nevratné / scope-měnící / mimo-mandát: **žádné** → bez eskalace na skutečného uživatele.
