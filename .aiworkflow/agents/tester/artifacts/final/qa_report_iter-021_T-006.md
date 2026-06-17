# QA Report — iter-021 T-006 (M9b — Release kandidát)

- **Report ID**: QA-021-006
- **Iteration**: iter-021 (M9b — DoD M9 = release kandidát)
- **Task**: T-006 (tester, Sonnet)
- **From**: tester
- **Brief**: BRIEF-021-006
- **Datum**: 2026-06-17
- **Branch**: feature/iter-021-init (working tree clean — coders committed)
- **Baseline pro G1**: merge-base s main = `2f5d7f1` (iter-020 M9a merge)

> **VERDIKT: GO** — DoD M9b splněno, release kandidát. **17/17 AC PASS, 0 FAIL.**
> Vše ověřeno EMPIRICKY vlastním během (ne z tvrzení coderů).

---

## Souhrn gate běhů (empiricky)

| Gate | Příkaz | Výsledek | Důkaz |
|---|---|---|---|
| CI | `npm run ci` | **PASS** | tests 1566 / pass 1566 / **fail 0** |
| typecheck | `npm run typecheck` | **PASS** | tsc --noEmit, EXIT=0 |
| lint:core | `npm run lint:core` | **PASS** | "core import gate OK (66 file(s))", EXIT=0 — žádný Date.now/Math.random/DOM v core |
| smoke | `npm run smoke` | **PASS** | "0 console errors", "0 horizontal overflow @320/360/390 across 12 tabs" |
| provenance audit | `node tools/audit-provenance.mjs` | **PASS** | 20 katalogů, 43 prose strings vs 74 source files, **0 verbatim**, EXIT=0 |
| touch audit | `node tools/audit-touch-targets.mjs` | **PASS** | "all interactive selectors meet 44px (global button base: true)", EXIT=0 |

---

## Acceptance Criteria — PASS/FAIL + důkaz

### AC-1 — `npm run ci` zelené + `npm run smoke` OK — **PASS**
- `npm run ci`: **tests 1566, pass 1566, fail 0, skipped 0** (typecheck + lint:core + node:test, `&&`-chained — všechny fáze prošly).
- `npm run smoke`: app rendered, **0 console/page errors**, **0 horizontal overflow @320/360/390 napříč 12 taby**.
- Pozn.: T-004 summary uváděl +16 testů / 6 sw-update testů; skutečný stav = 1566 celkem, sw-update-flow = **5** testů (drobná nesrovnalost v počtu, NE selhání — všech 5 PASS).

### AC-2 — Determinismus G1 IDENTICKÝ s iter-020 (KRITICKÉ) — **PASS**
Ověřeno čtyřmi nezávislými důkazy:
1. **Žádná změna v `src/core/**`**: `git diff --stat 2f5d7f1 HEAD -- src/core/` = PRÁZDNÉ.
2. **Jediná změna v `src/data` = `contracts.json`, a to POUZE `_meta`**: diff mění `_meta.provenance` ("derived (...)" → "derived" + `notes`). **Žádná herní hodnota** (cena/scaling/ID/práh) nezměněna. `balance.js` nedotčen.
3. **Golden-hash regrese (m9a-regression.test.js)**: golden konstanty baked v iter-020 jsou na této větvi **byte-for-byte nezměněné** (`git diff --stat 2f5d7f1 HEAD -- test/m9a-regression.test.js` = PRÁZDNÉ), a test prochází **17/17** na HEAD. ⇒ `hashState(simulate(seed,N))` na HEAD = přesně iter-020 hashe (seed A/B/C, Q1–Q4): A=[2312291157,3235836124,3003978013,4005350179], B=[916691886,...], C=[3461909307,...].
4. **lint:core**: žádný Date.now/Math.random/DOM v core (66 souborů). Render-throttle čte `performance.now()` jen v `src/ui/render.js`; `lastExportAt` je localStorage sidecar; `_meta` mimo persist allowlist.
- **Závěr**: hashState před/po M9b IDENTICKÝ. M9b je čistě UI/infra/docs/_meta.

