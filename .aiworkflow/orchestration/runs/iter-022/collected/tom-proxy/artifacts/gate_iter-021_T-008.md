# Release & Close Gate — iter-021 (M9b) — T-008

- **Task**: T-008 (human — FINÁLNÍ licenční rozhodnutí + schválení uzavření)
- **Date**: 2026-06-17
- **Rozhodl**: skutečný uživatel (legal owner) — NE tom-proxy (nevratné/právní eskalováno dle DR-021-01)

## Verdikt: RELEASE KANDIDÁT SCHVÁLEN + LICENCE ROZHODNUTA

### Finální licenční rozhodnutí (USER GATE)
**Uživatel zvolil: GPL-3.0 + fan disclaimer.**
- `LICENSE` = GNU GPL v3 (kanonický text, 674 řádků, gnu.org).
- `NOTICE` = copyright + fan-reimplementation disclaimer ("unofficial, not affiliated with original authors").
- `PROVENANCE.md §6` aktualizováno: rozhodnuto GPL-3.0-or-later; zvažováno a nezvoleno MIT/Apache (permissive) a proprietární/nevydat.
- README licence sekce aktualizována (GPL-3.0 + odkaz LICENSE/NOTICE).

### Safeguards splněny před vydáním
1. Verbatim scan = 0 (audit-provenance.mjs PASS).
2. Vlastní/parafráze assety potvrzeny (PROVENANCE §3); fakta/mechaniky = nepodléhají (§2).
3. Disclaimer přítomen (NOTICE).
4. doc/original_source/** reference-only, NEdistribuováno (mimo precache, §4).
5. LICENSE/NOTICE mimo precache manifest (distribuce čistá).

### DoD M9 / Release
- Reviewer T-007 = GO (release kandidát, 0 blocker/0 major). Tester T-006 = GO (17/17 AC + e2e).
- Done-criteria + acceptance criteria zadání SPLNĚNA (hratelná/install/idle/save offline).
- Determinismus G1 nedotčen (hashState identický s iter-020). CI 1566/1566, smoke OK.
- **Master plán M0–M9 KOMPLETNÍ. Release kandidát pod GPL-3.0.**

### Follow-up
- /close-iteration → PR feature/iter-021-init → main → merge → **M9b hotov = DoD M9 = release kandidát**.
