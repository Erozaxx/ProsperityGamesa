# Brief

- **Brief ID**: BRIEF-019-001
- **Iteration**: iter-019 (M8 – Příběh & meta vrstva)
- **From**: Orchestrator
- **To**: architect
- **Date**: 2026-06-15

## Goal
Detailní implementační design **M8** (importantEvent/story, intro/tutoriál+dialogy, achievementy K18, notifikace/gamelog) na úroveň pro Sonnet codera. Poslední obsahová vrstva (M9 = kalibrace+release). Drž architekturu iter-002 (§3.4, §7.2, K14, D10). Design, ne kód. **ROZHODNI SPLIT.**

## Stav repo
- **`src/data/achievements.json`** (extracted, reálná data): achievementy se `level` (settlement/village/…). NENÍ vyhodnocovací systém.
- **Žádný story/importantEvent/acknowledgeEvent systém** v core (staví od nuly).
- **Žádný gamelog/notif UI** (`src/ui/` nemá).
- Registr efektů K14 (`src/core/registry/effects.js`), schedule, catch-up (`src/core/engine/catchup.js`, D10 pauza), persist `src/save/`, UI `src/ui/` (pure komponenty, taby), commands dispatch.
- Originál: `doc/original_source/.../events.js`, `game.js` (story/importantEvent/achievement zdroj).

## Zadání designu (master plán §3/iter-016(M8), T1–T4)
1. **T1 – importantEvent + story progres**: `state.story.*` (story progres serializovatelný), **engine-stopping eventy** jako doménová událost (§3.4) — engine se pozastaví, čeká na `acknowledgeEvent` command; interakce s **catch-up pauzou** (D10 — engine-stopping event uprostřed catch-up dávky přeruší dávku, pokračuje po ack). Eventy přes registr efektů / schedule, serializovatelné.
2. **T2 – Intro/tutoriál + dialogy**: obsah jako **data** přes registr efektů K14 (string-ID + params), ne imperativní háčky. **Vlastní texty** (R-G licence — NE 1:1 převzetí originálu; parafráze/vlastní znění; eviduj provenance).
3. **T3 – Achievementy deklarativně (K18, §7.2)**: `{id, when: predicate-as-data}` — predikát jako data, ne kód rozsetý po mechanikách (C4 anti-pattern). Vyhodnocení na denním ticku + tx/doménových událostech. Unlock mechanismus (achievement → odemčení map/mechanik dle designu). `state.achievements` (unlocked) persist.
4. **T4 – Notifikace/confetti/hudba/devlog**: **efemérní UI event bus** — engine NIKDY nesahá na DOM; engine emituje doménové události → UI vrstva je konzumuje efemérně (mimo deterministický stav). **Gamelog ring buffer** UI (poslední N událostí).

## Povinná rozhodnutí
- **Determinismus/catch-up-safe (kritické)**: story/achievementy deterministické (žádný Date.now/Math.random/DOM v core); engine-stopping eventy serializovatelné (přežijí save/load, ack stav v save); **UI event bus EFEMÉRNÍ** — nesmí ovlivnit deterministický stav ani hashState (notifikace/confetti/hudba jsou jen prezentace). Achievementy vyhodnocené deterministicky (stejný stav → stejné unlocky).
- **C4 anti-pattern**: achievementy NESMÍ být imperativní háčky rozseté po mechanikách — jen deklarativní predikáty vyhodnocené centrálně.
- **R-G licence**: intro/tutoriál/dialogy/achievement texty = vlastní/parafráze, ne 1:1 originál. Eviduj.
- **SPLIT** M8 (ano/ne): posuď, zda T1–T4 souzní do jedné iterace.

## Scope OUT
- Žádný kód. Žádná změna architektury iter-002. Kalibrace/balance = M9. Žádný zásah do M7 (battle/world automaty hotové).

## Inputs
- Master plán: `agents/project-manager/artifacts/final/iteration_master_plan_iter-003_T-001.md` (§3/iter-016(M8), §1.2)
- Architektura: `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md` (§3.4 engine-stopping eventy, §7.2 achievementy K18, K14 registr efektů, K18, D10 catch-up pauza, C4)
- Kód: `src/core/registry/effects.js` (K14), `src/core/engine/catchup.js` (D10 pauza), `src/data/achievements.json`, `src/save/`, `src/ui/` (gamelog UI), `src/core/state/createInitialState.js` (story/achievements stav), originál `doc/original_source/.../events.js`+`game.js`
- DR-013-00 (`context/refs/`)

## Acceptance Criteria
- Design pokrývá T1–T4 pro Sonnet implementaci bez dalších architektonických rozhodnutí.
- Determinismus: story/achievementy deterministické; engine-stopping eventy serializovatelné (catch-up pauza + ack); UI event bus efemérní (mimo hashState).
- Achievementy deklarativní (K18, žádné C4 háčky); persist (story/achievements).
- R-G postup (vlastní texty). SPLIT rozhodnutí. tickOrder dopady (achievement eval, event check).
- Žádný rozpor s D/K/§; cituj.

## Expected Outputs
- `agents/architect/artifacts/final/design_iter-019_T-001.md` + poznámka o splitu.

## Workflow po dokončení
- `agents/architect/state/current-task.md` → done
- `bash agents/architect/scripts/handoff-out.sh T-001 "<shrnutí + split + R-G + determinismus event/achievement>"`
- NEcommituj (git).
