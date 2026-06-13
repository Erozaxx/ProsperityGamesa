# Test Report – iter-004 T-003 (M0a Engine Core)

- **Task**: T-003, iter-004
- **Agent**: tester (Sonnet)
- **Date**: 2026-06-13
- **Verdikt**: PASS (s jedním nalez bugy nízké závažnosti – viz níže)

---

## Výsledky CI (`npm run ci`)

### 1. `tsc --noEmit` (typecheck)
```
exit 0 – žádné chyby
```

### 2. `node tools/check-core-imports.mjs` (grep gate)
```
core import gate OK (12 file(s) checked)
```

### 3. `node --test` (unit testy)
```
# tests 63
# suites 15
# pass 63
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms ~360ms
```

**Celkové CI: ZELENÉ (exit 0)**

---

## Determinismus (hash simulace)

| seed | kroky | hash (hex) | stabilní? |
|------|-------|------------|-----------|
| 42   | 100   | `9cee7715` | ✓ (2× stejný) |
| 99   | 100   | `b9b8b195` | ✓ (≠ seed 42) |
| 1337 | 100   | `967fa2d3` | ✓ (≠ seed 42) |

- Stejný seed → identický hash: **PASS**
- Různý seed → různý hash: **PASS**
- Hash stabilní po JSON round-tripu: **PASS** (pokryto rng.test.js)

---

## Doplněné edge testy (`test/edge.test.js`)

Přidáno **36 nových testů** ve **9 suitách**:

| Suite | Počet testů | Popis |
|-------|-------------|-------|
| edge: determinism – seed independence | 2 | Různý seed → různý hash; hash roste se steps |
| edge: 5days/10days edges cross year boundary | 2 | _absDay modulo přes hranici roku (37× 10days, 73× 5days) |
| edge: scheduler tie-breaker _seq | 3 | FIFO pro 5 events stejný krok; _seq monotónní; mix kroků |
| edge: state serializability | 5 | JSON deepEqual; žádné Map/Date/fce; heap po round-tripu |
| edge: registry fail-fast | 8 | Collision throw; idempotent re-register; unknown resolve throw; has(); assertSerializable s fn/nested fn/plain/cycle |
| edge: commands dispatch and setSpeed | 5 | speed 2/0/invalid; unknown type; chybějící params |
| edge: schedule integration through tickOrder | 3 | One-shot fires once; nefiruje dřív; pořadí přes tickOrder |
| edge: devFreeze state immutability | 2 | Freeze mutaci zabrání; null battle bez pádu |
| edge: curStep day boundary precision | 6 | Krok 900 = den 1; 901 = den 2; season boundary; year boundary (obě strany) |

---

## Negativní test grep gate

Test průběh (lokálně, NEcommitováno):
1. Přidán řádek `// TEMP TEST LINE const x = Date.now(); // REMOVE THIS` do `src/core/engine/clock.js`
2. Spuštěno `node tools/check-core-imports.mjs`
3. Výstup: `src/core/engine/clock.js:84: nondeterminism — ...Date.now()...` + `core import gate FAILED (1 violation(s))` + exit 1
4. Řádek okamžitě smazán, `node tools/check-core-imports.mjs` potvrdil `OK (12 file(s))` + exit 0

**Grep gate negativní test: PASS**

---

## Nalezený bug (nízká závažnost)

### BUG-001: `assertSerializable` stack overflow na cyklickém objektu

- **Soubor**: `src/core/registry/registry.js`, funkce `checkNoFunctions`
- **Popis**: `checkNoFunctions` rekurzivně prochází objekt bez ochrany proti cyklům (chybí `WeakSet visited`). Na cyklickém objektu (`obj.self = obj`) způsobí `RangeError: Maximum call stack size exceeded` místo čistého `Error: params not serializable`.
- **Dopad**: Funkční (`assertSerializable` cyklický objekt zachytí – vyhodí výjimku), ale chybová zpráva není srozumitelná a stack overflow je méně předvídatelný než čisté ošetření.
- **Reprodukce**: `const obj = { a: 1 }; obj.self = obj; assertSerializable(obj);` → stack overflow
- **Závažnost**: Nízká (cykly v params jsou nevalidní vstup; produkční kód nikdy cyklické params nepředává; `structuredClone` by cykly zachytil, ale `checkNoFunctions` ho předbíhá)
- **Doporučení pro coder**: Přidat `WeakSet visited` do `checkNoFunctions` nebo volat `structuredClone` jako první krok (a `checkNoFunctions` pouze jako post-check).
- **Test v edge.test.js**: TC dokumentuje chování s komentářem – test PROCHÁZÍ (throws), ale annotuje issue.

---

## Přehled testované coverage

| Oblast | Ověřeno | Výsledek |
|--------|---------|---------|
| npm run ci (tsc + grep + node --test) | ✓ | PASS |
| Determinismus: stejný seed → stejný hash | ✓ | PASS |
| Determinismus: různý seed → různý hash | ✓ | PASS |
| Časové hrany: den 1/900/901 | ✓ | PASS |
| Časové hrany: sezóna 4×91 dní | ✓ | PASS |
| Časové hrany: rok 364 dní | ✓ | PASS |
| 5/10denní periodika přes hranici roku (_absDay) | ✓ | PASS |
| Scheduler tie-breaker _seq | ✓ | PASS |
| Serializovatelnost stavu (žádné fce/Map/Date) | ✓ | PASS |
| assertSerializable (fce, nested fce, plain, cyklus) | ✓ | PASS (bug annotován) |
| Registry: kolize ID, unknown resolve | ✓ | PASS |
| Commands: setSpeed, dispatch, unknown cmd | ✓ | PASS |
| Schedule integrace přes tickOrder | ✓ | PASS |
| devFreeze | ✓ | PASS |
| Grep gate negativní test (Date.now vložen → gate padl → reverted) | ✓ | PASS |

---

## Recommendation

**Go** – engine core je deterministický, správně serializovatelný a CI je zelené.

Jediný nález (BUG-001 stack overflow na cyclic params) je nízké závažnosti a lze opravit v průběhu M1 bez blokování postupu.
