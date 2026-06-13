# Brief
- **Brief ID**: BRIEF-016b (continuation)
- **Iteration**: iter-005 (M0b)
- **To**: coder (Sonnet)
## Goal
DOKONČI rozpracovanou implementaci iter-005 (předchozí běh přerušen). Cíl: `npm run ci` ZELENÉ + chybějící soubory + benchmark report + impl note + handoff.
## Stav (co už existuje)
- Hotovo: src/app/*, src/save/{idb,saveStore,schema}.js, src/ui/*, src/vendor/, tools/{gen-precache,bench-step}.mjs, .github/workflows, index.html/manifest/service-worker přepsané, tsconfig upraven.
- CHYBÍ: `src/precache.js` (výstup gen-precache), `test/save.test.js`, `test/gen-precache.test.js`, `test/bench-step.test.js`, impl note.
## Známé chyby CI (oprav)
- `tsc --noEmit` padá: tools/*.mjs (gen-precache, bench-step, check-core-imports) používají `node:` builtiny + `process`/`Buffer` → potřebují `@types/node`. Oprav: přidej devDep `@types/node` a do tsconfig `compilerOptions.types:["node"]` (nebo vyřaď tools z typecheck scope konzistentně s návrhem design_iter-005_T-001.md – respektuj záměr návrhu, ať grep gate scope zůstane jen core).
- bench-step.mjs(85): `TickContext` očekává `registry`, ne `registry2` – oprav volání dle skutečného API src/core/engine/tickOrder.js.
## Scope IN
- Doplň chybějící soubory dle návrhu design_iter-005_T-001.md.
- Spusť `node tools/gen-precache.mjs` → vygeneruj src/precache.js (commitnutý).
- Spusť `node tools/bench-step.mjs` → ulož docs/benchmark_iter-005.md s reálnými čísly + prahy capu 8h (S-02) + D13 doporučení.
- Doplň testy (save round-trip přes fake-indexeddb, gen-precache determinismus, bench-step sanity).
- `npm run ci` musí být ZELENÉ (tsc 0, grep gate core OK, node --test vše pass).
## Inputs
- Návrh: agents/architect/artifacts/final/design_iter-005_T-001.md (závazný)
- Existující kód (src/app, src/save, src/ui, tools/); agents/coder/AGENTS.md
## Expected Outputs
- Chybějící soubory + src/precache.js + docs/benchmark_iter-005.md
- Impl note: agents/coder/artifacts/final/impl_iter-005_T-002.md (co dokončeno, tsc/test/grep/benchmark výsledky, odchylky)
## Po dokončení
- state/current-task.md → done; bash scripts/handoff-out.sh T-002 "M0b dokonceno; CI zelene; benchmark report"
