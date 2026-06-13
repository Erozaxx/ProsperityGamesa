#!/usr/bin/env node
/**
 * Grep gate: verifies that src/core/**\/*.js does not import DOM/IO/nondeterministic APIs.
 * Exits 0 if clean, exits 1 with violation details if any banned pattern found.
 * Lines containing '// gate-allow' are skipped (escape hatch for documented safe cases).
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** @type {Array<[RegExp, string]>} */
const PATTERNS = [
  [/\bdocument\b/, 'DOM'],
  [/\bwindow\b/, 'DOM'],
  [/\bglobalThis\b/, 'global'],
  [/\bfetch\s*\(/, 'IO'],
  [/\bDate\.now\s*\(/, 'nondeterminism'],
  [/\bnew\s+Date\b/, 'nondeterminism'],
  [/\bMath\.random\s*\(/, 'nondeterminism'],
  [/\bperformance\.now\s*\(/, 'nondeterminism'],
  [/\bsetTimeout\s*\(/, 'timer'],
  [/\bsetInterval\s*\(/, 'timer'],
  [/\brequestAnimationFrame\b/, 'render'],
  [/import[^\n]*['"][^'"]*\/(ui|app|save|data)\//, 'import-out-of-core'],
  [/import[^\n]*['"][^'"]*\/vendor\//, 'import-vendor'],
  [/localStorage|indexedDB/, 'IO'],
];

/**
 * Recursively walk a directory and collect files matching filter.
 * @param {string} dir
 * @param {(name: string) => boolean} filter
 * @returns {string[]}
 */
function walk(dir, filter) {
  /** @type {string[]} */
  const results = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...walk(full, filter));
    } else if (filter(entry)) {
      results.push(full);
    }
  }
  return results;
}

const coreDir = new URL('../src/core', import.meta.url).pathname;
const files = walk(coreDir, (name) => name.endsWith('.js'));

/** @type {Array<{file:string, line:number, label:string, text:string}>} */
const violations = [];

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('// gate-allow')) continue;
    for (const [rx, label] of PATTERNS) {
      if (rx.test(line)) {
        violations.push({ file, line: i + 1, label, text: line.trim() });
      }
    }
  }
}

if (violations.length > 0) {
  for (const v of violations) {
    console.error(`${v.file}:${v.line}: ${v.label} — ${v.text}`);
  }
  console.error(`\ncore import gate FAILED (${violations.length} violation(s))`);
  process.exit(1);
} else {
  console.log(`core import gate OK (${files.length} file(s) checked)`);
  process.exit(0);
}
