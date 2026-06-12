# AI Workflow Entry Point

Source of truth for the workflow lives under `.aiworkflow/`.

## Start Here
1. Read `.aiworkflow/AGENTS.md`
2. Treat every workflow path as rooted under `.aiworkflow/`
3. If you are operating as the workflow entrypoint/orchestrator, also read `.aiworkflow/agents/orchestrator/AGENTS.md` and treat yourself as one of the agents
4. Keep project code outside `.aiworkflow/`; use `.aiworkflow/` only for orchestration, prompts, notes, and generated workflow artifacts

## Repo Skills Catalog
Repo skills are implemented as command files under `.claude/commands/`.
Treat this section as a lightweight index, not a second instruction layer.

### How to use this catalog
- Load a full command file only when the user explicitly invokes that command or when the task is an obvious match for that workflow.
- Do not preload all files under `.claude/commands/`; read only the command you are about to use.
- When a command file is loaded, follow that file as the source of truth for the workflow details.

### Available repo skills
- `/init-iteration`
  Purpose: initialize a new iteration (branch, plan.md, dashboard, quality gate).
  Path: `.claude/commands/init-iteration.md`

- `/dispatch-agent`
  Purpose: dispatch workflow work to one or more agents.
  Path: `.claude/commands/dispatch-agent.md`

- `/close-iteration`
  Purpose: close the active iteration workflow.
  Path: `.claude/commands/close-iteration.md`

### Catalog Guardrail
- If a repo command is added, renamed, or removed under `.claude/commands/`, update this catalog in the same change set.
