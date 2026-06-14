# QA Report — iter-012 T-010 (Independent QA)

- **Agent**: tester
- **Iteration**: iter-012
- **Task**: T-010 — nezávislá QA celé implementace iter-012 (playability A1–A5 + reload-determinismus fix)
- **Date**: 2026-06-13
- **Branch**: feature/iter-012-init
- **Method**: Empirické ověření vlastním během (ne opis coderových tvrzení). Helper skripty:
  `.aiworkflow/agents/tester/state/qa_harness_T-010.mjs`, `qa_cap_stress_T-010.mjs` (necommitnuto, jen tester state).
- **Scope OUT**: produkční kód nezměněn. Git working tree čistý (jen 2 untracked tester helpery).

## VERDIKT: **GO**

Všech 6 acceptance kritérií PASS, empiricky ověřeno. Žádný blocker.

---

## AC1 — `npm run ci` zelené — **PASS**

Spuštěno `npm run ci` (typecheck + lint:core + test).
- **Důkaz**: exit 0. `# tests 778 # suites 193 # pass 778 # fail 0 # cancelled 0 # skipped 0`.
- typecheck: 0 errors; lint:core: OK; `node --test`: 778/778 pass, 0 fail.

## AC2 — `npm run smoke` OK — **PASS**

Spuštěno `npm run smoke`.
- **Důkaz**: exit 0. `SMOKE OK: app rendered, 0 console errors.`
- UI head: `Rok 1 · den 1 ... Lid: 50 (+0/-0)`, `Populace 50` → seeded pop=50 potvrzeno, 0 console errors.

## AC3 — Dlouhý seedovaný sim ≥2 herní roky bez crashe, populace nevybuchne ani nespadne na 0 — **PASS**

Fresh seedovaný start (createInitialState + initRng, katalogy načteny jako v produkci), sim přes
**655 200 kroků = 728 herních dní = 2 roky** (DAYS_PER_YEAR=364, 900 kroků/den).
- **Důkaz (qa_harness_T-010.mjs)**: `stepsRun=655200/655200 absDay=728 (Rok 2) startPop=50 finalPop=36
  maxPop=50 minPop=36 cap=10000 startGold=500 finalGold=13430 crash=none`.
  - noCrash=true (žádná výjimka, pop/gold vždy finite ≥0 po celý běh)
  - capHeld=true (maxPop=50 ≤ 10000)
  - notZero=true (finalPop=36 > 0, žádný nesmyslný kolaps na 0)
- **Sanity-cap stress (qa_cap_stress_T-010.mjs)**: aby se ověřilo, že cap reálně drží i při explozivním
  růstu (default seed populaci nevyhnal nahoru), spuštěn scénář pop=cap−5, housing=5000 stanů, jídlo
  doplňováno, 200 dní:
  `cap=10000 maxPop=9995 finalPop=2727 overshoot=0 bad=none` → **PASS (cap drží, žádná exploze ani
  overshoot nad 10000)**. Potvrzuje A4 sanity-cap (žádný pre-fix 50→~8749/rok růst).

## AC4 — Accounting invariant: Σ gold-tx == Δ player.gold — **PASS**

Veřejné API: `ctx.emitTx` napojeno stejně jako produkce (`app/main.js`: `ctx.emitTx = recordTx`),
zde akumuluje gold transakce. Běh 81 000 kroků (90 dní) — pokrývá localTaxes (5days), monthlyTaxes,
upkeep:military (month), crime:loss (noon). **Per-step rekonciliace**: pro každý krok porovnán reálný
Δ`player.gold` se součtem gold-tx daného kroku (odhalilo by přímou mutaci mimo resource layer i clamp).
- **Důkaz**: `startGold=500 endGold=2030 ΔrealGold=1530 ΣgoldTx=1530 diff(total)=0 txTotal=659
  goldTx=21 maxStepDiscrepancy=0`.
