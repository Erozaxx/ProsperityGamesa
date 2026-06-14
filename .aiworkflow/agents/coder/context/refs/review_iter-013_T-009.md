# Review Gate M5-1 — iter-013 T-009 (Reviewer, Opus)

- **Review ID**: REVIEW-013-009
- **Iterace**: iter-013 (M5-1: budovy / builder / companies / modifikátory K13)
- **Reviewer**: reviewer (Opus)
- **Datum**: 2026-06-14
- **Vstupy**: brief BRIEF-013-009, design `design_iter-013_T-001.md` (§4.1–4.8, T-002a), QA report T-008, architektura iter-002 (K13/§5.3/§6.3/§7.1), DR-013-01
- **Rozsah**: `git diff 2e71c94..HEAD -- src/ tools/ test/m5-buildings-*.test.js` (24 souborů, +4211)
- **Metoda**: revize proti KÓDU (ne tvrzení); ověření 5 tvrdých invariantů; `npm test` = 906/906 pass

---

## Verdikt

**GO — s podmínkami (minor/nit do backlogu; ŽÁDNÝ blocker, ŽÁDNÝ major → bez re-run)**

Všech 5 tvrdých invariantů platí proti kódu. Implementace je deterministická, persist je správně omezen na minimal (`catalogState.modifiers` + raw stav), re-derivace jde jedinou sdílenou cestou volanou ze všech 5 call-sites, fold je deterministický (sort by source,id), agregáty mají jednu cestu bez dvojího započtení. QA GO potvrzeno empiricky a souhlasí s mým code-readem.

Nálezy jsou výhradně **kvalita/maintainability/živé artefakty** — nemění chování ani neporušují invarianty → backlog, ne re-run. Dvě z nich (gap-report, tickOrder.md T4 sekce) jsou **podmínky** ke splnění před uzávěrem iterace (živé artefakty / N-04 + provenance governance), nejsou ale blockerem hratelnosti ani correctness.

**Počet nálezů: 0 blocker · 0 major · 4 minor · 4 nit**

---

## Tvrdé invarianty — verifikace proti kódu

### Invariant 1 — Save = JEN derivovatelný minimal · **PLATÍ**
- `persistSchema.js:52-54`: `payload.catalogState = { modifiers: s.catalogState.modifiers ?? [] }` — `_effCache`/`_modVersion` vědomě vynechány.
- `home.derived` NENÍ v `applyPersist` (žádný blok ho nezapisuje, řádky 178-218 ukládají jen `buildings{created,totalMade,instances}`, `projectQueue`, `projectSeq`, `ownedCompanies`).
- `load.js:78-84`: catalogState se deep-klonuje a bere se JEN `modifiers` → po loadu `_effCache`/`_modVersion`/`derived` re-derivovány v Step 5. Round-trip identita ověřena QA (deepStrictEqual payload1==payload2) i kódovým čtením.
- `createHomeState.js:41-45` zakládá `derived` v živém stavu (ne-persist), což je konzistentní s `_effCache` (oba derivát v JSON.stringify pro hashState, ale obě cesty — fresh i load — je inicializují přes `rebuildBuildingDerived`).

### Invariant 2 — Sdílený `rebuildBuildingDerived` = jediná cesta, žádná load-only/mutation-only větev · **PLATÍ**
Ověřeno všech 5 call-sites:
1. `createInitialState.js:133` — fresh game ✓
2. `load.js:275` — load Step 5 ✓ (po `applyPayload`, před `deriveWorkforceTotal`)
3. `buildings.js:701` — `completeBuild` ✓
4. `buildings.js:553` — `destroyInstance` ✓
5. `buildings.js:731` — `applyRepair` volá `recalcBuildingAggregates` (cílený delta — repair nemění created/modifiers; design §4.7 to explicitně povoluje jako "levný delta přes stejné helpery")
- `load.js` NEVOLÁ `recalcBuildingAggregates`/`addBuildingModifiers` přímo — jen přes `rebuildBuildingDerived` (M5-R1 grep splněn). Ověřeno: jediný import v load.js je `rebuildBuildingDerived` (load.js:11).
- `rebuildBuildingDerived` je idempotentní: `removeAllBuildingSourcedModifiers` + re-add (buildings.js:489-495).
- **Pozn. (ne nález)**: `buyCompany` NEvolá `rebuildBuildingDerived`. Je to korektní — kapacita firem (`companyBuildersTotal`/`companyMasonTotal`) se čte LIVE v `buildersProcess`, nejde přes modifier/derived vrstvu. Brief uvádí buyCompany jako mutaci, ale firmy nevstupují do `home.derived` → není potřeba re-derivace. Defenzivní odchylka, akceptováno.

