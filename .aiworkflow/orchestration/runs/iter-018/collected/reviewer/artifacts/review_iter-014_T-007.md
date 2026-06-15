# Review Gate M5-2 + DoD M5 — iter-014 T-007 (final)

- **Review ID**: REVIEW-014-007
- **Iteration**: iter-014 (M5-2)
- **Task**: T-007 (reviewer, Opus) — závěrečný review gate M5-2 + ověření DoD M5 (celý milník)
- **From**: reviewer → Orchestrator
- **Date**: 2026-06-14
- **Scope diff**: `ecfb479..HEAD -- src/ test/` (21 souborů, +2741/−7)
- **Vstupy ověřeny proti KÓDU** (ne tvrzení): contracts.js (system+commands), main.js (bootstrapEngine+bootSequence), rng.js, tickOrder.js, scheduler.js, registry.js, load.js, persistSchema.js, createHomeState.js, transactions.js, market.js, selectors.js, screens.js, App.js, balance.js, schemas.js, catalogs.js, contracts.json, gap-report.json. Targeted testy spuštěny nezávisle.

---

## VERDIKT: GO — s jednou nesplněnou ne-funkční podmínkou (gap-report)

**M5 je kompletní, hratelný a všechny tvrdé invarianty (1–6) platí proti kódu.** Jediný skutečný nález je **MINOR** (gap-report.json nebyl aktualizován pro iter-014). Není to funkční blocker ani kvalitativní riziko produkčního kódu → **GO**, s podmínkou doplnit gap-report (lze i jako follow-up při uzávěrce iterace, neblokuje merge funkčnosti).

QA (T-006) GO empiricky potvrzuji — nezávisle reprodukováno: m5-contracts 51/51, ui-selectors-t6 14/14 (100/100 v kombinaci), G1 iter005-edge 16/16.

---

## DoD M5 — STANOVISKO: KOMPLETNÍ

| Oblast | Stav | Ověření (proti kódu) |
|---|---|---|
| Budovy / stavba (M5-1 T1) + B1 wiring | OK | `registerBuild(creg)` v `bootstrapEngine` (main.js:106) — dříve dark code, nyní resolvovatelné |
| Builder kapacita/scaling, companies, modifikátory K13 (M5-1 T2–T4) | OK | selectBuilderCapacity/Companies; G1 hash nedotčen (16/16) |
| Kontrakty K14 lifecycle (M5-2 T5) | OK | accept/reject/complete + expire/offer; string-ID v datech |
| Build UI + ContractsScreen + taby (M5-2 T6, zachráněno) | OK | čisté komponenty, jen selektory+commands; smoke renderuje Stavba+Kontrakty |
| B2 re-arm (staré savy) | OK | armContractOffer guard scheduleCountOf===0, fresh+load |
| Determinismus / stream izolace / SAVE_VERSION=3 / catch-up | OK | viz invariant 2/4/6 níže |

Milník M5 (M5-1 budovy/modifikátory + M5-2 kontrakty/UI) je funkčně uzavřený a hratelný.

---

## Tvrdé invarianty — verifikace proti kódu

### Inv. 1 — Kontrakty přes registr efektů K14 (string-ID + params v datech): **PLATÍ**
- `contracts.json`: `onComplete/onExpire/onReject` = `{effect:'contract.complete'|'noop'}` — data, ne funkce.
- Queue entry kopíruje `entry.onComplete/onExpire/onReject` do dat (contracts.js:243-245). Plain-data, structuredClone-safe.
- Schedule handlery (`contract.expire`/`contract.offer`/`contract.complete`) registrovány do registru efektů přes `registerContractEffects` (contracts.js:298-302), module-level reference → idempotentní register.
- Žádné imperativní háčky. Completion běží přes `applyContractComplete` import (command nemá ctx) — string-ID zůstává v datech jako K14 marker (design §6.1, A2). Soulad s arch §5.4.

### Inv. 2 — Determinismus / serializovatelnost: **PLATÍ**
- `contractQueue`+`contractSeq` plain-data, init v `createHomeState.js` (`[]`/0); persist přes `!== undefined` allowlist v `applyPersist` (persistSchema.js:218-226) i `applyPayload` (load.js:203-211). Precedent projectQueue.
- Schedule eventy `contract.offer`/`contract.expire` žijí v `engine.schedule` (persistováno automaticky, scheduleCount dedup K17) → přežijí save/load.
- rng stream `'contracts'` přidán na **konec** STREAM_NAMES (rng.js:10) i StreamName typu (types.d.ts). `initRng` per-stream `undefined`-guard → seedy existujících streamů (population…buildings) **beze změny**. makeRng default `?? 0` pro chybějící stream.
- Deriváty `canComplete/daysLeft/pctComplete` se NEukládají — počítají se výhradně v `selectContracts` (selectors.js). Ověřeno: persist blok ukládá jen plain pole.
- G1 nedotčen: iter005-edge 16/16 nezávisle PASS.

