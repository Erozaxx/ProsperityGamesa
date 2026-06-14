# Brief

- **Brief ID**: BRIEF-015-003
- **Iteration**: iter-015 (M6 – Výzkum & tech strom)
- **From**: Orchestrator
- **To**: tom-proxy (human gate)
- **Date**: 2026-06-14

## Goal
**Human gate**: schval (nebo vrať) M6 design jménem Toma PŘED implementací. Technický review proběhl (reviewer GO-s-podmínkami, architekt M-1/M-2/m-3 zapracoval). Posuď **produktová rozhodnutí** (věrný hratelný rebuild, MVP-first, plynulost). Mandát: auto-ano u gate v rámci scope; eskaluj jen nevratné/scope/mimo-mandát.

## Klíčová produktová rozhodnutí
1. **G-LISTTECHS — approximovaný tech strom**: originál fetchoval listTechs za runtime (není v dumpu). Vzorec `techCap=100×1.25^level` JE doložitelný (už ve formulas.js). Strom = **6 sektorů + ~6 techů** approximovaných (efekty jako modifikátory), provenance:'approximated', kalibrace M9. → Přijatelné dodat min. tech strom teď a doladit M9? (analogické G-LISTBUILDINGS schválenému dřív)
2. **G-TECH-JOB-EFFECTIVE — tech efekty na joby zatím no-op**: `jobsProduction` čte produkci přímo z katalogu, ne přes `effective()` → tech bonusy na job-produkci se zatím neprojeví. Demo techy proto cílí na **building agregáty** (sklady/attractiveness), které přes effective() reálně fungují. Plné napojení tech→joby odloženo na M9. → Přijatelné, že M6 demonstruje techy přes budovy a tech→joby přijde v M9?
3. **University Math.random bonus vynechán**: originál měl náhodný bonus k research u university; M6 ho vynechává kvůli determinismu (catch-up-safe). Gap, případně deterministická náhrada M9. → OK obětovat tento náhodný prvek za determinismus?
4. **K13 se uzavírá plně**: techy = druhý zdroj modifikátorů (po budovách) přes stejnou vrstvu. → OK?

## Co NEřešit
- Technické detaily (generalizace rebuild, persist, guard) — vyřešeno reviewerem + architektem.

## Inputs
- Design (revidovaný): `context/refs/design_iter-015.md` (čti changelog Revize T-002a, §1.3a/§2.6/§2.7, G-LISTTECHS, G-TECH-JOB-EFFECTIVE)
- DR-015-01, DR-013-00 (`context/refs/`)
- Cíl: `zadani_projektu.md`, `project/done-criteria.md`

## Acceptance Criteria
- Verdikt: SCHVÁLENO / SCHVÁLENO s výhradou / VRÁceno.
- U každého ze 4 rozhodnutí krátké stanovisko (OK / OK s pozn. / problém).

## Expected Outputs
- `agents/tom-proxy/artifacts/final/gate_iter-015_T-003.md`

## Workflow po dokončení
- `agents/tom-proxy/state/current-task.md` → done
- `bash agents/tom-proxy/scripts/handoff-out.sh T-003 "<verdikt + výhrady>"`
- NEcommituj (git).
