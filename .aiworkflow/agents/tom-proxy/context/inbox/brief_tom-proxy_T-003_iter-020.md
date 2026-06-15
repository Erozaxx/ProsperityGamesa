# Brief

- **Brief ID**: BRIEF-020-003
- **Iteration**: iter-020 (M9a – Balanční kalibrace)
- **From**: Orchestrator
- **To**: tom-proxy (human gate)
- **Date**: 2026-06-15

## Goal
**Human gate**: schval (nebo vrať) M9a design jménem uživatele PŘED implementací. Technický + architektonický review proběhl (reviewer GO-s-podmínkami, 0 blocker/0 major). Posuď **produktová rozhodnutí** — zejm. **hodnotu offline capu (R2b)**, kterou architektura směruje na uživatele. Mandát: auto-ano u gate v rámci scope; eskaluj jen nevratné/scope/mimo-mandát.

## Klíčová produktová rozhodnutí
1. **Offline cap hodnota (R2b/D10 — HLAVNÍ)**: nová konstanta `offline.capBalanceRealHours`, engine `min(capTech=8h, capBalance)`. Architekt nabízí:
   - **var. A = 8 h** (doporučeno) — maximální idle-friendly, nulové riziko frustrace, **reverzibilní config**. = stejné jako dnešní efektivní cap (capTech 8h).
   - **var. B = 2 h** (~160 herních dní progresu) — blíž §9.2b, mírnější idle.
   - **var. C = 0.5 h** (~52 dní, comeback loop) — **mění herní feel → vyžaduje user-eskalaci**.
   - **Pozn.**: cap je reverzibilní config (lze kdykoliv změnit). Pokud volíš A nebo B → rozhodni v mandátu. Pokud bys volil C (mění feel) → eskaluj uživateli. Doporučení orchestrátora: **A** (idle hra, drž plynulost, finální feel-ladění může přijít s reálným playtestem v M9b).
2. **Hratelnostní cíle trhu (S-03)**: 3 měřitelné cíle (recovery k baseline za 14 dní, arbitráž neztrátová, drift nevyhladí dopad za den), driftK=0.2 potvrzeno. → OK jako definice "vyladěného trhu"?
3. **Vědomé balanční odchylky**: home.js:970 (JS precedence bug originálu) → zvolena ZAMÝŠLENÁ varianta (inoculation tech funguje), zapsáno jako `original-intended`. `capBalanceRealHours` název diverguje od arch `capRealHours` (záměrná separace tech/balance). → OK vědomé odchylky?

## Co NEřešit
- Technické podmínky (MINOR-1 CATCHUP_CAP_MS drátování, sampler cesty) — vyřešeno reviewerem + carry do coder briefů (DR-020-01).
- Finální R-G licence před VEŘEJNÝM vydáním = M9b (iter-021) — samostatný explicitní user gate, NE teď.

## Inputs
- Design: `context/refs/design_iter-020_T-001.md` (T1–T4, §3 cap varianty)
- DR-020-01 (`context/refs/`), architektura §9.1/§9.2a/D10/R2b
- Cíl: `zadani_projektu.md` (idle/offline hraní), `project/done-criteria.md`

## Acceptance Criteria
- Verdikt: SCHVÁLENO / SCHVÁLENO s výhradou / VRÁCENO.
- **Explicitní volba cap varianty (A/B/C)** + zdůvodnění. Pokud C → eskalace uživateli.
- Krátké stanovisko k cílům trhu + vědomým odchylkám.

## Expected Outputs
- `agents/tom-proxy/artifacts/final/gate_iter-020_T-003.md`

## Workflow po dokončení
- `agents/tom-proxy/state/current-task.md` → done
- `bash agents/tom-proxy/scripts/handoff-out.sh T-003 "<verdikt + cap volba A/B/C>"`
- NEcommituj (git).
