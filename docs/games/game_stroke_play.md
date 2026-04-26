# Game: Stroke Play

Link: `.claude/skills/golf-betting-rules/SKILL.md` · Scoring file: `src/games/stroke_play.ts`

## 1. Overview

Stroke Play totals every player's strokes over the round and ranks the field by lowest total. Betting settles under one of three modes: winner-takes-pot, per-stroke, or places. Ties resolve under one of three modes: split, card-back, or scorecard-playoff. This file specifies Stroke Play for 2–5 players; `src/games/stroke_play.ts` is the authority on behavior.

## 2. Players & Teams

Minimum 2 players, maximum 5. No teams. Each player plays for themselves.

Handicap strokes apply via `strokesOnHole(strokes, holeIndex)` in `src/games/handicap.ts` when `appliesHandicap === true`. Net score for a player is the sum over 18 holes of `gross[hole] − strokesOnHole(strokes, holeIndex)`.

## 3. Unit of Wager

Stake is 1 integer unit per player (default 100 minor units). The shape of the payout depends on `settlementMode`:

- `winner-takes-pot` — the winner collects `stake` from every other player.
- `per-stroke` — every pairwise stroke differential exchanges `stakePerStroke` units between the two players. Default `stakePerStroke = 1`.
- `places` — every player antes `stake` into a shared pot; the pot distributes to places 1…N per `placesPayout`.

Multipliers: none.

## 4. Setup

```ts
interface StrokePlayCfg {
  id: BetId                        // unique bet identifier; used for event emission and bet-id lookups
  stake: number                    // integer minor units, default 100, min 1
  settlementMode: 'winner-takes-pot' | 'per-stroke' | 'places'
                                   // default 'winner-takes-pot'
  stakePerStroke: number           // used only when settlementMode === 'per-stroke'
                                   // default equals stake / 10, min 1
  placesPayout: number[]           // used only when settlementMode === 'places'
                                   // default [stake*N*0.5, stake*N*0.3, stake*N*0.2, 0, ...]
                                   // rule: sum(placesPayout) === stake * playerIds.length
                                   // rule: every entry is a non-negative integer
  tieRule: 'split' | 'card-back' | 'scorecard-playoff'
                                   // default 'card-back'
  cardBackOrder: number[]          // default [9, 6, 3, 1] — back 9, 6, 3, last hole
  appliesHandicap: boolean         // default true
  playerIds: PlayerId[]            // length 2..5
  junkItems: JunkKind[]            // default [] — Junk awards this bet declares in-play; see docs/games/game_junk.md
  junkMultiplier: number           // positive integer, default 1; applies to every event in junkItems
}
```

`placesPayout` defaults are computed once at round start; if `stake * N` is not divisible by 10, the config must supply an explicit `placesPayout`. Scoring rejects a config whose `placesPayout` sum does not equal `stake * playerIds.length` or whose entries are not integers.

## 5. Per-Hole Scoring

Stroke Play does not produce a per-hole monetary delta. The per-hole event is a non-settling `StrokePlayHoleRecorded` that captures each player's net score for the hole. Monetary settlement happens once, at round end, by the aggregator.

```ts
import { strokesOnHole } from './handicap'
import type { HoleState, ScoringEvent } from './types'

function settleStrokePlayHole(
  state: HoleState, cfg: StrokePlayCfg,
): ScoringEvent[] {
  const nets: Record<PlayerId, number> = {}
  for (const pid of cfg.playerIds) {
    const g = state.gross[pid]
    nets[pid] = cfg.appliesHandicap ? g - strokesOnHole(state.strokes[pid], state.holeIndex) : g
  }
  return { kind: 'StrokePlayHoleRecorded', hole: state.hole, actor: 'system',
           timestamp: state.timestamp, nets }
}
```

## 6. Tie Handling

Stroke Play adds two tie modes beyond the common set in `.claude/skills/golf-betting-rules/SKILL.md`: `card-back` and `scorecard-playoff`. `carryover` and `no-points` are not supported and are rejected in config.

| `tieRule` | Behavior |
|---|---|
| `split` | Every non-winner pays `stake`. The total loser pot (`stake × (N − winnerCount)`) divides equally among the tied winners. When `(N − winnerCount)` is not divisible by `winnerCount`, the tied winner with the lowest `playerId` absorbs the remainder via a `RoundingAdjustment` event. |
| `card-back` *(default)* | Compare `cardBackOrder` segments in order — back 9, back 6, back 3, last hole — using each player's **net** segment total. First segment that separates the tied players decides. Emit `CardBackResolved`. |
| `scorecard-playoff` | Compare every hole in `cardBackOrder`, then every hole from 18 backwards if still tied. Emit `ScorecardPlayoffResolved`. |

