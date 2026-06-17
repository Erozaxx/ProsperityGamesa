# Review — iter-021 T-007 (M9b — RELEASE GATE)

- **Review ID**: REVIEW-021-007
- **Iteration**: iter-021 (M9b — DoD M9 = release kandidát; poslední milník master plánu M0–M9)
- **Task**: T-007 (reviewer, Opus — RELEASE GATE, právo re-run)
- **From**: reviewer
- **Brief**: BRIEF-021-007
- **Datum**: 2026-06-17
- **Branch**: feature/iter-021-init
- **Baseline (G1)**: merge-base s main = `2f5d7f1` (iter-020 M9a merge) → HEAD `6b4d4a0`
- **Metoda**: hodnoceno PROTI KÓDU + vlastní empirické spuštění gate (ne z tvrzení coderů/testera)

> ## VERDIKT: **GO (release kandidát)**
> Done-criteria projektu + acceptance criteria zadání SPLNĚNA. Determinismus G1 prokazatelně
> NEDOTČEN (hashState identický s iter-020). SW update SAVE-SAFE. Licence správně odložena na
> USER GATE (T-008). DoD M9 = release kandidát. **0 blocker, 0 major, 2 minor, 2 nit.**
> Žádný nález není release-blokující. Jediné zbývající release rozhodnutí (volba licence) je
> mimo scope agentů = user gate T-008, korektně neřešeno.

---

## 1. Tvrdé invarianty — ověřeno proti kódu (empiricky)

### INV-1 — Determinismus G1 IDENTICKÝ s iter-020 (KLÍČOVÉ) — **PASS**
Čtyři nezávislé důkazy, všechny ověřeny vlastním spuštěním:
1. **`git diff 2f5d7f1..HEAD -- src/core/` = PRÁZDNÉ** (ověřeno). Core engine nedotčen.
2. **`src/data/` změna = JEN `contracts.json` `_meta`** (ověřeno celý diff): `_meta.provenance`
   přeformulováno z `"derived (...) / approximated (...)"` → `"derived"` + nové pole
   `_meta.notes` se scope poznámkou. **Žádná herní hodnota** (cena/scaling/ID/práh) nezměněna;
   `balance.js` diff = prázdný (ověřeno).
3. **Golden-hash**: `test/m9a-regression.test.js` diff = prázdný (golden konstanty iter-020
   byte-for-byte nezměněné) a test prochází **17/17** na HEAD (vlastní běh) ⇒ `hashState`
   identický (seed A/B/C, Q1–Q4).
4. **`npm run lint:core` PASS** (vlastní běh): „core import gate OK (66 file(s))" — žádný
   `Date.now`/`Math.random`/DOM v core.
- **Sidecar/throttle/_meta MIMO hashState** (ověřeno v kódu): `RENDER_MIN_INTERVAL_MS=66` je
  UI konstanta v `src/ui/render.js:23` (NE balance.js); `now()` = `performance.now` čteno jen
  v UI vrstvě (`render.js:44-47`, `main.js` injekce). `lastExportAt` = localStorage sidecar
  (`persist.js:11` `prosperity.lastExportAt`), čistá funkce `evaluateExportReminder`, `_meta`
  není v persist schématu (`grep _meta src/app/persist.js src/save/` = 0).
- **Závěr:** M9b je čistě UI / PWA infra / docs / `_meta`. G1 nedotčen.

### INV-2 — SW update SAVE-SAFE (KLÍČOVÉ, R-F) — **PASS**
- `service-worker.js`: install **NEvolá** `skipWaiting()` automaticky (`:7-14`, nová verze
  čeká ve `waiting`); `message` listener volá `self.skipWaiting()` jen na `{type:'SKIP_WAITING'}`
  (`:18-22`).
- `src/app/sw-register.js:46-53` `accept()`: **`flushSave()` PŘED `postMessage(SKIP_WAITING)`** —
  `Promise.resolve(flushSave()).finally(() => waiting.postMessage(...))`. `controllerchange`
  → jednorázový reload (loop guard `reloading`, `:36-43`).
- `main.js`: SW registrace přesunuta **AŽ PO** `bootSequence` (`:542+`), aby `flushSave`
  (=`autosave.flush()`, vrací `Promise`) a `onUpdateReady` byly navázané před wireUpdateFlow.
- Save žije v IndexedDB (mimo `caches`); `activate` maže jen staré cache (`k !== PRECACHE_VERSION`,
  `:24-35`), nikdy object stores.
- `test/sw-update-flow.test.js` **5/5 PASS** (vlastní běh). Test #3 dokazuje pořadí
  `assert.deepEqual(order, ['flushSave','postMessage'])` + jednorázový reload (loop guard).
- Cache verze se nemíchají (waiting model brání half-swap mid-session). Offline start zachován
  (precache + SPA fallback `:48`).

