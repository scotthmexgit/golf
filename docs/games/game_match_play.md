# Game: Match Play

Link: `.claude/skills/golf-betting-rules/SKILL.md` · Scoring file: `src/games/match_play.ts`

## 1. Overview

Match Play scores each hole head-to-head. The side with the lower net score on a hole wins that hole; ties halve the hole. The match ends when one side is ahead by more holes than remain to play (closeout), or at the final hole of the scheduled match. This file specifies four formats: singles, best-ball (four-ball), alternate-shot, and foursomes. `src/games/match_play.ts` is the authority on behavior.

## 2. Players & Teams

| `format` | Field | Team size | Ball per team |
|---|---|---|---|
| `singles` | 2 players | 1 | 1 per player |
| `best-ball` | 4 players | 2 | 1 per player (team score = best-ball-net) |
| `alternate-shot` | 4 players | 2 | 1 per team (partners alternate strokes) |
| `foursomes` | 4 players | 2 | 1 per team (one partner tees odd holes, the other tees even) |

`alternate-shot` and `foursomes` share scoring rules. They differ only in tee-off assignment, which `match_play.ts` does not enforce; the distinction exists for UI prompts.

USGA stroke allocation, delegated to `src/games/handicap.ts`:

- **Singles.** Lower-handicap player plays to 0; the higher-handicap player receives the difference in course handicap, allocated to the lowest-index holes.
- **Best-ball.** Each player's strokes are the difference between that player's course handicap and the lowest course handicap in the four-player field (100% of difference). Strokes apply to the individual's ball, not the team's.
- **Alternate-shot / foursomes.** Team course handicap = 50% of the combined course handicaps of the two partners, rounded to the nearest integer (half-stroke rounds up). Team strokes are allocated against the opposing team's course handicap using the same USGA method.

## 3. Unit of Wager

Stake is 1 integer unit per match (default 100 minor units). A match settles once — at closeout or at the final hole — not per hole.

Multipliers: none.

## 4. Setup

```ts
interface MatchPlayConfig {
  stake: number
  format: 'singles' | 'best-ball' | 'alternate-shot' | 'foursomes'
  appliesHandicap: boolean         // default true
  holesToPlay: 9 | 18              // default 18
  tieRule: 'halved' | 'extra-holes'
                                   // default 'halved'
  extraHolesCap: number            // default 3 — max extra holes before reverting to 'halved'
  playerIds: PlayerId[]            // length per format row
  teams?: [[PlayerId, PlayerId], [PlayerId, PlayerId]]
                                   // required for non-singles formats
  junkItems: JunkKind[]            // default [] — Junk awards this bet declares in-play; see docs/games/game_junk.md
  junkMultiplier: number           // positive integer, default 1; applies to every event in junkItems
}
```

## 5. Per-Hole Scoring

```ts
import { strokesOnHole, teamCourseHandicap } from './handicap'
import type { HoleState, SettlementDelta, ScoringEvent } from './types'

interface MatchState {
  holesUp: number                  // positive = team 1 up, negative = team 2 up
  holesPlayed: number
  closedOut: boolean
}

function holeWinner(
  state: HoleState, cfg: MatchPlayConfig,
): 'team1' | 'team2' | 'halved' {
  const teamNet = (side: PlayerId[]): number => {
    if (cfg.format === 'singles' || cfg.format === 'best-ball') {
      // best of each player's net score on this hole
      return Math.min(...side.map(pid =>
        cfg.appliesHandicap
          ? state.gross[pid] - strokesOnHole(state.strokes[pid], state.holeIndex)
          : state.gross[pid]))
    }
    // alternate-shot / foursomes — one ball per team, team stroke allocation
    const teamStrokes = cfg.appliesHandicap ? state.teamStrokes[sideKey(side)] : 0
    return state.teamGross[sideKey(side)] - strokesOnHole(teamStrokes, state.holeIndex)
  }
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

## 6. Tie Handling

A halved hole produces a zero-delta event (`HoleHalved`) and does not advance `holesUp`.

A halved match at the final hole resolves per `tieRule`:

| `tieRule` | Behavior |
|---|---|
| `halved` *(default)* | Match ends tied. Delta = `{ team1: 0, team2: 0 }`. Emit `MatchHalved`. Disagreement on the halve escalates to the Final Adjustment screen per `docs/games/_FINAL_ADJUSTMENT.md`; the app never plays extra holes beyond hole 18. |
| `extra-holes` | Play up to `extraHolesCap` extra holes within hole 18. If still tied after the cap, revert to `halved`. Emit `ExtraHoleResolved` per hole. |

## 7. Press & Variants

Match Play has no press mechanic. Nassau wraps match play in three parent matches and layers presses on top — see `docs/games/game_nassau.md`.

Variants:

- **9-hole match** — `holesToPlay: 9`. Closeout threshold is `holesRemaining = 9 − holesPlayed`.
- **Dormie** — a UI term for `holesUp === holesRemaining`. Not a rule change; no special event.
- **Concession** — a player may concede a hole, a stroke, or the match. `ConcessionRecorded` event captures a concession with `actor` set to the conceding player. Conceded holes advance `holesUp` as if the concession were a win for the opposing side.

Every Junk item in `junkItems` pays out at `points × stake × junkMultiplier` for this bet; see `docs/games/game_junk.md` for the points formula.

## 8. End-of-Round Settlement

```
if match.closedOut or match.holesPlayed === holesToPlay:
  if holesUp > 0: delta = { team1: +stake, team2: -stake }
  if holesUp < 0: delta = { team1: -stake, team2: +stake }
  if holesUp == 0: resolve per tieRule (see section 6)
