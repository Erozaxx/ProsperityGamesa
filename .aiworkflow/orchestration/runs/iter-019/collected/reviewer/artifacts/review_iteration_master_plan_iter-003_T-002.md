# Review master plánu iterací (iter-003, T-002)

- **Task**: T-002, iter-003 (BRIEF-009)
- **Autor**: reviewer
- **Datum**: 2026-06-13
- **Model**: Opus
- **Předmět review**: `agents/project-manager/artifacts/final/iteration_master_plan_iter-003_T-001.md`
- **Vstupy review**: master plán (PM T-001); architektura `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md` (§0 D1–D13, §10 K0–K19, §11 M0–M9, §12 rizika); zadání `zadani_projektu.md`; brief BRIEF-009
- **Účel**: Quality gate před schválením uživatelem (T-004). Posouzení úplnosti plánu, řezu tasků (Opus-návrh + Sonnet-provedení), závislostí/kritické cesty, test loop + review gate u každé iterace a konzistence s architekturou. Verdikt GO / GO s úpravami / NO-GO.
- **Scope OUT (dodrženo)**: plán neměním (mění PM v T-003); architekturu/rozhodnutí D1–D13/R1–R4 znovu nehodnotím – posuzuji jen, zda je plán s nimi konzistentní a realizovatelný.

---

## 0. Souhrnný verdikt

**GO s úpravami.**

Plán je věcný, disciplinovaný a je poctivým sekvencováním schválené architektury – netvoří nová architektonická rozhodnutí, jen řadí M0–M9 do 15 implementačních iterací (iter-004…iter-018) s explicitními DoD, test loopy a review gates. Mapování milníků na iterace (§2) je **úplné a beze děr**: každý milník M0–M9 má ≥1 iteraci, řetěz M0→release je souvislý, MVP hranice (M0–M4 = iter-004…iter-011) odpovídá §11 architektury. Konvence plánu (§1) korektně přebírají model-constrainty (Opus návrh / Sonnet provedení / tester Sonnet+Haiku / reviewer Opus s právem re-run) a povinný test loop i review gate jsou zavedeny jako explicitní tasky T-TEST a T-REV u **každé** iterace.

**Žádný BLOCKER.** Plán lze předložit uživateli ke schválení po zapracování níže uvedených SUGGESTION (žádná z nich nemění strukturu plánu ani architekturu – jde o zpřesnění řezu, odstranění jedné vnitřní nekonzistence a doplnění explicitních split-triggerů). NITPICKy jsou redakční.

**Doporučení dalšího kroku: APPROVE s drobnými úpravami → PM zapracuje SUGGESTION v T-003, poté schválení uživatelem (T-004).**

---

## 1. Potvrzení bodů 1–5 ze Scope IN

| # | Bod ze Scope IN | Verdikt | Poznámka |
|---|---|---|---|
| 1 | **Úplnost** (M0–M9 → iterace bez děr) | **OK** | §2 tabulka + explicitní věta „žádný milník bez iterace, žádná díra M0→release". Ověřeno níže §2. |
| 2 | **Řez tasků** (Opus návrh + Sonnet provedení) | **OK s výhradami** | Drtivá většina tasků S/M je v pořádku. L-tasky jsou ošetřeny pravidlem §1.2 (Opus návrh L MUSÍ obsahovat dekompozici, jinak orchestrátor dělí). Viz S-1 (koncentrace L v iter-007/iter-014). |
| 3 | **Závislosti & kritická cesta** | **OK s 1 nekonzistencí** | Pořadí a prerekvizity sedí (M1 před obsahem, M2a před M2b, trh M4b před AI M7a). Viz S-2 (ASCII diagram §2.2 vs. text). |
| 4 | **Test loop + review gate u KAŽDÉ iterace** | **OK** | Všech 15 iterací má T-TEST i T-REV; obsah testů je smysluplný a kumulativní (§1.3). Viz S-4 (drobná nekonzistence formulace PWA smoke). |
| 5 | **Konzistence s architekturou** | **OK** | catch-up-safe invariant (od iter-007/M2), M1 = extrakce, `tsc --checkJs` DoD M0 (iter-004 T1 + DoD), MVP = M0–M4 (iter-011) – vše věrně přeneseno. |

