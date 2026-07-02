# Agent Metrics: tester / post-iter-021

## T-ADV-002
- **Timestamp**: 2026-07-02T07:44:00Z
- **total_tokens**: 155261
- **tool_uses**: 44
- **duration_ms**: 2113208
- **model**: fable
- **note**: e2e+RUM bug-hunt (Playwright/Chromium). 10 nálezů (0 BLOCKER / 6 MAJOR / 4 MINOR). RUM čistá (0 console.error/pageerror/requestfailed/overflow). Orchestrátor nezávisle ověřil top-3 čtením kódu (send() main.js:277 bez requestRender, onImport bez IndexedDB persist, onExport tichý clipboard). Žádná změna v src/.

## T-003 (iter-022 re-verify Vlna 1)
- **Timestamp**: 2026-07-02T11:25Z
- **total_tokens**: 92806
- **tool_uses**: 26
- **duration_ms**: 1304660
- **model**: fable
- **verdikt**: #1/#2/#10 RESOLVED, #7 už vyřešen (vedl. efekt #2), 0 regrese. Go pro Vlnu 1.

## T-006 (iter-022 finální re-verify Vlna 2)
- **Timestamp**: 2026-07-02T13:30Z
- **total_tokens**: ~287000 (3 běhy: 103848+91521+resume; agent se opakovaně vracel před dokončením)
- **tool_uses**: ~85
- **model**: fable
- **verdikt**: GO. #4 harness false-negative → orchestrátor override reprodukcí. Verdikt dotažen orchestrátorem.
