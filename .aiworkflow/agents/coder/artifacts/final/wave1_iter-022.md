# Vlna 1 (iter-022 T-001): render-on-send + story dialog CSS + panel styling

- **Autor**: coder
- **Datum**: 2026-07-02
- **Zdroj nálezů**: `.aiworkflow/agents/tester/artifacts/final/e2e-rum-report_post-iter-021.md` (#1, #2, #10)
- **Scope**: `src/app/main.js`, `src/ui/styles.css` (+ regenerovaný `src/precache.js`). `src/core/**` a
  `src/data/**` NEDOTČENY.

## Co bylo změněno a proč

### #2 — render-on-send (`src/app/main.js`)
`send()` (dřív ř. 277–278) po úspěšném dispatchi commandu (`result.ok === true`) nově volá
`requestRender()`:

```js
const send = (type, params) => {
  const result = dispatch(creg, state, { type, params });
  if (result.ok) requestRender();
  return result;
};
```

- `requestRender` je `let`-binding, přiřazený až po `mountUI()` (ř. ~365). `send` na něj
  odkazuje jménem (closure přes proměnnou, ne přes hodnotu) — protože `send` se reálně volá
  vždy až z UI event handleru (po mountu), binding je v době volání už vyplněný. Žádné
  přeuspořádání kódu nebylo potřeba — jde o standardní JS closure sémantiku, ne hack.
  Ověřeno i regresně: `test/boot-integration.test.js` (BLOCKER-1 sekce) volá `send()` až po
  `await bootSequence(env)` — proto tam žádný problém není.
- `requestRender()` samo o sobě jen NAPLÁNUJE repaint přes throttlovaný scheduler v
  `src/ui/render.js` (`RENDER_MIN_INTERVAL_MS=66ms`, coalescing přes `scheduled`/`trailingTimer`
  guard) — **není obcházen ani měněn**. Voláno navíc z herní smyčky (`loop.js` `onDirty`), obě
  volání se koalescují do stejného throttlovaného okna → žádné zdvojení/render-bouře.
- Efekt: klik na akci (daně ±, koupit, přiřadit práci, …) se **okamžitě** promítne do UI i při
  pauze (`engine.running=false`) i při story-freeze, protože teď existuje repaint-trigger
  nezávislý na herní smyčce (`onDirty` se volá jen když `advance()` udělal krok).

### #1 — story dialog CSS + modalita (`src/ui/styles.css`)
Přidána pravidla pro `.story-overlay` / `.story-dialog` / `.story-speaker` / `.story-text` /
`.story-options` / `.story-option-btn` (dřív 0 pravidel):
- `.story-overlay`: `position:fixed; inset:0; z-index:1000`, poloprůhledný backdrop
  (`rgba(0,0,0,0.65)`), `display:flex; align-items:center; justify-content:center`, safe-area
  padding (notch/home-indicator).
- `.story-dialog`: `max-width:420px`, `max-height:calc(100dvh - 2rem)` + `overflow-y:auto` (aby
  se vešel i na 320×568), `var(--surface)` pozadí konzistentní se zbytkem UI.
- `.story-option-btn`: plnohodnotné tlačítko (pozadí/border/hover), ne default prohlížečový
  styl.

**#1c modalita**: řešeno čistě CSS way, bez JS focus-trapu. `.story-overlay` je `position:fixed`
přes celý viewport s `z-index:1000` a je posledním vykresleným elementem v `.hud` stromu — proto
přirozeně "sedí nahoře" nad taby/HUD (žádný jiný element v layoutu nenastavuje vlastní z-index).
Protože overlay fyzicky pokrývá celou obrazovku, kliky na taby/tlačítka POD ním jsou zachyceny
overlayem, ne cílovým elementem → pozadí je blokováno bez potřeby JS trapu. Ověřeno přímo
(viz Validace níže): hit-test `elementFromPoint` v místě tab-tlačítka za aktivního story eventu
vrací `.story-dialog`, ne tlačítko.

Navíc (mimo striktní scope brief, ale explicitně zmíněno v briefu — "Story/tutorial overlay
řeší #1"): doplněn `.tutorial-overlay`/`.tutorial-box` styling — nemodální (jak bylo v
komponentě navrženo, `role="complementary"`), fixed do rohu obrazovky (`pointer-events:none` na
wrapperu, `pointer-events:auto` na kartě), aby nezůstal neostylovaný stejným způsobem jako
story dialog.

### #10 — runtime panely (`src/ui/styles.css`)
`.offline-summary` a `.catchup-progress` (dřív 0 pravidel) dostaly kontejner ve stejném
vizuálním jazyce jako existující `.banner` (update/export bannery): border, rounded, `var(--surface)`
pozadí, tlačítko stylované konzistentně s `.banner button`. `.catchup-progress` navíc dostal
vizuální progress-bar look (track + vyplněný `.catchup-bar` na absolutním pozicování, procenta
uprostřed) — komponenta (`CatchupProgress.js`) používá `<div class="catchup-bar" style="width:X%">`
místo nativního `<progress>`, takže bylo potřeba vlastní track/fill.

## Co NEBYLO měněno
- `src/core/**`, `src/data/**` — nedotčeno (viz `git diff --stat` níže).
- Žádná herní logika/balanc/čísla.
- `.stats` gap (#9), nábor UI (#3), dovednosti (#4), export/import feedback (#5/#6/#8) —
  mimo scope Vlny 1 (T-004, Vlna 2).

## Validace (reálně spuštěno)

```
$ npm run ci
...
# tests 1566
# suites 410
# pass 1566
# fail 0
# duration_ms ~10.9s
```

```
$ PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers npm run smoke
SMOKE OK: app rendered, 0 console errors.
SMOKE OK: 0 horizontal overflow @ 320/360/390px across 12 tabs.
```

```
$ git diff --stat src/core src/data
(prázdný výstup)
```

Golden-hash / determinismus G1: `npm run ci` obsahuje `test/m9a-regression.test.js` (golden-hash
checkpointy) a `test/render-throttle.test.js` — obojí ZELENÉ v běhu výše. Žádný core/data soubor
není v diffu, takže G1 je bit-identický by construction (žádná core logika se nemohla dotknout
hashState).

Precache regenerován: `node tools/gen-precache.mjs` → `precache: 113 files, version
prosperity-0163c8e1b48e` (verze se změnila obsahově díky `main.js`/`styles.css`, jak očekáváno).

### e2e-rum harness (volitelné, `.aiworkflow/agents/tester/scratch/e2e-rum.mjs`)
Spuštěno opakovaně. Potvrzeno:
- **#1 FIXED**: `boot: krok=1, story overlay: {"position":"fixed","zIndex":"1000",
  "bg":"rgba(0, 0, 0, 0.65)","top":0,"bottom":844,"viewportH":844,"inViewport":true}` — dialog je
  teď fixed, s backdropem, ve viewportu na 390×844.
- **F7 save-reload**, **F8 offline-catchup**, **F5 market/build/contracts**: beze změny, 0
  nálezů, funguje.
- Zbylé nálezy z QA reportu (#3 recruit UI, #5/#6/#8 export/import feedback, #9 HUD stats gap)
  přetrvávají beze změny — jsou mimo scope Vlny 1 (T-004).

**Pozorovaná intermitentní "HARNESS-FLOW-CRASH" ve flow F4** (timeout kliku na tab „Rada"/
„Dovednosti"): vyšetřeno instrumentovanou kopií harnessu s diagnostikou přímo v `clickTab`.
Kořenová příčina zachycena přímo:

```
[DIAG] clickTab('Rada') FAILED: {"curStepText":"...krok 901","storyOverlay":{"top":0,"z":"1000"},
  "hit":{"elTag":"DIV","elClass":"story-dialog","isTarget":false,"disabled":false}}
```

Krok 901 = přesně hranice dne (900 kroků/den) → `storyCheck` (core, `every:'day'`) legitimně
odpálil nový story event uprostřed F4 flow, engine se zastavil a `.story-overlay` **správně**
zablokoval klik na tab pod sebou (hit-test potvrzuje: na souřadnicích tlačítka „Rada" leží
`.story-dialog`, ne tlačítko). To je přesně #1c chování, které QA report požadoval ("blokace
pozadí"). Před opravou overlay nic neblokoval (bug #1c), takže se harness "náhodou" proklikal
skrz — po opravě je to netransparentně vidět jako timeout, protože **F4 flow v harnessi nevolá
`clearOverlays()` mezi jednotlivými tab-kliky** (na rozdíl od F2/F3 tab-sweepů, které
`clearOverlays()` volají). Ověřeno i kontrolně: 5/5 izolovaných běhů stejné sekvence (bez
předchozích F1–F3 kontextů) proběhlo čistě bez jakéhokoliv story-overlay uprostřed. Rovněž
ověřeno na baseline (bez mé opravy) — původní build "prochází" jen proto, že overlay tehdy
neblokoval nic (to je právě bug #1c). **Závěr: toto není regrese v produkčním kódu** — je to
gap v tester harnessu (`e2e-rum.mjs` F4 flow), mimo scope tohoto tasku (soubor patří tester
agentovi, `.aiworkflow/agents/tester/scratch/`). Doporučuji tester agentovi doplnit
`clearOverlays()` i do F4 mezi jednotlivé kroky (nebo obecně do `clickTab()` helperu).

## Odchylky / nejistoty
- Brief zmiňoval `.tutorial-*` jen nepřímo ("Story/tutorial overlay řeší #1") — doplnil jsem
  minimální styling i pro `.tutorial-overlay`/`.tutorial-box`, protože jinak by zůstal stejně
  neostylovaný jako story dialog byl. Pokud to je mimo záměr, lze snadno vyjmout (je to čistě
  aditivní CSS blok, žádná závislost na zbytku patche).
- `send()` nyní volá `requestRender()` i pro no-op commandy s `result.ok===true` (např.
  `assignJob` s `delta:0`) — to je zamýšlené (jednodušší, bezpečné, throttle to stejně
  koalescuje); nevolá se pro `result.ok===false` (neplatný command), což odpovídá briefu
  ("po úspěšném dispatchi").
- Harness "HARNESS-FLOW-CRASH" nález ve F4 (viz výše) je zdokumentován, ne opraven — je to
  bug v tester nástroji, ne v `src/`, mimo můj scope (a mimo scope Vlny 1 obecně).
