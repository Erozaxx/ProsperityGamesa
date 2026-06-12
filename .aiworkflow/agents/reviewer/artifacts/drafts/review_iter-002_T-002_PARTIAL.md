# Review návrhu architektury rebuildu (iter-002, T-002)

- **Task**: T-002, iter-002 (BRIEF-006)
- **Autor**: reviewer
- **Datum**: 2026-06-12
- **Model**: Opus
- **Předmět review**: `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md`
- **Vstupy review**: rozcestník `project/architecture/iter-02-input-rozcestnik.md`; zadání `zadani_projektu.md`; iter-01 review `agents/reviewer/artifacts/final/review_iter-001_T-003.md` (K0–K19, R1–R4); zdroj originálu `doc/original_source/modules/prosperity/**`
- **Účel**: Quality gate před schválením uživatelem (T-004). Posouzení správnosti, úplnosti, proveditelnosti, konzistence s iter-01 a s cíli PWA/offline. Verdikt GO / GO s úpravami / NO-GO.

---

## 0. Souhrnný verdikt

**GO s úpravami.**

Návrh je věcný, technicky správný a je **přímou, doložitelnou realizací** konsolidovaného seznamu K0–K19 a otevřených otázek R1–R4 z review T-003. Všech 20 položek K0–K19 má v §10 přiřazené místo v návrhu i milník; R1–R4 jsou **reálně rozhodnuté** (D9–D12), ne jen pojmenované. Klíčová architektonická báze – jediný serializovatelný stav (K0), jeden fixed-timestep mechanismus pro live/background/catch-up (K3), headless core bez DOM (K9), data-driven katalogy + čisté vzorce (K4) – je správně zvolená pro mobile-first PWA / offline a pro omezení „vše v gitu, bez build kroku".

Namátkově jsem ověřil **klíčová tvrzení proti zdroji a aritmeticky**: cenový vzorec trhu (§9.1) sedí 1:1 se zdrojem (`market.js:124`); časové konstanty a odvození capu (45 s/den, 576 000 kroků = 640 herních dní, ~5,76 s catch-up při 0,01 ms/krok) jsou aritmeticky správné. Mapování K-položek na §10 je konzistentní s číslováním T-003 (K7=trh, K8=bitva, K9=DOM-out – sedí).

**Žádný BLOCKER.** Nalezeno **9 nálezů** (1× povýšený SUGGESTION s dopadem na rozhodnutí, zbytek SUGGESTION/NITPICK). **Žádný nález nevyžaduje T-003 architect rework** – jde o upřesnění, evidenci a balanční/UX rozhodnutí, která jsou explicitně delegovaná do pozdějších milníků (M0 benchmark, M9 kalibrace) nebo na uživatele. Doporučení: **schválit (T-004) s tím, že nálezy F1–F9 se zohlední jako poznámky / decision records, ne jako reopen.**

Tři architektem vyznačené body kritické kontroly (D1 no-build, D10/R2 cap 8 h, R1 drift trhu) jsou níže posouzeny jednotlivě (§2) – všechny tři **obstojí**, s konkrétními výhradami zachycenými v nálezech.

---
