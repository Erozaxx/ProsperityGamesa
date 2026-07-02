# Review — DESIGN M7a-2 (iter-017, T-002)

- **Review ID**: REVIEW-017-002
- **Reviewer**: reviewer (Opus)
- **Datum**: 2026-06-14
- **Předmět**: `agents/reviewer/context/refs/design_iter-017_T-001.md` (architektonický návrh M7a-2, PŘED implementací)
- **Ověřeno proti**: kódu (`world.js`, `contracts.js`, `scheduler.js`, `main.js`, `persistSchema.js`, `load.js`, `createInitialState.js`, `calendar.js`, `balance.js`, `zones.json`) + originál `doc/original_source/.../world.js`.

---

## VERDIKT: **GO-S-PODMÍNKAMI**

Design je věcně správný, věrný originálu, proveditelný Sonnet coderem a anti-DR-012-02 vzor self-rearm je správně navržen. **2 MAJOR podmínky** (favour migrace + persist favour shape; armFactionAI set-difference jako závazný, ne „alternativa") MUSÍ být zapracovány do designu/instrukcí coderovi před implementací. Ostatní nálezy jsou minor/nit.

| Téma | Posouzení |
|---|---|
| **Self-rearm determinismus (DR-012-02)** | **OK** — vzor je správný (nepodmíněný re-arm, boot-only arm, set-diff guard). Jediná podmínka: guard MUSÍ být set-difference (M-2), ne „od konce". |
| **favour shape migrace (regrese M7a-1?)** | **RIZIKO — ANO, potenciální regrese**, pokud se neopraví persist `favour \|\| 0` (persistSchema.js:259) a migrace number→{} v hydrateZones. Viz M-1. Po opravě bez regrese. |
| **Split (T2 L + 2×M)** | **SOUHLAS — NEsplit je správně.** Odůvodnění §1.1 designu platné, potvrzeno proti kódu (kostra M7a-1 hotová). |

---

## Posouzení 3 kritických bodů (povinné)

### A) Self-rearm determinismus (DR-012-02 třída) — OK, vzor správný

Ověřeno proti `contracts.js` (`armContractOffer` ř.262-267) a `main.js` (boot ř.199):

- **Vzor `armContractOffer` potvrzen**: boot-only volání z `bootSequence` jednou (main.js:199, za marketInit), guard `scheduleCountOf('contract.offer')===0`, deterministické (žádný RNG/Date při armování). Design `armFactionAI` tento vzor **správně zrcadlí** (§2.4, §7.3).
- **Nepodmíněný re-arm potvrzen jako správný**: design §2.4 re-armuje `world.processFaction` na konci handleru VŽDY (i pod prahem `aiMechanicStart`, i u `state===7`), čtení rng AŽ po gate a jen pokud `state!==7`. To je přesně anti-DR-012-02: schedule entry nikdy nevymizí → po loadu uprostřed neaktivního období se smyčka nepřeruší. `processFaction` čte rng deterministicky závisle jen na `faction.state` (persistován, persistSchema.js:283-286) + `curStep` (persistován) → replay-determinismus drží. **Schváleno.**
- **Žádná load-only ani init-only větev**: `armFactionAI(state)` jediná cesta z bootSequence (fresh i load i starý M7a-1 save) — správně, mirror M5-R1 gate.
- **Determinismus pořadí 3 frakcí**: ověřeno `scheduler.js` `less()` (ř.13-15): tie-break `seq` ascending = FIFO podle insertu. `_seq` persistován (persistSchema.js:67). Insert v pevném pořadí `factionIds` → deterministické pořadí, přežije save/load. **OK.**

**Podmínka (viz M-2 níže):** Per-faction guard. Ověřeno proti `scheduler.js`: `scheduleCount` je indexován výhradně podle `id` (ř.82), NE podle params. 3 entries se stejným `id='world.processFaction'` → `scheduleCountOf` vrátí 3, **nerozliší která frakce chybí**. Design to v §2.4 sám správně diagnostikuje a navrhuje set-difference scan jako „doporučenou robustní variantu". **MAJOR**: tato varianta musí být ZÁVAZNÁ (ne „alternativa"), protože „doplnění od konce" (`i = armed`) selže při neúplném/asymetrickém stavu (chybějící prostřední frakce). Viz M-2.

