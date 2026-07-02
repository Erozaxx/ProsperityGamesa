# Re-verify Vlny 1 (iter-022 T-003) — nálezy #1, #2, #10

- **Autor**: tester (QA)
- **Datum**: 2026-07-02
- **Testovaný HEAD**: `fde32b3` (obsahuje Vlnu 1 = commit `0e320e6`)
- **Vstupy**: původní report `artifacts/final/e2e-rum-report_post-iter-021.md`,
  coder záznam `.aiworkflow/agents/coder/artifacts/final/wave1_iter-022.md`
- **Režim**: read-only vůči hernímu kódu (`src/` nedotčeno; měněny pouze tester harnessy ve `scratch/`)

## Verdikt (TL;DR)

| Nález | Verdikt | Důkaz |
|---|---|---|
| **#1** story dialog (a: unstyled, b: below-fold, c: not-modal) | **RESOLVED** | DOM měření na 320/360/390/1280: `position:fixed`, `z-index:1000`, backdrop `rgba(0,0,0,0.65)`, dialog + tlačítko plně ve viewportu, hit-test blokuje pozadí, ack funguje, engine resumuje |
| **#2** render-on-send (žádná odezva při pauze/freeze) | **RESOLVED** | Reprodukce původního scénáře: PAUZA → daně „−" UI `1→0` OKAMŽITĚ (krok stále 6); PAUZA → „Koupit 10" owned `0→10` OKAMŽITĚ (krok stále 6) |
| **#10** panely `.offline-summary` / `.catchup-progress` | **RESOLVED** | F8 computed-style: offline-summary má border+surface pozadí (styled check prošel); catchup-progress `{hasContainer:true, border:"solid", bg:"rgb(26,46,34)", hasBar:true, barBg:"rgb(76,175,80)"}` |
| **Regrese** | **ŽÁDNÁ** | 0 console.error / 0 pageerror / 0 requestfailed / 0 h-overflow @320/360/390/1280 napříč všemi flow F1–F9 |