```

For multi-player teams, the team delta is split equally among team members. `stake` is sized so integer division is always clean (default 100 minor units, teams of 2 → +50/−50 per player). Any remainder routes to a `RoundingAdjustment` event with the absorbing player being the lowest `playerId` in that team.

Match-level zero-sum holds by construction. Team-level zero-sum holds whenever stake is divisible by team size; `RoundingAdjustment` preserves zero-sum when it is not.

## 9. Edge Cases

- **Missing score** — the team with a missing scorecard entry forfeits that hole. Emit `HoleForfeited`.
- **Concession** — conceding a hole is equivalent to losing it; emit `ConcessionRecorded` with the conceded unit (`'hole' | 'stroke' | 'match'`).
- **Conceded match** — `ConcessionRecorded` with `unit: 'match'` ends the match immediately with `delta` in favor of the recipient. Remaining holes do not score.
- **Closeout on the final scheduled hole** — emitting `MatchClosedOut` and reaching `holesToPlay` are identical outcomes; emit both events to keep the audit trail unambiguous.
- **Invalid team configuration** — `format !== 'singles'` without a valid `teams` array: scoring refuses to start; emit `MatchConfigInvalid`.
- **Team with a 1-player gap** (e.g. partner withdraws) — team's score on subsequent holes is the remaining player's net; team course handicap recomputes via `teamCourseHandicap` using only the remaining player. Emit `TeamSizeReduced`.

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
| 13 | 4 | 6 | 4 | 4 | — | 4 | 4 | halved | −6 | 5 | no |
| 14 | 4 | 12 | 5 | 5 | — | 5 | 5 | halved | −6 | 4 | **yes** — `|−6| > 4` |

`MatchClosedOut` event fires after hole 14 with `holesUp = 6`, `holesRemaining = 4`. The match is recorded as **B wins 6 & 4** (6 up with 4 to play). Holes 15–18 do not score.

Settlement: B wins the match. Deltas: **A = −1, B = +1**. Σ delta = **0**.

## 11. Implementation Notes

Scoring file: `src/games/match_play.ts`. Emitted events: `HoleResolved`, `HoleHalved`, `MatchClosedOut`, `MatchHalved`, `ExtraHoleResolved`, `ConcessionRecorded`, `HoleForfeited`, `MatchConfigInvalid`, `TeamSizeReduced`, `RoundingAdjustment`. Imports `strokesOnHole` and `teamCourseHandicap` from `src/games/handicap.ts` and `ScoringEvent` from `src/games/events.ts`.

`match_play.ts` is stateful at the `MatchState` level — threaded by `aggregate.ts`. The per-hole settle function is pure.

For non-singles formats, the UI must supply `state.teamGross` and (if `appliesHandicap`) `state.teamStrokes` keyed by a stable side identifier. `teamCourseHandicap` is defined in `src/games/handicap.ts` and implements the 50%-combined rule for alternate-shot / foursomes.

No floating-point arithmetic occurs in Match Play settlement. The 50% team handicap for alternate-shot uses integer division on `(partner1Hcp + partner2Hcp)`; odd sums round up per USGA convention.

## 12. Test Cases

### Test 1 — Worked example (verbatim from section 10)

`singles`, 18 holes, handicap applied, Bob receives 5 strokes on holes 2, 4, 7, 12, 16. Gross scores per the hole-by-hole table.

Assert:
- `MatchClosedOut` event emitted after hole 14 with `holesUp = 6` (absolute), `holesRemaining = 4`, winner = Bob.
- Deltas = `{ A: −1, B: +1 }`.
- Σ delta = 0.
- Every delta satisfies `Number.isInteger`.
- Holes 15–18 produce no `HoleResolved` events.
- Exactly 6 `HoleHalved` events, on holes 2, 5, 7, 10, 13, and 14.

### Test 2 — Halved match

Setup: 18-hole singles, `tieRule = 'halved'`; after hole 18, `holesUp === 0`. Assert: `MatchHalved` event, deltas = `{ A: 0, B: 0 }`, Σ delta = 0.

### Test 3 — Four-ball (best-ball) team win

Setup: 4 players in teams (A,B) vs (C,D), `format = 'best-ball'`, stake 100. A team (A,B) wins 3 & 2 at hole 16. Assert:
- Team delta = `{ teamAB: +100, teamCD: −100 }`.
- Per-player delta: A +50, B +50, C −50, D −50.
- Σ delta = 0.

### Test 4 — Alternate-shot team handicap

Setup: teams (A hcp 4, B hcp 8) vs (C hcp 6, D hcp 10). Team handicaps: AB = ceil((4+8)/2) = 6; CD = ceil((6+10)/2) = 8. CD receives 2 strokes on indices 1 and 2. Assert `teamCourseHandicap` returns `{ AB: 6, CD: 8 }` and stroke allocation matches USGA.

### Test 5 — Conceded match

Setup: 18-hole singles, B concedes after hole 10 while 3 down. Assert: `ConcessionRecorded` event with `unit: 'match'`, `actor = B`; deltas = `{ A: +1, B: −1 }`; holes 11–18 do not score; Σ delta = 0.