Every split-based resolution emits a `TieFallthrough` event before the `StrokePlaySettled` event that carries the split deltas. The `from` field disambiguates three cases:

- `from: 'split'` — `tieRule` was configured as `'split'` directly; no upstream tie-breaker was attempted.
- `from: 'card-back'` — `tieRule = 'card-back'` exhausted every `cardBackOrder` segment without separating the tied players, and settlement falls back to `'split'`.
- `from: 'scorecard-playoff'` — `tieRule = 'scorecard-playoff'` exhausted every segment and every individual hole without separation, and settlement falls back to `'split'`.

`to` is always `'split'` in v1 (no other fallback target is supported). Any tie that still cannot be resolved by the supported modes is handled at the Final Adjustment screen per `docs/games/_FINAL_ADJUSTMENT.md`; the app never plays extra holes.

## 7. Press & Variants

Stroke Play has no press mechanic.

Variants:

- `settlementMode = 'winner-takes-pot'` — one winner, N−1 losers. Default.
- `settlementMode = 'per-stroke'` — every pairwise stroke difference exchanges `stakePerStroke` units; highly volatile, zero-sum by construction.
- `settlementMode = 'places'` — fixed payout schedule over 1st through Nth. Places 4–N may be 0 in a 4-player field. Runs regardless of spread.

`places` and `winner-takes-pot` operate on final net totals. `per-stroke` operates on pairwise net differences.

Every Junk item in `junkItems` pays out at `points × stake × junkMultiplier` for this bet; see `docs/games/game_junk.md` for the points formula.

## 8. End-of-Round Settlement

### `winner-takes-pot`

```
rank players by net total ascending
winners = players whose net total == min total
if winners.length == 1:
  delta[winners[0]] = stake * (N - 1)
  for each other player: delta[p] = -stake
else:
  resolve per cfg.tieRule (section 6)
```

### `per-stroke`

```
for each unordered pair (p, q):
  diff = net_total[p] - net_total[q]
  delta[p] += -diff * stakePerStroke   // p pays stakePerStroke per stroke above q
  delta[q] += +diff * stakePerStroke
```

Σ delta = 0 by symmetry of pairwise exchange.

### `places`

```
sort players by net total ascending
if any adjacent pair tied:
  resolve tied rank per cfg.tieRule; produce the final order
for each place i in 0..N-1:
  delta[sorted[i]] = placesPayout[i] - stake
```

When two or more players tie for a paid position under `places`, the engine produces a total order for the tied cluster rather than a single winner. The procedure is:

1. Iteratively apply `cardBackOrder` to the remaining tied players: the first segment that separates one tied player from the rest fixes that player's rank, and iteration continues with the residual subset.
2. If `cardBackOrder` exhausts every segment without further separation, emit `TieFallthrough` with `from: <tieRule>`, `to: 'split'`, and break remaining ties by ascending `playerId` lexicographic order as the final deterministic resolver.

The lexicographic fallback matches the `split` tie-rule's "lowest `playerId` absorbs remainder" convention from § 6, so the same rank-determinism rule governs both settlement modes.

Σ delta = `sum(placesPayout) - N*stake = 0` by the config invariant in section 4.

## 9. Edge Cases

- **Missing score on a hole** — that player's net total is flagged as incomplete. Emit `IncompleteCard`. A player with an incomplete card is excluded from settlement; remaining players settle among themselves. If fewer than 2 players complete the round, emit `FieldTooSmall` and zero-delta the round.
- **All players tied on final total** — resolve per `tieRule`. `split` produces zero delta (every player gets back their own stake). `card-back` iterates segments.
- **`places` mode with N players and fewer than N place entries** — config invariant requires `placesPayout.length === playerIds.length`. Rejected at config validation.
- **`per-stroke` with large stroke spread** — integer-only; no overflow concern at realistic tournament scales.
- **Card-back tie all the way down** — emit `TieFallthrough` and resolve under `split`.
- **Player withdraws mid-round** — out of scope for this engine. A withdrawn player who records no further gross scores is handled via IncompleteCard (see the Missing-score case above).

## 10. Worked Example

Four players — Alice (hcp 0), Bob (hcp 5), Carol (hcp 10), Dave (hcp 15). `settlementMode = 'winner-takes-pot'`. `tieRule = 'card-back'`. `appliesHandicap = true`. Stake = 10 units.

Round gross totals (18 holes):

| Player | Gross | Hcp | Net |
|---|:-:|:-:|:-:|
| Alice | 77 | 0 | **77** |
| Bob | 83 | 5 | 78 |
| Dave | 95 | 15 | 80 |
| Carol | 91 | 10 | 81 |

Alice wins outright with 77 net. No tie.

Settlement under `winner-takes-pot`, stake = 10:

| Player | Delta |
|---|:-:|
| Alice | +30 |
| Bob | −10 |
| Carol | −10 |
| Dave | −10 |

