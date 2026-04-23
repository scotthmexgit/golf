# Game: Match Play

Link: `.claude/skills/golf-betting-rules/SKILL.md` · Scoring file: `src/games/match_play.ts`

## 1. Overview

Match Play scores each hole head-to-head. The side with the lower net score on a hole wins that hole; ties halve the hole. The match ends when one side is ahead by more holes than remain to play (closeout), or at the final hole of the scheduled match. This file specifies two formats: singles and best-ball (four-ball). `src/games/match_play.ts` is the authority on behavior.

## 2. Players & Teams

| `format` | Field | Team size | Ball per team |
|---|---|---|---|
| `singles` | 2 players | 1 | 1 per player |
| `best-ball` | 4 players | 2 | 1 per player (team score = best-ball-net) |

USGA stroke allocation, delegated to `src/games/handicap.ts`:

- **Singles.** Lower-handicap player plays to 0; the higher-handicap player receives the difference in course handicap, allocated to the lowest-index holes.
- **Best-ball.** Each player's strokes are the difference between that player's course handicap and the lowest course handicap in the four-player field (100% of difference). Strokes apply to the individual's ball, not the team's.

## 3. Unit of Wager

Stake is 1 integer unit per match (default 100 minor units). A match settles once — at closeout or at the final hole — not per hole.

Multipliers: none.

## 4. Setup

```ts
interface MatchPlayConfig {
  stake: number
  format: 'singles' | 'best-ball'
  appliesHandicap: boolean         // default true
  holesToPlay: 9 | 18              // default 18
  tieRule: 'halved'                // only supported value; extra-holes deferred to post-v1
  playerIds: PlayerId[]            // length per format row
  teams?: [[PlayerId, PlayerId], [PlayerId, PlayerId]]
                                   // required for non-singles formats
  junkItems: JunkKind[]            // default [] — Junk awards this bet declares in-play; see docs/games/game_junk.md
  junkMultiplier: number           // positive integer, default 1; applies to every event in junkItems
}
```

<!-- Gap 10 resolved -->
**`teams` validation contract (non-singles formats):**

For `format !== 'singles'`, the engine validates the `teams` field before scoring begins:

1. `teams.length === 2`
2. Each team has exactly 2 player IDs: `teams[0].length === 2` and `teams[1].length === 2`
3. All player IDs in `teams` are members of `config.playerIds`
4. No duplicate player IDs across both teams combined (all 4 IDs are distinct)

If any condition fails, the engine emits `MatchConfigInvalid` (not a thrown error). Scoring does not proceed.

## 5. Per-Hole Scoring

```ts
import { strokesOnHole } from './handicap'
import type { HoleState, SettlementDelta, ScoringEvent } from './types'

interface MatchState {
  holesUp: number                  // positive = team 1 up, negative = team 2 up
  holesPlayed: number
  closedOut: boolean
}

function holeWinner(
  state: HoleState, cfg: MatchPlayConfig,
): 'team1' | 'team2' | 'halved' {
  const teamNet = (side: PlayerId[]): number =>
    Math.min(...side.map(pid =>
      cfg.appliesHandicap
        ? state.gross[pid] - strokesOnHole(state.strokes[pid], state.holeIndex)
        : state.gross[pid]))
  const a = teamNet(cfg.teams ? cfg.teams[0] : [cfg.playerIds[0]])
  const b = teamNet(cfg.teams ? cfg.teams[1] : [cfg.playerIds[1]])
  if (a < b) return 'team1'
  if (b < a) return 'team2'
  return 'halved'
}

function advanceMatch(match: MatchState, winner: ReturnType<typeof holeWinner>): MatchState {
  if (match.closedOut) return match
  const delta = winner === 'team1' ? +1 : winner === 'team2' ? -1 : 0
  const next = { ...match,
                 holesUp: match.holesUp + delta,
                 holesPlayed: match.holesPlayed + 1 }
  const holesRemaining = 18 /* or cfg.holesToPlay */ - next.holesPlayed
  if (Math.abs(next.holesUp) > holesRemaining) next.closedOut = true
  return next
}
```

`src/games/match_play.ts` exposes a single-hole settle function and a round aggregator. The per-hole function returns only the updated `MatchState` and a `HoleResolved` event; monetary delta is emitted once, by the aggregator, when the match reaches closeout or the final hole.

<!-- Gap 9 resolved -->
**Best-ball partial miss clarification:**

