# Architecture Diagram – Prosperity Rebuild (M0a)

Source: `architecture_proposal_iter-002_T-001.md` §3.5

## Layer Diagram

```
┌─────────────────────────────────────────────────────┐
│  app/          (M0b – единая точка сборки слоёв)     │
│  • bootstrap, game loop, perf.now → advance()        │
│  • owns: accumulator, CommandRegistry                │
└──────────┬──────────────┬────────────────────────────┘
           │              │
    ┌──────▼──────┐  ┌────▼──────────────────────────┐
    │   ui/       │  │   save/                        │
    │  (M0b+)     │  │  (M0b) load/persist schemas    │
    │  reads only │  │  interacts via persist schemas  │
    │  snapshot   │  └────────────────────────────────┘
    │  + dispatch │
    └──────┬──────┘
           │ commands only (dispatch)
    ┌──────▼──────────────────────────────────────────┐
    │  src/core/  (M0a – this iteration)               │
    │                                                   │
    │  engine/                                          │
    │  ├── clock.js          accumulator + step()       │
    │  ├── scheduler.js      min-heap one-shot events   │
    │  ├── timeEdges.js      pure time helpers          │
    │  ├── tickOrder.js      runTick + periodics data   │
    │  ├── rng.js            mulberry32 streams         │
    │  └── index.js          public API re-export       │
    │                                                   │
    │  state/                                           │
    │  ├── createInitialState.js  single source of truth│
    │  ├── freeze.js              dev snapshot          │
    │  └── types.d.ts             shared JSDoc types    │
    │                                                   │
    │  systems/                                         │
    │  └── calendar.js       day/season/year authority  │
    │                                                   │
    │  registry/                                        │
    │  └── registry.js       fail-fast fns registry     │
    │                                                   │
    │  commands/                                        │
    │  ├── dispatch.js        UI→core command layer     │
    │  └── setSpeed.js        first command handler     │
    └─────────────────────────────────────────────────┘
           │
    ┌──────▼────────┐   ┌──────────────┐
    │   data/       │   │  catalog/    │
    │  (M1) JSON    │   │  (M1) items  │
    └───────────────┘   └──────────────┘
```

## Layering Rules

- `core/` imports only from `core/` (relative `.js` paths)
- `data/` = JSON only (no functions)
- `ui/` → reads snapshot + sends commands via `dispatch`
- `save/` ↔ core via persist schemas
- `app/` = only place where layers meet (orchestrator)

## Enforcement

- **grep gate** (`tools/check-core-imports.mjs`): mechanically blocks DOM/IO/nondeterminism in core
- **tsconfig** (`lib: ["ES2022"]` without `"DOM"`): tsc fails on DOM usage in core (double lock)
- **reviewer gate**: convention enforcement
