# Iteration Plan: iter-011

- **Created**: 2026-06-13
- **Goal**: M4b – Trh & karavany → MVP jádro hotové: dynamické ceny a obchod uzavírají idle smyčku výdělek→nákup→pasivní příjem→offline progres = MVP. Dle master plánu §3/iter-011 (T1–T5). T-REV = MVP gate (ověření VŠECH acceptance criteria zadání).
- **Status**: active

## Master Checklist
- [x] T-001: architect – Detailní návrh (Opus) tasků iter-011: T1 klientský trh (D9/§9.1: marketState{goodsId:{available,max}}, cenová kubika, spread haggle 1.35/0.6, clamp available∈[0,max], buyGoods/sellGoods commands REGISTROVANÉ), T2 denní mean-reversion drift (k=0.2/den, marketDailyDrift), T3 getGoldValue(koš) jediné oceňovací API + market.inject kontrakt (negativní S-06 → POZITIVNÍ kontrakt), T4 karavany (sendCaravan command, cesty/návraty přes schedule), T5 UI market screen + karavany. Plus crime.js fix (přes resource vrstvu). Wiring + UI explicitně. Model: Opus.
- [ ] T-002: coder – Implementace (Sonnet) dle návrhu; tsc/test/grep + wiring + UI. Model: Sonnet.
- [ ] T-003: tester – Test loop (Sonnet): formulas ceny vč. clampu, arbitrážní sanity (nákup→prodej není ziskový), drift, catch-up-safe, PLNÝ MVP e2e scénář (install→hraj→zavři→offline→vrať se→progres). Model: Sonnet.
- [ ] T-004: reviewer – MVP GATE (Opus, právo re-run): ověření VŠECH acceptance criteria zadání; nesplnění = re-run. Model: Opus.

## Quality Gates
- [ ] Plan neobsahuje orchestratora jako agenta u žádného tasku
- [ ] Commandy (buyGoods/sellGoods/sendCaravan) registrované v runtime + market UI napojené
- [ ] getGoldValue/market.inject kontrakty živé (S-06 pozitivní)
- [ ] Implementace prošla test loop (arbitráž sanity + MVP e2e)
- [ ] MVP GATE GO (všechna acceptance criteria zadání)

## Exit Criteria
- acceptance criteria zadání splněna (instalace, offline, idle smyčka, spolehlivý save vč. offline výpočtu); getGoldValue/market.inject kontrakty živé; reviewer GO = MVP.
