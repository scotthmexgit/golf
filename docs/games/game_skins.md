# Game: Skins

Link: `.claude/skills/golf-betting-rules/SKILL.md` · Scoring file: `src/games/skins.ts`

## 1. Overview

Skins awards one skin per hole to the player with the lowest net score on that hole. A tied hole carries the skin to the next hole. The final hole's carry resolves under the configured `tieRule`. This file specifies Skins for 2–5 players; `src/games/skins.ts` is the authority on behavior.

## 2. Players & Teams

Minimum 2 players, maximum 5. No teams. Every player plays for themselves. Handicap strokes apply per hole via `strokesOnHole(strokes, holeIndex)` in `src/games/handicap.ts`.

## 3. Unit of Wager

Stake is one integer unit per skin (default 100 minor units). One hole is worth one skin; carried holes add one stake per carried hole to the next decisive hole's pot. Multipliers: none. No press mechanics.

## 4. Setup

```ts
interface SkinsConfig {
  stake: number                  // integer minor units, default 100, min 1
  escalating: boolean            // default true — carried hole's stake adds to pot; false = flat 1-skin pot
  tieRuleFinalHole: 'carryover' | 'split' | 'no-points'
                                 // default 'split'
  appliesHandicap: boolean       // default true — uses net; false = gross
  playerIds: PlayerId[]          // length 2..5
  junkItems: JunkKind[]          // default [] — Junk awards this bet declares in-play; see docs/games/game_junk.md
  junkMultiplier: number         // positive integer, default 1; applies to every event in junkItems
}
```

`tieRuleFinalHole` governs only the last scoring hole of the round (hole 18 for a full round, hole 9 for a front-9 game). Every earlier tie always carries.

## 5. Per-Hole Scoring

Skins uses a two-phase provisional-then-rewrite pattern. `settleSkinsHole` runs once per hole and emits events under the assumption that no carry exists; `finalizeSkinsRound` walks the full event stream at round end and scales every SkinWon event's points by the integer carry multiplier `(1 + carryStake / stake)`. This keeps the per-hole function stateless and preserves per-event zero-sum. Reference implementation: `src/games/skins.ts`.

### Phase 1 — `settleSkinsHole`

```ts
import { strokesOnHole } from './handicap'
import type { HoleState, RoundConfig, ScoringEvent, SkinsCfg } from './types'

export function settleSkinsHole(
  hole: HoleState,
  config: SkinsCfg,
  roundCfg: RoundConfig,
): ScoringEvent[] {
  const declaringBet = findBetId(config, roundCfg)  // identity match against roundCfg.bets

  // Missing-score exclusion per section 9. gross <= 0 or undefined drops
  // the player from this hole's competition; their delta stays zero.
  const contenders = config.playerIds.filter(pid => (hole.gross[pid] ?? 0) > 0)
  if (contenders.length < 2) {
    return [{ kind: 'FieldTooSmall', hole: hole.hole, actor: 'system',
              timestamp: hole.timestamp, declaringBet }]
  }

  const nets = contenders.map(pid => ({
    pid,
    net: config.appliesHandicap
      ? hole.gross[pid] - strokesOnHole(hole.strokes[pid], hole.holeIndex)
      : hole.gross[pid],
  }))
  const best = Math.min(...nets.map(n => n.net))
  const winners = nets.filter(n => n.net === best).map(n => n.pid)

  if (winners.length === 1) {
    // Provisional SkinWon: points use stake-only math. finalizeSkinsRound
    // scales these by the carry multiplier.
    const winner = winners[0]
    const losers = contenders.filter(p => p !== winner)
    const points = zeroPoints(config.playerIds)
    points[winner] = config.stake * losers.length
    for (const l of losers) points[l] = -config.stake
    return [{ kind: 'SkinWon', hole: hole.hole, actor: 'system',
              timestamp: hole.timestamp, declaringBet, winner, points }]
  }

  // Tied hole.
  if (!config.escalating) {
    return [{ kind: 'SkinVoid', hole: hole.hole, actor: 'system',
              timestamp: hole.timestamp, declaringBet }]
  }
  return [{ kind: 'SkinCarried', hole: hole.hole, actor: 'system',
            timestamp: hole.timestamp, declaringBet,
            carryPoints: config.stake, contenders, tiedPlayers: winners }]
}
```

