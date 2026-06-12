# Multi-Agent AI Workspace

Workspace pro řízení projektů pomocí specializovaných AI agentů s Gallup talent profily.

## Rychlý start

```bash
# 1. Vyplň zadání
vim zadani_projektu.md

# 2. Vytvoř první iteraci
make init-iteration ITER=iter-001

# 3. Zkontroluj agenty
make list-agents

# 4. Zobraz celkový stav
make status
```

## Dostupní agenti (23)
| Agent | Slug | Role |
|---|---|---|
| Orchestrator | orchestrator | Koordinátor agentů, iterací a quality gates. |
| Requirements | requirements | Business analytik – co uživatel skutečně chce a potřebuje. |
| Product Strategist | product-strategist | Product strategist – definuje produktovou pozici, value proposition a komercni ramec MVP. |
| CTO | cto | Chief Technology Officer - urcuje technologickou strategii, smer platformy a dlouhodobou technickou konkurenceschopnost. |
| CIO | cio | Chief Information Officer - ridi IT operating model, enterprise capability mapu a governance informacnich sluzeb. |
| CFO | cfo | Chief Financial Officer - nastavuje financni smer, investicni disciplinu a ekonomicke guardraily pro rust firmy. |
| Architect | architect | Solution architect – navrhuje strukturu systémů a technologická rozhodnutí. |
| FinOps Domain Expert | finops-domain-expert | FinOps domain expert – drzi domenne pravdy, capability mapu a minimalni standard financniho provozu cloudu. |
| Challenger | challenger | Technický skeptik a kritický oponent návrhů. |
| Security | security | Security engineer – bezpečnostní review aplikací a infrastruktury. |
| Creative | creative | UX a product thinker – vidí produkt očima uživatele. |
| Learning Designer | learning-designer | Learning designer – převádí cíle školení do osnovy, learning outcomes a smysluplné učební cesty. |
| Content Writer | content-writer | Content writer – píše finální texty pro školení, handouty, slide decky a doprovodné materiály. |
| Workshop Facilitator | workshop-facilitator | Workshop facilitator – navrhuje živý průběh session, tempo, interakce a facilitation cues pro lektora. |
| Exercise Designer | exercise-designer | Exercise designer – vytváří praktická cvičení, zadání, hinty a expected outcomes pro trénink dovedností. |
| Prototype | prototype | Rapid prototyper – dělá krátké spike implementace a ověřuje proveditelnost před plnou implementací. |
| Audience Adapter | audience-adapter | Audience adapter – přizpůsobuje stejné téma různým publikům bez ztráty podstaty. |
| Storyline Crafter | storyline-crafter | Storyline crafter – staví framing, příběh, metafory a zapamatovatelnou linku školení nebo workshopu. |
| Coder | coder | Senior software engineer – implementuje podle schváleného návrhu. |
| Reviewer | reviewer | Code a output reviewer – kvalita, rizika, maintainability. |
| Tester | tester | QA engineer – validace, testy a ověření acceptance criteria. |
| Process | process | Engineering process advisor – vývojové procesy a týmová efektivita. |
| BFU | bfu | Běžný frustovaný uživatel – zastupuje netechnického koncového uživatele. |


Každý agent má Gallup talent profil definující styl uvažování – viz `agents/<slug>/AGENTS.md`.
Zdroj definic agentů je `agent_definitions/<type>/*.json` (typ = podsložka definice).

## Checkbox mechanismus
- **Master checklist**: `orchestration/runs/<iter>/plan.md` – spravuje Orchestrátor
- **Dílčí checklist**: v každém `agents/<slug>/AGENTS.md` – spravuje agent
- Agent signalizuje hotovo: `bash scripts/handoff-out.sh <task-id> "<popis>"`
- Orchestrátor IHNED odškrtne master checklist po přijetí notifikace

## Workflow (jedna iterace)
1. Orchestrátor vytvoří plan s master checklistem
2. Dispatchne briefy: `make dispatch-brief AGENT=architect BRIEF=briefs/incoming/brief_arch.md`
3. Agenti pracují, průběžně odškrtávají dílčí checklisty
4. Hotový task → `handoff-out.sh` → notifikace do orchestrátor inboxu
5. Reviewer/Tester validují → případně `make reopen-task`
6. Uzavření: skill \`/close-iteration\`

## Kde hledat co
- Zadání projektu: `zadani_projektu.md`
- Stav projektu: `make status`
- Šablony: `shared/templates/`
- Rozhodnutí: `orchestration/decisions/`
- Výstupy iterace: `orchestration/runs/<iter>/collected/`
- Scope změny: `project/scope-changes.md`

## Model entry points
Zdroj pravdy je `AGENTS.md`.
Kvůli kompatibilitě jsou přítomné i symlinky `CLAUDE.md` a `CODEX.md`.
