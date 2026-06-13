# DR-013-00 — Milestone renumbering + autonomní doběh M5–M9

- **Datum**: 2026-06-13
- **Stav**: Schváleno uživatelem
- **Kontext**: orchestrátor (autonomní run)

## Rozhodnutí
1. **Posun číslování iterací vůči master plánu (iter-003).** Master plán mapoval iter-012=M5 … iter-018=M9b. Po MVP playtest checkpointu (§2.1) byla ale vložena reálná **iter-012 = playability hardening** (A1–A5 + reload-determinismus fix, mimo původní milníkovou osu). Všechny implementační milníky M5–M9 se proto posouvají o +1:

| Milník | Plán (iter-003) | Skutečná iterace |
|---|---|---|
| M5 Budovy/stavba/kontrakty | iter-012 | **iter-013** |
| M6 Výzkum & dovednosti | iter-013 | **iter-014** |
| M7a AI svět, jednotky | iter-014 | **iter-015** |
| M7b Bitvy | iter-015 | **iter-016** |
| M8 Příběh & meta | iter-016 | **iter-017** |
| M9a Balanční kalibrace | iter-017 | **iter-018** |
| M9b Release kandidát | iter-018 | **iter-019** |

Obsah, tasky, DoD, test loop a review gate každého milníku zůstávají dle master plánu iter-003 §3 (jen se čte „o jedna výš").

2. **Autonomní doběh M5–M9.** Uživatel pověřil orchestrátora dotáhnout celý master plán do konce bez čekání na vlastní testování („nebudu mít čas nic testovat"). Human-in-the-loop gaty (schválení architektury, eskalace gap/cap hodnot, licence) zastupuje **tom-proxy** agent; orchestrátor je informuje v shrnutích. Každá iterace se po reviewer GO uzavře, PR → merge do main (checkpoint).

## Důsledky
- Kritická cesta zůstává lineární (master plán §2.2): iter-013 → 014 → 015 → 016 → 017 → 018 → 019.
- Stuby world/battle (z iter-007 M2a) se plně nahrazují v iter-015/016 dle kontraktů §8.
- Katalogy (military/zones/techs/achievements) už extrahované v M1; systémy nad nimi se teprve implementují.
- Split-triggery z plánu platí (M5-1/M5-2 v iter-013, M7a-1/M7a-2 v iter-015).

## Reference
- Master plán: `agents/project-manager/artifacts/final/iteration_master_plan_iter-003_T-001.md`
- DR-002 (precedens autonomního běhu MVP)
