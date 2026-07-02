# Review: Vlna 2 (iter-022 T-005) — commit `16f4ea4`

- **Reviewer**: reviewer
- **Datum**: 2026-07-02
- **Scope**: QA nálezy #3/#4/#5/#6/#8/#9, diff `9e2b8a8..16f4ea4 -- src/`
- **Podklad**: `.aiworkflow/agents/coder/artifacts/final/wave2_iter-022.md`

## Verdikt: **APPROVE** (0 BLOCKER, 4 SUGGESTION, 3 NITPICK)

Všechna tvrzení codera jsem ověřil proti kódu (ne jen proti záznamu). CI jsem znovu
spustil na HEAD=`16f4ea4`: **1566/1566 pass** (včetně golden-hash `m9a-regression`).

---

## Ověřené guardraily (vše PROŠLO)

### G1 determinismus — OK
- `git show 16f4ea4 --stat`: dotčeno pouze `src/app/main.js`, `src/precache.js`,
  `src/ui/{App.js,screens.js,selectors.js,styles.css}`. **Žádný soubor v `src/core/**`
  ani `src/data/**`.**
- `selectAvailableSkills` (selectors.js:102) i `selectRecruitCatalog` (selectors.js:800)
  jsou čisté READ selektory: `hasCatalog`/`getCatalog` + `.filter/.map` nad kopiemi;
  žádný zápis do `state`. Ověřeno řádek po řádku.
- **#4 neseeduje**: jediný writer `state.home.skills` zůstává command `startSkill`
  (`core/commands/startSkill.js:53` — `if (!state.home.skills) state.home.skills = {}`
  žije v commandu, ne v UI). UI jen `send('startSkill', { skillId })` — signatura sedí.
- `exportFeedback`/`importError` jsou closure proměnné v `bootSequence` (main.js:308/311),
  mimo `state`/hashState — stejný pattern jako existující `exportReminder`.

### Data-safety #6 — OK
- `autosave.flush()` (autosave.js:52) volá `save()` **nepodmíněně** — na rozdíl od
  `requestSave()` (throttle `elapsed >= minIntervalMs`, bypass jen `reason==='hide'`).
  Odchylka od briefu (`requestSave`) je věcně SPRÁVNÁ: `requestSave('...')` by po
  nedávném autosave (<60 s) tiše neuložil a bug by přežil. Souhlasím s coderem.
- Selhání zápisu není polknuto: `.catch()` → `importError` banner (main.js:373-376).
- `env.saveGame` (saveStore.js:100-101) razítkuje `lastSimTimestamp = now()` do záznamu
  → import přežije reload (potvrzeno coderovým ad-hoc testem krok 43 → reload → krok 83).

### Wiring #3/#5/#8 — OK
- `recruitUnit` params: command bere `{ unitType: string, count?: positive int }`, cena
  lineárně `entry.goldCost * count` (recruitUnit.js:66-98). UI posílá
  `send('recruitUnit', { unitType, count })` s count 1/5 — přesná shoda; `disabled`
  pro 1× (`!u.canAfford`) i 5× (`gold < goldCost*5`) odpovídá `canAfford` checku commandu,
  takže disabled stav nikdy nelže o tom, co by command odmítl.
- Export fallback: tři cesty (writeText OK → toast; writeText reject → textarea fallback;
  clipboard API chybí → textarea fallback). Větev bez clipboardu je pokryta trailing
  `requestRender()` (main.js:334) — žádná cesta bez repaint.
- Error banner #8: `catch` → `importError` + `requestRender()`; `App.js` renderuje
  `role="alert"` bannery, dismiss handlery mají `?? (() => {})` fallback.
- Props jdou přes `getExtraProps` (main.js:403) — čtou se při KAŽDÉM renderu, ne jednou.
- **XSS**: import/export stringy jdou do DOM výhradně přes htm/preact interpolace
  (`${...}` = text node / prop, nikdy innerHTML); export string je child `<textarea>`
  (= value, neparsuje se jako HTML). `prompt()` vstup se do DOM nevkládá vůbec (jde jen
  do `importFromString` → lz-string decompress). Žádný injection vektor nenalezen.

