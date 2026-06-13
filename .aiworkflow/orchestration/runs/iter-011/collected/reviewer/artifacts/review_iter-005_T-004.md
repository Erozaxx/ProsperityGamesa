# Review gate iter-005 (T-004, M0b) — DoD M0 komplet

- **Reviewer**: reviewer (Opus), pravomoc re-run
- **Datum**: 2026-06-13
- **Brief**: BRIEF-018
- **Vstupy**: design_iter-005_T-001.md, impl_iter-005_T-002.md, testreport_iter-005_T-003.md, docs/benchmark_iter-005.md, architecture_proposal_iter-002 (§6/§9.2a/§11/§14), reálný kód src/{app,ui,save,vendor}, tools/, service-worker.js, .github/, kořen.

## VERDIKT: **GO**

DoD M0 je splněno bod po bodu, M0a invarianty drží, benchmark obhajuje cap 8h s explicitními prahy a A2 výhradou. `npm run ci` zelená (122/0). 0 BLOCKER. Nálezy níže jsou SUGGESTION/NITPICK pro M1+ backlog, žádný neblokuje uzavření iterace.

---

## Vlastní ověření CI

`npm run ci` → **exit 0**
- `tsc --noEmit`: čistý (žádný výstup)
- `node tools/check-core-imports.mjs`: core import gate OK (12 souborů)
- `node --test`: **122 pass / 0 fail / 0 skipped**, 21 suites

Precache freshness ověřena ručně: `node tools/gen-precache.mjs` → diff proti committed `src/precache.js` = identický (30 souborů, `prosperity-1ab35db2897d`). Po ověření jsem regenerovaný report/precache vrátil do committed stavu — **working tree čistý, kód neměněn** (scope OUT respektován).

---

## DoD M0 — kontrola bod po bodu

| DoD M0 kritérium | Stav | Důkaz |
|---|---|---|
| Instalovatelná (PWA) | OK | manifest.webmanifest validní (name/start_url `./index.html`/display standalone/icon any+maskable), `<link rel=manifest>` + apple-touch-icon v index.html |
| Offline start | OK | ESM SW cache-first, atomický `addAll(PRECACHE_URLS)`, activate čistí staré buckety, nav fallback `./index.html`. SW + import `src/precache.js` jsou statické importy module-SW → cachované browser SW-script cache (viz SUG-1). |
| Čas/sezóny | OK | rAF loop nad `advance()` (core public API), selektory selectClock/selectSeason čtou reálné pole `season.{curDay,dayInSeason,curYear,curSeason}` (ověřeno v types.d.ts) |
| Save/load | OK | IndexedDB, round-trip zachovává `hashState` (TC-T01), kill-safe pointer ve stejné tx |
| Pauza/rychlosti | OK | UI tlačítka ⏸/1×/2× → `send('setSpeed',{speed})` → `dispatch(creg,state,...)` (jediný mutační kanál §3.3); test {speed:5}→ok:false |
| Benchmark PŘED potvrzením capu | OK | docs/benchmark_iter-005.md změřen, report dává rozhodovací pravidlo, závěr POTVRDIT cap 8h (viz níže) |
| CI gate funkční | OK | `.github/workflows/ci.yml` (push `**` + PR, Node 22, `npm ci` + `npm run ci`) |
| M0a stále platí | OK | core beze změny, grep gate 12 souborů prochází, core testy v sadě 122 zelené |

## Soulad s návrhem (design_iter-005_T-001)

