# Human Gate — M7a-2 design (iter-017, T-003)

- **Task ID**: T-003 (BRIEF-017-003)
- **Iterace**: iter-017 (M7a-2 — Frakční AI & svět ožívá; dokončuje M7a)
- **Rozhoduje**: tom-proxy (jménem Toma, mandát DR-013-00 — delegace human gatů v autonomním doběhu M5–M9)
- **Datum**: 2026-06-15
- **Typ**: proxy rozhodnutí (v mandátu, nikoli eskalace)

---

## VERDIKT: **SCHVÁLENO** (proceed na implementaci M7a-2)

Design je technicky prověřen (reviewer REVIEW-017-002 GO-s-podmínkami; architekt zapracoval M-1/M-2/m-4 in-place, doc je platný — viz changelog Revize T-002a). Všechna 4 posuzovaná produktová rozhodnutí jsou plně v souladu s preferencemi Toma (**věrný rebuild, MVP-first**), v rámci scope (zadání §Scope IN: „AI svět: zóny, politiky, frakce, revolty"; „vojsko a bitvy") a navazují na schválené precedenty (DR-016-01 split, DR-013-00 mandát, gate iter-016 T-003). Žádné rozhodnutí není nevratné nad rámec běžné iterace ani nemění scope projektu → žádná eskalace na skutečného uživatele.

---

## Stanovisko ke 4 produktovým rozhodnutím

### 1. Svět plně ožívá (M7a-2 dokončuje M7a) — **OK**
Rozjetí AI světa naplno (frakce mění policies/útočí přes `processAI` 1:1 originál ř.743–991, revolty/questy/tribute, AI-AI bitvy) je přesně účel milníku M7a a doslova v zadání (Scope IN: AI svět + diplomacie, revolty). M7a-1 položil datovou/wiring kostru (zóny, frakce, gated no-op bloky), M7a-2 do nich jen dosazuje logiku — žádný nový L wiring. Toto je jádro „věrného rebuildu". Zdroj pravdy je originál `world.js`, odchylky (RNG izolace, scheduleInsert, idempotentní self-rearm) jsou catch-up/determinismus nutnosti, doložené a gapované. Tom by to chtěl rozjet — svět má ožít, ne zůstat statickou mapou (přesně třída kritiky, kterou M7a-2 odstraňuje).

### 2. favour migrace number→objekt {factionId:number} (G-FAVOUR-SHAPE) — **OK**
Oprava datového modelu směrem k originálové věrnosti je správná a prioritní — preference Toma je věrný rebuild, originál drží favour jako per-faction objekt s decay per faction. M7a-1 number byl dočasný a revolt nebyl aktivní (gated prázdný blok) → migrace `number → {}` je **bezztrátová a nedestruktivní** (číslo 0 nenese per-faction informaci). Migrace je deterministická čistá funkce (žádný RNG/Date), fresh-vs-load symetrie je chráněna, bez SAVE_VERSION bumpu, s povinným acceptance-blokujícím migračním testem (§7.5). Volba prázdného `{}` místo `{originalLiege:number}` je správně zdůvodněná (revolt blok lazy-inicializuje sám; `{}` je jednoznačnější invariant). Datový model NEopouštíme svévolně — vracíme ho na originál. Schvaluji.

### 3. AI-AI bitvy vzorcem, ne plný battle automat — **OK**
AI-AI resolve RNG vzorcem (`aiBattleResolve` 1:1 originál ř.952–981) je věrné originálu (originál sám AI-AI řeší jednorázovým vzorcem, ne sub-step automatem) a zároveň levné/deterministické pro offline catch-up (tvrdý požadavek zadání: offline progres). Plný battle automat hráčských bitev odložený do M7b/iter-018 je v souladu s DR-016-01 a precedentem gate iter-016. `battle.js` zůstává NEDOTČEN, AI-vs-player jde přes `startBattle` schedule stub. Žádná ztráta věrnosti, jen správné odložení dražší části. Konzistentní s mým předchozím verdiktem (iter-016 bod 4).

### 4. Approximace (G-CAPITAL-MISMATCH katalog; quest gating přes existující pole) — **OK s pozn.**
Přijatelné — věrnost mechanik je zachována, jde o lokalizaci zdroje pravdy a deterministické náhrady, ne o vynechání obsahu:
- **G-CAPITAL-MISMATCH**: zdroj pravdy = `faction.capitalId` z katalogu (data-driven) místo originálového hardcode — správně, konzistentní s celkovým data-driven přístupem rebuildu, navíc se schema validací.
- **quest gating (m-4)**: náhrada neexistujících originál polí (`home.level`, `militaryCouncil.discovered`) existujícími persistovanými poli (`home.settlementLevel >= questSettlementMin`, `(totWarriors+totArchers)>0`) je deterministická a funkčně věrná — a hlavně **odstraňuje tichý no-op** (bez fallbacku by se reinforcement quest nikdy nevygeneroval, což je přesně třída vady, kterou nechceme). Proxy `hasMilitary` je dokonce věrnější záměru originálu než tvrdé `true`.
- **Pozn.**: drobné kalibrační odchylky (prahy questSettlementMin, aiTurnPeriod, recallMin, military stats) jsou approximated s `provenance` a explicitně odloženy na kalibraci M9 — to je schválený vzorec (precedent G-LISTTECHS/G-LISTBUILDINGS, gate iter-015/016). Tom toto akceptoval opakovaně; balanc se ladí v M9, ne teď. Sledovat, ať gap-list zůstane úplný a M9 kalibrace tyto položky reálně dořeší.

---

## Předpoklady
- Mandát **DR-013-00** (delegace human gatů na tom-proxy v autonomním doběhu M5–M9; Tom nebude sám testovat).
- Technický review hotový: reviewer T-002 GO-s-podmínkami, architekt T-002a zapracoval M-1 (favour migrace), M-2 (per-faction set-diff guard) a m-4 (quest gating fallback) — technické detaily NEposuzuji (mimo brief, vyřešeno).
- DR-016-01: M7a-2 = T2+T3+T6 jedna iterace; po reviewer GO se vyhodnotí DoD M7a; M7b = iter-018.
- Precedens: gate iter-016 T-003 (SCHVÁLENO, stejná logika u bodů AI-AI bitvy a approximace).

## Klasifikace
**Rozhodnuto v mandátu** (auto-ano u gate v rámci scope). Žádné posuzované rozhodnutí není nevratné nad rámec iterace, nemění scope projektu (vše v Scope IN) ani rozpočet/bezpečnost/právní rovinu → **bez eskalace** na skutečného uživatele.

## Doporučený follow-up (pro orchestrátora)
- Proceed: dispatch coder (Sonnet) na implementaci M7a-2 dle dekompozice §2.7/§5/§8.4.
- Acceptance-blokující: povinné testy §7.5 (AI replay determinismus, save/load round-trip uprostřed AI aktivity, fresh-vs-load hashState, **favour migrační test 3 body**, tabulkový test `aiBattleResolve`) musí projít před reviewer GO.
- Po reviewer GO: vyhodnotit **DoD M7a** (M7a-1 + M7a-2 dohromady).
- M9 kalibrace: zajistit, že approximated gapy (G-WORLD-AITURN, G-RECALL-MIN, G-QUEST-SETTLEMENT, G-MILITARY-STATS, G-FAVOUR-LIMITS, G-QUEST-CHANCE) jsou na seznamu k dořešení.

*Proxy rozhodnutí vydané jménem Toma. Zpětně přezkoumatelné a zvratitelné. Drží preference: věrný rebuild, MVP-first, plynulost workflow.*
