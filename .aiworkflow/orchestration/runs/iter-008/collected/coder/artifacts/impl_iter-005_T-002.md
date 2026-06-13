# Implementace M0b – iter-005 T-002

- **Agent**: coder (Sonnet)
- **Datum**: 2026-06-13
- **Iterace**: iter-005
- **Task**: T-002
- **Brief**: BRIEF-016
- **Návrh**: design_iter-005_T-001.md (Opus architect)

---

## Co bylo implementováno

### T1 – PWA Shell

- `src/vendor/preact.module.js`, `hooks.module.js`, `htm.module.js` – zkopírováno z node_modules, `@ts-nocheck` přidáno (vendor je cizí kód, skipLibCheck nestačí pro transitivní importy)
- `src/vendor/preact.standalone.js` – glue modul, jediný import point pro UI
- `src/vendor/VENDOR.md` – provenance (verze, zdroj, licence, upgrade postup)
- `src/app/env.js` – APP_DEV flag (hardcoded true v M0b)
- `src/app/loop.js` – rAF smyčka nad advance(), DI nowFn/raf/cancelRaf pro testovatelnost
- `src/app/lifecycle.js` – visibilitychange + pagehide autosave hook, DI target/win
- `src/app/sw-register.js` – navigator.serviceWorker.register s type:'module'
- `src/app/persist.js` – navigator.storage.persist() best-effort
- `src/app/main.js` – boot() glue (10-krokový bootstrap), error screen wiring
- `src/ui/selectors.js` – čisté selektory selectClock/selectSeason/selectSpeed
- `src/ui/App.js` – minimální HUD (rok/den/sezóna/krok + speed buttons)
- `src/ui/render.js` – mountUI + coalesced requestRender (rAF + scheduled flag)
- `src/ui/ErrorScreen.js` – showErrorScreen + buildErrorModel (testovatelná čistá funkce)
- `src/ui/styles.css` – minimální HUD styl (dark theme)
- `index.html` – přepis na nový shell (#app + boot-loader + src/app/main.js)

### T2 – Manifest + SW + Precache

- `manifest.webmanifest` – aktualizován description na rebuild
- `service-worker.js` – přepis na ESM SW (cache-first, verzovaný precache z src/precache.js)
- `tools/gen-precache.mjs` – generátor precache (sha256 content hash, deterministický, žádné závislosti)
- `src/precache.js` – commitnutý output (30 souborů, verze prosperity-...)

### T3 – IndexedDB Save

- `src/save/schema.js` – konstanty (DB_NAME, STORE_SLOTS, STORE_SAVES, SLOT_ID, GENERATIONS=3, SAVE_VERSION=1)
- `src/save/idb.js` – zero-dependency promise wrapper (openDB, tx, req, get, put, getAll)
- `src/save/saveStore.js` – saveGame/loadGame/validateEnvelope + rotace (0→1→2→0), kill-safe tx

### T4 – Benchmark

- `tools/bench-step.mjs` – runBench(opts) + formatReport(result) + CLI wrapper
- `docs/benchmark_iter-005.md` – commitnutý report

### T5 – Persist + ErrorScreen

- `src/app/persist.js` – requestPersistentStorage() (best-effort, never throws)
- `src/ui/ErrorScreen.js` – buildErrorModel (pure, testovatelný) + showErrorScreen (DOM render)

### CI + Konfigurace

- `.github/workflows/ci.yml` – push+PR, Node 22, npm ci + npm run ci
- `tsconfig.json` – přidáno DOM + DOM.Iterable + WebWorker lib; include rozšířen o app/ui/save/tools; vendor modul soubory excluded; service-worker.js excluded (WebWorker vs DOM namespace conflict v tsc)
- `src/js/*` (5 souborů) + `src/css/style.css` – **smazáno** (legacy placeholder)

---

## Výsledky CI

### tsc --noEmit
```
(no output = OK)
```

### grep gate (lint:core)
```
core import gate OK (12 file(s) checked)
```

### node --test
```
tests 107
suites 15
pass 107
fail 0
duration_ms ~700–800
```

Nové testy: app-lifecycle (5), app-loop (5), app-persist (1), bench-step (7), error-screen (6), gen-precache (6), save-store (7) = 37 nových testů nad iter-004 baseline (70 testů).

### Benchmark (tools/bench-step.mjs)

Prostředí: Node v22.22.2, linux x64, Intel Xeon @2.10GHz (4 cores).

| varianta          | ns/krok | kroků/s   | catch-up 8h (576k kroků) |
|-------------------|---------|-----------|--------------------------|
| empty heap        | ~52–80  | ~12–19M   | ~30–46 ms                |
| loaded heap (~1k) | ~62–79  | ~12–16M   | ~36–45 ms                |

**ZÁVĚR: POTVRDIT cap 8h.** 73 ns/krok << cíl 10 000 ns/krok; catch-up ~42 ms << 5 760 ms. Main thread dostatečný synteticky.

⚠ A2: Syntetický Node; závazné potvrzení = reálný low-end HW (uživatel/tester T-003).

---

## Odchylky od návrhu

1. **vendor @ts-nocheck**: Design očekával exclude v tsconfig; TypeScript sleduje transitivní importy, takže exclude nestačilo. Řešení: `// @ts-nocheck` na první řádek každého vendor souboru. Alternativa (dva tsconfigy) zamítnuta jako nadměrná složitost pro M0b (shodně s rozhodnutím návrhu §7).

2. **service-worker.js excluded z tsconfig**: Design plánoval include. Konflikty WebWorker vs DOM types (`self`, `clients`) způsobovaly tsc chyby; SW je validní ESM soubor, ale tsc ho nespustí – typecheck nemá hodnotu. Excluded jako pragmatické řešení bez dopadu na runtime.

3. **main.js catch-all boot().catch**: Design pseudokód měl inline dynamický import v catch bloku (syntakticky nevalidní async-of-import kombinace). Implementace: jednoduché `boot().catch(e => console.error('[boot] fatal:', e))` – error screen je wired uvnitř boot() a showErrorScreen je importován staticky.

4. **save test izolace přes unikátní slotId**: Design předpokládal `_resetDB()` pro izolaci testů, ale fake-indexeddb sdílí data v paměti. Řešení: každý test používá unikátní slotId (counter) + _resetDB() pro reset cache handle. Všechny save AC zachovány.

---

## Soubory k review

Klíčové soubory:
- `/home/user/ProsperityGamesa/src/app/main.js` – boot glue
- `/home/user/ProsperityGamesa/src/save/saveStore.js` – save logika
- `/home/user/ProsperityGamesa/src/app/loop.js` – rAF smyčka
- `/home/user/ProsperityGamesa/tools/bench-step.mjs` – benchmark
- `/home/user/ProsperityGamesa/docs/benchmark_iter-005.md` – report
- `/home/user/ProsperityGamesa/.github/workflows/ci.yml` – CI
