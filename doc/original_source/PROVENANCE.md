# Provenance – původní hra „Prosperity"

## Zdroj
- URL: <https://prosperity-web.dsolver.ca/>
- Staženo: 2026-06-12
- Verze hry: **0.9.5** (`$rootScope.version`)
- Technologie originálu: AngularJS 1.x (MEAN.js stack), socket.io, lz-string, d3, jQuery/jQuery-UI, angular-material/bootstrap.

## Co tu je
- `modules/prosperity/` – kompletní herní modul originálu (69 souborů):
  - `services/` – herní logika (engine, world, player, market, field, forest, mine, battle, techs, seasons, skills, events, dialogue, game, home, academy, tinkery, config…).
  - `controllers/` – obrazovky/oblasti (home, forest, mine, field, market, academy, council, tinkery, pub, masonsguild, militarycouncil, wall, reliquary, battlefight, intro, devlog…).
  - `directives/` – UI komponenty (buildingcard, techtree, techcard, contractcard, battlemap, inventory, jobtasks, person, progressbar, sector, storyscreen…).
  - `filters/`, `lists/`, `config/` – formátování, data, routy.
- `application-config.js` – root app config originálu.
- `index.html` – původní HTML shell (seznam všech assetů).

## Účel
Referenční materiál pro **věrný rebuild**. Toto je autoritativní „syrová data" – konkrétní
čísla balancu (ceny, produkce, scaling) se těží odsud. Strukturovaný výtah viz
`./extracted/`. Kompletní popis hry viz `../original_source_doc.md`.

## Pozn. k autorství
Jde o data a kód **cizí hry** (autor originálu, komunita r/ProsperityGame). Slouží jako
reference pro reimplementaci; při případném veřejném vydání je nutné vyřešit licenci /
přepracovat assety a chráněný obsah (jména, příběh, grafika) do vlastní podoby.
