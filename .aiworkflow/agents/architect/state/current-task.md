# Current Task

- **Task ID**: T-ADV-001 (post-iter-021, advisory) — nezávislá revize stavu po iter-021 (release kandidát M0–M9) + návrh náplně iter-022
- **Brief**: context/inbox/brief_architect_T-ADV-001_post-iter-021.md (BRIEF-ADV-001)
- **Předchozí**: iter-021 T-001 (design M9b) — done
- **Iteration**: post-iter-021 (mezi-iterační advisory; žádná aktivní iterace)
- **Status**: done  <!-- idle | in-progress | done | blocked -->
- **Started**: 2026-07-02
- **Completed**: 2026-07-02

## Checklist (z briefu)
- [x] T-ADV-001a: Načti stav (master plán, iter-021 exit-summary, KNOWN_ISSUES, PROVENANCE, done-criteria, pages.yml) a shrň skutečný stav vs. deklarovaný
- [x] T-ADV-001b: Analyzuj deploy/dostupnost blocker a jeho dopad na "release kandidát" status
- [x] T-ADV-001c: Kategorizuj KNOWN_ISSUES gapy (dluh / scope / odložit) + rizika
- [x] T-ADV-001d: Navrhni další krok (doporučení + ≥1 alternativa, trade-offs, prioritizace) a zapiš artefakt

## Výstup
**`artifacts/final/review_post-iter-021_next-step.md`**

## Klíčová zjištění (souhrn)
- **KOREKCE PREMISY BRIEFU:** deploy blocker (Pages běhy #9–#12) byl vyřešen už 2026-06-17 — běh #13 (workflow_dispatch, SHA 98f67fa = HEAD) SUCCESS; web ŽIVÝ na https://erozaxx.github.io/ProsperityGamesa/ (200) a nasazená precache verze = HEAD (prosperity-4830cd1e8c19). Ověřeno curl 2026-07-02.
- Neověřené články doručitelnosti: N1 push-triggered auto-deploy (všech 12 push běhů fail, jediný úspěch = ruční dispatch; od 17. 6. žádný push), N2 install na reálném zařízení nikdy neproveden, N3 apple-touch-icon je SVG (iOS nepodporuje → rozbitá ikona), N4 žádný tag/verze (0.0.0), N5 done-criteria.md neodškrtnutá, N6 LL-005/6 chybí v lessons_learned, N7 mrtvé `enablement: true` v pages.yml.
- CI ověřeno vlastním během: 1566/1566 pass. LICENSE/NOTICE/PROVENANCE §6 finalizovány (GPL-3.0 + fan disclaimer).
- KNOWN_ISSUES kategorizace: A dluh (TXAUDIT×2, AIBATTLE-DEDUP, SCHED-CLEANUP — malé, ale zásah do core = G1 disciplína), B scope/kalibrace (G-JOB-MAXSTEP, G-MILITARY-STATS, list-katalogy — potřebují playtest data, závisí na živém deployi), C bezpečně odložit (PERSIST-DERIVED, V1, V2, achievements, MIN-1).
- **Doporučení: iter-022 = „M9c Release live & field-verified"** (deploy ověření + on-device user gate + PNG ikony + tag v1.0.0-rc.1 + admin dotažení). Alternativa A (gapy/kalibrace první) zamítnuta — kalibrace potřebuje playtest ⇐ živou verzi; alternativa B (uzavřít as-is) zamítnuta — malá zbytková práce odstraňuje velkou nejistotu.
