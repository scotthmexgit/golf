---
prompt_id: 006
timestamp: 2026-04-22T14:50:49Z
checklist_item_ref: "#5 — Nassau engine, Phase 4b"
tags: [nassau, tests, phase4b, forfeit, withdrawal]
---

## Prompt
Continue Phase 4b (resumed from context compaction). Forfeit branch (item A) was already
applied to nassau.ts before compaction. Implement:
B. settleNassauWithdrawal — singles only, throws NassauConfigError for allPairs.
C. Tests: § 9 forfeit (4 tests), § 12 Test 6 withdrawal (5 tests, Σ delta = 0).

## Action

1. Read nassau.ts — confirmed forfeit branch present (lines 325–349), settleNassauWithdrawal
   not yet added. File ends at line 439 after finalizeNassauRound.
2. Read nassau.test.ts — confirmed 147 tests, import block, makeHole shape.
3. Read events.ts lines 130–142 — confirmed NassauHoleForfeited (hole-level, no matchId, no
   WithPoints) and NassauWithdrawalSettled (WithPoints, withdrawer, no matchId) shapes.
4. Read tsconfig.json — strict but no noUncheckedIndexedAccess; {} as Record<PlayerId,number>
   acceptable.
5. Appended settleNassauWithdrawal to nassau.ts after finalizeNassauRound header marker.
6. Added settleNassauWithdrawal to import block in nassau.test.ts.
7. Appended two describe blocks at end of nassau.test.ts:
   - '§ 9 — missing-score forfeit' (4 tests)
   - '§ 12 Test 6 — withdrawal mid-round' (5 tests)
8. Fixed deferred 004 timestamp annotation.

## Result

- Files touched: `src/games/nassau.ts`, `src/games/__tests__/nassau.test.ts`,
  `2026-04-22/004_phase4-scope-tightenings.md` (timestamp annotation)
- Tests: 156 passed, 0 failed (was 147; +9 new tests). All 8 test files pass.
- `npx tsc --noEmit --strict` clean (no output).
- Portability grep: one false positive — comment-line "match window." in nassau.ts. Zero real hits.

## Σ delta verification (pre-write, confirmed)

§ 12 Test 6 pre-withdrawal state: front closed (A+1 already settled), back A 3-0 open,
overall A 7-3 open. B withdraws; opposing = A.
- back: not tied → combinedPoints[A] += 1, combinedPoints[B] -= 1
- overall: not tied → combinedPoints[A] += 1, combinedPoints[B] -= 1
- combined: {A: +2, B: -2}, Σ = 0. Verified before writing test assertion.

## Open questions
- None. Phase 4b complete.

## Parking lot additions
- (none)