- Σ gold-tx (1530) == Δ player.gold (1530), diff=0. **maxStepDiscrepancy=0 přes všech 81 000 kroků**
  → žádná přímá mutace zlata mimo `pay`/`grant`, žádný clamp event. Invariant drží i po A2 fixu resolveru
  (gold/techPt resolvovány dedikovaným handlerem).

## AC5 — G1 determinismus po load na PLNÉM `hashState` — **PASS**

save→load→N kroků == kontinuální N kroků, **bit-shoda celého `hashState`** (ne jen perzistovaná
projekce). Fresh seedovaný start, TOTAL=1200 kroků (přes quarterDay 225 i denní hranici 900).
Save-pointy vč. brzkých (krok 0, 1, 2) i kolem hran (225/226, 450, 899/900/901). Load přes
`loadGame(slot, {})` → `loadAndReconstruct` (rebuild-on-load workforce.total).
- **Důkaz (qa_harness_T-010.mjs)** — všech 10 save-pointů bit-shoda plného hashState:
  - BREAK=0:   A=2110846846 C=2110846846 OK
  - BREAK=1:   A=1889980770 C=1889980770 OK
  - BREAK=2:   A=4141917273 C=4141917273 OK
  - BREAK=113: A=848063253  C=848063253  OK
  - BREAK=225: A=787851954  C=787851954  OK
  - BREAK=226: A=2274315389 C=2274315389 OK
  - BREAK=450: A=2393320102 C=2393320102 OK
  - BREAK=899: A=1217399652 C=1217399652 OK
  - BREAK=900: A=4191955273 C=4191955273 OK
  - BREAK=901: A=1880599537 C=1880599537 OK
- Brzký save (krok 0/1) — dříve root cause desyncu `rng.streams.population` (DR-012-02) — nyní shoda.
  Derive-on-init (T-016) + rebuild-on-load (T-014) drží jeden invariant na obou cestách.
- CI navíc obsahuje stejný invariant jako relativní test: `iter005-edge` G1 (plný hashState),
  `app-bootstrap` S-1, `export-string` round-trip — všechny zelené.

## AC6 — Tvar save v3: `applyPersist(state)` NEobsahuje `workforce.total` — **PASS**

- **Důkaz (qa_harness_T-010.mjs)**:
  - fresh: `payload.home.workforce = {"assigned":0}` → bez `total` (OK)
  - po 1000 krocích (live `workforce.total=15`): `payload.home.workforce = {"assigned":15}` → bez `total` (OK)
  - `meta.saveVersion=3` (tvar save v3 beze změny)
- `workforce.total` zůstává neperzistované odvozené pole (persistSchema.js); ukládá se jen `assigned`.

---

## Regresní rizika / poznámky
- `workforce.total` je nyní derivováno na 3 kanonických místech přes `deriveWorkforceTotal`
  (createInitialState, load Step 5, autoAssignWorkers) — single source of truth, žádná 4. inline kopie.
  Riziko: budoucí změna `workerSlots`/houseTypes katalogu se musí promítnout konzistentně do init i load
  (drženo společným helperem → nízké riziko).
- A2 resolver: gold/techPt early-return je no-op s načteným katalogem; katalog-less harnessy nyní
  resolvují korektně. Žádný behavior change v produkční cestě (potvrzeno AC4 invariantem).
- `npm run smoke` startuje s seeded pop=50, gold se reálně hýbe (taxes/grant → player.gold; AC4
  finalGold=13430 přes 2 roky) — exit kritérium "zlato se v UI reálně hýbe" splněno.
- Helper skripty (necommitnuté) lze v budoucnu povýšit na CI test (zejména AC5 multi-save-point
  full-hashState a AC4 per-step rekonciliace dávají hodnotu nad rámec stávajících relativních testů).

## Reprodukce
```
cd /home/user/ProsperityGamesa
npm run ci          # 778/778 pass
npm run smoke       # SMOKE OK, 0 console errors
node .aiworkflow/agents/tester/state/qa_harness_T-010.mjs      # AC3/AC4/AC5/AC6 -> GO
node .aiworkflow/agents/tester/state/qa_cap_stress_T-010.mjs   # AC3 cap stress -> PASS
```
