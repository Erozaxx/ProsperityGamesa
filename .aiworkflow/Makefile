SHELL := /usr/bin/env bash
ROOT  := .

.PHONY: help list-agents status init-iteration close-iteration \
        new-decision dispatch-brief reopen-task validate tree dashboard

help:
	@printf 'Dostupné příkazy:\n'
	@printf '  make list-agents                              – vypíše agenty a jejich stav\n'
	@printf '  make status                                   – stav agentů + aktivní iterace\n'
	@printf '  make init-iteration ITER=iter-001             – založí iteraci\n'
	@printf '  make close-iteration ITER=iter-001            – uzavře iteraci\n'
	@printf '  make new-decision ID=DR-001 TOPIC=popis       – nový decision record\n'
	@printf '  make dispatch-brief AGENT=coder BRIEF=file.md – pošle brief agentovi\n'
	@printf '  make reopen-task AGENT=coder TASK=T-001 REASON="fix X"\n'
	@printf '  make validate                                 – zkontroluje agent složky\n'
	@printf '  make tree                                     – vypíše strukturu (3 úrovně)\n'
	@printf '  make dashboard                                – vygeneruje dashboard.html\n'

list-agents:
	@bash orchestration/scripts/scan-agents.sh "$(ROOT)"

status:
	@bash tools/status.sh "$(ROOT)"

init-iteration:
	@test -n "$(ITER)" || (printf 'Použití: make init-iteration ITER=iter-001\n' && exit 1)
	@bash orchestration/scripts/new-iteration.sh "$(ROOT)" "$(ITER)"

close-iteration:
	@test -n "$(ITER)" || (printf 'Použití: make close-iteration ITER=iter-001\n' && exit 1)
	@bash orchestration/scripts/close-iteration.sh "$(ROOT)" "$(ITER)"

new-decision:
	@test -n "$(ID)"    || (printf 'Použití: make new-decision ID=DR-001 TOPIC=popis\n' && exit 1)
	@test -n "$(TOPIC)" || (printf 'Použití: make new-decision ID=DR-001 TOPIC=popis\n' && exit 1)
	@bash orchestration/scripts/new-decision.sh "$(ROOT)" "$(ID)" "$(TOPIC)"

dispatch-brief:
	@test -n "$(AGENT)" || (printf 'Použití: make dispatch-brief AGENT=coder BRIEF=file.md\n' && exit 1)
	@test -n "$(BRIEF)" || (printf 'Použití: make dispatch-brief AGENT=coder BRIEF=file.md\n' && exit 1)
	@bash orchestration/scripts/dispatch-brief.sh "$(ROOT)" "$(AGENT)" "$(BRIEF)"

reopen-task:
	@test -n "$(AGENT)"  || (printf 'Použití: make reopen-task AGENT=coder TASK=T-001 REASON="popis"\n' && exit 1)
	@test -n "$(TASK)"   || (printf 'Použití: make reopen-task AGENT=coder TASK=T-001 REASON="popis"\n' && exit 1)
	@test -n "$(REASON)" || (printf 'Použití: make reopen-task AGENT=coder TASK=T-001 REASON="popis"\n' && exit 1)
	@bash orchestration/scripts/reopen-task.sh "$(ROOT)" "$(AGENT)" "$(TASK)" "$(REASON)"

validate:
	@bash tools/check-agent-folders.sh "$(ROOT)"

tree:
	@bash tools/tree-summary.sh "$(ROOT)"

dashboard:
	@python3 gen-dashboard.py
