# Vlna 2 (iter-022 T-004): nábor/dovednosti UI + import-save + export fallback

- **Autor**: coder
- **Datum**: 2026-07-02
- **Zdroj nálezů**: `.aiworkflow/agents/tester/artifacts/final/e2e-rum-report_post-iter-021.md` (#3–#9)
- **Scope**: `src/app/main.js`, `src/ui/App.js`, `src/ui/screens.js`, `src/ui/selectors.js`,
  `src/ui/styles.css` (+ regenerovaný `src/precache.js`). `src/core/**` a `src/data/**`
  NEDOTČENY (čteno, nepsáno).

## Co bylo změněno a proč

### #3 — nábor UI (`src/ui/selectors.js`, `src/ui/screens.js`, `src/ui/styles.css`)
Command `recruitUnit` (`src/core/commands/recruitUnit.js`, params `{ unitType: 'warrior'|'archer',
count? }`) byl registrovaný v jádře (`main.js:139`), ale bez UI vstupního bodu.

- **`selectRecruitCatalog(s)`** (nový selektor, `selectors.js`) čte `src/data/military.json`
  přes `getCatalog('military')` (stejný katalogový přístup jako zbytek `selectors.js`, např.
  `selectTechTree`), s fallbackem na `BALANCE.army.{warrior,archer}Cost` — **mirror** logiky
  `findUnit()` v `recruitUnit.js`, jen READ, žádný import z `core/commands/`. Vrací
  `{id, name, goldCost, owned, canAfford}` (owned z `player.totWarriors`/`totArchers`,
  canAfford ze živého `player.gold`).
- **BattleScreen** (`screens.js`) dostal sekci „Nábor jednotek" (`recruitSection`), vykreslenou
  v obou větvích (žádná/aktivní bitva) — nábor není vázaný na probíhající bitvu. Dvě tlačítka
  na jednotku („Naverbovat 1×"/„Naverbovat 5×") volají `send('recruitUnit', { unitType, count })`
  přesně dle signatury commandu; `disabled` když `player.gold` nestačí.
- CSS: `.recruit-section`/`.recruit-list`/`.recruit-item` (styly.css), stejný vizuální jazyk jako
  `.battle-*`/`.quest-*`.

### #4 — dovednosti UI katalog (`src/ui/selectors.js`, `src/ui/screens.js`, `src/ui/styles.css`)
**USER ROZHODNUTÍ dodrženo přesně**: žádný seed do `state.home.skills`. `SkillsScreen` dřív
renderoval jen existující `state.home.skills` položky (prázdné na čerstvé hře → cyklická
nedosažitelnost, viz QA report #4).

- **`selectAvailableSkills(s)`** (nový selektor) čte `src/data/skills.json` přes
  `getCatalog('skills')` (stejný katalogový přístup) a vrací katalogové položky, jejichž `id`
  **není** klíčem v `state.home.skills` (tj. nikdy nespuštěné). Čistě READ selektor — nezapisuje
  nikam.
- **SkillsScreen** dostal druhou sekci „Dostupné dovednosti": pro každou katalogovou položku
  tlačítko „Spustit" → `send('startSkill', { skillId })`. Jediný writer `state.home.skills`
  zůstává command `startSkill` (`core/commands/startSkill.js`), přesně jak brief vyžadoval —
  UI jen dispatchuje, neseeduje.
- **Zdroj katalogu**: `src/data/skills.json` (2 položky: `woodworking`, `scholarship`), čtený
  přes `hasCatalog('skills')`/`getCatalog('skills')` z `src/core/catalog/loader.js` — stejná
  cesta, jakou už `selectors.js` používá pro `techs`/`buildings`/`companies`/atd. (žádný nový
  precedent, žádná nová core-coupling).

### #6 — import → save (`src/app/main.js`)
`onImport` (dřív ř. 310–321) přepsal in-memory `state` a zavolal `requestRender()`, ale
NIKDY nezapsal do IndexedDB → plain reload do 60s po importu zahodil data (QA repro: krok 26 →
reload → krok 1).

- Po úspěšném `env.importFromString(...)` a `Object.assign(state, result.state)` teď voláme
  **`autosave.flush()`** (ne `requestSave()`). Důvod odchylky od brief-naznačeného
  `requestSave()`: `requestSave(reason)` je throttlovaný (`elapsed >= minIntervalMs`, bypass jen
  pro `reason==='hide'`) — pokud proběhl nedávný autosave (< 60s), `requestSave('periodic')`
  by tiše NEuložil, čímž by se bug jen zmenšil, ne odstranil. `autosave.flush()` (definováno v
  `src/app/autosave.js`, app-layer, ne core) provádí **nepodmíněný** okamžitý zápis —
  identický primitiv, jaký už kód používá pro SW-update flow (`flushSave = () =>
  autosave.flush()`, ř. ~505). `.catch()` na promise nastavuje `importError` (viz #8) místo
  tichého polknutí selhání zápisu.
- **`lastSimTimestamp` konzistence**: `env.saveGame` (viz `src/save/saveStore.js:79-113`) si
  vlastní `lastSimTimestamp = now()` (čas ULOŽENÍ, ne importovaná hodnota) razítkuje sám při
  zápisu záznamu — takže perzistovaný `lastSimTimestamp` je vždy "teď", konzistentně s
  in-memory `lastSimTimestamp = result.lastSimTimestamp` nastaveným těsně předtím (obojí
  reflektuje aktuální čas, žádná zastaralá pre-import hodnota nezůstává v oběhu).
- Ověřeno ad-hoc (viz Validace): import na kroku 43 → `flush()` → reload → krok 83 (data
  přežila + proběhl offline catch-up od doby uložení; PŮVODNÍ bug resetoval na krok 1).

### #5 — export feedback/fallback (`src/app/main.js`, `src/ui/App.js`, `src/ui/styles.css`)
`onExport` (dřív ř. 289–299) zapisoval do schránky s `.catch(() => {})` — bez potvrzení, bez
fallbacku, úplný no-op bez oprávnění ke schránce.

- `onExport` teď rozlišuje tři cesty (žádná tichá): (1) `navigator.clipboard.writeText`
  úspěch → `exportFeedback = {status:'copied'}` (banner s potvrzením); (2) zápis selže
  (`.catch`) → `exportFeedback = {status:'fallback', text: str}`; (3) `navigator.clipboard`
  vůbec neexistuje → rovnou fallback (stejná větev).
- `App.js`: nové bannery `.banner-export-feedback` (potvrzení „Hra byla zkopírována do
  schránky.") a `.banner-export-fallback` s `<textarea readonly class="export-fallback-text">`
  obsahující export string pro ruční zkopírování (click-to-select). Obě dismissable
  (`onDismissExportFeedback`).
- CSS: `.export-fallback-text` (monospace, word-break, resize) + barvy pro nové bannery.

### #8 — neplatný import (`src/app/main.js`, `src/ui/App.js`)
`catch (_e) { /* silent */ }` (dřív ř. 317–320) nahrazeno: `importError = { message:
'Neplatný importní řetězec — import se nezdařil.' }` + `requestRender()`. `App.js` renderuje
`.banner-import-error` (dismissable) když `importError !== null`.

### #7 — stale-closure daní: NEŘEŠENO (dle briefu)
Beze změny. Ověřeno regresně přes `npm run ci` (žádný test na tax-rate-click selhal) — Vlna 1
render-on-send fix (`send()` volá `requestRender()` po `result.ok`) toto už opravil a Vlna 2 do
`send()`/`onClick` handlerů daní nesahá.

### #9 — HUD `.stats` gap (`src/ui/styles.css`)
`.stats` (dřív 0 pravidel → sousední `<span>` se dotýkaly, "…Jídlo: 0Zdraví: OK…") dostalo
`display:flex; flex-wrap:wrap; gap:0.75rem; justify-content:center;`. Ověřeno
(`getComputedStyle('.stats').gap === '12px'`, viz Validace).

## Co NEBYLO měněno
- `src/core/**`, `src/data/**` — nedotčeno, jen ČTENO (katalogy `military.json`/`skills.json`
  přes existující `getCatalog`/`hasCatalog`, stejný pattern jako zbytek `selectors.js`).
- Žádné seedování `state.home.skills` ani jednotek — pouze dispatch existujících commandů.
- Žádná herní logika/balanc/čísla (ceny/produkty čtené 1:1 z katalogu, ne vymýšlené).

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

Golden-hash / determinismus G1: `npm run ci` zahrnuje `test/m9a-regression.test.js`
(golden-hash checkpointy) — zeleně (samostatně ověřeno i `node --test test/m9a-regression.test.js`
→ 17/17 pass). Žádný core/data soubor není v diffu (viz výše) → G1 bit-identický by construction.

Precache regenerován: `node tools/gen-precache.mjs` → `precache: 113 files, version
prosperity-246f14014116`.

### e2e-rum harness (`.aiworkflow/agents/tester/scratch/e2e-rum.mjs`, volitelné)
Spuštěno. `F6 recruit-ui-audit`: „possible recruit UI on tab 'Bitva'" — nalezeno, 0 nálezů.
`F9 export-import`: `export.*ok|hotovo|zkopírov|schránk` regex teď matchuje (dřív ne) →
`EXPORT-NO-FEEDBACK` finding zmizel; fallback banner text taky matchuje regex
(„export without clipboard permission: … confirmation text=true"). Zůstal 1 finding
**„MINOR IMPORT-NO-ERROR-FEEDBACK"** — vyšetřeno: je to STATICKY zapsaný nález v harnessu
(`e2e-rum.mjs:660-661`), `else` větev v F9 loguje tento text **vždy** když appka po neplatném
importu nespadne, aniž by reálně kontrolovala DOM na chybovou hlášku (harness byl napsán PŘED
touto opravou a nebyl aktualizován — mimo můj scope, patří testerovi). Skutečné chování jsem
ověřil ad-hoc Playwright skriptem přímo proti běžící appce (dočasný soubor, smazán po použití,
necommitnut):

```
#8 invalid import -> banner-import-error count: 1
   text: "Neplatný importní řetězec — import se nezdařil."
#5 clipboard export -> banner-export-feedback count: 1
#5 no-clipboard-grant export -> banner-export-fallback count: 1, textarea count: 1
#6 step after import: krok 43  →  step after reload: krok 83  (PŘED opravou: reload → krok 1)
#4 available skills catalog items: 2 [Woodworking, Scholarship]
   -> after "Spustit": 1 progressing item appears, catalog item disappears from "available"
#9 .stats computed gap: 12px
#3 recruit button: disabled=true, title="Nedostatek zlata" (live gold 830 < warrior cost 1080)
   -> potvrzuje reálné napojení na živý stav (ne mock); úspěšný klik neproveden v této session
      kvůli nedostatku startovního zlata (balanční fakt, mimo scope) — command recruitUnit
      samotný má vlastní pokrytí v `npm run ci` (core testy).
```

Doporučuji testerovi aktualizovat `e2e-rum.mjs` F9, aby kontroloval `.banner-import-error`
v DOM místo statického findingu (mimo scope tohoto tasku, jen poznámka pro navazující QA run).

## Odchylky / nejistoty
- **`autosave.flush()` místo `requestSave()`** pro #6 (viz zdůvodnění výše) — odchylka od
  brief-naznačeného API, ale v duchu AC („Import + reload → data PŘEŽIJÍ"): `requestSave` by
  toto negarantovalo při nedávném předchozím autosave.
- #3: skutečný úspěšný recruit-klik (owned count +1) nebyl odzkoušen end-to-end v ad-hoc
  ověření kvůli nedostatku startovního zlata ve fresh session (830 < 1080/1620) — to je
  balanční fakt existující nezávisle na této změně, ne důkaz nefunkčnosti; wiring (parametry,
  dispatch, `canAfford`/`disabled` logika čtoucí živý stav) je otestován staticky i behaviorálně
  (disabled-state reaguje na reálné `player.gold`).
- Recruit sekce je zobrazena vždy v `BattleScreen` (i bez aktivní bitvy) — záměrně, nábor není
  bitvou podmíněný; brief zmiňoval „příslušný tab" bez určení přesné obrazovky, `Battle`
  (jediný tab pracující s `totWarriors`/`totArchers`/vojenskými jednotkami) byl zvolen jako
  nejbližší tématický domov.
