# Current Task

- **Task ID**: T-003
- **Brief**: BRIEF-019-003 (human gate M8 design)
- **Iteration**: iter-019
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-15
- **Completed**: 2026-06-15

## Co teď dělám
Hotovo — human gate na M8 design (Příběh & meta: importantEvent+ack engine-stopping, intro/tutoriál/dialogy, achievementy deklarativně K18, UI event bus efemérní) vydán jménem Toma.

## Dílčí checklist
- [x] Přečíst AGENTS.md + brief
- [x] Přečíst design_iter-019.md (T1 importantEvent, T2 intro/R-G, T3 achievementy K18, T4 UI bus) + DR-019-01 + DR-013-00
- [x] Přečíst zadani_projektu.md (R-G/PROVENANCE) + done-criteria.md
- [x] Posoudit 4 produktová rozhodnutí jménem Toma
- [x] Vydat verdikt → artifacts/final/gate_iter-019_T-003.md

## Verdikt
SCHVÁLENO (proceed na implementaci M8). Bez eskalace — vše v mandátu DR-013-00.
1. M8 = poslední obsahová vrstva (intro/story/achiev/notif) — OK (uzavírá obsah, naplnění existujících slotů, SPLIT=NE ok)
2. R-G vlastní/parafráze texty (provenance:'original-paraphrased') — OK (přesně Scope OUT zadání + PROVENANCE; číselné prahy=fakta; reviewer T-REV ověří; finální licence až M9b/iter-021, zde nepredjímána, vratné)
3. Achievementy deklarativně, centrální evaluator (C4 fix) — OK (čistší + věrnější, grep gate chrání proti C4)
4. UI event bus efemérní mimo hashState (engine nesahá na DOM, C1 fix) — OK (determinismus chráněn, catch-up agreguje)

## Předpoklady
- Mandát DR-013-00 (delegace human gatů vč. licence na tom-proxy v autonomním doběhu M5–M9).
- Reviewer T-002 GO bez podmínek; DR-019-01 impl poznámky carry do coder briefů.
- Precedens gatů iter-013..018 T-003 (všechny SCHVÁLENO).

## Blockery
–
