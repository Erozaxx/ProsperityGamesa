/**
 * M8 T2+T4 — Intro/tutoriál + dialogy + notifikace/gamelog UI event bus (iter-019 M8).
 *
 * Gate requirements:
 *   T2-1  tutoriál progres: advanceTutorial steps through, completes on last step
 *   T2-2  tutoriál persist: tutorials.done survives JSON round-trip (persist)
 *   T2-3  dismissTutorial: marks curId done, clears state
 *   T2-4  startTutorial effect: sets curId + curStep=0
 *   T2-5  setStoryFlag effect: sets state.story.used[flag]=true
 *   T2-6  dialog data: dialogues.json loads and validates
 *   T2-7  tutorials.json loads and validates
 *
 *   T4-1  emitEvent does NOT affect hashState (ephemeral invariant)
 *   T4-2  UiEventBus: push/drain cycle
 *   T4-3  aggregateUiEvents: counts per type
 *   T4-4  selectLog: returns newest-first entries
 *   T4-5  selectTutorial: active vs inactive
 *   T4-6  selectAchievements: unlocked vs locked
 *   T4-7  catch-up aggregate: uiEventCounts in offline summary
 *   T4-8  buildOfflineSummary includes uiEventCounts
 *   T4-9  selectActiveStoryEvent: returns null when no event; returns event data when active
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadCatalog, clearCatalogs } from '../src/core/catalog/index.js';
import { createInitialState } from '../src/core/state/createInitialState.js';
import { initRng, hashState } from '../src/core/engine/rng.js';
import { createRegistry } from '../src/core/registry/registry.js';
import { resolve as registryResolve } from '../src/core/registry/registry.js';
import { registerCorePeriodics } from '../src/core/engine/tickOrder.js';
import { step } from '../src/core/engine/clock.js';
import { createCommandRegistry } from '../src/core/commands/dispatch.js';
import { registerStoryCommands, advanceTutorial, dismissTutorial } from '../src/core/commands/story.js';
import { registerEffects } from '../src/core/registry/effects.js';
import { loadStoryEvent } from '../src/core/systems/story.js';
import { logEntry } from '../src/core/engine/log.js';
import { applyPersist } from '../src/save/persistSchema.js';
import { loadAndReconstruct } from '../src/save/load.js';
import { SAVE_VERSION } from '../src/save/schema.js';
import { createUiEventBus, aggregateUiEvents } from '../src/app/uiEventBus.js';
import { selectLog, selectTutorial, selectAchievements, selectActiveStoryEvent } from '../src/ui/selectors.js';
import { buildOfflineSummary, formatOfflineSummary } from '../src/ui/OfflineSummary.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');

function loadJson(name) {
  return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8'));
}

before(() => {
  clearCatalogs();
  for (const name of ['resources', 'food', 'houseTypes', 'jobs', 'military', 'achievements',
    'goods', 'zones', 'buildings', 'companies', 'skills', 'techs', 'contracts', 'story',
    'tutorials', 'dialogues']) {
    try { loadCatalog(name, loadJson(name)); } catch (_) { /* optional */ }
  }
});

function makeState(seed = 0x12345678) {
  const state = createInitialState({ seed });
  initRng(state);
  return state;
}

function makeCtx(storyCatalog) {
  const registry = createRegistry();
  const periodics = registerCorePeriodics(registry);
  registerEffects(registry);
  const catalog = storyCatalog ? { story: storyCatalog } : {};
  return { registry, periodics, catalog };
}

// ─── T2-1: Tutorial progress ─────────────────────────────────────────────────

