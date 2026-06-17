/**
 * Browser smoke gate (headless Chromium via Playwright).
 * Boots the PWA from a static server and asserts: app renders + 0 console/page errors.
 * Usage: node tools/smoke.mjs [port]   (Playwright must be installed: npx playwright install chromium)
 * Exit 0 = OK, 1 = boot/render/console-error failure.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const PORT = Number(process.argv[2]) || 8231;
const ROOT = process.cwd();
/** @type {Record<string, string>} */
const MIME = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.json':'application/json', '.webmanifest':'application/manifest+json', '.css':'text/css', '.svg':'image/svg+xml' };

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

let pw;
try { pw = await import('playwright'); }
catch { console.error('SMOKE SKIP: playwright not installed (npx playwright install chromium)'); server.close(); process.exit(0); }

const browser = await pw.chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
/** @type {string[]} */
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

let ok = true;
try {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2500);
  const txt = await page.locator('#app').innerText().catch(() => '');
  if (errors.length) { ok = false; console.error('SMOKE FAIL: console/page errors:\n - ' + errors.slice(0,10).join('\n - ')); }
  else if (!txt || /Načítám/.test(txt) && txt.length < 30) { ok = false; console.error('SMOKE FAIL: app did not render (still loading / empty #app).'); }
  else console.log('SMOKE OK: app rendered, 0 console errors.\n--- app text (head) ---\n' + txt.slice(0, 200));

  // iter-021 T1 UX-2: no horizontal overflow @ 320/360/390 px across every tab.
  if (ok) {
    const tabIds = await page.$$eval('.tabs .tab-btn', (els) => els.length);
    for (const width of [320, 360, 390]) {
      await page.setViewportSize({ width, height: 844 });
      for (let i = 0; i < tabIds; i++) {
        await page.$$eval('.tabs .tab-btn', (els, idx) => {
          const el = /** @type {HTMLElement|undefined} */ (els[idx]);
          if (el) el.click();
        }, i);
        await page.waitForTimeout(60);
        const overflow = await page.evaluate(() =>
          document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (overflow > 1) {
          ok = false;
          console.error(`SMOKE FAIL: horizontal overflow ${overflow}px @ ${width}px (tab #${i}).`);
          break;
        }
      }
      if (!ok) break;
    }
    if (ok) console.log(`SMOKE OK: 0 horizontal overflow @ 320/360/390px across ${tabIds} tabs.`);
  }
} catch (e) { ok = false; console.error('SMOKE FAIL: ' + (e instanceof Error ? e.message : String(e))); }
finally { await browser.close(); server.close(); }
process.exit(ok ? 0 : 1);