### Inv. 3 — B2 re-arm idempotentní: **PLATÍ**
- `armContractOffer(state)` (contracts.js:262-267): guard `scheduleCountOf(state,'contract.offer')===0` → `scheduleInsert(max(curStep, firstOfferStep))`. Žádný RNG/Date při armování (jitter až v handleru). 
- **Call-site ověřen**: `bootSequence` v main.js, **hned za `marketInit`** (main.js:194), s komentářem mirror marketInit. Běží fresh i po loadu (applyPayload přepíše schedule, pak arm doplní pro staré savy).
- `Math.max(curStep, firstOfferStep)` brání throw na minulý step (scheduler.js:75). firstOfferStep=1 → první offer fire AŽ po marketInit (správné pořadí pro getGoldValue). Neduplikuje (fresh M5-2 save už offer má → guard přeskočí). Testy sekce „armContractOffer B2 re-arm" 6/6 PASS.

### Inv. 4 — B1 boot wiring: **PLATÍ**
- `registerBuild(creg)` + `registerContractCommands(creg)` v `bootstrapEngine` za registerBuyCompany (main.js:105-107); `registerContractEffects(registry)` za registerCorePeriodics (main.js:92). Importy main.js:24-26.
- `bootstrapEngine` volán fresh i po loadu (registry není v save) → commandy/handlery dostupné v obou cestách. build/contract commandy resolvovatelné. Testy „B1 boot wiring" PASS.

### Inv. 5 — Žádná herní logika v UI: **PLATÍ**
- scaleCost (`scaleCostByCount`), canAfford, canComplete, daysLeft, pctComplete, unaffordable — VŠE v `selectors.js` (selectBuildableBuildings/selectContracts atd.). 
- `BuildScreen`/`ContractsScreen` (screens.js): jen render z selektorů + `send(command, params)`. Jediná lokální logika je `formatCost`/`formatBasket` = čistá prezentace stringů (ne herní výpočet). Žádný stav, žádný core import kromě selektorů. Soulad §3.4.

### Inv. 6 — Žádný Date.now/Math.random/DOM v core; catch-up-safe; SAVE_VERSION=3: **PLATÍ**
- grep core: žádný `Date.now`/`Math.random`/`document.`/`window.` (jediný hit = komentář). Veškerá náhoda přes makeRng('contracts'). Math.round/max jen na rng/herním čase.
- Catch-up-safe: schedule one-shot re-schedulující se (žádný per-step polling). QA: 328 500 steps bez crashe, deterministicky.
- `SAVE_VERSION=3` beze změny (schema.js); nová pole pod undefined-guardem → staré v3 savy se načtou (createHomeState doplní `[]`/0).

---

## Zachráněná build UI (T6) — cílená kontrola úplnosti

Brief: T6 coder zemřel před handoffem, práci zachránil orchestrátor → prověřeno obzvlášť pečlivě.

**Závěr: ÚPLNÁ a funkční. Žádný nález.**

