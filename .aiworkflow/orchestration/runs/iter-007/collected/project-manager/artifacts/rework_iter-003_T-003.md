# Rework note – zapracování review nálezů do master plánu (iter-003, T-003)

- **Task**: T-003, iter-003 (BRIEF-010)
- **Autor**: project-manager
- **Datum**: 2026-06-13
- **Předmět**: rework `agents/project-manager/artifacts/final/iteration_master_plan_iter-003_T-001.md` podle review `agents/reviewer/artifacts/final/review_iteration_master_plan_iter-003_T-002.md` (verdikt GO s úpravami, 0 BLOCKER, 5 SUGGESTION, 4 NITPICK)
- **Rozsah zásahu**: čistě redakční zpřesnění – struktura plánu (15 iterací, §1–§5), řez iterací, architektura a rozhodnutí D1–D13/R1–R4 beze změny. Žádná nová iterace, žádný nový milník. Otázky Q1–Q3 ponechány beze změny – jdou uživateli při T-004.

---

## 1. Mapa „nález → kde a jak zapracován" (SUGGESTION, povinné)

| Nález | Kde zapracováno | Jak zapracováno |
|---|---|---|
| **S-1** – chybějící explicitní split-trigger u koncentrace L-tasků v iter-007 a iter-014 | iter-007 (nová „Pozn. (split-trigger)" pod DoD), iter-014 (nová „Pozn. (split-trigger)" pod DoD), §4 A3 | Do iter-007 doplněn split-trigger analogický iter-012: pokud Opus návrhy ukážou, že transakční vrstva + persist + 4 systémy nesouzní do jedné iterace, orchestrátor smí split **M2a-1** (T1–T2 infrastruktura) / **M2a-2** (T3–T5 systémy + stuby), bez dopadu na architekturu, DoD M2a se vyhodnotí po M2a-2. Do iter-014 doplněn obdobný trigger pro dva nezávislé L celky: **M7a-1** (T1, T4, T5 – zóny + jednotky + napojení trhu) / **M7a-2** (T2, T3, T6 – frakční AI + revolty/questy/tribute + UI). §4 A3 nyní explicitně vyjmenovává všechny tři split-triggery. |
| **S-2** – ASCII diagram §2.2 neukazoval hranu iter-006 → iter-007 jako tvrdou závislost | §2.2, ASCII diagram | Diagram překreslen: obě hrany do iter-007 (z iter-005 i z iter-006) se nyní sbíhají do společného uzlu `──┐ ├─→ iter-007` a jsou opatřeny popiskem „obě hrany do iter-007 jsou TVRDÉ závislosti: M0b dává PWA/save, M1 katalogy – ‚M1 blokuje M2+'". Diagram je tím sjednocen s textem („Závisí na: iter-005, iter-006") a hlavičkou iter-007. |
| **S-3** – §2.2 neříkalo, jak se re-planning checkpoint po iter-006 promítne při změně rozsahu | §2.2, odrážka „Re-planning checkpoint po iter-006" | Doplněno: při materiální změně rozsahu po gap reportu (typicky díry v listTechs/listZone, riziko R-A) PM vydá **decision record** a iterace M6/M7 (iter-013–015) se re-scopují **před** jejich zahájením, ne za běhu. Explicitně uvedeno, že kritická cesta MVP (iter-007 → iter-011) zůstává na gap reportu obsahu pozdních systémů **nezávislá** (staví na katalozích jádra), takže se rozjíždí hned po iter-006. |
| **S-4** – PWA smoke nebyl vyjmenován v T-TEST iter-006 a iter-007, ač §1.3 ho vyžaduje od M0 při každé iteraci | §1.3 (nová věta nad „Systém funguje live…") + T-TEST iter-006 + T-TEST iter-007 | Zapracovány **obě** varianty reviewera (pásek i kšandy): (b) do §1.3 doplněna věta, že kumulativní sada platí i tam, kde T-TEST výčet neopakuje každou položku – tabulka §1.3 je pro testera zdroj pravdy, výčty v T-TEST jen zvýrazňují nové priority; (a) do výčtů T-TEST iter-006 a iter-007 doplněno „+ PWA smoke (kumulativní sada 1.3)". Nejednoznačnost pro testera odstraněna. |
| **S-5** – eskalace po 3. neúspěšném re-run kole neměla určený dopad na kritickou cestu | §1.4, nová odrážka „Dopad eskalace na kritickou cestu" | Doplněno: po eskalaci se **navazující iterace nezahajují**, dokud zaseklá iterace není uzavřena (reviewer GO) nebo její rozsah re-scopován decision recordem; orchestrátor nesmí pokračovat „okolo" zaseklé iterace. Jediná výjimka = deklarovaný paralelismus iter-005 ∥ iter-006 dle §2.2. |

## 2. Rozhodnutí o NITPICK (N-1…N-4)

| Nález | Rozhodnutí | Kde / proč |
|---|---|---|
| **N-1** – iter-008 T1 bez odkazu na catch-up-safe invariant z iter-007 | **Přijato** (doporučeno briefem) | iter-008 T1: doplněno „(předpokládá catch-up-safe invariant zavedený a otestovaný v iter-007 T-TEST)" a závislost tasku upřesněna z „–" na „iter-007" (iterační prerekvizita explicitně i na řádku tasku). |
| **N-2** – konzistentní názvosloví splitů (po přijetí S-1) | **Přijato** | Zavedena jednotná konvence: intra-iterační splity orchestrátora = `<milník>-1/<milník>-2` (**M2a-1/M2a-2**, **M5-1/M5-2**, **M7a-1/M7a-2**); písmenné sufixy a/b zůstávají vyhrazeny milníkovým splitům přes hranici iterací (M2a/M2b, M7a/M7b). Proto přejmenován původní split-trigger iter-012 z „M5a/M5b" na „M5-1/M5-2" (zabraňuje záměně s milníkovými splity) a konvence je poznamenána v pozn. iter-012; §4 A3 aktualizován. |
| **N-3** – iter-017 T4 (L): dlouhé simulační běhy vs. časové limity test loopu | **Přijato** (doporučeno briefem) | iter-017: nová „Pozn. (T4, L)" pod DoD – Opus návrh T4 (povinná dekompozice L dle §1.2) musí běhy rozdělit na seedované segmenty / checkpointované úseky, aby jednotlivý testovací běh zůstal pod limitem prostředí. |
| **N-4** – potvrzení „žádný rozpor s D1–D13/R1–R4" | **Bez akce** (dle review i briefu) | Reviewer konzistenci potvrdil; v plánu není co měnit. |

## 3. Co se záměrně NEměnilo

- Struktura plánu: 15 iterací (iter-004 … iter-018), mapování milníků M0–M9, MVP hranice po iter-011, sekce §1–§5 – beze změny.
- Architektura a rozhodnutí D1–D13, R1–R4 – beze změny (plán architekturu nadále jen sekvencuje).
- Otázky **Q1–Q3** (§5 plánu) – neřešeny zde; dle review §7 je orchestrátor předá uživateli spolu s review při T-004.

## 4. Validace (provedeno před handoffem)

- Grep plánu potvrzuje: split-trigger v iter-007 (M2a-1/M2a-2) i iter-014 (M7a-1/M7a-2); „PWA smoke" v §1.3 (kumulativní pravidlo) i ve výčtech T-TEST iter-006 a iter-007; dopad eskalace na kritickou cestu v §1.4; re-planning dopad + decision record v §2.2.
- Tato nota obsahuje mapu nález→místo pro všech 5 SUGGESTION (tabulka §1) a rozhodnutí pro všechny 4 NITPICK (tabulka §2).

---

*Další krok: T-004 – předložení upraveného plánu uživateli ke schválení spolu s review T-002 a otázkami Q1–Q3.*
