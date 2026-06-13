/**
 * Tests for tools/gen-precache.mjs – precache generation, determinism, exclusion.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

const { generatePrecache } = await import('../tools/gen-precache.mjs');

test('generatePrecache produces a src/precache.js file', () => {
  generatePrecache();
  const outPath = join(ROOT, 'src', 'precache.js');
  assert.ok(existsSync(outPath), 'src/precache.js should exist');
});

test('precache.js exports PRECACHE_VERSION with correct prefix', async () => {
  const { PRECACHE_VERSION, PRECACHE_URLS } = await import('../src/precache.js?v=' + Date.now());
  assert.ok(typeof PRECACHE_VERSION === 'string', 'PRECACHE_VERSION should be string');
  assert.ok(PRECACHE_VERSION.startsWith('prosperity-'), `version should start with "prosperity-", got: ${PRECACHE_VERSION}`);
  assert.ok(PRECACHE_VERSION.length > 15, 'version should include a hash suffix');
  assert.ok(Array.isArray(PRECACHE_URLS), 'PRECACHE_URLS should be array');
  assert.ok(PRECACHE_URLS.length > 0, 'PRECACHE_URLS should not be empty');
});

test('precache.js URLs are all ./relative and contain no duplicates', async () => {
  const { PRECACHE_URLS } = await import('../src/precache.js?v2=' + Date.now());
  for (const url of PRECACHE_URLS) {
    assert.ok(url.startsWith('./'), `URL should start with ./, got: ${url}`);
  }
  const unique = new Set(PRECACHE_URLS);
  assert.equal(unique.size, PRECACHE_URLS.length, 'no duplicate URLs');
});

test('precache.js contains expected key files', async () => {
  const { PRECACHE_URLS } = await import('../src/precache.js?v3=' + Date.now());
  const urls = new Set(PRECACHE_URLS);
  assert.ok(urls.has('./index.html'), 'should contain ./index.html');
  assert.ok(urls.has('./manifest.webmanifest'), 'should contain ./manifest.webmanifest');
});

test('precache.js does NOT contain test files or .d.ts or .gitkeep or .md', async () => {
  const { PRECACHE_URLS } = await import('../src/precache.js?v4=' + Date.now());
  for (const url of PRECACHE_URLS) {
    assert.ok(!url.endsWith('.test.js'), `test file should be excluded: ${url}`);
    assert.ok(!url.endsWith('.d.ts'), `.d.ts should be excluded: ${url}`);
    assert.ok(!url.endsWith('.gitkeep'), `.gitkeep should be excluded: ${url}`);
    assert.ok(!url.endsWith('.md'), `.md should be excluded: ${url}`);
  }
});

test('generatePrecache is deterministic (same content → same version)', () => {
  const r1 = generatePrecache({ outFile: '/tmp/precache-test-1.js' });
  const r2 = generatePrecache({ outFile: '/tmp/precache-test-2.js' });
  assert.equal(r1.version, r2.version, 'version should be identical across two runs');
  assert.deepEqual(r1.files, r2.files, 'file list should be identical');
});
