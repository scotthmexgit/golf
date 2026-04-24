# #8 Phase 1 aggregate.ts scope drift — 2026-04-24

## What happened
Phase 1 scope framing in REBUILD_PLAN.md stated "Junk-only reducer." Engineer
implemented reducer for all 11 monetary events in the same switch block,
with a comment at aggregate.ts:119-126 documenting the decision. Plan was never
amended to match.

Gap surfaced during Phase 2 planning researcher audit (2026-04-24), after Phase 1
committed (commit 8c0a147).

## Coverage delivered in Phase 1 (unplanned)
All 11 monetary events are handled by the Phase 1 switch block:
- `JunkAwarded` (line 100) — stake-scaled formula (planned)
- `SkinWon` (line 128) — `money[p] = event.points[p]` (unplanned over-build)
- `WolfHoleResolved` (line 129) — same formula (unplanned over-build)
- `LoneWolfResolved` (line 130) — same formula (unplanned over-build)
- `BlindLoneResolved` (line 131) — same formula (unplanned over-build)
- `MatchClosedOut` (line 132) — same formula (unplanned over-build)
- `ExtraHoleResolved` (line 133) — same formula (unplanned over-build)
- `StrokePlaySettled` (line 134) — same formula (unplanned over-build)
- `NassauWithdrawalSettled` (line 135) — same formula (unplanned over-build)
- `RoundingAdjustment` (line 136) — same formula; dead schema under integer-only mandate (unplanned over-build)
- `FinalAdjustmentApplied` (line 137) — same formula with `targetBet` key logic (unplanned over-build)

No events from the 11-event list are absent from the switch. No unlisted events
were found in the switch.

## Pattern observation
Engineer over-builds with inline comment, plan doesn't auto-amend to match.
Downstream phase planning discovers mismatch. This is the third fence-drift
instance today (after Phase 4d LD dead-code, #7 Phase 2 iter 1 wider-than-plan).

## Mitigation
After engineer passes that land broader-than-scoped implementations, scope
documenter should verify plan text still matches what shipped. Reviewer discipline:
when engineer scope exceeds plan scope, reviewer passes only if a scope amendment
is filed same-session, not deferred. Add to reviewer checklist.
