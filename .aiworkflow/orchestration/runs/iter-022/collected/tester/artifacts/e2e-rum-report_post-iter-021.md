# e2e + RUM bug-hunt report — post-iter-021 (T-ADV-002)

- **Autor**: tester (QA), advisory mezi-iterační
- **Datum**: 2026-07-02
- **Brief**: BRIEF-ADV-002 (`context/inbox/brief_tester_T-ADV-002_post-iter-021.md`)
- **Režim**: read-only vůči hernímu kódu. Žádná změna v `src/`. Harness je v `scratch/`.
- **Testovaná verze**: lokální HEAD (== živá precache `prosperity-4830cd1e8c19`, dle architekta).
- **Verdikt**: **NO-GO pro „hratelnost bez frustrace" bez oprav.** Hra běží runtime-čistě
  (0 JS chyb), ale sada UX/wiring bugů dělá dojem „rozbité hry" — přesně to, co uživatel hlásil.

---

## 0. TL;DR

- **10 reprodukovaných nálezů**: 0 BLOCKER (žádný pád/crash), **6 MAJOR**, **4 MINOR**.
- **RUM je čistá**: napříč VŠEMI lokálními flow **0 console.error, 0 pageerror (uncaught),
  0 requestfailed**. Žádné horizontální přetečení @320/360/390/1280 na žádném z 12 tabů.
  → Bugy NEJSOU pády; jsou to **wiring/feedback/CSS mezery**, které unit testy ani boot-smoke
  principiálně nechytí.
- **Nejpravděpodobnější zdroj „spousty chyb"**: dvojice #1 + #2 — hra po pauze / při story
  eventu **vypadá zamrzle a tlačítka jako mrtvá**, protože UI se nepřekresluje a story dialog
  je neostylovaný pod okrajem stránky.
- **Live URL** `https://erozaxx.github.io/...` z tohoto sandboxu **nedostupná** (proxy
  `ERR_CONNECTION_CLOSED`) → cross-check **NEOVĚŘENO** (testováno jen lokální HEAD == živá verze).

---

## 1. Jak spustit harness

Harness: `.aiworkflow/agents/tester/scratch/e2e-rum.mjs` (Node + Playwright, vzor z `tools/smoke.mjs`).
Spouštět z kořene repa (statický server servíruje `process.cwd()`).

```bash
cd /home/user/ProsperityGamesa
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
  node .aiworkflow/agents/tester/scratch/e2e-rum.mjs
# volitelně:
#   E2E_RUM_OUT=/cesta/results.json   JSON telemetrie per-flow
#   E2E_LIVE_URL=1                    přidá F10 cross-check živé URL
```

- Chromium se bere z `/opt/pw-browsers` (fallback `executablePath:'/opt/pw-browsers/chromium'`).
  **`playwright install` se NIKDY nespouští.**
- Exit 0 = doběhlo (nálezy v outputu + JSON), 1 = pád harnessu.
- Flow F1–F9 lokálně, F10 živá URL (optional). Simulace offline času přes `page.clock`
  (browser čas, ne hack do stavu). Save/reload přes reálný `visibilitychange→hidden` autosave.

**Pokrytí (důkaz šířky):** nová hra boot (desktop+mobil), sweep všech 12 tabů @1280/390/360/320
+ touch, ekonomická smyčka (přiřazení práce, dovednosti, daně, rychlost 1×/2×/pauza),
trh (nákup/prodej/karavana), stavba, firmy, kontrakty, věda, svět/questy, nábor-audit,
save→reload→obnova, offline catch-up +30 min (vč. story interruptu a offline summary),
export→import round-trip + neplatný import + export bez clipboard práv.

---

## 2. RUM telemetrie (per flow)

Legenda: CE=console.error, CW=console.warn, PE=pageerror(uncaught), RF=requestfailed.

| Flow | CE | CW | PE | RF | Nálezy |
|---|---|---|---|---|---|
| F1 story-event UX (390×844) | 0 | 0 | 0 | 0 | #1a,#1b,#2(indik),#9 |
| F2 tab-sweep desktop 1280 | 0 | 0 | 0 | 0 | 0 |
| F3a/b/c tab-sweep 390/360/320 touch | 0 | 0 | 0 | 0 | 0 (žádný overflow) |
| F4 economy-loop desktop | 0 | 0 | 0 | 0 | #2,#4,#7 |
| F5 market/build/contracts/tech/world | 0 | 0 | 0 | 0 | 0 (vše funguje) |
| F6 recruit-ui-audit | 0 | 0 | 0 | 0 | #3 |
| F7 save→reload | 0 | 0 | 0 | 0 | 0 (obnova OK) |
| F8 offline catch-up +30 min | 0 | 0 | 0 | 0 | #10 |
| F9 export/import | 0 | 0 | 0 | 0 | #5,#6,#8 |
| F10 live URL | – | – | – | 1 | nedostupná (proxy) |

