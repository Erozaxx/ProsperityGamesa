/**
 * iter-022 T-003: targeted re-verify of Wave 1 fixes (#1 story dialog, #2 render-on-send).
 * Read-only vs. game code; drives public UI in headless Chromium like e2e-rum.mjs.
 *
 * Usage (repo root):
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node .aiworkflow/agents/tester/scratch/reverify-wave1.mjs [port]
 *
 * Checks:
 *   R1  #1a/#1b — story dialog @320/360/390/1280: position:fixed, backdrop, z-index,
 *       dialog fully in viewport, option button visible+clickable, overlay stays in
 *       viewport after scrolling page to bottom (fixed => cannot end below the fold),
 *       ack resumes engine.
 *   R1c #1c — modality: elementFromPoint at a tab button's center while the dialog is
 *       open must NOT be the tab button (overlay/dialog intercepts).
 *   R2  #2 — render-on-send: with engine PAUSED, tax "−" and market "Koupit 10" must
 *       change the visible UI value immediately (<=500 ms, no resume), krok not moving.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const PORT = Number(process.argv[2]) || 8242;
const ROOT = process.cwd();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (p === '/') p = '/index.html';
    const buf = await readFile(join(ROOT, normalize(p).replace(/^(\.\.[/\\])+/, '')));
    res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(buf);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(PORT, () => r(undefined)));
const BASE = `http://localhost:${PORT}/`;

const pw = await import('playwright');
let browser;
try { browser = await pw.chromium.launch(); }
catch { browser = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); }

let failures = 0;
const check = (ok, label, detail) => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ' :: ' + detail : ''}`);
  if (!ok) failures++;
};
const rum = { consoleErrors: 0, pageErrors: 0, requestFailed: 0 };
function wire(page) {
  page.on('console', (m) => { if (m.type() === 'error') { rum.consoleErrors++; console.log('  CE: ' + m.text().slice(0, 160)); } });
  page.on('pageerror', (e) => { rum.pageErrors++; console.log('  PE: ' + String(e).slice(0, 160)); });
  page.on('requestfailed', (r) => { rum.requestFailed++; console.log('  RF: ' + r.url()); });
}
async function curStep(page) {
  const t = await page.locator('.clock').innerText().catch(() => '');
  const m = t.match(/krok\s+(\d+)/);
  return m ? Number(m[1]) : null;
}
async function clearOverlays(page) {
  for (let i = 0; i < 10; i++) {
    const story = page.locator('.story-overlay .story-option-btn').first();
    if (await story.count() > 0) { await story.click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(200); continue; }
    break;
  }
  const tut = page.locator('.tutorial-btn-dismiss');
  if (await tut.count() > 0) { await tut.first().click().catch(() => {}); await page.waitForTimeout(100); }
}

// ---------------------------------------------------------------------------
// R1 + R1c: story dialog across viewports
// ---------------------------------------------------------------------------
const VIEWPORTS = [
  { w: 320, h: 568, touch: true }, { w: 360, h: 800, touch: true },
  { w: 390, h: 844, touch: true }, { w: 1280, h: 800, touch: false },
];
for (const vp of VIEWPORTS) {
  console.log(`\n== R1 story dialog @${vp.w}x${vp.h}`);
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, hasTouch: vp.touch, isMobile: vp.touch });
  const page = await ctx.newPage();
  wire(page);
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(2500);

  const m = await page.evaluate(() => {
    const ov = document.querySelector('.story-overlay');
    if (!ov) return null;
    const dlg = document.querySelector('.story-dialog');
    const btn = document.querySelector('.story-option-btn');
    const csO = getComputedStyle(ov);
    const rO = ov.getBoundingClientRect();
    const rD = dlg ? dlg.getBoundingClientRect() : null;
    const rB = btn ? btn.getBoundingClientRect() : null;
    return {
      position: csO.position, zIndex: csO.zIndex, bg: csO.backgroundColor,
      ovTop: rO.top, ovBottom: rO.bottom, vh: window.innerHeight, vw: window.innerWidth,
      dlg: rD ? { top: Math.round(rD.top), bottom: Math.round(rD.bottom), left: Math.round(rD.left), right: Math.round(rD.right) } : null,
      btn: rB ? { top: Math.round(rB.top), bottom: Math.round(rB.bottom), inVp: rB.top >= 0 && rB.bottom <= window.innerHeight } : null,
    };
  });
  if (!m) {
    check(false, `intro dialog present @${vp.w}`, 'no .story-overlay at boot (engine may have resumed?)');
    await ctx.close();
    continue;
  }
  check(m.position === 'fixed', `overlay position:fixed @${vp.w}`, m.position);
  check(m.zIndex === '1000', `overlay z-index 1000 @${vp.w}`, m.zIndex);
  check(m.bg !== 'rgba(0, 0, 0, 0)', `overlay has backdrop @${vp.w}`, m.bg);
  check(m.ovTop <= 0 && m.ovBottom >= m.vh, `overlay covers viewport @${vp.w}`, `top=${m.ovTop} bottom=${m.ovBottom} vh=${m.vh}`);
  check(!!m.dlg && m.dlg.top >= 0 && m.dlg.bottom <= m.vh && m.dlg.left >= 0 && m.dlg.right <= m.vw,
    `dialog fully in viewport @${vp.w}`, JSON.stringify(m.dlg));
  check(!!m.btn && m.btn.inVp, `option button in viewport @${vp.w}`, JSON.stringify(m.btn));

  // #1c modality: hit-test at a tab button's center — must NOT reach the tab
  const hit = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('.tabs .tab-btn'));
    const tab = tabs.find((b) => (b.textContent || '').includes('Trh')) || tabs[0];
    if (!tab) return null;
    const r = tab.getBoundingClientRect();
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { tabText: (tab.textContent || '').trim(), hitClass: el ? el.className : null, blocked: el !== tab && !tab.contains(el) };
  });
  check(!!hit && hit.blocked, `#1c background blocked (hit-test on tab "${hit && hit.tabText}") @${vp.w}`, `elementFromPoint -> .${hit && hit.hitClass}`);

  // #1b regression form: scroll page to bottom — fixed overlay must stay in viewport
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(150);
  const afterScroll = await page.evaluate(() => {
    const ov = document.querySelector('.story-overlay');
    if (!ov) return null;
    const r = ov.getBoundingClientRect();
    return { top: Math.round(r.top), inViewport: r.top < window.innerHeight && r.bottom > 0 };
  });
  check(!!afterScroll && afterScroll.inViewport, `overlay stays in viewport after full page scroll @${vp.w}`, JSON.stringify(afterScroll));

  // ack works: closes the dialog OR advances the intro chain (story.json: intro option has
  // next:"introWorld", nextDelaySteps:0 — a second engine-stopping dialog appears instantly,
  // by design). After clearing the whole chain the engine must resume.
  const s1 = await curStep(page);
  const textBefore = await page.locator('.story-text').first().innerText().catch(() => '');
  await page.locator('.story-option-btn').first().click({ timeout: 3000 });
  await page.waitForTimeout(400);
  const stillOpen = await page.locator('.story-overlay').count();
  const textAfter = stillOpen ? await page.locator('.story-text').first().innerText().catch(() => '') : '';
  check(stillOpen === 0 || textAfter !== textBefore, `ack advances/closes dialog @${vp.w}`,
    stillOpen === 0 ? 'closed' : 'chained next intro event (by design)');
  await clearOverlays(page);
  await page.waitForTimeout(1500);
  const s2 = await curStep(page);
  check(s2 !== null && s1 !== null && s2 > s1, `engine resumes after full intro chain acked @${vp.w}`, `krok ${s1} -> ${s2}`);

  // #1b original scenario, post-fix expectation: after ack switch tab, then when the NEXT
  // story event fires it must render in-viewport on top of that (long) tab.
  await clearOverlays(page);
  const tabBtn = page.locator('.tabs .tab-btn', { hasText: 'Trh' }).first();
  if (vp.touch) await tabBtn.tap({ timeout: 3000 }).catch(() => {}); else await tabBtn.click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(200);
  // wait up to 75 s of game time for a day-boundary story event on the Trh tab
  let nextEvt = null;
  const deadline = Date.now() + 75000;
  while (Date.now() < deadline) {
    if (await page.locator('.story-overlay').count() > 0) {
      nextEvt = await page.evaluate(() => {
        const el = document.querySelector('.story-dialog');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: window.innerHeight, inViewport: r.top >= 0 && r.bottom <= window.innerHeight };
      });
      break;
    }
    await page.waitForTimeout(500);
  }
  if (nextEvt) check(nextEvt.inViewport, `next story event in-viewport on Trh tab @${vp.w}`, JSON.stringify(nextEvt));
  else console.log(`  (no further story event within window @${vp.w} — tab-switch scenario covered by scroll check above)`);
  await ctx.close();
}

// ---------------------------------------------------------------------------
// R2: render-on-send while PAUSED (finding #2 repro)
// ---------------------------------------------------------------------------
console.log('\n== R2 render-on-send while paused (desktop 1280x800)');
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  wire(page);
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(2500);
  await clearOverlays(page);

  // PAUSE
  await page.locator('.speed button', { hasText: '⏸' }).click();
  await page.waitForTimeout(300);
  const p1 = await curStep(page);
  await page.waitForTimeout(1200);
  const p2 = await curStep(page);
  check(p1 !== null && p2 === p1, 'engine paused (krok frozen)', `krok ${p1} -> ${p2}`);

  // Tax "−" while paused: UI must update immediately (original repro showed 1 -> 1)
  await clearOverlays(page);
  await page.locator('.tabs .tab-btn', { hasText: 'Rada' }).first().click();
  await page.waitForTimeout(200);
  const readTax = async () => {
    const t = await page.locator('.screen-council dl').first().innerText().catch(() => '');
    const m2 = t.match(/sazba\s*([-\d.]+)/i);
    return m2 ? Number(m2[1]) : null;
  };
  const t0 = await readTax();
  await page.locator('.screen-council dl dd button').nth(0).click(); // minus
  await page.waitForTimeout(400); // still paused; render throttle is 66 ms
  const t1 = await readTax();
  const pMid = await curStep(page);
  check(t0 !== null && t1 !== null && t1 === t0 - 1, '#2 tax "−" reflects IMMEDIATELY while paused', `UI ${t0} -> ${t1} (krok still ${pMid})`);
  check(pMid === p1, 'still paused during tax check (no hidden resume)', `krok ${pMid} vs ${p1}`);

  // Market "Koupit 10" while paused: owned must update immediately (original: 0 -> 0)
  await page.locator('.tabs .tab-btn', { hasText: 'Trh' }).first().click();
  await page.waitForTimeout(200);
  const row = page.locator('.market-table tbody tr').first();
  const before = await row.locator('td').allInnerTexts();
  await row.locator('button', { hasText: 'Koupit 10' }).click();
  await page.waitForTimeout(400);
  const after = await page.locator('.market-table tbody tr').first().locator('td').allInnerTexts();
  const pEnd = await curStep(page);
  check(Number(after[4]) === Number(before[4]) + 10, '#2 "Koupit 10" reflects IMMEDIATELY while paused', `${before[0]}: owned ${before[4]} -> ${after[4]} (krok still ${pEnd})`);
  check(pEnd === p1, 'still paused during buy check (no hidden resume)', `krok ${pEnd} vs ${p1}`);
  await ctx.close();
}

console.log(`\n================ RE-VERIFY SUMMARY ================`);
console.log(`failures=${failures}  RUM: consoleErrors=${rum.consoleErrors} pageErrors=${rum.pageErrors} requestFailed=${rum.requestFailed}`);
await browser.close();
server.close();
process.exit(failures > 0 ? 2 : 0);