Existing § 5 `holeWinner` pseudocode (lines above): the `teamNet` function for `best-ball` calls `Math.min(...side.map(pid => state.gross[pid] - strokesOnHole(...)))`. This naturally handles partial availability:

- If one partner has a missing gross score and the other has a valid score, the team uses the available partner's score. A single valid score is vacuously the best available net — it is as if `Math.min` is called over a one-element array.
- Only if **all** team members have missing gross scores does the team forfeit the hole. See § 9 for the `HoleForfeited` event.

This applies to `format: 'best-ball'` only.

## 6. Tie Handling

A halved hole produces a zero-delta event (`HoleHalved`) and does not advance `holesUp`.

On the final scheduled hole, if the match is tied (`holesUp === 0` at `holesPlayed === holesToPlay`), `finalizeMatchPlayRound` emits `MatchHalved` with `matchId: cfg.id`, `hole: holesToPlay`, and zero deltas for all participants. No extra holes are played. Disagreement on the halve escalates to the Final Adjustment screen per `docs/games/_FINAL_ADJUSTMENT.md`.

## 7. Press & Variants

Match Play has no press mechanic. Nassau wraps match play in three parent matches and layers presses on top — see `docs/games/game_nassau.md`.

Variants:

- **9-hole match** — `holesToPlay: 9`. Closeout threshold is `holesRemaining = 9 − holesPlayed`.
- **Dormie** — a UI term for `holesUp === holesRemaining`. Not a rule change; no special event.
- **Concession** — a player may concede a hole, a stroke, or the match. `ConcessionRecorded` event captures a concession with `actor` set to the conceding player. Conceded holes advance `holesUp` as if the concession were a win for the opposing side.

<!-- Gap 4 resolved -->
**Concession and closeout ordering:**

If a hole concession causes `holesUp > holesRemaining` after the advance (i.e., the concession closes out the match on a scheduled hole), the engine emits two events in the same call:

1. `ConcessionRecorded` first — the causal event, recording the conceding player and the conceded unit (`'hole'`).
2. `MatchClosedOut` second — emitted because `holesUp > holesRemaining` after the advance.

Both events carry the conceded hole's hole number. The ordering is causal: the concession is the cause; the closeout is the consequence. The engine must not emit `MatchClosedOut` before `ConcessionRecorded` in this sequence.

<!-- Phase 4b input API resolved -->
**Concession input API:**

Three concession units use distinct input paths:

| Unit | Input | Notes |
|---|---|---|
| `'hole'` | `HoleState.conceded: PlayerId[]` — caller populates with the conceding player(s) | Passed to `settleMatchPlayHole`. Engine short-circuits `holeWinner` before net-score comparison. |
| `'stroke'` | Scorecard only — caller records the gross score as if the conceded putt was taken | No engine signal. `unit: 'stroke'` is reserved in the event type for future UI annotation; out of engine scope for Phase 4b. |
| `'match'` | `concedeMatch(cfg, roundCfg, match, concedingPlayer: PlayerId, hole: number)` | Separate engine function, not via `HoleState`. Called between hole scoring calls. Returns `{ events: ScoringEvent[]; match: MatchState }`. |

**Hole concession engine contract (`'hole'`):**

When `state.conceded` is non-empty, `settleMatchPlayHole` inspects it before invoking `holeWinner`:

- **Singles:** if the conceding player is `cfg.playerIds[1]` (side 2), hole outcome is `'team1'`; if `cfg.playerIds[0]` (side 1), `'team2'`. Net scores are not compared.
- **Best-ball (per-player):** the conceding player's ball is excluded from the team's `bestNet` computation — treated identically to a missing gross score per the § 5 partial-miss rule. If **all** members of a team are in `state.conceded`, the team forfeits the hole (`HoleForfeited`). If only one member concedes, the partner's score stands.

`ConcessionRecorded` is emitted with `unit: 'hole'`, `conceder` = the conceding player, `hole` = the current hole number. `ConcessionRecorded` replaces `HoleResolved` for a conceded hole — it is the hole resolution event. Match advance runs normally after the concession; if the advance triggers closeout, `MatchClosedOut` is emitted after `ConcessionRecorded` per the Gap 4 ordering above.

**Match concession contract (`'match'`):**

`concedeMatch(cfg, roundCfg, match, concedingPlayer, hole)` emits, in order:

