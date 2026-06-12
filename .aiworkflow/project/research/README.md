# Research – „Prosperity" originál

Podklady pro **věrný rebuild** hry Prosperity (v0.9.5), získané reverse-engineeringem
původní webové verze.

## Obsah
- **`prosperity-design.md`** – hlavní dokument: žánr, mechaniky, potvrzená čísla balancu
  a *source map* (kde co v originále žije). **Začni tady.**
- **`prosperity-original/`** – kompletní zdrojový kód herního modulu originálu
  (69 souborů) = autoritativní „syrová data". Viz `PROVENANCE.md`.
- **`extracted/config-extract.json`** – kurátorovaný strojový výtah statické konfigurace
  (houseTypes, companies, achievements, season, engine konstanty, techScale…).
- **`extracted/rootscope-raw-dump.json`** – syrový dump `$rootScope` z runtime extrakce
  (širší, obsahuje i pomocné struktury).

## Jak to vzniklo
Stažen herní modul z `prosperity-web.dsolver.ca`, statická konfigurace vytažena
Node harness stubujícím AngularJS a spouštějícím službu `Config`. Dynamicky stavěné
katalogy (budovy/zboží/techy) se těží přímo ze zdroje podle source map v design dokumentu.

## Pozn. k autorství
Cizí hra – reference pro reimplementaci, ne k převzetí 1:1. Detaily v
`prosperity-original/PROVENANCE.md`.
