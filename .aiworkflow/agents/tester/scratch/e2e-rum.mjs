/**
 * e2e + RUM bug-hunt harness (T-ADV-002, post-iter-021).
 *
 * Drives the game through real user flows in headless Chromium and records
 * RUM-style telemetry per flow: console errors/warnings, uncaught exceptions
 * (pageerror), failed requests, horizontal overflow, freeze/jank, empty panels.
 *
 * Usage (from repo root; server serves process.cwd()):
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node .aiworkflow/agents/tester/scratch/e2e-rum.mjs [port]
 * Optional env:
 *   E2E_RUM_OUT=/path/results.json   JSON telemetry output (default /tmp/e2e-rum-results.json)
 *   E2E_LIVE_URL=1                   also cross-check the live GitHub Pages URL (F10)
 * Exit code: 0 = ran to completion (findings in output), 1 = harness crash.
 *
 * Flows:
 *   F1  story-event UX audit (intro event: modality, visibility, below-fold, resume)
 *   F2  tab-sweep desktop 1280x800 (content non-empty, no overflow)
 *   F3  tab-sweep mobile 390/360/320 + touch
 *   F4  economy loop: assign jobs, skills tab, tax +/- (spaced + rapid), 1x vs 2x speed
 *   F5  market buy/sell, caravan, build, builder company, contracts, tech, world/quests
 *   F6  recruit UI (#3 re-verify): Bitva tab section, live-gold wiring, real recruit click
 *       (gold accrued via offline catch-up rounds when a fresh game can't afford a unit)
 *   F7  save via hide -> reload -> restore
 *   F8  offline catch-up via fake clock (+30 min) incl. story interrupt + summary
 *   F9  export/import (#5/#6/#8 re-verify): confirmation banner, fallback textarea without
 *       clipboard grants, import->immediate-reload persistence, DOM import-error banner
 *   F10 (optional) live URL boot cross-check
 *
 * NO game code is modified; only public UI + browser APIs are used
 * (page.clock for offline simulation = browser time, not state hacking).
 */
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const PORT = Number(process.argv[2]) || 8241;
const ROOT = process.cwd();
/** @type {Record<string, string>} */
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.css': 'text/css', '.svg': 'image/svg+xml' };

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (p === '/') p = '/index.html';
    const fp = join(ROOT, normalize(p).replace(/^(\.\.[/\\])+/, ''));
    const buf = await readFile(fp);
    res.writeHead(200, { 'content-type': MIME[extname(fp)] || 'application/octet-stream' });
    res.end(buf);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(PORT, () => r(undefined)));
const BASE = `http://localhost:${PORT}/`;

const pw = await import('playwright');
let browser;
try {
  browser = await pw.chromium.launch();
} catch {
  browser = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
}

