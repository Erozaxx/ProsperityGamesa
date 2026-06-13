# Vendor provenance

| Module | Package | Version | Source | Licence |
|---|---|---|---|---|
| preact.module.js | preact | 10.29.2 | node_modules/preact/dist/preact.module.js | MIT |
| hooks.module.js | preact (hooks) | 10.29.2 | node_modules/preact/hooks/dist/hooks.module.js | MIT |
| htm.module.js | htm | 3.1.1 | node_modules/htm/dist/htm.module.js | Apache-2.0 |

## How to upgrade
1. Update devDependencies version in package.json
2. npm install
3. Copy updated dist files here (same filenames)
4. Update version column above
5. Run node tools/gen-precache.mjs to refresh precache

## Notes
- Zero-build runtime: these files are loaded directly as ES modules by the browser.
- htm replaces JSX (no build step needed, §2.1 architecture).
- preact.standalone.js is the single import point for UI layer.