### B) favour shape migrace (G-FAVOUR-SHAPE) — RIZIKO REGRESE M7a-1, řešitelné

Ověřeno proti kódu a originálu:

- **Originál**: `zone.favour` je **objekt** `{factionId:number}`, lazy-init `if(!zone.favour){zone.favour={}}` (ř.291-296), indexace `zone.favour[zone.liege]`, `zone.favour.thePrincess`, `zone.favour.player` (ř.298-365, 441, 474). Design §3.1 to popisuje věrně. **Správně.**
- **Současný kód (M7a-1)**: `favour` je **number** všude:
  - `zones.json`: všechny zóny `"favour": 0` (number).
  - `hydrateZones` (world.js:377): `favour: saved?.favour ?? (def.favour ?? 0)` → number.
  - **`persistSchema.js:259`**: `favour: z.favour || 0` ← **KRITICKÉ**. Toto SAVE převede `favour` zpět na `0` (number), pokud je objekt prázdný/falsy. Prázdný objekt `{}` je truthy → `{} || 0` = `{}` (přežije), ALE design §3.1 tvrdí „persist generický průchod OK" — to NENÍ pravda: `favour: z.favour || 0` je **explicitní per-field handler s `|| 0` fallbackem**, ne generický. Pokud `z.favour` je `{}` (prázdný), `|| 0` ho zachová (truthy), takže OK; ale tvrzení o generickém průchodu je nepřesné a `|| 0` fallback je zavádějící pro objektový tvar (měl by být `?? {}`).

**Závěr k regresi M7a-1**: revolt mechanika v M7a-1 nebyla aktivní (gated `revoltMechanicStart`, prázdný blok world.js:281-283), takže žádný save NEOBSAHUJE neprázdný favour objekt → migrace number→{} je nedestruktivní (žádná data se neztrácí). **ALE** dvě konkrétní místa MUSÍ být opravena, jinak vznikne fresh-vs-load drift (regrese M7a-1 hashState gate):

1. **`hydrateZones` migrace** (M-1): musí explicitně mapovat `typeof saved.favour === 'number' → {}` a `def.favour` (number v zones.json) → `{}`. Současný `?? (def.favour ?? 0)` produkuje number → po revolt aktivaci by `zone.favour[liege]` byl undefined index na number → NaN/crash.
2. **`persistSchema.js:259`**: změnit `favour: z.favour || 0` → `favour: z.favour ?? {}` (nebo deep-copy objektu). Jinak: fresh state má `favour={}` (po migraci), ale save→load round-trip by mohl `{}` projít, zatímco jiné cesty number — **asymetrie tvaru** mezi fresh a load → hashState mismatch (DR-012-02 regrese M7a-1).

Po těchto dvou opravách + fresh-vs-load test (design §7.5 ho povinně vyžaduje) **regrese M7a-1 nehrozí**. Bez nich = MAJOR riziko. Viz M-1.

### C) Split — SOUHLAS (NEsplit)

Ověřeno proti kódu, že kostra M7a-1 je skutečně hotová a M7a-2 jen čte/mutuje:
- `hydrateZones` produkuje per-faction objekt vč. dynamiky `state/wantToAttack/nextTarget` (world.js:399-414) — připraveno.
- `processZone` má prázdné gated bloky revolt (world.js:281-283) i quest (world.js:285-286) — M7a-2 jen naplní.
- `world.factions` v persist allowlistu (persistSchema.js:24), save jen dynamika (ř.282-286) — hotovo.
- `scheduleInsert`/`scheduleCountOf` existují a fungují (scheduler.js) — žádný nový engine wiring.

