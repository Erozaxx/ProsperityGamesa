# Agent Metrics: coder / iter-012

## T-005..T-009
- **Timestamp**: 2026-06-13T18:46:57Z
- **total_tokens**: 192176
- **tool_uses**: 183
- **duration_ms**: 1529513

## T-014 (reload-determinismus fix Option A) — BLOCKED→eskalace
- **Timestamp**: 2026-06-13T19:15Z
- **total_tokens**: 88142
- **tool_uses**: 64
- **duration_ms**: 602150
- **outcome**: Option A korektní (G1 zelený), ale odhalil hlubší preexist. díru (workforce.total=0 na 1. ticku spojitého simu) → 2 cizí testy red → eskalace na architekta (T-015)

## T-016 (derive-on-init dotažení)
- **Timestamp**: 2026-06-13T20:30Z
- **total_tokens**: 53956
- **tool_uses**: 41
- **duration_ms**: 286209
- **outcome**: plné npm run ci ZELENÉ (778/778), 2 dříve red testy zelené, G1 16/16, smoke OK; determinismus díra uzavřena

## T-017 (review F-1+F-2 oprava)
- **Timestamp**: 2026-06-13T22:45Z
- **total_tokens**: 56655
- **tool_uses**: 42
- **duration_ms**: 286545
- **outcome**: ci 780/780 zelené, smoke OK, determinismus G1+playability 25/25 nedotčen; R-A4-3 over-cap guard + sanityCap helper reuse + regress test