1. `ConcessionRecorded` with `unit: 'match'`, `conceder = concedingPlayer`, `hole = hole` (the last hole played or the hole at which the concession is declared; not `null`).
2. `MatchClosedOut` with `points` settled per § 8 in favor of the recipient; `holesUp = Math.abs(match.holesUp)`; `holesRemaining = cfg.holesToPlay − match.holesPlayed`.

Returns `{ events, match: { ...match, closedOut: true } }`. Does not receive a `HoleState`. Holes after `hole` do not score — the caller must not pass subsequent holes to `settleMatchPlayHole` once `match.closedOut` is `true`.

Every Junk item in `junkItems` pays out at `points × stake × junkMultiplier` for this bet; see `docs/games/game_junk.md` for the points formula.

## 8. End-of-Round Settlement

```
if match.closedOut or match.holesPlayed === holesToPlay:
  if holesUp > 0: delta = { team1: +stake, team2: -stake }
  if holesUp < 0: delta = { team1: -stake, team2: +stake }
  if holesUp == 0: resolve per tieRule (see section 6)
```

For multi-player teams, the team delta is split equally among team members. `stake` is sized so integer division is always clean (default 100 minor units, teams of 2 → +50/−50 per player). Any remainder routes to a `RoundingAdjustment` event with the absorbing player being the lowest `playerId` in that team.

<!-- Gap 7 resolved -->
**Rounding adjustment detail:**

If `stake % teamSize !== 0`, the engine emits `RoundingAdjustment` to absorb the remainder. The caller (UI) should ensure `stake % teamSize === 0` for clean per-player splits; this is a best-practice recommendation, not a precondition the engine enforces with an error. The engine silently handles the remainder via `RoundingAdjustment`.

The absorbing player is the player with the **lowest `playerId` lexicographically** in the team that has a remainder. `RoundingAdjustment` carries `absorbingPlayer: PlayerId` identifying this player.

Match-level zero-sum holds by construction. Team-level zero-sum holds whenever stake is divisible by team size; `RoundingAdjustment` preserves zero-sum when it is not.

## 9. Edge Cases

- **Missing score** — the team with a missing scorecard entry forfeits that hole. Emit `HoleForfeited`. For `best-ball`, see the partial-miss clarification in § 5: a team forfeits only when ALL members have missing scores; a single valid score is used as the team's best-ball net.
- **Concession** — conceding a hole is equivalent to losing it; emit `ConcessionRecorded` with the conceded unit (`'hole' | 'stroke' | 'match'`). See § 7 for concession input API and closeout event ordering.
- **Conceded match** — `ConcessionRecorded` with `unit: 'match'` ends the match immediately with `delta` in favor of the recipient. Remaining holes do not score.
- **Closeout on the final scheduled hole** — emitting `MatchClosedOut` and reaching `holesToPlay` are identical outcomes; emit both events to keep the audit trail unambiguous.
- **Invalid team configuration** — `format !== 'singles'` without a valid `teams` array: scoring refuses to start; emit `MatchConfigInvalid`. See § 4 for the full validation contract.
- **Team with a 1-player gap** (e.g. partner withdraws) — team's score on subsequent holes is the remaining player's net. Emit `TeamSizeReduced`.

<!-- Gap 3 resolved inline above in the TeamSizeReduced bullet -->

## 10. Worked Example

Two players — Alice (course handicap 0) and Bob (course handicap 5). `format = 'singles'`. `appliesHandicap = true`. `holesToPlay = 18`. `stake = 1 unit`. Course = Shadow Hills. Bob receives strokes on holes 2, 4, 7, 12, 16 (indices 3, 1, 5, 2, 4).

| H | Par | Idx | A gross | B gross | B stroke | A net | B net | Winner | holesUp (A−B) | holesRemaining | Closed? |
|---:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 1 | 4 | 7 | 5 | 4 | — | 5 | 4 | B | −1 | 17 | no |
| 2 | 4 | 3 | 4 | 5 | +1 | 4 | 4 | halved | −1 | 16 | no |
| 3 | 3 | 15 | 4 | 3 | — | 4 | 3 | B | −2 | 15 | no |
| 4 | 5 | 1 | 5 | 5 | +1 | 5 | 4 | B | −3 | 14 | no |
| 5 | 4 | 11 | 4 | 4 | — | 4 | 4 | halved | −3 | 13 | no |
| 6 | 3 | 17 | 4 | 3 | — | 4 | 3 | B | −4 | 12 | no |
| 7 | 4 | 5 | 4 | 5 | +1 | 4 | 4 | halved | −4 | 11 | no |
| 8 | 5 | 9 | 5 | 6 | — | 5 | 6 | A | −3 | 10 | no |
| 9 | 4 | 13 | 5 | 4 | — | 5 | 4 | B | −4 | 9 | no |
| 10 | 4 | 8 | 4 | 4 | — | 4 | 4 | halved | −4 | 8 | no |
| 11 | 3 | 16 | 4 | 3 | — | 4 | 3 | B | −5 | 7 | no |
| 12 | 5 | 2 | 5 | 5 | +1 | 5 | 4 | B | −6 | 6 | no |
| 13 | 4 | 6 | 4 | 4 | — | 4 | 4 | halved | −6 | 5 | **yes** — `|−6| > 5` |

