# #8 aggregate.ts closed — 2026-04-24

## What shipped
Phases 1–4 across 8 commits (b13ba25..ba54c24). Final: 292 tests, tsc clean.

## Today's process patterns

### Engineer prompt drift (three instances)
1. Phase 1 (#7): narrower-than-plan (helpers deferred; reviewer caught dead code).
2. Phase 2 iter 1 (#7): wider-than-plan (three-event test produced 5 events due to
   wrong fixture). Fixed by correcting fixture and split iteration.
3. Phase 1 (aggregate.ts #8): wider-than-plan (all 11 monetary events wired in Phase 1
   switch, not just Junk as scoped). Surfaced by Phase 2 researcher pass; plan amended.
   Pattern: engineer over-builds with inline comment; plan doesn't auto-amend to match.
   Mitigation: reviewer must verify plan scope matches landed implementation same-session.

### tsc-clean != reachable
Dead-code `isLongestDrive` (#7 Phase 4d) compiled clean but was never called. Reviewer
caught via explicit reachability check. Now baseline discipline.

### Confident summary without grep (four instances)
W9 claim, team1/team2 teamId, Shape D label, aggregate scope summary — all caught.
Pattern: summaries synthesized from memory rather than live reads. Mitigation: grep-
before-claim rule. Recurred; needs continued enforcement.

### Schema decisions during execution
Three decisions that shaped multiple phases resolved mid-session:
- Topic 4: byBet compound key (${betId}::${matchId}) for Nassau.
- longestDriveWinners widening (singular -> plural array).
- Supersession filter deferral (Option C, no id field on EventBase).

### Finalizer convention inconsistency
`finalizeStrokePlayRound` returns input events + new events (passthrough). Nassau and
Match Play finalizers return new events only. Double-counting foot-gun for callers.
Parking-lot filed. Post-#8 normalization candidate.

### Interpretation A decision
Scope-pass "aggregate.ts calls per-hole recorder" was ambiguous (function invocation
vs event-walk). Phase 1+2 chose event-walk; Phase 3 prose inherited function-invocation
reading. Resolved by hole-boundary researcher pass surfacing RoundConfig has no holes
field. Session logs 005_phase3_interpretation_fork.md.