### Regrese Vlny 1 — OK
- `send()` (main.js:288-292, render-on-send) v diffu nedotčen; `src/ui/render.js`
  (throttle) v diffu není. CI + smoke (coder) + můj CI re-run zelené.

### Edge-cases — OK
- Prázdný/chybějící katalog: `selectAvailableSkills` → `[]` → "Žádné další dovednosti";
  `selectRecruitCatalog` → BALANCE.army fallback (zrcadlí `findUnit()` v commandu, stejná
  provenance). Chybějící clipboard → fallback větev. Nevalidní import → banner, žádný pád.
- Dokončená dovednost (skills.js:50 `progressing=false`, entry ZŮSTÁVÁ v `home.skills`)
  se nevrátí do "Dostupné", ale první seznam jí dává tlačítko „Spustit" (screens.js:608)
  → žádná slepá ulička.

---

## Nálezy

### BLOCKER
Žádný.

### SUGGESTION
1. **Nepravdivý komentář o `lastSimTimestamp` (main.js:369-372).** Komentář tvrdí, že
   in-memory `lastSimTimestamp = result.lastSimTimestamp` „reflektuje now, ne stale
   pre-import hodnotu". Ve skutečnosti `importFromString` vrací **export-time** hodnotu
   z envelope (exportString.js:60-63) — při importu starého stringu je to stará hodnota.
   Funkčně neškodné (proměnná se po bootu čte jen na main.js:260, před tím než může
   onImport běžet), ale komentář kodifikuje nepravdivý invariant. Zároveň dokumentuje
   pre-existující S-6 mezeru: offline gap mezi exportem a importem se nikdy nepřizná
   (saveGame vždy razítkuje now) — to NENÍ regrese Vlny 2, jen ať se komentář opraví
   a mezera případně zapíše jako gap note.
2. **`flush()` re-entrance (autosave.js:29 `if (pending) return pending`).** Pokud v
   okamžiku importu právě dobíhá periodic save, `flush()` vrátí STARÝ promise a nový
   zápis se nespustí — v úzkém interleavingu (applyPersist už proběhl před importem)
   se importovaný stav neuloží a `.catch()` nic nechytí. Pravděpodobnost minimální
   (60s perioda vs. ms zápis; `prompt()` blokuje event loop), proto ne blocker.
   Návrh: `flush()` → `pending ? pending.then(() => save()) : save()`, nebo aspoň
   komentář u volání.
3. **Duplicitní affordability logika pro 5× tlačítko (screens.js:812-815).** 1× používá
   selektorové `u.canAfford`, 5× inlinuje `snapshot.player.gold < u.goldCost * 5` ve view.
   Návrh: selektor ať vrací `gold` nebo `canAffordCount(n)`, view ať nepočítá ceny.
4. **`selectRecruitCatalog.owned` hardcoduje warrior/archer (selectors.js:822).** Třetí
   katalogová jednotka by měla owned vždy 0 a — kvůli core quirku recruitUnit.js:104-107
   (`else → totArchers`) — inkrementovala by totArchers. Dnes neproblém (katalog má
   přesně 2 položky), ale UI teď expozuje CELÝ katalog; doporučuji whitelist
   `['warrior','archer']` nebo aspoň komentář vážící se na core quirk.

### NITPICK
1. Toast „Hra byla zkopírována do schránky" nemá auto-dismiss — zůstává do ✕ (drobné UX).
2. Nekonzistentní labely: první seznam dovedností zobrazuje `sk.id` („woodworking"),
   sekce Dostupné `sk.name` („Woodworking") — sjednotit na `name`.
3. `!existing[sk.id]` je truthiness check; `Object.hasOwn(existing, sk.id)` by byl
   přesnější (dnes bez následku — writery zapisují jen objekty).

---

## Doporučení dalšího kroku
**APPROVE** — merge/pokračovat. SUGGESTION 1 (oprava komentáře) je triviální a doporučuji
ji přibalit k nejbližší další změně `main.js`; ostatní suggestions nejsou release-critical
pro MVP. Tester by měl dle coderovy poznámky aktualizovat `e2e-rum.mjs` F9 (statický
IMPORT-NO-ERROR-FEEDBACK finding), aby QA reporty nefabulovaly vyřešený nález.
