# Current Task
- **Task ID**: T-005 (iter-021 M9b — C-021-B Licence/PROVENANCE + Release dokumentace)
- **Iteration**: iter-021
- **Status**: done
- **Done**: 2026-06-17
- **Gate**: CI 1566/1566 pass (0 fail, typecheck + lint:core OK). smoke OK (0 console errors, 0 horizontal overflow @320/360/390 napříč 12 taby). audit-provenance.mjs PASS (20 katalogů flag, 43 prose strings vs 74 original-source souborů, 0 verbatim shod). Determinismus G1 NEDOTČEN — m9a-regression golden-hash checkpointy (Q1–Q4, seed A/B) + RNG round-trip ZELENÉ; `_meta` žije na katalozích (separátní `_store`), MIMO persist allowlist → hashState identický (MINOR-3 splněno). LICENCE = žádný LICENSE soubor (user gate T-008); PROVENANCE.md §6 = placeholder + doporučení MIT+disclaimer. precache.js NEREGENEROVÁN (vrácen do commitnutého stavu — orchestrátor regeneruje JEDNOU po T-004+T-005).

## Dílčí checklist
- [x] T3.1 PROVENANCE.md (root): §1 vztah k originálu, §2 fakta/mechaniky (NEpodléhá R-G), §3 vlastní/parafráze, §4 nedistribuováno (doc/original_source mimo precache), §5 evidence/audit, §6 licence PLACEHOLDER + doporučení (MIT preferováno / GPL-3.0 / proprietární)
- [x] T3.2 _meta.provenance ujednocen: contracts.json `derived` (qualifier prose → notes); buildings.json compound string tolerován auditem (parser strips parenthetical). NEMĚNĚNA herní data (jen _meta).
- [x] T3.3 tools/audit-provenance.mjs (NOVÝ): gate — (A) každý katalog má _meta.provenance ∈ allowed vocab, text katalogy own/original-paraphrased; (B) verbatim sken prose vs doc/original_source/** = 0. Exit≠0 při nálezu.
- [x] T4.1 README.md PŘEPSÁN: věrný rebuild Prosperity v0.9.5 offline-first PWA, jak hrát (smyčka), install iOS/Android, run lokálně, save/offline + export/import návod, struktura, odkazy PROVENANCE/KNOWN_ISSUES. 0 starých skeleton termů (Pracovat/investice/12 h/localStorage/tap-to-earn).
- [x] T4.2 KNOWN_ISSUES.md (NOVÝ): carry-over gapy (G-BUILD/RECRUIT-TXAUDIT, G-WORLD-PERSIST-DERIVED, G-AIBATTLE-DEDUP, G-MILITARY-STATS, MIN-1, contracts, balance/kalibrace, data díry, by-design/deferred V1/V2/MINOR-1/2/achievements onUnlock) — každý ID+severity+dopad, žádný blocker.
- [x] T4.3 Export/import návod (sekce v README).
- [x] Gate: npm run ci ZELENÉ (1566), npm run smoke OK, audit-provenance PASS, determinismus G1 nedotčen (MINOR-3), žádný LICENSE soubor, precache NEREGENEROVÁN.