`MatchClosedOut` event fires after hole 13 with `holesUp = 6`, `holesRemaining = 5`. The match is recorded as **B wins 6 & 5** (6 up with 5 to play). Holes 14–18 do not score.

Settlement: B wins the match. Deltas: **A = −1, B = +1**. Σ delta = **0**.

## 11. Implementation Notes

Scoring file: `src/games/match_play.ts`. Emitted events: `HoleResolved`, `HoleHalved`, `MatchClosedOut`, `MatchHalved`, `ConcessionRecorded`, `HoleForfeited`, `MatchConfigInvalid`, `TeamSizeReduced`, `RoundingAdjustment`. (`ExtraHoleResolved` is defined in `events.ts` but not emitted; extra-holes format is deferred to post-v1.) Imports `strokesOnHole` from `src/games/handicap.ts` and `ScoringEvent` from `src/games/events.ts`.

`match_play.ts` is stateful at the `MatchState` level — threaded by `aggregate.ts`. The per-hole settle function is pure.

No floating-point arithmetic occurs in Match Play settlement.

## 12. Test Cases

### Test 1 — Worked example (verbatim from section 10)

`singles`, 18 holes, handicap applied, Bob receives 5 strokes on holes 2, 4, 7, 12, 16. Gross scores per the hole-by-hole table.

Assert:
- `MatchClosedOut` event emitted after hole 13 with `holesUp = 6` (absolute), `holesRemaining = 5`, winner = Bob.
- Deltas = `{ A: −1, B: +1 }`.
- Σ delta = 0.
- Every delta satisfies `Number.isInteger`.
- Holes 14–18 produce no `HoleResolved` events.
- Exactly 5 `HoleHalved` events, on holes 2, 5, 7, 10, and 13.

### Test 2 — Halved match

Setup: 18-hole singles, `tieRule = 'halved'`; after hole 18, `holesUp === 0`. Assert: `MatchHalved` event, deltas = `{ A: 0, B: 0 }`, Σ delta = 0.

### Test 3 — Four-ball (best-ball) team win

Setup: 4 players in teams (A,B) vs (C,D), `format = 'best-ball'`, stake 100. A team (A,B) wins 3 & 2 at hole 16. Assert:
- Team delta = `{ teamAB: +100, teamCD: −100 }`.
- Per-player delta: A +50, B +50, C −50, D −50.
- Σ delta = 0.

### Test 4 — Conceded match

Setup: 18-hole singles. B is 3 down after hole 10 (`match.holesUp = −3`, `match.holesPlayed = 10`). Input: `concedeMatch(cfg, roundCfg, match, B, 10)`.

Assert:
- `ConcessionRecorded` with `unit: 'match'`, `conceder = B`, `hole = 10`.
- `MatchClosedOut` with `points = { A: +1, B: −1 }`, `holesUp = 3`, `holesRemaining = 8`.
- Return `match.closedOut = true`. Holes 11–18 do not score. Σ delta = 0.

### Test 5 — Hole concession closes out the match (Gap 4 ordering)

Setup: 18-hole singles. After hole 15, A is 3 up (`match.holesUp = +3`, `match.holesPlayed = 15`). B concedes hole 16. Input: `settleMatchPlayHole` with `HoleState.conceded = [B]`. Gross scores are present but irrelevant — scoring short-circuits at the concession check.

Assert:
- Exactly 2 events emitted, in this order:
  1. `ConcessionRecorded` with `unit: 'hole'`, `conceder = B`, `hole = 16`.
  2. `MatchClosedOut` with `holesUp = 4` (3 up + concession win), `holesRemaining = 2`.
- No `HoleResolved` event — `ConcessionRecorded` is the hole resolution event for a conceded hole.
- `points = { A: +1, B: −1 }`. Σ delta = 0.
