# Game: Wolf

Link: `.claude/skills/golf-betting-rules/SKILL.md` · Scoring file: `src/games/wolf.ts`

## 1. Overview

Wolf rotates a captain role hole-by-hole. The captain tees off first, then chooses a partner after each other player's tee shot or declines every partner to play Lone Wolf at a higher multiplier. The winning side of each hole collects integer-unit payouts from the losing side. This file specifies Wolf for 4 or 5 players; `src/games/wolf.ts` is the authority on behavior.

## 2. Players & Teams

Minimum 4, maximum 5. Teams form per hole.

- **4-player Wolf.** Captain plus one partner versus the remaining two. Lone Wolf is 1 vs 3.
- **5-player Wolf.** Captain plus one partner versus the remaining three (a 2-vs-3 team match). Lone Wolf is 1 vs 4.

Handicap strokes apply per player per hole via `strokesOnHole(strokes, holeIndex)` in `src/games/handicap.ts`. Team score on a hole is the lower net score among teammates (best-ball).

## 3. Unit of Wager

Stake is 1 integer unit per cross-team pair per hole (default 100 minor units). A 2-vs-2 hole produces four cross-pairs; a 2-vs-3 hole produces six; a 1-vs-3 or 1-vs-4 Lone Wolf hole produces three or four cross-pairs.

Multipliers:
- `loneMultiplier` — applied to every Lone Wolf cross-pair. Default **3**.
- `blindLoneMultiplier` — applied when the captain declares Lone before any other player tees. Default **4**. Enabled only when `blindLoneEnabled === true`.

## 4. Setup

```ts
interface WolfConfig {
  stake: number                    // integer minor units, default 100, min 1
  loneMultiplier: number           // default 3, integer, min 2
  blindLoneEnabled: boolean        // default false
  blindLoneMultiplier: number      // default 4, integer, min 3
  playerIds: PlayerId[]            // length 4 or 5
  appliesHandicap: boolean         // default true
  junkItems: JunkKind[]            // default [] — Junk awards this bet declares in-play; see docs/games/game_junk.md
  junkMultiplier: number           // positive integer, default 1; applies to every event in junkItems
}
```

Captain rotation follows `RoundConfig.players[]` order as locked at `RoundConfigLocked` time. Captain for hole `h` is `players[(h - 1) mod players.length]` on every hole — no special case for holes 17–18. For 4 players the cycle is `players[0..3]` repeated four times plus `players[0..1]`; for 5 players it is `players[0..4]` three times plus `players[0..2]`.

## 5. Per-Hole Scoring

```ts
import { strokesOnHole } from './handicap'
import type { HoleState, RoundConfig, ScoringEvent } from './types'

type WolfDecision =
  | { kind: 'partner'; captain: PlayerId; partner: PlayerId }
  | { kind: 'lone'; captain: PlayerId; blind: boolean }

// Matches src/games/wolf.ts. `decision === null` emits WolfDecisionMissing
// per § 9; `roundCfg` is required for bet-id lookup.
function settleWolfHole(
  state: HoleState,
  cfg: WolfConfig,
  roundCfg: RoundConfig,
  decision: WolfDecision | null,
): ScoringEvent[] {
  // pseudocode body below uses `cfg` + `decision` + `state` the same way as
  // the implementation. roundCfg carries the BetId via reference-identity
  // lookup against roundCfg.bets[i].config.
  const net = (pid: PlayerId) => cfg.appliesHandicap
    ? state.gross[pid] - strokesOnHole(state.strokes[pid], state.holeIndex)
    : state.gross[pid]

  const all = cfg.playerIds
  let side: PlayerId[], opp: PlayerId[], multiplier: number

  if (decision.kind === 'partner') {
    side = [decision.captain, decision.partner]
    opp = all.filter(p => !side.includes(p))
    multiplier = 1
  } else {
    side = [decision.captain]
    opp = all.filter(p => p !== decision.captain)
    multiplier = decision.blind ? cfg.blindLoneMultiplier : cfg.loneMultiplier
  }

  const sideBest = Math.min(...side.map(net))
  const oppBest  = Math.min(...opp.map(net))

  if (sideBest === oppBest) return resolveTiedHole(state, cfg, decision)

  const winners = sideBest < oppBest ? side : opp
  const losers  = sideBest < oppBest ? opp  : side
  const unit = cfg.stake * multiplier

  const delta: SettlementDelta = Object.fromEntries(all.map(p => [p, 0]))
  for (const w of winners) for (const l of losers) {
    delta[w] += unit
    delta[l] -= unit
  }

  const kind: ScoringEvent['kind'] = decision.kind === 'lone'
    ? (decision.blind ? 'BlindLoneResolved' : 'LoneWolfResolved')
    : 'WolfHoleResolved'

  return [{ kind, hole: state.hole, actor: decision.captain,
            timestamp: state.timestamp, declaringBet, winners, losers, points }]
}

// Captain-for-hole helper. Exposed for the UI's "who's the wolf?" indicator
// and for end-of-round aggregation.
function applyWolfCaptainRotation(
  hole: number,
  cfg: WolfConfig,
  roundCfg: RoundConfig,
  eventsSoFar?: ScoringEvent[],   // reserved for future withdrawal support
                                  //   (see Decision 5 in Round 5; deferred)
): { captain: PlayerId; events: ScoringEvent[] } {
  const players = roundCfg.players.map(p => p.id)
  const captain = players[(hole - 1) % players.length]
  // eventsSoFar is unused today. When player withdrawal lands, this helper
  // will read PlayerWithdrew events from eventsSoFar and shift the rotation
  // captain to the next non-withdrawn player, emitting WolfCaptainReassigned.
  return { captain, events: [] }
}
```

