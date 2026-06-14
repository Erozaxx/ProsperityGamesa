# Iteration Plan: iter-014

- **Created**: 2026-06-14
- **Goal**: M5-2 – Kontrakty & build UI: contractQueue + onComplete/onExpire/onReject přes registr efektů (K14), kontraktové eventy přes schedule; UI build screen (karty budov, ceny se scalingem, fronta) + kontrakty panel. Dokončuje M5 (DoD M5 se vyhodnotí zde). Dle master plánu §3/iter-012(M5) T5/T6 + design iter-013 §13. Posun číslování viz DR-013-00/01.
- **Status**: active

## Master Checklist
<!-- Orchestrátor udržuje a průběžně odškrtává – IHNED po přijetí done notifikace -->
- [x] T-001: architect – Design M5-2 hotový (design_iter-014_T-001.md). Contract data DOLOŽITELNÁ z events.js (8 typů, originál už string-ID callbacky→1:1 K14); contractQueue {id,type,status,cost,reward,deadlineStep,on*} + contractSeq; lifecycle přes registr efektů (data, ne háčky); absolutní deadlineStep + scheduleInsert contract.expire; generování schedule-driven rng stream 'contracts'; nový systems/contracts.js; build UI selektory+screens+taby. M52-D8: nutno přidat registerContractEffects/Commands do bootstrapu. tickOrder beze změny (vše přes SCHEDULE fázi)
- [x] T-002: reviewer – Review designu M5-2: GO-s-podmínkami; split NE; 2 blocker/2 major/4 minor/3 nit. M52-D8 (boot registrace) + determinismus contract streamu potvrzeny korektní proti kódu. Blokery: B1 registerBuild nevyresolvován v main.js (build=dark code z M5-1), B2 contract.offer re-arm pro existující savy (scheduleCountOf guard), M1 SAVE_VERSION migrace explicitně. Viz DR-014-01
- [x] T-002a: architect – Revize hotová (design §14 dopsána): B1 registerBuild+registerContractCommands+registerContractEffects do bootstrapu (main.js přesná místa); B2 armContractOffer idempotentní (scheduleCountOf('contract.offer')===0, insert na max(curStep,firstOfferStep), deterministický, mirror marketInit); M1 SAVE_VERSION zůstává 3 bez migrace polí (B2 nutný nezávisle – schedule v doméně engine). Ověřeno proti kódu
- [x] T-003: tom-proxy – Human gate SCHVÁLENO s výhradou: contract min. sada OK (precedens G-LISTBUILDINGS), B1 oprava OK, build UI OK, G-BUILD-TXAUDIT OK s pozn. → SLEDOVACÍ PODMÍNKA: adresovat nejpozději v M9 (iter-018), jinak eskalovat. Implementace M5-2 běží
- [x] T-004: coder – T5 hotový: contracts.js (contractQueue lifecycle, registerContractEffects: contract.offer/expire/complete pay+grant/reject přes registr), commands acceptContract/rejectContract/completeContract, contracts.json (derived), armContractOffer (B2), rng stream 'contracts'. B1: registerBuild+contract commands/effects v bootstrapEngine. ci 957/957, smoke OK, G1 16/16, persist+B2 re-arm ověřeno
- [x] T-005: coder – T6 hotový [ZACHRÁNĚNO – agent zemřel před handoffem, práce ověřena orchestrátorem]: selectors (selectBuildableBuildings scaling, selectProjectQueue, selectBuilderCapacity/Companies, selectContracts deriváty), BuildScreen + ContractsScreen, taby Stavba+Kontrakty, styly. ci 990/990, smoke OK (taby renderují, 0 console errors), G1 nedotčen, 33 UI testů
- [x] T-006: tester – Test loop M5-2 GO (DoD M5 komplet): všech 9 AC PASS empiricky (990/990, smoke OK taby renderují). Kontrakty lifecycle (accept/complete pay+grant, expire idempotentní, reject), B2 re-arm starý save→1 offer/idempotentní, determinismus (stream izolovaný, hashState round-trip identita), catch-up 365 dní (328500 kroků bez crashe, 24 offers), persist schedule eventy přežijí, build UI reálně staví (B1), SAVE_VERSION=3 kompat. M5 hratelný
- [x] T-007: reviewer – Review gate M5-2 GO; DoD M5 KOMPLETNÍ a hratelný. Všech 6 tvrdých invariantů ověřeno proti kódu (K14 string-ID, determinismus+serializace, B2 idempotentní re-arm, B1 boot wiring, žádná logika v UI, SAVE_VERSION=3). Zachráněná build UI bez nálezu (kompletní, pure komponenty). 0 blocker/0 major/1 minor/2 nit. MINOR-1: gap-report.json neaktualizován pro iter-014 (traceability) → orchestrátor doplní při close
- [x] T-008: human – Uzavření SCHVÁLENO stálým pověřením uživatele (DR-013-00, "dojeď celý master plán do konce"). DoD M5 komplet, reviewer GO + QA GO, MINOR-1 vyřešen → /close-iteration + PR + merge → DoD M5 hotovo

## Quality Gates
- [x] Architecture reviewed (T-002) + tom-proxy schválení (T-003)
- [x] Code review (Reviewer) – T-007 GO (0 blocker/major)
- [x] QA validace (Tester) – T-006 GO (9/9 AC)
- [x] Plán neobsahuje orchestratora jako agenta u žádného tasku

## Exit Criteria (DoD M5 komplet)
- Kontrakty běží: contractQueue, onComplete/onExpire/onReject přes registr efektů (K14), eventy přes schedule serializovatelné a deterministické.
- Build UI funkční: budovy se staví z UI (ceny se scalingem, fronta, opravy, firmy), kontrakty panel.
- `npm run ci` zelené, `npm run smoke` OK, determinismus G1 + catch-up-safe nedotčen.
- Žádná herní logika v UI; derivovaná data se neukládají; registr efektů bez imperativních háčků.
- Reviewer GO. → **DoD M5 (město roste, stavby, kontrakty, modifikátory) kompletní.**

## Decisions Made This Iteration
- DR-013-00/01: split M5, posun číslování, autonomní doběh.

## Retrospective Notes
- Vstup: master plán §3/iter-012(M5) T5/T6, design iter-013 §13 (odloženo M5-2), architektura §5.4 (K14 registr efektů), §8 kontrakty.
- M5-1 (iter-013) dodalo budovy/builder/companies/modifikátory; M5-2 uzavírá M5 kontrakty + UI.
- **M9 carry-over (tom-proxy T-003 podmínka)**: G-BUILD-TXAUDIT (stavební/contract výdaje bez tx audit eventu, ctx se commandu nepředává) MUSÍ být adresován nejpozději v M9/iter-018 (ctx do command vrstvy) — věrný rebuild sleduje výdaje. Pokud se M9 odsouvá, eskalovat.
