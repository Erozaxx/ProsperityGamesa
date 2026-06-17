# Close Gate — iter-020 (M9a)

- **Task**: T-008 (tom-proxy — schválení uzavření iterace)
- **Date**: 2026-06-15
- **Mandát**: auto-ano u close gate (DR-013-00)

## Verdikt: SCHVÁLENO (uzavřít iter-020, PR + merge do main)

### Odůvodnění
- **DoD M9a splněn**: trh a offline cap kalibrovány proti EXPLICITNÍM hratelnostním cílům (ne serverová data, R-C); balanc regression zelená (segmentované bit-identické běhy + golden-hash); vědomé odchylky rozhodnuty a zapsány (home.js:970 original-intended, capBalanceRealHours separace).
- **Gaty prošly**: reviewer T-007 = GO (0 blocker/0 major/0 minor/2 nit), tester T-006 = GO (8/8 AC empiricky). CI 1550/1550, smoke OK.
- **Cap rozhodnut v mandátu**: var. A = 8h (idle-friendly, reverzibilní); MINOR-1 cap odvozen z BALANCE (ne mrtvá konstanta), živě zapojen do catch-up cesty.
- **G-MARKET-DRIFT uzavřen**: driftK=0.2 calibrated.

### Eskalace
- Žádná. Vše v mandátu. 2 nity nezávazné. Carry-over (TXAUDIT, V1/V2, G-WORLD-*, atd.) → M9b/cleanup.

### Follow-up
- /close-iteration → PR feature/iter-020-init → main → merge → **M9a hotov**.
- Další: M9b (iter-021) = release kandidát (mobile UX, PWA audit, licence) — **finální R-G licence = explicitní user gate** před veřejným vydáním.