Σ delta = 30 − 10 − 10 − 10 = **0**.

### Supplementary — same scores, `settlementMode = 'per-stroke'`, `stakePerStroke = 1`

Pairwise net differences and cash flows:

| Pair | Net diff | Flow |
|---|:-:|---|
| Alice vs Bob | 77 − 78 = −1 | Bob → Alice 1 |
| Alice vs Carol | 77 − 81 = −4 | Carol → Alice 4 |
| Alice vs Dave | 77 − 80 = −3 | Dave → Alice 3 |
| Bob vs Carol | 78 − 81 = −3 | Carol → Bob 3 |
| Bob vs Dave | 78 − 80 = −2 | Dave → Bob 2 |
| Carol vs Dave | 81 − 80 = +1 | Carol → Dave 1 |

Totals: **Alice = +8, Bob = +4, Carol = −8, Dave = −4.** Σ delta = **0**.

### Supplementary — same scores, `settlementMode = 'places'`, `placesPayout = [20, 12, 8, 0]`

Pot = 40 (4 × stake 10). Ranking: Alice, Bob, Dave, Carol. Each player antes stake; delta is `placesPayout[rank] − stake`.

| Player | Rank | Payout | Delta |
|---|:-:|:-:|:-:|
| Alice | 1 | 20 | +10 |
| Bob | 2 | 12 | +2 |
| Dave | 3 | 8 | −2 |
| Carol | 4 | 0 | −10 |

Σ delta = **0**.

### Supplementary — tie on final total, `tieRule = 'card-back'`

Rewrite gross totals so Alice and Bob tie at 77 net (Bob shoots 82 gross, hcp 5 → net 77). Back-9 net totals: Alice 38, Bob 40. Card-back resolves in Alice's favor on the first segment.

Settlement (`winner-takes-pot`, stake 10): Alice +30, Bob −10, Carol −10, Dave −10. `CardBackResolved` event with segment `9` and tied players `[Alice, Bob]`. Σ delta = 0.

## 11. Implementation Notes

Scoring file: `src/games/stroke_play.ts`. Emitted events: `StrokePlayHoleRecorded`, `StrokePlaySettled`, `CardBackResolved`, `ScorecardPlayoffResolved`, `TieFallthrough`, `RoundingAdjustment`, `IncompleteCard`, `FieldTooSmall`. Imports `strokesOnHole` from `src/games/handicap.ts` and `ScoringEvent` from `./types`.

`TieFallthrough` payload: `{ kind: 'TieFallthrough', hole: null, timestamp, actor, declaringBet, from, to }`. `from` is one of `'split' | 'card-back' | 'scorecard-playoff'` per § 6; `to` is always `'split'` in v1. The event is emitted once per tie that resolves to `'split'`, in the same order as the `StrokePlaySettled` event it precedes.

`src/games/stroke_play.ts` is stateless at the hole level. `src/games/aggregate.ts` calls the per-hole recorder on every hole, then calls the round settler once at round end. `stroke_play.ts` owns the `tieRule` dispatch (all branching on `config.tieRule`, all calls to `resolveTieByCardBack` / `resolveTieByScorecardPlayoff` / `emitSplitSettlement`). `aggregate.ts` is the caller; it invokes `finalizeStrokePlayRound` and forwards the result.

`per-stroke` multiplies and sums integers only. `places` sums integers from `placesPayout`. `winner-takes-pot` multiplies `stake` by an integer player count. No floating-point arithmetic.

`cardBackOrder` defaults to `[9, 6, 3, 1]`. `9` means the last 9 holes (10–18), `6` means the last 6 (13–18), `3` means the last 3 (16–18), `1` means hole 18 alone. A full 9-hole round uses `[3, 1]` by convention.

## 12. Test Cases

### Test 1 — Worked example (verbatim from section 10)

Four players (Alice hcp 0, Bob hcp 5, Carol hcp 10, Dave hcp 15). Gross 77 / 83 / 91 / 95. `settlementMode = 'winner-takes-pot'`, stake 10, handicap applied.

Assert:
- Net totals = `{ Alice: 77, Bob: 78, Carol: 81, Dave: 80 }`.
- Deltas = `{ Alice: +30, Bob: −10, Carol: −10, Dave: −10 }`.
- Σ delta = 0.
- Every delta satisfies `Number.isInteger`.
- Exactly 18 `StrokePlayHoleRecorded` events.
- Exactly one `StrokePlaySettled` event.

### Test 2 — Per-stroke supplementary (verbatim from section 10)

Same gross scores, `settlementMode = 'per-stroke'`, `stakePerStroke = 1`.

Assert:
- Deltas = `{ Alice: +8, Bob: +4, Carol: −8, Dave: −4 }`.
- Σ delta = 0.
- Every delta satisfies `Number.isInteger`.

