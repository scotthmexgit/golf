---
prompt_id: "013"
timestamp: "2026-04-22T18:17:17Z"
checklist_item_ref: "#6 — Match Play engine (rule-doc gap resolution)"
tags: [match-play, rule-doc, gap-resolution, documenter]
---

# 013 — Match Play gap resolution (all 10 gaps)

## Task

Resolve 10 rule-doc gaps in `docs/games/game_match_play.md`: 5 blocking (implementation-stops) and 5 formula/contract (inline-resolvable). Single documenter pass.

## Evidence gathered

### Gap 5 evidence gate — HoleState.hole type

`src/games/types.ts` line 160:
```ts
export interface HoleState {
  hole: number
```
Plain `number` — no `HoleNumber` type alias, no upper-bound constraint. Finding: extra holes are holes 19, 20, etc.

### Gap 1 + ExtraHoleResolved evidence gate

`src/games/events.ts` lines 178–182:
```ts
type ExtraHoleResolved = EventBase & WithPoints & WithBet & {
  kind: 'ExtraHoleResolved'
  hole: number
  extraHoleIndex: number
}
```
`WithPoints = { points: Record<PlayerId, number> }`. Field confirmed. Also: `extraHoleIndex` is already on the event type (1-based index), consistent with Gap 5 resolution.

### Gap 9 evidence gate — quoted existing text

§ 5 relevant text (original file lines 67–72): `holeWinner` pseudocode for `best-ball` uses `Math.min(...side.map(pid => state.gross[pid] - strokesOnHole(...)))` — naturally handles partial availability.

§ 9 relevant text (original file line 137): "the team with a missing scorecard entry forfeits that hole. Emit `HoleForfeited`." — format-agnostic, underspecified for best-ball partial miss.

## Stop-and-report checks

All 10 gaps reviewed for cross-section contradictions. No stop-and-report triggered:

- Gap 9: existing § 9 "team forfeits" text is underspecified for best-ball partial miss, not contradictory. Gap 9 adds a format-specific clarification consistent with § 5's `Math.min` semantics.
- Gap 1 vs § 6: existing § 6 doesn't specify `points` content; gap adds the contract. No contradiction.
- Gap 6 vs § 6: existing text says "revert to halved" but doesn't name the terminal event. Gap adds `MatchHalved` as the explicit terminal. No contradiction.
- All other gaps: additive clarifications, no existing text contradicted.

## Gaps resolved

All 10 gaps resolved in `docs/games/game_match_play.md`. One edit per gap, each clearly marked with a `<!-- Gap N resolved -->` comment.

| Gap | Location | Resolution summary |
|-----|----------|--------------------|
| 1 | § 6 | `ExtraHoleResolved.points` contract: full stake when won, `{}` when halved; halved tracking events carry no delta |
| 2 | § 2 | `teamCourseHandicap = Math.ceil((hcp1+hcp2)/2)` with worked example 4+9=7 |
| 3 | § 9 | 1-player team after `TeamSizeReduced`: `teamCourseHandicap` returns individual handicap directly |
| 4 | § 7 | Concession-closeout ordering: `ConcessionRecorded` first, `MatchClosedOut` second, same call |
| 5 | § 6 | `HoleState.hole: number` (no upper bound) → extra holes are 19, 20, …; `ExtraHoleResolved.extraHoleIndex` is 1-based index on event |
| 6 | § 6 | Cap-exhausted terminal event is `MatchHalved`; no `ExtraHoleResolved` for cap-exhausted hole |
| 7 | § 8 | `RoundingAdjustment` absorbing player = lowest `playerId` lexicographically in remainder team |
| 9 | § 5 | Best-ball partial miss: use available partner's score; forfeit only when ALL members missing |
| 10 | § 4 | `teams` validation: length 2, each team length 2, all IDs in playerIds, no duplicates; fail → `MatchConfigInvalid` |

(Gap 8 not in scope — no Gap 8 in the original 10-gap list.)

## Files changed

- `docs/games/game_match_play.md` — 10 gap resolutions added
