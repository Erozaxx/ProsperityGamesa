# Brief (RE-RUN 1 – review T-004: 2 blockery)
- **Brief ID**: BRIEF-033rr
- **Iteration**: iter-009 (M3)
- **To**: coder (Sonnet)
## Problém (review T-004)
Simulační jádro M3 je věrné a catch-up-safe, ALE není hratelné end-to-end přes app. Oprav blockery + 1 suggestion. Jádro systémů NEMĚŇ (jen registrace, runtime catalog, UI, 1 vzorec).
## BLOCKER-1: commandy + ctx.catalog v runtime
- main.js / bootSequence: registruj assignJob a startSkill (vedle setSpeed) a NAPLŇ ctx.catalog reálnými katalogy (BL-3 "varianta A" preload – dnes jen v testech). Přidej test registrace/bootstrap, který selže, kdyby commandy nebyly dosažitelné.
## BLOCKER-2: T5 UI (produkční smyčka hratelná)
- Dodej UI obrazovky forest/field/mine/jobs/skills (preact+htm – v repu je vendorováno) + selektory (selectJobs/selectSkills/selectWorld…) nad commands (assignJob/startSkill). Minimálně: zobrazit stocky/area, joby s progressem + přiřazení pracovníků, skilly s progressem + start. Napojit do App.js.
## SUGGESTION-1: forest fire jmenovatel
- forest fire používá forestArea (~33000) místo zdrojového maxTrees (~328327) → riziko ~100× vyšší. Oprav jmenovatel na maxTrees dle zdroje (config.js). Uprav i příslušný test/číslo.
## Acceptance
- `npm run ci` ZELENÉ vč. nového bootstrap/registrace testu. Commandy dosažitelné v runtime; UI napojené; forest fire vzorec dle zdroje.
- Core bez DOM; catch-up-safe zachováno.
## Inputs
- Review: agents/reviewer/artifacts/final/review_iter-009_T-004.md; návrh design_iter-009_T-001.md; src/app/*, src/ui/*, src/core/systems/*; agents/coder/AGENTS.md
## Outputs
- impl note agents/coder/artifacts/final/impl_iter-009_T-002.md (aktualizuj); handoff-out.sh T-002
