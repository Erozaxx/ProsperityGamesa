# Rework note – zapracování nálezů review T-002 (iter-002, T-003)

- **Task**: T-003, iter-002 (BRIEF-007)
- **Autor**: architect
- **Datum**: 2026-06-12
- **Předmět**: `architecture_proposal_iter-002_T-001.md` – light redakce/doplnění dle review
  `agents/reviewer/artifacts/final/review_iter-002_T-002.md` (§6 tabulka, §7)
- **Rozsah zásahu**: cílené úpravy, žádná nová architektura; podstata rozhodnutí D1–D13 beze změny.

## Mapa „nález → kde a jak zapracován“

| Nález | Kde v návrhu | Jak zapracováno |
|---|---|---|
| **S-01** runtime zero-build vs. dev/CI Node tooling | §0 (D1 řádek), §2.1 (řádek Build), §2.2 (nový odstavec „Upřesnění ‚bez build kroku‘“), §11/M0 | Explicitně odlišeno: *runtime* zero-build (deploy = statické soubory) vs. *dev/CI* Node toolchain (tsc / tools/extract / SW manifest generátor); řešení provozu bez persistentního storage (commitnuté výstupy, tsc jediná dev závislost per run). **DoD M0 = funkční `tsc --checkJs` CI gate** (§11/M0, vazba na R-I). |
| **S-02** technický strop capu vs. balanční hodnota; benchmark před potvrzením | §9.2 (přepsaný cap bullet), §0 (D10 řádek), §11/M0, §14.1 | Cap rozdělen na **(a) technický strop `offline.capTechRealHours: 8`** (potvrzuje se až po benchmarku ceny kroku – benchmark = DoD M0, měřeno na low-end mobilu) a **(b) balanční hodnotu `offline.capRealHours`** (ladí M9, očekávána výrazně nižší). Engine uplatňuje `min(a, b)`; obě konstanty v datech. |
| **S-03** referenční křivky trhu nemají serverový zdroj → hratelnostní cíle | §9.1 (bullet Kalibrace), §11/M9, §13 bod 3 | Kalibrační referencí v M9 jsou **definované hratelnostní cíle** (příklady: návrat ceny k baseline do N dní; arbitráž neziskovost díky spreadu; drift nevyhladí hráčův dopad během dne), ne rekonstrukce serverových křivek; DoD M9 formulován proti těmto cílům. |
| **S-04** M2 přetížený | §11 (řádek M2 + nový odstavec „Pozn. k zátěži M2“) | Catch-up v M2 zmenšen na **MVP** (end-to-end smyčka, dohání jen systémy M2, summary = textový výčet) + zdůvodnění, proč M2 drží pohromadě (prvky se navzájem ověřují) + **povolený split M2a/M2b** pro orchestrátora bez dopadu na architekturu. |
| **S-05** catch-up-safe invariant v milestone DoD | §4.1 (nový odstavec „Catch-up-safe invariant“), §11 (úvodní věta DoD milníků), §11/M2 | Definován průřezový invariant (determinismus jen přes clock+RNG, levný v dávce, bez DOM) a zařazen do DoD každého milníku od M2; explicitně řečeno, že catch-up **není „hotový“ v M2** a rozšiřuje se s každým systémem. |
| **S-06** stub world nesmí oceňovat před M4 | §8.2 (poslední bullet), §9.4 bod 3, §9.1 (getGoldValue bullet) | Doplněn **negativní kontraktní test**: v M2–M6 (do registrace market modulu v M4) stub `world` nesmí volat `getGoldValue`/`market.inject` – volání = selhání testu, ne tichý no-op; zařazen mezi kontraktní testy D12. |
| **N-01** dvojí formulace „cap pravděpodobně dolů“ | §9.2, §12 (pozn. pod tabulkou) | §9.2 prohlášen za **kanonickou (jedinou) formulaci** capu; poznámka pod §12 přepsána na odkaz do §9.2 bez vlastního znění. |
| **N-02** clamp `available ∈ [0, max]` | §9.1 (bullet o transakcích) | Explicitně potvrzen clamp vč. chování na obou mezích (horní mez ceny při 0, dolní mez při max); vynucen v market handleru a validován ve formulas testech. |
| **N-03** PWA audit průběžný od M0 | §11 (úvodní věta DoD), §11/M0, §11/M9 | Průběžný **PWA smoke check (install + offline start)** je součástí DoD každého milníku od M0; M9 nese jen **závěrečný** audit (evikce, edge cases). |
| **N-04** ASCII diagram a tickOrder jako živé artefakty | §3.5 (pozn. pod diagramem), §4.3, §11 (reviewer gate) | Oba označeny jako **živé artefakty** – aktualizace ve stejném commitu jako strukturální změna; zastarání = reviewer nález; kontrola zařazena do milestone reviewer gate. |
| **R-I povýšení viditelnosti** (review §7) | §12 (řádek R-I), §2.2 | Dopad povýšen Střední → **Vysoký** s poznámkou „dle review T-002 největší reálné riziko návrhu“; mitigace zpřesněna: CI gate funkční už jako **DoD M0**, grep rozšířen o `Math.random()` (chrání determinismus catch-upu). |

## Co se nezměnilo (Scope OUT dodržen)
- Žádné nové architektonické rozhodnutí; D1–D13 platí beze změny podstaty.
- Struktura dokumentu (sekce §0–§14) zachována; pouze doplnění/upřesnění na uvedených místech.
- Review artefakt reviewera nedotčen.

## Dopad na navazující kroky
- T-004 (schválení uživatelem): návrh je nyní konzistentní s review – všech 10 nálezů + R-I zapracováno.
- Pro M0 přibyly tři explicitní DoD položky: funkční `tsc --checkJs` CI gate, benchmark ceny kroku před potvrzením technického stropu capu, první PWA smoke check.
