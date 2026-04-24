# #8 Phase 3 close — 2026-04-24

## What shipped
- Iter 1 (b4b5e25): buildMatchStates exported function. Nassau MatchState[] and
  Match Play scalar MatchState threaded via event-walk. PressOpened void-guard
  (startHole > endHole). 5 tests asserting MatchState values directly (option b).
- Iter 2 (c64fc3d): reduceEvent() single source of truth. finalizeNassauRound +
  finalizeMatchPlayRound called post-log-walk. byBet compound keys for Nassau
  (${betId}::${matchId}); simple key for Match Play. RunningLedger.byBet widened
  to Record<string,...>. Tests F–J. 290 total.

## Reviewer findings resolved
- Iter 1: PressOpened void-guard (Finding 1, hard fail). Test E added.
- Iter 2: ZeroSumViolationError counted log.events.length only (fixed to add
  finalizerEvents.length). Test J missing zero-sum assertion (added).

## Open
- Phase 4: Stroke Play + all-5-games integration test. Next.