---

## 2. Úplnost a pokrytí milníků (bod 1) – potvrzeno

Ověřeno proti §11 architektury (M0–M9):

- **M0** → iter-004 (M0a) + iter-005 (M0b). Split engine-core / PWA+save+benchmark je legitimní (M0 je hustý milník). DoD M0 (`tsc --checkJs` CI gate, benchmark *před* potvrzením capu, první PWA smoke) je v DoD iter-005 + iter-004 T1 – **sedí**.
- **M1** → iter-006. Extrakce + gap report + balance/formulas + registr efektů kostra – odpovídá §11/§9.3. **Sedí.**
- **M2** → iter-007 (M2a) + iter-008 (M2b). Split M2a/M2b je explicitně povolen architekturou (§11 pozn. S-04). M2a = resource + persist + systémy, M2b = catch-up MVP + autosave + summary. **Sedí.**
- **M3** → iter-009, **M4** → iter-010 (M4a gold/daně/upkeep/účetnictví) + iter-011 (M4b trh/karavany/kontrakt). MVP hranice po iter-011 = M0–M4. **Sedí s §11.**
- **M5** → iter-012, **M6** → iter-013, **M7** → iter-014 (M7a svět+jednotky) + iter-015 (M7b bitvy), **M8** → iter-016, **M9** → iter-017 (M9a kalibrace) + iter-018 (M9b release). **Sedí.**

Závěr: pokrytí je **úplné a bezděrové**. Žádný milník ani DoD-prvek architektury (benchmark, gap report, MVP gate, release gate) nezůstal nenamapován. Mapování rizik §12 architektury → plán (A4 v §4 plánu: R-A…R-J) je rovněž kompletní.

---

## 3. Nálezy

Klasifikace: **BLOCKER** (musí být opraveno před GO) / **SUGGESTION** (doporučeno, zlepšuje proveditelnost) / **NITPICK** (redakční).

### BLOCKER
Žádný.

---

### SUGGESTION

**S-1 — Koncentrace L-tasků v iter-007 a iter-014 zvyšuje riziko Sonnet-provedení; doplnit explicitní split-trigger.**
*Odkaz: iter-007 (T1, T2, T4 = 3× L) a iter-014 (T1, T2 = 2× L).*
Řez tasků na komplexitu Opus-návrh + Sonnet-provedení je celkově dobrý, ale **iter-007 nese tři L-tasky** (T1 transakční vrstva, T2 persist schémata + migrace, T4 food+health+crime) v jedné iteraci – a to je zároveň podle architektury (§11 S-04) nejhustší milník. Pravidlo §1.2 (u L Opus návrh dekomponuje, jinak orchestrátor dělí) i §4 A3 (orchestrátor smí dělit) sice riziko pokrývají obecně, ale na rozdíl od iter-012 (kde je explicitní split-trigger M5a/M5b v poznámce) **iter-007 explicitní split-trigger nemá**. Doporučuji do iter-007 doplnit analogickou poznámku jako u iter-012: „pokud Opus návrhy ukážou, že transakční vrstva + persist + 4 systémy nesouzní do jedné iterace, orchestrátor smí split M2a-1 (T1–T2 infrastruktura) / M2a-2 (T3–T5 systémy + stuby) bez dopadu na architekturu". Totéž zvážit pro iter-014 (T1 zone tick + T2 frakční AI automat = dva nezávislé L celky). Tím se řez tasků 2 stane robustnějším bez změny rozsahu.

