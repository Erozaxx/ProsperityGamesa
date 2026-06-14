## T-004 (T1 building instances)
- **Timestamp**: 2026-06-14T03:00Z
- **total_tokens**: 163513
- **tool_uses**: 165
- **duration_ms**: 1230984
- **outcome**: ci 807/807, smoke OK, G1 pass; buildings.js + stav + persist + scaleCostByCount + 6 budov; modifier části stub pro T4
## T-005 (T2 build+builder)
- **Timestamp**: 2026-06-14T03:45Z
- **total_tokens**: 145991
- **tool_uses**: 99
- **duration_ms**: 853866
- **outcome**: ci 840/840, smoke OK, G1 pass; build.js + completeBuild/buildersProcess; firmy→T3
## T-006 (T3 builder companies)
- **Timestamp**: 2026-06-14T04:30Z
- **total_tokens**: 166548
- **tool_uses**: 176
- **duration_ms**: 1262150
- **outcome**: ci 862/862, smoke OK, G1 pass; buyCompany + ownedCompanies + companyBuildersTotal; G-BUILDER-MASON→T4
## T-007 (T4 modifier vrstva)
- **Timestamp**: 2026-06-14T05:30Z
- **total_tokens**: 44127
- **tool_uses**: 128
- **duration_ms**: 1531851
- **outcome**: ci 906/906, smoke OK, G1 pass, payload invariant ověřen; plný modifier fold+agregáty, sdílený rebuildBuildingDerived, round-trip identita
## T-009a (minor fixes)
- **Timestamp**: 2026-06-14T07:35Z
- **total_tokens**: 62117
- **tool_uses**: 50
- **duration_ms**: 304680
- **outcome**: ci 906/906, smoke OK; komentáře+mrtvý kód, žádná logická změna
