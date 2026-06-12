# Review návrhu architektury rebuildu (iter-002, T-002)

- **Task**: T-002, iter-002 (BRIEF-006)
- **Autor**: reviewer
- **Datum**: 2026-06-12
- **Model**: Opus
- **Předmět review**: `agents/architect/artifacts/final/architecture_proposal_iter-002_T-001.md`
- **Vstupy review**: rozcestník iter-02 (`project/architecture/iter-02-input-rozcestnik.md`); zadání (`zadani_projektu.md`); iter-01 review T-003 (K0–K19, R1–R4); analýzy iter-01 T-002a/T-002b; rework T-004; doména `doc/original_source_doc.md`
- **Účel**: Quality gate před schválením uživatelem (T-004). Posouzení správnosti, úplnosti, proveditelnosti, konzistence s iter-01 a s cíli PWA/offline; cílená kritická kontrola D1, D10/R2, R1 (§9.1); verdikt GO / GO s úpravami / NO-GO.

---

## 0. Souhrnný verdikt

**GO s úpravami.** Návrh je technicky správný, úplný vůči zadání T-001 i konsolidaci K0–K19, a proveditelný v omezeních „mobile-first PWA / offline / vše v gitu / bez build kroku". Je to přímá, věrná realizace review T-003: všech 20 položek K0–K19 má adresu v návrhu i milník (§10), R1–R4 jsou **reálně rozhodnuté** (ne jen pojmenované) s konkrétními mechanikami, vzorci a pojistkami, ne odložené. Cílená kontrola tří bodů, které si architekt sám vyžádal (D1 no-build, D10/R2 cap 8 h, R1 drift trhu), neodhalila žádný architektonický defekt – jen body k doladění a vědomé balanční eskalace, které návrh sám pojmenovává.

**Žádný BLOCKER. Žádný nález nevyžaduje T-003 architect rework.** Nálezy jsou: 0 BLOCKER, 6 SUGGESTION (doladění před nebo během M0–M1), 4 NITPICK (redakce/konzistence). Všechny jsou řešitelné lehkou redakcí návrhu nebo jako rozhodnutí v implementačních milnících (M0 benchmark, M9 kalibrace) – žádný nevrací návrh do přepracování.

Klíčové ověření proti zdroji: cenový vzorec trhu v §9.1 (`round(basePrice × (1.5 − min(available,max)/max)³, 3)`) sedí 1:1 s doménou (`original_source_doc.md` ř. 111); časové konstanty (900 kroků/den, den = 45 s, 81 900 kroků/sezóna) sedí (ř. 54–59); cap 8 h = 576 000 kroků ≈ 640 herních dní je aritmeticky správně.

**Doporučení dalšího kroku: APPROVE → předat uživateli ke schválení (T-004).** Úpravy S1–S6 zohlednit jako redakci/poznámky v návrhu nebo jako vstupy do M0/M9; nejsou blokující.

---
