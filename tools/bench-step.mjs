#!/usr/bin/env node
/**
 * Synthetic step-cost benchmark (§14.1 / §9.2a).
 * Measures ns/step for the empty-tick + scheduler core,
 * over X thousand steps, using the real engine bootstrap (no DOM). Node-only.
 *   node tools/bench-step.mjs [--steps=2000000] [--warmup=200000] [--json]
 * Prints a human report (or JSON with --json) used to confirm/escalate the 8h cap (S-02/D10a) and D13.
 */

import { createInitialState } from '../src/core/state/createInitialState.js';
import { initRng } from '../src/core/engine/rng.js';
import { createRegistry } from '../src/core/registry/registry.js';
import { registerCorePeriodics } from '../src/core/engine/tickOrder.js';
import { step, scheduleInsert, STEP_MS } from '../src/core/engine/index.js';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

/**
 * Cap aritmetika (§9.2a):
 * 1 game step = 0.05 s game time
 * 8 h real time cap → 8*3600 / 0.05 = 576_000 steps
 */
const CAP_HOURS = 8;
const STEP_SECONDS = STEP_MS / 1000; // 0.05
const STEPS_FOR_CAP = Math.round((CAP_HOURS * 3600) / STEP_SECONDS); // 576_000

/**
 * Run the benchmark.
 * @param {Object} [opts]
 * @param {number} [opts.steps]  - total steps to measure (default 2_000_000)
 * @param {number} [opts.warmup] - warmup steps (default 200_000)
 * @returns {{ nsPerStep: number, stepsPerSec: number, stepsFor8h: number, catchUpMs8h: number,
 *             totalMs: number, steps: number, warmup: number,
 *             loadedHeap?: { nsPerStep: number, catchUpMs8h: number } }}
 */
export function runBench(opts = {}) {
  const STEPS = opts.steps ?? 2_000_000;
  const WARMUP = opts.warmup ?? 200_000;

  // 1. Bootstrap real core
  const state = createInitialState({ seed: 0x12345 });
  initRng(state);
  const registry = createRegistry();
  const periodics = registerCorePeriodics(registry);
  const ctx = { registry, periodics };

  // 2. Warmup (JIT)
  for (let i = 0; i < WARMUP; i++) {
    step(state, ctx);
  }

  // 3. Measurement – empty heap
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < STEPS; i++) {
    step(state, ctx);
  }
  const t1 = process.hrtime.bigint();

  const totalNs = Number(t1 - t0);
  const nsPerStep = totalNs / STEPS;
  const stepsPerSec = 1e9 / nsPerStep;
  const catchUpMs8h = (nsPerStep * STEPS_FOR_CAP) / 1e6;

  // 4. Loaded heap variant (~1k scheduled no-op events)
  const state2 = createInitialState({ seed: 0x67890 });
  initRng(state2);
  const registry2 = createRegistry();
  const periodics2 = registerCorePeriodics(registry2);
  const ctx2 = { registry2, periodics: periodics2 };

  // Pre-schedule 1000 no-op events spread across next 576k steps
  const curStep = state2.engine.curStep;
  for (let i = 0; i < 1000; i++) {
    const targetStep = curStep + 1 + Math.floor((i / 1000) * STEPS_FOR_CAP);
    scheduleInsert(state2, targetStep, 'noop', {});
  }

  // Warmup loaded heap
  for (let i = 0; i < WARMUP; i++) {
    step(state2, ctx2);
    // Periodically replenish schedule to keep ~1k events
    if (i % 1000 === 0) {
      const base = state2.engine.curStep;
      for (let j = 0; j < 10; j++) {
        scheduleInsert(state2, base + 1000 + j * 100, 'noop', {});
      }
    }
  }

  const t2 = process.hrtime.bigint();
  for (let i = 0; i < STEPS; i++) {
    step(state2, ctx2);
    if (i % 1000 === 0) {
      const base = state2.engine.curStep;
      for (let j = 0; j < 10; j++) {
        scheduleInsert(state2, base + 1000 + j * 100, 'noop', {});
      }
    }
  }
  const t3 = process.hrtime.bigint();

  const totalNs2 = Number(t3 - t2);
  const nsPerStep2 = totalNs2 / STEPS;
  const catchUpMs8h2 = (nsPerStep2 * STEPS_FOR_CAP) / 1e6;

  return {
    nsPerStep,
    stepsPerSec,
    stepsFor8h: STEPS_FOR_CAP,
    catchUpMs8h,
    totalMs: totalNs / 1e6,
    steps: STEPS,
    warmup: WARMUP,
    loadedHeap: {
      nsPerStep: nsPerStep2,
      catchUpMs8h: catchUpMs8h2,
    },
  };
}

/**
 * Formats a benchmark result as a Markdown report.
 * @param {ReturnType<typeof runBench>} result
 * @returns {string}
 */
