# Review Gate M6 — iter-015 T-009 (Reviewer, Opus)

- **Task**: T-009 / BRIEF-015-009 — závěrečný review gate M6 + ověření DoD M6 (K13 plně)
- **Reviewer**: reviewer agent (Opus), právo re-run
- **Datum**: 2026-06-14
- **Rozsah**: `git diff 735846d..HEAD -- src/ test/` (iter-015, M6)
- **Metoda**: ověřeno proti KÓDU (ne proti tvrzením QA). CI re-run: `npm run ci` = **1097/1097 pass**.

---

## VERDIKT: **GO-s-podmínkami**

DoD M6 (K13 plně: budovy + techy přes jednu modifier vrstvu) je **strukturálně splněn a verifikovatelný v kódu**. Tvrdé invarianty 1–6 z briefu PLATÍ. Nalezen **1 major correctness bug** (double-count `researchExp` u academy/university s `created>1`) — neblokuje DoD M6 jako milník (tech modifier vrstva + research progrese fungují), ale je to reálná chyba v determinismu produkce techPt z budov, kterou stávající testy maskují loose `>=` asercí. Podmínka GO = oprava M-A před uzavřením, NEBO explicitní acceptace jako sledovaný gap do M9.

---

## Stanovisko k DoD M6 (K13 plně budovy+techy)

**SPLNĚNO (s podmínkou M-A).** Ověřeno proti kódu:

- **Jedna modifier vrstva**: tech efekty žijí výhradně v `state.catalogState.modifiers` se `source='tech:<id>'` (buildings.js:443-451), STEJNÉ pole jako `building:*` (buildings.js:327-334). Žádná ad-hoc cesta — grep potvrdil, že tech efekt nikde nemutuje `home.*`/`player.*` mimo `unlockedTechs`/`techPt`.
- **Jedna sdílená re-derivace**: `rebuildBuildingDerived` krok (b2) (buildings.js:606-611) volá tytéž helpery `removeAllTechSourcedModifiers` + `addTechModifiers` jako `applyTechModifiers` (buildings.js:471-472). Žádná druhá implementace tech foldu.
- **Žádná load-only / tech-only větev**: grep `addTechModifiers|removeAllTechSourcedModifiers|applyTechModifiers` přes `src/` → volány JEN z buildings.js (b2 + applyTechModifiers) a `applyTechModifiers` jen z buyTech.js:105. Load Step 5 (load.js:285) jde přes `rebuildBuildingDerived` → automaticky re-aplikuje budovy I techy. Invariant DR-012-02 dodržen.
- **Deterministický fold**: `fold` (buildings.js:64-87) řadí `sort by (source,id)` před foldem (add→mul→set, set poslední vyhrává). Budova+tech na stejný atribut foldí do jednoho `effective()` (`m.target===itemId && m.attr===attr`, buildings.js:147 — bez ohledu na source). Ověřeno strukturálně + QA empiricky (granary storage.food: building add 400 + tech add 200 = 600).
- **Research progrese**: deterministická, catch-up-safe (while-loop level-up, research.js:127-133), techPt grant přes `grant(state,{techPt:1},'research:'+sectorId,ctx,curStep)` (signatura ověřena transactions.js:57). Žádný RNG/Date.now/DOM (jen v komentářích).

Milník M6 je funkčně kompletní: tech strom + buyTech lifecycle + research→techPt + UI tab "Veda" + persist + round-trip identita.

---

## Ověření tvrdých invariantů (proti kódu)

| # | Invariant | Stav | Důkaz |
|---|---|---|---|
| 1 | Techy=modifikátory K13 plně, jedna sdílená re-derivace, žádná load/tech-only větev | **PASS** | buildings.js:443-451 (source=tech:), b2 buildings.js:606-611, grep call-sites |
| 2 | Determinismus: `_modVersion` reset konzistentní; fold; round-trip bit-identický; payload bez derivovaných | **PASS** | reset `cs._modVersion=0;invalidateModifiers` v OBOU cestách (buildings.js:619-621 rebuild, :475-476 applyTech); persistSchema.js:55-57 (jen modifiers); QA hashState bit-identický |
| 3 | M-1: `createPlayerState` má `unlockedTechs:{}`+`research:{sectors:{}}`; fresh==load; test existuje | **PASS** | createHomeState.js:68-75; load.js:96-97 undefined-guard; m6-tech-roundtrip baseline h0===h1 |
| 4 | M-2: `addTechModifiers`/`findTech` `hasCatalog('techs')` guard + `if(!tech)continue` | **PASS** | buildings.js:427 (early-return), :384 (findTech guard), :437 (if(!tech)continue) |
| 5 | Research determinismus bez RNG/Date.now/DOM; grant přes ctx; catch-up-safe | **PASS** | research.js — žádný RNG; grant ctx research.js:131; while-loop :127-133 |
| 6 | M6 nerozbil M5: m5-buildings-t4 + G1 + kontrakty; techCap reuse | **PASS** | CI 1097/1097; krok b2 additivní (no-op při unlockedTechs={}); techCap import z formulas.js (buyTech.js:31, selectors.js) — žádná duplikace |

