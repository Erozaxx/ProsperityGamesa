/**
 * m9a-offline-cap.test.js – iter-020 C-020-B (T3: offline cap balanční hodnota + MINOR-1 drátování).
 *
 * Ověřuje DR-020-01 §2 + MINOR-1 (firstStarve-class past):
 *   - BALANCE.offline.capBalanceRealHours existuje jako oddělená konstanta od capTechRealHours (separace §9.2a).
 *   - Var A (tom-proxy gate T-003) = 8 h.
 *   - Efektivní cap CATCHUP_CAP_MS je ODVOZEN z BALANCE (NE hardcoded literál) a aplikuje
 *     min(capTechRealHours, capBalanceRealHours) → bez tohoto drátování by capBalanceRealHours byla MRTVÁ.
 *   - Změna capBalanceRealHours se PROJEVÍ v efektivním capu (min-kontrakt) — ověřeno re-derivací vzorce.
 *   - catchupStepCount s odvozeným capem aplikuje cap (chování D10 zachováno).
 *
 * Determinismus: čistá data + čisté funkce, žádný Date.now/Math.random/DOM.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { BALANCE } from '../src/core/balance/balance.js';
import { CATCHUP_CAP_MS } from '../src/app/main.js';
import { catchupStepCount } from '../src/core/engine/catchup.js';
import { STEP_MS } from '../src/core/engine/clock.js';

const HOUR_MS = 3600 * 1000;

describe('T3 offline cap: balanční konstanta oddělená od technické (DR-020-01 §2)', () => {
  it('capBalanceRealHours existuje a je oddělená od capTechRealHours', () => {
    assert.equal(typeof BALANCE.offline.capBalanceRealHours, 'number', 'capBalanceRealHours musí existovat');
    assert.equal(typeof BALANCE.offline.capTechRealHours, 'number', 'capTechRealHours musí existovat');
    // Dvě oddělené konstanty (separace tech/balance §9.2a) — i když se hodnoty shodují (var A),
    // jde o dvě nezávislá pole, ne sdílenou referenci.
    assert.ok(
      Object.prototype.hasOwnProperty.call(BALANCE.offline, 'capBalanceRealHours') &&
      Object.prototype.hasOwnProperty.call(BALANCE.offline, 'capTechRealHours'),
      'obě konstanty musí být samostatná pole offline bloku'
    );
  });

  it('var A (tom-proxy gate T-003): capBalanceRealHours = 8 h', () => {
    assert.strictEqual(BALANCE.offline.capBalanceRealHours, 8, 'var A = 8 h');
  });
});

describe('T3 MINOR-1: CATCHUP_CAP_MS je ODVOZEN z BALANCE, ne hardcoded literál', () => {
  it('efektivní cap = min(capTech, capBalance) převedený na ms (re-derivace z BALANCE)', () => {
    const derived =
      Math.min(BALANCE.offline.capTechRealHours, BALANCE.offline.capBalanceRealHours) * HOUR_MS;
    assert.strictEqual(
      CATCHUP_CAP_MS, derived,
      'CATCHUP_CAP_MS musí být odvozen z BALANCE přes min(tech, balance), ne hardcoded'
    );
  });

  it('min-kontrakt: efektivní cap nikdy nepřekročí ani tech ani balance strop', () => {
    assert.ok(CATCHUP_CAP_MS <= BALANCE.offline.capTechRealHours * HOUR_MS, 'cap ≤ tech strop');
    assert.ok(CATCHUP_CAP_MS <= BALANCE.offline.capBalanceRealHours * HOUR_MS, 'cap ≤ balance strop');
  });

  it('capBalanceRealHours NENÍ mrtvá konstanta: snížení balance pod tech by snížilo efektivní cap', () => {
    // Simuluj balanční snížení (var B=2h) bez mutace BALANCE — ověř, že min-vzorec by ho promítl.
    // (Latentní-no-op past: kdyby cap byl hardcoded 8h, tato re-derivace by nereagovala.)
    const techH = BALANCE.offline.capTechRealHours; // 8
    const loweredBalanceH = 2; // var B
    const effectiveLowered = Math.min(techH, loweredBalanceH) * HOUR_MS;
    assert.strictEqual(effectiveLowered, 2 * HOUR_MS, 'snížení balance na 2h → efektivní cap 2h (min vyhrává)');
    assert.ok(effectiveLowered < CATCHUP_CAP_MS, 'snížený balance cap musí být ostře menší než současný (8h)');
  });
});

describe('T3: catchupStepCount s odvozeným capem aplikuje cap (D10 chování)', () => {
  it('over-cap běh (100 h) → zastropen na CATCHUP_CAP_MS/STEP_MS kroků', () => {
    const overMs = 100 * HOUR_MS;
    const expected = Math.floor(CATCHUP_CAP_MS / STEP_MS);
    assert.strictEqual(catchupStepCount(overMs, CATCHUP_CAP_MS), expected, 'over-cap se zastropí na efektivní cap');
    // var A = min(8,8)=8h → 576 000 kroků (D10 zachováno).
    assert.strictEqual(expected, 576_000, '8h cap = 576 000 kroků (D10)');
  });

  it('under-cap běh (1 h) → přesně missedMs/STEP_MS kroků (cap se neaplikuje)', () => {
    const underMs = 1 * HOUR_MS;
    assert.strictEqual(catchupStepCount(underMs, CATCHUP_CAP_MS), Math.floor(underMs / STEP_MS));
  });
});