Zátěž 1×L (T2) + 2×M (T3, T6), kostra hotová, jeden souvislý AI replay test pokrývá T2+T3. Odůvodnění §1.1 designu je konzistentní s kódem. **NEsplit potvrzuji.** Kontrakty §8/§8.2 beze změny signatur (ověřeno: `getGoldValue`/`marketInject` v market.js, `processZone` signatura, žádná změna) — souhlas.

---

## Nálezy

### MAJOR

**M-1 (favour shape — persist `|| 0` + hydrateZones migrace, regrese M7a-1).**
Design §3.1 tvrdí „persist generický průchod OK" a „migrace v hydrateZones — pokud `saved.favour` je number → nahradit `{}`". Proti kódu: (a) `persistSchema.js:259` má explicitní `favour: z.favour || 0` (number fallback, NE generický průchod) — musí se změnit na `favour: z.favour ?? {}` aby objektový tvar přežil save symetricky; (b) `hydrateZones` (world.js:377) musí explicitně migrovat `typeof favour==='number' → {}` a `def.favour` (zones.json number) → `{}`. **Návrh**: doplnit do designu §3.1/§10 explicitní instrukci coderovi pro OBĚ místa (persistSchema.js:259 + hydrateZones:377 + zones.json favour:0→{} nebo migrace) + povinný fresh-vs-load hashState test ZAMĚŘENÝ na favour tvar. Bez toho = fresh-vs-load drift (DR-012-02 regrese M7a-1).