describe('T2-1: advanceTutorial steps through tutorial', () => {
  it('advanceTutorial advances curStep each call', () => {
    const state = makeState();
    const s = /** @type {any} */ (state);
    // Start a tutorial (using the 'build' tutorial which has 3 steps)
    s.story.tutorials.curId = 'build';
    s.story.tutorials.curStep = 0;

    const r1 = advanceTutorial(state, {});
    assert.equal(r1.ok, true, 'step 1 advance must succeed');
    assert.equal(s.story.tutorials.curStep, 1, 'curStep must be 1');

    const r2 = advanceTutorial(state, {});
    assert.equal(r2.ok, true, 'step 2 advance must succeed');
    assert.equal(s.story.tutorials.curStep, 2, 'curStep must be 2');
  });

  it('advanceTutorial on last step completes tutorial and clears curId', () => {
    const state = makeState();
    const s = /** @type {any} */ (state);

    // 'build' tutorial has 3 steps (index 0, 1, 2); on step 2, advancing completes it
    s.story.tutorials.curId = 'build';
    s.story.tutorials.curStep = 2;

    const r = advanceTutorial(state, {});
    assert.equal(r.ok, true, 'last step advance must succeed');
    assert.equal(s.story.tutorials.curId, null, 'curId must be null after completion');
    assert.equal(s.story.tutorials.curStep, 0, 'curStep must reset to 0');
    assert.equal(s.story.tutorials.done['build'], true, 'build must be marked done');
  });

  it('advanceTutorial returns error when no active tutorial', () => {
    const state = makeState();
    const r = advanceTutorial(state, {});
    assert.equal(r.ok, false, 'must fail when no active tutorial');
    assert.ok(r.error, 'must have error message');
  });

  it('advanceTutorial with tutorialId mismatch returns error', () => {
    const state = makeState();
    const s = /** @type {any} */ (state);
    s.story.tutorials.curId = 'build';
    s.story.tutorials.curStep = 0;

    const r = advanceTutorial(state, { tutorialId: 'food' });
    assert.equal(r.ok, false, 'must fail on tutorialId mismatch');
  });
});

// ─── T2-2: Tutorial persist ───────────────────────────────────────────────────

describe('T2-2: tutorial progress persists across save/load', () => {
  it('tutorials.done survives JSON round-trip', () => {
    const state = makeState(0x11111101);
    const s = /** @type {any} */ (state);

    s.story.tutorials.curId = 'build';
    s.story.tutorials.curStep = 1;
    s.story.tutorials.done['food'] = true;

    const serialized = JSON.stringify(s.story);
    const deserialized = JSON.parse(serialized);

    assert.deepStrictEqual(deserialized.tutorials.done, { food: true }, 'tutorials.done must survive serialization');
    assert.equal(deserialized.tutorials.curId, 'build', 'tutorials.curId must survive serialization');
    assert.equal(deserialized.tutorials.curStep, 1, 'tutorials.curStep must survive serialization');
  });

  it('tutorials state survives save/load via persistSchema + loadAndReconstruct', () => {
    const state1 = makeState(0x11111102);
    const s1 = /** @type {any} */ (state1);

    // Set up tutorial state
    s1.story.tutorials.curId = 'jobs';
    s1.story.tutorials.curStep = 0;
    s1.story.tutorials.done['food'] = true;

    // Save via persist
    const saved = JSON.parse(JSON.stringify(applyPersist(state1)));
    saved.meta = saved.meta ?? {};
    saved.meta.saveVersion = SAVE_VERSION;

    // Load back
    const state2 = loadAndReconstruct(saved);
    const s2 = /** @type {any} */ (state2);

    assert.equal(s2.story.tutorials.curId, 'jobs', 'tutorials.curId preserved through save/load');
    assert.equal(s2.story.tutorials.curStep, 0, 'tutorials.curStep preserved through save/load');
    assert.equal(s2.story.tutorials.done['food'], true, 'tutorials.done preserved through save/load');
  });
});

// ─── T2-3: dismissTutorial ───────────────────────────────────────────────────

describe('T2-3: dismissTutorial', () => {
  it('dismissTutorial marks curId done and clears it', () => {
    const state = makeState();
    const s = /** @type {any} */ (state);
    s.story.tutorials.curId = 'build';
    s.story.tutorials.curStep = 0;

    const r = dismissTutorial(state, {});
    assert.equal(r.ok, true, 'dismissTutorial must succeed');
    assert.equal(s.story.tutorials.curId, null, 'curId must be null after dismiss');
    assert.equal(s.story.tutorials.done['build'], true, 'build must be marked done after dismiss');
    assert.equal(s.story.tutorials.curStep, 0, 'curStep must reset to 0 after dismiss');
  });

  it('dismissTutorial returns error when no active tutorial', () => {
    const state = makeState();
    const r = dismissTutorial(state, {});
    assert.equal(r.ok, false, 'must fail when no active tutorial');
  });
});

// ─── T2-4: startTutorial effect ──────────────────────────────────────────────