// ---------------------------------------------------------------------------
// RUM recorder
// ---------------------------------------------------------------------------
const flows = [];
function newFlow(name) {
  const f = { flow: name, consoleErrors: [], consoleWarnings: [], pageErrors: [], requestFailed: [], findings: [] };
  flows.push(f);
  return f;
}
function wireRum(page, f) {
  page.on('console', (m) => {
    const t = m.type();
    if (t === 'error') f.consoleErrors.push(m.text());
    else if (t === 'warning') f.consoleWarnings.push(m.text());
  });
  page.on('pageerror', (e) => f.pageErrors.push(String(e && e.message || e)));
  page.on('requestfailed', (r) => f.requestFailed.push(`${r.url()} :: ${r.failure() && r.failure().errorText}`));
}
function finding(f, id, severity, note) {
  f.findings.push({ id, severity, note });
  console.log(`  [FINDING ${severity}] ${id}: ${note}`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function bootPage(ctx, f, { waitAfter = 2500 } = {}) {
  const page = await ctx.newPage();
  wireRum(page, f);
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(waitAfter);
  return page;
}
const appText = (page) => page.locator('#app').innerText().catch(() => '');
async function curStep(page) {
  const t = await page.locator('.clock').innerText().catch(() => '');
  const m = t.match(/krok\s+(\d+)/);
  return m ? Number(m[1]) : null;
}
async function overviewStat(page, label) {
  return page.evaluate((lbl) => {
    for (const dt of document.querySelectorAll('.screen-overview dl dt')) {
      if (dt.textContent.trim() === lbl) return dt.nextElementSibling?.textContent.trim() ?? null;
    }
    return null;
  }, label);
}
async function clickTab(page, label, { tap = false } = {}) {
  // iter-022 re-verify: since Wave 1 the story overlay is correctly modal (blocks background
  // clicks). A story event can legitimately fire at any day boundary mid-flow, so ack any
  // pending dialog before every tab click (harness gap found during Wave 1, F4).
  await clearOverlays(page);
  const btn = page.locator('.tabs .tab-btn', { hasText: label }).first();
  if (tap) await btn.tap({ timeout: 5000 }); else await btn.click({ timeout: 5000 });
  await page.waitForTimeout(120);
}
const overflowPx = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
async function rafHeartbeat(page) {
  return page.evaluate(() => new Promise((res) => {
    let c = 0; const t0 = performance.now();
    function fr() { if (++c >= 30) res(performance.now() - t0); else requestAnimationFrame(fr); }
    requestAnimationFrame(fr);
  }));
}
const TAB_LABELS = ['Přehled', 'Příroda', 'Práce', 'Dovednosti', 'Rada', 'Trh', 'Stavba', 'Kontrakty', 'Veda', 'Svět', 'Bitva', 'Deník'];

/** Acknowledge story events (scroll into view first — dialog is unstyled/in-flow) + dismiss tutorial. */
async function clearOverlays(page) {
  for (let i = 0; i < 10; i++) {
    const story = page.locator('.story-overlay .story-option-btn').first();
    if (await story.count() > 0) {
      await story.scrollIntoViewIfNeeded().catch(() => {});
      await story.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(200);
      continue;
    }
    break;
  }
  const tutDismiss = page.locator('.tutorial-btn-dismiss');
  if (await tutDismiss.count() > 0) { await tutDismiss.first().click().catch(() => {}); await page.waitForTimeout(100); }
}

// ---------------------------------------------------------------------------
// F1: story event UX audit (intro event fires at boot, engine-stopping)
// ---------------------------------------------------------------------------
async function f1_storyEventAudit() {
  const f = newFlow('F1 story-event-ux mobile 390x844');
  console.log('\n== ' + f.flow);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await bootPage(ctx, f);

  const s1 = await curStep(page);
  const overlay = await page.evaluate(() => {
    const el = document.querySelector('.story-overlay');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      position: cs.position, zIndex: cs.zIndex, bg: cs.backgroundColor,
      top: r.top, bottom: r.bottom, viewportH: window.innerHeight,
      inViewport: r.top < window.innerHeight && r.bottom > 0,
    };
  });
  console.log(`  boot: krok=${s1}, story overlay: ${JSON.stringify(overlay)}`);
  if (s1 !== null) {
    await page.waitForTimeout(1500);
    const s2 = await curStep(page);
    if (s2 === s1 && !overlay) {
      finding(f, 'ENGINE-FROZEN-NO-DIALOG', 'BLOCKER', 'Engine frozen at boot with NO story dialog rendered.');
    } else if (s2 === s1 && overlay) {
      console.log('  engine stopped by intro story event (by design) — auditing dialog UX:');
      if (overlay.position === 'static' && overlay.bg === 'rgba(0, 0, 0, 0)') {
        finding(f, 'STORY-DIALOG-UNSTYLED', 'MAJOR',
          '.story-overlay/.story-dialog/.story-option-btn have ZERO CSS (0 hits in src/ui/styles.css) — the engine-stopping "modal" renders as plain in-flow text at the very bottom of the page, transparent, no backdrop, tiny default button. Game looks frozen.');
      }
      // modality: background must be blocked (aria-modal), is it?
      const tapOk = await page.locator('.tabs .tab-btn', { hasText: 'Trh' }).tap({ timeout: 2500 }).then(() => true, () => false);
      if (tapOk) {
        finding(f, 'STORY-DIALOG-NOT-MODAL', 'MINOR',
          'Dialog declares role="dialog" aria-modal="true" (GamelogScreen.js:63) but does not block background interaction — user can switch tabs/click everything while the engine-stopping event is pending.');
        // below-fold: with a long tab open, is the dialog visible at all?
        await page.waitForTimeout(300);
        const vis = await page.evaluate(() => {
          const el = document.querySelector('.story-overlay');
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { top: Math.round(r.top), viewportH: window.innerHeight, inViewport: r.top < window.innerHeight && r.bottom > 0, scrollY: window.scrollY };
        });
        console.log(`  dialog after switching to Trh tab: ${JSON.stringify(vis)}`);
        if (vis && !vis.inViewport) {
          finding(f, 'STORY-DIALOG-BELOW-FOLD', 'MAJOR',
            `Engine-stopping story dialog is OFF-SCREEN (top=${vis.top}px, viewport=${vis.viewportH}px) after switching to the Trh tab @390x844 — game is frozen (krok stuck) with no visible reason or control; player must accidentally scroll to page bottom to find the confirm button.`);
        }
      }
      // ack resumes engine?
      await clearOverlays(page);
      await page.waitForTimeout(1500);
      const s3 = await curStep(page);
      console.log(`  after ack: krok=${s3}`);
      if (s3 !== null && s3 <= s1) finding(f, 'STORY-ACK-NO-RESUME', 'BLOCKER', `Acknowledging the story event did not resume the engine (krok ${s1} -> ${s3}).`);
    }
  } else {
    finding(f, 'HUD-NO-STEP', 'MAJOR', 'HUD clock does not show "krok N".');
  }

  // HUD stats spacing — iter-022 re-verify #9: adjacent spans must not touch and
  // .stats must have a real computed gap (> 0) @390px.
  const squash = await page.evaluate(() => {
    const stats = document.querySelector('.stats');
    const spans = Array.from(document.querySelectorAll('.stats > span'));
    if (!stats || spans.length < 2) return null;
    let touching = 0, minGap = Infinity;
    for (let i = 1; i < spans.length; i++) {
      const a = spans[i - 1].getBoundingClientRect(), b = spans[i].getBoundingClientRect();
      if (Math.abs(b.top - a.top) < 2) { // same row
        const gap = b.left - a.right;
        if (gap < minGap) minGap = gap;
        if (gap < 1) touching++;
      }
    }
    const cs = getComputedStyle(stats);
    return { spans: spans.length, touching, minGapPx: minGap === Infinity ? null : Math.round(minGap * 10) / 10, display: cs.display, gap: cs.gap, text: stats.textContent ?? '' };
  });
  if (squash) console.log(`  .stats: display=${squash.display}, computed gap=${squash.gap}, min same-row gap=${squash.minGapPx}px, touching pairs=${squash.touching}`);
  if (squash && squash.touching > 0) {
    finding(f, 'HUD-STATS-SQUASHED', 'MINOR',
      `HUD stat spans still render with no gap: "${squash.text.slice(0, 80)}" (${squash.touching} adjacent pairs touching @390px, computed gap=${squash.gap}). QA #9 NOT resolved.`);
  }
  const hb = await rafHeartbeat(page);
  if (hb > 3000) finding(f, 'JANK-BOOT', 'MAJOR', `30 rAF frames took ${hb.toFixed(0)} ms.`);
  await ctx.close();
  return f;
}

// ---------------------------------------------------------------------------
// F2/F3: tab sweeps
// ---------------------------------------------------------------------------
async function tabSweep(name, viewport, { touch = false } = {}) {
  const f = newFlow(name);
  console.log('\n== ' + f.flow);
  const ctx = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch });
  const page = await bootPage(ctx, f);
  await clearOverlays(page);
  for (const label of TAB_LABELS) {
    try { await clickTab(page, label, { tap: touch }); }
    catch (e) {
      finding(f, `TAB-UNCLICKABLE-${label}`, 'MAJOR', `Tab "${label}" not clickable @${viewport.width}px: ${String(e).slice(0, 120)}`);
      continue;
    }
    const content = await page.locator('.tab-content').innerText().catch(() => '');
    if (!content || content.trim().length < 3) finding(f, `TAB-EMPTY-${label}`, 'MAJOR', `Tab "${label}" renders empty @${viewport.width}px.`);
    const ov = await overflowPx(page);
    if (ov > 1) finding(f, `OVERFLOW-${label}`, 'MINOR', `Horizontal overflow ${ov}px on tab "${label}" @${viewport.width}px.`);
  }
  await ctx.close();
  return f;
}

