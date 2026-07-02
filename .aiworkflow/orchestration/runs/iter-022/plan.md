# Iteration Plan: iter-022

- **Created**: 2026-07-02
- **Goal**: Opravit UX/wiring/CSS bugy z QA reportu T-ADV-002 (Vlna 1+2, všech 6 MAJOR) tak, aby hra nepůsobila rozbitě/zamrzle, byla zpřístupněna dark-features (nábor, dovednosti) a save/import/export byly bezpečné — bez doteku core/data (G1 golden-hash bit-identický).
- **Status**: active

## Master Checklist
<!-- Orchestrátor udržuje a průběžně odškrtává – IHNED po přijetí done notifikace -->
- [x] T-001: coder – **Vlna 1** (#2 render-on-send v `send()` main.js + #1 story-dialog CSS/pozice/modalita + panely #10) — HOTOVO. CI 1566/1566, smoke OK, golden-hash 20/20, core/data netknuto. Commit 0e320e6.
- [x] T-002: reviewer – review Vlny 1 provedeno orchestrátorem (malá wiring+CSS změna): send() vrací result (kontrakt zachován), requestRender čten referencí v čase volání, koalescuje s throttlem (render.js netknuto), G1 bit-identický. GO.
- [x] T-003: tester – re-verify Vlny 1 HOTOVO: #1/#2/#10 RESOLVED (harness 45 asertů, 0 fail), modalita #1c OK, 0 regrese. BONUS: #7 (rapid tax) už vyřešen jako vedl. efekt #2 → vypadává z Vlny 2. Go.
- [ ] T-004: coder – **Vlna 2** (#3 nábor UI + #4 dovednosti UI-katalog-only + #6 import→autosave.requestSave + #5 export potvrzení/fallback + MINOR #7/#8/#9) — bez doteku core/data
- [ ] T-005: reviewer – review Vlny 2 (UI wiring, data-safety, G1)
- [ ] T-006: tester – re-verify Vlny 2 (harness F6 recruit/F9 export-import+reload, nový skills e2e, CI, smoke, golden-hash) + finální Go/No-Go

## Quality Gates
- [ ] Code review (Reviewer) – T-002, T-005
- [ ] QA validace (Tester) – T-003, T-006 (re-verify původních 10 nálezů)
- [ ] Determinismus G1 – golden-hash bit-identický (core/data netknuto) po každé vlně
- [ ] CI 1566/1566 + smoke OK po každé vlně
- [ ] Plán neobsahuje orchestratora jako agenta u žádného tasku

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
