# Impl Note – iter-004 T-002 (M0a Engine Core)

- **Task**: T-002, iter-004
- **Agent**: coder (Sonnet)
- **Date**: 2026-06-13
- **Status**: done

## Co bylo implementováno

### T1 – Struktura repa + CI gate
- `package.json` (type:module, scripts: typecheck/lint:core/test/ci) – již existoval, potvrzen
- `tsconfig.json` – upraven include na `src/core/**` (viz odchylky)
- `tools/check-core-imports.mjs` – již existoval, beze změny
- `index.html` – již existoval
- `src/core/globals.d.ts` – přidán pro ambient deklaraci `structuredClone` (viz odchylky)
- `docs/tickOrder.md`, `docs/architecture-diagram.md` – vytvořeny

### T2 – State container
- `src/core/state/createInitialState.js` – bylo hotové, obsahuje `_seq` a `_absDay`
- `src/core/state/freeze.js` – bylo hotové
- `src/core/state/types.d.ts` – bylo hotové, zahrnuje `_seq`, `_absDay`, všechny typy

### T3 – Clock + accumulator
- `src/core/engine/clock.js` – implementováno: `step`, `advance`, `createAccumulator`, konstanty
- `src/core/engine/index.js` – reexport engine API

### T4 – Scheduler
- `src/core/engine/scheduler.js` – binární min-heap, `scheduleInsert`/`scheduleDue`/`scheduleCancel`/`scheduleCountOf`
- `src/core/engine/timeEdges.js` – čisté pomocné funkce `stepInDay`, `isDayBoundary`, konstant STEPS_PER_DAY atd.

### T5 – RNG
- `src/core/engine/rng.js` – mulberry32, `makeRng`/`initRng`/`hashState`

### T6 – tickOrder + calendar + registry + commands
- `src/core/engine/tickOrder.js` – `TICK_ORDER`, `runTick`, `registerCorePeriodics`
- `src/core/systems/calendar.js` – `advanceCalendar`, autorita kalendáře + produkce `TimeEdges`
- `src/core/registry/registry.js` – `createRegistry`/`register`/`resolve`/`has`/`assertSerializable`
- `src/core/commands/dispatch.js` – `createCommandRegistry`/`registerCommand`/`dispatch`
- `src/core/commands/setSpeed.js` – `setSpeed`/`registerSetSpeed`

### Testy (node:test)
- `test/clock.test.js` – advance, speed, frame budget, determinism (5 testů)
- `test/scheduler.test.js` – heap, FIFO, count, cancel, past-step (5 testů)
- `test/rng.test.js` – seed, reproducibility, streams, ranges, save-resume, determinism hash (9 testů)
- `test/calendar.test.js` – day/season/year boundaries, absDay, spy (8 testů)

## Výsledky ověření

### `npx tsc --noEmit` (typecheck)
```
(exit 0, žádné chyby)
```

### `node tools/check-core-imports.mjs` (grep gate)
```
core import gate OK (12 file(s) checked)
```

### `node --test` (unit testy)
```
# tests 27
# suites 6
# pass 27
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms ~220ms
```

### `npm run ci` (full CI gate)
Všechny 3 kroky proběhly čistě (exit 0).

## Odchylky od návrhu

1. **tsconfig `include`**: Návrh specifikoval `"include": ["src/**/*.js", "src/**/*.d.ts", "tools/**/*.mjs"]`. Repo obsahuje `src/js/` (starý kód originálu) s DOM API a implicit-any chybami. Aby tsc prošel bez `lib: DOM`, include byl zúžen na `src/core/**`. Tools mjs soubory vyřazeny (node: imports bez types/node). Odůvodnění: návrh říká `lib: ["ES2022"]` bez DOM – starý `src/js/` se DOM neobejde; iter-004 neřeší migraci starého kódu.

2. **`src/core/globals.d.ts`** (nový soubor): `structuredClone` není v lib ES2022 bez DOM. Přidán ambient declaration soubor místo ad-hoc `@ts-ignore`. Bezpečné – žádný DOM import, jen deklarace globálu dostupného v Node 17+ i moderních browserech.

3. **Cesta importu `.d.ts` → `.js`**: TypeScript 5.9 vyžaduje `import type` pro `.d.ts` soubory v JSDoc. Opraveno přejmenováním cesty `types.d.ts` → `types.js` v JSDoc importech (TypeScript Bundler moduleResolution správně resolvuje `.js` na `.d.ts`).

4. **`setSpeed` validace**: Původní `VALID_SPEEDS.includes()` nezúžil typ pro tsc. Opraveno na explicitní `speed !== 0 && speed !== 1 && speed !== 2` guard.

5. **Test `calendar: tickOrder spy`**: Původní test počítal sdílené `noop` volání – nesprávně (všechna periodika sdílí jeden handler). Opraven na per-periodic spy (registrace pojmenovaných handlerů per ID).

6. **`clock.js` JSDoc komentář**: Komentář v hlavičce obsahoval slovo `performance.now()` – grep gate ho zachytil. Opraveno na neutrální formulaci.