// ---------------------------------------------------------------------------
// F4: economy loop (desktop)
// ---------------------------------------------------------------------------
async function f4_economyLoop() {
  const f = newFlow('F4 economy-loop desktop 1280x800');
  console.log('\n== ' + f.flow);
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await bootPage(ctx, f);
  await clearOverlays(page);

  await clickTab(page, 'Přehled');
  console.log('  gold at start: ' + await overviewStat(page, 'Zlato'));

  // Jobs: assign workers
  await clickTab(page, 'Práce');
  console.log('  workforce: ' + (await page.locator('.workforce-summary').innerText().catch(() => '')).replace(/\n/g, ' '));
  const plusBtns = page.locator('.jobs-table .job-actions button[title="Přiřadit pracovníka"]');
  const nJobs = await plusBtns.count();
  if (nJobs === 0) finding(f, 'JOBS-NO-ROWS', 'MAJOR', 'Jobs tab shows no assignable jobs on fresh game.');
  else {
    for (let i = 0; i < 3; i++) { await plusBtns.nth(0).click().catch(() => {}); await page.waitForTimeout(120); }
    const assigned = await page.locator('.jobs-table .job-count').allInnerTexts();
    console.log('  assigned after 3 clicks on job[0]: ' + assigned.join(','));
    if (assigned.reduce((s, v) => s + (Number(v) || 0), 0) === 0) {
      finding(f, 'JOBS-ASSIGN-NOOP', 'MAJOR', 'Clicking "+" (assign worker) has no visible effect.');
    }
  }

  // Skills — iter-022 re-verify #4: fresh game must show a CATALOG of startable skills
  // (no seeding of state.home.skills!), and "Spustit" must actually start the skill.
  await clickTab(page, 'Dovednosti');
  const startedItems = page.locator('.skill-item:not(.skill-available-item)');
  const availItems = page.locator('.skill-available-item');
  const started0 = await startedItems.count();
  const avail0 = await availItems.count();
  const availNames = await page.locator('.skill-available-item .skill-id').allInnerTexts();
  console.log(`  skills fresh: started=${started0} (expect 0 — nothing seeded), available catalog=${avail0} [${availNames.join(', ')}]`);
  if (started0 !== 0) {
    finding(f, 'SKILLS-SEEDED', 'MAJOR',
      `Fresh game already has ${started0} started skill(s) — state.home.skills must stay empty until the user clicks Spustit (user decision).`);
  }
  if (avail0 === 0) {
    finding(f, 'SKILLS-DARK-FEATURE', 'MAJOR',
      'Skills tab offers no startable skills on a fresh game (no available-skills catalog rendered) — feature still unreachable from the UI. QA #4 NOT resolved.');
  } else {
    const firstName = (availNames[0] || '').trim();
    await availItems.first().locator('button', { hasText: 'Spustit' }).click().catch(() => {});
    await page.waitForTimeout(500);
    const started1 = await startedItems.count();
    const progressing1 = await page.locator('.skill-item.progressing').count();
    const avail1 = await availItems.count();
    console.log(`  after Spustit("${firstName}"): started=${started1}, progressing=${progressing1}, available=${avail1}`);
    if (started1 !== started0 + 1 || avail1 !== avail0 - 1) {
      finding(f, 'SKILLS-START-NOOP', 'MAJOR',
        `Clicking "Spustit" on catalog skill "${firstName}" did not start it (started ${started0}->${started1}, available ${avail0}->${avail1}). QA #4 NOT resolved.`);
    } else if (progressing1 === 0) {
      finding(f, 'SKILLS-START-NOT-PROGRESSING', 'MINOR',
        `Skill "${firstName}" moved out of the catalog after Spustit but is not in "progressing" state.`);
    } else console.log('  #4 catalog -> Spustit -> progressing: OK');
  }

  // Council: tax +/- — spaced clicks (basic function) then rapid clicks (stale closure)
  await clickTab(page, 'Rada');
  const readTax = async () => {
    const t = await page.locator('.screen-council dl').first().innerText().catch(() => '');
    const m = t.match(/sazba\s*([-\d.]+)/i);
    return m ? Number(m[1]) : null;
  };
  const minus = page.locator('.screen-council dl dd button').nth(0);
  const plus = page.locator('.screen-council dl dd button').nth(1);
  const t0 = await readTax();
  await minus.click(); await page.waitForTimeout(400);
  const t1 = await readTax();
  console.log(`  tax spaced: ${t0} -> ${t1} after 1x minus`);
  if (t0 !== null && t1 === t0) finding(f, 'TAX-MINUS-NOOP', 'MAJOR', 'Single spaced click on tax "−" does not change the rate.');
  // drive to 0 with spaced clicks
  for (let i = 0; i < 5; i++) { await minus.click(); await page.waitForTimeout(250); }
  const tZero = await readTax();
  // 10 RAPID plus clicks -> expect clamp max 5 (BALANCE.tax.rateMax=5), stale closure would give ~1
  for (let i = 0; i < 10; i++) await plus.click();
  await page.waitForTimeout(600);
  const tRapid = await readTax();
  console.log(`  tax rapid: from ${tZero}, 10 rapid "+" clicks -> ${tRapid} (expected 5 = rateMax)`);
  if (tZero === 0 && tRapid !== null && tRapid < 3) {
    finding(f, 'TAX-RAPID-CLICK-LOST', 'MINOR',
      `Rapid clicking tax "+" loses increments: 10 fast clicks from 0 end at ${tRapid} instead of 5 (rateMax). Cause: onClick sends rate: finance.taxRate + 1 from the last-RENDERED value (src/ui/screens.js:242-243) and renders are throttled — every click before the next render re-sends the same value. Same for "−".`);
  }

  // speed: measure 1x vs 2x steps/s (overlays cleared before each measurement)
  await clearOverlays(page);
  await page.locator('.speed button', { hasText: '1×' }).click().catch(() => {});
  const a1 = await curStep(page); await page.waitForTimeout(4000); await clearOverlays(page);
  const a2 = await curStep(page);
  await page.locator('.speed button', { hasText: '2×' }).click().catch(() => {});
  const b1 = await curStep(page); await page.waitForTimeout(4000); await clearOverlays(page);
  const b2 = await curStep(page);
  const r1 = (a2 - a1) / 4, r2 = (b2 - b1) / 4;
  console.log(`  steps/s: 1x=${r1.toFixed(1)}, 2x=${r2.toFixed(1)}`);
  if (a2 <= a1) {
    const hasDialog = await page.locator('.story-overlay').count();
    if (!hasDialog) finding(f, 'ENGINE-FROZEN-1X', 'BLOCKER', `Engine not advancing at 1x with no story dialog (krok ${a1} -> ${a2}).`);
    else console.log('  (engine stopped by story event during 1x window — dialog present, by design)');
  }
  if (b2 > b1 && a2 > a1 && r2 < r1 * 1.5) {
    finding(f, 'SPEED-2X-INEFFECTIVE', 'MINOR', `2x speed gives ${r2.toFixed(1)} steps/s vs ${r1.toFixed(1)} at 1x (expected ~2x).`);
  }
  // pause
  await page.locator('.speed button', { hasText: '⏸' }).click().catch(() => {});
  await page.waitForTimeout(300);
  const p1 = await curStep(page); await page.waitForTimeout(1500); const p2 = await curStep(page);
  if (p1 !== null && p2 > p1) finding(f, 'PAUSE-NOOP', 'MAJOR', `Pause does not stop engine (krok ${p1} -> ${p2}).`);
  else console.log('  pause OK');
  await page.locator('.speed button', { hasText: '1×' }).click().catch(() => {});
  const hb = await rafHeartbeat(page);
  if (hb > 3000) finding(f, 'JANK-LOOP', 'MAJOR', `30 rAF frames took ${hb.toFixed(0)} ms.`);
  await ctx.close();
  return f;
}