`resolveTiedHole` is specified in section 6.

## 6. Tie Handling

Wolf supports two tie modes. Final-hole tie is not special-cased — the configured mode applies to every hole.

| `tieRule` | Tied hole behavior |
|---|---|
| `no-points` *(default)* | Hole is voided. Every player's delta is 0 for the hole. Emit `WolfHoleTied`. |
| `carryover` | The hole's stake-per-cross-pair doubles on the next hole. If the next hole also ties, the multiplier compounds. Emit `WolfCarryApplied` with the multiplier when the carry resolves. |

`tieRule` is a field on `WolfConfig` (defaults to `no-points`). `carryover` does not compose with `loneMultiplier` — the larger of the two applies to the carried hole, not the product.

## 7. Press & Variants

Wolf has no press mechanic. Variants:

- **Lone Wolf** (core). Captain declines every partner offer. Multiplier `loneMultiplier`. The captain's declaration must occur before the last non-captain tees; after that, the hole resolves as 2-vs-N with the last declined player as partner. This is a betting-game convention — the scoring function accepts the final `Decision` from the UI and does not enforce timing.
- **Blind Lone.** Captain declares Lone before any other player tees. Multiplier `blindLoneMultiplier`. Requires `cfg.blindLoneEnabled === true` and an explicit `BlindLoneDeclared` event whose `actor` is the captain. Unconfirmed declarations default to standard play.
- **5-player 2-vs-3.** No rule change — section 5 handles any `|side|` and `|opp|` as long as `side ∪ opp === playerIds`.

Every press-like decision (Lone, Blind Lone, partner pick) requires a confirmed UI action. Only Blind Lone emits a separate declaration event (`BlindLoneDeclared`) before the hole resolves; partner picks and regular Lone declarations are captured as the `actor` field of the resolution event (`WolfHoleResolved` or `LoneWolfResolved`). No auto-declaration. A future `PlayerDecision` mechanism (design round deferred) may promote partner and Lone declarations to standalone pre-resolution events.

Every Junk item in `junkItems` pays out at `points × stake × junkMultiplier` for this bet; see `docs/games/game_junk.md` for the points formula.

### Deferred variants

- **Comeback Multiplier.** On the final hole, the player with the worst running total may declare a multiplier `2×` through `4×` applied to that hole's payout. Subject to the `PlayerDecision` mechanism design; **not implemented in v1**.

## 8. End-of-Round Settlement

Per-hole deltas sum directly into the round total. No per-round multiplier. Aggregation runs through `src/games/aggregate.ts`. Zero-sum holds on every settled hole, therefore at round end.

Integer divisibility: every delta is produced by integer multiplication (`stake * multiplier`). No division occurs in Wolf settlement, so `RoundingAdjustment` is not emitted by this game.

## 9. Edge Cases