describe('T2-4: startTutorial K14 effect', () => {
  it('startTutorial sets curId and resets curStep to 0', () => {
    const state = makeState();
    const ctx = makeCtx();
    const s = /** @type {any} */ (state);

    assert.ok(s.story.tutorials, 'story.tutorials must exist');

    const fn = registryResolve(ctx.registry, 'startTutorial');
    fn(state, { id: 'jobs' }, ctx);

    assert.equal(s.story.tutorials.curId, 'jobs', 'curId must be set to "jobs"');
    assert.equal(s.story.tutorials.curStep, 0, 'curStep must be 0 after startTutorial');
  });

  it('startTutorial resets curStep when called on already-active tutorial', () => {
    const state = makeState();
    const ctx = makeCtx();
    const s = /** @type {any} */ (state);
    s.story.tutorials.curId = 'build';
    s.story.tutorials.curStep = 1;

    const fn = registryResolve(ctx.registry, 'startTutorial');
    fn(state, { id: 'food' }, ctx);

    assert.equal(s.story.tutorials.curId, 'food', 'curId must switch to "food"');
    assert.equal(s.story.tutorials.curStep, 0, 'curStep must reset to 0');
  });

  it('startTutorial throws on missing id param', () => {
    const state = makeState();
    const ctx = makeCtx();
    const fn = registryResolve(ctx.registry, 'startTutorial');
    assert.throws(() => fn(state, {}, ctx), /startTutorial.*params.id/, 'must throw on missing id');
  });
});

// ─── T2-5: setStoryFlag effect ───────────────────────────────────────────────

describe('T2-5: setStoryFlag K14 effect', () => {
  it('setStoryFlag sets story.used[flag] = true', () => {
    const state = makeState();
    const ctx = makeCtx();
    const s = /** @type {any} */ (state);

    const fn = registryResolve(ctx.registry, 'setStoryFlag');
    fn(state, { flag: 'myFlag' }, ctx);

    assert.equal(s.story.used['myFlag'], true, 'story.used[myFlag] must be true after setStoryFlag');
  });

  it('setStoryFlag is idempotent (double-set is fine)', () => {
    const state = makeState();
    const ctx = makeCtx();
    const s = /** @type {any} */ (state);

    const fn = registryResolve(ctx.registry, 'setStoryFlag');
    fn(state, { flag: 'myFlag' }, ctx);
    fn(state, { flag: 'myFlag' }, ctx);

    assert.equal(s.story.used['myFlag'], true, 'double-set must still be true');
  });

  it('setStoryFlag throws on missing flag param', () => {
    const state = makeState();
    const ctx = makeCtx();
    const fn = registryResolve(ctx.registry, 'setStoryFlag');
    assert.throws(() => fn(state, {}, ctx), /setStoryFlag.*params.flag/, 'must throw on missing flag');
  });
});

// ─── T2-6: dialogues.json ────────────────────────────────────────────────────

describe('T2-6: dialogues.json catalog structure', () => {
  it('dialogues.json loads with _meta and dialogues array', () => {
    const data = loadJson('dialogues');
    assert.ok(data._meta, 'dialogues.json must have _meta');
    assert.ok(Array.isArray(data.dialogues), 'dialogues.json must have dialogues array');
    assert.ok(data.dialogues.length > 0, 'dialogues.json must have at least one dialogue');
  });

  it('each dialogue has id, speakerId, lines fields', () => {
    const data = loadJson('dialogues');
    for (const d of data.dialogues) {
      assert.ok(typeof d.id === 'string', `dialogue must have string id`);
      assert.ok(typeof d.speakerId === 'string', `dialogue ${d.id}: speakerId must be string`);
      assert.ok(Array.isArray(d.lines), `dialogue ${d.id}: lines must be array`);
      assert.ok(d.lines.length > 0, `dialogue ${d.id}: lines must be non-empty`);
      for (const line of d.lines) {
        assert.ok(typeof line.text === 'string', `dialogue ${d.id} line: text must be string`);
      }
    }
  });

  it('_meta.provenance is original-paraphrased (R-G)', () => {
    const data = loadJson('dialogues');
    assert.equal(data._meta.provenance, 'original-paraphrased', '_meta.provenance must be original-paraphrased');
  });
});

// ─── T2-7: tutorials.json ────────────────────────────────────────────────────