### Phase 2 — `finalizeSkinsRound`

```ts
export function finalizeSkinsRound(
  events: ScoringEvent[],
  config: SkinsCfg,
): ScoringEvent[] {
  // Partition Skins-owned events by declaringBet; group in hole order.
  // For each bet, accumulate carryStake (integer multiple of config.stake),
  // rewrite SkinWon events by scaling their points by (1 + carryStake / stake),
  // and resolve the final hole's SkinCarried under config.tieRuleFinalHole.
  let carryStake = 0
  for (const event of betEventsInHoleOrder) {
    if (event.kind === 'SkinWon') {
      const multiplier = 1 + carryStake / config.stake
      event.points = scaleEachPoint(event.points, multiplier)
      carryStake = 0
    } else if (event.kind === 'SkinCarried') {
      if (event.hole === finalHole) {
        resolveFinalHoleTie(event, config, carryStake)  // emits SkinWon*, SkinCarryForfeit, etc.
        carryStake = 0
      } else {
        carryStake += config.stake
      }
    }
  }
  return finalizedEvents
}
```

`resolveFinalHoleTie` dispatches on `config.tieRuleFinalHole`. Each branch is in section 6. It reads `contenders` and `tiedPlayers` from the final-hole SkinCarried event's optional payload fields, so the round-level finalizer never re-reads HoleState.

## 6. Tie Handling

Skins supports four tie modes on the final hole. Every earlier tied hole carries regardless of configuration.

| `tieRuleFinalHole` | Final-hole tie behavior |
|---|---|
| `carryover` | No payout. Carry rolls forward into a future round or is declared void. Emits `SkinCarryForfeit`. Breaks zero-sum for the round — reviewer requires explicit flag from user. |
| `split` *(default)* | Each non-tied player pays `potPerOpponent` to each tied winner. Each tied winner receives `potPerOpponent × (playerCount − winnerCount)`. No division occurs — the per-pair payment is already an integer, so no `RoundingAdjustment` is needed. If every player ties (no non-tied players remain), every delta is 0 and a `SkinCarryForfeit` event records the unpaid carry. |
| `no-points` | Hole is voided. Carry is refunded to every player as a zero delta. `SkinCarryForfeit` emitted. |

The default is `split` because it keeps the round zero-sum without extending play. Ties at hole 18 that remain unresolved under the three supported modes are handled at the Final Adjustment screen per `docs/games/_FINAL_ADJUSTMENT.md`; the app never plays extra holes.

## 7. Press & Variants

Skins has no press mechanic.

Variant: `escalating = false` flattens every hole's pot to one stake, discarding carryover. In that mode a tied hole produces a zero delta with a `SkinVoid` event and no carry state.

Every Junk item in `junkItems` pays out at `points × stake × junkMultiplier` for this bet; see `docs/games/game_junk.md` for the points formula.

## 8. End-of-Round Settlement

Per-hole deltas sum directly into the round total. No per-round multiplier. `src/games/aggregate.ts` produces the round's `PayoutMap` by summing the `delta` field of every `SkinWon`, `RoundingAdjustment`, `SkinVoid`, and `SkinCarryForfeit` event.

Zero-sum holds on every settled hole and therefore at round end, except when `tieRuleFinalHole === 'carryover'` and the final hole ties — in that case the unpaid carry is recorded as a `SkinCarryForfeit` event and reviewer treats the break in zero-sum as intentional.

## 9. Edge Cases

