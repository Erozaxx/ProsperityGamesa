# Prosperity (rebuild)

A **faithful offline rebuild** of the economy/idle game **Prosperity v0.9.5**, as a
mobile-first **PWA**. Runs in the browser, installs to your phone's home screen, and works
fully offline after the first load.

> **Unofficial fan reimplementation.** This is an independent re-implementation of the
> original's *mechanics* (a "faithful rebuild"); it is not affiliated with or endorsed by
> the authors of the original. See [PROVENANCE.md](./PROVENANCE.md).

## What it is

A deterministic city/economy simulation: you grow a settlement from nothing — managing
**time and seasons**, **population and food**, **production and jobs**, a **market**,
**research/tech**, **buildings**, the **world map with factions and battles**, and a
branching **story**. The simulation runs headless in a pure ES-module core; the UI only
renders snapshots. There is **no** "tap to earn" — it is a paced builder, not a clicker.

## How to play

1. **Time & seasons** advance automatically; speed is adjustable. The world keeps simulating.
2. **Population** grows when housed and fed — keep **food** production ahead of demand.
3. Assign workers to **jobs** to produce resources; build and upgrade **buildings**.
4. Trade goods on the **market**; spend **tech points** on **research** to unlock improvements.
5. Explore the **world map**: zones, factions, quests and **battles**.
6. Follow the **story** events as your settlement progresses.

Progress autosaves continuously to the browser (IndexedDB), and time spent away is credited
as **offline progress** when you return.

## Install (PWA)

- **iOS (Safari):** Share → **Add to Home Screen**.
- **Android (Chrome):** menu → **Install app** (or the install prompt).

> The **first launch requires a network connection** (to precache assets). After that the
> app runs **fully offline**. When a new version is available you'll see an **"Update"**
> prompt — your save is written before the reload, so it is never lost.

## Run locally

The app is static, but ES modules and the service worker require an HTTP server (not
`file://`):

```bash
python3 -m http.server 8000      # Python, no install
# or
npx serve .                      # Node
```

Then open <http://localhost:8000>.

## Save, offline & backup (export / import)

- **Autosave:** the game persists to **IndexedDB** with rotating save generations; offline
  time is credited on return.
- **Export:** the **Export** button copies a single save string (a compressed envelope with
  your full progress, including offline timing) to the clipboard. Paste it somewhere safe.
- **Import:** the **Import** button asks for a save string and restores it.
  ⚠️ **Import overwrites your current progress.**
- Use export/import to **back up** your save or **move it between devices** — this is also
  the recovery path if browser storage is ever evicted (the app reminds you to back up if
  storage is non-persistent or it's been a while since your last export).

## Project structure

```
.
├── index.html              # App shell
├── manifest.webmanifest    # PWA manifest
├── service-worker.js       # Offline cache + update-ready flow
├── icons/icon.svg          # App icon (own placeholder)
└── src/
    ├── core/               # Headless, deterministic simulation engine (no DOM)
    ├── ui/                 # Preact UI — renders snapshots of core state
    ├── save/              # Persist schema, IndexedDB store, export/import
    ├── data/              # JSON catalogs (jobs, buildings, techs, story, …)
    └── app/               # Wiring: loop, autosave, PWA registration, lifecycle
```

The core is **deterministic** (seeded RNG, no `Date.now`/`Math.random` in core); the same
seed and inputs always produce the same state hash. UI/PWA/storage live outside the core.

## Known limitations

See [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) for carry-over gaps and conscious deviations (none
is a release blocker).

## Licence & provenance

Licensed under **GPL-3.0-or-later** — see [`LICENSE`](./LICENSE). ProsperityGamesa is an
**unofficial fan reimplementation** of the mechanics of *Prosperity* (v0.9.5), not affiliated
with the original authors — see [`NOTICE`](./NOTICE).

See [PROVENANCE.md](./PROVENANCE.md) for what is faithful re-implementation of facts (numbers,
formulas, mechanics — not copyrightable) vs. own/paraphrased content, with a repeatable
verbatim-scan audit (0 matches).

## Development

```bash
npm run ci      # typecheck + core import lint + node:test suite
npm run smoke   # headless boot/render smoke (Playwright)
node tools/audit-provenance.mjs       # R-G provenance gate
node tools/audit-touch-targets.mjs    # touch-target gate
```
