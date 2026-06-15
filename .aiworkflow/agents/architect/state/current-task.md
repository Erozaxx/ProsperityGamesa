# Current Task

- **Task ID**: T-001 (iter-019) — DESIGN M8 (příběh & meta vrstva: importantEvent/story, intro/tutoriál, achievementy K18, notifikace/gamelog)
- **Brief**: context/inbox/brief_architect_T-001_iter-019.md (BRIEF-019-001)
- **Předchozí**: iter-018 T-001/T-002a (M7b) — done
- **Iteration**: iter-019 (M8 — Příběh & meta; POSLEDNÍ obsahová vrstva, M9 = kalibrace+release)
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-06-15
- **Completed**: 2026-06-15

## Checklist (z briefu)
- [x] T1 importantEvent + story progres (state.story.*, engine-stopping eventy §3.4 = doménová událost + acknowledgeEvent command, interakce s catch-up pauzou D10, serializovatelné)
- [x] T2 intro/tutoriál + dialogy (obsah jako data přes K14 registr efektů, VLASTNÍ R-G texty)
- [x] T3 achievementy deklarativně K18 ({id, when: predicate-as-data}, eval denní tick + tx/doménové události, unlock mechanismus, NE C4 háčky)
- [x] T4 notifikace/confetti/hudba/devlog (EFEMÉRNÍ UI event bus, engine NIKDY DOM, gamelog ring buffer UI)
- [x] Povinná rozhodnutí: determinismus/catch-up-safe, C4 anti-pattern, R-G licence, SPLIT
- [x] tickOrder dopady (story event check, achievement eval); persist story/achievements

## Výstup
**`artifacts/final/design_iter-019_T-001.md`** — pokrývá T1–T4 pro Sonnet codera.

## Klíčová rozhodnutí
- SPLIT M8 = NE (T1+T3 nezávislé, T2 závisí T1, T4 závisí T1 — jeden souvislý celek, S/M, žádný L).
- importantEvent = doménová událost + engine-stopping přes existující `state.engine.running=false` slot (advance() clock.js:77 + runCatchupBatch catchup.js:51 už break-ují) + `acknowledgeEvent` command + serializovatelný `state.story.event` (curEventId/queue/ack).
- Achievementy deklarativně K18 v datech (`achievements.json` rozšířen o `when` predikát-jako-data) + centrální evaluator (denní tick periodic + na doménových/tx událostech); unlock přes K14 efekt. ZERO imperativní háčky (C4).
- UI event bus EFEMÉRNÍ — mimo state, mimo hashState; engine emituje doménové události do efemérní fronty, UI konzumuje (toast/confetti/hudba). Gamelog = `state.log` ring buffer (už existuje, persist).
- R-G: VLASTNÍ/parafráze texty v `src/data/story.json`+`dialogues.json`+`tutorials.json` s `_meta.provenance:'original-paraphrased'|'original-rewritten'`; originál jen jako struktura/triggery, ne text.