### Invariant 3 — Deterministický fold (sort by source,id; set=poslední po sortu; add→mul→set) · **PLATÍ**
- `buildings.js:48-52` `cmpModifier`: lexikograficky (source, pak id).
- `buildings.js:64-87` `fold`: `mods.slice().sort(cmpModifier)`, pak add (Σ) → mul (×) → set (poslední po sortu vyhrává, řádek 82-84). Komutativní add/mul + deterministicky vybraný set → nezávislé na insertion order.
- QA empiricky potvrdila 2× set srcB(9)+srcA(5) → obě řazení dají 9.

### Invariant 4 — JEDNA cesta agregátů (Σ effective bez ×created) · **PLATÍ**
- `buildings.js:387-432` `recalcBuildingAggregates`: `maxWorkers += val` kde `val = effective(buildingId, attr)` — NIKDE `× created` (multiplicita zapečena ve `value` modifikátoru přes `addBuildingModifiers`, buildings.js:316-317 `value = atom.value * created` pro op add).
- QA: well×3 → effective=15 = aggregate (NE 45). Bez dvojího započtení.

### Invariant 5 — Žádné in-place mutace derivovaných; žádný Date.now/Math.random/DOM v core; catch-up-safe · **PLATÍ**
- `grep -nE 'Date\.now|Math\.random|document|window|localStorage'` v `buildings.js`/`build.js`/`buyCompany.js` → 0 ne-komentářových výskytů.
- RNG přes `makeRng(state,'buildings')` (buildings.js:612); `'buildings'` přidán do `STREAM_NAMES` (rng.js:9) na KONEC pole → nemění seed jiných streamů (zpětně kompat. determinismus G1 ✓).
- `instId = \`${buildingId}_${totalMade}\`` (buildings.js:691) a `proj_${projectSeq}` (buildings.js:533, build.js:130) — deterministické, žádné Date.getTime().
- `ageBuildings` na day-edge, `buildersProcess` na quarterDay → catch-up levné. QA: 365 dní bez crashe, hashState identický (h1=h2).
- Katalog se nemutuje: `effective`/`baseAttr` čtou `byId().entry` read-only; modifikátory jsou data v `catalogState.modifiers`.
- `buildersProcess` requeue-smyčka **terminuje**: requeued projekt se splice+push s `delay:0` (kopie), takže každý projekt vyvolá max 1 requeue/tick; activeSlot/qi konvergují k podmínce `while`. Ověřeno tracingem (buildings.js:805-864). Žádný nekonečný loop.

---

## Nálezy

### MINOR-1 — `gap-report.json` neaktualizován o M5-1 gapy `[soubor: src/data/gap-report.json]`
Brief AC §7 vyžaduje gapy `G-BUILD-TXAUDIT`, `G-BUILD-COSTSCALE`, `G-BUILDER-CAP/MASON`, `G-LISTBUILDINGS` v gap-reportu. V `src/data/gap-report.json` jsou jen `G-LISTBUILDINGS` a `G-POP-WORKFORCE`; chybí `G-BUILD-TXAUDIT`, `G-BUILD-COSTSCALE`, `G-BUILDER-CAP`, `G-BUILDER-MASON`, `G-BUILD-RESISTANCE`, `G-BUILD-SPACE`, `G-BUILD-UNLOCK`, `G-BUILD-MULSTACK`, `G-BUILD-TECHBONUS`, `G-REPAIR-RECYCLING`. Provenance per pole je v datech (`buildings.json` `_meta.gap/provenance:approximated`, `companies.json` `_meta.gap:G-BUILDER-CAP`) — chybí jen centrální registr.
**Návrh**: doplnit chybějící M5-1 gapy do `gap-report.json` s `provenance:'approximated'` a odkazem na design §. **Podmínka k uzávěru iterace** (governance gapů, ne blocker correctness).

