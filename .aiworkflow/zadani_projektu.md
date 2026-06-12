# Zadání projektu

## Shrnutí (1 věta)
**Věrný rebuild** středověké ekonomické simulace městského státu „Prosperity" (originál v0.9.5) jako mobile-first PWA hratelná offline.

## Cíle
- **Věrně replikovat mechaniky a balanc** původní hry (ne implementaci): čas/sezóny, populace a bydlení, produkce surovin a jídla, ekonomika a trh, výzkum, dovednosti, budovy, AI svět + diplomacie, vojsko a bitvy, příběh a achievementy.
- Plně funkční **offline** a instalovatelná na mobil (PWA).
- Architektura připravená na iterativní rozvoj (logika oddělená od UI, data-driven obsah).

## Cílový uživatel a jeho problém
Hráč, kterého původní „Prosperity" baví, ale hra už se nevyvíjí a chybí jí mobilní a offline hraní.

## Scope IN
- Reálný-čas engine (step scheduler, pauza / 1× / 2×), sezóny (4× 91 dní).
- Populace + bydlení (house tiery), jídlo (sytost, hnití), úmrtí.
- Produkce surovin (les / pole / důl), sklady (granary / warehouse).
- Ekonomika: gold, daně, dynamické ceny na trhu, karavany.
- Výzkum (tech strom, `100×1.25^level`), dovednosti.
- Budovy a stavba (builder companies, scaling cen).
- AI svět: zóny, politiky, frakce (warlord/psychopath/princess), revolty.
- Vojsko (warriors/archers, upkeep) a bitvy (bandité, invaze, dobývání).
- Příběh / intro / dialogy / achievementy, ukládání + offline progres.
- Mobile-first UI, PWA (manifest + service worker).

Detailní rozpad mechanik a čísel: `project/research/prosperity-design.md`.

## Scope OUT (zatím)
- Online multiplayer / serverový backend / účty (originál má náznaky – necháváme offline-first).
- Mikrotransakce / monetizace.
- Nativní appka (zůstáváme u webu/PWA).
- Převzetí původních grafik / chráněného obsahu 1:1 (viz PROVENANCE – řešit licenci / vlastní assety).

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
- Velký rozsah (plný rebuild) → nutné dělit do mnoha iterací; hrozí nedotažení pozdních systémů (AI svět, bitvy).
- Dynamicky stavěné katalogy originálu (budovy/zboží/techy) je nutné dotěžit ze zdroje dle source map.
- Stack (vanilla vs framework/engine) je předmětem architektonické iterace – rozhodne architect podle rozsahu.
- Licence / autorství originálu (assety, jména, příběh) – viz PROVENANCE.

## Aktuální stav
- Hotová tech kostra: PWA, tap-to-earn skelet, 6 data-driven generátorů, offline progres, autosave.
- Hotový research originálu: plný zdroj + design dokument + extrahovaná data (`project/research/`).
- **Další krok:** architektonický návrh cílového rebuildu → iter-001 (jádro engine + čas + sezóny).

## Workflow reference
- Dispatch agentů: skill `/dispatch-agent`
- Uzavření iterace: skill `/close-iteration`
- Checkpoint protokol a handoff: viz `docs/agent-workflow.md`
