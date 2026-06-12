# Zadání projektu

## Shrnutí (1 věta)
Offline, na mobilu hratelná idle/ekonomická hra „Prosperity" – znovuvytvoření a další rozvoj hry, která už se nevyvíjí.

## Cíle
- Hratelná idle/ekonomická hra inspirovaná původní hrou „Prosperity".
- Plně funkční **offline** a instalovatelná na mobil (PWA).
- Architektura připravená na iterativní rozvoj (logika oddělená od UI, data-driven obsah).

## Cílový uživatel a jeho problém
Hráč, kterého původní „Prosperity" baví, ale hra už se nevyvíjí a chybí jí nový obsah / mobilní a offline hraní.

## Scope IN
- Jádro idle ekonomiky: ruční výdělek, generátory pasivního příjmu, nákupy, offline progres.
- Ukládání postupu lokálně (localStorage).
- Mobile-first UI, PWA (manifest + service worker).

## Scope OUT (zatím)
- Online multiplayer / backend.
- Mikrotransakce / monetizace.
- Nativní appka (zůstáváme u webu/PWA).

## Omezení / předpoklady
- **Žádné persistentní úložiště prostředí** → veškerý stav workflow i hry musí být verzovaný v gitu (proto bez .gitignore).
- Bez build kroku (zatím čisté HTML/JS/CSS); stack je předmětem architektonické iterace.
- Vývoj probíhá agenticky přes tento multi-agent workflow.

## Deliverables
- Hratelná hra v repu (`index.html`, `src/`), funkční offline.
- Workflow artefakty (plány, rozhodnutí, review) v `.aiworkflow/`.

## Acceptance criteria (projekt je hotový když...)
- Hra jde nainstalovat na mobil a hrát offline.
- Základní idle smyčka (výdělek → nákup → pasivní příjem → offline progres) funguje a je vyladěná.
- Postup se spolehlivě ukládá a obnovuje (včetně offline výpočtu).

## Rizika / otevřené otázky
- Přesné mechaniky a balanc původní „Prosperity" zatím nejsou zdokumentované – nutno upřesnit s uživatelem.
- Volba budoucího stacku (framework/engine) až podle růstu obsahu.

## Aktuální stav
- Hotová první iterace tech kostry: PWA, tap-to-earn, 6 data-driven generátorů, offline progres, autosave.

## Workflow reference
- Dispatch agentů: skill `/dispatch-agent`
- Uzavření iterace: skill `/close-iteration`
- Checkpoint protokol a handoff: viz `docs/agent-workflow.md`