- **Missing decision** — if no `Decision` is recorded by the time the last player holes out, emit `WolfDecisionMissing` with `actor = captain`, zero delta. The UI must block end-of-round close until every hole has a decision.
- **Missing score** — any player with `gross[pid] <= 0` invalidates the hole. Emit `WolfHoleInvalid`, zero delta.
- **Captain withdraws** — the captain for that hole shifts to the next non-withdrawn player in `RoundConfig.players[]` order, wrapping around. Emit `WolfCaptainReassigned`. Player-withdrawal flow is deferred; see Round 5 product decisions.
- **Tie on Lone Wolf hole** — resolves under `tieRule`; the Lone captain does not automatically win.
- **5-player Lone** — 1 vs 4. `multiplier` still applies per cross-pair; wolf collects or pays `4 × stake × multiplier` total. Default Lone at 5 players: `4 × 100 × 3 = 1200` minor units.

`WolfCaptainTiebreak` is reserved for future captain-selection rules that may require a money-based or other tiebreak. Under generic rotation it is not emitted.

## 10. Worked Example

Four players — Alice, Bob, Carol, Dave. Stake = 1 unit per cross-pair. `loneMultiplier = 3`. `blindLoneEnabled = false`. `appliesHandicap = false`. `RoundConfig.players[]` order at `RoundConfigLocked` time: A, B, C, D.

Captain rotation cycles A→B→C→D on every hole. Holes 1–16 cover four full cycles; hole 17 → A, hole 18 → B.

| H | Par | Cap | Decision | A | B | C | D | Side best | Opp best | Winners | ΔA | ΔB | ΔC | ΔD |
|---:|:-:|:-:|---|:-:|:-:|:-:|:-:|:-:|:-:|---|:-:|:-:|:-:|:-:|
| 1 | 4 | A | partner B | 4 | 5 | 5 | 5 | 4 | 5 | A,B | +2 | +2 | −2 | −2 |
| 2 | 4 | B | partner A | 4 | 4 | 5 | 5 | 4 | 5 | A,B | +2 | +2 | −2 | −2 |
| 3 | 3 | C | partner D | 4 | 4 | 3 | 3 | 3 | 4 | C,D | −2 | −2 | +2 | +2 |
| 4 | 5 | D | partner C | 6 | 6 | 5 | 5 | 5 | 6 | C,D | −2 | −2 | +2 | +2 |
| 5 | 4 | A | Lone (3×) | 3 | 4 | 4 | 4 | 3 | 4 | A | +9 | −3 | −3 | −3 |
| 6 | 3 | B | partner A | 3 | 3 | 4 | 4 | 3 | 4 | A,B | +2 | +2 | −2 | −2 |
| 7 | 4 | C | partner A | 4 | 5 | 4 | 5 | 4 | 5 | A,C | +2 | −2 | +2 | −2 |
| 8 | 5 | D | partner B | 5 | 4 | 5 | 4 | 4 | 5 | B,D | −2 | +2 | −2 | +2 |
| 9 | 4 | A | partner C | 4 | 5 | 4 | 5 | 4 | 5 | A,C | +2 | −2 | +2 | −2 |
| 10 | 4 | B | Lone (3×) | 4 | 5 | 4 | 4 | 5 | 4 | A,C,D | +3 | −9 | +3 | +3 |
| 11 | 3 | C | partner A | 3 | 4 | 3 | 4 | 3 | 4 | A,C | +2 | −2 | +2 | −2 |
| 12 | 5 | D | partner B | 6 | 5 | 6 | 5 | 5 | 6 | B,D | −2 | +2 | −2 | +2 |
| 13 | 4 | A | partner B | 4 | 4 | 5 | 5 | 4 | 5 | A,B | +2 | +2 | −2 | −2 |
| 14 | 4 | B | partner A | 4 | 4 | 5 | 5 | 4 | 5 | A,B | +2 | +2 | −2 | −2 |
| 15 | 3 | C | partner D | 4 | 4 | 3 | 3 | 3 | 4 | C,D | −2 | −2 | +2 | +2 |
| 16 | 4 | D | partner C | 5 | 5 | 4 | 4 | 4 | 5 | C,D | −2 | −2 | +2 | +2 |

Money after hole 16: **A = +16, B = −12, C = 0, D = −4.**