export function formatReport(result) {
  const { nsPerStep, stepsPerSec, stepsFor8h, catchUpMs8h, steps, warmup, loadedHeap } = result;

  const ns2 = loadedHeap?.nsPerStep ?? 0;
  const catchUp2 = loadedHeap?.catchUpMs8h ?? 0;

  // Determine verdict
  const TARGET_NS = 10_000;
  const WARN_NS = 50_000;
  let verdict;
  if (nsPerStep <= TARGET_NS) {
    verdict = `POTVRDIT cap 8h ✓ (empty heap pod cílem ${TARGET_NS.toLocaleString()} ns/krok; catch-up ${catchUpMs8h.toFixed(1)} ms << 5760 ms)`;
  } else if (nsPerStep <= WARN_NS) {
    verdict = `VAROVÁNÍ – empty heap ${nsPerStep.toFixed(0)} ns/krok (cíl ${TARGET_NS.toLocaleString()}); catch-up ${catchUpMs8h.toFixed(1)} ms; zvážit nižší cap nebo Worker.`;
  } else {
    verdict = `ESKALOVAT – empty heap ${nsPerStep.toFixed(0)} ns/krok >> ${WARN_NS.toLocaleString()} ns; catch-up 8h ${catchUpMs8h.toFixed(1)} ms > ~29 000 ms; D13 Worker NEBO snížit cap.`;
  }

  const date = new Date().toISOString().slice(0, 19).replace('T', ' ');

  return `# Benchmark ceny kroku – iter-005 (M0b)

- **Datum**: ${date}
- **Node**: ${process.version}
- **OS/CPU**: ${os.platform()} ${os.arch()}, ${os.cpus()[0]?.model ?? 'unknown'} (${os.cpus().length} cores)
- **Commit**: (viz git log)

## METODIKA

SYNTETICKÝ (Node), prázdný tick + scheduler core (iter-004), ${steps.toLocaleString()} kroků, warmup ${warmup.toLocaleString()}.

⚠ A2: NENÍ reálné cílové zařízení (low-end mobil). Reálné potvrzení = uživatel/tester.

Měří: \`step(state, ctx)\` = calendar + scheduleDue (prázdný/naplněný heap) + 9 no-op periodik + devInvariants.

## VÝSLEDKY

| varianta            | ns/krok       | kroků/s          | catch-up 8h (${stepsFor8h.toLocaleString()} kroků) |
|---------------------|---------------|------------------|------------------------------------|
| empty heap          | ${nsPerStep.toFixed(1).padStart(13)} | ${stepsPerSec.toFixed(0).padStart(16)} | ${catchUpMs8h.toFixed(1).padStart(23)} ms |
| loaded heap (~1k)   | ${ns2.toFixed(1).padStart(13)} | ${(1e9 / ns2).toFixed(0).padStart(16)} | ${catchUp2.toFixed(1).padStart(23)} ms |

## VYHODNOCENÍ CAPU (S-02/D10a)

- Technický strop 8 h = ${stepsFor8h.toLocaleString()} kroků. Při změřené ceně catch-up trvá ~${catchUpMs8h.toFixed(1)} ms (empty heap).
- Prahy:
  - Cíl: ≤ 10 000 ns/krok (0,01 ms) → catch-up 8h ≈ ≤ 5 760 ms
  - Varování: 10 000–50 000 ns/krok → 5 760–28 800 ms; zvážit nižší cap nebo Worker
  - Eskalace: > 50 000 ns/krok → > ~29 000 ms na ref. HW → D13 Worker NEBO snížit cap
- **ZÁVĚR**: ${verdict}

## DOPORUČENÍ D13 (main thread vs Worker)

Main thread OK pokud catch-up dávka < ~1 s na cílovém HW.
Syntetický Node běh dává PŘEDBĚŽNÉ doporučení – závazné až po reálném zařízení.
${nsPerStep <= TARGET_NS ? 'Aktuální výsledek: main thread dostatečný (synteticky).' : nsPerStep <= WARN_NS ? 'Aktuální výsledek: borderline – doporučit ověření na reálném low-end HW.' : 'Aktuální výsledek: doporučit Worker nebo snížení capu.'}
`;
}

// CLI entry point
if (process.argv[1] && fileURLToPath(import.meta.url) === join(ROOT, 'tools', 'bench-step.mjs')) {
  const args = process.argv.slice(2);
  const getArg = (/** @type {string} */ name, /** @type {number} */ def) => {
    const a = args.find((a) => a.startsWith(`--${name}=`));
    return a ? parseInt(a.split('=')[1], 10) : def;
  };
  const jsonMode = args.includes('--json');

  const steps = getArg('steps', 2_000_000);
  const warmup = getArg('warmup', 200_000);

  console.error(`[bench] steps=${steps.toLocaleString()}, warmup=${warmup.toLocaleString()}`);
  const result = runBench({ steps, warmup });

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const report = formatReport(result);
    console.log(report);

    // Write report to docs/
    const outPath = join(ROOT, 'docs', 'benchmark_iter-005.md');
    try {
      writeFileSync(outPath, report, 'utf8');
      console.error(`[bench] report written → ${outPath}`);
    } catch (e) {
      console.error(`[bench] could not write report: ${e}`);
    }
  }
}
