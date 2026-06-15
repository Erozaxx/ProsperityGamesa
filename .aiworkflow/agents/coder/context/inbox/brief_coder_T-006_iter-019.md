# Brief

- **Brief ID**: BRIEF-019-006
- **Iteration**: iter-019 (M8)
- **Task**: T-006 = T2+T4 (intro/tutoriál + dialogy + notifikace/gamelog UI)
- **From**: Orchestrator
- **To**: coder (Sonnet)
- **Date**: 2026-06-15

## Goal
Implementuj **T2 (intro/tutoriál + dialogy)** a **T4 (notifikace/gamelog UI event bus)** dle designu — tím se M8 dokončuje (a celá obsahová vrstva). Design je source of truth. (NESPAWNUJ sub-agenty; udělej práci sám a řádně ji ukonči.)

## Source of truth
`agents/coder/context/refs/design_iter-019.md` — čti **T2 (intro/tutoriál/dialogy, R-G), T4 (UI event bus, gamelog)**. DR-019-01. T-004 summary (story.* + TickContext.emitEvent? stub).

## Scope IN

### T2 — Intro/tutoriál + dialogy
1. Obsah jako **data** přes registr efektů K14: `tutorials`/`dialogues` (story.json už má část; doplň `dialogues.json`/`tutorials.json` dle designu). **VLASTNÍ/parafráze texty** (R-G, `_meta.provenance:'original-paraphrased'`, NE 1:1 originál).
2. Intro sekvence (úvodní eventy/tutoriál kroky) napojené na story systém (T1 storyCheck/acknowledgeEvent — hotové).
3. Tutoriál progres ve `state.story.tutorials` (T1 init) + persist.

### T4 — Notifikace/gamelog (efemérní UI event bus)
1. **`ctx.emitEvent` REÁLNÁ implementace** (T1 přidal jen type stub do TickContext): vzor `ctx.emitTx` (main.js ~200) — push doménové události do **fronty MIMO `state`** → MIMO `hashState`, neukládá se. Engine NIKDY nesahá na DOM.
2. **Gamelog UI panel** nad existující `state.log` ring buffer (deterministický, persist) — selektor + komponenta + tab/panel.
3. **Notifikace** (toasty/efemérní) z emitEvent fronty v UI vrstvě; **catch-up agreguje do offline summary** místo spam toastů (dle designu).
4. UI: selektory + komponenty, žádná herní logika v UI.

## Scope OUT
- importantEvent/story core = T1 (hotovo). Achievementy = T3 (hotovo). NEsahej M7.
- Engine NIKDY nesahá na DOM (efemérní bus jen prezentace v UI vrstvě).

## Gate (Definition of Done)
- `npm run ci` ZELENÉ (0 fail, typecheck projde) — uveď počet testů. Přidej testy: tutoriál/dialog progres (deterministicky, persist), emitEvent fronta MIMO state (nemění hashState — klíčový determinismus test), gamelog selektor, catch-up agreguje eventy do offline summary.
- `npm run smoke` OK — **boot + render gamelog/tutoriál UI bez console chyb** (klíčové).
- **Determinismus G1** + **M8 (m8-story, m8-achievements)** + M7/M5/M6 nedotčené; **emitEvent NESMÍ ovlivnit hashState** (efemérní); žádný Date.now/Math.random/DOM v core (jen UI vrstva).
- Precache regen pokud přidání UI/dat souborů ovlivní manifest.

## Inputs
- Design: `context/refs/design_iter-019.md` (T2, T4), DR-019-01
- T-004/T-005 summaries
- Kód: `src/app/main.js` (ctx.emitTx vzor ~200, buildCtx), `src/core/registry/effects.js` (K14), `src/data/story.json` (T1), `src/core/state/createInitialState.js` (story.tutorials), `src/ui/screens.js`+`selectors.js`+`App.js`+`OfflineSummary.js`+`styles.css`, `src/core/state/types.d.ts` (TickContext.emitEvent? z T1), originál `events.js`/`game.js` (intro/dialogy struktura)

## Workflow po dokončení (POVINNÉ — všechny 3)
- `agents/coder/state/current-task.md` → **Task ID: T-006 (iter-019)**, status: done
- `agents/coder/artifacts/final/impl_summary_iter-019_T-006.md` (soubor:funkce, gate výstup, R-G texty, emitEvent efemérnost)
- `bash agents/coder/scripts/handoff-out.sh T-006 "<stručně + gate výsledek>"`
- NEcommituj (git).
