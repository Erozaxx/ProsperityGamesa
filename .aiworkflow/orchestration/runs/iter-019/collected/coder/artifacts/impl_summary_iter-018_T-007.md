# Implementation Summary — iter-018 T-007 (T5 Battle UI Screen)

- **Task**: T5 (battle UI screen) — dokončuje M7b a celé M7
- **Date**: 2026-06-15
- **Gate**: PASS

---

## Soubory a funkce

### src/ui/selectors.js — `selectBattle` (řádky 762–909, již existovalo)
- Čte `state.battle` (BattleState nebo null)
- Deriváty ZDE (ne v UI):
  - `available` = `cd===0 && number>0 && state==='running'`
  - `cdPct` = `round(cd/lastMaxCD*100)` — pro progress bar nabíjení
  - `progressPct` = casualties / totalStarting × 100 — celkový postup bitvy
  - `log` — slice max 30 záznamy (ring buffer ze state)
- Vrací `BattleView` s `active/state/zoneId/player/opponent/actions/log/progressPct/summary`
- Pure read — žádné mutace, žádný DOM

### src/ui/screens.js — `BattleScreen` (řádky 735–916, již existovalo)
- Pure komponenta `{snapshot, send}`
- Čte přes `selectBattle(snapshot)` — nulová herní logika v UI
- Zobrazuje:
  - Žádná bitva → prázdný stav s textem
  - Status + progress bar (progressPct % ztráty)
  - Two-column sides: player (válečníci/lučišt. / počet / ztráty) vs opponent
  - Akce: warriorActions (charge/shieldWall/flank) + archerActions (volley/fireArrows)
    - `send('battleCommand', { side, action })` — disabled dle `a.available`
    - CD progress bar při nabíjení (100-cdPct)
  - Výsledek (summary) když `state==='done'`
  - Battle log (ring buffer, 30 záznamů)
- `_renderSummary(summary)` — pure helper pro výsledek

### src/ui/App.js — tab 'battle'
- Přidán do `TABS` array: `{ id: 'battle', label: 'Bitva' }`
- Wiring v tab-content: `${activeTab === 'battle' ? html\`<${BattleScreen} snapshot=${snapshot} send=${send} />\` : null}`
- `BattleScreen` byl již importován

### src/ui/styles.css — battle screen styly
- `.screen-battle`, `.battle-status-row`, `.battle-state-badge`
- `.battle-sides` (grid 1fr auto 1fr), `.battle-side-player/opponent`
- `.battle-actions-section`, `.battle-actions-row`, `.battle-action`, `.battle-action-btn`
- `.battle-cd-bar` (progress bar pro cooldown)
- `.battle-outcome`, `.battle-summary-dl`, `.battle-win/loss`
- `.battle-log-section`, `.battle-log-entry`, `.battle-log-player/opponent/system`
- Mobile-first: `@media (max-width: 480px)` — stacked layout, battle-vs hidden

### test/ui-selectors-battle-t5.test.js — 23 nových testů (8 describe bloků)
- SB-1: no battle → active=false, prázdné defaults
- SB-2: active battle → sides mapped, unit numbers
- SB-3/4/5: available iff cd=0 && number>0 && state=running
- SB-6: cdPct derivation + edge case lastMaxCD=0
- SB-7: log forwarded, capped at 30, empty when no battle
- SB-8: progressPct derivation (0%, 100%, partial)
- SB-9/13: summary forwarded, done state = all unavailable
- SB-11/12: warrior (charge/shieldWall/flank) + archer (volley/fireArrows) catalog
- SB-10: purity — repeated calls same result, no mutation of state.battle or log

---

## Gate výstup

| Gate | Výsledek |
|---|---|
| `npm run ci` | **PASS — 1385 tests, 0 fail** (+23 nových selectBattle testů) |
| `npm run smoke` | **SMOKE OK** — app rendered, 0 console errors, "Bitva" tab viditelný |
| Determinismus G1 | OK — m7b-battle-t1 (37 pass), t3 (35 pass), t4 (30 pass) nedotčeny |
| M7a + M5/M6/M4b | Nedotčeny |
| Selektory čisté read | selectBattle: pure, no DOM, no mutation (SB-10 testy) |
| Žádný DOM v core | OK — jen UI vrstva |

---

## Co UI pokrývá

- **Žádná bitva** → prázdný stav s informativním textem (čeká na startBattle z T4)
- **Aktivní bitva** → live displej obou stran (počty/ztráty), progres %, log zpráv
- **Akce** → 5 tlačítek (charge/shieldWall/flank/volley/fireArrows) s cooldown progress barem
  - disabled dle `selectBattle.actions[i].available` (cd/number/state — vše v selektoru)
  - `send('battleCommand', {side, action})` → enqueue v battleCommand.js handler
- **Výsledek** → `_renderSummary(summary)` když `state==='done'`
- **Prázdný stav po bitvě** → state.battle=null po resolveBattleOutcome → `active=false`

---

## Playtest feel poznámky (R-D, pro M9)

1. **Battle tick 30ms, STEP_MS=50ms** → ~1.67 battle-ticks/herní step. Při speed=1 hra krokuje každých 50ms → bitva "sekne" jen o 1 tick per render. Vizuálně: cooldown bary se pohybují pomalu. Doporučení M9: zvážit render na každý animationFrame (requestAnimationFrame), ne jen na step-edge.

2. **Cooldown progress bar** `cdPct` jde od 100% (právě zaútočeno) → 0% (připraveno). Bar zobrazuje `100-cdPct` jako "fill", tj. vizuálně se plní. Přirozenější by bylo přejmenovat na "readyPct" — M9 UX kalibraci.

3. **Log ring buffer (30 záznamy)** — je-li bitva intenzivní (~2 týmy útočí každých 80/120 tiků), 30 zpráv odpovídá cca 30-50 tiků = 1-1.5 sekundy reálné bitvy. Doporučení M9: závisí na délce bitvy; pro playtest začít s 30, případně zvýšit na 50-100.

4. **Actions grouped by unit type** (válečníci/lučištníci) — přehledné, vizuálně odlišuje role. Doporučení M9: barevné rozlišení (zelená=válečníci, modrá=lučištníci) pro rychlou orientaci v bitvě.

5. **Progress bar "% ztráty"** (casualties / totalStarting) — ukazuje intenzitu bitvy, ne čas. Může být matoucí: 50% ztráty = napínavá bitva, ale čas neznámý. M9: zvážit přidání "tik / max" counteru.

6. **shieldWall (multiplier=0, focus=[])** — vizuálně se chová jako pasivní buff (dvojnásobná obrana), nikoli útok. Hráč může stisknout tlačítko a "nic nevidí". M9: přidat log zprávu pro shieldWall aktivaci v battle.js, nebo vizuální indikátor "Štít aktivní".
