# Overnight investigation status

Date: 2026-04-22
Triggered by: Junk Turn 4 Phase 1 (isSandy) — Phase 2 blocked on signature conflict.

---

## What was done

Read-only survey of rule files, types, and implementation. Six documents written to `2026-04-22/`. No code changes. No commits.

Files read: `src/games/junk.ts`, `src/games/types.ts`, `src/games/__tests__/junk.test.ts`, `docs/games/game_junk.md`, `docs/games/game_skins.md`, `docs/games/game_wolf.md`, `docs/games/game_nassau.md`, `docs/games/game_stroke_play.md`, `docs/games/game_match_play.md`, `docs/games/_ROUND_HANDICAP.md`, `docs/games/_FINAL_ADJUSTMENT.md`.

---

## Recommended review order

1. **`investigation-01_§5-§6-reconciliation.md`** — understand the contradiction before looking at options
2. **`investigation-02_multi-winner-signature-space.md`** — pick the signature shape (decision required)
3. **`investigation-04_rule-file-defects.md`** — full defect list; J-1/J-2 are the Turn 4 blockers; others are independent
4. **`investigation-03_drift-audit.md`** — confirms session artifacts are clean; low-priority reading
5. **`investigation-05_small-fixes-applied.md`** — nothing applied; contains Parking Lot candidate list

---

## Blockers (nothing can proceed without these decisions)

### Blocker 1 — multi-winner signature shape (investigation-02)

**Blocks**: Junk Turn 4 Phase 2 (isSandy failing test), and every subsequent junk kind (Barkie, Polie, Arnie, and LD tie behavior).

**Decision required**: Which option does the user prefer?
- **Option A**: keep `PlayerId | null`; ties = no award (violates §6 as written)
- **Option B**: all seven detection functions return `PlayerId[]`
- **Option C**: add companion `*Candidates` functions; detection functions unchanged
- **Option D**: add per-kind `tieRule` config ('cancel' | 'all-collect')
- **Option E** (recommended): `PlayerId | null` for CTP/Greenie; `PlayerId[]` for Sandy/Barkie/Polie/Arnie/LD

### Blocker 2 — rule-file S1 defects (investigation-04)

These do not block Turn 4 directly but block the affected engines:

| Defect | Blocks |
|--------|--------|
| SK-1 (Skins: fourth tie mode) | Skins engine tie section |
| W-1/W-2 (Wolf: tieRule, Test 6) | Wolf engine |
| N-1 (Nassau: matchTieRule deleted) | Nassau Phase 3 tie section |

---

## What is ready to proceed (no decision needed)

- **Junk Turn 4 Phase 2 test fixture change** (`makeHole` + `bunkerVisited` parameter): small, scoped, not blocked by signature decision — but practically this is written at the same time as the failing test, so it waits for Blocker 1.
- **J-4 naming drift fix**: low-risk, independent of signature decision; can be done any time as a doc-only or type-rename commit.
- **SP-1 rule-file fix**: clarify stakePerStroke rounding rule; doc-only, no code.
- **MP-1 rule-file fix**: remove hardcoded 18 from §5 pseudocode; doc-only, no code.

---

## Active checklist item reminder

Per `IMPLEMENTATION_CHECKLIST.md`: Active item is **#5 Nassau engine Phase 2** (complete) + **Nassau Phase 3** (not started). The Junk turn 4 work is a Parking Lot item that was pulled forward with user approval. Nassau Phase 3 remains the next queued item after Junk Turn 4 completes.

---

## Session-log gap

Session logs for this overnight investigation session have not been written yet (pending user return and explicit prompt-level logging). The investigation itself is documented in `investigation-01` through `investigation-05`. Session logs (`058_...` etc.) will be written per-prompt on resume.
