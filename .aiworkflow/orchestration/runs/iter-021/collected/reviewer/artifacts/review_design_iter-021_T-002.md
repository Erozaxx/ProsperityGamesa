# Review – Design M9b Release kandidát (iter-021, T-002)

- **Review ID**: REVIEW-021-002
- **Reviewer**: reviewer (Opus-level přísnost)
- **Datum**: 2026-06-15
- **Předmět**: `context/refs/design_iter-021_T-001.md` (DESIGN-021-001, architect)
- **Typ**: design/metodika review (NE kód), architektonický gate před tom-proxy
- **Brief**: BRIEF-021-002
- **Verdikt**: **GO-s-podmínkami** (3 podmínky, všechny minor/dokumentační — žádný blocker)

---

## 0. Metoda

Design hodnocen PROTI skutečnému kódu repa a architektuře iter-002. Ověřeno čtením:
`service-worker.js`, `src/ui/render.js`, `src/app/loop.js`, `src/app/persist.js`,
`src/app/autosave.js`, `src/app/lifecycle.js`, `src/save/saveStore.js`, `src/save/schema.js`,
`src/save/persistSchema.js`, `src/core/engine/rng.js` (`hashState`), `src/core/engine/clock.js`,
`src/ui/App.js`, `src/ui/styles.css`, `index.html`, `src/precache.js`, `tools/gen-precache.mjs`,
`icons/`, architektura §3.4/§6.1/§6.3/§9.2/§9.4, done-criteria.