describe('T2-7: tutorials.json catalog structure', () => {
  it('tutorials.json loads with _meta and tutorials array', () => {
    const data = loadJson('tutorials');
    assert.ok(data._meta, 'tutorials.json must have _meta');
    assert.ok(Array.isArray(data.tutorials), 'tutorials.json must have tutorials array');
    assert.ok(data.tutorials.length > 0, 'tutorials.json must have at least one tutorial');
  });

  it('each tutorial has id and steps array with text', () => {
    const data = loadJson('tutorials');
    for (const t of data.tutorials) {
      assert.ok(typeof t.id === 'string', `tutorial must have string id`);
      assert.ok(Array.isArray(t.steps), `tutorial ${t.id}: steps must be array`);
      assert.ok(t.steps.length > 0, `tutorial ${t.id}: steps must be non-empty`);
      for (const s of t.steps) {
        assert.ok(typeof s.text === 'string', `tutorial ${t.id} step: text must be string`);
      }
    }
  });

  it('_meta.provenance is original-paraphrased (R-G)', () => {
    const data = loadJson('tutorials');
    assert.equal(data._meta.provenance, 'original-paraphrased', '_meta.provenance must be original-paraphrased');
  });
});

// ─── T4-1: emitEvent does NOT affect hashState ───────────────────────────────

describe('T4-1: emitEvent does NOT affect hashState (ephemeral invariant)', () => {
  it('hashState identical with and without emitEvent', () => {
    const state1 = makeState(0x11AA1100);
    const state2 = makeState(0x11AA1100);

    // ctx1 has emitEvent wired to a bus; ctx2 has no emitEvent
    const uiBus = createUiEventBus();
    const ctx1 = makeCtx();
    ctx1.emitEvent = (ev) => uiBus.push(ev);

    const ctx2 = makeCtx();
    // ctx2.emitEvent is undefined

    // Run same steps on both
    for (let i = 0; i < 10; i++) {
      step(state1, ctx1);
      step(state2, ctx2);
    }

    const h1 = hashState(state1);
    const h2 = hashState(state2);

    assert.equal(h1, h2, 'hashState must be identical with and without emitEvent (bus is ephemeral)');
  });

  it('emitEvent push does not modify state — two states with/without bus are identical', () => {
    const catalog = { events: {
      testEvt: {
        speakerId: 'advisor', text: 'Test', stopsEngine: true,
        trigger: { kind: 'gameStart' }, onShow: [], options: [{ text: 'OK', effects: [] }],
      },
    }};

    const state1 = makeState(0x22BB2200);
    const ctx1 = makeCtx();
    ctx1.catalog = { story: catalog };
    const uiBus = createUiEventBus();
    ctx1.emitEvent = (ev) => uiBus.push(ev);

    const state2 = makeState(0x22BB2200);
    const ctx2 = makeCtx();
    ctx2.catalog = { story: catalog };
    // ctx2 has no emitEvent

    // Both load the same story event
    loadStoryEvent(state1, ctx1, 'testEvt');
    loadStoryEvent(state2, ctx2, 'testEvt');

    // Bus should have gotten an event
    const events = uiBus.drain();
    assert.ok(events.length > 0, 'emitEvent must have pushed events to the bus');

    // hashState must be equal (bus events didn't affect state in either case)
    assert.equal(hashState(state1), hashState(state2),
      'hashState must match regardless of emitEvent being wired');
  });
});

// ─── T4-2: UiEventBus push/drain ─────────────────────────────────────────────

describe('T4-2: UiEventBus push/drain cycle', () => {
  it('push adds events, drain returns and clears them', () => {
    const bus = createUiEventBus();

    bus.push({ type: 'achievementUnlocked', id: 'a1' });
    bus.push({ type: 'storyEventShown', id: 'e1' });

    assert.equal(bus.size(), 2, 'bus must have 2 events after push');

    const drained = bus.drain();
    assert.equal(drained.length, 2, 'drain must return 2 events');
    assert.equal(drained[0].type, 'achievementUnlocked', 'first event type must match');
    assert.equal(drained[1].type, 'storyEventShown', 'second event type must match');
    assert.equal(bus.size(), 0, 'bus must be empty after drain');
  });

  it('drain on empty bus returns empty array', () => {
    const bus = createUiEventBus();
    const drained = bus.drain();
    assert.deepStrictEqual(drained, [], 'drain on empty bus must return []');
  });

  it('drain clears queue so next drain returns empty', () => {
    const bus = createUiEventBus();
    bus.push({ type: 'test' });
    bus.drain();
    const second = bus.drain();
    assert.deepStrictEqual(second, [], 'second drain must be empty');
  });
});