// ---------------------------------------------------------------------------
// F5: market / build / contracts / tech / quests (desktop)
// ---------------------------------------------------------------------------
async function f5_marketBuildContracts() {
  const f = newFlow('F5 market-build-contracts desktop 1280x800');
  console.log('\n== ' + f.flow);
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await bootPage(ctx, f);
  await clearOverlays(page);

  await clickTab(page, 'Přehled');
  const goldStart = await overviewStat(page, 'Zlato');

  await clickTab(page, 'Trh');
  const rows = page.locator('.market-table tbody tr');
  const nRows = await rows.count();
  console.log(`  market rows: ${nRows}, gold: ${goldStart}`);
  if (nRows === 0 || (nRows === 1 && (await rows.first().innerText()).includes('není k dispozici'))) {
    finding(f, 'MARKET-EMPTY', 'MAJOR', 'Market table empty on fresh game.');
  } else {
    const before = await rows.first().locator('td').allInnerTexts();
    await rows.first().locator('button', { hasText: 'Koupit 10' }).click().catch(() => {});
    await page.waitForTimeout(400);
    const after = await page.locator('.market-table tbody tr').first().locator('td').allInnerTexts();
    console.log(`  buy10 ${before[0]}: owned ${before[4]} -> ${after[4]}, avail "${before[1]}" -> "${after[1]}"`);
    await clickTab(page, 'Přehled');
    const goldAfterBuy = await overviewStat(page, 'Zlato');
    console.log(`  gold after buy: ${goldStart} -> ${goldAfterBuy}`);
    if (Number(after[4]) === Number(before[4]) && goldAfterBuy === goldStart) {
      finding(f, 'MARKET-BUY-NOOP', 'MAJOR', `"Koupit 10" on ${before[0]} did nothing and gave no feedback.`);
    }
    if (goldAfterBuy && /\.\d{3,}/.test(goldAfterBuy)) {
      finding(f, 'GOLD-FLOAT-DISPLAY', 'MINOR', `Gold shown with long float tail after market buy: "${goldAfterBuy}" (Overview prints snapshot.player.gold raw, src/ui/App.js:126).`);
    }
    await clickTab(page, 'Trh');
    const sellBtn = page.locator('.market-table tbody tr').first().locator('button', { hasText: 'Prodat 10' });
    if (!(await sellBtn.isDisabled().catch(() => true))) {
      const ownedNow = Number(after[4]);
      await sellBtn.click().catch(() => {});
      await page.waitForTimeout(300);
      const afterSell = await page.locator('.market-table tbody tr').first().locator('td').allInnerTexts();
      console.log(`  sell10: owned ${ownedNow} -> ${afterSell[4]}`);
      if (Number(afterSell[4]) === ownedNow) finding(f, 'MARKET-SELL-NOOP', 'MAJOR', '"Prodat 10" did nothing despite enabled button.');
    }
    const carBtn = page.locator('.caravan-section button');
    if (await carBtn.count() > 0 && !(await carBtn.isDisabled().catch(() => true))) {
      await carBtn.click().catch(() => {});
      await page.waitForTimeout(300);
      const carState = await page.locator('.caravan-section dl').innerText().catch(() => '');
      console.log('  caravan after send: ' + carState.replace(/\n/g, ' '));
      if (!/Na cestě/.test(carState)) finding(f, 'CARAVAN-NOOP', 'MINOR', 'Caravan send clicked, status not "Na cestě", no feedback why.');
    }
  }

  await clickTab(page, 'Stavba');
  console.log(`  building cards: ${await page.locator('.building-card').count()}`);
  const affordable = page.locator('.building-card:not(.unaffordable) button', { hasText: 'Postavit' });
  if (await affordable.count() > 0) {
    const qb = await page.locator('.project-list li').count();
    await affordable.first().click().catch(() => {});
    await page.waitForTimeout(400);
    const qa = await page.locator('.project-list li').count();
    console.log(`  build queue: ${qb} -> ${qa}`);
    if (qa <= qb) finding(f, 'BUILD-NOOP', 'MAJOR', '"Postavit" on affordable building added nothing to queue, no feedback.');
  } else console.log('  no affordable building at fresh start');
  const hireBtn = page.locator('.company-item button', { hasText: 'Najmout' });
  for (let i = 0; i < await hireBtn.count(); i++) {
    if (!(await hireBtn.nth(i).isDisabled().catch(() => true))) {
      await hireBtn.nth(i).click().catch(() => {});
      await page.waitForTimeout(300);
      const owned = await page.locator('.company-item.owned').count();
      console.log(`  hired builder company; owned now: ${owned}`);
      if (owned === 0) finding(f, 'COMPANY-BUY-NOOP', 'MAJOR', '"Najmout" affordable builder company had no effect.');
      break;
    }
  }

  await clickTab(page, 'Kontrakty');
  const nOff = await page.locator('.contract-offered').count();
  console.log(`  offered contracts: ${nOff}`);
  if (nOff > 0) {
    await page.locator('.contract-offered').first().locator('button', { hasText: 'Přijmout' }).click().catch(() => {});
    await page.waitForTimeout(300);
    if (await page.locator('.contract-active').count() === 0) {
      finding(f, 'CONTRACT-ACCEPT-NOOP', 'MAJOR', 'Accepting an offered contract did not activate it, no feedback.');
    } else console.log('  contract accepted OK');
  }

  await clickTab(page, 'Veda');
  console.log('  ' + (await page.locator('.tech-points-header').innerText().catch(() => '')).trim());
  const buyTech = page.locator('.tech-buy-btn:not([disabled])');
  if (await buyTech.count() > 0) {
    await buyTech.first().click().catch(() => {});
    await page.waitForTimeout(300);
    if (await page.locator('.tech-item-unlocked').count() === 0) finding(f, 'TECH-BUY-NOOP', 'MAJOR', 'Buying affordable tech had no visible effect.');
  } else console.log('  no affordable tech at fresh start (0 TB)');

  await clickTab(page, 'Svět');
  const zoneRows = await page.locator('.zones-table tbody tr').count();
  console.log(`  zones: ${zoneRows}, quests: ${await page.locator('.quest-item').count()}`);
  if (zoneRows === 0) finding(f, 'ZONES-EMPTY', 'MAJOR', 'World tab shows no zones on fresh game.');
  await ctx.close();
  return f;
}