**Souhrn:** Design je věcně přesný (všechna „Východiska z kódu" §0 ověřena jako pravdivá),
metodicky úplný a všechny tři nejrizikovější body release (determinismus, SW update bez ztráty
savu, licence=user gate) jsou ošetřeny správně. Nálezy jsou drobné a nemění verdikt.

---

## 1. Posouzení kritických bodů (POVINNÉ)

### 1.1 Determinismus nedotčen — **PASS** (klíčové)
- `hashState(state)` (`rng.js:69`) hashuje **celý předaný state objekt** přes `JSON.stringify`
  se sortovanými klíči. Determinismus tedy závisí výhradně na tom, CO je v state objektu.
- **Render-throttle (`RENDER_MIN_INTERVAL_MS=66`, trailing):** umístění v `render.js` (UI vrstva)
  je správné. `render.js:32` dnes coalescuje 1×/rAF ale NEthrottluje → renderuje ~60/s dokud
  `dirty` (potvrzeno: `loop.js:53-54` volá `onDirty()` při `dirty`, `clock.js:89` vrací
  `dirty: i>0`). Throttle čte `performance.now()` jen v UI render loopu; `clock.js`/core se nedotýká;
  konstanta je explicitně UI, NE `balance.js`. Dirty signál chodí dál, jen se render odloží/zahodí.
  → `hashState` se nehne. **Trailing render povinný** (§1 UX-3) je korektně vyžadován.
- **`lastExportAt` sidecar:** `saveStore.js` envelope = `{key, slotId, generation, savedAt,
  lastSimTimestamp, saveVersion, gameVersion, payload}`, kde `payload = applyPersist(state)`
  (deklarativní allowlist, `persistSchema.js`). `hashState` se počítá nad state/payload, NE nad
  envelope. `lastExportAt` jako pole envelope (vedle `savedAt`/`lastSimTimestamp`) nebo localStorage
  preference → MIMO payload → MIMO hashState. Design §2.2/§7.2 to předepisuje přesně takto.
  Architektura §6.1 (`lastSimTimestamp` jako envelope wall-clock pole) tento vzor potvrzuje.
- **`_meta.provenance`:** existuje jen na katalogových položkách (`types.d.ts:413`), persist je
  allowlist (co není deklarováno, neukládá se — arch §6.3) → `_meta` nevstoupí do payload.
  Design §7.5 to vyžaduje ověřit testem (správně).
- **Závěr:** Žádná M9b změna nezasahuje `src/core/**`, `src/data/*.json` herní hodnoty, RNG.
  Důkaz `hashState(simulate(seed,N))` před/po = identický (s iter-020) je správně postaven jako
  G1 gate (§7.9). Determinismus **nedotčen**.

### 1.2 SW update bez ztráty savu — **PASS** (klíčové, R-F)
- Současný stav potvrzen: `service-worker.js:11` `skipWaiting()` v install + `:24` `clients.claim()`
  → okamžitý přechod bez promptu. Design DR-021-01 §1 správně přechází na message-driven
  skip-waiting (`{type:'SKIP_WAITING'}`) + `updatefound` detekce v `sw-register.js` + UI prompt +
  `postMessage`→`controllerchange`→`reload` s guardem proti loop reload.
- **Save safety:** `autosave.requestSave('hide')` existuje a bypassuje throttle
  (`autosave.js:40-46`); je už wired na `visibilitychange`/`pagehide` (`lifecycle.js:24-25`,
  `main.js:348-352`). Vynucení před reloadem (§2.3 save safety / invariant 3) je proveditelné
  s existující infrastrukturou. Save žije v IndexedDB (`saveStore.js` stores `slots`/`saves`),
  update flow maže jen `caches` (`service-worker.js:14-25` filtruje cache keys, IndexedDB se
  netýká). Cache verze se nemíchají za běhu, protože nová verze čeká ve `waiting` až do user volby.
- **Offline start zachován:** precache úplný (K2, `gen-precache.mjs` content-hash), SPA fallback
  `caches.match('./index.html')` (`service-worker.js:38`) ponechán.
- **Závěr:** SW update **bez ztráty savu**, bez míchání cache verzí, offline zachován.

### 1.3 Evikce export prompt — **PASS** (R-F)
- `persist.js` volá `navigator.storage.persist()` (arch §6.1). Design přidává
  `persisted()` detekci (EV-2) + export reminder při `daysSinceLastExport > 7 || persisted()===false`
  (§2.2). `daysSinceLastExport` se počítá z `lastExportAt` sidecaru (mimo hashState, viz 1.1),
  `Date.now()` čten jen v `app/` vrstvě — invariant 1 zachován. Banner dismissable (idle žánr
  neotravuje). Propojení s existujícím `exportString.js`/`onExport` (recovery) korektní.
- **Závěr:** Evikce ošetřena, sidecar MIMO hashState. 7 dní je rozumný default (konfigurovatelný).

### 1.4 Mobile UX měřitelné — **PASS s podmínkou (P-1)**
- Cíle jsou měřitelné a deterministicky testovatelné: touch ≥44px (statický CSS audit), 0 horizontal
  overflow @320/360/390 (smoke `scrollWidth<=clientWidth+1`), render ≤15/s (Node fake raf/now unit
  test).
- **render.js ~60/s nález (§3.4) je SPRÁVNÝ:** arch §3.4 (řádek 151, 219) explicitně cíluje
  „≤10–15 re-renderů/s", ale `render.js` to NEvynucuje (coalescuje jen 1×/rAF). Fix je proveditelný
  čistě v UI vrstvě (time-gate v `requestRender`). Potvrzeno proti kódu.
- Touch-target nález potvrzen: `styles.css:28` `.speed button` padding `0.4rem 0.8rem`,
  `:64` `.market-actions button` padding `0.25rem 0.5rem` → pod 44px. iOS 100vh: `styles.css:15,17`
  `height:100%`/`min-height:100vh` bez `dvh`/`env()` → nález správný. 12 tabů v `App.js:18-31`
  potvrzeno (nikoli jen "12" obrazovek, ale 12 reálných TABS) → tab-bar overflow reálný.
- **P-1 (minor):** UX-3 audit „render ≤15/s" by měl explicitně testovat i scénář **2× rychlost +
  probíhající catch-up/offline summary** (ty mají vlastní `requestRender`). Design to zmiňuje
  („NEthrottlují agresivně"), ale acceptance kritérium nesmí být splnitelné jen v klidovém stavu —
  test musí pokrýt živou dávku, jinak je „≤15/s" falešně PASS. Doplnit do measurable summary.

### 1.5 Licence = user gate — **PASS** (R-G)
- Metodika R-G úplná a správná: čísla/balanc/struktura = fakta (nechráněné, přebíráme 1:1);
  znění/grafika/jména/lore = vlastní/parafráze (R-G). Klasifikace §3.1 konzistentní s M8
  (`_meta.provenance='original-paraphrased'`). `audit-provenance.mjs` jako opakovatelný verbatim
  gate (0 shod = PASS) je správné zpřísnění M8 ad-hoc skenu.
- **Licence správně směrována na USER GATE:** §3.4 dává jen DOPORUČENÍ (MIT+disclaimer jako návrh A,
  alt GPL-3.0/proprietární), §3.4/§6/§7.8 explicitně: **žádný `LICENSE` soubor před rozhodnutím**,
  `PROVENANCE.md §6` = PLACEHOLDER, rozhodnutí eskaluje uživateli (T-008), tom-proxy nepřebírá jako
  rozhodnutí. Ověřeno: repo dnes NEMÁ `LICENSE` ani projektový `PROVENANCE.md` (jen
  `doc/original_source/PROVENANCE.md` pro originál). Směrování korektní a nevratnost respektována.
- Ověřeno: `gen-precache.mjs:31-37` EXCLUDE obsahuje `/\.md$/` → `PROVENANCE.md`/`README.md`/
  `KNOWN_ISSUES.md` se NEdostanou do precache automaticky; ROOTS (`gen-precache.mjs:19-28`)
  neobsahují `doc/` ani `tools/` → `doc/original_source/**` a audit skripty NEjsou distribuovány.
  Design §3.2/§7.4 tvrzení potvrzeno proti kódu.
- **Závěr:** Licence = **user gate**, metodika úplná, distribuce čistá.

### 1.6 Split C-021-A / C-021-B — **SOUHLAS s podmínkou (P-2)**
- C-021-A = UI/PWA (`src/ui/render.js`, `src/ui/styles.css`, `index.html`, `src/ui/App.js`,
  `service-worker.js`, `src/app/sw-register.js`, `src/app/persist.js`/evikce modul).
  C-021-B = licence/docs (`PROVENANCE.md`, `tools/audit-provenance.mjs`, `_meta.provenance` v
  `src/data/*.json` jen metadata, `README.md`, `KNOWN_ISSUES.md`). Soubory **disjunktní** → paralelní
  běh OK, oba Sonnet (M komplexita) přiměřené.
- **P-2 (minor):** Oba balíky mění obsah v precache ROOTS (A mění `src/ui`/`src/app`/`service-worker`/
  `index.html`; B mění `src/data/*.json` přidáním `_meta` → ZMĚNA OBSAHU souboru v ROOTS `src/data`
  → změní content-hash → novou `PRECACHE_VERSION`). Tedy NENÍ pravda, že „B přidá vše mimo precache
  scope" (design §5 to částečně přiznává, ale formulace „audit tool mimo ROOTS" zastírá, že
  `_meta` editace `src/data/*.json` JE v ROOTS). → Oba re-runnou `gen-precache.mjs` a poslední běh
  + commit `precache.js` MUSÍ proběhnout sekvenčně po merge obou (jeden finální gen-precache), jinak
  konflikt v `precache.js`. Design to v §5 „Pořadí pokud sériově" naznačuje; podmínka: orchestrátor
  to musí vynutit jako sekvenční krok (ne paralelní gen-precache). Doporučuji explicitně zapsat do
  plan.md jako závislost A,B → (finální gen-precache) → T-006.

### 1.7 DoD M9b / release — **PASS**
- Design pokrývá acceptance ze zadání: install mobil (OFF-1/2 + apple meta + manifest), offline
  (OFF-3/4/5 precache+SPA fallback), idle smyčka (render throttle udrží výkon, core nedotčen),
  spolehlivý save (IndexedDB přežije SW update, autosave('hide'), rotující generace N=3, export
  recovery). Měřitelná summary per task (T1–T4) + test loop §7.9 (`npm run ci` determinismus =
  identický s iter-020, smoke overflow/throttle/touch/provenance, e2e release scénář). DoD-pokrytí
  úplné. Žádný carry-over gap není release-blocker (§8.5 — všechny low/medium, žádný critical/high).

---

## 2. Nálezy

### BLOCKER — 0
Žádný.

### MAJOR — 0
Žádný.

### MINOR — 3

- **MINOR-1 (= P-2): Precache re-gen není čistě paralelizovatelný.** C-021-B edituje
  `src/data/*.json` (přidání `_meta.provenance`) — to JE v precache ROOTS (`gen-precache.mjs:19-28`,
  `src/data`), takže změní `PRECACHE_VERSION`. Formulace §5 „B přidá mimo precache scope" je
  nepřesná. **Návrh:** v plan.md vynutit jediný finální `gen-precache.mjs` + commit `precache.js`
  AŽ po merge A i B (sekvenční gate před T-006), aby nevznikl konflikt/zastaralý `precache.js`.

- **MINOR-2 (= P-1): Render-throttle test musí pokrýt živou dávku, ne klid.** Acceptance „≤15
  renderů/s" je triviálně splnitelné v klidu (dirty=false). **Návrh:** unit test v §1 UX-3 explicitně
  zahrne scénář 2× rychlost + probíhající kroky (každý frame dirty) NEBO catch-up progress, aby
  prokázal, že throttle drží cap i pod plnou simulační zátěží. Doplnit do T1 measurable summary.

- **MINOR-3: `_meta` editace `src/data/*.json` musí mít determinismus-důkaz v acceptance B.**
  Design §7.5 to zmiňuje, ale C-021-B (§5) measurable summary neuvádí explicitní „hashState před/po
  přidání `_meta` = identický" jako PASS kritérium balíku B. Protože B sahá do `src/data` (kde žije
  i herní data), je riziko, že editor omylem hne herní hodnotou. **Návrh:** přidat do C-021-B
  acceptance: `npm run ci` determinismus G1 MUSÍ projít po `_meta` změnách (stejný gate jako A).