### INV-3 — Render ≤15/s při ŽIVÉ dávce (MINOR-1) — **PASS**
- `test/render-throttle.test.js` 3/3 PASS (vlastní běh). Test #1 simuluje **živou dávku**:
  `requestRender()` každý frame (~16 ms) přes ~63 framů / 1 s a assertuje `paints ≤ 16`
  **A ZÁROVEŇ `paints ≥ 10`** — důkaz, že throttle skutečně maloval pod zátěží (ne falešný
  PASS z klidu). Test #2 = trailing render (poslední stav vždy vymalován). Test #3 = coalescing.
- Kód `render.js:80-98`: trailing-edge throttle, coalesce při `scheduled || trailingTimer`,
  trailing scheduler přes `setTimeoutFn`. Korektní.

### INV-4 — Licence = USER GATE — **PASS**
- **ŽÁDNÝ `LICENSE` soubor** v repu (`ls LICENSE*` = NONE) — ověřeno. User gate T-008 zachován.
- `PROVENANCE.md §6` = explicitní PLACEHOLDER („This section is a PLACEHOLDER. The licence is
  an explicit user decision … has NOT been made", `:86-110`), doporučení A=MIT/B=GPL-3.0/
  C=proprietární + společná pojistka (disclaimer „unofficial fan reimplementation").
- `node tools/audit-provenance.mjs` **PASS** (vlastní běh): „20 catalogs, 43 prose strings vs
  74 original-source files, **0 verbatim matches**".
- **.md vyloučeny z precache**: `grep -cE "PROVENANCE|KNOWN_ISSUES|README|\.md" src/precache.js`
  = **0**; `precache.js` diff = jen `PRECACHE_VERSION` content-hash bump.

---

## 2. Acceptance criteria zadání (release done-criteria) — ověřeno

| # | AC | Stav | Důkaz (ověřeno) |
|---|---|---|---|
| 1 | Hratelná hra v repu, offline | **PASS** | `npm run ci` 1566/1566 (vlastní běh); smoke 12 tabů 0 chyb; SPA fallback `service-worker.js:48`; e2e (T-006) smyčka+restore deterministická |
| 2 | Install na mobil + offline (PWA) | **PASS** | manifest+SW; `index.html` apple meta (`apple-mobile-web-app-*`, `mobile-web-app-capable`, `viewport-fit=cover`); precache idempotentní (regen → diff prázdný, vlastní běh) |
| 3 | Idle smyčka vyladěná (M9a) | **PASS** | M9a kalibrace zachována (golden hash 17/17); render throttle odděluje paint od simulace; offline catch-up zelený |
| 4 | Spolehlivý save/obnova vč. offline | **PASS** | export/import round-trip (T-006: restored hash === pre-export); SW update flush PŘED reload (INV-2); autosave na visibilitychange/pagehide |

> Pozn. (design §8): reálný iOS/Android install + pixel-rendering na notchi = **user-gate Q2**
> (mimo automatizaci). Syntetická náhrada (meta/CSS přítomnost) splněna; neblokuje release path.

---

## 3. Soulad s designem + DR-021-01

- **DR-021-01 MINOR-1/2/3** vyřešené:
  - MINOR-1 (render ≤15/s živá dávka) → INV-3 PASS (test #1 asserts paints ≥10 pod zátěží).
  - MINOR-2 (SW update message-driven skip-waiting) → INV-2 PASS (DR-021-01 §1 implementováno).
  - MINOR-3 (lastExportAt mimo hashState) → INV-1 PASS (localStorage sidecar, mimo persist schéma).
- **Architektura §3.4** (render ≤10–15/s) splněna; **§9.2/§9.4 PWA** (precache K2, R-F evikce,
  R-G provenance) splněny; **R-F** (persisted detekce + export reminder) v `persist.js`;
  **R-G** (verbatim 0, provenance flagy) v `audit-provenance.mjs`.
- Design „M9b = polish, ne nový engine kód" dodržen: 0 změn v core, App.js/render.js čistě
  prezentační.

---

## 4. Nálezy

### MINOR (2) — neblokující, doporučeno pro budoucí cleanup

- **MIN-1 — Kosmetická nesrovnalost v počtu sw-update testů.**
  `test/sw-update-flow.test.js` má **5** testů; impl summary T-004 uváděl 6 (potvrdil i QA
  T-006 jako kosmetiku). Všech 5 PASS, pokrytí kompletní (no-waiting / waiting / flush-order /
  updatefound / fresh-install). *Dopad:* žádný — jen dokumentační nesoulad.
  *Návrh:* opravit číslo v impl summary; žádná akce v kódu/testu nutná.

- **MIN-2 — `audit-touch-targets.mjs` je statický CSS audit (ne runtime).**
  `tools/audit-touch-targets.mjs` parsuje CSS deklarace, neměří reálný `getBoundingClientRect`
  (design §1 UX-1 to explicitně označuje za dostatečné a deterministické). Audit PASS (global
  button base `min-block-size:44px`). *Dopad:* teoreticky by selektor s 44px base, ale
  nulovým obsahem/overflow, mohl mít menší reálnou hit-area — v praxi nevzniká.
  *Návrh:* runtime audit = nice-to-have post-release; nebrání GO (shoda s designem §1 UX-1).

### NIT (2) — kosmetika

- **NIT-1 — `contracts.json` provenance reword.**
  `_meta.provenance` zkráceno z compound formy na `"derived"` + `notes`. Kosmetické zlepšení
  čitelnosti; `audit-provenance.mjs:128` parser stripuje parentetiku, takže obě formy procházejí.
  Žádná herní hodnota. *Návrh:* OK, ponechat.

- **NIT-2 — Banner texty pevně česky v `App.js`.**
  „Nová verze je připravena." / „Zálohuj svůj postup…" jsou inline v `App.js:71-83` (jako zbytek
  UI). Konzistentní se současným přístupem (žádná i18n vrstva). *Návrh:* žádná akce; i18n je
  mimo MVP scope.

---

## 5. Reuse / mrtvý kód / UI bez herní logiky

- **UI bez herní logiky:** `App.js` diff = dva bannery navázané na injektované callbacky
  (`onApplyUpdate`, `onExport`, `onDismissExportReminder`) — žádná herní logika, žádný `Date.now`
  ani RNG v UI/core. `render.js` throttle čte `now()` jen v UI vrstvě.
- **Reuse:** export reminder znovupoužívá existující `onExport`; `flushSave` = tenký bridge na
  `autosave.flush()`; SW update flow plně injektovatelný (čisté Node testy bez prohlížeče).
- **Mrtvý kód:** nenalezen. `evaluateExportReminder` / `isStoragePersisted` / sidecar gettery
  navázané v `main.js` boot. `audit-*.mjs` jsou gate skripty (mimo precache ROOTS).

---

## 6. Known issues (KNOWN_ISSUES.md)

Korektně dokumentované, **žádný release-blocker**. Všechny `low`/`medium` carry-over (chybí
serverová reference nebo nízká priorita): G-BUILD/RECRUIT-TXAUDIT (účetní řádek chybí, gold
správně), G-MILITARY-STATS (combat staty approx), G-CONTRACTS-* (minimální sada), G-LISTJOB/
GOODS/TECHS/SKILL (rekonstruováno), V1/V2/MIN-1, achievements `onUnlock:[]` (by design).
Stroj-čitelný zdroj `src/data/gap-report.json` (36 gapů). Žádný `critical/high` otevřený mimo
už uzavřené M4 data gapy. Release kandidát validní s evidovanými limity (architektura §8.5).

---

## 7. DoD M9 / release celkově

- **Master plán M0–M9 KOMPLETNÍ.** M9b = poslední milník = DoD M9.
- **Release kandidát:** hra je (1) hratelná end-to-end bez crashe (CI 1566/1566 + e2e T-006),
  (2) instalovatelná PWA (manifest/SW/apple meta/precache idempotentní), (3) offline funkční
  (precache + SPA fallback + catch-up), (4) idle smyčka vyladěná (M9a hash zachován, render
  throttle), (5) spolehlivý save vč. offline (round-trip + SW-update flush save-safe).
- **Done-criteria projektu** (`project/done-criteria.md`): AC ověřena (T-006 + tento review),
  QA = GO, dokumentace aktuální (README přepsán — grep starého skeletu = 0; PROVENANCE +
  KNOWN_ISSUES nové), decision record DR-021-01 doplněn. ✓
- **Jediné zbývající release rozhodnutí** = volba licence (user gate T-008), mimo scope agentů —
  korektně neřešeno (žádný LICENSE soubor, PROVENANCE §6 placeholder).

---

## 8. Stanovisko (explicitní)

- **Done-criteria + acceptance criteria zadání:** SPLNĚNA.
- **Determinismus G1:** NEDOTČEN (hashState identický s iter-020 — 4 nezávislé důkazy).
- **SW update SAVE-SAFE:** ANO (flushSave PŘED skipWaiting, save v IndexedDB přežije, cache
  se nemíchají, offline start zachován).
- **Licence = USER GATE:** ANO (žádný LICENSE soubor, PROVENANCE §6 placeholder, 0 verbatim).
- **DoD M9:** SPLNĚNO — release kandidát.

## VERDIKT: **GO (release kandidát)** — 0 blocker, 0 major, 2 minor, 2 nit (žádný release-blokující)

Doporučení: postoupit na user gate **T-008** (volba licence + rozhodnutí o veřejném vydání)
jako jediné zbývající release-kritické rozhodnutí mimo scope agentů.