**M-2 (armFactionAI guard MUSÍ být set-difference, ne „od konce").**
Design §2.4 uvádí „doplnění od konce (`i=armed`)" jako primární a set-difference jako „doporučenou alternativu". Proti `scheduler.js`: `scheduleCountOf` indexuje jen podle `id` (ř.82), nerozliší frakce. Varianta „od konce" předpokládá, že armed entries jsou prefix `factionIds` — to NEPLATÍ při asymetrickém stavu (např. starý save s 1 živou entry pro prostřední frakci, nebo po cancelu). **Návrh**: učinit set-difference scan ZÁVAZNÝM kontraktem (ne alternativou): `const live = new Set(state.engine.schedule.filter(e=>e.id==='world.processFaction').map(e=>e.params.factionId)); for (const fid of factionIds) if(!live.has(fid)) scheduleInsert(...)`. Deterministické pořadí dané `factionIds`. To je jediná varianta robustní vůči libovolnému stavu schedule (fresh/plný/částečný) — přesně anti-DR-012-02.

### MINOR

**m-1 (G-AISTATES-REWRITE — re-mapování `state` při loadu starého savu).**
`zones.json.aiStates` jsou diplomatické placeholdery (Neutral…Vassal, id 0-7). Design §2.1 je přepisuje na originál semantiku a tvrdí „všechny M7a-1 frakce mají state=0=default → kompatibilní". Ověřeno: `hydrateZones` (world.js:410) default `state: saved.state ?? 0`. V M7a-1 frakce nepřecházely (processAI neexistoval) → všechny `state=0`. Re-mapování 0→default tedy bezpečné. **ALE** pozor: pokud by jakýkoli M7a-1 mechanismus zapsal `state>0` (nezdá se, ale ověř), re-mapování by změnilo sémantiku. **Návrh**: coder ověří, že žádný M7a-1 kód nemutuje `faction.state` (grep) — jinak je migrace nejednoznačná. Pravděpodobně no-op, proto minor.

**m-2 (originál: `redistributeForces` se volá JEN ve AI-AI větvi, ne pro player-target).**
Ověřeno proti originálu (ř.983): `redistributeForces` je uvnitř `else` (non-player target) bloku, NENÍ volán když target je player. Design §4 (řádek `redistributeForces(state, attackerId, rng) // ř.983`) to uvádí na konci pseudokódu pro AI-AI větev — správně, ale formulace je mírně dvojznačná (mohla by svádět k volání i pro player branch). **Návrh**: explicitně v designu §4 uvést „redistributeForces JEN v AI-AI (non-player) větvi, NE pro startBattle/player větev (orig ř.983 uvnitř else)".

**m-3 (originál: state 7 NENÍ v AISTATES enumu).**
Ověřeno: originál `AISTATES` (ř.13-21) má jen 0-6; state 7 (incapacitated) je použit v `processAI` (ř.851) ale není v enumu. Design §2.1 přidává id 7 do tabulky — to je legitimní (kód ho používá), ale je to odchylka od originál enumu. **Návrh**: označit state 7 v aiStates jako `provenance:'extracted-from-code'` (ř.767/851), ne z enumu — drobnost pro věrnost gap-trackingu (design to v M7a-1 §changelog n-1 už zmiňuje, jen sjednotit).

**m-4 (quest gating: `home.level>=2` a `militaryCouncil.discovered` v state NEEXISTUJÍ).**
Ověřeno: grep `home.level`/`militaryCouncil` v `createHomeState.js`/state = 0 výskytů. Originál quest-gen čte `$rootScope.world.home.level>=2` (ř.372) a `militaryCouncil.discovered` (ř.454 `hasMilitary`). Design §5.1 to řeší gap G-QUEST-HOMELEVEL (fallback `true`/práh). **Návrh**: design by měl explicitně uvést, že OBA prereky (`home.level` i `militaryCouncil.discovered`) v M7a-2 chybí → `hasMilitary` musí mít deterministický fallback (návrh: `true` nebo proxy přes `player.totWarriors>0`), jinak reinforcement quest (jediný aktivní typ) se NIKDY nevygeneruje → quest sekce by byla tichý no-op (jako kritizovaný M-1 v M7a-1). Doplnit do §5.1.

**m-5 (G-CAPITAL-MISMATCH — capitalId v zones.json je konzistentní, ale liší se od originálu).**
Ověřeno: zones.json faction defs mají `capitalId`: warlord→silverInslet, princess→kitsilano, psychopath→hornCastle. Originál hardcoduje (ř.761-766): warlord→dickinsonLanding, princess→castleGrey, psychopath→hornCastle. Design §2.2 rozhoduje „zdroj pravdy = katalog capitalId" — OK, ale zones.json `silverInslet`/`kitsilano` mají `capital:true` a správný liege, takže schema-validace projde. **Pozn.**: jen psychopath (hornCastle) sedí s originálem; warlord/princess se liší. Akceptováno (data-driven), ale schema validátor (§2.6) MUSÍ ověřit existenci capital zóny per faction — minor připomínka aby validace byla skutečně implementována (ne jen v designu).

### NIT

**n-1 (favour v selektoru — derivace player favour z objektu).**
Design §8.1 `selectWorldZones` „favour (player favour number derivovaná z favour objektu)". OK, ale uveď explicitně `zone.favour?.player ?? 0` (undefined-safe), protože ne každá zóna má klíč `player`.

**n-2 (tribute order 25 — ověřeno správné umístění).**
Design §6.2/§9 `world.gatherTributes` month order 25 mezi `taxes.monthly` (20) a `upkeep.military` (30). Konzistentní s M7a-1 rezervací. Žádná akce, jen potvrzení správnosti pořadí (tribute příjem před upkeep platbou).

**n-3 (immunity tvar).**
zones.json `immunity` je boolean (`true`/`false`), hydrateZones `immunity: def.immunity || 0` (world.js:368) → boolean nebo 0. Revolt immune-check (design §3.2) používá hardcoded seznam zón (orig ř.285-288), NE `zone.immunity` flag — konzistentní s originálem. Jen pozn.: `zone.immunity` pole je tím pádem nevyužité (hornCastle má `immunity:true`, ale revolt používá hardcode). Bez dopadu.

---

## Ověření ostatních bodů briefu

| Bod | Status |
|---|---|
| **processAI determinismus** (1:1 originál, Math.random→rng('world'), Engine.insert→scheduleInsert, params objekt) | **OK** — design §2.3 mapuje všechny rng/insert body věrně (ověřeno proti orig ř.771-979). `randRound(x,rng)` už existuje (world.js:33). Žádný Math.random/Date.now/DOM. params objekt místo pole `[ai]`→`{factionId}` správně (scheduler bere objekt, ř.79). |
| **AI-AI bitvy vzorcem** (aiBattleResolve formulas.js, battle.js NEDOTČEN, AI-vs-player→startBattle stub) | **OK** — design §4 vzorec 1:1 originál (ř.952-981 ověřeno: warr/archResults, win/lose větve, psychopath special ř.966-970, takeOver+400). battle.js explicitně NEDOTČEN. startBattle=M7b stub. Tabulkový test povinný. |
| **Revolty** (gated revoltMechanicStart, immune kombinace, favour drain) | **OK** — design §3.2 věrný originálu (immune ř.285-288, drain base −2/policy/unit-count/regional, favour<5 revolt, neutral decay ř.352-367, fixFavourLimits). Pozn.: orig `fixFavourLimits` je JEN v non-neutral větvi (ř.351), ne v neutral — design to neřeší explicitně, ale je to věrné originálu. |
| **Questy** (questSeq, rng world, getGoldValue, absolutní deadlineStep) | **OK** s m-4 — deterministické ID `quest_<questSeq>` (vzor contractSeq:236), deadlineStep absolutní, getGoldValue. questSeq/quests NEEXISTUJÍ v kódu → musí se přidat (design §10 to řeší, G-QUEST-PERSIST). |
| **Tribute** (gatherTributes month order 25, persist) | **OK** — design §6 věrný orig ř.527-565 (player→grant, AI→capital gold přes getGoldValue, zone.resources={}). |
| **UI** (selektory + commands, žádná logika v UI) | **OK** — design §8 selektory/screen/tab vzor M3/M5-2/M6, ratingy on-demand v selektorech. |
| **Persist** (quests/questSeq přidat, favour objekt) | **OK** s M-1 — quests/questSeq do allowlistu + hydrateZones init. favour objekt = viz M-1 (persist `|| 0` musí na `?? {}`). |

---

## Podmínky pro GO (závazné před implementací)

1. **M-1**: Doplnit do designu §3.1/§10 explicitní coder-instrukci pro favour migraci na DVOU místech: `persistSchema.js:259` (`favour: z.favour || 0` → `?? {}`) + `hydrateZones` (world.js:377, number→{} migrace) + zones.json `favour:0`→`{}` nebo migrace. Povinný fresh-vs-load hashState test cílený na favour tvar.
2. **M-2**: Učinit set-difference scan v `armFactionAI` ZÁVAZNÝM (ne alternativou) — guard přesný i při neúplném stavu schedule.

Minor/nit (m-1..m-5, n-1..n-3) doporučeny k zapracování, nejsou blokující.

---

## Shrnutí

- **Self-rearm determinismus**: vzor správný (nepodmíněný re-arm, boot-only arm mirror armContractOffer, set-diff guard). Bez load-only/init-only větve. Podmínka: set-difference guard závazný (M-2).
- **favour migrace**: **riziko regrese M7a-1 ANO**, ale řešitelné — `persistSchema.js:259 || 0` a `hydrateZones` number→{} migrace musí být opraveny (M-1); jinak fresh-vs-load drift. Revolt nebyl v M7a-1 aktivní → žádná data se neztrácí, migrace nedestruktivní.
- **Split**: NEsplit potvrzen (kostra M7a-1 hotová, ověřeno proti kódu).
- **Nálezy**: 0 blocker, 2 major (M-1 favour, M-2 guard), 5 minor, 3 nit.

**Verdikt: GO-S-PODMÍNKAMI** (M-1 + M-2).

*Konec review.*