### NIT — 2

- **NIT-1: Cesty v split tabulce §5 a v briefu jsou zkrácené.** Design §5 píše `styles.css`,
  `App.js`, `render.js` bez prefixu, ale skutečné cesty jsou `src/ui/styles.css`, `src/ui/App.js`,
  `src/ui/render.js`. Brief navíc uvádí `src/save/persist.js`, který NEEXISTUJE — persist je
  `src/app/persist.js` (design §0 to má správně). Drobnost, ale coder by neměl hledat na špatném
  místě. **Návrh:** v handoff briefech coderům uvést plné cesty (`src/ui/`, `src/app/`).

- **NIT-2: OFF-2 PNG ikona — kritérium rozhodnutí chybí.** `icons/` má jen `icon.svg` (potvrzeno).
  Design §6 Alt nechává PNG sadu jako „nice-to-have pokud SVG install selže", ale neurčuje, KDO/jak
  ověří Android install kritéria (uživatel? smoke?). **Návrh:** explicitně přiřadit ověření OFF-2 na
  user-gate Q2 (jako iOS), aby PNG fallback nezůstal v limbu.

---

## 3. Podmínky GO (musí být splněny v implementaci / dispatchi)

1. **P-1 / MINOR-2:** render-throttle acceptance test pokrývá živou dávku (2× rychlost + kroky),
   ne jen klidový stav.