**S-2 — Vnitřní nekonzistence: ASCII diagram kritické cesty (§2.2) neukazuje hranu iter-006 → iter-007, kterou text explicitně vyžaduje.**
*Odkaz: §2.2 plánu (ASCII diagram vs. odrážky pod ním + závislost iter-007).*
Text §2.2 i hlavička iter-007 uvádějí „**Závisí na**: iter-005, iter-006" a tvrdí „M1 blokuje M2+ (katalogy)". ASCII diagram však kreslí horní větev `iter-006 (M1) ──┘` napojenou na uzel mezi iter-005 a iter-007 s popiskem „(M2a potřebuje katalogy)", zatímco hlavní linka vede `iter-005 → iter-007` přímo. Čtenáři to může implikovat, že iter-006 je volitelná odbočka, ne tvrdá prerekvizita iter-007. Vzhledem k tomu, že iter-006 (M1 gap report) je tvrdý blocker pro M2+ (architektura §9.3: „M1 blokuje obsahové milníky"), doporučuji diagram upravit tak, aby **obě** hrany do iter-007 (z iter-005 i z iter-006) byly jednoznačně tvrdé závislosti (např. `(iter-005, iter-006) → iter-007`). Nemění to plán věcně, jen sjednocuje diagram s textem. (Bod 3 ze Scope IN je jinak v pořádku – jde čistě o čitelnost diagramu.)

**S-3 — Re-planning checkpoint po iter-006 vs. deklarovaná „v podstatě lineární" kritická cesta – doplnit, co se stane s rozpracovanými iteracemi při změně rozsahu.**
*Odkaz: §2.2 (kritická cesta + re-planning checkpoint) a §4 A1.*
Plán správně zavádí re-planning checkpoint po iter-006 (gap report může změnit rozsah M2+; §13.1 architektury) a označuje M2+ za „plán, ne závazek rozsahu". Zároveň ale §2.2 popisuje kritickou cestu jako „v podstatě lineární – každá iterace staví na předchozí". Tyto dvě tvrzení nejsou v rozporu, ale plán neříká **jak se checkpoint promítne**, pokud gap report odhalí chybějící techs/zones dat (riziko R-A, vysoký dopad): §4 A1 zmiňuje „posouvá se obsah M6/M7, ne architektura", ale neuvádí to v sekci kritické cesty. Doporučuji do §2.2 přidat větu, že při materiální změně rozsahu po gap reportu PM vydá decision record a iterace M6/M7 (iter-013–015) se re-scopují **před** jejich zahájením, zatímco kritická cesta MVP (iter-007→011) zůstává nezávislá na gap reportu obsahu pozdních systémů. Zpřesní to očekávání bez změny plánu.