- **PWA shell**: index.html přepsán dle §1.2 (mount + boot-loader + module main.js). Vendor preact+htm jako ESM, glue `preact.standalone.js` jediný import point UI (§1.1). ✔
- **SW cache-first**: implementace přesně dle §2.3 (install/activate/fetch, skipWaiting+claim, GET-only, nav fallback). ✔
- **IndexedDB kill-safe**: `saveStore.saveGame` — `key=slot:gen`, rotace `(activeGen+1)%3`, `structuredClone(payload)`, `assertSerializable` fail-fast, pointer přepnut ve **stejné rw tx** jako zápis savu (§3.4 → kill mezi nikdy nezkoruptuje poslední validní). `loadGame` fallback přes 3 generace sestupně, `validateEnvelope` = asserty (žádný fixNaNs). ✔
- **Benchmark**: `runBench(opts)`+`formatReport()` vyčleněny (unit-testovatelné), měří reálný `step()`, hrtime.bigint, warmup, prahy v reportu. ✔
- **Error screen**: `buildErrorModel` (čistá, testovatelná) + `showErrorScreen`, kategorie save/catalog/boot, boot() obaluje load i kroky 4–10 v try/catch (§5.2/B4 „žádný tichý půl-stav"). ✔
- **devFreeze past (§1.4.3)**: render.js renderuje živý stav, devFreeze ponechán zakomentovaný s `ENABLE @ M2` — past „freeze pak advance throw" korektně obejita dle rozhodnutí návrhu. ✔
- **Legacy odstranění (§8)**: src/js/*, src/css/style.css smazány (git je netrackuje); gen-precache ROOTS je nezahrnuje. ✔
- **tsconfig (§7)**: jeden config s DOM/DOM.Iterable/WebWorker lib, vendor module soubory + service-worker.js excluded, čistotu core drží grep gate. ✔

## Posouzení benchmark reportu (S-02/D10a, D13, A2)

- **Potvrzení capu 8h obhájené?** ANO. Aritmetika konzistentní: STEP_MS=50 → 0,05 s/krok → 8h = 576 000 kroků (ověřeno v kódu i types). Empty heap 77,7 ns/krok → catch-up 44,8 ms; loaded heap (~1k events) 65,7 ns → 37,9 ms. Obojí o ~2 řády pod cílem 10 000 ns/krok (catch-up << 5 760 ms). Prahy potvrdit/varovat/eskalovat jsou v reportu explicitní a navázané na §9.2a — reviewer rozhoduje bez interpretace. **POTVRZUJI cap 8h.**
- **D13 main thread OK?** ANO synteticky — catch-up dávka ~45 ms << 1 s práh. Report správně označuje doporučení jako PŘEDBĚŽNÉ.
- **Syntetická povaha (A2)?** Uvedena korektně a opakovaně (METODIKA + samostatné ⚠ A2 + závěr D13): „NENÍ reálné cílové zařízení, závazné potvrzení = uživatel/tester". Carry-over pro reálné HW je explicitní. ✔

Velký margin (~2 řády) znamená, že i s realistickým zpomalením na low-end mobilu zůstává cap 8h technicky bezpečný; eskalace na Worker/snížení capu není v M0b namístě. **Žádná eskalace nenařízena.**

## Kvalita / hranice vrstev

- **Core bez DOM**: grep gate OK, app/ui/save importují core jen přes public API; vendor import vně core. ✔
- **Kill-safe save**: rotace/fallback/pointer-atomicita ověřeny testy (rotace 0→1→2→0→1, fallback na poškozené, all-corrupt→null, kill-safe pointer). ✔
- **SW strategie**: cache-first verzovaný, atomický addAll (fail-fast při chybějícím souboru), správné verzování bucketů. ✔
- **Zero-build vendor**: VENDOR.md s provenance (verze, zdroj, licence, upgrade postup). ✔

---

## Nálezy

### BLOCKER
Žádné.

### SUGGESTION
- **SUG-1 (SW self-precache, M1)**: `service-worker.js` ani `src/precache.js` nejsou v `PRECACHE_URLS`. Pro **module** SW je to korektní — browser je drží ve vlastní SW-script cache (statický import), takže offline funguje. Doporučení: do VENDOR/README poznámku, že module-SW závisí na browser SW-script cachi, a do tester PWA smoke (N-03, reálné zařízení) explicitně ověřit cold offline start po prvním načtení, aby tento předpoklad byl potvrzen na reálném HW. Nezablokuje M0b.
- **SUG-2 (save read-modify-write, M1+)**: `saveGame` čte slot v samostatné `readonly` tx a pak zapisuje v `readwrite` tx → teoretická read-modify-write souběh mezi dvěma autosave triggery. Pro single-slot M0b s sekvenčním autosave neškodné; při paralelních savech (vícekartová PWA) zvážit čtení slotu uvnitř téže rw tx. Funkčně OK pro M0b.
- **SUG-3 (icons v precache, M1)**: precache obsahuje jen `icons/icon.svg`. Pro instalovatelnost na všech platformách (iOS apple-touch, různé velikosti) zvážit doplnění rastrových ikon v M1. Manifest/install v M0b prošel (tester TC-T02).

### NITPICK
- **NIT-1**: impl note (§T1) uvádí htm licenci jako MIT, ale VENDOR.md a package-lock správně uvádějí **Apache-2.0**. VENDOR.md (zdroj pravdy) je správně; jen nekonzistence v impl note textu.
- **NIT-2**: `App.js` props JSDoc má `send: (type, params?: object)`, zatímco `render.js`/`main.js` používají `Record<string, unknown>`. Kosmetická typová nejednotnost, tsc prochází.
- **NIT-3**: `attachLifecycle.onHide` (autosave na pagehide) je best-effort fire-and-forget (`saveGame` není awaited) — dle návrhu §1.3.3 záměrné; periodický autosave je mimo M0b scope. Připomínka pro M1, ne nález.
- **NIT-4**: `_resetDB()` export v saveStore.js je test-only helper v produkčním modulu (dle odchylky impl note #4 kvůli fake-indexeddb izolaci). Akceptováno; v M1 zvážit přesun do test utility.

## Carry-over / doporučení pro orchestrátora
- GO → iterace iter-005 (M0b) může být uzavřena.
- SUG-1..3 a NIT-1..4 přenést do M1 backlogu.
- **Otevřený carry-over (A2)**: závazné potvrzení capu 8h a D13 main-thread vyžaduje benchmark na reálném low-end HW + manuální PWA install+offline smoke na zařízení (tester N-03). Syntetické číslo je dolní/řádový odhad — udržet v backlogu jako tracked item, ne uzavírat jako definitivní.
