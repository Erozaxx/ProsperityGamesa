# Decision Record

- **ID**: DR-003
- **Date**: 2026-06-13
- **Status**: accepted
- **Related Iteration**: iter-006 (M1) → re-planning checkpoint M2+

## Context
Master plán §2.2 zavádí re-planning checkpoint po M1 (iter-006): gap report může změnit rozsah M2+. Q3/DR-001 = autonomní rozhodnutí (tom-proxy/orchestrátor).

## Decision
- Gap report (16 katalogů: 6 extracted / 4 derived / 6 approximated) je dostatečný podklad (potvrzeno reviewerem T-004).
- **M2+ plán se NEMĚNÍ** – MVP-blokující díry (jobs→M3, buildings→M5, goods/marketBaseline→M4) jsou řešitelné v rámci plánovaných milníků, ne blocker.
- Approximated katalogy pozdních systémů (techs/zones/skills/sectors) zůstávají approximated do M6–M9 (provenance flag), kalibrace M9.
- Kritická cesta MVP (iter-007→011) pokračuje beze změny.

## Consequences
- iter-007 (M2a) startuje dle plánu; přebírá carry-over S-1..S-3 z review M1 (catalog registr/validace na začátku M2).

## Follow-up Actions
- Pokračovat iter-007 (M2a).
