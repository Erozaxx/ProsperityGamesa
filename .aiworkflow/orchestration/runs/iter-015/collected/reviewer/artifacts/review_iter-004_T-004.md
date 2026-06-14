# Review Gate – iter-004 T-004 (M0a Engine Core)

- **Task**: T-004, iter-004 (BRIEF-014)
- **Reviewer**: reviewer (Opus), pravomoc re-run
- **Datum**: 2026-06-13
- **Vstupy**: design_iter-004_T-001.md, impl_iter-004_T-002.md, testreport_iter-004_T-003.md, architektura §3.1/§3.5/§4.1–4.4/§5.6, master plán iter-003 (§1.4, §3 iter-004 DoD)
- **Vlastní ověření**: `npm run ci` spuštěno → **exit 0** (tsc 0 chyb, grep gate OK 12 souborů, node:test 63/63 pass)

---

## VERDIKT: **GO**

Engine core splňuje DoD iter-004, je v souladu s návrhem i architekturou, hranice vrstev jsou mechanicky vynucené a dvojitě pojištěné, kód je deterministický a serializovatelný. 0 BLOCKER. BUG-001 (assertSerializable stack overflow na cyklu) potvrzuji jako **non-blocker – odložení na M1 je OK** (odůvodnění níže). Nálezy jsou SUGGESTION/NITPICK, žádný nevyžaduje re-run.

---

## DoD iter-004 – ověření bod po bodu

| DoD položka | Stav | Důkaz |
|---|---|---|
| core běží v Node bez DOM | ✅ | Žádný DOM/IO symbol; grep gate + `tsconfig lib:["ES2022"]` bez DOM (dvojitá pojistka). `npm run ci` běží headless v Node. |
| čas/sezóny se posouvají | ✅ | `calendar.advanceCalendar` autorita; testy day/season/year boundary (edge.test.js TC-E09, calendar.test.js) pass. Den 1=kroky 1..900, den 2=901, sezóna 91 dní, rok 364. |
| determinism hash test | ✅ | `hashState` (FNV-1a, stabilní replacer řadící klíče); rng.test.js + edge.test.js: stejný seed→stejný hash, různý seed→různý hash, stabilní po JSON round-tripu. Test report: seed 42/99/1337 stabilní. |
| `tsc --checkJs` + grep gate zelené a "v CI" | ✅ s výhradou | `npm run ci` = `typecheck && lint:core && test`, exit 0. Viz SUGGESTION-1 k absenci `.github/workflows`. |
| tickOrder živý artefakt | ✅ | `docs/tickOrder.md` zrcadlí `tickOrder.js` (TICK_ORDER + registerCorePeriodics), vč. edge definic a bootstrap sekvence. |
| ASCII diagram živý artefakt | ✅ | `docs/architecture-diagram.md` (vrstvy, layering rules, enforcement). Viz NITPICK-1 (drobnost). |

Master plán §1.4: živé artefakty musí být aktuální ve stejném commitu jako strukturální změna – oba `.md` odpovídají aktuálnímu kódu. ✅

---

## Soulad s návrhem a architekturou

- **Struktura repa §3.1**: odpovídá návrhu §1.1 (engine/state/systems/registry/commands + sloty .gitkeep). ✅
- **Vrstvení (§3.1)**: core importuje jen z core relativně s `.js`. Grep gate blokuje import z ui/app/save/data/vendor. ✅
- **Signatury §2–§6 návrhu**: `createInitialState`, `step/advance/createAccumulator`, scheduler API, `makeRng/initRng/hashState`, registry (create/register/resolve/has/assertSerializable), `advanceCalendar`, `runTick/registerCorePeriodics`, `dispatch/setSpeed` – všechny odpovídají JSDoc spec návrhu. ✅
- **§4.1 clock**: fixed-timestep, akumulátor mimo state, pauza zahazuje dluh, frame budget odečítá jen provedené kroky, `running===false` přeruší dávku. Implementace přesně dle pseudo. ✅
- **§4.2 scheduler**: flat binární min-heap `ScheduleEntry[]`, `scheduleCount` index, tie-breaker `_seq` (FIFO). ✅
- **§4.3 tickOrder**: 4 fáze (calendar→schedule→periodics→devInvariants), periodika jako data mimo state, no-op sloty, deterministické řazení dle (edgePriority, order). ✅
- **§4.4 RNG**: mulberry32, 8 streamů, uint32 stav přímo ve state, dekorelované seedy. ✅
- **§5.6 registry**: fail-fast resolve (throw v DEV), id-collision throw, assertSerializable. ✅
- **§1.3 tsconfig**: lib bez DOM = dvojitá pojistka R-I. ✅

