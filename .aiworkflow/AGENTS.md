# Multi-Agent Project – Root Instructions

## Where to Start (Cold Start Protokol) – POVINNÉ POŘADÍ

**Přečti tyto kroky celé před tím, než cokoliv uděláš.**

### Krok 1 – Načti kontext
1. Přečti `zadani_projektu.md` – pochop cíl, scope a stav projektu
2. Přečti `project/done-criteria.md` – kdy je projekt hotový
3. Přečti `shared/docs/lessons_learned.md` – poučení z předchozích sezení (POVINNÉ)
4. Jako entrypoint orchestrator POVINNĚ přečti `agents/orchestrator/AGENTS.md` a přistupuj k sobě jako k jednomu z agentů, ne jako k výjimce mimo workflow.

### Krok 2 – Zjisti stav iterace
5. Zkontroluj aktivní iteraci:
   - Otevři `orchestration/plans/active.md`
   - **Existuje a není symlink na nic** → přečti plan.md, zkontroluj master checklist, pokračuj
   - **Neexistuje nebo je broken** → vytvoř novou iteraci: `make init-iteration ITER=iter-001`
   - **Existuje ale je template** (obsahuje ITER-ID, "jedna věta", "–") → ZASTAV SE, vyplň ho

### Krok 3 – Zkontroluj inbox a agenty
6. Zkontroluj `agents/orchestrator/context/inbox/` – čekají briefy nebo notifikace?
7. Načti dostupné agenty: `make list-agents`

### Krok 3a – Prompt audit trail (POVINNÉ)
8. Než předáš brief nebo jiný požadavek libovolnému agentovi, ulož přesný prompt do `agents/<slug>/logs/`.
9. Teprve po uložení promptu odesílej brief nebo follow-up.

### Krok 4 – Vyplň plán (PŘED zahájením práce)
Pokud plan.md existuje ale obsahuje template (placeholder text jako "ITER-ID", "jedna věta", "–"):
- **Zastav se a vyplň ho** – Goal, Master Checklist s reálnými T-ID a tasky
- Teprve po vyplnění začni pracovat
- Prázdný nebo template plán = BLOCKER, nepokračuj bez jeho vyplnění

---

## Master Checklist Pravidlo (KRITICKÉ)

Orchestrátor udržuje master checklist v `orchestration/runs/<iter>/plan.md`.

### Pravidla:
1. Každý úkol má unikátní task-id (T-001, T-002, ...)
2. Odškrtni IHNED po dokončení – ne nakonec, ne v dávce
3. Nezahajuj další task dokud předchozí není odškrtnut

> Konkrétní kroky pro správu plan.md při dispatchi jsou v `/dispatch-agent` (krok 3 a krok 8).

### Časté chyby (viz lessons_learned.md):
- ❌ Nechat plán jako template a rovnou pracovat
- ❌ Odškrtat tasky nakonec místo průběžně

---

## Dostupní Agenti
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


## Doporučený Flow Iterace
1. Orchestrátor přečte zadání → vyplní iteration plan (Goal + Master Checklist s T-ID)
2. Orchestrátor dispatchne agenty → **skill \`/dispatch-agent\`** (audit log, plan.md, spawn, verify)
3. Agenti pracují, průběžně odškrtávají svůj dílčí checklist
4. Agent dokončí → \`bash scripts/handoff-out.sh <task-id> "<popis>"\` → orchestrátor IHNED odškrtne master checklist
5. Reviewer/Tester validují; při nálezu → \`make reopen-task\` + znovu dispatch přes \`/dispatch-agent\`
6. Uzavření iterace → **skill \`/close-iteration\`** (verify → commit → push → PR → close-iteration.sh)

## Struktura orchestration/ – kde žije co

### orchestration/plans/active.md  ← VŽDY ČTEŠ TENHLE
Symlink na plan.md aktuálně aktivní iterace.
- Vytvoří se automaticky při `make init-iteration`
- Odstraní se automaticky při `make close-iteration`
- Pokud neexistuje → žádná aktivní iterace, vytvoř novou

**Správné použití:**
- Čteš stav iterace? → `orchestration/plans/active.md`
- Odškrtáváš checklist? → `orchestration/plans/active.md` (symlink tě přesměruje)
- Nikdy nehledej plan.md ručně v runs/ – vždy jdi přes `plans/active.md`

### orchestration/runs/<iter>/plan.md  ← SKUTEČNÝ SOUBOR
Živý dokument iterace – Goal, master checklist, exit summary.
- `plans/active.md` vždy ukazuje sem
- Po `close-iteration` zůstane jako archivní záznam

### orchestration/runs/<iter>/  ← RUNTIME DATA ITERACE
Briefs, collected outputs, logy, reviews.
Neupravuj ručně – používej skripty.

### Typické chyby (viz lessons_learned.md)
- ❌ Hledám plan.md přímo v `runs/` místo přes `plans/active.md`
- ❌ `plans/active.md` je broken symlink a nevšimnu si toho → zkontroluj: `ls -la orchestration/plans/`
- ❌ Zapomenu vyplnit Goal a T-ID po `make init-iteration` → BLOCKER

## Scope Changes
Každá změna scope se zapisuje do `project/scope-changes.md`.

## Decision Records
Každé rozhodnutí s dopadem: `make new-decision ID=DR-001 TOPIC=popis`
Relevantní DR se kopírují do `agents/<slug>/context/refs/`.