- **Missing gross score** — `gross[pid]` is `undefined` or `<= 0`. The player is excluded from that hole's `nets` list. If fewer than 2 players remain, emit `FieldTooSmall` and zero-delta the hole; carry unchanged.
- **All players tie on the final hole** — resolved by `tieRuleFinalHole`. With `split`, every player ties; there are no losers; every player's delta is 0 and the carry is forfeited with a `SkinCarryForfeit` event.
- **Two players tie for best on the final hole, others worse** — under `split`, the two winners collect equal shares from the worse-scoring players.
- **Handicap strokes produce a negative net** — allowed. No floor; a net of `-1` beats a net of `0`.
- **Player withdraws mid-round** — every subsequent hole excludes that player. Prior deltas stand.
- **Field shrinks below 2 mid-round** — scoring halts; remaining holes emit `FieldTooSmall`, zero delta. Any active carry is recorded as `SkinCarryForfeit`.

## 10. Worked Example

Four players — Alice, Bob, Carol, Dave. Stake = 1 unit per skin. `escalating = true`. `tieRuleFinalHole = 'split'`. `appliesHandicap = false` (gross scoring for arithmetic clarity).

| Hole | A | B | C | D | Result | Carry in | Pot/opp | ΔA | ΔB | ΔC | ΔD |
|---:|:-:|:-:|:-:|:-:|---|:-:|:-:|:-:|:-:|:-:|:-:|
| 1 | 4 | 5 | 5 | 5 | A wins | 0 | 1 | +3 | −1 | −1 | −1 |
| 2 | 4 | 4 | 4 | 4 | all tie → carry | 0 | — | 0 | 0 | 0 | 0 |
| 3 | 4 | 4 | 4 | 4 | all tie → carry | 1 | — | 0 | 0 | 0 | 0 |
| 4 | 5 | 4 | 5 | 5 | B wins | 2 | 3 | −3 | +9 | −3 | −3 |
| 5 | 4 | 5 | 5 | 5 | A wins | 0 | 1 | +3 | −1 | −1 | −1 |
| 6 | 5 | 5 | 4 | 5 | C wins | 0 | 1 | −1 | −1 | +3 | −1 |
| 7 | 5 | 5 | 5 | 4 | D wins | 0 | 1 | −1 | −1 | −1 | +3 |
| 8 | 4 | 5 | 5 | 5 | A wins | 0 | 1 | +3 | −1 | −1 | −1 |
| 9 | 5 | 4 | 5 | 5 | B wins | 0 | 1 | −1 | +3 | −1 | −1 |
| 10 | 5 | 5 | 5 | 5 | all tie → carry | 0 | — | 0 | 0 | 0 | 0 |
| 11 | 4 | 5 | 5 | 5 | A wins | 1 | 2 | +6 | −2 | −2 | −2 |
| 12 | 5 | 4 | 5 | 5 | B wins | 0 | 1 | −1 | +3 | −1 | −1 |
| 13 | 5 | 5 | 4 | 5 | C wins | 0 | 1 | −1 | −1 | +3 | −1 |
| 14 | 5 | 5 | 5 | 4 | D wins | 0 | 1 | −1 | −1 | −1 | +3 |
| 15 | 4 | 5 | 5 | 5 | A wins | 0 | 1 | +3 | −1 | −1 | −1 |
| 16 | 4 | 4 | 5 | 5 | A,B tie → carry | 0 | — | 0 | 0 | 0 | 0 |
| 17 | 5 | 5 | 5 | 5 | all tie → carry | 1 | — | 0 | 0 | 0 | 0 |
| 18 | 4 | 4 | 5 | 5 | A,B tie; tieRule=split | 2 | 3 | +6 | +6 | −6 | −6 |

Hole 18 detail: carry in = 2. Pot per opponent = 2 + 1 = 3. Winners = {A, B}. Losers = {C, D}. Each loser pays `potPerOpponent = 3` per winner: C pays 3 to A + 3 to B = −6. D pays 3 to A + 3 to B = −6. Each winner receives 3 per loser × 2 losers = +6.

Round totals: **A = +15, B = +11, C = −13, D = −13**.

Σ delta = 15 + 11 − 13 − 13 = **0**.