### Test 3 — Places supplementary (verbatim from section 10)

Same gross scores, `settlementMode = 'places'`, `placesPayout = [20, 12, 8, 0]`, stake 10.

Assert:
- Deltas = `{ Alice: +10, Bob: +2, Dave: −2, Carol: −10 }`.
- Σ `placesPayout` = 40 = 4 × 10.
- Σ delta = 0.

### Test 4 — Card-back tie resolution

Setup: Alice and Bob tie at 77 net. Alice back-9 net = 38, Bob back-9 net = 40. `tieRule = 'card-back'`, `cardBackOrder = [9, 6, 3, 1]`.

Assert:
- `CardBackResolved` event with `segment = 9`, `tiedPlayers = [Alice, Bob]`, `winner = Alice`.
- Deltas under `winner-takes-pot`: `{ Alice: +30, Bob: −10, Carol: −10, Dave: −10 }`.
- Σ delta = 0.

### Test 5 — Tie-fallthrough under card-back

Setup: Alice and Bob tie at 77 net and every `cardBackOrder` segment is also tied. `tieRule = 'card-back'`. Expected fallback: `split`. `settlementMode = 'winner-takes-pot'`, stake 10, 4 players.

Arithmetic under section 6 `split`: each non-winner (Carol, Dave) pays `stake = 10`. Loser pot = `stake × (N − winnerCount) = 10 × 2 = 20`. The loser pot divides between the 2 tied winners as `20 / 2 = 10` each, integer-clean.

Assert:
- `TieFallthrough` event with `from = 'card-back'`, `to = 'split'`.
- Deltas = `{ Alice: +10, Bob: +10, Carol: −10, Dave: −10 }`.
- Σ delta = 0.
- No `RoundingAdjustment` emitted (loser pot divided evenly).
- When stake × (N − winnerCount) is not divisible by winnerCount, a `RoundingAdjustment` event absorbs the remainder into the tied winner with the lowest `playerId`.

### Test 6 — Incomplete card

Setup: Alice skips hole 7. `IncompleteCard` event for Alice. Settlement excludes Alice.

Assert:
- Remaining 3 players settle among themselves under `winner-takes-pot`. Pot is 2 × stake = 20 for the new winner.
- Alice's delta = 0.
- Σ delta across all 4 players = 0.

### Test 7 — `places` config validation

Setup: `placesPayout = [20, 10, 8, 0]` (sum = 38, not 40). Assert: config validation throws; no settlement runs.

### Test 8 — Direct-split TieFallthrough ordering

`tieRule = 'split'` directly (no upstream tiebreaker). Assert: `TieFallthrough { from: 'split', to: 'split' }` precedes `StrokePlaySettled` in the returned event list.

### Test 9 — RoundingAdjustment, 3-way tie among 5 players

3 tied winners, 2 losers, `stake = 1`. Loser pot = 2; `floor(2/3) = 0` per winner, remainder = 2. Assert: `RoundingAdjustment` emitted; lowest `playerId` winner absorbs remainder; Σ delta = 0.

### Test 10 — Card-back multi-segment: back-9 tied, back-6 separates

`cardBackOrder = [9, 6, 3, 1]`; back-9 net totals equal; back-6 totals differ. Assert: `CardBackResolved { segment: 6 }`; Σ delta = 0.

### Test 11 — `tieRule = 'scorecard-playoff'`

Tie on total net; back-9 segment separates. Assert: `ScorecardPlayoffResolved` emitted with correct winner; Σ delta = 0.

### Test 12 — Round Handicap integration

Same gross scores; different `roundHandicap` values on `PlayerSetup`. Assert: effective handicap (courseHcp + roundHandicap) changes net totals and winner correctly.

### Test 13 — Config error throwing

Assert `StrokePlayConfigError` thrown for: missing `settlementMode`, missing `tieRule`, `places` with wrong-length `placesPayout`, `places` with non-integer entry, bet not found in `roundCfg.bets` (throws `StrokePlayBetNotFoundError`).

### Test 14 — Event ordering: every split resolution preceded by TieFallthrough

MIGRATION_NOTES #15 fix. Assert for both direct-split path and card-back-fallthrough path that `TieFallthrough` appears before `StrokePlaySettled` in the event list.

### Test 15 — FieldTooSmall: fewer than 2 players complete the round

Three of four players have gross = 0 on every hole. Assert: `FieldTooSmall` emitted; no `StrokePlaySettled`; all deltas = 0.

### Test 16 — `resolveTieByCardBack` helper (pure, exported)

Direct unit test of the exported helper. Assert: returns `{ winner: null, events: [] }` when every segment is tied; returns `{ winner, events: [CardBackResolved] }` when a segment separates.
