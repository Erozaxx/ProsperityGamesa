#!/usr/bin/env node
/**
 * tools/audit-touch-targets.mjs — iter-021 T1 UX-1 gate (repeatable, deterministic).
 *
 * Static CSS audit: every rule whose selector targets an interactive control
 * (`button`, `[role=tab]`, `.tab-btn`) must declare an adequate touch target —
 * either a `min-height`/`min-block-size` ≥ 44px, OR sufficient vertical padding
 * (padding-y * 2 + a ~1rem line-box ≥ 44px). A global `button { min-block-size:44px }`
 * base rule satisfies all plain `button` selectors that only restyle padding/colors.
 *
 * Zero deps (node:fs only). Exit 0 = PASS (0 findings), exit 1 = under-sized targets.
 * Usage: node tools/audit-touch-targets.mjs [path/to/styles.css]
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cssPath = process.argv[2]
  ? resolve(process.argv[2])
  : join(__dirname, '..', 'src', 'ui', 'styles.css');

const MIN_PX = 44;
const REM_PX = 16; // assume 1rem = 16px for the static estimate

/** @param {string} v @returns {number} px (NaN if not convertible) */
function toPx(v) {
  v = v.trim();
  let m = v.match(/^([\d.]+)px$/);
  if (m) return parseFloat(m[1]);
  m = v.match(/^([\d.]+)rem$/);
  if (m) return parseFloat(m[1]) * REM_PX;
  m = v.match(/^([\d.]+)em$/);
  if (m) return parseFloat(m[1]) * REM_PX;
  return NaN;
}

/** Does a selector target an interactive control we must size? @param {string} sel */
function isInteractive(sel) {
  // ignore @media / keyframe headers etc.
  if (sel.startsWith('@') || sel.includes('%')) return false;
  return /(^|\s|,|>|\.|#|:)button(\b|:|\.|,|\s|$)/.test(sel)
    || /\[role=["']?tab["']?\]/.test(sel)
    || /\.tab-btn\b/.test(sel);
}

const css = readFileSync(cssPath, 'utf8')
  // strip comments
  .replace(/\/\*[\s\S]*?\*\//g, '');

// crude but sufficient rule splitter: "selector { decls }"
const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
/** @type {{selector:string, decls:Record<string,string>}[]} */
const rules = [];
let m;
while ((m = ruleRe.exec(css))) {
  const selector = m[1].trim();
  if (!selector || selector.startsWith('@')) continue;
  /** @type {Record<string,string>} */
  const decls = {};
  for (const d of m[2].split(';')) {
    const idx = d.indexOf(':');
    if (idx < 0) continue;
    decls[d.slice(0, idx).trim().toLowerCase()] = d.slice(idx + 1).trim();
  }
  rules.push({ selector, decls });
}

/** Is there a global base rule giving plain `button` a ≥44px min target?
 * @returns {boolean} */
function hasGlobalButtonBase() {
  return rules.some((r) => {
    if (r.selector !== 'button') return false;
    const mh = r.decls['min-height'] ?? r.decls['min-block-size'];
    return mh != null && toPx(mh) >= MIN_PX;
  });
}

/** @param {Record<string,string>} decls */
function ruleSatisfies(decls) {
  const mh = decls['min-height'] ?? decls['min-block-size'];
  if (mh != null && toPx(mh) >= MIN_PX) return true;
  const h = decls['height'] ?? decls['block-size'];
  if (h != null && toPx(h) >= MIN_PX) return true;
  // padding-based estimate: top+bottom padding + ~1rem line box
  let py = NaN;
  if (decls['padding'] != null) {
    const parts = decls['padding'].split(/\s+/).map(toPx);
    // shorthand: 1=all, 2=v/h, 3=t/h/b, 4=t/r/b/l → vertical = first value
    py = parts[0];
  }
  if (decls['padding-top'] != null) py = toPx(decls['padding-top']);
  if (!Number.isNaN(py)) {
    if (py * 2 + REM_PX >= MIN_PX) return true;
  }
  return false;
}

const globalBase = hasGlobalButtonBase();
/** @type {string[]} */
const findings = [];

/** Does this rule establish or constrain the box (so its tap size is its own responsibility)?
 * @param {Record<string,string>} decls */
function affectsBox(decls) {
  return ['min-height', 'min-block-size', 'height', 'block-size', 'padding', 'padding-top']
    .some((k) => k in decls);
}

for (const r of rules) {
  // Restyle-only rules (color/background/border, :hover, etc.) don't set the box → skip;
  // the box size is owned by the base rule for that selector and the global button base.
  if (!affectsBox(r.decls)) continue;
  for (const sel of r.selector.split(',').map((s) => s.trim())) {
    if (!isInteractive(sel)) continue;
    // A bare `button` selector that relies on the global base is fine.
    if (globalBase && /button/.test(sel)) {
      // It inherits the 44px base unless it explicitly shrinks the box (height < 44).
      const h = r.decls['height'] ?? r.decls['block-size'];
      const mh = r.decls['min-height'] ?? r.decls['min-block-size'];
      if (h != null && toPx(h) < MIN_PX && (mh == null || toPx(mh) < MIN_PX)) {
        findings.push(`${sel} { height:${h} } shrinks below ${MIN_PX}px`);
      }
      continue;
    }
    if (!ruleSatisfies(r.decls)) {
      findings.push(`${sel} — no min-height/padding guaranteeing ${MIN_PX}px tap target`);
    }
  }
}

if (!globalBase && !rules.some((r) => /button/.test(r.selector))) {
  // nothing to check
}

if (findings.length) {
  console.error(`audit-touch-targets: ${findings.length} under-sized interactive target(s):`);
  for (const f of findings) console.error('  - ' + f);
  process.exit(1);
}
console.log(`audit-touch-targets: PASS — all interactive selectors meet ${MIN_PX}px (global button base: ${globalBase}).`);
process.exit(0);
