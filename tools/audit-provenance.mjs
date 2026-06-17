#!/usr/bin/env node
/**
 * tools/audit-provenance.mjs — iter-021 T3 R-G gate (repeatable, deterministic).
 *
 * Two checks over the data catalogs in src/data/*.json:
 *
 *  (A) PROVENANCE FLAG: every catalog carries a `_meta.provenance` flag drawn from the
 *      allowed vocabulary. Catalogs that ship user-facing TEXT (prose the player reads —
 *      story / dialogues / tutorials / achievements) MUST be flagged `own` or
 *      `original-paraphrased` (never raw `verbatim`/`extracted` for prose). Numeric/fact
 *      catalogs may carry `extracted` / `derived` / `approximated` / `calibrated` /
 *      `data-fact` (numbers & mechanics are facts → not subject to R-G).
 *
 *  (B) VERBATIM SCAN: every player-facing string in the TEXT catalogs is normalised
 *      (lowercase, collapsed whitespace, stripped punctuation) and checked NOT to occur
 *      verbatim inside any file under doc/original_source/**. A verbatim match would mean
 *      copied wording (R-G violation). Short tokens are skipped (too generic to be evidence).
 *
 * Numbers / balance / IDs are facts and are intentionally NOT scanned (faithful rebuild).
 *
 * Zero runtime deps (node:fs only). Exit 0 = PASS, exit 1 = findings.
 * Usage: node tools/audit-provenance.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');
const ORIG_DIR = join(ROOT, 'doc', 'original_source');

/** Allowed provenance vocabulary (design_iter-021_T-001 §3.2). */
const ALLOWED_PROVENANCE = [
  'own',
  'original-paraphrased',
  'data-fact',
  'extracted',
  'derived',
  'approximated',
  'calibrated',
  'missing',
];

/** Catalogs that ship player-facing PROSE → must be own/original-paraphrased + verbatim-scanned. */
const TEXT_CATALOGS = new Set(['story', 'dialogues', 'tutorials', 'achievements']);
const PROSE_PROVENANCE = new Set(['own', 'original-paraphrased']);

/** Min normalised length for a string to count as verbatim evidence (skip generic short tokens). */
const MIN_SCAN_LEN = 20;

/** Field keys that are metadata/source notes, not player-facing prose — excluded from scan. */
const META_KEYS = new Set(['source', 'note', 'notes', 'gap', 'designRef', 'provenance', 'id', 'kind', 'effect', 'type', 'speakerId', 'next', 'anchor', 'trigger']);

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  /** @type {string[]} */
  const out = [];
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

/** Normalise a string for verbatim comparison. @param {string} s */
function norm(s) {
  return s
    .toLowerCase()
    .replace(/[̀-ͯ]/g, '') // strip combining marks (diacritics already lowercased)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Collect player-facing prose strings from a parsed catalog. @param {unknown} node @param {string} key @param {string[]} acc */
function collectStrings(node, key, acc) {
  if (typeof node === 'string') {
    if (!META_KEYS.has(key) && node.length >= 12) acc.push(node);
    return;
  }
  if (Array.isArray(node)) {
    for (const v of node) collectStrings(v, key, acc);
    return;
  }
  if (node && typeof node === 'object') {
    if (key === '_meta') return; // never scan the meta block itself
    for (const [k, v] of Object.entries(node)) collectStrings(v, k, acc);
  }
}

// ── Load original-source corpus (normalised, concatenated) ───────────────────
const origFiles = walk(ORIG_DIR);
let corpus = '';
for (const f of origFiles) {
  try { corpus += '\n' + norm(readFileSync(f, 'utf8')); } catch { /* skip binary/unreadable */ }
}

/** @type {string[]} */
const findings = [];
let scannedStrings = 0;

const dataFiles = readdirSync(DATA_DIR)
  .filter((f) => f.endsWith('.json') && f !== 'gap-report.json')
  .sort();

for (const file of dataFiles) {
  const name = file.replace(/\.json$/, '');
  /** @type {any} */
  let json;
  try { json = JSON.parse(readFileSync(join(DATA_DIR, file), 'utf8')); }
  catch (err) { findings.push(`${file}: unparseable JSON (${/** @type {Error} */ (err).message})`); continue; }

  // (A) provenance flag present + valid
  const meta = json && json._meta;
  if (!meta || typeof meta !== 'object') {
    findings.push(`${file}: missing _meta block`);
    continue;
  }
  const prov = typeof meta.provenance === 'string' ? meta.provenance : '';
  // A provenance may be compound, e.g. "derived (existing 4 buildings) / approximated (new
  // fields)". The parenthetical text is a human scope note, not a provenance term — strip
  // it, then split the remainder on whitespace/slash and require EVERY token to be allowed.
  /** @type {string[]} */
  const tokens = prov.replace(/\([^)]*\)/g, ' ').split(/[\s/]+/).filter(Boolean);
  const unknown = tokens.filter((/** @type {string} */ t) => !ALLOWED_PROVENANCE.includes(t));
  if (!prov) {
    findings.push(`${file}: _meta.provenance missing`);
  } else if (unknown.length) {
    findings.push(`${file}: _meta.provenance has unknown term(s): ${unknown.join(', ')} (allowed: ${ALLOWED_PROVENANCE.join('/')})`);
  }
  if (/verbatim/i.test(prov)) {
    findings.push(`${file}: _meta.provenance marked "verbatim" — copied wording is an R-G violation`);
  }

  // (B) text catalogs: prose must be own/original-paraphrased + verbatim scan
  if (TEXT_CATALOGS.has(name)) {
    const baseTokens = tokens.length ? tokens : [''];
    if (!baseTokens.every((/** @type {string} */ t) => PROSE_PROVENANCE.has(t))) {
      findings.push(`${file}: text catalog must be provenance ∈ {own, original-paraphrased}, got "${prov}"`);
    }
    /** @type {string[]} */
    const strings = [];
    collectStrings(json, name, strings);
    for (const s of strings) {
      const n = norm(s);
      if (n.length < MIN_SCAN_LEN) continue;
      scannedStrings++;
      if (corpus.includes(n)) {
        findings.push(`${file}: VERBATIM match in original source: "${s.slice(0, 60)}${s.length > 60 ? '…' : ''}"`);
      }
    }
  }
}

// ── Report ───────────────────────────────────────────────────────────────────
if (findings.length) {
  console.error(`audit-provenance: ${findings.length} finding(s):`);
  for (const f of findings) console.error('  - ' + f);
  process.exit(1);
}
console.log(
  `audit-provenance: PASS — ${dataFiles.length} catalogs flagged; ` +
  `${scannedStrings} prose string(s) scanned vs ${origFiles.length} original-source files; 0 verbatim matches.`,
);
process.exit(0);