// ---------------------------------------------------------------------------
// F6: recruit UI — iter-022 re-verify #3: recruit section on Bitva tab must exist,
// buttons must be wired to live gold, and a click must REALLY add a unit.
// A fresh game cannot afford a warrior (830 gold < 1080), so gold is accrued via
// real offline catch-up rounds (page.clock, same public mechanism as F8).
// ---------------------------------------------------------------------------
async function f6_recruitAudit() {
  const f = newFlow('F6 recruit-ui #3 desktop 1280x800 (+offline gold accrual)');
  console.log('\n== ' + f.flow);
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  wireRum(page, f);
  const T0 = Date.now();
  await page.clock.install({ time: T0 });
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
  await page.clock.runFor(2500);
  await page.waitForTimeout(400);
  await clearOverlays(page);

  const readGold = async () => {
    await clickTab(page, 'Přehled');
    const g = await overviewStat(page, 'Zlato');
    return g === null ? null : parseFloat(String(g).replace(/[^\d.,-]/g, '').replace(',', '.'));
  };
  const parseRecruits = async () => {
    const items = page.locator('.recruit-section .recruit-item');
    const n = await items.count();
    const out = [];
    for (let i = 0; i < n; i++) {
      const it = items.nth(i);
      const name = (await it.locator('.recruit-name').innerText().catch(() => '')).trim();
      const ownedT = await it.locator('.recruit-owned').innerText().catch(() => '');
      const costT = await it.locator('.recruit-cost').innerText().catch(() => '');
      const btn1 = it.locator('button', { hasText: 'Naverbovat 1×' });
      out.push({
        i, name,
        owned: Number((ownedT.match(/(\d+)/) || [])[1] ?? NaN),
        cost: Number((costT.match(/(\d+(?:[.,]\d+)?)/) || [])[1] ?? NaN),
        disabled1: await btn1.isDisabled().catch(() => true),
      });
    }
    return out;
  };

  // Part A: presence + wiring of the recruit UI on the Bitva tab (fresh game)
  await clickTab(page, 'Bitva');
  let recruits = await parseRecruits();
  if (recruits.length === 0) {
    finding(f, 'NO-RECRUIT-UI', 'MAJOR',
      'Bitva tab renders no .recruit-section/.recruit-item — the player still cannot recruit warriors/archers from the UI. QA #3 NOT resolved.');
    await ctx.close();
    return f;
  }
  console.log('  recruit items (fresh): ' + recruits.map(r => `${r.name} owned=${r.owned} cost=${r.cost} disabled1x=${r.disabled1}`).join(' | '));
  let gold = await readGold();
  console.log(`  gold (fresh): ${gold}`);
  for (const r of recruits) {
    const expectDisabled = gold !== null && !Number.isNaN(r.cost) ? gold < r.cost : null;
    if (expectDisabled !== null && r.disabled1 !== expectDisabled) {
      finding(f, 'RECRUIT-AFFORD-MISMATCH', 'MAJOR',
        `"Naverbovat 1×" for ${r.name}: disabled=${r.disabled1} but gold=${gold} vs cost=${r.cost} — button state not wired to live gold.`);
    }
  }

  // Part B: accrue gold via offline catch-up until a 1× recruit is affordable, then click.
  let clickTested = false;
  for (let round = 0; round <= 3 && !clickTested; round++) {
    if (round > 0) {
      console.log(`  gold accrual round ${round}: hide -> +45 min offline -> reload -> catch-up`);
      await page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await page.waitForTimeout(900);
      await page.clock.setSystemTime(T0 + round * 45 * 60 * 1000);
      await page.reload({ waitUntil: 'networkidle' });
      const dl = Date.now() + 90000;
      while (Date.now() < dl) {
        await page.clock.runFor(1000).catch(() => {});
        await page.waitForTimeout(80);
        const opt = page.locator('.story-overlay .story-option-btn').first();
        if (await opt.count() > 0) { await opt.click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(100); }
        if (await page.locator('.offline-summary').count() > 0) break;
      }
      await clearOverlays(page);
    }
    // pause so the before/after comparison is not polluted by the running sim
    // (also re-exercises Wave-1 #2 render-on-send with a different command)
    await page.locator('.speed button', { hasText: '⏸' }).click().catch(() => {});
    await page.waitForTimeout(300);
    gold = await readGold();
    await clickTab(page, 'Bitva');
    recruits = await parseRecruits();
    console.log(`  round ${round}: gold=${gold}; ` + recruits.map(r => `${r.name} owned=${r.owned} cost=${r.cost} disabled1x=${r.disabled1}`).join(' | '));
    const target = recruits.find(r => !r.disabled1);
    if (!target) {
      await page.locator('.speed button', { hasText: '1×' }).click().catch(() => {});
      await page.waitForTimeout(200);
      continue;
    }
    const before = target;
    await page.locator('.recruit-section .recruit-item').nth(before.i)
      .locator('button', { hasText: 'Naverbovat 1×' }).click();
    await page.waitForTimeout(500);
    const afterList = await parseRecruits();
    const after = afterList[before.i];
    const goldAfter = await readGold();
    console.log(`  clicked "Naverbovat 1×" on ${before.name} (paused): owned ${before.owned} -> ${after && after.owned}; gold ${gold} -> ${goldAfter}`);
    if (!after || after.owned !== before.owned + 1) {
      finding(f, 'RECRUIT-CLICK-NOOP', 'MAJOR',
        `Clicking "Naverbovat 1×" on ${before.name} did not add a unit (owned ${before.owned} -> ${after && after.owned}). QA #3 NOT resolved.`);
    } else if (gold !== null && goldAfter !== null && !(goldAfter < gold - before.cost * 0.5)) {
      finding(f, 'RECRUIT-NO-GOLD-DEBIT', 'MAJOR',
        `Recruiting ${before.name} added the unit but gold did not drop by ~cost (${gold} -> ${goldAfter}, cost ${before.cost}).`);
    } else console.log('  #3 recruit click adds a unit and debits gold: OK');
    clickTested = true;
  }
  if (!clickTested) {
    finding(f, 'RECRUIT-CLICK-UNTESTABLE', 'MAJOR',
      'Could not afford any unit even after 3 offline catch-up rounds (~135 min) — successful recruit click NOT verified end-to-end (economy/balance gap, wiring itself present).');
  }
  await ctx.close();
  return f;
}