// ─── T4-3: aggregateUiEvents ─────────────────────────────────────────────────

describe('T4-3: aggregateUiEvents counts per type', () => {
  it('aggregates event counts by type', () => {
    const events = [
      { type: 'achievementUnlocked', id: 'a1' },
      { type: 'achievementUnlocked', id: 'a2' },
      { type: 'storyEventShown', id: 'e1' },
    ];

    const counts = aggregateUiEvents(events);
    assert.equal(counts['achievementUnlocked'], 2, 'achievementUnlocked count must be 2');
    assert.equal(counts['storyEventShown'], 1, 'storyEventShown count must be 1');
  });

  it('aggregateUiEvents returns empty object for empty array', () => {
    const counts = aggregateUiEvents([]);
    assert.deepStrictEqual(counts, {}, 'empty input must return {}');
  });
});

// ─── T4-4: selectLog ─────────────────────────────────────────────────────────

describe('T4-4: selectLog returns gamelog entries', () => {
  it('selectLog returns empty array when log has no entries', () => {
    const state = makeState();
    const result = selectLog(state);
    assert.ok(Array.isArray(result), 'selectLog must return array');
    assert.equal(result.length, 0, 'log must be empty initially');
  });

  it('selectLog returns entries after log writes, newest first', () => {
    const state = makeState();

    logEntry(state, 'test:entry1');
    logEntry(state, 'test:entry2');

    const entries = selectLog(state);
    assert.ok(entries.length >= 2, 'selectLog must return written entries');
    // Newest-first: entry2 should be first
    assert.equal(entries[0].msg, 'test:entry2', 'newest entry must be first');
    assert.equal(entries[1].msg, 'test:entry1', 'older entry must be second');
  });

  it('selectLog respects limit parameter', () => {
    const state = makeState();

    for (let i = 0; i < 10; i++) {
      logEntry(state, `entry:${i}`);
    }

    const entries = selectLog(state, 3);
    assert.equal(entries.length, 3, 'selectLog must respect limit=3');
  });
});

// ─── T4-5: selectTutorial ────────────────────────────────────────────────────

describe('T4-5: selectTutorial active vs inactive', () => {
  it('selectTutorial returns inactive view when no tutorial active', () => {
    const state = makeState();
    const result = selectTutorial(state);
    assert.equal(result.active, false, 'tutorial must be inactive when curId=null');
    assert.equal(result.id, null, 'id must be null when inactive');
  });

  it('selectTutorial returns active view with text when tutorial active', () => {
    const state = makeState();
    const s = /** @type {any} */ (state);
    s.story.tutorials.curId = 'build';
    s.story.tutorials.curStep = 0;

    const result = selectTutorial(state);
    assert.equal(result.active, true, 'tutorial must be active when curId is set');
    assert.equal(result.id, 'build', 'id must match curId');
    assert.equal(result.curStep, 0, 'curStep must match');
    // stepText should come from the catalog
    assert.ok(result.stepText != null, 'stepText must be resolved from catalog');
    assert.ok(result.totalSteps > 0, 'totalSteps must be > 0 for build tutorial');
  });

  it('selectTutorial done object is correct', () => {
    const state = makeState();
    const s = /** @type {any} */ (state);
    s.story.tutorials.done['food'] = true;

    const result = selectTutorial(state);
    assert.equal(result.done['food'], true, 'done map must be returned');
  });
});

// ─── T4-6: selectAchievements ────────────────────────────────────────────────

