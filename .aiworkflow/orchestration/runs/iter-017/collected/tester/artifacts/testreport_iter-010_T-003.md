# Test Report – iter-010 T-003 (M4a)

- **Verdikt**: PASS
- **Datum**: 2026-06-13
- **Tester**: tester (Sonnet)
- **Brief**: BRIEF-038
- **Scope**: M4a ekonomika (daně/upkeep/burnWood/accounting/setTaxRate/CouncilScreen)

---

## Výsledky CI

| Krok | Výsledek | Detail |
|------|----------|--------|
| `tsc --noEmit` | PASS | 0 errors |
| `lint:core` (47 files) | PASS | OK |
| `npm run test` | PASS | **693 pass, 0 fail** (bylo 668 před přidáním testů) |

---

## Nové testy (m4a-edge.test.js – 25 testů)

Vytvořen soubor `/home/user/ProsperityGamesa/test/m4a-edge.test.js` pokrývající chybějící edge cases.

### 1. setTaxRate WIRING přes send() po bootSequence (4 testy) ✓
- `setTaxRate` registrovaný v creg – send() nevrací "unknown command"
- `send('setTaxRate', {rate:4})` mutuje `state.player.taxRate`
- Clamp: rate=999 → rateMax=5
- Validace: rate='x' → `{ok:false, error: ...}`

### 2. foodSpoilage → council accounting (4 testy) ✓
- Spoilage bread (floor(0.08×100)=8) → `council.current.consumed['bread']=8`
- Spoilage fish (floor(0.23×100)=23) → `council.current.consumed['fish']=23`
- Spoilage NEZMĚNÍ gold (invariant safe): `goldEarned=0`, `goldSpent=0`
- Chybí `ctx.emitTx` → nevyhazuje výjimku

### 3. Save round-trip council + M4a fields (6 testů) ✓
- `player.taxRate=3` přežije `applyPersist → loadAndReconstruct`
- `player.totWarriors=7`, `totArchers=3` přežijí
- `player.diseaseFromColdChance=5` přežije
- `council.current.goldEarned=300`, `goldSpent=50` přežijí
- `council.history` (2 uzavřené měsíce) přežijí se správným pořadím
- `home.notEnoughMilitaryFunding=true` přežije

### 4. Catch-up accounting invariant multi-měsíc (3 testy) ✓
- Σ gold txEvents == Δ goldu za 2 měsíce (54000 kroků) – **KLÍČOVÝ TEST**
- `council.history[N].goldEarned` a `goldSpent` jsou nezáporné
- Determinismus: live == batch (gold + council history) po 1 měsíci

### 5. selectFinance selektor (5 testů) ✓
- Vrací `gold` a `taxRate` ze stavu
- `lastReport=null` při prázdné historii
- `lastReport` reflektuje `council.history[0]`
- `notEnoughMilitaryFunding` reflektuje home flag
- `taxRate` defaultuje na 1 když `undefined`

### 6. Negativní edge: nedostatek goldu → flag ne výjimka (3 testy) ✓
- `upkeepMilitary` s gold=0 → `notEnoughMilitaryFunding=true`, gold beze změny
- Flag se resetuje na `false` jakmile je zlato dostatečné
- 0 válečníků/lučišníků → flag vždy `false`

---

## Pokrytí existujících testů (výsledky ověřeny)

| Test soubor | Počet | Výsledek |
|-------------|-------|----------|
| accounting-invariant.test.js | 3 | ✓ PASS |
| accounting-observer.test.js | 7 | ✓ PASS |
| taxes.test.js | 7 | ✓ PASS |
| upkeep-burnwood.test.js | 10 | ✓ PASS |
| commands-setTaxRate.test.js | 6 | ✓ PASS |
| persist.test.js | 15 | ✓ PASS |
| catchup-invariant.test.js | 13 | ✓ PASS |
| boot-integration.test.js | 16 | ✓ PASS |
| gen-precache.test.js (PWA smoke) | 5 | ✓ PASS |
| food.test.js | celé | ✓ PASS |

---

## Klíčové nálezy

### Účetní invariant (DA5) – OVĚŘEN
```
Σ { tx.amount | tx.key === 'gold' } == gold_after − gold_before
```
Testováno:
- Ručně (3 příkazy grant/pay)
- Full tick run (27 000 kroků, přes month edge)
- Multi-month catch-up (54 000 kroků, 2 měsíce)

### WIRING – OVĚŘEN
- `ctx.emitTx = (tx) => recordTx(state, tx)` zapojen v `bootSequence` (main.js:165)
- `registerSetTaxRate(creg)` zaregistrován v `bootstrapEngine` (main.js:88)
- `setTaxRate` dosažitelný přes `send()` z UI po bootu

### Tabulkové vzorce – OVĚŘENY
| Vzorec | Test | Výsledek |
|--------|------|----------|
| monthlyTax = rate×workers×22 | taxes.test.js | ✓ 1×10×22=220 |
| localTax = localRate×workers×taxRate | taxes.test.js | ✓ 2×20×1=40 |
| militaryUpkeep = w×108+a×162 | upkeep-burnwood.test.js | ✓ 5×108+3×162=1026 |
| burnWood Zima = floor(0.5×workers) | upkeep-burnwood.test.js | ✓ floor(0.5×20)=10 |
| burnWood Léto = 0 | upkeep-burnwood.test.js | ✓ |
| burnWood Jaro/Podzim = floor(0.2×workers) | upkeep-burnwood.test.js | ✓ floor(0.2×20)=4 |
| foodSpoilage = floor(rate×count) | food.test.js | ✓ floor(0.08×100)=8 |

### Gap flags (nezměněno, dokumentováno v kódu)
- `G-TAX-LOCALRATE`: `balance.tax.localRate=2` – provenance:approximated (M9 kalibrace)
- `G-TAX-MONTHLYRATE`: `balance.tax.monthlyRate=1` – provenance:approximated (M9)
- `G-TAX-CURWORKERS`: `workforce.assigned` jako curWorkers proxy (M9)
- `G-FIREWOOD-SOURCE`: žádný producent firewood v M4a (M5 craftsman)
- `G-SEASON-START`: `curSeason=0=Jaro` vs. `balance.season.startSeason='Winter'` (M9)

---

## Bugs nalezeny
Žádné. Implementace odpovídá návrhu design_iter-010_T-001.md.

---

## Regresní rizika
- **Nízké**: Nové systémy jsou izolované (přes resource vrstva `pay`/`grant`). Observer `recordTx` je čistá funkce bez mutace paymentu.
- **Střední**: `closeMonth` (order 40) musí zůstat POSLEDNÍ v month edge – pokud někdo přidá systém s order>40 bez aktualizace `tickOrder.js`, historické reporty budou neúplné. Ošetřeno komentáři v kódu.

---

## Doporučení
**Go** – všechna AC z BRIEF-038 splněna. CI zelené, 693 testů, 0 selhání.
Iterace iter-010 (M4a) připravena k uzavření.