// ---------------------------------------------------------------------------
// F7: save via hide -> reload -> restore
// ---------------------------------------------------------------------------
async function f7_saveReload() {
  const f = newFlow('F7 save-reload desktop 1280x800');
  console.log('\n== ' + f.flow);
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await bootPage(ctx, f);
  await clearOverlays(page);

  await clickTab(page, 'Práce');
  const plusBtns = page.locator('.jobs-table .job-actions button[title="Přiřadit pracovníka"]');
  if (await plusBtns.count() > 0) {
    await plusBtns.nth(0).click().catch(() => {});
    await page.waitForTimeout(150);
    await plusBtns.nth(0).click().catch(() => {});
    await page.waitForTimeout(200);
  }
  const assignedBefore = (await page.locator('.jobs-table .job-count').allInnerTexts()).join(',');
  const stepBefore = await curStep(page);
  console.log(`  before reload: assigned=[${assignedBefore}], krok=${stepBefore}`);

  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(1200);

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await clearOverlays(page);
  const stepAfter = await curStep(page);
  await clickTab(page, 'Práce');
  const assignedAfter = (await page.locator('.jobs-table .job-count').allInnerTexts()).join(',');
  console.log(`  after reload: assigned=[${assignedAfter}], krok=${stepAfter}`);

  if (stepAfter === null || (stepBefore !== null && stepAfter < stepBefore - 50)) {
    finding(f, 'SAVE-RELOAD-LOST-PROGRESS', 'BLOCKER', `Reload lost progress: krok ${stepBefore} -> ${stepAfter}.`);
  }
  if (assignedBefore && assignedAfter !== assignedBefore && assignedAfter.replace(/[0,]/g, '') === '') {
    finding(f, 'SAVE-RELOAD-LOST-ASSIGN', 'BLOCKER', `Worker assignment lost on reload: [${assignedBefore}] -> [${assignedAfter}].`);
  }
  await ctx.close();
  return f;
}

