# Agent Workflow

## Checkpoint Protokol (pro každého agenta)
Po dokončení každého úkolu:
1. Aktualizuj `state/current-task.md` → status: done
2. Zavolej `bash scripts/handoff-out.sh <task-id> "<popis>"`

Orchestrátor po přijetí notifikace provede dispatch protokol viz `/dispatch-agent`.
Pro uzavření iterace viz `/close-iteration`.

## Feedback Loop (Reopen)
Pokud Reviewer nebo Tester najde problém:
1. Orchestrátor zavolá `make reopen-task AGENT=coder TASK=T-003 REASON="..."`
2. Task se vrátí do agentova inboxu jako `reopen_T-003_*.md`
3. Agent opraví, znovu zavolá handoff-out.sh

## Doporučený rytmus iterace
1. Requirements → pochopení uživatelských potřeb
2. Architect → návrh řešení
3. Challenger → oponentura návrhu
4. Security → bezpečnostní review návrhu
5. Coder → implementace
6. Reviewer → code review
7. Tester → QA validace
8. BFU → uživatelský pohled
9. Process → retrospektiva procesu
