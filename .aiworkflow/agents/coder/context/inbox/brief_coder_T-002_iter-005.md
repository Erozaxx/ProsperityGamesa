# Brief
- **Brief ID**: BRIEF-016
- **Iteration**: iter-005 (M0b)
- **To**: coder (Sonnet)
## Goal
Implementuj celou iter-005 (M0b) PŘESNĚ dle návrhu: PWA shell, manifest+SW+precache generátor, IndexedDB save minimal, syntetický benchmark, storage.persist+error screen, CI workflow. Vše napojené na engine core z iter-004.
## Scope IN (dle návrhu design_iter-005_T-001.md)
- T1 PWA shell (vendor preact+htm ESM, index.html přepis, src/app/{main,loop,lifecycle,env,sw-register}, minimální UI přes dispatch).
- T2 manifest.webmanifest + service worker (cache-first) + tools/gen-precache.mjs (výstup commitnutý).
- T3 IndexedDB save (idb wrapper, saveStore: slots/saves, 1 slot + N=3 rotace, lastSimTimestamp, fallback) + testy přes fake-indexeddb (devDep).
- T4 tools/bench-step.mjs + docs/benchmark_iter-005.md (syntetický, prahy capu 8h, D13 doporučení).
- T5 requestPersistentStorage + ErrorScreen.
- CI: .github/workflows/ci.yml (npm ci + npm run ci); uprav tsconfig dle návrhu (DOM lib pro UI, core čistotu drží grep gate – NESmí rozšířit grep gate scope mimo core).
- Smaž/přepiš legacy placeholder (index.html, manifest, service-worker.js, src/js/*, src/css/* dle návrhu) pokud návrh tak říká.
## Inputs
- ZÁVAZNÝ návrh: agents/architect/artifacts/final/design_iter-005_T-001.md
- src/core/* (iter-004); architektura; agents/coder/AGENTS.md
## Acceptance Criteria
- `npm run ci` zelené (tsc --noEmit, grep gate core OK, node --test vč. nových save/clock/benchmark testů).
- PWA: manifest + SW + precache existují; app bootstrap běží (rAF loop volá engine advance).
- save round-trip funguje (test přes fake-indexeddb); benchmark report vygenerován s čísly.
- Core stále bez DOM/fetch/Date.now/Math.random (grep gate).
## Expected Outputs
- Kód v src/app, src/ui, src/save, src/vendor, tools/, .github/, kořen; benchmark report v docs/.
- Impl note: agents/coder/artifacts/final/impl_iter-005_T-002.md (co hotovo, tsc/test/grep/benchmark výsledky, odchylky).
