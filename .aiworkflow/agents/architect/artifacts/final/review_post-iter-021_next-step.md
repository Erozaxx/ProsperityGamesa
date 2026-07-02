# Revize stavu post-iter-021 + návrh dalšího kroku (T-ADV-001)

- **Autor**: architect (advisory, post-iter-021)
- **Datum**: 2026-07-02
- **Brief**: BRIEF-ADV-001 (`context/inbox/brief_architect_T-ADV-001_post-iter-021.md`)
- **Režim**: read-only analýza; žádné změny v kódu/konfiguraci

---

## 0. Executive summary

1. **KOREKCE PREMISY BRIEFU:** Deploy blocker (Pages běhy #9–#12 „Resource not accessible
   by integration") **byl už 2026-06-17 vyřešen**. Běh **#13** (workflow_dispatch,
   2026-06-17T12:18Z, SHA `98f67fa` = HEAD main) skončil **success** a web je **živý a
   aktuální**: `https://erozaxx.github.io/ProsperityGamesa/` vrací HTTP 200 a nasazený
   `src/precache.js` má identickou verzi `prosperity-4830cd1e8c19` jako HEAD (ověřeno
   curl 2026-07-02). Release kandidát **JE dostupný přes https**.
2. Zůstávají ale **tři neověřené články doručitelnosti**: (a) push-triggered auto-deploy
   nikdy neuspěl (všech 12 push běhů failed; jediný úspěch je ruční dispatch po zapnutí
   Pages v Settings — od 17. 6. žádný další push, takže „další merge se nasadí sám" je
   neověřená hypotéza), (b) reálná instalace na zařízení (iOS/Android) přes živou URL
   nebyla nikdy provedena — smoke je headless Playwright, (c) release nemá tag ani verzi
   (`package.json` 0.0.0, `git tag` prázdný) a `project/done-criteria.md` má všechny
   checkboxy neodškrtnuté.
3. **Doporučení (hlavní): iter-022 = „M9c Release live & field-verified"** — malá
   uzavírací iterace: ověřit auto-deploy, ověřit instalaci na reálném zařízení (user
   gate), opravit iOS ikonu (apple-touch-icon je SVG → iOS ji nepodporuje), otagovat
   v1.0.0-rc.1, odškrtat done-criteria. Alternativa A (gap/kalibrace nejdřív) a
   alternativa B (nedělat nic, uzavřít) níže s trade-offs — obě zamítnuty s důvody (§5).

---

## 1. Ověřeno hotové vs. deklarované-ale-nedotažené

### 1.1 Ověřeno hotové (vlastní běh / přímý důkaz)

| Tvrzení | Důkaz (ověřeno 2026-07-02) |
|---|---|
| CI zelené 1566/1566 | vlastní běh `npm run ci`: `# tests 1566 / # pass 1566 / # fail 0` |
| Licence rozhodnuta (user gate T-008) | `LICENSE` (GNU GPL v3, plný text), `NOTICE` (fan disclaimer, © 2026 Erozaxx), `PROVENANCE.md` §6 „DECIDED", README sekce Licence |
| PROVENANCE + audit gate | `PROVENANCE.md` §1–6 kompletní; `tools/audit-provenance.mjs` existuje (deklarovaný výsledek: 20 katalogů, 0 verbatim) |
| Release docs | `README.md` přepsaný (rebuild popis, install, export/import), `KNOWN_ISSUES.md` (kategorizované gapy), `src/data/gap-report.json` (36 gapů, ověřen počet) |
| PWA subpath-safe | `manifest.webmanifest` (`start_url:"./index.html"`, `scope:"./"`), `service-worker.js` relativní cesty + `./index.html` fallback, `sw-register.js:89` relativní registrace |
| SW update save-safe design | `service-worker.js:18-22` message-driven SKIP_WAITING (žádný auto-skipWaiting) |
| **Web živý a aktuální** | `curl https://erozaxx.github.io/ProsperityGamesa/` → 200 (i `index.html`, `manifest.webmanifest`); nasazený `src/precache.js` = `prosperity-4830cd1e8c19` = lokální HEAD |
| Pages běh #13 success | GitHub Actions run 27688385519, event `workflow_dispatch`, conclusion `success`, 2026-06-17T12:18:50Z, SHA `98f67fa` (= merge iter-021) |
| iter-021 uzavřena čistě | `orchestration/runs/iter-021/plan.md` 8/8 tasků [x], exit-summary 0 open tasks, merge #24 na main |

### 1.2 Deklarované-ale-nedotažené (s důkazy)