**Pozitivní zjištění (co funguje):** boot i sim běží bez JS chyb; trh nákup/prodej mění
inventář i zlato (tools 0→10, zlato 830→492.5→…); karavana se odešle; kontrakt se přijme;
stavba/firmy fungují když je na ně; zóny (13) a HUD se plní; **save→reload obnoví stav**
(krok i přiřazení práce přežijí); **offline catch-up +30 min doběhne** (~36 tis. kroků,
offline summary „Byli jste offline 0.5h, dohnáno 38.9 dní…"); export→import round-trip
projde; 2× rychlost = 2× kroků; pauza reálně staví engine.

---

## 3. Nálezy (reprodukované)

Formát: Given/When/Then + viewport + očekávané vs. pozorované + závažnost + pravděpodobná příčina.

### #1 — Story dialog: neostylovaný + pod okrajem stránky + neblokuje pozadí  [MAJOR]
Cluster tří pozorování o intro/story eventu (engine-stopping dialog).

- **#1a STORY-DIALOG-UNSTYLED** (MAJOR): `.story-overlay`/`.story-dialog`/`.story-option-btn`
  mají **0 pravidel v `src/ui/styles.css`** (ověřeno grep count = 0). Overlay je
  `position:static`, `background:transparent`, žádný backdrop, default tlačítko.
- **#1b STORY-DIALOG-BELOW-FOLD** (MAJOR): protože je in-flow a bez pozice, dialog se vykreslí
  **pod veškerým obsahem tabu**. Na 390×844 po přepnutí na tab „Trh" má dialog `top≈1141px`
  při viewportu 844px → **mimo obrazovku**.
- **#1c STORY-DIALOG-NOT-MODAL** (MINOR): deklaruje `role="dialog" aria-modal="true"`
  (`GamelogScreen.js:63`), ale **neblokuje interakci s pozadím** — lze přepínat taby.

- **Given** čerstvá hra, mobil 390×844. **When** boot → intro event zastaví engine → hráč
  přepne tab. **Then** engine je zamrzlý (krok stojí), ale dialog s jediným tlačítkem, které
  ho odemkne, je **mimo obrazovku**, průhledný, bez backdropu. Hra vypadá **zaseklá bez důvodu**.
- **Očekávané**: engine-stopping event = viditelný modál s backdropem, ve viewportu, blokuje pozadí.
- **Pozorované**: neviditelný text u paty stránky; pozadí klikatelné; nutno náhodou odscrollovat dolů.
- **Příčina**: chybějící CSS pro story/tutorial overlay ve `styles.css`; komponenta je jinak
  správná (`GamelogScreen.js:58-78`). **Nejsilnější kandidát na „hra je rozbitá".**

### #2 — Žádná zpětná vazba na akce, když je hra pozastavená / zmrazená story eventem  [MAJOR]
- **Given** desktop 1280, hra na pauze (⏸) NEBO zmrazená story eventem. **When** hráč klikne na
  akci (daně −/+, koupit 10, přiřadit práci, postavit, přijmout kontrakt). **Then** stav se
  **skutečně změní**, ale **UI se nepřekreslí** — tlačítko vypadá mrtvě; změna se objeví až po
  resume.
- **Reprodukce (ověřeno, debug-pause-render.mjs):**
  - PAUSE → daně „−": UI ukazuje `1→1`; po 1× resume rázem `0`. Změna byla aplikovaná, jen neviditelná.
  - PAUSE → trh „Koupit 10": UI ukazuje owned `0→0`; po resume rázem `10`.
- **Očekávané**: klik = okamžitá vizuální odezva (jako v každé jiné hře).
- **Pozorované**: při pauze/zmrazení nulová odezva → dojem „tlačítka nefungují".
- **Příčina**: `send()` (`src/app/main.js:277-278`) po dispatchi commandu **nevolá
  `requestRender()`**. Překreslení dělá jen herní smyčka přes `onDirty`, a ta se volá **jen když
  `advance()` udělal krok** (`src/app/loop.js:52-53`). Při pauze/`engine.running=false` žádný
  krok → žádné překreslení. Kombinace s #1 (story freeze) je obzvlášť matoucí.

### #3 — Nábor jednotek není v UI vůbec dostupný  [MAJOR]
- **Given** jakýkoli viewport, čerstvá i rozehraná hra. **When** hráč hledá, jak naverbovat
  válečníky/lučištníky (potřebné pro bitvy/obranu). **Then** **žádný z 12 tabů** neobsahuje
  ovládací prvek náboru (0 shod pro „nábor/verbovat/rekrut/recruit" napříč taby; grep `src/ui/`
  = 0 referencí na `recruitUnit`).
- **Očekávané**: existuje UI, které zavolá command `recruitUnit`.
- **Pozorované**: command `recruitUnit` je registrovaný v jádře (`src/core/commands/recruitUnit.js`,
  wired `src/app/main.js:139`), ale **z UI nedosažitelný** → armádu nelze budovat.
- **Příčina**: dark feature — chybí obrazovka/tlačítko náboru (analogie k #4).

### #4 — Tab „Dovednosti" je natrvalo prázdný (dark feature)  [MAJOR]
- **Given** čerstvá hra, desktop. **When** hráč otevře „Dovednosti". **Then** „Žádné dovednosti
  zatím spuštěny." a **0 položek** — a nikde není jak dovednost spustit.
- **Očekávané**: nabídka spustitelných dovedností.
- **Pozorované**: `SkillsScreen` (`src/ui/screens.js:574-603`) renderuje jen existující položky
  `state.home.skills` (`selectors.js:80-88`); tlačítko „Spustit" se ukazuje jen u **už
  existujících** položek. Jediný zapisovatel je command `startSkill`, který se ale volá jen z
  toho tlačítka → **cyklická nedosažitelnost**. Nic dovednosti neseeduje (grep: žádný system je
  neinicializuje). Celá feature je z UI nespustitelná.
- **Příčina**: chybí seed dovedností nebo „katalog dostupných dovedností → Spustit" v UI.

### #5 — Export uložení: tichý zápis jen do schránky, bez potvrzení a bez fallbacku  [MAJOR]
- **Given** desktop. **When** hráč klikne „Exportovat hru". **Then** řetězec se **potichu**
  zapíše do schránky (`navigator.clipboard.writeText`, chyby spolknuty `.catch(()=>{})`,
  `src/app/main.js:289-299`). **Žádné potvrzení, žádné textové pole ani download fallback.**
- **Reprodukce (ověřeno):** v kontextu **bez oprávnění ke schránce** klik na „Exportovat hru"
  neudělá **nic viditelného** (žádný dialog, žádná hláška) → uživatel si nemůže zazálohovat hru.
- **Očekávané**: viditelné potvrzení + fallback (textarea/soubor), když clipboard není dostupný.
- **Pozorované**: bez clipboardu = úplný no-op; s clipboardem = žádná odezva („zkopírovalo se to
  vůbec?"). Relevantní i pro iOS standalone PWA, kde clipboard bývá restriktivní.

### #6 — Importovaná hra se neuloží → reload ji zahodí  [MAJOR]
- **Given** desktop, právě proběhl úspěšný import (`Importovat hru` → validní řetězec). **When**
  hráč obnoví stránku dřív než proběhne 60s autosave. **Then** import je **ztracen** (krok spadne
  zpět na čerstvou hru).
- **Reprodukce (ověřeno):** po importu krok=26; plain reload → krok=1.
- **Očekávané**: import = okamžitý zápis do IndexedDB (jako každé load).
- **Pozorované**: `onImport` (`src/app/main.js:310-321`) jen přepíše in-memory `state`
  (`Object.assign`) a zavolá `requestRender()`, **ale nevolá `autosave.requestSave()`**. Přežije
  jen pokud náhodou vypadne periodický autosave.

### #7 — Rychlé klikání na daně ztrácí kroky (stale closure)  [MINOR]
- **Given** desktop, engine běží (1×, nezmrazeno). **When** hráč rychle klikne „+" 5× po sobě.
  **Then** sazba doskočí jen na **2** místo **5** (rateMax).
- **Reprodukce (ověřeno, debug-rapid-tax.mjs):** 5 rychlých klik `1→2`; 5 rozvláčných klik
  `→5` (funguje).
- **Očekávané**: každý klik +1 → 5.
- **Pozorované**: `onClick` posílá `rate: finance.taxRate + 1` z **naposledy vykresleného**
  snapshotu (`src/ui/screens.js:242-243`), ne z živého stavu; renders jsou throttlované na ~15/s
  (`render.js:23`), takže všechny kliky v jednom render-okně pošlou stejnou hodnotu. Totéž pro „−".

### #8 — Neplatný import je tiše ignorován  [MINOR]
- **Given** desktop. **When** hráč vloží nevalidní řetězec do importu. **Then** **nic** — žádná
  chybová hláška, hra beze změny.
- **Reprodukce (ověřeno):** vložen `THIS-IS-NOT-A-SAVE` → aplikace přežije, ale bez zpětné vazby.
- **Příčina**: `catch (_e) { /* silent */ }` (`src/app/main.js:317-320`). Uživatel nepozná
  neúspěšný import od úspěšného.

### #9 — HUD statistiky se slévají (chybí CSS mezery)  [MINOR]
- **Given** mobil 390×844. **Then** řádek statistik se čte „…**Jídlo: 0Zdraví: OKZločin: 0.0%**"
  — sousední `<span>` se dotýkají (3 páry).
- **Příčina**: `.stats` nemá v `styles.css` žádné pravidlo (žádný gap/flex). Kosmetika, ale
  působí neučesaně.

### #10 — Neostylované dynamické panely (offline summary / catch-up / story / tutorial)  [MINOR]
- **Pozorováno**: offline summary se ukáže jako **holý text bez kontejneru** (`.offline-summary`
  0 pravidel v `styles.css`). Stejná mezera: `.catchup-progress`, story/tutorial overlay (0 hits).
  Naopak bannery (update/export) ostylované jsou. Konzistenční díra: `styles.css` pokrývá „statické"
  obrazovky, ale ne runtime overlay/summary vrstvy. (Souvisí s #1.)

---

## 4. Odlišení: nové bugy vs. známé gapy vs. balanc

- **Všech 10 nálezů je NOVÝCH** — žádný není v `KNOWN_ISSUES.md` (ty se týkají účetnictví,
  military statů, kalibrace katalogů — tj. balanc/data). Moje nálezy jsou **UI / feedback /
  wiring / CSS**, ne balanc.
- **Známé, netestováno mnou**: **N3** (SVG `apple-touch-icon` nefunguje na iOS) — architektův
  review; on-device iOS jsem netestoval (nemám zařízení). **NEOVĚŘENO** zde, ale konzistentní.
- **Balanční otázky**: nehodnotil jsem „správná čísla" (dle scope OUT). Jen pozn.: intro event
  zmrazí engine hned na kroku ~1 a další eventy zmrazují opakovaně během catch-upu — v kombinaci
  s #1/#2 to zesiluje dojem zaseknutí (design/UX, ne „špatné číslo").

---

## 5. Doporučení — co opravit první (prioritizace dle dopadu × četnosti)

**Pořadí oprav (samostatný coder task, mimo scope tohoto QA):**

1. **#2 (render po akci) + #1 (story dialog CSS/pozice/modalita)** — společně. Tohle je jádro
   pocitu „hra je rozbitá / tlačítka nefungují / zamrzlo". Nejlevnější a nejvyšší dopad:
   - `send()` v `main.js` po úspěšném dispatchi zavolej `requestRender()` (nebo obal `send`
     tak, aby vždy plánoval trailing render). Odstraní no-feedback při pauze i story-freeze.
   - Doplň CSS pro `.story-overlay`/`.story-dialog`/`.story-option-btn` (fixed overlay, backdrop,
     z-index, blok pozadí) + `.tutorial-*`, `.offline-summary`, `.catchup-progress`.
2. **#3 (nábor UI) + #4 (dovednosti UI)** — dvě dark-feature díry: hráč nemůže verbovat armádu
   ani spouštět dovednosti. Přidat ovládací prvky (a seed dostupných dovedností).
3. **#6 (import se neuloží) + #5 (export bez feedbacku/fallbacku)** — data-safety: uživatel může
   ztratit import po reloadu a neví, zda export proběhl. Po importu volat `autosave.requestSave`;
   u exportu přidat viditelné potvrzení + textarea/download fallback.
4. **#7, #8, #9, #10 (MINOR)** — stale-closure u daní (číst živý stav / lokální counter),
   chybová hláška u neplatného importu, `.stats` gap, dostylování panelů.

**Regresní rizika oprav**: #2 se dotýká render/loop wiringu — hlídat, ať se nerozbije
render-throttle (iter-021 UX-3, `render.js`) ani determinismus (čistě UI vrstva, `send` nesahá do
core logiky). CSS-only opravy (#1c,#9,#10) jsou bezrizikové. #6 (autosave po importu) hlídat
`lastSimTimestamp` konzistenci.

**Recommendation: NO-GO** pro tvrzení „release kandidát hratelný bez frustrace" bez oprav #1+#2
(min.). Runtime je stabilní (0 crashů), takže po opravě UX vrstvy je hra blízko GO.

---

## 6. Předpoklady a nejistoty

- Testován **lokální HEAD** (dle architekta byte-identický s živou precache). **Živá URL z tohoto
  sandboxu nedostupná** (`ERR_CONNECTION_CLOSED` přes proxy) → produkční cross-check NEOVĚŘENO.
- **iOS/Android on-device NEOVĚŘENO** (headless Chromium). N3 (apple-touch-icon) přebírám jako
  známé.
- Offline test manipuluje **browser čas** (`page.clock`), ne herní stav — deterministické, přes
  veřejné boot/reload chování.
- Nálezy #1/#2 mohly být zdrojem uživatelova hlášení „spousta chyb", ale bez jeho konkrétních
  symptomů to je odvozeno z reprodukce, ne z jeho popisu (dialog s uživatelem selhal — viz brief).
- Root-cause ukazatele na `src/…:řádek` jsou z četby kódu; opravy jsou mimo scope (neměněno).
