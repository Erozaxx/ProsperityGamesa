# Fix-plán — post-iter-021 (ke schválení)

- **Autor**: orchestrator, z QA reportu T-ADV-002 (`agents/tester/artifacts/final/e2e-rum-report_post-iter-021.md`)
- **Datum**: 2026-07-02
- **Vstup**: 10 reprodukovaných nálezů (0 BLOCKER / 6 MAJOR / 4 MINOR); RUM čistá (0 pádů).
- **Status**: NÁVRH — čeká na schválení uživatele. Žádná oprava zatím neproběhla.
- **Princip**: opravy jsou UI/wiring/CSS vrstva. Herní jádro `src/core/` a data `src/data/` se NEMĚNÍ
  → determinismus G1 (golden-hash) musí zůstat bit-identický. Každá vlna = vlastní verifikace.

---

## Prioritizace — 3 vlny (dle dopad × četnost)

### 🔴 Vlna 1 — „hra vypadá rozbitá / zamrzlá" (nejvyšší dopad, nejlevnější)
Toto je nejpravděpodobnější zdroj uživatelova „spousta chyb". Bez těchto dvou je verdikt NO-GO.

| # | Nález | Root cause (ověřeno) | Návrh opravy | Soubory | Effort | Riziko |
|---|---|---|---|---|---|---|
| **#2** | Akce při pauze/story-freeze nedávají zpětnou vazbu (tlačítka „mrtvá") | `send()` po dispatchi nevolá `requestRender()`; render jen na tick smyčky | Obal `send` tak, aby po úspěšném dispatchi naplánoval (trailing) render | `src/app/main.js:277` | S | **Střední** — dotýká se render/loop wiringu; hlídat render-throttle (iter-021 UX-3, `render.js`). Čistě UI, nesahá do core → G1 netknuto |
| **#1a/b/c** | Story dialog neostylovaný, pod okrajem stránky, neblokuje pozadí | `.story-overlay/.story-dialog/.story-option-btn` mají 0 CSS; komponenta jinak OK | Přidat CSS: fixed overlay + backdrop + z-index + centrování + blokace pozadí | `src/ui/styles.css` (+ příp. `GamelogScreen.js` pro focus-trap) | S–M | **Nízké** — CSS-only (modalita může chtít malý JS guard) |

**Verifikace vlny 1:** `npm run ci` (1566/1566), `npm run smoke`, harness `e2e-rum.mjs` (F1 story flow + pauza-render check), vizuální kontrola dialogu @390/1280. Golden-hash beze změny.

### 🟠 Vlna 2 — nedosažitelné funkce + data-safety
| # | Nález | Root cause | Návrh opravy | Soubory | Effort | Riziko |
|---|---|---|---|---|---|---|
| **#3** | Nábor jednotek není v UI | `recruitUnit` wired v jádře, ale žádný tab ho nevystavuje | Přidat UI (tlačítko/obrazovka) volající command `recruitUnit` | `src/ui/screens.js`, `src/ui/` routing | M | Nízké (UI-only; command existuje) |
| **#4** | Tab „Dovednosti" trvale prázdný | `SkillsScreen` renderuje jen existující `state.home.skills`; nic je neseeduje → cyklická nedosažitelnost | Přidat katalog „dostupných dovedností → Spustit" v UI (a/nebo seed) | `src/ui/screens.js:574`, `selectors.js:80`; seed rozhodnout | M | **Střední** — pokud seed jde přes core/data, hlídat G1. Preferovat čistě UI katalog nad seedem do stavu |
| **#6** | Import se neuloží → reload ho zahodí | `onImport` dělá `Object.assign` + render, ale nevolá `autosave.requestSave()` | Po úspěšném importu zavolat `autosave.requestSave()` | `src/app/main.js:310` | S | Nízké — hlídat `lastSimTimestamp` konzistenci |
| **#5** | Export: tichý clipboard bez potvrzení/fallbacku | `onExport` píše jen do `navigator.clipboard`, chyby spolknuty | Přidat viditelné potvrzení + fallback (textarea/download) když clipboard chybí | `src/app/main.js:289`, UI | S–M | Nízké |

**Verifikace vlny 2:** harness F6 (recruit), F9 (export/import round-trip + reload-po-importu), nový e2e pro skills; CI/smoke; golden-hash beze změny (pokud se neseeduje do core).

### 🟡 Vlna 3 — MINOR leštění (volitelné, může počkat)
| # | Nález | Návrh | Soubory | Effort |
|---|---|---|---|---|
| **#7** | Rychlé klikání daní ztrácí kroky (stale closure) | Číst živý stav / lokální counter místo snapshotu | `src/ui/screens.js:242` | S |
| **#8** | Neplatný import tiše ignorován | Zobrazit chybovou hlášku v `catch` | `src/app/main.js:317` | S |
| **#9** | HUD staty slepené | `.stats` gap/flex v CSS | `src/ui/styles.css` | XS |
| **#10** | Neostylované panely (offline summary/catch-up) | Dostylovat `.offline-summary`, `.catchup-progress` | `src/ui/styles.css` | S |

---

## Návrh struktury iterace

**Doporučení: iter-022 = „M9c — Release live & UX fixes"** (spojit s architektovým M9c návrhem):
1. **Vlna 1** (coder) → review → tester re-verify (odblokuje „hratelné bez frustrace")
2. **Vlna 2** (coder) → review → tester
3. **Vlna 3** (volitelně, pokud zbude kapacita)
4. Architektův M9c admin: deploy pipeline ověření, PNG ikony (N3), tag `v1.0.0-rc.1`, on-device user gate
5. Close + re-deploy

**Alternativa (rychlá):** jen Vlna 1 jako hotfix (iter-022 mini), zbytek do iter-023. Nejrychlejší cesta k „nevypadá to rozbitě".

## Otevřené otázky ke schválení
1. **Rozsah iter-022:** všechny 3 vlny + M9c admin, nebo jen Vlna 1 jako rychlý hotfix?
2. **#4 dovednosti:** seedovat dovednosti do stavu (dotek core → G1 gate) NEBO čistě UI katalog dostupných (bez doteku stavu)? Preferuji UI katalog (nulové G1 riziko).
3. **Model coderu:** Fable (rychlý) nebo silnější na wiring #2/#4?
4. **Determinismus:** potvrzuji, že žádná oprava nesmí změnit golden-hash — pokud by #4 seed vyžadoval dotek core, eskaluji zvlášť.
