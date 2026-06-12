# Prosperity

Offline **idle / ekonomická** hra o budování bohatství. Hraje se v prohlížeči,
je instalovatelná na mobil (PWA) a funguje plně offline.

> Stav: první inicializace – funkční minimální jádro připravené k iteraci.
> Technologický stack je záměrně jednoduchý a je předmětem další architektonické iterace.

## Jak hrát

1. Tlačítkem **Pracovat** vyděláváš první peníze.
2. Za peníze kupuješ **investice** (stánek, obchod, kavárna, …), které generují
   pasivní příjem 💰/s.
3. Hra ti připisuje výdělek i offline – po návratu uvidíš, kolik jsi vydělal
   (max. 12 h dozadu).
4. Postup se průběžně ukládá do prohlížeče (localStorage).

## Spuštění lokálně

Hra je statická, ale ES moduly a service worker vyžadují HTTP server
(ne `file://`). Stačí jakýkoli statický server:

```bash
# Python (bez instalace navíc)
python3 -m http.server 8000

# nebo Node
npx serve .
```

Pak otevři <http://localhost:8000>.

## Struktura projektu

```
.
├── index.html              # App shell / rozložení
├── manifest.webmanifest    # PWA manifest (instalace na mobil)
├── service-worker.js       # Offline cache (cache-first)
├── icons/
│   └── icon.svg            # Ikona aplikace (nahraď vlastní)
└── src/
    ├── css/style.css       # Styly (mobile-first, tmavé téma)
    └── js/
        ├── main.js         # Vstupní bod, herní smyčka, autosave
        ├── state.js        # Počáteční stav + katalog generátorů (data-driven)
        ├── game.js         # Čistá herní logika (bez DOM)
        ├── storage.js      # Ukládání / načítání + offline progres
        └── ui.js           # Vykreslování a DOM
```

### Architektonické zásady

- **Logika oddělená od UI** – `game.js` je čistý a testovatelný; `ui.js` jen
  vykresluje. Díky tomu se dá UI vrstva v budoucnu vyměnit (framework, engine).
- **Data-driven obsah** – nové generátory/investice se přidávají úpravou pole
  `GENERATORS` v `state.js`, bez zásahu do logiky.
- **Verzované savy** – `SAVE_VERSION` + `migrate()` ve `storage.js` připraveno
  na budoucí změny formátu uložené hry.

## Další možné kroky

- Vylepšení (multiplikátory, prestige/reset s bonusem).
- Achievementy a statistiky.
- Lepší ikony (PNG sady) a splash screen.
- Zvuky a haptická odezva.
- Případný přechod na framework/engine, až obsah poroste.
