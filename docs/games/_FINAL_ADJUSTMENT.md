# Final Adjustment

Link: `.claude/skills/golf-betting-rules/SKILL.md` · Cross-cutting feature; applies to every game.

This document is authoritative for the Final Adjustment screen. Every game defers tie-resolution and dispute-resolution beyond its own rule set to this screen.

## 1. Overview

The Final Adjustment screen is the single human-arbitration step between hole-18 `Confirmed` and settlement lock. The round's current role-holder applies integer-point adjustments to any bettor's total per bet, balanced to preserve zero-sum within each bet. Any player may propose an adjustment; only the role-holder may approve it. The app never plays extra holes — every tie that a game's own tie rules do not resolve settles here.

## 2. Trigger

The screen opens when every hole 1 through 18 reaches `Confirmed` status. It closes when the role-holder taps "Lock settlement". Between those events, adjustments are reversible and the running ledger re-derives on every committed event.

## 3. Who Can Adjust

Only the current round role-holder applies adjustments. Transfer of the role uses `RoundControlTransferred` per this document § 7 (event shape) and § 8 (UI Flow, Transfer path) — the new role-holder must one-tap accept before control transfers.

## 4. Who Can Propose

Any bettor in the round may propose an adjustment via the "Request adjustment" button. A proposal emits `AdjustmentProposed` and waits for the role-holder to approve or reject. Non-bettors (group members not in any bet) may not propose.

## 5. Adjustment Schema

Every `FinalAdjustmentApplied` event and every `AdjustmentProposed` event carries the following fields:

```ts
interface FinalAdjustmentPayload {
  targetPlayers: { playerId: PlayerId; points: number }[]
                            // 2..N entries; points sum to 0 within this bet
  targetBet: BetId | 'all-bets'
                            // 'all-bets' applies the adjustment to every declaring bet identically
  reason: string            // 1..200 chars, UTF-8; free text, required
}
```

Every `points` field is an integer. The sum of `points` across `targetPlayers` within a single adjustment event equals zero. UI validation enforces the sum before the save button enables.

## 6. Zero-Sum Rule

An adjustment that does not sum to zero across its `targetPlayers` is rejected at UI validation time. The engine never persists a non-zero-sum `FinalAdjustmentApplied` event. When an adjustment targets `'all-bets'`, the same zero-sum check applies per bet: each declaring bet's derived adjustment points must sum to zero across that bet's bettor set.

If a proposed adjustment touches a player who is not a bettor in the target bet, UI validation rejects the proposal. Only bettors in the target bet may receive or pay points within that bet.

## 7. Emitted Events

All five events below are new variants the engineer adds to `src/games/events.ts` (tracked in `MIGRATION_NOTES.md` item 17).

| Event | Emitter | Payload |
|---|---|---|
| `FinalAdjustmentApplied` | role-holder save | `{ kind, timestamp, hole: null, actor: roleHolder, targetPlayers, targetBet, reason, points: Record<PlayerId, number> }` |
| `AdjustmentProposed` | any bettor | `{ kind, timestamp, hole: null, actor: proposer, targetPlayers, targetBet, reason, proposalId }` |
| `AdjustmentApproved` | role-holder | `{ kind, timestamp, hole: null, actor: roleHolder, proposalId, appliedEventId }` |
| `AdjustmentRejected` | role-holder | `{ kind, timestamp, hole: null, actor: roleHolder, proposalId, reason }` |
| `RoundControlTransferred` | outgoing role-holder | `{ kind, timestamp, hole: null, actor: fromPlayer, fromPlayer, toPlayer, reason? }` |

`RoundControlTransferred` takes effect only after the incoming role-holder one-tap accepts — the UI emits the event after the accept, not before. An accept-timeout UX is deferred to v2.

## 8. UI Flow

Role-holder path:
1. Screen opens on hole-18 `Confirmed`. Leaderboard shows per-bet totals.
2. Role-holder taps "Adjust".
3. Picks target bet (or "all bets"), targets two or more players, enters integer points per player, enters a reason.
4. Save button enables only when points sum to zero per bet.
5. Save emits `FinalAdjustmentApplied`. Ledger recomputes.
6. Role-holder repeats for additional adjustments or taps "Lock settlement".
7. "Lock settlement" closes the screen; no further adjustments are accepted.

Non-role-holder path:
1. Taps "Request adjustment".
2. Fills the same form. Save emits `AdjustmentProposed`.
3. Role-holder receives a notification. Role-holder approves (emits `AdjustmentApproved` + `FinalAdjustmentApplied`) or rejects (emits `AdjustmentRejected`).

