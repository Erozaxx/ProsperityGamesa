# Impl Summary — iter-017 T-006 (M7a-2 UI world/zones screen)

- **Task ID**: T-006 (iter-017)
- **Milestone**: M7a-2 dokončení (M7a celé)
- **Datum**: 2026-06-15
- **Coder**: Sonnet (claude-sonnet-4-6)

## Změny (soubor:funkce)

### `src/ui/selectors.js`
- **`selectWorldZones(s)`** — vrací pole zón s: id, name, liege, liegeName, liegeColor, originalLiege, policy, policyName, numWorkers, warriors, archers, favour (player favour z objektu, undefined-safe), militaryRating (calcMilitaryRating on-demand), economicRating (calcEconomicRating on-demand), neighbours, curQuest
- **`selectFactions(s)`** — vrací pole frakcí s: id, name, color, state, stateName (z aiStates katalogu), capitalId, capitalName, aggression, totalZones (count), totalWarriors, totalArchers, wantToAttack
- **`selectQuests(s)`** — vrací pole questů s: id, from, fromName, type, title, description, req, reward, deadlineStep, daysLeft (derivovaný z curStep), canAccept (totWarriors/totArchers check), reward
- Přidán import `findQuest` z `world.js` (byl potřeba pro import kontrolu), `FACTION_COLORS` jako `Record<string, string>`
- Ratingy derivované on-demand (NEukládají se) — §10 design

### `src/ui/screens.js`
- **`WorldZonesScreen({ snapshot, send })`** — pure komponenta, žádná herní logika:
  - Zóny: tabulka (`zones-table`) s liege (barevné), policy, dělníci, válečníci, lučištníci, přízeň, vojenský/ekonomický rating, sousedé; okupované zóny zvýrazněny (`zone-occupied`)
  - Frakce: seznam (`faction-list`) — stav, zóny, armáda, agrese, wantToAttack varování
  - Questy: panel (`quest-list`) — accept → `send('acceptQuest', {questId})` / reject → `send('rejectQuest', {questId})`; deadline, odměna, `canAccept` guard
- Import `selectWorldZones`, `selectFactions`, `selectQuests` z `selectors.js`

### `src/ui/App.js`
- Přidán tab `{ id: 'world-ai', label: 'Svět' }` do `TABS`
- Import `WorldZonesScreen` z `screens.js`
- Wiring: `${activeTab === 'world-ai' ? html\`<${WorldZonesScreen} snapshot=${snapshot} send=${send} />\` : null}`

### `src/ui/styles.css`
- Styly pro `.screen-world-zones`: sekce, tabulka zón (`.zones-table`), frakce (`.faction-list`, `.faction-item`), questy (`.quest-list`, `.quest-item`)
- Colour helpers: `.zone-occupied`, `.favour-neg`, `.favour-high`, `.faction-danger`, `.deadline-urgent`
- Mobile-first: `@media (max-width: 480px)` zmenšení tabulky, `overflow-x: auto` přes `.table-scroll`

### `test/ui-selectors-world-t6.test.js` (nový)
- 28 testů pokrývajících: `selectWorldZones` (militaryRating derivation, favour undefined-safe, policyName, occupied detection, neighbours), `selectFactions` (totalZones/Warriors/Archers, wantToAttack, multiple factions), `selectQuests` (daysLeft derivation, daysLeft=0 past deadline, canAccept true/false/empty-req, fromName resolution, pure read / no mutation)

## Gate výsledek

- **`npm run ci`**: 1255 tests, **0 fail** (28 nových T6 testů přidáno, původní 1227 nedotčeny)
- **`npm run smoke`**: SMOKE OK, boot + render world screen bez console chyb (tab "Svět" viditelný ve výstupu)
- **Determinismus G1**: selektory jsou čisté read-only funkce, žádný Date.now/Math.random/side-effect
- **M7a-1 round-trip + T2 + T3 + M5/M6/M4b**: nedotčeny (0 fail); selektory nespouštějí žádnou mutaci
- **battle.js**: NEDOTČEN
- **Precache**: regenerován (`node tools/gen-precache.mjs` → 103 files), precache testy (ok 125-129) zelené
- **Žádný DOM v core**: selektory importují jen `calcMilitaryRating`/`calcEconomicRating` (čisté pure fn), žádný přístup k DOM

## Co UI pokrývá

- Mapa/seznam zón: liege (barevný), policy (lidsky čitelná), počty vojsk, přízeň hráče, vojenský+ekonomický rating, sousedé, označení okupovaných zón
- Frakce/diplomacie: stav frakce (stateName), počet zón, celková armáda, agrese, upozornění na wantToAttack
- Questy panel: accept/reject buttons → volají `send('acceptQuest'/'rejectQuest')` → volají T3 commandy (hotové), canAccept guard, deadline countdown, odměna
- Žádná herní logika v UI komponentě — vše přes selektory (čtení) a send/commands (zápis)
