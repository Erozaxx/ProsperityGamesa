# Current Task

- **Task ID**: T-005 (iter-022, code review Vlny 2 — commit 16f4ea4, QA #3/#4/#5/#6/#8/#9)
- **Iteration**: iter-022
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-07-02
- **Completed**: 2026-07-02

## Co teď dělám
Hotovo: read-only review commitu `16f4ea4` (diff `9e2b8a8..16f4ea4 -- src/`) proti coder
záznamu `wave2_iter-022.md`. Ověřeno proti kódu (ne jen záznamu): recruitUnit.js (params/cena),
startSkill.js (signatura, jediný writer home.skills), autosave.js (flush = nepodmíněný save),
saveStore.js (lastSimTimestamp=now při zápisu), exportString.js (envelope lastSimTimestamp),
selectors.js (nové selektory čistě READ), screens.js/App.js (wiring, XSS přes htm/preact),
skills.js (completion nechává entry → žádná slepá ulička). CI re-run na HEAD: 1566/1566 pass.

## Výsledek
Verdikt: **APPROVE** — 0 BLOCKER, 4 SUGGESTION, 3 NITPICK.

- G1: PASS — žádný soubor v src/core/** ani src/data/**; selektory jen čtou katalog;
  #4 neseeduje (jediný writer home.skills zůstává command startSkill); exportFeedback/
  importError mimo state/hashState.
- Data-safety #6: PASS — autosave.flush() je správné API (requestSave by po nedávném
  autosave tiše neuložil); selhání zápisu má viditelný banner; import přežije reload.
- Wiring #3/#5/#8: PASS — recruitUnit params přesně dle commandu, disabled logika
  konzistentní s canAfford; export 3 cesty bez tichého no-op; žádný XSS vektor.
- Regrese Vlny 1: PASS — send()/render.js nedotčeny, CI zelené.

Nejdůležitější SUGGESTION: nepravdivý komentář main.js:369-372 (importFromString vrací
export-time lastSimTimestamp, ne "now"; funkčně neškodné, ale kodifikuje špatný invariant)
+ flush() re-entrance okno v autosave.js:29 (pending short-circuit; minimální pravděpodobnost).

Výstup: agents/reviewer/artifacts/final/review-wave2_iter-022.md