describe('T4-6: selectAchievements unlocked vs locked', () => {
  it('selectAchievements returns all achievements with unlocked status', () => {
    const state = makeState();
    const results = selectAchievements(state);

    assert.ok(results.length > 0, 'must return at least one achievement');

    // All should be locked initially
    for (const ach of results) {
      assert.equal(ach.unlocked, false, `achievement ${ach.id} must be locked initially`);
      assert.ok(typeof ach.id === 'string' && ach.id.length > 0, 'achievement must have non-empty string id');
      assert.ok(typeof ach.name === 'string', 'achievement must have string name');
      assert.ok(typeof ach.description === 'string', 'achievement must have string description');
    }
  });

  it('selectAchievements reflects unlocked state', () => {
    const state = makeState();
    const s = /** @type {any} */ (state);
    s.achievements.unlocked['achieveSettlement'] = true;

    const results = selectAchievements(state);
    const settlement = results.find(a => a.id === 'achieveSettlement');
    assert.ok(settlement, 'achieveSettlement must be in results');
    assert.equal(settlement.unlocked, true, 'achieveSettlement must be unlocked');

    // Others remain locked
    const other = results.find(a => a.id !== 'achieveSettlement');
    if (other) assert.equal(other.unlocked, false, 'other achievements remain locked');
  });
});

// ─── T4-7: catch-up aggregates events into offline summary ───────────────────

describe('T4-7: catch-up aggregates UI events (not spam toasts)', () => {
  it('buildOfflineSummary with uiEventCounts includes counts', () => {
    const summary = buildOfflineSummary({
      missedMs: 3600000,
      wasCapped: false,
      stepsRun: 900,
      interrupted: false,
      uiEventCounts: { achievementUnlocked: 2, storyEventShown: 1 },
    });

    assert.ok(summary.uiEventCounts, 'summary must have uiEventCounts');
    assert.equal(summary.uiEventCounts['achievementUnlocked'], 2, 'achievementUnlocked count must match');
    assert.equal(summary.uiEventCounts['storyEventShown'], 1, 'storyEventShown count must match');
  });

  it('buildOfflineSummary without uiEventCounts has null', () => {
    const summary = buildOfflineSummary({
      missedMs: 1000,
      wasCapped: false,
      stepsRun: 0,
      interrupted: false,
    });

    assert.equal(summary.uiEventCounts, null, 'uiEventCounts must be null when not provided');
  });
});

// ─── T4-8: buildOfflineSummary uiEventCounts in formatOfflineSummary ──────────

describe('T4-8: formatOfflineSummary includes UI events in text', () => {
  it('includes achievement count in summary text', () => {
    const summary = buildOfflineSummary({
      missedMs: 3600000,
      wasCapped: false,
      stepsRun: 900,
      interrupted: false,
      uiEventCounts: { achievementUnlocked: 3 },
    });

    const text = formatOfflineSummary(summary);
    assert.ok(text.includes('3'), 'summary text must mention the count 3');
    assert.ok(text.includes('achievement'), 'summary text must mention achievements');
  });

  it('summary text without uiEventCounts does not mention achievements', () => {
    const summary = buildOfflineSummary({
      missedMs: 1000,
      wasCapped: false,
      stepsRun: 0,
      interrupted: false,
    });

    const text = formatOfflineSummary(summary);
    assert.ok(!text.includes('achievement'), 'no achievement mention when uiEventCounts is null');
  });
});

// ─── T4-9: selectActiveStoryEvent ────────────────────────────────────────────

describe('T4-9: selectActiveStoryEvent', () => {
  it('returns null when no active story event', () => {
    const state = makeState();
    const result = selectActiveStoryEvent(state);
    assert.equal(result, null, 'must return null when no event active');
  });

  it('returns event data when story.event is set (reads from loaded catalog)', () => {
    const state = makeState();
    const s = /** @type {any} */ (state);
    // Use a known event from the real story catalog (loaded in before())
    s.story.event = { id: 'introWelcome', acked: false };

    const result = selectActiveStoryEvent(state);
    assert.ok(result != null, 'must return event data when event is active');
    assert.equal(result?.id, 'introWelcome', 'id must match');
    assert.ok(typeof result?.text === 'string' && result.text.length > 0, 'text must be a non-empty string');
    assert.ok(Array.isArray(result?.options) && result.options.length > 0, 'options must be a non-empty array');
  });

  it('returns minimal data for unknown event ID (defensive)', () => {
    const state = makeState();
    const s = /** @type {any} */ (state);
    s.story.event = { id: 'unknownEvent999', acked: false };

    const result = selectActiveStoryEvent(state);
    // Should not throw; returns minimal
    assert.ok(result != null, 'must return something for unknown event (not throw)');
    assert.equal(result?.id, 'unknownEvent999', 'id must still match');
  });
});