**Recommendation: Go** pro Vlnu 1. Zbylé nálezy (#3/#4/#5/#6/#8/#9) přetrvávají beze změny — Vlna 2, mimo scope.

## Jak spustit (reprodukovatelnost)

```bash
cd /home/user/ProsperityGamesa
# targeted re-verify #1/#2 (45 asertů):
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node .aiworkflow/agents/tester/scratch/reverify-wave1.mjs
# plný regresní běh (F1–F9, RUM):
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node .aiworkflow/agents/tester/scratch/e2e-rum.mjs
```

Oba běhy reálně provedeny na HEAD `fde32b3`; targeted skončil `failures=0`, plný běh exit 0
(žádný HARNESS-FLOW-CRASH).

## #1 — Story dialog: RESOLVED (vč. #1c modality)

Nový targeted harness `scratch/reverify-wave1.mjs` (R1) měří DOM na **320×568, 360×800,
390×844, 1280×800** — všech 40 asertů PASS:

- `.story-overlay`: `position:fixed`, `z-index:1000`, backdrop `rgba(0, 0, 0, 0.65)`,
  pokrývá celý viewport (`top=0`, `bottom=viewportH`) — na všech 4 šířkách.
- `.story-dialog` **plně ve viewportu** (např. @320: `{top:181,bottom:387,left:16,right:304}`;
  @1280: `{top:308,bottom:492,left:430,right:850}`), option tlačítko viditelné a klikatelné.
- **#1b (below-fold) po přepnutí tabu**: pozadí je nyní modálně blokované, takže původní krok
  „přepni tab při otevřeném dialogu" už nejde provést (správně). Ekvivalentní ověření: scroll
  stránky až dolů (`scrollTo(0, scrollHeight)`) → overlay **zůstává ve viewportu** (`top=0`,
  `inViewport:true`) na všech šířkách — fixed pozice nemůže skončit pod okrajem. Navíc F1
  (390×844) potvrzuje in-viewport dialog přímo po bootu a plný běh žádný
  STORY-DIALOG-BELOW-FOLD/UNSTYLED nález nevyhodil.
- **#1c modalita**: hit-test `elementFromPoint` ve středu tab-tlačítka „Trh" při otevřeném
  dialogu vrací overlay/`.story-text`, **ne** tab → kliky na pozadí jsou blokovány (na všech
  4 šířkách PASS). Původní F1 check `tap('Trh')` nyní správně selže timeoutem → finding
  STORY-DIALOG-NOT-MODAL se už negeneruje.
- **Funkční tlačítko + resume**: ack zavře dialog NEBO řetězí další intro event (by design:
  `src/data/story.json` intro option má `next:"introWorld"`, `nextDelaySteps:0`); po odkliknutí
  celého intro řetězu engine resumuje (`krok 1 → 34` na všech šířkách).

## #2 — Render-on-send: RESOLVED

Targeted R2 (desktop 1280×800) reprodukuje přesně původní scénář z reportu:

- PAUZA (⏸) potvrzena: `krok 6 → 6` po 1.2 s.
- **Daně „−" při pauze**: UI `1 → 0` do 400 ms, krok stále 6 (žádný skrytý resume).
  Původně: `1 → 1`, změna až po resume.
- **Trh „Koupit 10" při pauze**: owned `0 → 10` do 400 ms, krok stále 6.
  Původně: `0 → 0`, změna až po resume.
- **Story-freeze varianta**: po opravě #1c je pozadí při story eventu blokované overlayem,
  takže původní kroky (klik na akci během freeze) už nejsou proveditelné — scénář je
  designově eliminován. Mechanismus je identický (engine.running=false, render jen přes
  `send()→requestRender()`), ověřeno pause větví.
- **Bonus (side effect)**: původní MINOR **#7 TAX-RAPID-CLICK-LOST už nereprodukovatelný** —
  10 rychlých kliků „+" z 0 končí na **5 = rateMax** (původně 1–2). Render-on-send obnovuje
  vykreslený snapshot dost rychle na to, aby stale-closure okno zmizelo. F4 finding se negeneruje.

## #10 — Panely: RESOLVED

Plný běh F8 (offline catch-up +30 min, `krok 4 → 35905`):

- `.offline-summary`: styled check (bg ≠ transparent ∨ border ≠ none) prošel → finding
  OFFLINE-SUMMARY-UNSTYLED se negeneruje. Summary viditelné s tlačítkem OK.
- `.catchup-progress` (nový assert v harnessu, vzorkováno za běhu catch-upu):
  `{"hasContainer":true,"border":"solid","bg":"rgb(26, 46, 34)","hasBar":true,"barBg":"rgb(76, 175, 80)"}`
  → kontejner + vizuální progress bar, ne holý text.

## Modalita #1c vs. harness F4 (potvrzení coder analýzy)

Coder hlásil intermitentní timeout `clickTab('Rada')` ve F4 — správně diagnostikováno jako
**harness gap, ne produktová chyba**: story event na hranici dne legitimně otevře modál a ten
(nyní správně) blokuje klik na tab pod sebou. **Opraveno v harnessu** (doporučeným způsobem):
`clickTab()` v `scratch/e2e-rum.mjs` nyní volá `clearOverlays()` před každým tab-klikem.
Ověřeno plným během: F4 prochází čistě (daně, rychlosti 1×=20.3/2×=40.0 kroků/s, pauza OK)
a F7 dokonce trefil přesně hranici dne (`krok=901` před reloadem) a prošel — dřív by spadl.

## Regrese / RUM (plný běh F1–F9 na HEAD)

| Flow | CE | CW | PE | RF | Poznámka |
|---|---|---|---|---|---|
| F1 story-event UX 390×844 | 0 | 0 | 0 | 0 | jen známý #9 (HUD-STATS-SQUASHED, Vlna 2) |
| F2 tab-sweep 1280 | 0 | 0 | 0 | 0 | 0 nálezů, 0 overflow |
| F3a/b/c tab-sweep 390/360/320 touch | 0 | 0 | 0 | 0 | 0 nálezů, 0 overflow |
| F4 economy-loop | 0 | 0 | 0 | 0 | jen známý #4 (SKILLS-DARK-FEATURE); #7 už NEreprodukovatelný |
| F5 market/build/contracts | 0 | 0 | 0 | 0 | vše funguje (buy/sell/karavana/kontrakt) |
| F6 recruit-audit | 0 | 0 | 0 | 0 | jen známý #3 (NO-RECRUIT-UI) |
| F7 save→reload | 0 | 0 | 0 | 0 | obnova OK i přes hranici dne (krok 901) |
| F8 offline catch-up | 0 | 0 | 0 | 0 | 0 nálezů — #10 vyřešen |
| F9 export/import | 0 | 0 | 0 | 0 | jen známé #5/#8 (+ #6 chování trvá: krok 25→1 po reloadu) |

- Targeted běh: `failures=0`, RUM `consoleErrors=0 pageErrors=0 requestFailed=0`.
- Přetrvávající nálezy jsou **identické s původním reportem** (#3, #4, #5, #6, #8, #9) —
  žádný nový nález, žádné zhoršení → **bez regrese**. Vše Vlna 2 (mimo scope T-003).

## Předpoklady a nejistoty

- Testován lokální HEAD v headless Chromium; živá URL a iOS on-device mimo dosah sandboxu
  (stejně jako v původním reportu).
- „Po přepnutí tabu" u #1b ověřeno ekvivalentem (scroll-to-bottom + hit-test blokace),
  protože přepnutí tabu při otevřeném dialogu je nyní záměrně nemožné; čekání na další
  story event na tabu Trh (75 s okno) v běhu nenastalo — pokryto scroll checkem a F7/F4
  průchody přes hranice dne.
- Artefakty běhů: targeted output v tomto reportu; plný JSON
  `/tmp/.../scratchpad/e2e-rum-reverify.json` (transientní).