| # | Položka | Důkaz | Závažnost |
|---|---|---|---|
| N1 | **Push-triggered deploy nikdy neuspěl.** Běhy #1–#12 (všechny event `push`) failed na `configure-pages`: log #12: `Get Pages site failed: Not Found` → `Create Pages site failed: Resource not accessible by integration` (GITHUB_TOKEN nesmí Pages site vytvořit; vyžadovalo ruční zapnutí v Settings). #13 uspěl až jako **ruční dispatch** po zapnutí. Od 17. 6. **žádný push neproběhl** → automatické „merge → deploy" je stále jen hypotéza (pravděpodobně nyní projde, protože Pages site už existuje a `configure-pages` ji jen přečte — ale neověřeno). | Actions API + log run 27687015430 | střední |
| N2 | **Instalace na reálném zařízení nikdy neproběhla.** Acceptance „install mobil, offline hraní" (plan.md Exit Criteria) je ověřeno jen headless (Playwright smoke, e2e v Node). Živá URL existuje teprve od 17. 6. a nikdo na ní install/offline/update flow nepotvrdil. | testreporty = Node/Playwright; žádný artefakt o on-device testu | střední |
| N3 | **iOS home-screen ikona je fakticky rozbitá:** `index.html:15` `<link rel="apple-touch-icon" href="icons/icon.svg">` — iOS Safari **SVG v apple-touch-icon nepodporuje** (potřebuje PNG ~180×180). Na iOS bude na ploše screenshot/placeholder místo ikony. Manifest má také jen SVG (`sizes:"any"`) — pro Android Chrome installabilitu to obvykle stačí, ale bez on-device ověření (N2) to je neověřené. | `index.html:14-15`, `manifest.webmanifest:12-19` | nízká–střední (user-visible) |
| N4 | **Release nemá identitu:** `package.json` `"version": "0.0.0"`, žádný git tag. „Release kandidát" existuje jen jako věta v plan.md; není na co ukázat („co přesně je RC?" = commit 98f67fa, ale nikde nefixováno). | `git tag -l` prázdný | nízká |
| N5 | **`project/done-criteria.md` má všech 6 checkboxů `[ ]`** — přestože T-007 review deklaruje „Done-criteria+acceptance SPLNĚNA". Formální stav projektu neodpovídá deklaraci. | `project/done-criteria.md` | nízká (admin) |
| N6 | **lessons_learned.md nekonzistentní:** plan.md iter-021 odkazuje LL-005/LL-006, ale soubor končí LL-004. Workflow paměť se rozešla s deklarací. | `shared/docs/lessons_learned.md` vs `runs/iter-021/plan.md:39` | nízká (workflow) |
| N7 | **`enablement: true` v pages.yml je mrtvý/riskantní krok** — prokazatelně neumí Pages zapnout (12× fail) a nyní je no-op. Zavádějící pro budoucí čtenáře. | `.github/workflows/pages.yml:32-33` + log #12 | nízká |

**Verdikt k otázce briefu:** „Release kandidát" je **věcně oprávněný** (kód, testy, licence,
docs, determinismus, a od 17. 6. i https dostupnost), ale **není field-verified**: chybí
důkaz install-on-device, důkaz auto-deploye a release identita (tag). Je to „RC nasazený
jedním ručním výstřelem", ne „RC s ověřenou doručovací pipeline".

---

## 2. Deploy/dostupnost — posouzení (T-ADV-001b)

### Skutečný stav pipeline

```
 push na main ──> pages.yml ──> stage _site ──> configure-pages ──> upload ──> deploy
      │                                             │
      │  běhy #1–#12 (push): FAIL zde ──────────────┘
      │  příčina: Pages site neexistovala; GITHUB_TOKEN ji nesmí založit
      │  fix: user zapnul Pages v Settings (mezi #12 a #13, 17.6. ~12:00Z)
      │
 dispatch #13 (ručně, 17.6. 12:18Z): SUCCESS ──> https://erozaxx.github.io/ProsperityGamesa/
                                                  │ (200, precache = HEAD 4830cd1e8c19)
 další push: ??? ── od 17.6. žádný neproběhl ─────┘  ← NEOVĚŘENÝ ČLÁNEK
```

### Dopad na status „release kandidát"

- **Dostupnost DNES: SPLNĚNA.** Hra je hratelná/instalovatelná přes https (předpoklad
  briefu už neplatí). Dopad nálezu na RC status je tedy menší, než brief předpokládal.
- **Doručitelnost PŘÍŠTÍ verze: NEOVĚŘENA (N1).** Jediný úspěšný deploy je ruční. Pokud
  by další merge tiše selhal, web zamrzne na staré verzi — a protože SW update flow
  (update banner) se spouští až novou verzí precache, uživatelé by se o nové verzi nikdy
  nedozvěděli. Riziko je nyní nízké (site existuje → `configure-pages` projde), ale
  ověření stojí jeden merge + jeden curl.
