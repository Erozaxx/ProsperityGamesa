# Test Report – iter-005 T-003 (M0b)

- **Agent**: tester (Sonnet)
- **Datum**: 2026-06-13
- **Iterace**: iter-005
- **Brief**: BRIEF-017
- **Verdict**: **PASS**

---

## Shrnutí

Všechny scope-IN testy prošly. CI pipeline (`npm run ci`) zelená. 122 testů, 0 selhání.

Jediný nalezený defekt: `test/iter005-edge.test.js` byl dodán coderem s `await import()` uvnitř synchronních `test()` callbacků → `SyntaxError: Unexpected reserved word` → celý soubor selhal (1 fail v CI). Defekt byl v testovém souboru, nikoliv v produkčním kódu. Opraven změnou na top-level ESM importy (scope: tester přidává/opravuje testy). Po opravě: 122 testů, 0 selhání.

---

## CI Pipeline

| Krok | Výsledek |
|------|---------|
| `npm install` | OK |
| `tsc --noEmit` | OK (žádný výstup = clean) |
| `node tools/check-core-imports.mjs` (grep gate) | OK – core import gate OK (12 file(s) checked) |
| `node --test` | **122 pass, 0 fail** |

**Celkem**: `npm run ci` → exit 0

---

## Save Round-Trip (TC-T01, save-store.test.js)

| Test Case | Výsledek |
|-----------|---------|
| empty state → loadGame returns null | PASS |
| round-trip preserves hashState (deep equal přes hashState) | PASS |
| savedAt a lastSimTimestamp uloženy správně (injektovaný now=1234) | PASS |
| rotace generací – po N+2 savech správný activeGen | PASS |
| rotace cycles 0→1→2→0→1 | PASS |
| fallback – poškozená aktivní generace → vrací předchozí | PASS |
| assertSerializable guard – funkce v state → reject/throw | PASS |

Výsledky: 7/7 PASS

---

## Determinismus po loadu (TC-T01 edge, iter005-edge.test.js)

- 50 kroků nepřerušeně → hashA
- 20 kroků, save, load, +30 kroků → hashC
- `hashC === hashA`: **PASS**

Determinismus (G1) potvrzen.

---

## PWA Smoke – manifest.webmanifest (TC-T02)

Soubor: `/home/user/ProsperityGamesa/manifest.webmanifest`

| Pole | Hodnota | Výsledek |
|------|---------|---------|
| valid JSON | yes | PASS |
| `name` | "Prosperity" (non-empty string) | PASS |
| `start_url` | "./index.html" (non-empty string) | PASS |
| `display` | "standalone" | PASS |
| `icons` | non-empty array (1 entry) | PASS |
| `icons[].src` + `icons[].sizes` | "icons/icon.svg", "any" | PASS |

Výsledky: 6/6 PASS

---

## PWA Smoke – Precache (TC-T03)

| Test Case | Výsledek |
|-----------|---------|
| committed src/precache.js shodný s čerstvě generovaným | PASS |
| precache list obsahuje `./src/core/engine/index.js` | PASS |
| precache list obsahuje `./src/vendor/preact.standalone.js` | PASS |
| precache list obsahuje `./src/app/main.js` | PASS |
| všechny soubory v precache existují na disku | PASS |
| gen-precache deterministický (2 běhy = stejná verze a soubory) | PASS |
| PRECACHE_URLS: všechny ./relativní, bez duplikátů | PASS (existující test) |
| precache neobsahuje *.test.js, *.d.ts, .gitkeep, *.md | PASS (existující test) |

Výsledky: 4/4 nových + 4/4 existujících = PASS

---

## Benchmark Sanity (TC-T04)

Prostředí: Node v22.22.2, linux x64, Intel Xeon @2.10GHz (4 cores)

| Varianta | ns/krok | Práh | Výsledek |
|----------|---------|------|---------|
| empty heap | ~52–72 ns | < 10 000 ns | PASS |
| loaded heap (~1k) | ~61–79 ns | < 10 000 ns | PASS |

Catch-up 8h (576 000 kroků): ~30–46 ms << 5 760 ms (cíl).

**ZÁVĚR D10a: Potvrdit cap 8h. Main thread dostatečný (synteticky).**

⚠ A2: Syntetický Node; závazné potvrzení = reálný low-end HW.

---

## Negativní Edge Testy – Save (TC-T05, TC-T06)

| Test Case | Výsledek |
|-----------|---------|
| TC-T05: všechny 3 generace corrupt → loadGame vrací null | PASS |
| TC-T06: kill-safe pointer – slot.activeGen vždy odpovídá poslednímu úspěšnému save | PASS |
| rotace v TC-T06 je 0→1→2→0→1 | PASS |

Výsledky: 3/3 PASS

---

## Defekty

### BUG-T03-001: test/iter005-edge.test.js – SyntaxError (opraveno v test scope)
- **Závažnost**: Medium (blokoval CI výstup)
- **Typ**: test kód, ne produkční
- **Popis**: Původní soubor dodaný coderem používal `await import()` uvnitř synchronních `test()` callbacků, což Node.js odmítl s `SyntaxError: Unexpected reserved word`
- **Symptom**: `not ok 10 - test/iter005-edge.test.js` + exit code 1 (1 fail celkem)
- **Příčina**: test() callbacky nebyly `async`, ale obsahovaly `await`
- **Oprava**: nahrazení dynamic `await import()` za top-level ESM `import` (modul-level, platné v ESM)
- **Status**: Opraveno v scope testera (test/iter005-edge.test.js)

---

## Regresní rizika

- IndexedDB izolace testů: používá unikátní slotId + `_resetDB()`. Pokud se `fake-indexeddb` stav sdílí mezi soubory (paralelní spuštění), mohl by být nestabilní. Aktuálně `node --test` spouští soubory sekvenčně → stabilní.
- Precache freshness test: striktně porovnává committed `src/precache.js` s čerstvě generovaným. Při jakékoli změně statických souborů je nutné spustit `node tools/gen-precache.mjs` před commitem, jinak CI selže. Toto je záměrné chování (§2.4 návrhu).
- Benchmark sanity: práh 10 000 ns/krok má velký margin (měřené ~70 ns). Riziko selhání na CI velmi nízké.

---

## Recommendation

**GO** – PASS bez podmínek.

Všechny acceptance criteria iter-005 M0b splněny. Jediný defekt byl v testovém souboru (ne v produkčním kódu) a byl opraven v rámci test scope. CI zelená: 122 testů, 0 selhání.