Odchylky codera (impl note §1–6) jsou všechny zdůvodněné a přijatelné: zúžení `tsconfig include` na `src/core/**` (starý `src/js/` má DOM/implicit-any – mimo scope iter-004), `globals.d.ts` pro `structuredClone`, `.d.ts`→`.js` JSDoc import cesty (TS Bundler resolver), explicitní speed guard, oprava spy testu, oprava grep-gate falešného pozitivu v komentáři `clock.js`. Žádná odchylka nemění architekturu.

---

## Posouzení BUG-001 (assertSerializable stack overflow na cyklu) – NON-BLOCKER

Potvrzuji nález testera: `checkNoFunctions` (registry.js:84) nemá `WeakSet visited`, takže cyklický objekt vyhodí `RangeError: Maximum call stack size exceeded` před tím, než se dostane k `structuredClone` (které by cyklus zachytilo čistou chybou).

**Rozhodnutí: odložení na M1 je OK.** Kritéria:
1. **Funkčně bezpečné** – cyklický vstup *vyhodí výjimku* (fail-fast splněn), jen s méně srozumitelnou zprávou. Žádný tichý průchod nevalidních dat.
2. **Není to release-critical pro M0a** – `assertSerializable` je dev-only validace; produkční kód cyklické params nepředává. V iter-004 se navíc `assertSerializable` reálně nikde nevolá v hot-path (`dispatch` používá samostatný non-throwing `structuredClone` check, ne `assertSerializable`).
3. **Nezpůsobí problém za 3 měsíce** – oprava je triviální (přidat `WeakSet` nebo volat `structuredClone` jako první). Riziko regrese nulové.

Test report ho dokumentuje testem, který prochází (asserts throws). Doporučuji přenést jako evidovaný tech-debt do M1 backlogu (viz SUGGESTION-3), ne řešit re-runem iter-004.

---

## Nálezy

### SUGGESTION-1 – "grep gate v CI": chybí spustitelný CI pipeline soubor
DoD i master plán mluví o "CI gate". Aktuálně je CI realizováno **jen jako npm skript** `npm run ci` (package.json:11) – neexistuje `.github/workflows/*.yml` ani jiný automatizovaný runner. Pro M0a, kde se gate spouští lokálně/manuálně testerem a reviewerem, je to dostatečné a DoD lze považovat za splněné (gate existuje, je zelený, je reprodukovatelný jedním příkazem). Doporučuji ale **v iter-005 (nebo dříve, je-li zaveden remote)** přidat `.github/workflows/ci.yml` volající `npm ci && npm run ci`, aby gate běžel automaticky při push/PR (close-iteration flow počítá s push+PR). Nezdržuje GO.

### SUGGESTION-2 – `dispatch` validuje serializability jinak než `assertSerializable`
`commands/dispatch.js` používá vlastní `try { structuredClone(params) }` (non-throwing → `ok:false`), zatímco fns kontrakt má `assertSerializable` (throwing). To je vědomý a správný designový rozdíl (UI nesmí spadnout vs. interní fail-fast, návrh §6.4). Drobnost: `dispatch` tím **nedělá** `checkNoFunctions`, takže command params obsahující funkci v *plain* poli, které `structuredClone` *neumí* klonovat, vrátí `ok:false` korektně – ale chování je nepatrně odlišné od fns vrstvy. Doporučuji v M1, až přibydou další commandy, sjednotit přes sdílenou `isSerializable(params): {ok, error}` helper (jeden zdroj pravdy). Nízká priorita.

