# Lessons Learned

Tento soubor udržuje orchestrátor. Každou chybu nebo opravu od uživatele sem zapiš – stručně, konkrétně, s datem.
Přečti ho jako PRVNÍ krok každé session (viz Cold Start Protokol v AGENTS.md).

## Jak přidávat záznamy
```
### LL-XXX – YYYY-MM-DD – <krátký název>
**Co se stalo:** <popis chyby nebo problému>
**Dopad:** <co to způsobilo>
**Pravidlo do budoucna:** <konkrétní instrukce jak se tomu vyhnout>
```

---

## Záznamy

### LL-001 – 2026-03-01 – Plán nebyl vyplněn před zahájením práce
**Co se stalo:** Orchestrátor nechal plan.md jako prázdný template (obsahoval placeholder text) a rovnou začal pracovat na taskech bez vyplnění Goal a Master Checklistu.
**Dopad:** Neexistoval master checklist → nebylo co odškrtávat → stav iterace byl neviditelný.
**Pravidlo do budoucna:** Po `make init-iteration` je plan.md TEMPLATE. Orchestrátor ho MUSÍ vyplnit (Goal + T-ID tasky) PŘED zahájením jakékoli práce. Prázdný plán = BLOCKER.

### LL-002 – 2026-03-01 – Tasky nebyly odškrtávány průběžně
**Co se stalo:** Orchestrátor nedokončoval odškrtnutí checklistu po každém tasku – buď odškrtl jen první task, nebo nechával odškrtnutí na konec.
**Dopad:** Master checklist nereflektoval skutečný stav → uživatel nemohl sledovat průběh.
**Pravidlo do budoucna:** Každý task se odškrtne IHNED po dokončení – ne nakonec, ne v dávce. Postup: otevři plan.md → `- [ ]` → `- [x]` → ulož → teprve pak pokračuj dalším taskem.

### LL-003 – 2026-06-12 – Prostředí bez persistentního úložiště → žádný .gitignore
**Co se stalo:** Projekt běží v ephemeral remote sandboxu, který se po nečinnosti zahodí. Cokoli není v gitu, je ztraceno.
**Dopad:** Standardní `.gitignore` (z bootstrapu i z app šablony) by vyloučil `logs/`, `scratch/`, agent inboxy/outboxy a další runtime stav – tedy paměť workflow napříč sezeními.
**Pravidlo do budoucna:** V tomto repu se NEPOUŽÍVÁ `.gitignore`. Veškerý stav (workflow i hra) musí být commitnutý. Po každém smysluplném kroku `git add -A && git commit && git push`, ať se nic neztratí.

### LL-004 – 2026-06-12 – Bootstrap createProject.sh negeneroval agent workspaces
**Co se stalo:** Smyčka v `createProject.sh`, která zakládá agent workspaces, používala `find … -print0`, ale četla přes `read -r` (bez `-d ''`). Null-delimited vstup se přečetl jako jeden blok → tělo smyčky se nespustilo → `agents/` zůstal prázdný. Navíc bash heredoc pro `AGENTS.md` se rozešel s `render-agent-doc` v parseru, takže `make validate` padal.
**Pravidlo do budoucna:** Při lokálním bootstrapu ověř `make validate`. Pokud `agents/` je prázdný, oprav smyčku na `read -r -d ''`. AGENTS.md agentů generuj z `parse_agent_definitions.py render-agent-doc` (to je source of truth pro validaci), ne z bash heredocu.


### LL-005 – 2026-06-14 – Dispatchnutý agent může zemřít bez completion notifikace
**Co se stalo:** Coder agent (iter-014 T6 build UI) v ephemeral prostředí zamrzl/byl reclaimnut a NIKDY neposlal completion notifikaci. Orchestrátor na něj čekal ~5,8 h, než si uživatel všiml. Agent přitom práci fakticky dokončil (CI zelené), jen umřel před zápisem summary + voláním handoff-out.sh.
**Dopad:** Workflow se zaseklo na neviditelně mrtvém agentovi; bez zásahu uživatele by čekalo donekonečna.
**Pravidlo do budoucna:** (1) Při dlouho běžícím agentovi ověř živost: mtime jeho `/tmp/.../tasks/<agentId>.output` a souborů, do kterých zapisuje (state/, artifacts/) vs. teď; >~20 min ticha + chybějící handoff = pravděpodobně mrtvý. (2) Mrtvého agenta NEzahazuj automaticky — nejdřív ověř rozpracovaný working tree (`npm run ci` + `smoke` + zda existují cílové soubory/testy); pokud zelené a kompletní → ZACHRAŇ (doplň summary + odškrtni), jinak re-dispatchni. (3) Pro dlouhé autonomní běhy nasaď `Monitor` poll (á 15 min) na staleness `tasks/*.output`, deduplikovaně, ať tě upozorní na mrtvého agenta sám. (4) `git add -A` v repu s harness worktrees zachytí `.claude/worktrees/<id>` jako embedded git repo → přidej `.claude/worktrees/` do `.git/info/exclude` (lokální, neporušuje LL-003 zákaz .gitignore).