**S-4 — PWA smoke není v textu test loopu explicitně vyjmenován u iter-006 a iter-007, ač §1.3 ho vyžaduje „od M0 při každé iteraci".**
*Odkaz: §1.3 (od iter-005 „PWA smoke – od M0 při každé iteraci, ne až M9, N-03") vs. T-TEST iter-006 a iter-007.*
§1.3 stanovuje PWA smoke jako kumulativní (od iter-005 dál „při každé iteraci"). Většina pozdějších iterací (iter-009, 010, 011, 012, 013, 014, 015, 016, 017) ho v textu T-TEST výslovně opakuje, ale **T-TEST iter-006 a iter-007 ho ve výčtu nemají** (iter-006 řeší schema/vzorce, iter-007 catch-up-safe/persist). Protože kumulativní pravidlo §1.3 platí, formálně PWA smoke poběží i tam – ale kvůli konzistenci a aby tester nevynechal, doporučuji buď (a) doplnit „+ PWA smoke" do výčtu T-TEST iter-006 a iter-007, nebo (b) přidat do §1.3 jednu větu „kumulativní sada platí i tam, kde T-TEST výčet neopakuje každou položku". Bod 4 ze Scope IN je tím jinak splněn (každá iterace má T-TEST i T-REV s právem re-run); jde o odstranění potenciální nejednoznačnosti pro testera.

**S-5 — Eskalace po 3. neúspěšném re-run kole (§1.4) nemá určený dopad na kritickou cestu.**
*Odkaz: §1.4 (re-run smyčka, eskalace po 3. kole).*
§1.4 dobře definuje re-run právo reviewera a eskalaci po 3. neúspěšném kole (analýza příčiny: špatný řez vs. chybný návrh). Plán ale neříká, zda eskalace blokuje **navazující** iterace (lineární kritická cesta!) nebo zda smí orchestrátor pokračovat na nezávislé větvi. Vzhledem k tomu, že §2.2 deklaruje téměř plně lineární řetěz, zaseknutá iterace zablokuje vše za sebou. Doporučuji do §1.4 doplnit, že po eskalaci se navazující iterace nezahajují, dokud není zaseklá iterace uzavřena (nebo její rozsah re-scopován decision recordem). To je realistické očekávání, ne změna mechaniky.

---

### NITPICK

**N-1 — iter-008 T1 závislost na catch-up-safe systémech z iter-007.**
*Odkaz: iter-008 T1 (catch-up smyčka „dohání jen systémy M2").* Catch-up MVP dohání systémy M2 (population/food/health/crime z iter-007). T1 má „Závisí na: –" (myšleno v rámci iterace), ale iterační závislost iter-008 → iter-007 to pokrývá. Doporučuji jen kosmeticky uvést v T1 odkaz, že dohánění předpokládá catch-up-safe invariant zavedený v iter-007 T-TEST (jinak nesrozumitelné bez kontextu).

**N-2 — Konzistence názvosloví split: „M2a-1/M2a-2" vs. „M5a/M5b".**
Pokud se přijme S-1 (split-trigger iter-007), zvolit konzistentní názvosloví se split-triggerem iter-012 (M5a/M5b). Čistě redakční.

**N-3 — iter-017 T4 je L, ale bez explicitní dekompozice v poznámce.**
*Odkaz: iter-017 T4 (balanc regression, L).* Stejně jako u jiných L platí §1.2 (Opus návrh dekomponuje). Žádná akce nutná, jen upozornění, že dlouhé simulační běhy (rok+ herního času) mohou narazit na časové limity test loopu – zvážit zmínku v poznámce iterace.

**N-4 — §4 odst. 5 „Žádný rozpor s D1–D13/R1–R4 nenalezen" – potvrzuji.**
Ověřil jsem namátkově klíčové vazby: cap `min(technický, balanční)` (iter-008 T1) ↔ D10/§9.2; `getGoldValue`/`market.inject` kontrakt + obrácení negativního testu S-06 na pozitivní v iter-011 T3 ↔ §8.2/§9.1; modifikátory save = jen seznam (iter-012 T4) ↔ §5.3; persist = allowlist/load čistá konstrukce (iter-007 T2) ↔ §6.3–6.4. Vše konzistentní. Bez akce.

---

## 4. Posouzení řezu tasků (bod 2) – detail

- Tasky jsou převážně S/M, řezané na ~4–6 implementačních + T-TEST + T-REV per iterace (§4 A3) – to je realistický rozsah pro jeden Opus-návrh + Sonnet-provedení průchod.
- L-tasky se vyskytují cíleně a jsou kryté pravidlem §1.2 (povinná dekompozice v Opus návrhu) – akceptovatelné. Jediná reálná výhrada je **koncentrace** L v iter-007 a iter-014 (S-1), ne existence L jako taková.
- Tasky typu „S, Návrh: Opus (zkrácený)" (např. iter-005 T4, iter-008 T5, iter-011 T2/T3) korektně využívají pravidlo §1.1 (u S smí být návrh zkrácený brief). Konzistentní.
- UI tasky (Návrh: Sonnet) u jednoduchých obrazovek (iter-008 T3, iter-010 T4, iter-016 T4) jsou rozumně odlehčené – návrh nepotřebuje Opus. Souhlasím.

**Závěr bodu 2: řez je realistický pro Sonnet-provedení; jediná akční výhrada je S-1 (explicitní split-trigger pro hustá L-místa).**

---

## 5. Posouzení test loop + review gate (bod 4) – detail

- **Test loop**: §1.3 definuje kumulativní sadu s jasnou progresí (od iter-004 tsc/node:test/determinismus/grep gate → iter-005 save round-trip + PWA smoke → iter-006 schema + tabulkové vzorce → iter-007 catch-up-safe invariant + kontraktní testy §8 vč. negativního S-06 → iter-008 e2e catch-up + migrace). Kumulativnost je explicitní („co jednou platí, platí navždy"). Obsah testů je smysluplný a věrný architektuře (determinismus G1, save round-trip, catch-up-safe S-05, negativní test S-06, MVP e2e v iter-011, release e2e v iter-018).
- **Review gate**: každá iterace má T-REV (reviewer Opus) s právem re-run (§1.4). Gate kontroluje DoD + AC + kontrakty §8 + živé artefakty (tickOrder §4.3, diagram §3.5; N-04 architektury) + balance do balance.js + persist se systémem. To přesně odpovídá milestone reviewer gate z §11 architektury.
- Speciální gates jsou správně zvýrazněny: **MVP gate** (iter-011 T-REV: ověření všech AC zadání, nesplnění = re-run) a **release gate** (iter-018 T-REV: done-criteria projektu). Sedí s acceptance criteria zadání.

**Závěr bodu 4: test loop i review gate jsou u každé iterace přítomny a obsahově správné. Drobnost S-4 (PWA smoke ve výčtu) je jediná nekonzistence.**

---

## 6. Posouzení konzistence s architekturou (bod 5) – detail

- **catch-up-safe invariant**: zaveden přesně od iter-007/M2 (§1.3 tabulka), opakovaně vyžadován v T-TEST iter-009–017. Odpovídá S-05/§4.1 (invariant rozšiřovaný s každým novým systémem). **Konzistentní.**
- **M1 = extrakční pipeline**: iter-006 T1 (`tools/extract/`, R3/D11) + gap report T6 + eskalace uživateli. Odpovídá §9.3. **Konzistentní.**
- **`tsc --noEmit --checkJs` DoD M0**: iter-004 T1 (CI gate) + DoD iter-004 („`tsc --checkJs` + grep gate zelené a povinné v CI; S-01/R-I"). Odpovídá §2.2/§11/R-I. **Konzistentní.**
- **MVP = M0–M4**: §2.1 plánu + DoD iter-011 (MVP gate). Odpovídá §11 architektury. **Konzistentní.**
- **Stub world/battle + kontrakty §8 od M2**: iter-007 T5 (stub registrace + kontraktní testy + negativní S-06), obrácení na pozitivní kontrakt v iter-011 T3, naplnění v iter-014/015. Odpovídá D12/§8/§9.4. **Konzistentní.**

**Závěr bodu 5: plán je věrně konzistentní s architekturou; nezavádí nová rozhodnutí ani nerozporuje D1–D13/R1–R4.**

---

## 7. Otázky plánu (§5) – posouzení

Plán pokládá 3 otázky (Q1 MVP playtest checkpoint, Q2 reálné mobilní zařízení pro benchmark/PWA smoke, Q3 kdo rozhoduje gap report eskalaci), všechny s rozumným fallback-předpokladem („plán platí i bez odpovědí"). To je správný přístup – nejsou to blockery. Pouze upozorňuji, že **Q2 (benchmark na low-end mobilu)** váže na DoD M0 a riziko R-B; pokud uživatel reálné zařízení nedá, syntetická náhrada (A2) musí být v benchmark reportu explicitní, jak plán správně píše. Doporučuji, aby orchestrátor Q1–Q3 předal uživateli spolu s tímto review při T-004 (nejsou pro PM v T-003, ale pro uživatele).

---

## 8. Shrnutí a doporučení

- **Verdikt: GO s úpravami.**
- **0 BLOCKER · 5 SUGGESTION (S-1…S-5) · 4 NITPICK (N-1…N-4).**
- Body 1–5 ze Scope IN: **1 úplnost OK · 2 řez OK s výhradou (S-1) · 3 závislosti OK s 1 nekonzistencí diagramu (S-2) · 4 test loop+gate OK (drobnost S-4) · 5 konzistence s architekturou OK.**
- Žádný nález nemění architekturu ani nevyžaduje přepracování struktury plánu. Všech 5 SUGGESTION je zapracovatelných lehkou redakcí (split-triggery, oprava diagramu, doplnění vět o re-planningu/eskalaci/PWA smoke).
- **Doporučení dalšího kroku**: PM zapracuje S-1…S-5 (a dle uvážení N-1…N-4) v T-003 → poté předat uživateli ke schválení (T-004) spolu s otázkami Q1–Q3.

---

*Konec review. Plán je sekvencováním schválené architektury iter-002 (D1–D13, K0–K19, M0–M9); tam, kde review cituje §/K/D/R/S/N položky, je zdrojem pravdy architecture_proposal_iter-002_T-001.md.*