### MINOR-2 — `tickOrder.md` T4 sekce je zastaralá (živý artefakt N-04) `[soubor: docs/tickOrder.md:128-131]`
Sekce "T4 (TODO - iter-013 M5-1 placeholder, T-007)" stále tvrdí `[NOT YET IMPLEMENTED]` / `[STUB in buildings.js]` a odkazuje na **neexistující** `src/core/catalog/effective.js` (ověřeno: soubor neexistuje; `effective` žije v `buildings.js`). T4 je přitom plně implementován (effective+fold+modifiers). Phase-tabulka a ASCII diagram (řádky 24, 38, 60-61) JSOU aktuální, jen prozaická T4 sekce zaostala.
**Návrh**: přepsat řádky 128-131 na "LIVE (T4)", opravit cestu na `src/core/systems/buildings.js`. **Podmínka k uzávěru** (N-04: živé artefakty aktuální ve stejné iteraci).

### MINOR-3 — Zavádějící komentář: kód volá `effectFromCatalog`, komentář tvrdí `effective()` `[soubor: src/core/systems/buildings.js:787-790]`
Komentář ř.787-789 říká "use effective() with modifier fold (replaces effectFromCatalog T2 workaround)" a "Modifier value = effectAtom.value * created (baked in)", ALE ř.790 reálně volá `effectFromCatalog('builderHut','maxActiveProjects')` a ř.791 násobí `× hutCreated`. To je správně numericky (`effectFromCatalog` čte per-instance value=1 z `effects[]`, ne modifier, takže `1 × created` NEní dvojí započtení), ale komentář popisuje jinou implementaci než kód.
**Návrh**: opravit komentář tak, aby odpovídal realitě (effectFromCatalog je trvalý helper pro NE-agregované effect attrs, viz MINOR-4), nebo skutečně přejít na `effective()` (vyžadovalo by top-level base pole nebo aggregaci — viz MINOR-4).

### MINOR-4 — `effectFromCatalog` (T2 workaround) NEnahrazen v T4, používán nekonzistentně `[soubor: src/core/commands/build.js:40,54; src/core/systems/buildings.js:790]`
Design (§4.5, T4.5, komentáře v kódu, impl-summary T-005/T-006) explicitně sliboval, že T4 modifier fold NAHRADÍ `effectFromCatalog`. Realita: `effectFromCatalog` zůstává v 3 call-sites pro `maxActiveProjects`/`maxProjectQueue`. **Důvod je legitimní**: tyto attr nemají top-level katalogové base pole (jen v `effects[]`), takže `baseAttr` vrací 0 a `effective()` by vrátil 0; navíc NEjsou agregovány do `home.derived` (jsou to per-buildingType kapacity čtené live). Takže `effectFromCatalog` NENÍ mrtvý kód — je to nutný helper. Problém je (a) design slíbil náhradu, která nebyla možná pro tyto attr, a (b) duplicitní logika: `build.js:getMaxActiveProjects` a `buildings.js:buildersProcess` počítají maxActiveProjects nezávisle (build.js bez masonProvided, buildersProcess s ním).
**Návrh**: ponechat `effectFromCatalog` jako vědomý helper (přejmenovat komentář na "permanent helper for non-aggregated effect attrs", ne "T2 workaround"). Zvážit extrakci `getMaxActiveProjects(state)` do `buildings.js` a sdílet mezi build.js a buildersProcess (DRY) — backlog, neblokuje.

### NIT-1 — Dvojí derivace `workforce.total` po loadu `[soubor: src/save/load.js:283-285 vs buildings.js:515-517]`
`rebuildBuildingDerived` (volaný load.js:275) už nastaví `workforce.total = deriveWorkforceTotal(state)` (buildings.js:515-517). Pak load.js:283-285 to počítá ZNOVU. Idempotentní a neškodné (stejný výsledek), ale redundantní.
**Návrh**: ponechat (pojistka proti budoucímu refaktoru `rebuildBuildingDerived`) NEBO odstranit jeden výpočet s komentářem. Nízká priorita.