Transfer path:
1. Role-holder taps "Transfer control", picks the incoming player.
2. Incoming player receives a one-tap accept prompt.
3. Accept emits `RoundControlTransferred`. Decline emits `AdjustmentRejected` with `proposalId` set to the transfer request id.

## 9. Edge Cases

- **Role-holder disconnected**: no adjustments land until the role-holder reconnects or voluntarily transfers control. A quorum override that lets remaining bettors vote to reassign the role is deferred to v2 per `MIGRATION_NOTES.md` item 18.
- **All bettors agree via proposals**: role-holder approves each proposal individually. There is no "batch approve" in v1.
- **Round never reaches hole 18**: the Final Adjustment screen does not open. Any bet that has not reached its natural settlement trigger remains in `InProgress` status. Settlement lock is not possible.
- **`'all-bets'` target with mismatched bettor sets**: when a player named in `targetPlayers` is not a bettor in one of the bets, the adjustment for that bet is zero for that player (points redistribute among the remaining named bettors in that bet to preserve zero-sum). UI surfaces this preview before save.
- **Adjustment after settlement lock**: forbidden. The engine rejects any `FinalAdjustmentApplied` whose timestamp follows the `RoundClosed` timestamp.
- **Reason field empty or over 200 chars**: UI rejects before save. The engine's validation catches any round-trip violation.

## 10. Worked Example

Four bettors — Alice, Bob, Carol, Dave — in a Nassau round. Front-9 match ends A/B 4-all; rule file scores it as a halved match with a zero delta per Nassau § 6. Alice and Bob agree the front-9 scorecard had a miscounted hole and the fair settlement is Alice +1 unit, Bob −1 unit.

Role-holder (Alice) opens Final Adjustment, targets the Nassau front-9 match-bet, and applies:

```
targetPlayers: [
  { playerId: 'Alice', points: +1 },
  { playerId: 'Bob',   points: -1 },
]
targetBet: 'nassau-front-9'
reason: 'Scorecard error on hole 4 — corrected after group review.'
```

Emits `FinalAdjustmentApplied` with `points: { Alice: +1, Bob: -1, Carol: 0, Dave: 0 }`. Σ points in the Nassau front-9 bet = `+1 + (-1) = 0`. Zero-sum holds.

Carol then proposes a second adjustment transferring one point from Dave to Carol in the Nassau back-9 bet, citing a missed putt concession. Emits `AdjustmentProposed`. Alice reviews and rejects. Emits `AdjustmentRejected` with the proposal id and a reason.

Final settlement totals include Alice's adjustment; Carol's proposal left no change. The engine closes the round on Alice's "Lock settlement" tap, emitting `RoundClosed`.

## 11. Test Cases

### Test 1 — Worked Example verbatim

Assert:
- Exactly one `FinalAdjustmentApplied` event with `points: { Alice: +1, Bob: -1, Carol: 0, Dave: 0 }`.
- Σ points in that event = 0.
- Exactly one `AdjustmentProposed` event from Carol.
- Exactly one `AdjustmentRejected` event matching Carol's `proposalId`.
- The ledger's Nassau front-9 total reflects Alice's adjustment.

### Test 2 — UI rejects non-zero-sum adjustment

Setup: role-holder tries to save `{ Alice: +2, Bob: -1 }` (Σ = +1).
Assert: Save button remains disabled. No event is emitted. UI surfaces an inline error.

### Test 3 — Proposal from non-bettor blocked

Setup: a group member who is not in any bet taps "Request adjustment".
Assert: UI does not render the button (or renders disabled with tooltip). No `AdjustmentProposed` event is emitted.

### Test 4 — Role transfer with one-tap accept

Setup: Alice taps "Transfer control" to Bob. Bob taps accept.
Assert: Exactly one `RoundControlTransferred` event with `fromPlayer: Alice, toPlayer: Bob`. Bob is now the role-holder; Alice can propose via "Request adjustment" but cannot directly apply.

### Test 5 — Role transfer declined

Setup: Alice taps "Transfer control" to Bob. Bob declines.
Assert: One `AdjustmentRejected` event (or equivalent transfer-declined variant). Alice remains role-holder.

### Test 6 — `'all-bets'` adjustment

Setup: a round with two bets — Skins (bettors A, B, C, D) and Nassau (bettors A, B). Role-holder applies `{ Alice: +1, Bob: -1 }` with `targetBet: 'all-bets'`.
Assert: Two `FinalAdjustmentApplied` events emit (one per declaring bet). Each has `points` summing to zero within its bet's bettor set.

### Test 7 — Adjustment blocked after settlement lock

Setup: role-holder taps "Lock settlement". Another player tries to propose.
Assert: UI hides the "Request adjustment" button. Any forced call to the engine emits no `AdjustmentProposed` and returns a typed error.