// ---------------------------------------------------------------------------
// F8: offline catchup via fake clock (+30 min)
// ---------------------------------------------------------------------------
async function f8_offlineCatchup() {
  const f = newFlow('F8 offline-catchup +30min fake clock, desktop');
  console.log('\n== ' + f.flow);
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  wireRum(page, f);
  const T0 = Date.now();
  await page.clock.install({ time: T0 });
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
  await page.clock.runFor(3000);
  await page.waitForTimeout(400);
  await clearOverlays(page);
  const stepBefore = await curStep(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(800);
  await page.clock.setSystemTime(T0 + 30 * 60 * 1000);
  await page.reload({ waitUntil: 'networkidle' });

  const deadline = Date.now() + 90000;
  let stepAfter = null, sawProgress = false, sawSummary = false, storyInterrupts = 0;
  let catchupStyled = null; // iter-022 re-verify #10: sample computed style while visible
  while (Date.now() < deadline) {
    await page.clock.runFor(1000).catch(() => {});
    await page.waitForTimeout(80);
    if (await page.locator('.catchup-progress').count() > 0) {
      sawProgress = true;
      if (catchupStyled === null) {
        catchupStyled = await page.evaluate(() => {
          const el = document.querySelector('.catchup-progress');
          if (!el) return null;
          const cs = getComputedStyle(el);
          const bar = el.querySelector('.catchup-bar');
          return {
            hasContainer: cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.borderStyle !== 'none',
            border: cs.borderStyle, bg: cs.backgroundColor,
            hasBar: !!bar, barBg: bar ? getComputedStyle(bar).backgroundColor : null,
          };
        });
      }
    }
    // story event can interrupt catch-up (by design) — ack it like a player would
    const opt = page.locator('.story-overlay .story-option-btn').first();
    if (await opt.count() > 0) {
      storyInterrupts++;
      await opt.scrollIntoViewIfNeeded().catch(() => {});
      await opt.click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(100);
    }
    if (await page.locator('.offline-summary').count() > 0) { sawSummary = true; break; }
    stepAfter = await curStep(page);
    if (stepAfter !== null && stepBefore !== null && stepAfter >= stepBefore + 36000) break;
  }
  stepAfter = await curStep(page);
  console.log(`  krok ${stepBefore} -> ${stepAfter}; catchup-progress UI=${sawProgress}, offline-summary UI=${sawSummary}, story interrupts acked=${storyInterrupts}`);
  if (catchupStyled) {
    console.log(`  catchup-progress styled: ${JSON.stringify(catchupStyled)}`);
    if (!catchupStyled.hasContainer) finding(f, 'CATCHUP-PROGRESS-UNSTYLED', 'MINOR', '.catchup-progress still has no visual container (transparent bg, no border).');
  }
  if (stepBefore !== null && stepAfter !== null && stepAfter - stepBefore < 30000) {
    finding(f, 'OFFLINE-CATCHUP-SHORT', 'MAJOR', `Offline catch-up after 30 min advanced only ${stepAfter - stepBefore} steps (expected ~36000) even with story events acked.`);
  }
  if (sawSummary) {
    const txt = await page.locator('.offline-summary').innerText().catch(() => '');
    console.log('  summary: ' + txt.slice(0, 160).replace(/\n/g, ' '));
    const styled = await page.evaluate(() => {
      const el = document.querySelector('.offline-summary');
      if (!el) return null;
      const cs = getComputedStyle(el);
      return cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.borderStyle !== 'none';
    });
    if (styled === false) finding(f, 'OFFLINE-SUMMARY-UNSTYLED', 'MINOR', '.offline-summary has zero CSS (plain text block, no visual container).');
  } else {
    finding(f, 'OFFLINE-NO-SUMMARY', 'MINOR', 'No .offline-summary element appeared after catch-up completed.');
  }
  await ctx.close();
  return f;
}

// ---------------------------------------------------------------------------
// F9: export / import round-trip (+ no-permission export, invalid import)
// ---------------------------------------------------------------------------
async function f9_exportImport() {
  const f = newFlow('F9 export-import desktop 1280x800');
  console.log('\n== ' + f.flow);
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await bootPage(ctx, f);
  await clearOverlays(page);

  const exportBtn = page.locator('.save-actions button', { hasText: 'Exportovat hru' });
  if (await exportBtn.count() === 0) {
    finding(f, 'EXPORT-NO-BUTTON', 'MAJOR', 'No "Exportovat hru" button found.');
    await ctx.close(); return f;
  }
  await exportBtn.click();
  await page.waitForTimeout(500);
  let clip = '';
  try { clip = await page.evaluate(() => navigator.clipboard.readText()); } catch { clip = ''; }
  console.log(`  clipboard length after export: ${clip.length}`);
  // iter-022 re-verify #5: success confirmation must be a real DOM banner, not just any text
  const copiedBanner = await page.locator('.banner-export-feedback').count();
  const copiedText = copiedBanner ? (await page.locator('.banner-export-feedback').innerText().catch(() => '')).replace(/\n/g, ' ').trim() : '';
  console.log(`  export confirmation: .banner-export-feedback count=${copiedBanner}, text="${copiedText.slice(0, 60)}"`);
  if (clip && copiedBanner === 0) {
    finding(f, 'EXPORT-NO-FEEDBACK', 'MAJOR',
      'Export copied the save string to the clipboard but NO visible confirmation banner (.banner-export-feedback) rendered — QA #5 NOT resolved.');
  }
  if (!clip) {
    const fbCount = await page.locator('.banner-export-fallback .export-fallback-text').count();
    if (fbCount === 0) finding(f, 'EXPORT-NO-OUTPUT', 'BLOCKER', 'Export produced no accessible output at all (clipboard empty, no fallback textarea).');
    else console.log('  clipboard empty but fallback textarea present (acceptable path)');
  }

  // import the exported string via prompt dialog
  await page.locator('.speed button', { hasText: '⏸' }).click().catch(() => {});
  await page.waitForTimeout(300);
  if (clip) {
    const stepBefore = await curStep(page);
    page.once('dialog', (d) => d.accept(clip).catch(() => {}));
    await page.locator('.save-actions button', { hasText: 'Importovat hru' }).click();
    await page.waitForTimeout(1000);
    const stepAfterImport = await curStep(page);
    console.log(`  krok before import=${stepBefore}, after import=${stepAfterImport}`);
    const txt = await appText(page);
    if (!txt || txt.length < 30) finding(f, 'IMPORT-BLANK', 'BLOCKER', 'App blank after importing a valid export string.');
    else console.log('  valid import OK (app rendered)');
    // a VALID import must not show the error banner (would also indicate a failed flush-save)
    const errAfterValid = await page.locator('.banner-import-error').count();
    if (errAfterValid > 0) {
      const et = (await page.locator('.banner-import-error').innerText().catch(() => '')).replace(/\n/g, ' ').trim();
      finding(f, 'IMPORT-VALID-SHOWS-ERROR', 'MAJOR', `Valid import rendered an error banner: "${et.slice(0, 100)}"`);
    }

    // invalid string -> iter-022 re-verify #8: REALLY read the DOM for the error banner
    // (the pre-fix harness logged a static IMPORT-NO-ERROR-FEEDBACK finding here without
    // checking the DOM — that hardcoded assert is replaced by this live check).
    page.once('dialog', (d) => d.accept('THIS-IS-NOT-A-SAVE').catch(() => {}));
    await page.locator('.save-actions button', { hasText: 'Importovat hru' }).click();
    await page.waitForTimeout(600);
    const txt2 = await appText(page);
    if (!txt2 || txt2.length < 30) finding(f, 'IMPORT-GARBAGE-CRASH', 'BLOCKER', 'App broke after importing an invalid string.');
    else {
      const errCount = await page.locator('.banner-import-error').count();
      const errText = errCount ? (await page.locator('.banner-import-error').innerText().catch(() => '')).replace(/\n/g, ' ').trim() : '';
      console.log(`  invalid import -> .banner-import-error count=${errCount}, text="${errText.slice(0, 90)}"`);
      if (errCount === 0) {
        finding(f, 'IMPORT-NO-ERROR-FEEDBACK', 'MINOR',
          'Invalid import shows NO visible error banner (.banner-import-error absent from DOM) — user cannot tell a failed import from a successful one. QA #8 NOT resolved.');
      } else {
        // banner is dismissable — verify the dismiss control works, and clear it for the reload check
        await page.locator('.banner-import-error .banner-dismiss').click().catch(() => {});
        await page.waitForTimeout(200);
        const stillThere = await page.locator('.banner-import-error').count();
        if (stillThere > 0) finding(f, 'IMPORT-ERROR-NOT-DISMISSABLE', 'MINOR', 'Import error banner cannot be dismissed via its ✕ button.');
      }
    }
    // iter-022 re-verify #6 (data safety): the import must be persisted IMMEDIATELY —
    // a plain reload right after import must NOT fall back to a fresh game (krok 1).
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    await clearOverlays(page);
    const stepAfterReload = await curStep(page);
    console.log(`  krok after plain reload following import: ${stepAfterReload} (expected >= ${stepAfterImport}: import flushed to IndexedDB + offline catch-up since save)`);
    if (stepAfterReload === null || stepAfterImport === null || stepAfterReload < stepAfterImport) {
      finding(f, 'IMPORT-NOT-PERSISTED', 'MAJOR',
        `Imported save did NOT survive an immediate plain reload (krok ${stepAfterImport} -> ${stepAfterReload}) — QA #6 NOT resolved.`);
    } else console.log('  #6 import persisted across immediate reload: OK');
  }
  await ctx.close();

  // export with clipboard permission DENIED (default context has no clipboard grants)
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const f2track = { before: '', after: '' };
  const page2 = await bootPage(ctx2, f);
  await clearOverlays(page2);
  f2track.before = await appText(page2);
  let sawDialog = false;
  page2.once('dialog', () => { sawDialog = true; });
  await page2.locator('.save-actions button', { hasText: 'Exportovat hru' }).click().catch(() => {});
  await page2.waitForTimeout(600);
  f2track.after = await appText(page2);
  // iter-022 re-verify #5 (fallback path): without clipboard grants the export must render
  // a visible fallback banner with the save string in a textarea for manual copy.
  const fbBanner = await page2.locator('.banner-export-fallback').count();
  const fbText = fbBanner ? await page2.evaluate(() => {
    const el = document.querySelector('.export-fallback-text');
    return el ? (/** @type {HTMLTextAreaElement} */ (el).value || el.textContent || '') : '';
  }) : '';
  console.log(`  export without clipboard permission: dialog=${sawDialog}, .banner-export-fallback=${fbBanner}, textarea string length=${fbText.length}`);
  if (fbBanner === 0 || fbText.trim().length < 50) {
    finding(f, 'EXPORT-NO-FALLBACK', 'MAJOR',
      `Without clipboard access the export gives no usable fallback (banner count=${fbBanner}, textarea string length=${fbText.trim().length}) — QA #5 NOT resolved.`);
  } else console.log('  #5 fallback textarea contains the export string: OK');
  await ctx2.close();
  return f;
}

// ---------------------------------------------------------------------------
// F10: live URL cross-check (optional)
// ---------------------------------------------------------------------------
async function f10_liveUrl() {
  const f = newFlow('F10 live-url boot cross-check');
  console.log('\n== ' + f.flow);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  wireRum(page, f);
  try {
    await page.goto('https://erozaxx.github.io/ProsperityGamesa/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    const txt = await appText(page);
    console.log('  live boot text head: ' + txt.slice(0, 80).replace(/\n/g, ' | '));
    if (!txt || txt.length < 30) finding(f, 'LIVE-BOOT-EMPTY', 'MAJOR', 'Live URL did not render app.');
  } catch (e) {
    console.log('  live URL unreachable from this environment (proxy/TLS): ' + String(e).slice(0, 120) + ' — cross-check NEOVĚŘENO');
  }
  await ctx.close();
  return f;
}

// ---------------------------------------------------------------------------
// run all
// ---------------------------------------------------------------------------
const runners = [
  f1_storyEventAudit,
  () => tabSweep('F2 tab-sweep desktop 1280x800', { width: 1280, height: 800 }),
  () => tabSweep('F3a tab-sweep mobile 390x844 touch', { width: 390, height: 844 }, { touch: true }),
  () => tabSweep('F3b tab-sweep mobile 360x800 touch', { width: 360, height: 800 }, { touch: true }),
  () => tabSweep('F3c tab-sweep mobile 320x568 touch', { width: 320, height: 568 }, { touch: true }),
  f4_economyLoop,
  f5_marketBuildContracts,
  f6_recruitAudit,
  f7_saveReload,
  f8_offlineCatchup,
  f9_exportImport,
];
if (process.env.E2E_LIVE_URL === '1') runners.push(f10_liveUrl);

let crashed = false;
for (const run of runners) {
  try { await run(); }
  catch (e) {
    crashed = true;
    const f = flows[flows.length - 1] || newFlow('unknown');
    finding(f, 'HARNESS-FLOW-CRASH', 'MAJOR', `Flow crashed: ${String(e && e.message || e).slice(0, 300)}`);
  }
}

console.log('\n================ RUM TELEMETRY SUMMARY ================');
for (const f of flows) {
  console.log(`\n[${f.flow}] consoleErr=${f.consoleErrors.length} consoleWarn=${f.consoleWarnings.length} pageErr=${f.pageErrors.length} reqFailed=${f.requestFailed.length} findings=${f.findings.length}`);
  for (const e of f.consoleErrors.slice(0, 5)) console.log('   CE: ' + e.slice(0, 200));
  for (const e of f.pageErrors.slice(0, 5)) console.log('   PE: ' + e.slice(0, 200));
  for (const e of f.requestFailed.slice(0, 5)) console.log('   RF: ' + e.slice(0, 200));
  for (const e of f.consoleWarnings.slice(0, 3)) console.log('   CW: ' + e.slice(0, 200));
  for (const fi of f.findings) console.log(`   >> ${fi.severity} ${fi.id}: ${fi.note.split('\n')[0].slice(0, 160)}`);
}

const outPath = process.env.E2E_RUM_OUT || '/tmp/e2e-rum-results.json';
await writeFile(outPath, JSON.stringify(flows, null, 2));
console.log('\nJSON results written to ' + outPath);

await browser.close();
server.close();
process.exit(crashed ? 1 : 0);