- **Instalovatelnost NA ZAŘÍZENÍ: NEOVĚŘENA (N2, N3).** To je poslední článek acceptance
  kritérií zadání („install mobil, offline hraní, spolehlivý save") a jediný, který
  headless testy principiálně ověřit nemohou. Vyžaduje člověka (user gate).

---

## 3. Kategorizace KNOWN_ISSUES gapů (T-ADV-001c)

Zdroj: `KNOWN_ISSUES.md` + `src/data/gap-report.json` (36 gapů). Tři koše:

### A. Technický dluh — levně opravitelné kódem, bez externí reference
| Gap | Rozsah | Riziko opravy |
|---|---|---|
| G-BUILD-TXAUDIT, G-RECRUIT-TXAUDIT | protáhnout `ctx` do `pay()` (2 call-sites) | **Dotýká se core** → tx report je součást stavu; nutná G1 disciplína (golden-hash regen + zdůvodnění, ideálně save-kompatibilita). Malé, ale ne „zadarmo". |
| G-AIBATTLE-DEDUP | nahradit inline resolve voláním `formulas.aiBattleResolve` | Výsledky deklarované shodné → hash by měl držet; ověřit G1. Maintenance win. |
| G-CONTRACT-SCHED-CLEANUP | prune stale schedule eventů | Mění obsah `schedule` ve stavu → G1 dopad; kosmetické, klidně odložit. |
| M8 MINOR-1/2 + nity | komentáře/struktura | Bez rizika, low value. |

### B. Scope / kalibrace — nelze zavřít kódem, chybí serverová reference; potřebují PLAYTEST data
- **G-JOB-MAXSTEP** (tagged high), G-LISTJOB/GOODS/TECHS/SKILL, **G-MILITARY-STATS**
  (medium), G-WORLD (G-LISTZONE), G-CONTRACTS-CATALOG, G-CONTRACT-GEN,
  D-CHEESE-SPOILAGE, G-SKILL-COMPENSATION.
- Společný rys: originální list-soubory v dumpu nejsou; hodnoty jsou rekonstrukce.
  „Dotažení" = **balanční kalibrace proti pocitu ze hry**, ne extrakce. To vyžaduje
  hratelnou nasazenou verzi a zpětnou vazbu → **závisí na doručitelnosti (§2)**, ne
  naopak. Jakákoli kalibrace = změna balance dat = nový golden-hash + save-migrace
  (uložené hry musí přežít) — netriviální iterace, ne úklid.

### C. Bezpečně odložit — by design / vědomé trade-offs
- G-WORLD-PERSIST-DERIVED (záměrný determinismus trade-off, revidovat až při persist
  auditu), V1 (tech→jobs enhancement), V2 (university RNG vědomá odchylka),
  achievements `onUnlock: []` (MVP design), MIN-1 (player-ATTACKING, by design).

**Rizika košů:** A = malé, ale každý zásah do core prolamuje „G1 nedotčen" argument a
chce vlastní mini-gate; B = největší hodnota pro věrnost, ale nejdražší a bez playtest
dat slepá; C = nulové riziko odkladu. Žádný gap nezpochybňuje RC status (konzistentní
s KNOWN_ISSUES deklarací „none is a release blocker").

---

## 4. Návrh dalšího kroku — DOPORUČENÍ (T-ADV-001d)

### Hlavní doporučení: iter-022 = „M9c — Release live & field-verified" (malá, uzavírací)

Obsah (odhad S–M, většina mimo core, G1 netknuto):
1. **Deploy pipeline dotažení:** trivální commit na main (např. tag + version bump) jako
   test push-triggered deploye; po doběhu curl-ověření nasazené precache verze. Úklid
   `pages.yml` (odstranit/okomentovat mrtvé `enablement: true`; volitelně přidat
   post-deploy verifikační step `curl → grep PRECACHE_VERSION`).
2. **On-device validace (USER GATE — jediný lidský krok):** install iOS (Add to Home
   Screen) + Android (install prompt) z živé URL, offline start, save přežití, update
   prompt při nové verzi. Checklist připraví tester, provede uživatel.
3. **Fix N3:** vygenerovat PNG ikonu (180×180 apple-touch-icon + 192/512 do manifestu)
   z vlastního `icon.svg`; čistě UI/asset změna, mimo core, jen regen precache.
4. **Release identita + admin:** git tag `v1.0.0-rc.1` na ověřený deploy commit,
   `package.json` version, odškrtat `project/done-criteria.md` s odkazy na důkazy
   (T-006/T-007/on-device protokol), dopsat LL-005/LL-006 do lessons_learned (N6).
5. *(Volitelně, jen zbyde-li kapacita)*: tech-debt dvojice G-AIBATTLE-DEDUP +
   TXAUDIT s explicitním G1 gate. Ne-nutné; lze nechat do iter-023.

**Proč tohle první (prioritizace):** (a) acceptance kritéria projektu jsou definována
doručitelností („install mobil, offline hraní, spolehlivý save") — to je jediná část DoD,
která dnes stojí na neověřených článcích N1–N3; (b) je to nejlevnější iterace s nejvyšší
redukcí rizika (hodiny, ne dny); (c) koš B (kalibrace) **potřebuje** živou hratelnou
verzi a zpětnou vazbu jako vstup → deploy-first odblokuje budoucí práci, obráceně to
neplatí; (d) žádný zásah do core → nulové riziko regrese determinismu.

**Trade-offs:** neposune herní obsah ani věrnost balancu; závisí na dostupnosti
uživatele (on-device krok nejde plně delegovat — mitigace: vše ostatní je agentí práce,
user gate je jeden checklist na 15 minut). **Rizika:** push-deploy může znovu selhat
z nové příčiny (mitigace: verifikační step + fallback = ruční dispatch, který
prokazatelně funguje); PNG ikona = nový soubor v precache (mitigace: standardní
`gen-precache` regen, `.md` exclusion vzor už existuje).

### Alternativa A: iter-022 = dotažení gapů (koš A + kalibrační pass na G-JOB-MAXSTEP / G-MILITARY-STATS)

- **Pro:** zvyšuje věrnost rebuidu (deklarovaný cíl projektu); koš A snižuje maintenance
  dluh; „high-tagged" G-JOB-MAXSTEP přestane strašit v gap-reportu.
- **Proti / rizika:** kalibrace bez playtest dat je střelba naslepo (reference
  neexistuje — proto jsou to carry-overs); každá změna balance/core = nový golden-hash
  + save-migrace pro existující savy; doručitelnost (N1–N3) zůstane neověřená, takže
  by se kalibrovalo něco, co si stále nikdo nemůže reálně nainstalovat.
- **Zamítnuto jako první krok** kvůli závislosti: playtest feedback ⇐ živá ověřená
  verze. Správné pořadí je M9c → pak kalibrační iterace (iter-023+) živená reálným
  hraním. Koš A lze přibalit do M9c jen jako volitelný dovětek (bod 5).

### Alternativa B: žádná iterace — prohlásit projekt za hotový as-is

- **Pro:** nulové náklady; web běží, licence vyřešena, CI zelené; všechny gapy jsou
  deklarovaně non-blocking.
- **Proti / rizika:** „release" stojí na jednom ručním deployi (N1) — příští merge může
  tiše nenasadit; iOS uživatelé dostanou rozbitou ikonu (N3) a nikdo nikdy neověřil
  install flow (N2); bez tagu/verze (N4) není co komu poslat; done-criteria formálně
  nesplněna (N5). Reputačně: „hotovo" bez důkazu doručitelnosti je přesně vzor
  „deklarované-ale-nedotažené", který tato revize kritizuje.
- **Zamítnuto:** zbytková práce je malá a levná, ale odstraňuje nepoměrně velkou
  nejistotu; nechat ji neudělanou je špatný poměr riziko/úspora.

### Doporučené pořadí dál (výhled, mimo scope iter-022)
1. iter-022 = M9c (výše) → projekt formálně DONE / v1.0.0-rc.1 live.
2. iter-023+ (volitelné, až podle zájmu o hru): kalibrační iterace z koše B řízená
   playtest zpětnou vazbou (začít G-JOB-MAXSTEP + G-MILITARY-STATS), vždy s golden-hash
   regen + save-migračním testem; koš C nechat být.

---

## 5. Předpoklady a nejistoty

- Neověřoval jsem on-device chování (nemám zařízení) — N2/N3 jsou proto formulovány
  jako „neověřeno" resp. „téměř jistě rozbité dle dokumentace platformy", ne jako fakt.
- `audit-provenance.mjs` výsledek (0 verbatim) jsem nespouštěl znovu; přebírám z T-005/
  T-006 záznamů (CI jsem naproti tomu spustil vlastnoručně).
- Příčinu úspěchu běhu #13 (zapnutí Pages v Settings uživatelem) dovozuji z časové
  posloupnosti #12 fail 11:54Z → #13 success 12:18Z a z povahy chyby; přímý audit-log
  Settings nemám.
