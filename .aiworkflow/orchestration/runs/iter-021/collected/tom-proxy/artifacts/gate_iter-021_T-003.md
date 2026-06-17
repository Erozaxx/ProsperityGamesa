# Human Gate M9b (DESIGN) — iter-021, T-003

- **Gate ID**: GATE-021-003
- **Brief**: BRIEF-021-003 (Human gate M9b DESIGN — release kandidát)
- **Iteration**: iter-021 (M9b — release kandidát; DoD M9 = release)
- **Rozhodl**: tom-proxy (human proxy — jménem uživatele Tom)
- **Datum**: 2026-06-15
- **Vstupy**: design_iter-021_T-001 (DESIGN-021-001), DR-021-01, zadani_projektu.md (ř.32/52 PROVENANCE/licence), project/done-criteria.md

---

## VERDIKT: SCHVÁLENO (proceed na implementaci M9b)

Schvaluji **DESIGN PŘÍSTUP** k release kandidátu M9b jménem uživatele. Reviewer GO-s-podmínkami (0 blocker / 0 major); technické podmínky (MINOR-1/2/3, G1) jsou vyřešeny v DR-021-01 a carry do coder briefů.

**Klasifikace:** rozhodnuto v mandátu (DESIGN přístup je prezentační/infra vrstva mimo deterministický herní stav, reverzibilní, MVP/release-polish). **Výjimka — finální volba licence — NEROZHODNUTA, eskalována na T-008** (viz §3 a §licence-eskalace níže).

---

## Stanovisko k jednotlivým rozhodnutím

### 1. Mobile UX scope — OK jako release-quality polish
SCHVÁLENO. Touch ≥44px (statický CSS audit), 0 horizontal overflow @320/360/390px (smoke), render ≤15/s přes time-gate v `render.js` (oprava ~60/s → §3.4 cíl; UI konstanta `RENDER_MIN_INTERVAL_MS=66` s povinným trailing renderem, NE balance.js), iOS Safari (100dvh + safe-area `env()` + touch-action + apple meta).
- Soulad s preferencemi: **plynulost** (render throttle = méně render daně, frekvence malování oddělená od krokování) a **idle-friendly** (banner dismissable, hra neotravuje). Vše v `src/ui/` + `styles.css` + `index.html` — **žádný core/state zásah** → determinismus nedotčen (invariant 1).
- Podmínka (DR MINOR-1): render test MUSÍ pokrýt živou dávku (2× rychlost + kroky), ne klid. Beru jako splněnou součást scope.

### 2. PWA audit scope — OK jako finální audit
SCHVÁLENO. Tři osy pokryté: **evikce (R-F)** — `persisted()` detekce + export reminder při `daysSinceLastExport>7` || ne-perzistentní (sidecar `lastExportAt` mimo hashState); **SW update flow** — přechod z auto `skipWaiting()` na message-driven update-ready prompt, `autosave.requestSave('hide')` před reloadem (save v IndexedDB přežije, invariant 3); **offline edge** — install iOS/Android, offline boot z precache, cache-miss fallback.
- Volba update-ready prompt (proti auto-skipWaiting a proti tichému waiting) je správný střed: hráč nedostane nový kód uprostřed sezení a o updatu ví. Souhlasím s odmítnutím Alt A/B v §6.
- R-F (spolehlivé uložení/obnova) = přímo acceptance criteria projektu (done-criteria) → tento audit je release-critical a scope ho korektně pokrývá.
- PNG install ikona (OFF-2) = podmíněné nice-to-have, neblokuje release; ověření na user-gate Q2. OK.

### 3. PROVENANCE / licence PŘÍSTUP — přijatelný (přístup, NE finální licence)
PŘÍSTUP SCHVÁLEN:
- **R-G klasifikace** (čísla/balanc/mechanika = fakta, nechráněné, přebírají se 1:1 = jádro „věrného rebuildu"; texty/jména/lore/grafika = vlastní/parafráze) je korektní a v souladu se zadáním (ř.32/52) i s preferencí **věrný rebuild**.
- **Metodika evidence**: `_meta.provenance ∈ {own, original-paraphrased}` na rizikových katalozích, opakovatelný gate `tools/audit-provenance.mjs` (verbatim sken = 0), `doc/original_source/**` mimo precache/release build, projektový `PROVENANCE.md` (§1–6). M8 už verbatim=0 — toto z toho dělá trvalý gate. Schvaluji.
- **Doporučení licence** (architekt: MIT+disclaimer; alt GPL-3.0 / proprietární) přijímám **jako podklad pro user gate**, NE jako rozhodnutí.
- Správně: **žádný `LICENSE` soubor se necommituje** před user gate; `PROVENANCE.md §6` zůstává PLACEHOLDER „TBD — user decision". Tím se nevytvoří dojem rozhodnuté licence.

### 4. README přepis + known issues do docs — OK
SCHVÁLENO. README je prokazatelně zastaralý (popisuje starý tap-to-earn skelet `game.js/storage.js/ui.js`, „12 h", localStorage) → přepis na rebuild je nutný a vědomý. Known issues z `gap-report.json` (36 gapů, všechny low/medium, žádný blocker) + carry-overy → do release docs (KNOWN_ISSUES). Export/import návod doplnit. Žádný carry-over gap není release-blocker.

---

## ⚠️ Licence — EXPLICITNÍ ESKALACE NA T-008 (NEROZHODUJI TEĎ)

Potvrzuji explicitně: **finální volba licence (MIT vs GPL-3.0 vs proprietární) a rozhodnutí ZDA vůbec veřejně vydat = nevratné/právní rozhodnutí MIMO můj mandát.** Tom-proxy ho **NEPŘEBÍRÁ** — předává skutečnému uživateli na **release gate T-008**.

- Zde schvaluji pouze **PŘÍSTUP**: vlastní/parafráze assety a texty, PROVENANCE metodiku + gate, a *doporučení* MIT+disclaimer jako podklad.
- Do rozhodnutí uživatele (T-008): `PROVENANCE.md §6` = PLACEHOLDER, repo bez `LICENSE` souboru.
- Společná pojistka před jakýmkoli veřejným vydáním (nezávisle na volbě): (1) verbatim sken = 0, (2) vlastní assety potvrzené, (3) disclaimer „neoficiální fan reimplementace, není spojeno s autory originálu".

---

## Předpoklady a poznámky
- Mandát default = rozhodni a pokračuj; eskaluj jen nevratné/scope/právní. Body 1–4 jsou v mandátu (reverzibilní UI/PWA/docs vrstva); jen finální licence eskaluje.
- Determinismus invariant: `hashState` MUSÍ zůstat identický s iter-020 (důkaz „UI/PWA/_meta mimo core") — test G1 (DR MINOR-3).
- Reálné iOS/Android install + safe-area na zařízení ověří uživatel (Q2 syntetická náhrada + potvrzení); smoke/grep pokrývá přítomnost meta/CSS, ne pixel rendering.
- C-021-A a C-021-B běží **sekvenčně** (DR MINOR-2) → jediný finální `gen-precache` po obou, commit `precache.js` před testem T-006.
- Precedens gatů iter-013..020 T-003 (všechny SCHVÁLENO).

## Follow-up
- Orchestrátor: odškrtnout T-003 v master checklistu; dispatch implementace (C-021-A → C-021-B sekvenčně), poté gen-precache + test loop (T-006).
- T-008 (release/user gate): předložit uživateli finální volbu licence + GO/NO-GO veřejného vydání s podkladem z PROVENANCE.md a doporučením MIT+disclaimer.