### NIT-2 — Latentní dvojí započtení při duplicitním (attr,op) v jedné budově `[soubor: src/core/systems/buildings.js:312-335, 405-420]`
Pokud by budova měla DVĚ `add` atoms na stejný attr (např. dvakrát `workers`), `addBuildingModifiers` vygeneruje dva modifikátory se SHODNÝM `id` (`bld:${id}:${attr}:${op}`) a `recalcBuildingAggregates` zavolá `effective(attr)` dvakrát (jednou per atom) → dvojí započtení. Aktuální data (`buildings.json`) duplicitní (attr,op) nemají, takže netriggerováno. Latentní past pro budoucí data.
**Návrh**: buď deduplikovat atomy v `normalizeEffects` (sloučit stejné (attr,op) sečtením value), nebo v `recalcBuildingAggregates` iterovat unikátní attr (Set) místo per-atom. Backlog.

### NIT-3 — `build.js:getMaxActiveProjects` je definován, ale nepoužit `[soubor: src/core/commands/build.js:51-56]`
`getMaxActiveProjects` v build.js (ř.51-56) není v build commandu volán (build validuje jen `getMaxProjectQueue`, ř.101). maxActiveProjects se reálně řeší až v `buildersProcess`. Je to mrtvá funkce v build.js (export není, volání není).
**Návrh**: odstranit `getMaxActiveProjects` z build.js (mrtvý kód) — logika živá v buildersProcess. Backlog.

### NIT-4 — `cost:{}` u build projektu ztrácí audit kopii `[soubor: src/core/commands/build.js:143]`
Build projekt má `cost:{}` (prázdné) — vědomé per G-BUILD-TXAUDIT (audit kopie vynechána). Konzistentní s designem §2.1, ale znamená, že po save→load nelze rekonstruovat, kolik build stál (není potřeba pro chování, jen pro budoucí audit/refund). Vědomý gap.
**Návrh**: žádná akce v M5-1; při zavedení ctx/auditu v M5-2/M9 zvážit uložení audit kopie. Nit.

---

## Soulad s designem a architekturou

- **Design §4.1–4.7** věrně implementován: fold (add→mul→set, sort source/id), memoizace (`_effCache`/`_modVersion` ne-persist), mapování effects→modifier (per-typ, created ve value), jedna cesta agregátů, sdílený `rebuildBuildingDerived`, mutace přes sdílenou cestu.
- **Architektura iter-002 §5.3 (K13)**: `effective = base ⊕ fold(modifiers)`, immutable katalog, žádný `applyUpgrade` in-place, event-driven agregáty — vše dodrženo (arch ř.292-304).
- **Arch §6.3 persist allowlist**: deklarativní, derivát se neukládá — dodrženo.
- **DR-013-01 / M-1..M-4**: M-1 (jedna cesta) ✓, M-2 (sdílený rebuild) ✓, M-3 (deterministický fold) ✓, M-4 (build bez ctx → vědomý G-BUILD-TXAUDIT) ✓ — `pay` bez ctx neháže (transactions.js optional ctx), gold se odečte.
- **Balanc**: `BALANCE.buildings` (balance.js:283-325) má všechny konstanty s `provenance:` + zdroj (home.js:XXXX). Žádné inline magické konstanty v core (vše přes `BAL.*`). ✓
- **Living artefakt tickOrder.js**: `buildings.builders` quarterDay order 40, `buildings.age` day order 70 — registrováno (tickOrder.js:187,209), order konzistentní s designem §7. tickOrder.md tabulka+diagram aktuální (jen prozaická T4 sekce zaostala — MINOR-2).
- **G-LISTBUILDINGS**: 6 budov v buildings.json (≥6 splněno), všechny s `_meta.provenance:approximated`.

---

## Závěr

M5-1 je **correctness-clean**: 5 tvrdých invariantů platí proti kódu, 906/906 testů zelených, determinismus G1 nedotčen, persist round-trip bitově identický. QA GO (T-008) je v souladu s mým code-readem.

Nálezy jsou kvalita/dokumentace, žádný nemění chování ani neporušuje invariant. **MINOR-1 (gap-report) a MINOR-2 (tickOrder.md T4 sekce)** doporučuji splnit jako **podmínky před uzávěrem iterace** (governance gapů + N-04 živé artefakty). MINOR-3/4 a NIT-1..4 → backlog.

**Verdikt: GO — s podmínkami (MINOR-1, MINOR-2 před close-iteration; zbytek backlog). Bez re-run.**

---

*Reviewer (Opus), iter-013 T-009, 2026-06-14*
