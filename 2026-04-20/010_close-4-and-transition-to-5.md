---
prompt_id: 010
timestamp: 2026-04-20T22:27:56Z
checklist_item_ref: "#4 closing → #5 transition"
tags: [checklist-transition, close-item, standing-clarification]
---

## Prompt

Approve close. Verbatim Done line for #4. Transition #5 Nassau to Active, do not start. Record standing clarification about test-count baselines for all remaining REBUILD_PLAN.md items. Do not edit REBUILD_PLAN.md — plan stays a stable forward contract. Do not pre-plan #5's phases in this response. Focus-discipline: one close, one transition, one clarification, stop.

## Action

1. Appended to `IMPLEMENTATION_CHECKLIST.md` Done list: `[x] #4 — Bet-id string-lookup refactor — closed 2026-04-20, prompt 009. Final test count 97 (AC's "100 modulo the #3 net-zero" figure was arithmetically wrong; 97 start, 97 end, 0 net change is correct).` Exact verbatim per user instruction.
2. Replaced Active-item content (was #4) with #5 Nassau engine. Populated **Why**, **AC summary** (pointing at REBUILD_PLAN.md for full AC), fence sentence verbatim, **Must complete before** (#6, #7, #8), and explicit L-sized-phased-execution note in **Status**. Did not pre-plan phases — that's the approval prompt's job.
3. Removed #5 from Backlog; replaced with `(#5 is currently Active — see "Active item" section above.)` mirroring the prior transition convention.
4. Did **not** edit `REBUILD_PLAN.md`.
5. Did **not** start #5 work.

## Result

- Files touched:
  - `IMPLEMENTATION_CHECKLIST.md` — Done entry for #4, Active-item replaced with #5, Backlog entry for #5 removed.
  - `2026-04-20/010_close-4-and-transition-to-5.md` — this file.
  - `EOD_20-April-2026.md` — pending append at turn close.
- No code changes. No changes to `REBUILD_PLAN.md`, `AUDIT.md`, or any `src/`, `prisma/`, `docs/` file.
- Parking lot unchanged.

## Standing clarification — test-count baselines for remaining items

Applies to all remaining items in `REBUILD_PLAN.md` (#5 Nassau, #6 Match Play, #7 Junk, #8 aggregate, #9 GAME_DEFS, #10 Prisma, #11 cutover). To be referenced at each future close.

**Baseline: 97 tests** as of post-#4 close. The "100" figure that appears in several remaining item ACs was written pre-execution and never propagated through #3's 3 deletions. Any remaining AC that says "Total test count remains at 100" or similar should be interpreted as **"97 + whatever this item adds"**, not literally 100.

Concretely for each remaining item:
- #5 Nassau: adds a full test suite (Worked Example + § 9 edge cases + § 12 Test Cases + Round Handicap integration — expect ~20–30 new tests, parallel to Wolf's 31 at end of Round 3).
- #6 Match Play: similar scale to #5; expect ~20–30 new tests.
- #7 Junk: similar scale; expect ~15–25 new tests.
- #8 aggregate: ~3–6 new tests (purity, zero-sum multi-game, per-bet ledger slice).
- #9 GAME_DEFS: 0 new tests (AC says no test changes).
- #10 Prisma: 0 new tests in-scope (AC says existing 97 still pass; optional migration assertion is stretch).
- #11 cutover: ~0 new tests (AC says "No test additions beyond what's required to keep existing tests green").

Final expected test count at end of all items: roughly **97 + 20–30 (#5) + 20–30 (#6) + 15–25 (#7) + 3–6 (#8) = ~155–190**, subject to each engine's AC.

**No REBUILD_PLAN.md edit.** The plan is a stable forward contract; the correction lives in each close's Done-entry note and in this log for forward reference.

## Open questions

- Explicit approval to begin #5 engineer work. User has pre-announced phased execution across multiple turns; phase breakdown will be proposed in the start-of-#5 approval prompt.

## Parking lot additions

(none — narrow close-and-transition turn, no observations surfaced, per focus-discipline)
