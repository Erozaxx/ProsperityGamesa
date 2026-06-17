# PROVENANCE — Prosperity (rebuild)

This document records the provenance of the assets in this repository: what is a
faithful re-implementation of *facts/mechanics* (numbers, formulas, structure — not
copyrightable), what is **own / paraphrased** content (wording, names, graphics — handled
for rights/originality, "R-G"), and what is intentionally **not distributed**.

> **Scope rule (R-G):** numbers, balance values, formulas and system structure are *facts*
> and are **not** subject to R-G — reproducing them 1:1 is the whole point of a *faithful
> rebuild*. Wording, lore, character/faction names, story and graphics **are** subject to
> R-G and are own or paraphrased, never copied verbatim.

---

## 1. Relationship to the original

- **Original:** *Prosperity* (browser economy/idle game, community version **0.9.5**). The
  original AngularJS source dump used as a reference lives under `doc/original_source/**`.
- **This project:** an **independent re-implementation** ("faithful rebuild") of the
  original's *mechanics* as a no-build, offline-first PWA (headless ES-module core + Preact
  UI). It is an **unofficial fan reimplementation**, not affiliated with or endorsed by the
  authors of the original.
- Mechanics, balance numbers and system structure are reproduced faithfully; all
  player-facing wording, names and graphics are produced fresh for this project.

## 2. Taken as facts / mechanics (NOT subject to copyright)

These are reproduced as-is from the original because they are facts, not authored content:

| Category | Examples | R-G? | Rule |
|---|---|---|---|
| Numbers / balance | prices, scaling (`100×1.25^level`), army upkeep/thresholds, spoilage rates | **No** | Facts — copied faithfully |
| Formulas | production, market pricing, battle resolution, season/food curves | **No** | Idea/process — not protected |
| Structure / mechanics | tick order, scheduler, system decomposition, catalog model | **No** | Reimplemented independently |
| IDs / keys | catalog item ids, job/skill/zone ids | **No** | Functional identifiers |

- Source of facts: `doc/original_source_doc.md` + extraction artifacts under
  `doc/original_source/extracted/**`.
- In `src/data/*.json` these carry `_meta.provenance ∈ {extracted, derived, approximated,
  calibrated, data-fact}` — see §5.

## 3. Own / paraphrased content (R-G handled)

| Category | Where | Provenance flag |
|---|---|---|
| Story / dialogue / tutorial prose | `src/data/story.json`, `dialogues.json`, `tutorials.json` | `original-paraphrased` |
| Achievement names & descriptions | `src/data/achievements.json` (numeric thresholds = facts) | `original-paraphrased` |
| UI text (labels, buttons, banners) | `src/ui/**` | own |
| Graphics / icons | `icons/icon.svg` | own (placeholder) |

- All player-facing prose in the text catalogs is **own or paraphrased** Czech wording; the
  original's English wording is **not** copied. Verified by the automated verbatim scan (§5).
- World/zone place names in `src/data/zones.json` are carried over as factual map data
  (`provenance: approximated`, reconstructed from the original world structure); they are
  treated as data labels, not authored prose.

## 4. Not distributed (reference-only)

- `doc/original_source/**` — the original source dump. **Reference material for the rebuild
  only**; it is **not** part of the release build and is **not** in the precache.
  - `tools/gen-precache.mjs` excludes `\.md$` and roots only `src/`, `icons/`, `index.html`,
    `manifest.webmanifest` → `doc/`, `tools/` and the `.md` docs never reach the cache.
- `doc/`, `docs/`, `test/`, `tools/`, `.aiworkflow/` — development material, not shipped.

## 5. Evidence / audit

Run the repeatable gate:

```bash
node tools/audit-provenance.mjs
```

It verifies, over every `src/data/*.json`:

1. **Provenance flag present & valid** — each catalog has `_meta.provenance` drawn from the
   allowed vocabulary `{own, original-paraphrased, data-fact, extracted, derived,
   approximated, calibrated, missing}`; never `verbatim`.
2. **Text catalogs are own/paraphrased** — `story`, `dialogues`, `tutorials`, `achievements`
   must be `original-paraphrased` (or `own`).
3. **No verbatim wording** — every player-facing prose string is normalised and checked not
   to appear verbatim anywhere under `doc/original_source/**`.

**Last result:** PASS — 20 catalogs flagged, prose strings scanned vs the original-source
corpus, **0 verbatim matches** (consistent with the M8 ad-hoc scan, now an automated gate).

## 6. Licence (DECIDED — user gate T-008)

> **Decision made by the user (legal owner) at user gate T-008 (iter-021 / M9b):
> GPL-3.0 + fan disclaimer.** The repo ships the full `LICENSE` (GNU GPL v3) and a `NOTICE`
> with the fan-reimplementation disclaimer.

**Chosen licence: GPL-3.0-or-later** (copyleft) on the own code. Derivatives must stay
open-source under the same terms. The full licence text is in [`LICENSE`](LICENSE); the
copyright + fan disclaimer is in [`NOTICE`](NOTICE).

**Fan disclaimer (ships in `NOTICE`):** ProsperityGamesa is an unofficial, independent fan
reimplementation of the mechanics of the game *Prosperity* (v0.9.5), not affiliated with or
endorsed by the original authors. No protected content is copied verbatim.

**Safeguards satisfied before publishing:**
1. Verbatim scan = 0 (`tools/audit-provenance.mjs`, §5).
2. Own / paraphrased assets confirmed (§3); facts/mechanics treated as non-copyrightable (§2).
3. Disclaimer present (`NOTICE`).
4. Original source material (`doc/original_source/**`) is reference-only and **not distributed**
   (excluded from the PWA precache manifest, §4).

> Considered and not chosen: MIT/Apache-2.0 (permissive — rejected in favour of copyleft so
> derivatives stay open); proprietary / do-not-publish (rejected — defeats public playability).