## 11. Implementation Notes

Scoring file: `src/games/skins.ts`. Emitted events: `SkinWon`, `SkinCarried`, `RoundingAdjustment`, `SkinVoid`, `SkinCarryForfeit`, `FieldTooSmall`. Imports `strokesOnHole` from `src/games/handicap.ts` and the `ScoringEvent` union from `src/games/events.ts`.

**Two-phase pattern.** `settleSkinsHole(hole, config, roundCfg): ScoringEvent[]` runs once per hole and emits provisional events with stake-only point math; it never threads carry through its own signature. `finalizeSkinsRound(events, config): ScoringEvent[]` walks the full event stream at round end, accumulates `carryStake` per declaring bet, scales every `SkinWon` event's points by the integer multiplier `(1 + carryStake / stake)`, and dispatches `SkinCarried` on the final hole under `config.tieRuleFinalHole`. The per-hole function is stateless; the finalizer owns carry state. See `src/games/skins.ts` for the reference implementation.

**Payload fields.** `SkinWon` carries `{ kind, timestamp, hole, actor, declaringBet, winner, points }`. `SkinCarried` carries `{ kind, timestamp, hole, actor, declaringBet, carryPoints }` plus two optional fields populated by `settleSkinsHole` so the finalizer can resolve a final-hole tie without re-reading `HoleState`: `contenders?: PlayerId[]` (players eligible for this hole's skin after the missing-score filter) and `tiedPlayers?: PlayerId[]` (the subset of contenders sharing the best net). Non-final tied holes ignore both fields.

**Integer safety.** Every point value is produced by integer multiplication only. The carry multiplier `(1 + carryStake / stake)` is always an integer because `carryStake` is always a whole-number multiple of `stake` (each `SkinCarried` adds exactly one `stake`). The `split` branch on a tied final hole produces integer-clean per-winner payouts because each winner receives `potPerOpponent × loserCount`; any remainder from a non-standard tie mode routes through `RoundingAdjustment`.

## 12. Test Cases

### Test 1 — Worked example (verbatim from section 10)

Four players — Alice, Bob, Carol, Dave. Stake = 1 unit per skin. `escalating = true`. `tieRuleFinalHole = 'split'`. `appliesHandicap = false`.

Given the hole-by-hole table in section 10, assert:

- Round totals = `{ A: +15, B: +11, C: −13, D: −13 }`.
- `Σ delta == 0`.
- Every per-hole `delta` satisfies `Number.isInteger`.
- Exactly five `SkinCarried` events (holes 2, 3, 10, 16, 17).
- Exactly one `SkinWon` event on each of holes 1, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15.
- Hole 18 emits one `SkinWon` event per winner (A and B) with equal `delta` share.

### Test 2 — Final-hole carryover with `tieRule = 'carryover'`

Setup: same 4 players, stake 1, carry entering hole 18 = 2, all four players tie hole 18 at gross 5.

Assert:
- `delta[h18]` = `{ A: 0, B: 0, C: 0, D: 0 }`.
- One `SkinCarryForfeit` event with `carryAmount = 3` (2 carried + 1 hole-18 stake).
- Round total zero-sum holds only because no hole-18 deltas were issued; reviewer flags the break as intentional.

### Test 3 — `tieRule = 'no-points'` on final hole

Setup: two-way tie (A, B) on hole 18 with carry 2; stake 1.

Assert: `delta[h18] = { A: 0, B: 0, C: 0, D: 0 }`; one `SkinCarryForfeit`; zero-sum holds.

### Test 4 — Field of 2 players

Stake 1, all defaults, 18 holes. Assert zero-sum holds. Assert `delta[winner][hole] + delta[loser][hole] === 0` on every settled hole.

### Test 5 — Missing score mid-round

On hole 10 of a 4-player round, Carol has no recorded gross. Assert:
- Hole 10 resolves among A, B, D only.
- If A, B, D tie, carry increments; otherwise winner among the three collects from the other two only.
- Carol's delta on hole 10 is exactly 0.