Under generic rotation: hole 17 captain = A, hole 18 captain = B.

| H | Par | Cap | Decision | A | B | C | D | Side best | Opp best | Winners | ΔA | ΔB | ΔC | ΔD |
|---:|:-:|:-:|---|:-:|:-:|:-:|:-:|:-:|:-:|---|:-:|:-:|:-:|:-:|
| 17 | 5 | A | partner B | 5 | 5 | 6 | 6 | 5 | 6 | A,B | +2 | +2 | −2 | −2 |
| 18 | 4 | B | Lone (3×) | 4 | 4 | 4 | 3 | 3 | 4 | D | +3 | −9 | +3 | +3 |

On hole 18 captain B goes Lone with a gross of 4. D shoots gross 3 and the opposition side's best beats B's 4, so B loses to each of A, C, D at `stake × 3 = 3` per cross-pair. B pays 3 to each opponent; each opponent collects 3 from B.

Round totals: **A = +21, B = −19, C = +1, D = −3.**

Σ delta = 21 − 19 + 1 − 3 = **0**.

## 11. Implementation Notes

Scoring file: `src/games/wolf.ts`. Emitted events: `WolfHoleResolved`, `LoneWolfResolved`, `BlindLoneResolved`, `BlindLoneDeclared`, `WolfHoleTied`, `WolfCarryApplied`, `WolfDecisionMissing`, `WolfHoleInvalid`, `WolfCaptainReassigned`, `WolfCaptainTiebreak`. Imports `strokesOnHole` from `src/games/handicap.ts` and `ScoringEvent` from `src/games/events.ts`.

Captain for every hole is `players[(hole - 1) mod players.length]` where `players` is `RoundConfig.players` at `RoundConfigLocked` time. `src/games/aggregate.ts` calls `applyWolfCaptainRotation` once per hole. `src/games/wolf.ts` itself remains stateless and accepts the resolved captain as part of the input `HoleState`.

No floating-point arithmetic occurs in Wolf settlement.

## 12. Test Cases

### Test 1 — Worked example (verbatim from section 10)

Four players, stake 1, `loneMultiplier = 3`, `blindLoneEnabled = false`, generic rotation, gross scoring. Assert:

- Round totals = `{ A: +21, B: −19, C: +1, D: −3 }`.
- Σ delta = 0.
- Every per-hole delta satisfies `Number.isInteger`.
- Hole-17 captain is A, hole-18 captain is B, determined by generic rotation from `RoundConfig.players[]`.
- One `LoneWolfResolved` event on hole 5 (captain A, +9 / −3 / −3 / −3).
- One `LoneWolfResolved` event on hole 10 (captain B, −9 / +3 / +3 / +3).
- One `LoneWolfResolved` event on hole 18 (captain B, −9 / +3 / +3 / +3).

### Test 2 — Blind Lone

Setup: same 4 players, `blindLoneEnabled = true`, `blindLoneMultiplier = 4`. Hole 1 only. A captain declares Blind Lone before B tees. Scores: A = 3, B = 4, C = 4, D = 4.

Assert: deltas = `{ A: +12, B: −4, C: −4, D: −4 }`. One `BlindLoneDeclared` event with `actor = A`. One `BlindLoneResolved` event. Σ delta = 0.

### Test 3 — 5-player Lone Wolf

Setup: 5 players, stake 1, `loneMultiplier = 3`. Captain A goes Lone. A = 3; B, C, D, E all = 4.

Assert: deltas = `{ A: +12, B: −3, C: −3, D: −3, E: −3 }`. Σ delta = 0.

### Test 4 — Tied Lone Wolf hole under `tieRule = 'no-points'`

Setup: A captain Lone, all five players net 4. Assert: every delta = 0. One `WolfHoleTied` event.

### Test 5 — Missing decision

Setup: hole 7, captain C, no `Decision` recorded. Assert: every delta = 0. One `WolfDecisionMissing` event with `actor = C`. End-of-round aggregation refuses to close.

### Test 6 — Captain tiebreak on hole 17

Setup: after hole 16, B and D are tied for lowest money. `playerIds` order = `[A, B, C, D]`. Assert: hole-17 captain = B (lowest `playerIds[i]`). One `WolfCaptainTiebreak` event.
