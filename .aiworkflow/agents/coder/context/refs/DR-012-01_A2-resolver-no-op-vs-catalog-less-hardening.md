# Decision Record

- **ID**: DR-012-01
- **Date**: 2026-06-13
- **Status**: accepted (Option A, schváleno uživatelem 2026-06-13 v T-004)
- **Related Iteration**: iter-012

## Context
Architekt (T-001) označil A2 (resolver gold/techPt) jako BLOCKER: `resourceKindOf('gold')` prý vrací `'resource'` handler (čte 0) → `pay({gold})` hází + gold neteče do `player.gold`. Reviewer (T-002) empiricky vyvrátil produkční dopad. Orchestrátor nezávisle ověřil:

- `gold`/`techPt` **jsou** v `src/data/resources.json` (`kind:"gold"`/`"techPt"`), `resources` je v `ID_CATALOGS`.
- **S načteným katalogem** (reálná appka, `app/catalogs.js`, i testy co katalog načtou): `resourceKindOf('gold') === 'gold'`, handler čte `player.gold`. → A2 jako produkční fix je **no-op**.
- **Bez načteného katalogu** (např. `calendar.test` bootstrap, který katalogy nenahrává): `resourceKindOf('gold') === 'resource'` → `pay({gold})` hází „insufficient funds". To byl zdroj dříve pozorovaného crashe v orchestrátorově reprodukci.

Pozorované „Zlato 0" z playtestu plně vysvětluje A1 (prázdný start: pop 0 → crime early-return, taxes 0), ne A2.

## Decision
1. A2 **není** produkční blocker; mylný narrativ (accounting porušen, crime hází vždy) se z návrhu odstraní (T-003).
2. Přesto existuje reálná robustness mezera: **A1 seed (pop>0) rozbije catalog-less test harnessy**, protože crime začne platit gold a resolver bez katalogu spadne na `'resource'`. Tuto mezeru je nutné uzavřít — varianta se zvolí v T-003 (viz Alternatives).

## Alternatives Considered
- **Option A — Defensivní early-return v `resourceKindOf`** pro `'gold'`/`'techPt'` (vrátit klíč napřímo před `byId`). Učiní resolver nezávislým na pořadí/načtení katalogu; opraví i catalog-less crash. Cena: 2 řádky, ale je to změna core resolveru.
- **Option B — Načíst katalogy v dotčených test harnessech** (calendar.test apod.). Žádná změna produkčního kódu; ale křehké (každý nový catalog-less test to musí udělat) a neřeší robustness v runtime.

## Trade-offs
- A: robustní, defense-in-depth, levné; mírně rozšiřuje chování resolveru (ale jen pro 2 special měny, které dedikované handlery mají).
- B: nulový dotek produkce; ale nechává latentní fragilitu (resolver závislý na load order) a přenáší zátěž na testy.

## Consequences
- Doporučené pořadí implementace se mění: **A1 → A4 → A3 (jen test) → A5** (+ zvolená varianta robustnosti místo původního A2).
- `accounting-invariant.test` je dnes zelený, protože invariant NEBYL porušen → §7 návrhu se opraví.
- `DAYS_PER_YEAR` je 364 (ne 360/365) — předepsat coderovi pro A4.

## Follow-up Actions
- T-003: architekt přepíše §2/§3/§7/§9, re-diagnostikuje playtest #2, zvolí Option A/B a zafixuje pořadí + DAYS_PER_YEAR=364.
- Orchestrátor doporučuje **Option A** (robustnost > křehkost testů), ale finální volbu nechá na architektovi + human gate T-004.
