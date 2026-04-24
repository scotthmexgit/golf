# Phase 3 aggregate.ts interpretation fork — 2026-04-24

## Root cause
Scope-pass Shape A decision cited game_stroke_play.md §11: "aggregate.ts calls
the per-hole recorder on every hole." Interpreted at scope time as function
invocation. Phase 1 + Phase 2 shipped as pure event-log reducer — no settle
calls, no HoleState input. Phase 3 prose inherited the function-invocation
reading ("Call settleNassauHole / settleMatchPlayHole"), diverging from the
shipped architecture.

## How it surfaced
Hole-boundary researcher micro-pass (2026-04-24) found RoundConfig has no
holes/numHoles field, and all settle functions require HoleState positional arg 1.
Function-invocation reading is unimplementable without a signature change.
Forced explicit choice between A (event-walk) and B (settle-call + HoleState[]).

## Decision: Interpretation A
Phase 3 walks the event log in hole order, updating MatchState per
NassauHoleResolved / HoleResolved events. Finalizers (finalizeNassauRound,
finalizeMatchPlayRound) are called at end-of-log — they are the ONLY engine
functions invoked from aggregateRound. Signature stays (log, roundCfg). No
HoleState input. Hole-boundary signal question dissolved.

## Lesson
When doc language supports two readings and scope pass picks one, flag the
ambiguity explicitly in the plan — future phases inherit the unflagged reading
and may diverge. "aggregate.ts calls X" should have been marked as "ambiguous:
function invocation vs event iteration — Phase 1 will settle."