- **BuildScreen**: všechny 4 sekce dle designu §7.3 — Kapacita stavitelů (selectBuilderCapacity), Fronta projektů (selectProjectQueue, progress bar, type build/repair), Budovy (selectBuildableBuildings, scaled cost, canAfford disabled, `send('build')`), Stavební firmy (selectBuilderCompanies, owned/canAfford, `send('buyCompany')`). Empty-state ve všech sekcích.
- **ContractsScreen**: Nabídnuté (Přijmout/Odmítnout) + Aktivní (Splnit disabled dle canComplete, Zrušit, daysLeft, pctComplete bar, unaffordable varování). Empty-state.
- **App.js**: taby `build`+`contracts` v TABS i v tab-content; import obou screenů. Smoke potvrzuje render bez console error.
- **Selektory korektní**: deriváty počítané v selektoru (ne v UI), pure (test „does not mutate state" PASS), `key=` na seznamech, undefined-guardy (`?? []`, `?? {}`) robustní vůči chybějícím polím (staré savy). Importované symboly (effectiveMap, scaleCostByCount, companyBuildersTotal/MasonTotal, byId/hasId, getGoldValue, canAfford) všechny existují a mají správnou signaturu (ověřeno).

---

## Nálezy

### MINOR-1 — gap-report.json neaktualizován pro iter-014 (`src/data/gap-report.json`)
**Závažnost: minor (traceability/dokumentace, ne funkční).** Brief explicitně: „Gapy korektně označené + v gap-reportu."
Ověřeno programově:
- Čtyři contract gapy citované napříč designem **chybí** v gap-reportu: `G-CONTRACTS-CATALOG`, `G-CONTRACT-GEN`, `G-CONTRACT-SCHED-CLEANUP`, `G-BUILD-CANCEL` (všechny MISSING).
- `_meta.iteration` stále `iter-013` / `milestone: M5-1` (neaktualizováno na iter-014/M5-2).
- `summary` nekonzistentní s polem: `summary.total=30` sedí, ale `summary.byMilestone` (histogram tvrdí M5-2:6, M5:7, M9:7, M4:2, M8:2) **neodpovídá** skutečnému poli (actual M5-2:3, M5:6, M9:8, M4:1, M8:1, M6:6 + složené klíče M4/M9, M3/M9, M3/M6). Histogram je stará hodnota.

**Návrh:** doplnit 4 contract gapy (provenance/severity/blocksMvp:false, milestone M5-2 nebo M9 dle designu §3.1/§5.3/§14.5), aktualizovat `_meta.iteration→iter-014`, `milestone→M5-2`, přegenerovat `summary.byMilestone`. Neblokuje funkčnost ani merge; lze řešit při uzávěrce.

### NIT-1 — `resolveEffect` silent-fallback místo fail-fast (`contracts.js:116-125`)
`resolveEffect` čte `registry.handlers.get(effect)` přímo a při chybějícím ID je **tiše no-op** (ne `resolve()` který by hodil). Pro min. sadu (`onExpire='noop'`, registrováno) se nikdy netrigne. Odlišuje se od projektového fail-fast vzoru (registry.js:44 `resolve` hází na unknown). Defenzivní u terminálních eventů, ale potlačí budoucí překlep v effect-ID u M6+ obsahu.
**Návrh (volitelně, M6+):** v DEV větvi použít `has(reg,effect)` + throw, nebo `resolve`, aby chybějící effect-ID nebyl tichý. Nezávazné pro M5-2.

### NIT-2 — `pctComplete` heuristika bez start-reference (`selectors.js`, selectContracts)
`pctComplete` odvozuje „uplynulou dobu" z `expirationDays*STEPSPERDAY - remaining`. Protože se neukládá `acceptedStep`, při edge-case (kontrakt typu s jiným runtime expirationDays než katalogovým, nebo manuálně injektovaný deadlineStep) může % mírně driftovat. Pro min. sadu (deadlineStep = curStep+catalogDays) je přesné. Čistě UI derivát, neovlivní stav.
**Návrh:** ponechat; pokud M9 přidá variabilní deadliny, uložit `acceptedStep` a počítat % z něj. Není pro M5-2 nutné.

> Pozn.: NIT-2 z design-review (title v save) — coder **ponechal `title`** v queue i v persistu (plain-string-safe, design to označil jako „volitelné, ne blocker"). `selectContracts` umí title derivovat z katalogu jako fallback (`if (!title …)`), takže obě cesty fungují. Akceptováno, beze změny.

---

## Reuse / simplify / mrtvý kód
- **`goodsBuyer` v katalogu, generátor jen `kind:'supply'`** (contracts.json + contracts.js:220): goodsBuyer je `kind:'demand'`, nikdy se negeneruje → „dark" katalogový záznam. **Soulad s designem** (§14.5 NIT-3: ponechat goodsSeller jako jediný generovaný, goodsBuyer = volitelné rozšíření). Ne mrtvý kód v úzkém smyslu (accept/complete by ho zpracovaly), jen negenerovaný. Akceptováno per design.
- `contractComplete` schedule handler (contracts.js:281-286) je registrovaný, ale completion běží přes command→`applyContractComplete`. Je to deklarativní pokrytí `{effect:'contract.complete'}` markeru pro budoucí schedule-driven completion. Záměrné (design §4.3/§6.1), drobný neaktivní povrch — ponechat.
- Žádná duplicita ani zbytečné re-implementace zjištěny; selektory správně reuse-ují existující core fns (effectiveMap, scaleCostByCount, canAfford, getGoldValue).

## Persist / migrace — staré savy OK
- Round-trip ověřen (QA sekce 10 + nezávisle): contractQueue/contractSeq i schedule eventy přežijí save/load, deriváty se neukládají. Starý v3 save bez polí → undefined-guard → init `[]`/0 + B2 re-arm naplánuje offer. SAVE_VERSION beze změny (M1 rozhodnutí dodrženo).

## Živé artefakty (tickOrder)
- `TICK_ORDER` konstanta nezměněna (kontrakty NEjsou periodikum — schedule one-shot). `registerCorePeriodics` přidává `registerContractEffects` pro pokrytí test-ctx (tickOrder.js:179-181). **Doc poznámka** (tickOrder.md „schedule phase: contract.offer/contract.expire") — ověř, že byla doplněna; pokud ne, drobnost (mimo src/ diff, neblokuje).

---

## Souhrn nálezů dle závažnosti
- **BLOCKER: 0**
- **MAJOR: 0**
- **MINOR: 1** (gap-report neaktualizován — contract gapy chybí, summary nekonzistentní, _meta stale)
- **NIT: 2** (resolveEffect silent-fallback; pctComplete bez start-reference)

## Verdikt: **GO**
Stanovisko k **DoD M5: KOMPLETNÍ a hratelný.** Všech 6 tvrdých invariantů platí proti kódu. Zachráněná build UI úplná a funkční bez nálezu. Jediná podmínka (MINOR-1, gap-report) je ne-funkční dokumentace/traceability a může být doplněna při uzávěrce iterace — neblokuje merge ani hratelnost.

---

*Konec review. NEcommitnuto, kód neopravován (per brief). Verifikace proti kódu (ecfb479..HEAD) + nezávislý běh testů (m5-contracts 51/51, ui-selectors-t6 14/14, iter005-edge G1 16/16).*
