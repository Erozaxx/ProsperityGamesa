# Human Gate — M7a-1 design (iter-016, T-003)

- **Gate ID**: GATE-016-003
- **Brief**: BRIEF-016-003
- **Iteration**: iter-016 (M7a-1 — zóny + jednotky + napojení trhu)
- **Rozhodl**: tom-proxy (jménem Toma, proxy rozhodnutí v rámci mandátu)
- **Datum**: 2026-06-14
- **Vstupy**: design_iter-016.md (rev. T-002a: §2.1 round-robin/M-1, §8.1 re-hydratace/M-2, §16 odloženo M7a-2, G-LISTZONE §9, G-WORLD-DAYEDGE), DR-016-01, DR-013-00, zadani_projektu.md, project/done-criteria.md
- **Mandát**: DR-013-00 — delegace human-in-the-loop gatů na tom-proxy v autonomním doběhu M5–M9; auto-ano u gate v rámci scope, eskalace jen nevratné/scope/mimo-mandát.

---

## VERDIKT: SCHVÁLENO

M7a-1 design je schválen k implementaci. Všechna 4 produktová rozhodnutí jsou konzistentní s preferencemi Toma (věrný rebuild, MVP-first, plynulost workflow), opírají se o existující precedenty a žádné z nich není nevratné, mimo scope ani mimo mandát. Technický review proběhl (reviewer GO-s-podmínkami, architekt zapracoval M-1/M-2). Posuzuji čistě produktovou rovinu.

---

## Stanoviska ke 4 rozhodnutím

### 1. Split M7a → M7a-1 (zóny + jednotky + trh teď) + M7a-2 (frakční AI + revolty/questy/tribute + UI, iter-017) — **OK**

Schvaluji rozdělení a dodání frakční AI v příští iteraci.
- **Odůvodnění**: M7a-1 je samostatně hratelné a testovatelné — zóny tikají (ekonomika/politika round-robin), produkční zóny krmí trh přes `marketInject`, hráč rekrutuje jednotky, tribute se akumuluje. Závislost je jednosměrná (T2 čte data, která T1 udržuje), takže svět neožije naplno bez frakční AI, ale ani nezůstane rozbitý. To je přesně MVP-first inkrement.
- **Precedent**: M5-1 hratelné bez M5-2 (DR-013-01) — stejný splitový vzor, který Tom už schválil. Split-trigger master plánu je explicitní, DoD M7a se korektně vyhodnotí až po M7a-2. Downstream (M7b/iter-018) se neposouvá.
- **Reverzibilita**: M7a-2 jen čte/mutuje datovou kostru (`world.zones`/`world.factions`/persist), kterou M7a-1 zavádí — žádné zdvojení wiringu, žádná architektonická cena splitu. Plně vratné.

### 2. G-LISTZONE — approximovaný obsah zón (frakce/policies/AISTATES/vzorce doložitelné, ~13 zón approximováno, kalibrace M9) — **OK**

Přijatelné.
- **Odůvodnění**: jádro mechaniky zůstává věrné — AISTATES 0–7, capitals (dickinsonLanding/castleGrey/hornCastle), faction names a všechny vzorce jsou extracted/doložitelné z originálu `world.js`. Approximovaná je jen data vrstva, kterou originál fetchoval za runtime (mimo dump): topologie, targetWorkerNum, unit growth/stats, aggression/backstab. To neohrožuje věrnost mechanik, jen vyžaduje pozdější kalibraci.
- **Precedent**: přesně analogické G-LISTTECHS (iter-015) a G-LISTBUILDINGS (iter-014), které Tom akceptoval — provenance flag + kalibrace M9. Zde stejný postup, žádná eskalace (DR Q3 autonomně).
- **Pojistka**: `provenance:'approximated'` per zóna + `_meta` notes + schema validátor; kalibrace M9 to dorovná na feel originálu. Vratné — data se v M9 přepíšou bez dotyku logiky.

