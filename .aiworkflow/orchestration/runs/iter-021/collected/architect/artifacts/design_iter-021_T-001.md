# Design – M9b Release kandidát (iter-021, T-001)

- **Design ID**: DESIGN-021-001
- **Iteration**: iter-021 (M9b – Release kandidát; poslední milník, DoD M9 = release)
- **Task**: T-001 (architect, Opus)
- **Brief**: `context/inbox/brief_architect_T-001_iter-021.md` (BRIEF-021-001)
- **Autor**: architect
- **Datum**: 2026-06-15
- **Status**: final

> **Klíčový princip (release kandidát):** M9b je čistka a polish, NE nový engine kód.
> Vše release-critical. T1 (mobile UX) a T2 (PWA) jsou **prezentační/infra vrstva MIMO
> deterministický herní stav** — nesmí se dotknout `hashState`, core, ani RNG. T3 (licence)
> architektura jen **doporučuje** — **finální rozhodnutí = explicitní user gate** (nevratné,
> právní). Tom-proxy NEROZHODUJE licenci, eskaluje skutečnému uživateli.

> **Tvrdé invarianty (platí pro VŠECHNY tasky M9b):**
> 1. **Determinismus nedotčen**: žádná změna v `src/core/**`, `src/data/*.json` (herní data),
>    `balance.js`, RNG. UI/PWA změny žijí v `src/ui/`, `src/app/`, `service-worker.js`,
>    `manifest.webmanifest`, `styles.css`, `index.html`, README/PROVENANCE. Žádný `Date.now`/
>    `Math.random`/DOM se NEpřidává do core. Důkaz: `hashState(simulate(seed,N))` před/po M9b identický.
> 2. **Precache úplný (K2)**: každý nový/přejmenovaný statický soubor → re-run
>    `node tools/gen-precache.mjs`; `src/precache.js` je commitnutý výstup, nikdy ručně editovaný.
> 3. **SW update nesmí ztratit save**: save žije v IndexedDB (mimo cache); update flow nesmí mazat
>    object stores `slots`/`saves`, jen `caches`.
> 4. **PROVENANCE — fakta vs. obsah**: čísla/balanc (army prahy, ceny, scaling) NEpodléhají R-G
>    (jsou to data/fakta, nechráněná). Znění/grafika/jména/příběh PODLÉHAJÍ R-G (vlastní/parafráze).

---

## 0. Východiska z kódu (ověřeno v repu)

