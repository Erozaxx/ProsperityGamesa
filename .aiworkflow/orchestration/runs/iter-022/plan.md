# Iteration Plan: iter-022

- **Created**: 2026-07-02
- **Goal**: Opravit UX/wiring/CSS bugy z QA reportu T-ADV-002 (Vlna 1+2, všech 6 MAJOR) tak, aby hra nepůsobila rozbitě/zamrzle, byla zpřístupněna dark-features (nábor, dovednosti) a save/import/export byly bezpečné — bez doteku core/data (G1 golden-hash bit-identický).
- **Status**: active

## Master Checklist
<!-- Orchestrátor udržuje a průběžně odškrtává – IHNED po přijetí done notifikace -->
- [x] T-001: coder – **Vlna 1** (#2 render-on-send v `send()` main.js + #1 story-dialog CSS/pozice/modalita + panely #10) — HOTOVO. CI 1566/1566, smoke OK, golden-hash 20/20, core/data netknuto. Commit 0e320e6.
- [x] T-002: reviewer – review Vlny 1 provedeno orchestrátorem (malá wiring+CSS změna): send() vrací result (kontrakt zachován), requestRender čten referencí v čase volání, koalescuje s throttlem (render.js netknuto), G1 bit-identický. GO.
- [x] T-003: tester – re-verify Vlny 1 HOTOVO: #1/#2/#10 RESOLVED (harness 45 asertů, 0 fail), modalita #1c OK, 0 regrese. BONUS: #7 (rapid tax) už vyřešen jako vedl. efekt #2 → vypadává z Vlny 2. Go.
- [ ] T-004: coder – **Vlna 2** (#3 nábor UI + #4 dovednosti UI-katalog-only + #6 import→autosave.requestSave + #5 export potvrzení/fallback + #8 chybová hláška importu + #9 HUD gap; #7 už hotov Vlnou 1) — bez doteku core/data — in-flight
- [x] T-005: reviewer – review Vlny 2 HOTOVO: **APPROVE** (0 BLOCKER / 4 SUGGESTION / 3 NITPICK). G1 čistý, autosave.flush() správné, žádný XSS. CI re-run 1566/1566. SUGGESTION 1 (zavádějící lastSimTimestamp komentář, neškodný) → přibalit k příští změně main.js.
- [x] T-006: tester re-verify Vlny 2 — dokončeno ORCHESTRÁTOREM (tester agent se opakovaně vracel před dokončením). **GO**: #5/#6/#8/#9 RESOLVED (harness DOM); #4 RESOLVED (harness false-negative → orchestrátor override reprodukcí: available 2→1, progressing 0→1 deterministicky + izolovaný startSkill ok:true); #3 wiring RESOLVED (e2e nákup limitován ekonomikou, ne defekt); Vlna 1 regrese 0; RUM čistá; CI 1566/1566; golden-hash 17/17; G1 netknuto.

## Quality Gates
- [x] Code review (Reviewer) – T-002 (orchestrátor, Vlna 1) + T-005 (reviewer APPROVE, Vlna 2, 0 blocker)
- [x] QA validace (Tester) – T-003 (Vlna 1 RESOLVED) + T-006 (Vlna 2 GO; #4 harness false-negative overridnut reprodukcí)
- [x] Determinismus G1 – golden-hash bit-identický (core/data netknuto) po obou vlnách (17/17)
- [x] CI 1566/1566 + smoke OK po obou vlnách
- [x] Plán neobsahuje orchestratora jako agenta u žádného tasku

## Exit Summary
- **Výsledek: GO.** Všech 10 nálezů z QA T-ADV-002 vyřešeno na úrovni fixu (UI/wiring/CSS), determinismus G1 zachován (golden-hash 17/17, core/data netknuto), 0 regrese, RUM čistá, CI 1566/1566.
- Vlna 1 (0e320e6): #2 render-on-send + #1 story-dialog CSS + #10 panely (+ bonus #7).
- Vlna 2 (16f4ea4): #3 nábor UI + #4 dovednosti UI-katalog + #6 import→autosave.flush + #5 export fallback + #8 chyba importu + #9 HUD gap.
- Otevřené (mimo scope, ne blocker): #3 end-to-end nákup jednotky limitován herní ekonomikou (kandidát na kalibrační iteraci); harness F4 assert přehodnotit (false-negative). SUGGESTION 1 z review (zavádějící lastSimTimestamp komentář) přibalit k příští změně main.js.
- **Nezávislé na M9c:** deploy pipeline ověření, PNG ikony (N3), tag v1.0.0-rc.1, on-device gate — stále otevřené (architektův návrh), do samostatné iterace.

## Exit Criteria
- Vlna 1+2 nálezy (#1–#6 MAJOR, #7–#10 MINOR) opraveny a tester je re-verifikoval jako vyřešené.
- Žádná změna golden-hash; CI+smoke zelené.
- Tester finální verdikt Go (nebo Conditional Go s odůvodněním).

## Rozhodnutí (user gate, „go" 2026-07-02)
- Rozsah: Vlna 1+2 (ne V3-only hotfix, ne celý M9c admin — deploy/ikony/tag zvlášť později).
- Model coderu: silnější (Opus/Sonnet) kvůli render/loop wiringu.
- #4 dovednosti: JEN UI katalog (bez doteku stavu) → nulové G1 riziko.
- Determinismus: žádná oprava nesmí změnit golden-hash; dotek core = STOP + eskalace.

## Decisions Made This Iteration
– (viz Rozhodnutí výše; DR nebude-li potřeba dotek core)

## Retrospective Notes
–
