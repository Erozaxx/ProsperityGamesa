# Current Task

- **Task ID**: T-002
- **Brief**: BRIEF-016
- **Iteration**: iter-005
- **Status**: done
- **Started**: 2026-06-13
- **Completed**: 2026-06-13

## Co teď dělám
Implementace M0b PWA shell + save + benchmark dle návrhu architekta (design_iter-005_T-001.md). Hotovo.

## Checklist
- [x] T1: PWA shell – src/vendor, index.html, src/app/*, src/ui/*
- [x] T2: manifest, service-worker.js, tools/gen-precache.mjs, src/precache.js
- [x] T3: IndexedDB save (idb.js, saveStore.js, schema.js) + fake-indexeddb testy
- [x] T4: tools/bench-step.mjs + docs/benchmark_iter-005.md
- [x] T5: src/app/persist.js + src/ui/ErrorScreen.js
- [x] CI: .github/workflows/ci.yml
- [x] tsconfig.json: DOM lib, vendor excluded, SW excluded
- [x] Smazání legacy src/js/* + src/css/style.css
- [x] tsc --noEmit zelené
- [x] grep gate zelené (12 souborů)
- [x] node --test 107/107 zelené
- [x] bench report commitnutý
