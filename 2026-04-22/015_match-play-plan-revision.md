---
prompt_id: 015
timestamp: 2026-04-22T18:45:00Z
checklist_item_ref: "#6 — Match Play engine (phase plan revision)"
tags: [match-play, plan, rebuild-plan, phase-split, documenter]
---

## Prompt

Six plan-revision items before Phase 1 starts:
1. Fix Q7 text inconsistency ("Phase 3" → "Phase 4")
2. Split Phase 1 into 1a (type widening + MatchState, no behavior) and 1b (singles holeWinner + § 10 test)
3. Sub-sequence Phase 4 into 4a–4d with event-type status per sub-phase
4. Quote TeamSizeReduced event-type status from events.ts
5. Add Q3 cross-engine consistency note (declaringBet vs matchId across engines)
6. Explicit stop-artifact sentence per phase

## Action

1. Fixed Q7 text: "Phase 3 (edge cases)" → "Phase 4d (edge cases)" in Q7 answer.
2. Replaced Phase 1 with Phase 1a (type widening + MatchState, no behavior; Stop-artifact: 177+1 stub, tsc clean)
   and Phase 1b (singles holeWinner + settleMatchPlayHole + § 10 worked example; Stop-artifact: § 10 passing, tsc clean).
   Confirmed MatchState interface is independent of holeWinner types — split valid.
3. Replaced Phase 4 with four sub-phases:
   - 4a: Round Handicap integration test (test-only, no events.ts changes)
   - 4b: Concession-closeout ordering + conceded-match (Gap 4; ConcessionRecorded already in events.ts:183-188)
   - 4c: Best-ball partial miss + HoleForfeited (Gap 9; HoleForfeited already in events.ts:189-193)
   - 4d: TeamSizeReduced emit logic (already in events.ts:194-199 — emit-logic only)
4. Added TeamSizeReduced event definition quote (events.ts:194-199) to Q7 answer.
5. Added Q3 cross-engine consistency paragraph: HoleResolved uses `kind: 'HoleResolved'` (distinct from
   NassauHoleResolved) so kind-filtering alone separates engines; within kind, declaringBet + one-match-per-bet
   means no further matchId needed; terminal events (MatchClosedOut, MatchHalved) carry matchId set to cfg.id.
6. Added explicit stop-artifact per phase (1a, 1b, 2, 3, 4a, 4b, 4c, 4d).
7. Updated Phase dependencies table to reflect 1a/1b/4a–4d split with correct per-phase dependency statements.

## Result

- Files touched: `REBUILD_PLAN.md`
- All 6 items addressed. Plan is now 8 phases (1a, 1b, 2, 3, 4a, 4b, 4c, 4d) with each sub-phase having
  independent stop-artifacts, event-type status, and dependency statement.
- No engine code changes. No events.ts changes needed (all required event types confirmed present).

## Open questions

- None. Plan is ready for Phase 1a to start.

## Parking lot additions

- (none new)
