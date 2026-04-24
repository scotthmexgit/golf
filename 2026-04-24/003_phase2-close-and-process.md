---
prompt_id: "003"
date: "2026-04-24"
agent: (human + documenter synthesis)
tags: [phase2-close, #7, process, schema-decision]
---

## Done
- #7 Phase 2 closed: §12 Tests 1–5 pass, 273 tests, tsc+portability clean.
- CTP, Greenie, LD implemented. Sandy/Barkie/Polie/Arnie null stubs (#7b).
- Schema widening (Option A): JunkAwarded.winners + LongestDriveWinnerSelected.winners → PlayerId[]. longestDriveWinner → longestDriveWinners: PlayerId[] on HoleState.
- Reviewer gate confirmed: reachability, fixture verbatim, maybeEmitRoundingAdjustment wiring, iter 1 regression, schema Option A compliance — all PASS.
- Checklist #7 Phases 1+2 closed; Phase 3 (#7b) filed to backlog.

## Process observations

### (a) Engineer prompt drift — scope vs plan mismatch
Happened twice today: Phase 1 prompt narrower than plan AC (isCTP/Greenie stubs vs full helpers); Iter 1 prompt wider than expected (isLongestDrive implemented but dead; 25 tests vs 5 scenarios). The Phase 1 process note ("re-read plan AC before prompt") was filed but didn't prevent Iter 1 drift. Possible reason: the Phase 1 note was filed right before the Iter 1 prompt was drafted, with insufficient gap for the lesson to apply. Pattern: drift may be harder to catch when the prompt is drafted close to the plan amendment. Recommendation: build a deliberate "plan AC re-read" gate into the loop between documenter pass and engineer prompt drafting.

### (b) tsc-clean ≠ reachability
Iteration 1's dead-code isLongestDrive passed `tsc --noEmit --strict`. The reviewer's grep-based reachability audit caught it. Compilation proves absence of type errors, not that code paths are exercised. Reviewer discipline codified: always verify that new engine functions appear in the settlement function body, not just in definitions and dispatch switches. "isLongestDrive reachability" became a named gate for Iter 2 reviewer as a direct result.

### (c) Schema gaps surface during execution, not scope
Iteration 2 surfaced a tie-representation schema gap (longestDriveWinner is singular, §12 Test 5 requires two co-winners) that required two researcher micro-passes, two rounds of my pushback (synthesis step 3 wrong; Option 2 design-debt concern), and three intermediate options before Option A was selected. The question (how to represent tied-winner state across HoleState, JunkAwarded, and bookkeeping events) was knowable during the scope pass. It wasn't surfaced until the engineer stopped. Recommendation for future passes: scope pass should include a grep for HoleState tie-bearing fields and a spot-check against any §12 tie test case, before the plan is locked.

## Carry-forward
- #7b (Sandy/Barkie/Polie/Arnie) — backlog, rules pass needed.
- RoundingAdjustment architecture question (#8 or engine-level) — filed to parking lot.
- CTPCarried coverage gap — filed to parking lot.
- pushAward multiplier hazard comment — filed to parking lot.