### SUGGESTION-3 – evidovat BUG-001 jako tech-debt do M1
Aby se nález neztratil mezi iteracemi, přenést BUG-001 (WeakSet do `checkNoFunctions`) do M1 backlogu / decision recordu jako drobný tech-debt s odkazem na test v `edge.test.js` (TC-E05).

### NITPICK-1 – ASCII diagram obsahuje ruské fragmenty
`docs/architecture-diagram.md` má v `app/` boxu cyrilici ("единая точка сборки слоёв", "perf.now"). Projekt je jinak v češtině/angličtině. Kosmetické – sjednotit jazyk při příští editaci diagramu.

### NITPICK-2 – magická konstanta `450` pro noon
`calendar.js:43` a `timeEdges`/tickOrder používají `sid === 450` napřímo místo `STEPS_PER_DAY / 2`. Hodnota je správná (900/2). Pro čitelnost zavést `STEPS_TO_NOON = STEPS_PER_DAY / 2` v `timeEdges.js` vedle ostatních konstant. Nízká priorita.

### NITPICK-3 – `noon` koliduje s `quarterDay` hranou
`isNoon` (sid 450) je zároveň `isQuarterDay` (450 % 225 === 0). Je to konzistentní s návrhem (noon = 2. quarter boundary) a tickOrder řadí `quarterDay` před `noon`, takže pořadí je deterministické. Žádná akce – jen explicitně zaznamenávám, že v M2+ při psaní reálných handlerů na tyto hrany je třeba s touto koincidencí počítat.

### NITPICK-4 – `scheduleInsert` past-step guard a runTick
`scheduleInsert` hodí, pokud `step < curStep`. `runTick` ale fází 1 (calendar) neinkrementuje curStep – curStep zvyšuje `clock.step` před `runTick`. Pořadí je v pořádku (insert během handleru na `curStep` projde, protože `step >= curStep`). Bez akce; jen ověřeno, že hranice nekoliduje s dispatch-during-tick.

---

## Kvalita, hranice vrstev, catch-up-safe připravenost

- **Čitelnost**: JSDoc na všech exportech, jasné komentáře `// MOVE TO balance.js @ M1` a `// CALENDAR: provisional`. ✅
- **Hranice vrstev**: žádný DOM/fetch/Date.now/Math.random/performance.now/setTimeout v core (grep gate + tsc). Čas i náhoda vstupují jen jako parametry (`nowMs`) / serializovaný stav (`rng.streams`). ✅
- **Testovatelnost**: registry/akumulátor jsou instance v `ctx` (žádný skrytý globál), čisté funkce, deterministický bootstrap helper v testech. ✅
- **catch-up-safe (S-05)**: celý engine je funkcí (state, čas-zvenčí, ctx) → žádný interní zdroj nedeterminismu; stav plně serializovatelný (testy JSON deepEqual po 100 krocích bez funkcí/Map/Date). Hash stabilní po round-tripu → save-resume připraveno. Pauza zahazuje dluh akumulátoru, catch-up po zavření hry je oddělený mechanismus M2b (`lastSimTimestamp`) – správně připraveno, nepředbíhá scope. ✅

---

## Doporučení dalšího kroku

**GO** – iterace iter-004 (M0a engine core) je připravena k uzavření. Nálezy SUGGESTION/NITPICK přenést do M1 backlogu (zejména SUGGESTION-1 CI workflow při zavedení remote a SUGGESTION-3/BUG-001 WeakSet). Žádný re-run není potřeba.
