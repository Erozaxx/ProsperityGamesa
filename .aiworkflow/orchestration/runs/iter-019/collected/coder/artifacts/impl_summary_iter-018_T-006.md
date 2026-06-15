# Impl Summary — iter-018 T-006 (M7b T4: banditRaid schedule + battleLog→OfflineSummary)

**Task ID**: T-006 (iter-018, M7b)
**Date**: 2026-06-15
**Agent**: coder (Sonnet)
**Gate**: `npm run ci` — 1362 tests, 0 fail (+30 nových: test/m7b-battle-t4.test.js). `npm run smoke` — OK.

---

## Soubory:funkce

| Soubor | Funkce/Sekce | Popis |
|---|---|---|
| `src/ui/OfflineSummary.js` | `selectOfflineBattles(gameState, startStep)` | NOVÁ — selektor battleLog z state.world.battleLog, filtruje na offline okno (atStep >= startStep). Čistá funkce, žádný DOM. |
| `src/ui/OfflineSummary.js` | `buildOfflineSummary(opts)` | ROZŠÍŘENO — přijímá `state` a `startStep`; integruje battles summary (total/wins/losses/playerCasualties/playerKills/hasBattles). Zpětně kompatibilní (opts.state volitelné). |
| `src/ui/OfflineSummary.js` | `formatOfflineSummary(model)` | ROZŠÍŘENO — pokud model.battles.hasBattles=true, přidá text s počtem bitev, výher, proher, ztrát a kill (§9.3). |
| `src/ui/OfflineSummary.js` | `OfflineSummaryModel` typedef | ROZŠÍŘENO — přidán field `battles: BattlesSummary`. |
| `src/ui/selectors.js` | `selectBattleLog(s)` | NOVÁ — vrací state.world.battleLog newest-first (slice().reverse()). Žádná logika, jen čtení + reverze. |
| `src/app/main.js` | `bootSequence` | AKTUALIZOVÁNO — `buildOfflineSummary` volán s `state` a `startStep` pro battle log integraci (§9.3). |
| `test/m7b-battle-t4.test.js` | 30 testů | Nové gate testy: BT4-1..BT4-11 (banditRaid schedule, idempotent arm, AI invaze, battleLog selektor, offline summary, determinismus, catch-up auto-resolve). |

**Poznámka T-004 (již hotové, NEsahnuté v T-006)**:
- `banditRaid` handler a `armBanditRaid` — implementovány T-004 v `battle.js`
- `armBanditRaid` volán z `main.js` bootSequence — T-004
- `_recordBattleHistory` → `state.world.battleLog` v `resolveBattleOutcome` — T-004
- `registerWorldEffects` registruje `banditRaid` handler — T-004

---

## Co bylo ZBÝVAJÍCÍ a implementováno v T-006

### 1. battleLog→OfflineSummary (§9.3)

**`selectOfflineBattles(gameState, startStep)`** (OfflineSummary.js):
- Čte `state.world.battleLog[]` (plain pole, max 50 záznamů dle T-004 rotace)
- Filtruje záznamy s `atStep >= startStep` (offline okno)
- Null-safe pro `gameState=null`

**`buildOfflineSummary`** rozšíření:
- Přijímá `opts.state` (volitelné) a `opts.startStep` (volitelné, default 0)
- Volá `selectOfflineBattles` → agreguje `total/wins/losses/playerCasualties/playerKills/hasBattles`
- Zpětná kompatibilita: bez `state` → `battles = { total:0, wins:0, losses:0, ..., hasBattles:false }`

**`formatOfflineSummary`** rozšíření:
- Přidá bitevní text pouze pokud `model.battles.hasBattles === true`
- Text: „Proběhlo N bitev: X výher, Y proher. Ztráty: Z, nepřátelé poraženi: K."

**`selectBattleLog`** (selectors.js):
- Čte `state.world.battleLog`, vrací newest-first (bez logiky v UI — C3)

**`main.js` aktualizace**:
- `buildOfflineSummary({ ..., state, startStep: state.engine.curStep - result.stepsRun })`

### 2. banditRaid schedule (ověřeno — bylo hotové v T-004)

Test BT4-1/BT4-2 ověřují, že:
- `armBanditRaid` přidá přesně 1 záznam `banditRaid` do schedule
- Idempotentní (druhé volání nepřidá další)
- Pokrývá "staré savy" bez `banditRaid` v schedule (anti-DR-012-02)

Test BT4-3 ověřuje:
- `banditRaid` handler nastaví `state.battle` (isBandit=true)
- Self-rearm (nový schedule entry)
- No-op při existující bitvě (one-battle guard)

---

## Determinismus

- `selectOfflineBattles`: čistě deterministická (čte pole, filtruje, bez rng)
- `buildOfflineSummary`: deterministická (čistá funkce nad state.world.battleLog)
- `banditRaid` handler: deterministický (scheduleInsert + createBattleState, žádný rng při armování)
- Catch-up auto-resolve: G2 — `battleTick` identický live i offline (prázdná queue → obranná AI)
- `state.world.battleLog` je součástí state → součást save → fresh-vs-load konzistentní

---

## Gate výsledek

```
npm run ci:
  - typecheck: OK
  - lint:core: OK
  - tests: 1362 tests, 1362 pass, 0 fail

npm run smoke: OK — SMOKE OK: app rendered, 0 console errors.

Nové testy (test/m7b-battle-t4.test.js):
  - 30 testů, 30 pass, 0 fail

Existující testy (nedotčené):
  - test/offline-summary.test.js: 15 pass (zpětná kompatibilita buildOfflineSummary ✓)
  - test/app-bootstrap.test.js: 8 pass
  - test/boot-integration.test.js: 16 pass
  - test/m7b-battle-t1.test.js: 37 pass
  - test/m7b-battle-t3.test.js: 35 pass
  - M7a + M5/M6/M4b: nedotčené

Determinismus G1: ✓ (BT4-4 + BT4-10 deterministický catch-up)
M7b battle (m7b-battle-t1/t3): ✓ (37+35 pass)
M7a + M5/M6/M4b: ✓ nedotčené
```

---

## Scope OUT (nesahnuto)

- `processAI`: nesahnuto (scope OUT dle brief)
- Battle screen UI (T5/T-007): nesahnuto
- `battleStep`/`battleCommand` (T1/T2/T3): hotové, nesahnuto
