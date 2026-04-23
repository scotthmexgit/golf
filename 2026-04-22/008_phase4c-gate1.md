---
prompt_id: 008
timestamp: 2026-04-22T09:39:29Z
timestamp_note: 007 timestamp (09:35:00Z) is earlier than 003-006 (14:xx); likely a
  placeholder or clock drift. Actual time of 007 is unrecoverable; annotation deferred
  to this note per user instruction ("fix on next log write").
checklist_item_ref: "#5 — Nassau engine, Phase 4c Gate 1"
tags: [nassau, phase4c, gate1, MatchState, pair-field]
---

## Prompt
Phase 4c Gate 1: add `pair: [PlayerId, PlayerId]` to MatchState interface;
update initialMatches, openPress, and all test construction sites. Behavior-preserving
refactor. Gate verification: 162 tests pass (zero regression), tsc clean, gate greps pass.

## Action

1. Re-ran holesWonA grep to re-confirm construction site count before editing.
   Previous count was 11 (4 nassau.ts + 7 nassau.test.ts). Phase 4b added 6 new
   test sites (preWithdrawal×3 at lines 995-997, preFinalHole×3 at lines 1113-1115).
   Reported new count of 17 (4 nassau.ts + 13 nassau.test.ts) before editing.
2. Read exact strings for MatchState interface (lines 60-68), initialMatches (123-129),
   and openPress pressMatch (234-241) before editing.
3. Edited nassau.ts:
   - MatchState: added `pair: [PlayerId, PlayerId]` field between holesWonB and parentId.
   - initialMatches: renamed `_cfg` to `cfg`, added `const pair = [...] as [PlayerId, PlayerId]`,
     added `pair` to all three base MatchState literals.
   - openPress pressMatch: added `pair: parent.pair`.
4. Edited nassau.test.ts — 13 construction sites (5 batches):
   - matchAt×1 (line 301): pair: ['A','B'] as [PlayerId,PlayerId]
   - preHole14×3 (lines 712-714): same
   - endMatches×3 (lines 802-804): same
   - preWithdrawal×3 (lines 995-997): same
   - preFinalHole×3 (lines 1113-1115): same

## Result

- Files touched: `src/games/nassau.ts`, `src/games/__tests__/nassau.test.ts`
- Tests: 162 passed, 0 failed. Zero regressions. All 8 test files pass.
- `npx tsc --noEmit --strict` clean.
- Gate grep 1 (b.config === cfg): zero matches.
- Gate grep 2 (b.id === cfg.id): exactly four matches (nassau, skins, stroke_play, wolf). #4 intact.
- settleNassauHole and finalizeNassauRound hot paths unchanged — no behavior change.

## Open questions
- None. Gate 1 complete. Gate 2 pending user approval.

## Parking lot additions
- (none)
