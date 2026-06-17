# Impl Summary — T-005 (iter-021 M9b) — C-021-B Licence/PROVENANCE + Release docs

- **Task**: T-005 = C-021-B (T3 licence/PROVENANCE čistka + T4 release dokumentace)
- **Agent**: coder (Sonnet)
- **Date**: 2026-06-17
- **Status**: done
- **Sources of truth**: `design_iter-021_T-001.md` §3 (T3) / §4 (T4) / §7 (DR notes), `DR-021-01` (MINOR-3 G1 gate)

## Soubor : funkce (co se změnilo)

| Soubor | Druh | Obsah |
|---|---|---|
| `PROVENANCE.md` | NOVÝ (root) | §1 vztah k originálu (Prosperity v0.9.5, unofficial fan reimplementace), §2 fakta/mechaniky NEpodléhají R-G (tabulka kategorií), §3 vlastní/parafráze (text katalogy `original-paraphrased`, UI/ikony `own`), §4 nedistribuováno (`doc/original_source/**` mimo precache + release), §5 evidence/audit (audit-provenance výsledek), **§6 licence = PLACEHOLDER + doporučení** (A: MIT preferováno / B: GPL-3.0 / C: proprietární; safeguard disclaimer) → **user gate T-008**, žádný `LICENSE` soubor |
| `tools/audit-provenance.mjs` | NOVÝ | Opakovatelný R-G gate, zero deps. (A) každý `src/data/*.json` má `_meta.provenance` ∈ allowed vocab `{own, original-paraphrased, data-fact, extracted, derived, approximated, calibrated, missing}`, nikdy `verbatim`; text katalogy (story/dialogues/tutorials/achievements) musí být own/original-paraphrased. (B) verbatim sken: každý player-facing prose string normalizovaný (lowercase, collapse ws, strip punctuation) NEsmí být v korpusu `doc/original_source/**`. Compound provenance (`derived (...) / approximated (...)`) tolerován — parser stripuje parenthetical scope notes. Exit 0 = PASS, exit 1 = nález. |
| `src/data/contracts.json` | `_meta` only | `provenance` → kanonický `"derived"`; qualifier prose přesunut do `notes`. Herní data NEDOTČENA. |
| `src/data/buildings.json` | `_meta` only (linter revert) | Top-level `provenance` zůstal compound `"derived (...) / approximated (...)"` — audit ho akceptuje (parser strips parenthetical, kanonické tokeny `derived`/`approximated` validní). Herní data NEDOTČENA. |
| `README.md` | PŘEPSÁN | Nahradil zastaralý tap-to-earn skelet: věrný rebuild Prosperity v0.9.5 offline-first PWA, jak hrát (paced builder smyčka), install iOS/Android PWA, run lokálně, save/offline + **export/import návod** (clipboard export, prompt import, varování přepisu, backup/transfer/recovery), struktura (core/ui/save/data/app), odkazy PROVENANCE + KNOWN_ISSUES, dev příkazy. |
| `KNOWN_ISSUES.md` | NOVÝ | Carry-over gapy 1 řádek + dopad: accounting (G-BUILD-TXAUDIT, G-RECRUIT-TXAUDIT), world/AI (G-WORLD-PERSIST-DERIVED, G-AIBATTLE-DEDUP, G-LISTZONE), military (G-MILITARY-STATS, MIN-1), contracts (G-CONTRACTS-CATALOG, G-CONTRACT-GEN, G-CONTRACT-SCHED-CLEANUP), balance/kalibrace (D-CHEESE-SPOILAGE, G-SKILL-COMPENSATION, G-JOB-MAXSTEP, G-LIST* díry), data díry, by-design/deferred (MINOR-1/2, V1 tech→joby, V2 univ RNG, achievements onUnlock:[]). Žádný blocker. Odkaz na `gap-report.json` (36 gapů). |

## Gate (DoD) — VŠE ZELENÉ

- `npm run ci`: **1566 testů, 0 fail** (typecheck + lint:core + node:test).
- `npm run smoke`: **OK** (0 console errors, 0 horizontal overflow @320/360/390 napříč 12 taby).
- `node tools/audit-provenance.mjs`: **PASS** — 20 katalogů flagged, 43 prose strings scanned vs 74 original-source souborů, **0 verbatim shod**.
- README: **0** starých skeleton termů (grep Pracovat/investice/12 h/localStorage/tap-to-earn = 0).
- `LICENSE` soubor: **NEEXISTUJE** (user gate zachován).
- precache.js: **NEREGENEROVÁN** (vrácen do commitnutého stavu — orchestrátor regeneruje JEDNOU po A+B).

## PROVENANCE — shrnutí klasifikace (R-G)

- **Fakta/mechaniky** (čísla, vzorce, struktura, IDs): NEpodléhají R-G, přebráno věrně 1:1 → `extracted`/`derived`/`approximated`/`calibrated`.
- **Vlastní/parafráze** (story/dialog/tutorial prose, achievement names/desc, UI texty, ikony): podléhají R-G → `original-paraphrased`/`own`, verbatim sken = 0 (nově automatizovaný gate, dříve M8 ad-hoc).
- **Zone place names** (`zones.json`): faktická mapová data (`approximated`), label, ne autorská prosa.
- **Nedistribuováno**: `doc/original_source/**` mimo precache (gen-precache EXCLUDE `\.md$` + ROOTS jen `src/`/`icons`/`index.html`/`manifest`).

## Licence placeholder (USER GATE T-008)

PROVENANCE.md §6 = explicitní PLACEHOLDER. Doporučení: **A MIT** (+ disclaimer/NOTICE, preferováno — permisivní, no-build/git friendly), alt **B GPL-3.0** (copyleft), alt **C proprietární/nevydat**. Společná pojistka: veřejné vydání až po (1) verbatim sken=0 [hotovo], (2) vlastní assety potvrzené, (3) disclaimer „neoficiální fan reimplementace". **Finální volba = rozhodnutí uživatele (právní/nevratné).** Žádný `LICENSE` soubor commitnut.

## Determinismus G1 po `_meta` (MINOR-3) — KRITICKÉ, splněno

`_meta.provenance` žije na **katalozích** (loader → separátní module-level `_store` registry); `hashState` (rng.js:69) hashuje JEN persist payload přes allowlist (`persistSchema.js applyPersist`). `_meta` NENÍ v allowlistu, NEvstupuje do herního stavu → nemůže se dostat do `hashState`.

**Důkaz:** `test/m9a-regression.test.js` versioned **golden-hash checkpointy** (Q1–Q4, seed A 0xa1 + seed B 0xb2) — baked proti iter-020 — procházejí **beze změny** s `_meta` edity in place; + `test/rng.test.js` hashState round-trip ZELENÝ. Golden hashe identické ⇒ `hashState` před/po `_meta` IDENTICKÝ. MINOR-3 splněno, `_meta` neproniklo do stavu.

## Scope dodržen

NEDOTČENO: src/core/**, engine, balance, render.js/styles.css/service-worker.js/sw-register.js/persist.js/App.js/main.js/index.html (T-004), herní DATA (čísla/ID/struktura). Změny jen `_meta` + docs + audit tool. precache NEREGENEROVÁN. Žádný LICENSE.
