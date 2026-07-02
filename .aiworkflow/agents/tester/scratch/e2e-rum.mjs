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
 *   F6  recruit UI audit (core command exists — any UI path?)
 *   F7  save via hide -> reload -> restore
 *   F8  offline catch-up via fake clock (+30 min) incl. story interrupt + summary
 *   F9  export/import round-trip (clipboard + prompt), invalid import, no-permission export
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

  // HUD stats spacing (.stats has no CSS): do adjacent spans touch?
  const squash = await page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('.stats > span'));
    if (spans.length < 2) return null;
    let touching = 0;
    for (let i = 1; i < spans.length; i++) {
      const a = spans[i - 1].getBoundingClientRect(), b = spans[i].getBoundingClientRect();
      if (Math.abs(b.top - a.top) < 2 && b.left - a.right < 1) touching++;
    }
    return { spans: spans.length, touching, text: document.querySelector('.stats')?.textContent ?? '' };
  });
  if (squash && squash.touching > 0) {
    finding(f, 'HUD-STATS-SQUASHED', 'MINOR',
      `HUD stat spans render with no gap (".stats" has zero CSS): "${squash.text.slice(0, 80)}" — e.g. "Jídlo: 0Zdraví: OKZločin: 0.0%" runs together (${squash.touching} adjacent pairs touching @390px).`);
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

  // Skills: fresh game — is any skill startable from UI?
  await clickTab(page, 'Dovednosti');
  const skillItems = await page.locator('.skill-item').count();
  console.log(`  skills tab items on fresh game: ${skillItems}`);
  if (skillItems === 0) {
    finding(f, 'SKILLS-DARK-FEATURE', 'MAJOR',
      'Skills tab is permanently empty on a fresh game: SkillsScreen only lists existing state.home.skills entries (src/ui/screens.js:574-603, selectors.js:80-88), but nothing ever seeds them — the only writer is the startSkill command (src/core/commands/startSkill.js), whose "Spustit" button is itself only rendered for existing entries. The whole skills feature is unreachable from the UI.');
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
// F6: recruit UI audit
// ---------------------------------------------------------------------------
async function f6_recruitAudit() {
  const f = newFlow('F6 recruit-ui-audit desktop 1280x800');
  console.log('\n== ' + f.flow);
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await bootPage(ctx, f);
  await clearOverlays(page);
  let found = false;
  for (const label of TAB_LABELS) {
    await clickTab(page, label).catch(() => {});
    const hit = await page.evaluate(() => {
      const t = (document.querySelector('.tab-content')?.innerText || '').toLowerCase();
      return /nábor|naverbovat|rekrut|recruit|verbovat/.test(t);
    });
    if (hit) { found = true; console.log(`  possible recruit UI on tab "${label}"`); }
  }
  if (!found) {
    finding(f, 'NO-RECRUIT-UI', 'MAJOR',
      'recruitUnit command is registered in core (src/core/commands/recruitUnit.js, wired src/app/main.js:139) but NO tab exposes any recruit control (0 hits for recruit-related strings across all 12 tabs; grep of src/ui/ confirms 0 references) — the player cannot recruit warriors/archers at all, so army size for battles/defence is uncontrollable from the UI.');
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
  while (Date.now() < deadline) {
    await page.clock.runFor(1000).catch(() => {});
    await page.waitForTimeout(80);
    if (await page.locator('.catchup-progress').count() > 0) sawProgress = true;
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
  // any success confirmation? (code has none: src/app/main.js:289-299 — clipboard write only, catch(() => {}))
  const confirm = await page.evaluate(() => /zkopírov|schránk|exportováno|hotovo/i.test(document.body.innerText));
  if (clip && !confirm) {
    finding(f, 'EXPORT-NO-FEEDBACK', 'MAJOR',
      'Export writes the save string ONLY to the clipboard, silently (src/app/main.js:289-299; failures swallowed by .catch(() => {})). No confirmation, no textarea/download fallback. Where the Clipboard API is unavailable/denied (e.g. iOS standalone PWA quirks, permission denied), the button does literally nothing and the user cannot back up their save.');
  }
  if (!clip) {
    finding(f, 'EXPORT-NO-OUTPUT', 'BLOCKER', 'Export produced no accessible output at all (clipboard empty) and no UI fallback.');
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

    // invalid string -> silent swallow (src/app/main.js:317-320)
    page.once('dialog', (d) => d.accept('THIS-IS-NOT-A-SAVE').catch(() => {}));
    await page.locator('.save-actions button', { hasText: 'Importovat hru' }).click();
    await page.waitForTimeout(600);
    const txt2 = await appText(page);
    if (!txt2 || txt2.length < 30) finding(f, 'IMPORT-GARBAGE-CRASH', 'BLOCKER', 'App broke after importing an invalid string.');
    else {
      finding(f, 'IMPORT-NO-ERROR-FEEDBACK', 'MINOR',
        'Importing an invalid string is silently ignored (catch swallows the error, src/app/main.js:317-320) — user cannot tell a failed import from a successful one.');
    }
    // import is not persisted automatically (no save after import) — verify reload behavior
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    const stepAfterReload = await curStep(page);
    console.log(`  krok after plain reload following import: ${stepAfterReload} (import persisted only if an autosave happened to run)`);
    if (stepAfterReload !== null && stepAfterImport !== null && stepAfterReload < 5 && stepAfterImport > 50) {
      finding(f, 'IMPORT-NOT-PERSISTED', 'MAJOR',
        `Imported save is NOT saved to IndexedDB (onImport only mutates in-memory state, src/app/main.js:310-321; no autosave.requestSave). Reloading within the 60 s autosave window silently discards the import (krok ${stepAfterImport} -> ${stepAfterReload}).`);
    }
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
  const anyNewText = /zkopírov|schránk|export.*(ok|hotovo)/i.test(f2track.after);
  console.log(`  export without clipboard permission: dialog=${sawDialog}, confirmation text=${anyNewText}`);
  if (!sawDialog && !anyNewText) {
    console.log('  -> confirms EXPORT-NO-FEEDBACK: without clipboard access the export button is a complete no-op for the user');
  }
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