| Fakt | Místo | Stav / dopad na M9b |
|---|---|---|
| Render loop = 1× per rAF | `src/ui/render.js:32` `requestRender` | **Renderuje se každý frame (~60/s)** dokud `dirty` — coalescuje jen násobné requesty v jednom rAF, NEthrottluje na 10–15/s. **T1 musí throttle doplnit.** |
| Dirty trigger | `src/app/loop.js:53-54` + `clock.js:89` | `onDirty()` se volá při `stepsRun>0` (každý frame, kde proběhl ≥1 krok). Při 1× = ~20 kroků/s → dirty každý frame. |
| Viewport meta | `index.html:5` | `viewport-fit=cover, user-scalable=no` ✓ (safe-area připraveno, zoom vypnut). |
| 100vh / safe-area CSS | `styles.css:15,17` | `html,body{height:100%}`, `#app{min-height:100vh}` — **iOS 100vh bug (URL bar) NEřešen** (`dvh`/`-webkit-fill-available` chybí); **safe-area `env()` insety nejsou** přes `viewport-fit=cover`. T1. |
| Touch-target velikosti | `styles.css` (speed/market/tech/battle btns) | Tlačítka `padding 0.25–0.4rem` → některá **<44×44 px** (min. dotykový cíl). T1 audit. |
| 12 tabů v hlavičce | `App.js:18-31` `TABS` | 12 záložek v jednom řádku → na úzkém viewportu přetékají; potřeba scroll/wrap. T1. |
| Market tabulka overflow | `styles.css:56-58` `.table-scroll` | Už má `overflow-x:auto` fallback (playtest #5) ✓. Zone/battle tabulky podobně řešeny. |
| SW update strategie | `service-worker.js:11,24` | `self.skipWaiting()` v install + `clients.claim()` v activate → **nová verze přebírá okamžitě bez prompту** → riziko: aktivní hra dostane nový kód uprostřed sezení, otevřené moduly z různých cache verzí. T2. |
| SW fetch fallback | `service-worker.js:38` | cache miss offline → `caches.match('./index.html')` (SPA fallback) ✓; runtime cache.put pro nové GET ✓. |
| persist() při startu | `src/app/persist.js` + `main.js:452` | `navigator.storage.persist()` volán best-effort ✓. **Chybí**: detekce evikce + výzva k exportu po dlouhé době. T2 (R-F). |
| Export/import | `src/save/exportString.js` + `main.js:276-295` | Funkční (envelope lz-string base64, clipboard write, prompt import) ✓. Návod chybí. T4. |
| README | `README.md` | **ZASTARALÝ** — popisuje starý tap-to-earn skelet (`game.js/storage.js/ui.js`, „max 12 h", localStorage). Neodpovídá rebuildu. T4 přepsat. |
| PROVENANCE | `doc/original_source/PROVENANCE.md` | Pokrývá **originál** (zdroj dumpu). **Chybí projektový `PROVENANCE.md`** pro rebuild assety/texty/jména. T3. |
| Gap-report | `src/data/gap-report.json` | 36 gapů, většina `severity:low`, `milestone:M9`/`M6`/`M5` → zdroj „known issues" pro T4. |

**Důsledek:** jediná funkční mezera proti DoD je **render throttle** (T1), **SW update prompt + evikce výzva** (T2), **projektová PROVENANCE + licence doporučení** (T3), **release docs** (T4). Žádný core zásah.

---

## 1. T1 — Mobile UX polish (MĚŘITELNÉ cíle) — **release-critical**

Cíl: hra je pohodlně hratelná a výkonná na úzkém mobilu (≥320 px) vč. iOS Safari. Vše v `src/ui/` + `styles.css` + `index.html`. **Žádný core/state zásah.**

### UX-1 — Dotykové cíle (touch targets)
- **Cíl (měřitelný):** všechny interaktivní prvky (tlačítka, taby, odkazy) mají **min. 44×44 CSS px** efektivní dotykovou plochu (WCAG 2.5.5 / Apple HIG). Měří se: `min-height:44px; min-width:44px` nebo dostatečný `padding` + `line-height` na klikatelném prvku.
- **Jak:** zavést CSS util třídu `.tap` (`min-block-size:44px; min-inline-size:44px; display:inline-flex; align-items:center; justify-content:center;`) a aplikovat na `.speed button`, `.market-actions button`, `.tech-buy-btn`, `.battle-action-btn`, `.building-card button`, `.quest-actions button`, `.contract-actions button`, taby. Malé ikonky → zvětšit hit-area přes padding, ne vizuál.
- **Audit/test:** statický grep/lint nad `styles.css` — každý selektor `button`/`[role=tab]` má buď `.tap`, nebo `min-height>=44px`. Doporučeno: jednoduchý `tools/audit-touch-targets.mjs` (parsuje CSS deklarace, vypíše prvky pod prahem) → tester spustí, 0 nálezů = PASS. (Pozn.: plný runtime `getBoundingClientRect` audit je nice-to-have; statická CSS kontrola je dostatečná a deterministická.)

### UX-2 — Layout úzkých viewportů
- **Cíl:** žádný horizontální přetok (žádný `overflow-x` scroll na `body`) na šířkách **320 / 360 / 390 px**; tab bar se nerozbije.
- **Jak:**
  - **Tab bar** (`App.js` TABS, 12 položek): obalit `.tabbar` s `display:flex; overflow-x:auto; -webkit-overflow-scrolling:touch; scroll-snap-type:x;` (vodorovný scroll proužek tabů) NEBO `flex-wrap:wrap`. Doporučení: **scroll bar** (zachová jeden řádek, palcem ovladatelné) — `flex-wrap` na 12 tabech udělá 3 řádky a sní výšku. Aktivní tab `scrollIntoView` (UI-only, žádný state).
  - Tabulky (market/zones/battle) už mají `.table-scroll` — ověřit, že VŠECHNY široké bloky ho mají.
  - `#app { padding }` a karty `max-width:100%` na `@media (max-width:480px)` (částečně už je).
- **Audit/test:** smoke (`tools/smoke.mjs`) rozšířit o kontrolu `document.documentElement.scrollWidth <= clientWidth + 1` na šířce 360 px (headless viewport) napříč všemi taby → 0 přetoků = PASS.

### UX-3 — Render performance ≤ 10–15 re-renderů/s
- **Problém (z kódu):** `render.js` renderuje 1× per rAF dokud loop běží a kroky probíhají → ~60 re-renderů/s. To je render daň, kterou §3.4 architektury explicitně zakazuje („cílově ≤10–15 re-renderů/s").
- **Cíl (měřitelný):** ≤ **15 re-renderů/s** (perioda ≥ ~66 ms) i při 2× rychlosti a probíhající simulaci. UI snímek je stejně agregátní — vyšší frekvence nic nepřidává.
- **Jak (UI-only, mimo core):** v `render.js` přidat **time-gate na `requestRender`**:
  ```
  RENDER_MIN_INTERVAL_MS = 66   // ~15 fps cap; konstanta UI vrstvy, NE balance.js
  requestRender(): pokud (now - lastRenderMs) < RENDER_MIN_INTERVAL_MS → naplánuj jeden trailing render
                   na zbývající čas (setTimeout), jinak render hned přes rAF.
  ```
  - Čas přes `performance.now()` se čte **v UI vrstvě** (`render.js`/`app/`), NIKDY ne v core — `clock.js` zůstává beze změny, dirty signál chodí dál každý frame, ale **render se zahodí/odloží**, pokud od posledního uplynulo < 66 ms. Tím se odděluje frekvence simulace (live) od frekvence malování.
  - **Trailing render povinný** (ne jen leading throttle), aby poslední stav po dávce nezůstal nevykreslen.
  - Catch-up progress a offline summary mají vlastní explicitní `requestRender()` — ty se NEthrottlují agresivně (chceme plynulý progress bar), ale i tak je 15 fps dost.
- **Audit/test:** v Node s injektovaným fake `raf`/`now` (loop už je injektovatelný — `loop.js` deps) změřit: simuluj 1 s reálného času s frame callbacky po 16 ms, počítej skutečná volání `doRender` → assert ≤ 15. Deterministický unit test, žádný prohlížeč.

### UX-4 — iOS Safari specifika
- **Cíl:** korektní výška a bezpečné zóny na iOS (notch, dynamic island, URL bar collapse), funkční touch.
- **Jak:**
  - **100vh bug** → nahradit `100vh` za `100dvh` s fallbackem: `min-height:100vh; min-height:100dvh;` (a/nebo `-webkit-fill-available`). `dvh` řeší collapsing URL bar (obsah neutíká pod lištu).
  - **safe-area** → `#app`/sticky tab bar dostane `padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);` (max() s vlastním paddingem). `viewport-fit=cover` už je v `index.html`.
  - **touch** → `user-scalable=no` už je (žádný accidental zoom); doplnit `touch-action: manipulation` na tlačítka (zruší 300ms tap delay, brání double-tap zoom); `-webkit-tap-highlight-color: transparent` pro čistý feedback.
  - **PWA standalone** → `manifest` má `display:standalone` ✓; doplnit `apple-mobile-web-app-capable`/`apple-mobile-web-app-status-bar-style` meta do `index.html` (iOS standalone bez Safari chrome). (`apple-touch-icon` už je.)
- **Audit/test:** smoke ověří přítomnost meta tagů + CSS `dvh`/`env(` v `styles.css` (grep). Reálné iOS zařízení ověří uživatel (Q2 = syntetická náhrada + user potvrzení; viz §7).

**T1 measurable summary:** touch ≥44px (statický audit), 0 horizontal overflow @360px (smoke), ≤15 renders/s (Node unit test), iOS meta+dvh+env přítomné (grep).

---

## 2. T2 — Finální PWA audit (checklist) — **release-critical**

Tři osy: **evikce (R-F)**, **SW update flow**, **offline edge cases**. Vše v `service-worker.js` / `src/app/` / `src/ui/` — IndexedDB save je svatý.

### 2.1 Evikce storage (R-F) — checklist
| # | Položka | Stav | Akce M9b |
|---|---|---|---|
| EV-1 | `navigator.storage.persist()` při startu | ✓ `persist.js` | ponechat; logovat granted výsledek |
| EV-2 | **Detekce ne-perzistentního stavu** | chybí | po startu `navigator.storage.persisted()` → pokud `false`, zvednout UI hint „uložení může být vymazáno; exportuj save" |
| EV-3 | **Export prompt po dlouhé době** | chybí | **viz §2.2 níže** (hlavní R-F deliverable) |
| EV-4 | Rotující generace savů (N=3) | ✓ (M0b) | ponechat — chrání proti půlce zápisu, ne proti evikci |
| EV-5 | Export/import string jako recovery | ✓ `exportString.js` | propojit s EV-3 výzvou (tlačítko „Exportovat teď") |
| EV-6 | `navigator.storage.estimate()` quota check | nice-to-have | volitelně: pokud `usage/quota > 0.8`, varovat — nízká priorita |

### 2.2 R-F „Export prompt po dlouhé době" (návrh, UI-only)
- **Trigger (deterministicky z dat savu, NE z core):** v `app/` při startu spočítat `daysSinceLastExport` = `(now - meta.lastExportAt) / DAY_MS`. `meta.lastExportAt` je **UI/app metadata mimo herní hashState** — ukládá se vedle savu (do `saves` recordu nebo localStorage preference), NEvstupuje do `hashState`. (Pozn.: čte se `Date.now()` v `app/` vrstvě, ne v core — invariant 1 platí.)
- **Podmínka výzvy:** `persisted()===false` (vyšší riziko evikce) **NEBO** `daysSinceLastExport > EXPORT_REMINDER_DAYS` (návrh **7 reálných dní**; alt 14/30 → konfigurovatelné, UI konstanta). Při splnění → nenásilný banner „Zálohuj svůj postup" s tlačítkem Export (využije existující `onExport`).
- **Po exportu:** `meta.lastExportAt = now()` → reset.
- **Žádný blocker:** banner je dismissable, hra běží dál (idle žánr nesmí otravovat).

### 2.3 SW update flow — checklist + rozhodnutí
**Současný stav (riziko):** `skipWaiting()` + `clients.claim()` → nová SW verze aktivní okamžitě, klienti se přepnou za běhu. Při no-build ESM hře to může znamenat **míchání modulů ze staré a nové cache verze** (část už importovaných, část fetchovaných z nové cache) → nekonzistence za běhu sezení.

**Rozhodnutí (DR-021-01 §1): přejít na "update-ready prompt" (skip-waiting jen na pokyn).**

| Krok | Návrh |
|---|---|
| install | precache `PRECACHE_VERSION`; **NEvolat `skipWaiting()` automaticky** (nová verze čeká v `waiting`) |
| message | SW poslouchá `message` `{type:'SKIP_WAITING'}` → teprve pak `self.skipWaiting()` |
| activate | smazat staré cache (jako dnes), `clients.claim()` (po skip-waiting) |
| app/sw-register | `registration.addEventListener('updatefound')` → sleduj `installing.state==='installed'` & `navigator.serviceWorker.controller` (existuje předchozí SW) → zvedni UI „Nová verze připravena — Aktualizovat" |
| UI | banner s tlačítkem → `registration.waiting.postMessage({type:'SKIP_WAITING'})` → `controllerchange` → `location.reload()` (jednorázový guard proti loop reload) |
| save safety | reload je bezpečný: save v IndexedDB, autosave běží na `visibilitychange`/`pagehide` → **před reloadem vynutit `autosave.requestSave('hide')`** (invariant 3) |

**Důsledek:** hráč nikdy nedostane nový kód uprostřed akce nečekaně; aktualizace je jeho volba; save přežije (uloží se před reloadem).

### 2.4 Offline edge cases — checklist
| # | Položka | Ověření |
|---|---|---|
| OFF-1 | Install iOS (Safari → Přidat na plochu) | manifest `display:standalone` + apple meta (T1 UX-4); user potvrdí na zařízení |
| OFF-2 | Install Android (Chrome → instalovat / beforeinstallprompt) | manifest ikona `purpose:"any maskable"` ✓; ideálně doplnit PNG ikonu (SVG `sizes:"any"` může na některých Androidech selhat install kritéria) — **viz alt v §6** |
| OFF-3 | Offline start (žádná síť, z cache) | precache úplný (K2) → `caches.match` obslouží vše; smoke offline mód |
| OFF-4 | Cache miss fallback | `service-worker.js:38` → `index.html` SPA fallback ✓; ověřit, že nový soubor mimo precache (nemělo by se stát po gen-precache) degraduje rozumně |
| OFF-5 | První návštěva offline | nelze (precache vyžaduje 1× online) — dokumentovat v README (T4): „první spuštění vyžaduje připojení" |
| OFF-6 | Precache verze ⇄ deploy | `gen-precache.mjs` content-hash → každá změna assetu = nová `PRECACHE_VERSION`; **release checklist: re-run gen-precache + commit `precache.js`** |

**T2 measurable summary:** EV-3 banner trigger (unit test na `daysSinceLastExport`/`persisted`), SW update message-driven skip-waiting (SW unit/integration test mock), offline smoke (cache-only boot), precache úplnost (gen-precache idempotence test — re-run nezmění výstup = PASS).

---

## 3. T3 — Licence / PROVENANCE (R-G): metodika + DOPORUČENÍ (user gate) — **release-critical**

> **Architektura licenci NEROZHODUJE.** Tato sekce dodává (a) metodiku evidence, (b) strukturu
> `PROVENANCE.md`, (c) **doporučení** typu licence jako podklad pro **user gate** (T-008). Finální
> volba je nevratná/právní → eskaluje skutečnému uživateli (T-003 tom-proxy jen předá, nerozhodne).

### 3.1 R-G klasifikace: co podléhá a co ne
| Kategorie | Příklad | R-G? | Pravidlo |
|---|---|---|---|
| **Čísla / balanc / fakta** | ceny, scaling `100×1.25^level`, army upkeep 108, prahy AI | **NE** | Fakta a mechaniky nejsou autorsky chráněné; přebíráme 1:1 (to je celý smysl „věrného rebuildu") |
| **Struktura / mechanika** | tickOrder, scheduler, systémy, vzorce | NE (idea/process) | Reimplementace vlastní; struktura mechanik je nechráněná |
| **Texty (znění)** | story dialogy, tutoriál, eventy, názvy tlačítek | **ANO** | Vlastní/parafráze — už ověřeno M8 (`_meta.provenance='original-paraphrased'`, verbatim sken = 0) |
| **Jména / příběh / lore** | jména frakcí, postav, místa, narativ | **ANO** | Vlastní pojmenování; nepřebírat chráněné názvy 1:1 |
| **Grafika / assety** | ikony, obrázky budov, UI grafika | **ANO** | Vlastní (`icons/icon.svg` je vlastní placeholder ✓); žádný originál asset v repu |
| **Zdrojový dump** | `doc/original_source/**` | reference | NEdistribuovat v release buildu (jen workflow/git referenční materiál); ne v precache |

### 3.2 Metodika evidence (jak doložit čistotu)
1. **Inventář položek** s rizikem R-G: projít `src/data/*.json` (story/dialogues/tutorials/achievements/zones/military jména) + `src/ui/` texty + `icons/`.
2. **Provenance flag per položku/soubor:** rozšířit existující vzor `_meta.provenance` (`original-paraphrased` | `own` | `data-fact` | `derived` | `approximated`). Pro každý text/jméno-nesoucí katalog `_meta.provenance` musí být `own` nebo `original-paraphrased` (NIKDY `verbatim`).
3. **Verbatim sken (automatizovaný):** skript `tools/audit-provenance.mjs` — pro každý string v rizikových katalozích zkontroluje, že se **nevyskytuje doslovně** v `doc/original_source/**` (M8 to dělal ad-hoc; M9b z toho udělá opakovatelný gate). 0 verbatim shod = PASS.
4. **Asset sken:** ověřit, že `icons/` a jakákoli grafika je vlastní (žádný binární asset zkopírovaný z originálu); `doc/original_source/**` NENÍ v `precache.js` (grep) → nedistribuuje se.
5. **Evidence zápis:** vše shrnout do projektového `PROVENANCE.md` (struktura níže).

### 3.3 Struktura `PROVENANCE.md` (projektový, kořen repa nebo `doc/`)
```
# PROVENANCE — Prosperity rebuild
## 1. Vztah k originálu
   - co je originál (URL, verze 0.9.5, autor/komunita), že rebuild je reimplementace mechanik
## 2. Co je PŘEVZATO jako fakta/mechanika (NEpodléhá autorskému právu)
   - čísla balancu, vzorce, struktura systémů → tabulka kategorií (§3.1)
   - zdroj: doc/original_source_doc.md + extrakce
## 3. Co je VLASTNÍ / parafráze (R-G ošetřeno)
   - texty (story/dialog/tutorial) — provenance flagy, verbatim sken výsledek
   - jména/lore — vlastní pojmenování
   - grafika/ikony — vlastní
## 4. Co se NEdistribuuje
   - doc/original_source/** = referenční materiál, mimo release build/precache
## 5. Evidence / audit
   - tools/audit-provenance.mjs výstup, datum, verbatim shody = 0
## 6. Licence (DOPORUČENÍ — čeká na rozhodnutí uživatele)
   - viz §3.4; PLACEHOLDER do user gate
```

### 3.4 DOPORUČENÍ licence (pro user gate — NE rozhodnutí)
**Doporučená varianta (k posouzení uživatelem): vlastní kód pod permisivní open-source licencí, obsah (texty/assety) jako vlastní dílo, s explicitním attribution/disclaimer k originálu.**

- **Doporučení A (preferované):** **MIT** (nebo Apache-2.0) na vlastní kód + `PROVENANCE.md`/`NOTICE` s uvedením, že jde o nezávislou reimplementaci mechanik hry „Prosperity" (fan rebuild), bez převzetí chráněného obsahu. Důvod: maximální jednoduchost, kompatibilní s no-build/git distribucí, žádné copyleft závazky.
  - **Trade-off:** nechrání proti uzavření odvozenin; pro fan projekt typicky OK.
- **Alternativa B:** **GPL-3.0** (copyleft) — pokud chce uživatel, aby odvozeniny zůstaly otevřené. Trade-off: víc závazků pro případné integrace.
- **Alternativa C:** **proprietární/„all rights reserved" + nevydávat veřejně** — pokud převáží právní nejistota kolem fan rebuildu. Trade-off: zmaří cíl „instalovatelná/hratelná" pro ostatní.
- **Společná pojistka (nezávisle na A/B/C):** veřejné vydání AŽ po (1) verbatim sken = 0, (2) vlastní assety potvrzené, (3) disclaimer „neoficiální fan reimplementace, není spojeno s autory originálu".

> **Eskalace (povinná):** licenční typ + zda vůbec veřejně vydat = **rozhodnutí skutečného uživatele**
> (právní/nevratné). T3 dodá tento podklad; T-003 (tom-proxy) ho **nepřevezme jako rozhodnutí**,
> předá uživateli (T-008 user gate). Do rozhodnutí zůstává `PROVENANCE.md §6` jako PLACEHOLDER
> a repo **nemá** finální `LICENSE` soubor (aby se nevytvořil dojem rozhodnuté licence).

**T3 measurable summary:** verbatim sken = 0 (audit-provenance gate), všechny rizikové katalogy mají `_meta.provenance` ∈ {own, original-paraphrased}, `doc/original_source/**` není v precache (grep), `PROVENANCE.md` existuje a pokrývá §1–6, licence = PLACEHOLDER (žádný `LICENSE` soubor commitnut před user gate).

---

## 4. T4 — Release dokumentace (osnova) — release-critical (S)

Cíl: README odpovídá REBUILDU (ne starému skeletu), known issues z gap-reportu, export/import návod.

### 4.1 README.md (přepis — `README.md` je zastaralý)
```
# Prosperity (rebuild)
## Co to je       — věrný offline rebuild ekonomické sim. Prosperity v0.9.5, mobile-first PWA
## Jak hrát       — čas/sezóny, populace/jídlo, produkce, trh, výzkum, budovy, svět/bitvy, story
                    (NE starý tap-to-earn — smazat „Pracovat/investice/12 h/localStorage")
## Instalace (PWA)— iOS: Safari → Sdílet → Přidat na plochu; Android: Chrome → Instalovat
                    pozn.: první spuštění vyžaduje připojení (precache); pak plně offline
## Spuštění lokálně— statický HTTP server (python3 -m http.server / npx serve), ne file://
## Save & offline — autosave (IndexedDB), offline progres po návratu, export/import (viz §4.3)
## Struktura      — aktualizovat: core/ (headless engine), ui/ (preact), save/, data/, app/
## Známé limity   — odkaz na KNOWN_ISSUES (§4.2)
## Licence/PROVENANCE — odkaz na PROVENANCE.md; licence = TBD (user gate)
```

### 4.2 Known issues (carry-over gapy → release docs)
Konsolidovat z `src/data/gap-report.json` (36 gapů) + playtest + review notes. Seskupit:
- **Balanc/kalibrace (severity low, M9):** populace-cap sanity (playtest #4), D-CHEESE-SPOILAGE, G-SKILL-COMPENSATION, G-JOB-MAXSTEP, G-LISTJOB (approx).
- **Audit/účetnictví:** **G-BUILD-TXAUDIT / RECRUIT-TXAUDIT** — `build`/`recruit` volají `pay()` bez `ctx` → txEvent se nezapíše do účetnictví (gold se odečte správně, jen není v měsíčním reportu). Low; známé.
- **World/AI:** **G-WORLD-PERSIST-DERIVED** (goldDemand/goldProduction persist odchylka, low), **G-AIBATTLE-DEDUP** (inline AI battle resolve duplikuje `formulas.aiBattleResolve`, low).
- **Military:** **G-MILITARY-STATS** (combat staty approximated, M9 — nemají serverovou referenci).
- **Contracts:** G-CONTRACT-SCHED-CLEANUP, G-CONTRACT-GEN, G-CONTRACTS-CATALOG (low/approx).
- **Data díry (extrakce):** G-LISTGOODS/JOB/TECHS/ZONE/SKILL — kde `provenance:approximated/missing`, hodnoty odvozené, ne serverové.
- **V1/V2, MIN-1, MINOR-1/2:** vědomé odchylky/poznámky z M8 (persist komentáře, achievements `onUnlock:[]` prázdné) — dokumentovat jako „by design / deferred".
- Pro každý: **ID, severity, dopad na hratelnost (žádný blocker), proč carry-over (chybí serverová reference / nízká priorita).**

### 4.3 Export/import návod
- Krátká sekce: kde najít tlačítko Export (zkopíruje řetězec do schránky) / Import (vloží řetězec), že přenáší kompletní save vč. offline času (envelope), použití pro zálohu/přenos mezi zařízeními (R-F recovery). Varování: import přepíše aktuální postup.

**T4 measurable summary:** README neobsahuje starý skelet (grep „Pracovat"/„investice"/„12 h"/„localStorage" = 0), known issues pokrývají všechny `severity:medium|high` gapy + jmenované carry-overy, export/import sekce existuje.

---

## 5. Split coder tasků

Dva nezávislé balíky (mapuje na plan.md T-004 / T-005), paralelizovatelné — dotýkají se disjunktních souborů.

| Coder task | Obsah | Soubory (dotčené) | Kompl. | Release-critical |
|---|---|---|---|---|
| **C-021-A** (= plan T-004) | **T1 mobile UX + T2 PWA audit** | `src/ui/render.js` (render throttle UX-3), `styles.css` (.tap, dvh, env, tabbar, touch-action), `index.html` (apple meta), `App.js` (tabbar scroll, update/export banner UI), `service-worker.js` (skip-waiting message), `src/app/sw-register.js` (updatefound→prompt), `src/app/persist.js`/nový `app/` modul (evikce detekce + lastExportAt + export reminder) | **M** | **ANO** |
| **C-021-B** (= plan T-005) | **T3 licence/PROVENANCE + T4 release docs** | `PROVENANCE.md` (nový), `tools/audit-provenance.mjs` (nový), `_meta.provenance` doplnění v rizikových `src/data/*.json` (jen metadata, NE herní hodnoty), `README.md` (přepis), `KNOWN_ISSUES.md` (nový, nebo sekce README) | **M** | **ANO** |

**Disjunktnost:** A = UI/PWA infra; B = docs/metadata/audit tool. Žádný sdílený soubor → paralelní běh OK. **Oba po dokončení assetových změn → re-run `gen-precache.mjs`** (A přidá/změní UI soubory; B přidá PROVENANCE/audit mimo precache scope — ale ověřit ROOTS). **Pozn.:** `audit-provenance.mjs` a `audit-touch-targets.mjs` jsou v `tools/` (mimo precache ROOTS) — nezvětší cache.

**Pořadí pokud sériově:** C-021-A první (mění precache obsah), pak C-021-B; nebo paralelně s jedním finálním gen-precache + commit `precache.js` před testem (T-006).

---

## 6. Alternativy (povinné)

### Alt SW update strategie (k §2.3)
- **Zvoleno: update-ready prompt** (skip-waiting jen na pokyn) — hráč nedostane nový kód uprostřed sezení, save uložen před reloadem.
- **Alt A — ponechat auto `skipWaiting()`** (současný stav): jednodušší, vždy nejnovější kód. **Zamítnuto:** míchání modulů staré/nové cache verze za běhu sezení (no-build ESM riziko), reload bez varování ztratí UI kontext. Pro release kandidát nepřijatelné.
- **Alt B — žádná aktualizace dokud nezavře všechny taby** (čistý waiting bez promptu): bezpečné, ale hráč netuší, že je update k dispozici, může běžet na staré verzi týdny. Prompt (zvoleno) je střední cesta.

### Alt licence typ (k §3.4)
- **Doporučeno: MIT (A)** + disclaimer. **Alt GPL-3.0 (B)** copyleft, **Alt proprietární/nevydat (C)**. Trade-offs v §3.4. **Architektura nerozhoduje** — to je user gate (T-008).

### Alt PWA install ikona (k OFF-2)
- **Současně: jedna SVG ikona** `sizes:"any" purpose:"any maskable"`. **Alt: doplnit PNG sadu** (192/512 px) — některé Androidy vyžadují raster pro „installable" kritéria a hezčí splash. **Doporučení:** nice-to-have, low priorita; pokud install na Androidu projde se SVG (OFF-2 ověří), neřešit. Pokud ne → vlastní PNG export z SVG (vlastní asset, R-G čisté).

### Alt render throttle umístění (k UX-3)
- **Zvoleno: time-gate v `render.js`** (UI vrstva). **Alt: throttle dirty signálu v `loop.js`** — zamítnuto, protože `loop.js` patří k engine driveru a chceme frekvenci malování oddělit od frekvence krokování čistě v UI; `clock.js`/core se nesmí dotknout (invariant 1).

---

## 7. DR-021-01 — implementační poznámky (pro coder)

1. **Render throttle (UX-3) je jediná „logická" změna** — ale je 100% v UI (`render.js`). Konstanta `RENDER_MIN_INTERVAL_MS=66` je **UI konstanta, NE `balance.js`** (není to herní balanc). Trailing render povinný (jinak poslední snímek dávky nezůstane vykreslen). Test: Node fake raf/now → ≤15 renderů/s.
2. **`lastExportAt` / evikce metadata jsou MIMO hashState** — ukládat do `saves` recordu jako sidecar pole nebo localStorage preference, NIKDY do persist schématu herního stavu. Čtení `Date.now()` jen v `app/` vrstvě.
3. **SW skip-waiting**: po přechodu na message-driven nutně **otestovat update path** (mock: starý controller + nový waiting → postMessage → controllerchange → reload). Před reloadem `autosave.requestSave('hide')` (invariant 3 — save nesmí zmizet).
4. **gen-precache po KAŽDÉ změně statického assetu** (A i B). `precache.js` je commitnutý generovaný soubor — ručně needitovat. Ověřit, že `PROVENANCE.md`/`KNOWN_ISSUES.md`/`tools/audit-*.mjs` NEjsou v precache ROOTS (jsou mimo `src/`, `icons`, `index.html`, `manifest`) — pokud README/PROVENANCE do precache nechceme, jsou `.md` už v EXCLUDE (`gen-precache.mjs:35`) ✓.
5. **Provenance metadata** (`_meta.provenance`) v `src/data/*.json`: **mění jen `_meta`, NE herní hodnoty** → `hashState` se nesmí hnout (persist čte herní pole, ne `_meta`; ověřit, že `_meta` není v persist schématu — je to katalog metadata, ne stav). Determinismus test před/po = identický hash.
6. **`audit-provenance.mjs`**: porovnává stringy rizikových katalogů proti `doc/original_source/**`; normalizovat whitespace/case; report verbatim shody. Spustitelné `node tools/audit-provenance.mjs` → exit≠0 při shodě (CI/tester gate).
7. **Touch-target audit**: buď statický CSS parser (`tools/audit-touch-targets.mjs`) nebo manuální checklist v review; min. 44px nebo ekvivalentní hit-area.
8. **Žádný `LICENSE` soubor** se necommituje před user gate (T-008) — jinak by to byla implicitní volba licence. `PROVENANCE.md §6` = explicitní PLACEHOLDER „TBD — user decision".
9. **Test loop (T-006)** spustí: `npm run ci` (determinismus G1 = hash stabilní, MUSÍ být identický s iter-020 — důkaz „UI/PWA mimo core"), `npm run smoke` (+ overflow@360, render-throttle, touch audit, provenance audit), e2e release scénář (install→smyčka→offline→save/restore→bitva→story).

---

## 8. Předpoklady a nejistoty

1. **Reálné iOS/Android install + safe-area** ověří uživatel na zařízení (Q2 = syntetická náhrada + user potvrzení). Smoke/grep pokryje přítomnost meta/CSS, ne pixel-rendering na notchi.
2. **Render throttle** předpokládá, že 15 fps je vizuálně dost pro agregátní UI (architektura to tvrdí, §3.4) — pokud progress bary působí trhaně, lze zvýšit na 20–30 fps (UI konstanta, žádný dopad na determinismus).
3. **Licence**: architektura dodává jen podklad; právní platnost rozhodnutí je mimo scope agenta (user gate).
4. **PNG install ikona** je podmíněná (jen pokud SVG-only install selže na Androidu) — neblokuje release path.
5. **Known issues**: žádný carry-over gap není release-blocker (všechny `low`/`medium`, žádný `critical/high` mimo už uzavřené M4 data gapy); release kandidát je validní s evidovanými limity.

---

*Konec designu M9b. Navazuje na architekturu iter-002 (§9.2 PWA/storage/R-F, §12 R-G, K2),
master plán iter-003 §3/iter-018, design iter-020 (M9a). M9b = poslední milník = DoD M9 = release
kandidát. Licence = explicitní user gate (T-008).*
