# Impl Summary — iter-015 T-006 (M6 T3: academy/university research progres + techPt produkce)

- **Task**: T-006 / BRIEF-015-006
- **Iteration**: iter-015 (M6)
- **Date**: 2026-06-14
- **Status**: done

---

## Změněné soubory: funkce

| Soubor | Funkce / změna |
|---|---|
| `src/core/systems/research.js` | **Nový soubor**: `researchDaily(state, _params, ctx)` — denní research tick (edge `day`, order 75). Akumuluje exp z jobů (per `def.category` → `JOB_SECTOR_MAP`) + z academy/university budov (`effective(buildingId,'researchExp',state) * created`). Při `exp >= techCap(level)`: while-loop level-up + `grant(state, {techPt:1}, 'research:<sector>', ctx, step)`. Deterministické (žádný RNG). |
| `src/core/engine/tickOrder.js` | `registerCorePeriodics`: přidán `register(registry, 'research.daily', researchDaily)` + periodic entry `{id:'research.daily', every:'day', order:75, systemFn:'research.daily'}`. Import `researchDaily` ze systems/research.js. |
| `src/core/balance/balance.js` | Přidána sekce `research`: `sectorIds` (6 sektorů z techs.js:70), `jobSectorMap` (kategorie jobu → sektor). Provenance: approximated (gap G-JOB-SECTOR-MAP). |
| `tools/extract/extractors/jobs.mjs` | `extractJobs()`: přidáno `category` pole per job — agriculture (farmer/cheesefarmer/fisher), forestry (hunter/woodcutter), crafts (baker/miner). Provenance: approximated (gap G-JOB-SECTOR-MAP). |
| `tools/extract/extractors/buildings.mjs` | `extractBuildings()`: přidány budovy `academy` (researchExp:2, attractiveness:10) a `university` (researchExp:5, attractiveness:20). Gap G-RESEARCH-ACADEMY. Provenance: approximated. |
| `src/data/jobs.json` | Regenerováno z extract — obsahuje `category` pole per job. |
| `src/data/buildings.json` | Regenerováno z extract — obsahuje `academy` a `university` budovy. |
| `src/precache.js` | Regenerováno (buildings.json změna ovlivňuje manifest hash). |
| `test/m6-tech-research.test.js` | **Nový soubor**: 25 testů pokrývající: exp akumulace z jobů, exp z academy/university přes effective(), level-up + techPt grant (tabulkový test s techCap), multi-level-up (catch-up-safe while-loop), determinismus (no-RNG), persist round-trip, fresh-vs-load determinismus (DR-012-02), tickOrder registrace (order 75 > buildings.age 70), lazy sector init. |

---

## Jak research produkuje techPt

### 1. Zdroje exp

**Zdroj 1: Joby per kategorie** (design §3.2 krok 1, port techs.js:54-60)

| Job | Kategorie | Sektor |
|---|---|---|
| farmer, fisher, cheesefarmer | agriculture | agriculture |
| hunter, woodcutter | forestry | forestry |
| baker, miner | crafts | crafts |
| builder | builder | (vyloučen) |

Exp per tick = `Σ job.number` pro joby v dané kategorii.

**Zdroj 2: Academy/university budovy** (design §3.2 krok 2, gap G-RESEARCH-ACADEMY)

| Budova | researchExp (base) | Distribuce |
|---|---|---|
| academy | 2 per instance | do všech 6 sektorů |
| university | 5 per instance | do všech 6 sektorů |

Bonus = `effective(buildingId,'researchExp',state) * created` per sektor.

### 2. Level-up a techPt

```
while (sec.exp >= techCap(sec.level)):
  sec.exp -= techCap(sec.level)
  sec.level += 1
  grant(state, {techPt:1}, 'research:<sector>', ctx, curStep)
  // techCap: 100, 125, 156, 195, 244, ... (formulas.js:31)
```

**Tabulkový test techCap** (gate requirement):
| level | techCap |
|---|---|
| 0 | 100 |
| 1 | 125 |
| 2 | 156 |
| 3 | 195 |
| 10 | 931 |

### 3. Catch-up-safe

- `while` smyčka zpracuje N level-upů v jednom tick-u
- Test: 3× tick s 10 farmery ≡ 1× tick s 30 farmery (stejný výsledek)
- Order 75 na `day` edge → 1× per herní den, levné v offline dávce

---

## Gate výstup

- **npm run ci**: **1071 testů, 1071 pass, 0 fail** ✅ (+25 nových testů)
- **npm run smoke**: **SMOKE OK**, 0 console errors ✅
- **Determinismus G1** (iter005-edge.test.js): 16/16 pass ✅ (nedotčeno)
- **Round-trip identita M5-1** (m5-buildings-t4.test.js): 44/44 pass ✅ (nedotčeno)
- **Round-trip M6** (m6-tech-roundtrip.test.js): 19/19 pass ✅ (nedotčeno)
- **Research round-trip + fresh-vs-load**: ✅ (m6-tech-research.test.js)
- **Determinismus**: ✅ (no Math.random; same inputs → same research state)
- **Catch-up-safe**: ✅ (while-loop; batch test ověřen)
- **Precache regenerace**: ✅ (buildings.json změna zpracována)

---

## Gaps (zdokumentované, neblokující)

- **G-RESEARCH-ACADEMY**: researchExp hodnoty approximated (academy=2, university=5); calibration M9
- **G-JOB-SECTOR-MAP**: přesné mapování jobů na sektory není v extracted dump; approximated; calibration M9
- **G-RESEARCH-UNIV-RNG**: university RNG scholar bonus vynechán (Math.random → gap); determinismus má přednost (design §3.2)
- **G-RESEARCH-ACADEMY-SECTOR**: academy/university exp distribuován do VŠECH sektorů rovnoměrně; per-sector budova (researchSector) = future M9

---

## Klíčová rozhodnutí / odchylky

- **Job kategorie v extractor**: přidány do `extractors/jobs.mjs` (ne přímo do JSON) — konzistentní s extract pipeline; jobs.json je generovaný soubor
- **Academy/university v extractor**: přidány do `extractors/buildings.mjs` — stejný pattern
- **research.sectors lazy init**: sektor vzniká až při první akumulaci (`if(!sec) sec={level:0,exp:0}`) — identický vzor jako jobs (design §3.1)
- **Persist via PERSIST_SCHEMA.player**: `research` je v allowlistu (přidáno T-004); persists automaticky celý `state.player.research` objekt — `researchDaily` nikdy nepíše `cap/progPct` do sektorů → payload obsahuje jen `{level,exp}` per sektor
- **`effective()` cesta pro researchExp**: buildings.json přidán `{attr:'researchExp',op:'add',value:N}` efekt → `effective('academy','researchExp',state)` čte base z katalogu + modifier fold; výsledek 0 pokud katalog nenačten (safe)