`_modVersion` reset — detailní ověření (požadavek briefu „obzvlášť pečlivě"): obě re-derivační cesty nastavují `cs._modVersion = 0` PŘED `invalidateModifiers` → obě skončí na `version=1`. Tím `hashState(N×buyTech)` === `hashState(load(save(...)))`. Bez resetu by N mutací inkrementovalo version → DR-012-02 desync. Kód je v tomto korektní (buildings.js:619-621 a :474-476).

---

## Nálezy

### MAJOR

**M-A [major] — Double-count `researchExp` u academy/university (`created>1`)**
`src/core/systems/research.js:94-99`

```js
const perBuilding = effective(buildingId, 'researchExp', state); // už obsahuje × created
const totalBonus = perBuilding * bSt.created;                    // × created PODRUHÉ
```

`addBuildingModifiers` (buildings.js:316-317) bakuje `created` do hodnoty `add` modifikátoru (`value = atom.value * created`). Proto `effective('academy','researchExp')` vrací JIŽ `2 × created` (per-type agregát, ne per-instance) — přesně jako u `recalcBuildingAggregates`, který komentuje „Do NOT multiply by created here" (buildings.js:509). research.js ale násobí `created` znovu → pro `created>1` exp roste kvadraticky.

- 1 academy: `2×1×1 = 2` (náhodou správně → maskuje bug)
- 2 universities: `5×2×2 = 20` místo zamýšlených `10` (design §3.2: `perBuilding * created`, kde perBuilding má být per-instance hodnota, ale `effective` ji nevrací)

**Proč to testy nechytily**: jediný multi-building test (`m6-tech-research.test.js:234` „2 universities → 5*2=10") asertuje `exp >= 10` — `20 >= 10` projde, komentář tvrdí 10, realita 20. QA 400-denní sim měl jen joby, žádnou postavenou academy/university → cesta nikdy neexekvována. CI zelené to nevyvrací.

**Návrh opravy** (jedna z):
- (a) Odebrat dvojí násobení: `const totalBonus = perBuilding;` (effective už created zahrnuje) — minimální, korektní.
- (b) Číst per-instance přes `effectFromCatalog(buildingId,'researchExp')` (vrací surovou sumu z effects[], bez created) a pak `× bSt.created` — konzistentní s designem §3.2 sémantikou „perBuilding".

Doporučuji (a) (drží invariant „effective() = už agregovaná hodnota", stejně jako recalcBuildingAggregates). Po opravě zpřísnit test na `=== 10` (resp. `=== 2` pro 1 academy).

> Pozn.: tohle NENÍ G-RESEARCH-ACADEMY (ten je o approximovaných hodnotách 2/5). Je to skutečná chyba v re-použití `effective()` sémantiky. Determinismus jako takový NEporušuje (je deterministicky špatně — round-trip i catch-up zůstanou identické), proto neblokuje DoD M6 jako milník, ale je to balanc/correctness defekt v produkci techPt z budov.

### MINOR

**m-1 [minor] — Living artefakt `docs/tickOrder.md` neaktualizován o `research.daily`**
`docs/tickOrder.md:38,54`

Tabulka systémů (řádek 38) i ASCII diagram day-edge (řádek 54) končí na `buildings.age (day,70)` a NEobsahují `research.daily (day, 75)`. Brief explicitně žádá „tickOrder doc + diagram aktuální (research.daily order 75)". Kód (tickOrder.js:218) i registrace jsou správně, jen living doc drift. Návrh: přidat řádek `| research.daily | day | 75 | research.daily | LIVE (M6 T3) |` + do diagramu `→ [research.daily]NEW(M6)`.

### NIT

**n-1 [nit] — Job-cílené approximated techy s neexistujícími/no-op cíli**
`src/data/techs.json:112` (`forestry_axes` → `target:"lumberjack"`)

`lumberjack` není v jobs.json (job je `woodcutter`) → efekt je no-op i kdyby produkce četla přes `effective()`. Spadá pod SCHVÁLENÝ gap **G-TECH-JOB-EFFECTIVE** (tom-proxy T-003, sledovací M9), proto **NEflaguji jako blocker** — jen poznámka, že vedle „produkce nečte effective()" je tu navíc neexistující target. Při M9 přepojení opravit `lumberjack`→`woodcutter`. `provenance:'approximated'` je správně označeno.

**n-2 [nit] — buyTech docstring „placeholder T2" zavádějící**
`src/core/commands/buyTech.js:13-15,47,102`

Komentáře mluví o „placeholder T2 fills effects" — T2 je hotové, `applyTechModifiers` je plně implementováno. Mrtvý/zastaralý komentář, ne kód. Drobné vyčištění.

---

## Ověření schválených gapů (dokumentace OK, neflaguji jako blocker)

| Gap | Dokumentace | Stav |
|---|---|---|
| G-LISTTECHS | `techs.json._meta.provenance:'approximated'` + per-tech; seed v iter006-catalog-schema.test.js | OK — vyřešen M6, approximated |
| G-TECH-JOB-EFFECTIVE | design §2.7 + QA „schválené gapy"; tom-proxy T-003, M9 | OK — schválený, dokumentovaný |
| G-RESEARCH-UNIV-RNG (univ Math.random) | research.js:10 komentář; design §3.2; buildings.json university _meta | OK — schválený (determinismus má přednost), dokumentovaný |
| G-JOB-SECTOR-MAP | balance.js research.jobSectorMap _meta; jobs.json _meta | OK — approximated |
| G-RESEARCH-ACADEMY | buildings.json academy/university _meta (researchExp 2/5) | OK — approximated |
| G-TECH-TXAUDIT | buyTech.js:9,17,95 — stejná třída jako G-BUILD-TXAUDIT | OK — dokumentovaný, M9 |

Poslední dva (G-TECH-JOB-EFFECTIVE, univ Math.random) jsou dle briefu SCHVÁLENÉ tom-proxy T-003 / sledovací M9 — ověřeno, že jsou zdokumentované v kódu i QA reportu. Neflaguji.

---

## Reuse / simplify / mrtvý kód

- **Žádná duplikace fold logiky** budovy vs techy: oba zdroje sdílí `fold`/`effective` (buildings.js:64,120) a re-derivaci přes `rebuildBuildingDerived` (b2). Tech fold helpery (`removeAllTechSourcedModifiers`/`addTechModifiers`) jsou single source of truth, volány max ze 2 míst. **Čisté.**
- `techCap` reuse z formulas.js všude (buyTech, selectors, research) — žádná re-definice vzorce. Tabulkový test ověřen QA.
- `removeAllTechSourcedModifiers` correctly mirror `removeAllBuildingSourcedModifiers` (in-place compact, buildings.js:396-406). OK.
- Drobnost (n-2): zastaralé „placeholder" komentáře v buyTech.js.

## Persist / migrace

- `unlockedTechs` + `research` v `PERSIST_SCHEMA.player` (persistSchema.js:14), uloženy generickým loopem (`applyPersist` :76-77), načteny generickým loopem (load.js:96-97) s `if(...!==undefined)` guardem → **staré savy bez polí → `{}`/`{sectors:{}}` z `createPlayerState`** (createHomeState.js:72-73). SAVE_VERSION zůstává 3, žádná migrace. Ověřeno proti kódu + QA AC7. **OK.**
- Payload bez derivovaných: `catalogState` ukládá JEN `modifiers` (persistSchema.js:55-57); `home.derived`/`_effCache`/`_modVersion` nejsou v allowlistu. QA potvrdil payload kontrolou. **OK.**

---

## Závěr

- **Verdikt: GO-s-podmínkami.**
- **Podmínka**: opravit **M-A** (double-count researchExp, research.js:94-99) + zpřísnit test na exact-match; NEBO orchestrátor/tom-proxy explicitně přijme M-A jako sledovaný gap do M9 (s úpravou komentáře testu). Doporučuji opravu (1 řádek, nízké riziko).
- **DoD M6 (K13 plně): SPLNĚN** — budovy i techy jednou modifier vrstvou, jednou re-derivační cestou, deterministický fold, round-trip identita, research deterministický + catch-up-safe, M6 nerozbil M5.
- **Nálezy**: 0 blocker · 1 major (M-A) · 1 minor (m-1 doc drift) · 2 nit (n-1, n-2).

**Nejdůležitější 3 nálezy:**
1. **M-A (major)** — `effective('researchExp')` už obsahuje `×created`, research.js násobí podruhé → kvadratická exp produkce z academy/university při `created>1`; testy maskuje loose `>=` asercí.
2. **Determinismus tech modifikátorů (PASS)** — `_modVersion` reset konzistentní v obou cestách, jedna sdílená re-derivace (b2 + applyTechModifiers sdílí helpery), žádná load-only větev. Round-trip bit-identický.
3. **m-1 (minor)** — `docs/tickOrder.md` neobsahuje `research.daily` order 75 (living artefakt drift); kód správně.