### 3. G-WORLD-DAYEDGE — vědomá odchylka per-step → day-edge round-robin kvůli ceně catch-upu — **OK**

Schvaluji obětování per-step granularity za catch-up výkon.
- **Odůvodnění**: chování je funkčně ekvivalentní — každá zóna se za periodu zpracuje právě tak jako v originálu, jen v hrubší (denní) granularitě místo per-step. Originál tikal per-step na serveru; náš engine musí AI svět umět dohnat levně v offline dávce (S-05), což je tvrdý produktový požadavek (Scope IN: offline progres + spolehlivé ukládání/obnova). Per-step tikání zón v catch-upu by bylo neúměrně drahé.
- **Pozn.**: pro ~13 zón vychází slot=1, tedy 1 zóna/den a celý cyklus za ~13 dní — hustota je vlastně jemnější než originálových 5 dní/zóna, takže ztráta granularity je v praxi minimální. Architekt zároveň touto změnou (M-1) opravil korektnostní vadu, kde by se zóny jinak nikdy nezpracovaly. Net pozitivní.
- **Reverzibilita**: jde o vědomou, dokumentovanou odchylku (gap G-WORLD-DAYEDGE), kalibrovatelnou v M9; nemění kontrakty ani persist. Vratné.

### 4. AI-AI bitvy vzorcem (rychlé/deterministické); plný battle automat hráčských bitev = M7b/iter-018 — **OK**

Schvaluji.
- **Odůvodnění**: AI-AI bitvy řešené RNG vzorcem jsou 1:1 přepis originálu (`processAI` state 6, ř.948–984) — věrné a zároveň levné a deterministické, což je ideální pro catch-up v offline dávce. Plný battle automat (sub-step, drahý) má smysl rezervovat pro hráčské bitvy, kde na detailu záleží; originál sám AI-AI řešil jednorázovým vzorcem, ne plným soubojem. Hranice M7a-2/M7b je tedy věrná originálu, ne kompromis.
- **Hranice scope**: battle.js zůstává NEDOTČEN, AI-vs-hráč jde přes `scheduleInsert` stub do M7b — čisté oddělení, žádný předčasný dluh. Konzistentní s mandátem (Scope OUT: battle automat = M7b).
- **Reverzibilita**: vzorec v `formulas.js` s povinným tabulkovým/replay testem; hráčské bitvy se dodají samostatně v M7b bez zpětného zásahu. Vratné.

---

## Klasifikace

- **Rozhodnuto v mandátu** (DR-013-00): ano. Žádné ze 4 rozhodnutí není nevratné, nemění scope projektu (vše uvnitř milníkové dvojice M7, downstream beze změny) ani nevyžaduje právní/bezpečnostní/rozpočtovou eskalaci.
- **Eskalace na skutečného uživatele (Toma)**: není nutná.

## Předpoklady
- Mandát DR-013-00 (delegace human gatů na tom-proxy v autonomním doběhu M5–M9, Tomův souhlas „nebudu mít čas testovat").
- Technický review hotový: reviewer T-002 GO-s-podmínkami, architekt revizí T-002a zapracoval M-1 (round-robin day-index correctness) a M-2 (re-hydratace zón, sdílená `hydrateZones`, id-based merge, fresh-vs-load test).
- Posuzuji produktovou rovinu; technické detaily (day-index vzorec, hydrateZones, persist) jsou mimo tento gate (vyřešeno reviewerem + architektem).

## Follow-up (spuštěno tímto verdiktem)
- Orchestrátor: M7a-1 je odblokováno k implementaci (dispatch coder na T1 zone tick + T4 jednotky + T5 market.inject dle §14 dekompozice).
- Acceptance-blokující položky pro M7a-1 (potvrzeno jako produktově OK): round-robin gating na `_absDay % slot` (NIKDY `curStep % dist`), fresh-vs-load hashState test, id-based `hydrateZones`.
- M7a-2 (frakční AI + revolty/questy/tribute + UI) → iter-017; DoD M7a se vyhodnotí po M7a-2.

## Blockery
–
