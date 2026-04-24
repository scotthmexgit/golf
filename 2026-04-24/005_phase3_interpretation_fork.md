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

---

## Phase 4 prose alignment (same session — 2026-04-24)

Phase 4 items A and C had the same function-invocation ambiguity, inherited from
the same root cause. Amended to match Interpretation A in the same documenter
pass (no new decision required).

### Item A — old vs new

Old: "Call `settleStrokePlayHole` per hole (per `src/games/stroke_play.ts:158`);
call `finalizeStrokePlayRound(events, config)` at round end. `aggregate.ts` passes
the `tieRule` field to the settler, consistent with §11 ownership."

New: "Process `StrokePlayHoleRecorded` events from the log in ascending
`event.hole` order (no settle-function calls from `aggregateRound`). Call
`finalizeStrokePlayRound(events, config)` at end-of-log — this is an active call
from `aggregateRound`, consistent with Nassau/Match Play finalizer pattern in
Phase 3. `aggregate.ts` owns `tieRule` dispatch (passes the `tieRule` field from
`StrokePlayCfg` to the finalizer)."

Note: `tieRule` ownership retained — that was a deliberate Phase 4 scope
decision, not prose drift.

### Item C — old vs new

Old: "Skins and Wolf stateless orchestration (call per-hole settle functions in
declaration order for those bets; no `MatchState` threading needed)."

New: "Skins and Wolf events consumed directly from log — `SkinWon` and Wolf
resolution events (`WolfHoleResolved`, `LoneWolfResolved`, `BlindLoneResolved`)
are pre-populated by the caller and reduced by the existing Phase 2 passthrough
paths. No per-game orchestration, no state threading, no settle-function calls for
Skins/Wolf from `aggregateRound`. Phase 4 scope for Skins/Wolf is
integration-test coverage only — verifying their event reduction in the combined
all-5-games fixture."

### Item D cross-check

Item D specifies: "Event log is constructed by hand in the test, not emitted by
the orchestrator." The fixture includes `StrokePlaySettled` (a finalizer-emitted
event) placed directly in the hand-built log — the test does not call settle
functions to generate it. This is fully consistent with Interpretation A. Item D:
CONFIRMED consistent. No amendment needed or made.

### Additional invocation language scan (Phase 4)

Scanned fence, stop-artifact, and gate sections of Phase 4 for "call settle" or
"invoke" language. No additional instances found beyond items A and C already
amended above. Phase 4 prose is now fully aligned with Interpretation A.