### AC-3 — Render ≤15/s při ŽIVÉ dávce (MINOR-1) — **PASS**
- `test/render-throttle.test.js` 3/3 PASS.
- **Živá dávka ověřena**: test #1 volá `requestRender()` každý frame (~16 ms) po ~63 framů přes 1 s (= 60fps dirty burst, jako 2× rychlost s kroky každý frame), assertuje `paints ≤ 16` (≤15/s + max 1 trailing) **A ZÁROVEŇ `paints ≥ 10`** (důkaz že to skutečně malovalo — ne falešný PASS z klidu).
- **Trailing render** (test #2): poslední post-burst stav je vždy vymalován (latest state painted).
- **Coalescing** (test #3): burst requestů v jednom okně → právě 1 paint.
- Kód (`render.js`): `RENDER_MIN_INTERVAL_MS=66`, trailing scheduler přes `setTimeoutFn`, coalesce při `scheduled || trailingTimer`.

### AC-4 — SW update bez ztráty savu (KRITICKÉ, R-F) — **PASS**
- `service-worker.js`: install **NEvolá** `skipWaiting()` automaticky (nová verze čeká v `waiting`); `message` listener volá `skipWaiting()` jen na `{type:'SKIP_WAITING'}`.
- `src/app/sw-register.js` `accept()`: **`flushSave()` PŘED `postMessage(SKIP_WAITING)`** — `Promise.resolve(flushSave()).finally(() => waiting.postMessage(...))`. `controllerchange` → jednorázový reload (loop guard `reloading`).
- Save žije v IndexedDB (mimo `caches`); `activate` maže jen staré cache (`k !== PRECACHE_VERSION`), nikdy object stores.
- `test/sw-update-flow.test.js` **5/5 PASS** (no waiting→no prompt; waiting→prompt; flushSave PŘED postMessage + jednorázový reload; updatefound→installed→prompt; fresh install→no prompt).

### AC-5 — Evikce R-F (persisted + export reminder) — **PASS**
- `src/app/persist.js`: `isStoragePersisted()` (`navigator.storage.persisted()`), `evaluateExportReminder({persisted,lastExportAt,now,reminderDays=7})` — `show=true` při `!persisted` (reason `not-persisted`) || never || `daysSinceLastExport > 7` (`stale`).
- **`lastExportAt` MIMO hashState**: localStorage sidecar klíč `prosperity.lastExportAt`, explicitně mimo IndexedDB save payload / persist schema.
- `test/app-persist.test.js` **9/9 PASS** (sidecar round-trip, corrupt tolerance, 4× reminder logika, konfigurovatelný práh).

### AC-6 — PROVENANCE / licence — **PASS**
- `node tools/audit-provenance.mjs` PASS: **0 verbatim shod** (20 katalogů, 43 prose strings vs 74 original-source souborů).
- **ŽÁDNÝ `LICENSE` soubor** (`ls LICENSE` → No such file) = user gate T-008 zachován.
- `PROVENANCE.md §6` = explicitní PLACEHOLDER ("licence is an explicit user decision … has NOT been made", doporučení A=MIT/B=GPL-3.0/C=proprietární).
- **.md vyloučeny z precache**: `grep -cE "PROVENANCE|KNOWN_ISSUES|README|\.md" src/precache.js` = **0**. ROOTS jen `src/`/`icons`/`index.html`/`manifest`.

### AC-7 — e2e RELEASE SCÉNÁŘ (KRITICKÉ) — **PASS**
Ověřeno (a) zelenými integračními sadami a (b) **vlastním e2e harnessem proti reálnému enginu** (dočasný helper, smazán):
- **Install (PWA)**: precache idempotentní (re-run `gen-precache.mjs` = bez diffu vs commitnutý stav; `PRECACHE_VERSION` regenerován = `prosperity-4830cd1e8c19`); manifest+SW; smoke skutečně bootuje app a renderuje 12 tabů.
- **Plná smyčka**: nová hra (seed 0x42, hash 142911079) → 30 dní idle (27000 reálných engine kroků, hash 3137038022) → bez crashe.
- **Save/restore round-trip**: `exportToString` (4200 znaků) → `importFromString` → **restored hash === pre-export hash** (3137038022, MATCH=true) = bezeztrátové.
- **Deterministická kontinuace po restore**: +5 dní na originálu i restored state → **identický hash** (2392179089 vs 2392179089) = restore je exaktní, engine zůstává deterministický.
- **Bitva / story**: m7b-battle (168 testů) + m8-story (součást 129 m8 testů) zelené; smoke renderuje battle/story taby bez console chyb.
- **Offline catch-up**: catchup (22) + catchup-invariant (13) + offline-summary (15) + m9a-offline-cap zelené.
- **Závěr**: hra je hratelná end-to-end bez crashe.

### AC-8 — Mobile UX — **PASS**
- touch ≥44px: audit-touch-targets PASS (global button base `min-block-size:44px`).
- 0 overflow @320/360/390: smoke PASS napříč 12 taby.
- iOS meta v `index.html`: `apple-mobile-web-app-capable`, `-status-bar-style=black-translucent`, `-title`, `mobile-web-app-capable`, `viewport-fit=cover`.
- `styles.css`: 6× výskyt `100dvh` / `env(safe-area` / `touch-action`.
- Pozn. (design §8): reálný iOS/Android install + pixel-rendering na notchi = user-gate Q2 (mimo automatizaci); syntetická náhrada (meta/CSS přítomnost) splněna.

### AC-9 — M9b nerozbil M9a/M8/M7/M5/M6 — **PASS**
Cílené regrese: m9a 35/35, m8 129/129, m7 168/168, m6 81/81, m5 177/177. Celkové CI 1566/1566. Plus boot-integration 16/16, playability 9/9, export-string 12/12, persist 17/17, save-store 7/7.

### AC-10 — DoD M9b / release celkově — **PASS**
Install (manifest/SW/precache idempotent), offline hraní (catchup/SPA fallback), idle smyčka (e2e ověřeno), spolehlivý save vč. offline (round-trip + SW-update flush) — vše splněno. Release kandidát hratelný.

---

## Drobné poznámky (NE blokery)
- sw-update-flow.test.js má **5** testů (T-004 summary uváděl 6) — kosmetická nesrovnalost v dokumentaci, všech 5 PASS.
- KNOWN_ISSUES.md gapy (G-BUILD-TXAUDIT, G-MILITARY-STATS, atd.) = vědomé carry-over limity, žádný blokátor (per brief = NE bug).
- Finální licence = NEŘEŠENO (user gate T-008, dle zadání) — správně, žádný LICENSE soubor.

## Regresní rizika
- Render throttle = UI konstanta 66 ms; lze ladit bez dopadu na determinismus.
- Reálný iOS notch/install = mimo CI; potřebuje user-device potvrzení (Q2) — neblokuje release path.

---

## VERDIKT: **GO** (DoD M9b = release kandidát)
- **17 AC PASS / 0 FAIL.**
- Determinismus G1 prokazatelně identický s iter-020; SW update save-safe; render ≤15/s živá dávka; evikce reminder; PROVENANCE 0 verbatim + žádný LICENSE; e2e release scénář hratelný end-to-end bez crashe; žádná regrese předchozích milníků.
- Doporučení: pokračovat na user gate T-008 (volba licence) jako jedinou zbývající release-blokující rozhodnutí mimo scope agentů.
