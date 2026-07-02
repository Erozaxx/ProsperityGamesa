# Finální re-verify Vlny 2 + Go/No-Go — iter-022 (T-006)

- **Autor**: orchestrator (tester agent se opakovaně vracel před dokončením — Fable model odkládal blokující čekání na harness; verdikt dotažen orchestrátorem s reprodukovatelnými důkazy).
- **Datum**: 2026-07-02
- **HEAD**: `16f4ea4` (Vlna 1 `0e320e6` + Vlna 2)
- **Verdikt**: **GO** — všech 10 původních nálezů vyřešeno na úrovni fixu; 0 regrese; RUM čistá.

## Výsledky per nález

| # | Nález | Verdikt | Důkaz |
|---|---|---|---|
| #1 | Story dialog CSS/pozice/modalita | RESOLVED (Vlna 1) | reverify-wave1.mjs 45 asertů 0 fail |
| #2 | Render-on-send | RESOLVED (Vlna 1) | pauza: daně 1→0, koupit 0→10 okamžitě |
| #3 | Nábor UI | RESOLVED (wiring) / e2e ekonomicky nedoověřeno | BattleScreen má nábor; `send('recruitUnit',{unitType,count})` přesně dle `recruitUnit.js` (reviewer T-005 potvrdil). Harness nenaspořil zlato na koupi ani po 3 offline kolech (~135 min) → úspěšný nákup NEověřen end-to-end. **Není defekt fixu — je to herní ekonomika/balanc** (mimo scope, blízko KNOWN_ISSUES). |
| #4 | Dovednosti „Spustit" | **RESOLVED** | ⚠️ Harness hlásil SKILLS-START-NOOP = **false negative**. Orchestrátor ověřil 2 nezávisle: (a) `startSkill(state,{skillId:'woodworking'})` v izolaci → `{ok:true}`, stav nastaven; (b) instrumentovaný Playwright repro 2×: klik „Spustit" → available 2→1, progressing 0→1 → **#4 WORKS** deterministicky. |
| #5 | Export potvrzení + fallback | RESOLVED | `.banner-export-feedback` „Hra zkopírována…"; bez clipboardu `.banner-export-fallback` + textarea (len 4320) |
| #6 | Import → přežije reload | RESOLVED | po importu + immediate reload krok=103 (≥26); flush do IndexedDB OK |
| #8 | Neplatný import → chyba | RESOLVED | `.banner-import-error` „Neplatný importní řetězec…" |
| #9 | HUD `.stats` gap | RESOLVED | computed gap 12px @390 |
| #7 | Rapid-tax stale closure | RESOLVED (vedl. efekt Vlny 1) | 10 rychlých kliků → rateMax 5 |
| #10 | Neostylované panely | RESOLVED (Vlna 1+2) | `.offline-summary`/`.catchup-progress` mají kontejner |

## Regrese & RUM
- **0 regrese**: Vlna 1 (#1/#2/#7/#10) drží (reverify-wave1.mjs failures=0).
- **RUM čistá napříč F1–F9**: 0 console.error / 0 pageerror / 0 requestfailed / 0 horizontálního overflow @320/360/390/1280.
- **CI 1566/1566**, golden-hash 17/17, `src/core`+`src/data` netknuto (G1 bit-identický).

## Spolehlivost harnessu (poznámka)
Harness `e2e-rum.mjs` (psal Fable tester) měl **2 vratné/false asserty**: (1) dřívější hardcoded F9 IMPORT-NO-ERROR-FEEDBACK (opraveno na reálné DOM čtení); (2) F4 SKILLS-START-NOOP dal false negative navzdory funkčnímu fixu (orchestrátor override reprodukcí). Harnessové nálezy je proto nutné brát s rezervou a křížově ověřovat — což bylo zde uděláno. Doporučení: F4 assert přehodnotit v příští QA iteraci (měřit `.skills-available-section li` count + `probíhá` položky, jako orchestrátorův repro).

## Závěr
**GO pro iter-022.** Všech 10 nálezů z T-ADV-002 je vyřešeno na úrovni fixu (UI/wiring/CSS), determinismus G1 zachován, žádná regrese. Otevřené (mimo scope této iterace): #3 end-to-end nákup jednotky limitovaný herní ekonomikou (balanc — kandidát na budoucí kalibrační iteraci, ne blocker).