2. **P-2 / MINOR-1:** orchestrátor vynutí jediný finální `gen-precache.mjs` + commit `precache.js`
   AŽ po merge C-021-A i C-021-B (sekvenční gate před T-006); ne paralelní gen-precache.
3. **MINOR-3:** C-021-B (`_meta.provenance` v `src/data/*.json`) má v acceptance explicitní
   determinismus G1 gate (`hashState` před/po identický), protože sahá do `src/data`.

Žádná podmínka není blokující pro architektonické GO — jsou to upřesnění acceptance/dispatch, ne
změny designu. Licence zůstává user gate (nevstupuje do podmínek workflow).

---

## 4. Verdikt

**GO-s-podmínkami.**

Design M9b je věcně přesný (všechna východiska z kódu ověřena), metodicky úplný a tři nejrizikovější
osy release jsou ošetřeny správně:
- **Determinismus nedotčen** — PASS (throttle + sidecar + `_meta` všechny MIMO `hashState`; G1 gate).
- **SW update bez ztráty savu** — PASS (message-driven skip-waiting + `autosave('hide')` + IndexedDB
  mimo cache; offline zachován).
- **Evikce** — PASS (`persisted()` + reminder, `lastExportAt` sidecar mimo hashState).
- **Mobile UX měřitelné** — PASS (touch/overflow/render-cap deterministicky testovatelné; nález
  ~60/s správný; fix v UI vrstvě).
- **Licence = user gate** — PASS (jen doporučení, žádný `LICENSE` před rozhodnutím, eskalace povinná).
- **Split A/B** — SOUHLAS (disjunktní, oba Sonnet), s podmínkou sekvenčního gen-precache.

Doporučení: postoupit k tom-proxy / dispatchi coderů C-021-A a C-021-B se splněním 3 podmínek výše.

**Nálezy:** 0 blocker / 0 major / 3 minor / 2 nit.

---

*Konec review. Hodnoceno proti kódu (service-worker, render, loop, autosave, lifecycle, saveStore,
schema, persistSchema, rng/hashState, clock, App, styles, index.html, precache, gen-precache, icons)
a architektuře iter-002 (§3.4, §6.1, §6.3, §9.2, §9.4). M9b = poslední milník = DoD M9 = release
kandidát. Licence = user gate (T-008).*
