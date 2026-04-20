# Game: Nassau

Link: `.claude/skills/golf-betting-rules/SKILL.md` · Scoring file: `src/games/nassau.ts`

## 1. Overview

Nassau is three head-to-head matches inside one round: front 9, back 9, and overall 18 holes. Each match is worth one stake unit. When a player falls behind by the configured threshold, that player can open a press — a new side match running under `pressScope` over the remaining holes of the parent match. Every press requires the pressing player's explicit confirmation. This file specifies 2-player Nassau; team Nassau is a planned variant under `pairingMode = 'teams'`. `src/games/nassau.ts` is the authority on behavior.

## 2. Players & Teams

Default: 2 players, head-to-head (`pairingMode = 'singles'`). The field may be 3–5 players in `pairingMode = 'allPairs'`, in which case every distinct pair runs its own three-match Nassau and deltas aggregate across pairs. Team mode (`pairingMode = 'teams'`, 2-on-2 best-ball-net) is not implemented in this file — flag to `team-lead` if a user requests it.

Handicap strokes apply via `strokesOnHole(strokes, holeIndex)` in `src/games/handicap.ts` when `appliesHandicap === true`. USGA allocation places the lowest-handicap player at 0 strokes and every opponent receives the difference in course handicap against them.

## 3. Unit of Wager

Stake is 1 integer unit per match (default 100 minor units). A Nassau round has three base matches (front, back, overall). Each confirmed press adds one additional match scoped per `pressScope`.

Multipliers: none.

## 4. Setup

```ts
interface NassauConfig {
  stake: number                    // integer minor units, default 100, min 1
  pressRule: 'manual' | 'auto-2-down' | 'auto-1-down'
                                   // default 'manual'
  pressScope: 'nine' | 'match'     // default 'nine'
  appliesHandicap: boolean         // default true
  pairingMode: 'singles' | 'allPairs'
                                   // default 'singles'
  playerIds: PlayerId[]            // length 2..5
  junkItems: JunkKind[]            // default [] — Junk awards this bet declares in-play; see docs/games/game_junk.md
  junkMultiplier: number           // positive integer, default 1; applies to every event in junkItems
}
```

- `pressRule === 'manual'`: the down player may open a press on any hole after falling behind. The UI must display a confirmation dialog and record the acting player.
- `pressRule === 'auto-2-down'`: when the down player is exactly 2 down, the UI prompts that player to confirm; no press opens without confirmation.
- `pressRule === 'auto-1-down'`: same prompt behavior at 1 down.

`pressScope === 'nine'`: a press runs from the hole after confirmation through the last hole of the current 9-hole leg (hole 9 for a front-9 press, hole 18 for a back-9 press). A press on the overall match runs to hole 18.

`pressScope === 'match'`: a press runs to the end of the parent match. For the front-9 match this is hole 9; for the back-9 match this is hole 18; for the overall 18-hole match this is hole 18.

## 5. Per-Hole Scoring

```ts
import { strokesOnHole } from './handicap'
import type { HoleState, SettlementDelta, ScoringEvent } from './types'

interface MatchState {
  id: string                      // 'front' | 'back' | 'overall' | 'press-<n>'
  startHole: number
  endHole: number
  holesWonA: number
  holesWonB: number
  parentId: string | null         // for presses
}

function holeResult(
  state: HoleState, cfg: NassauConfig, a: PlayerId, b: PlayerId,
): 'A' | 'B' | 'tie' {
  const na = cfg.appliesHandicap
    ? state.gross[a] - strokesOnHole(state.strokes[a], state.holeIndex)
    : state.gross[a]
  const nb = cfg.appliesHandicap
    ? state.gross[b] - strokesOnHole(state.strokes[b], state.holeIndex)
    : state.gross[b]
  if (na < nb) return 'A'
  if (nb < na) return 'B'
  return 'tie'
}

function applyHoleToMatch(match: MatchState, winner: 'A' | 'B' | 'tie'): MatchState {
  if (winner === 'A') return { ...match, holesWonA: match.holesWonA + 1 }
  if (winner === 'B') return { ...match, holesWonB: match.holesWonB + 1 }
  return match
}
```

`src/games/nassau.ts` tracks one active `MatchState` per match (front, back, overall) plus every confirmed press. On each hole, every active match whose `startHole..endHole` window covers the hole updates via `applyHoleToMatch`. The hole produces no per-hole delta; deltas settle when a match reaches its `endHole` or closes out.

Press opening:

```ts
function offerPress(
  hole: number,
  parent: MatchState,
  cfg: NassauConfig,
  downPlayer: PlayerId,
): ScoringEvent | null {
  const downBy = parent.holesWonA > parent.holesWonB
    ? { down: 'B', by: parent.holesWonA - parent.holesWonB }
    : { down: 'A', by: parent.holesWonB - parent.holesWonA }

  if (cfg.pressRule === 'auto-2-down' && downBy.by !== 2) return null
  if (cfg.pressRule === 'auto-1-down' && downBy.by !== 1) return null
  // manual: always allowed after the down player confirms

  return { kind: 'PressOffered', hole, actor: downPlayer, timestamp: now(), delta: zero() }
}
```

A `PressOpened` event is emitted only after the UI returns a confirmed action from the down player. No press opens from the scoring function alone.

## 6. Tie Handling

A tied hole contributes 0 to either player's hole count and advances the match to the next hole. A match that ends tied (`holesWonA === holesWonB` at `endHole`) produces a delta of 0 for that match under the default `tieRule = 'split'` — which, with zero units at stake in a tied Nassau match, is a 0 delta. A `MatchTied` event is emitted.

Nassau does not use `carryover` at the match level. A tied match emits `MatchTied` with zero delta. Disagreement on a halved Nassau match escalates to the Final Adjustment screen per `docs/games/_FINAL_ADJUSTMENT.md`; the app never plays extra holes beyond hole 18.

## 7. Press & Variants

Press rules: see section 4 (`pressRule`, `pressScope`).

Every press produces its own independent `MatchState`. Presses compose: a press can itself be pressed under the same rules, producing `press-2`, `press-3`, etc. The scoring function does not cap press depth; the UI may.

Variants:

- **`pressRule = 'auto-2-down'` with `pressScope = 'match'`** — classic "automatic 2-down press to the end."
- **Team Nassau** — `pairingMode = 'teams'`; 2-on-2 best-ball-net. Not implemented in this file.

`PressOffered` and `PressOpened` events are required for every press. A press with a missing `PressOpened` but a non-zero delta is a correctness bug — reviewer must block.

Every Junk item in `junkItems` pays out at `points × stake × junkMultiplier` for this bet; see `docs/games/game_junk.md` for the points formula.

## 8. End-of-Round Settlement

For every `MatchState` at round end:

- `holesWonA > holesWonB` → delta `{ A: +stake, B: −stake }` for that match.
- `holesWonB > holesWonA` → delta `{ A: −stake, B: +stake }`.
- equal → delta `{ A: 0, B: 0 }` under `matchTieRule = 'split'`.

Round total is the sum across front, back, overall, and every confirmed press. Zero-sum holds by construction — every match is an equal-and-opposite two-player delta.

Closeout: a match closes out when `|holesWonA − holesWonB| > (endHole − currentHole)`. Remaining holes of that match do not score. The closed-out delta is the same as end-of-match settlement.

## 9. Edge Cases

- **Missing score** — that player forfeits the hole (hole counts to the opponent). Emit `NassauHoleForfeited`.
- **Player withdraws mid-round** — every match in flight immediately settles in favor of the opposing player by the current `holesWonX` lead; remaining holes do not score. Emit `NassauWithdrawalSettled`.
- **Press opened on the last hole of its window** — the press has zero holes to play and ties immediately. Emit `PressVoided` and zero delta.
- **Tied match at end** — emit `MatchTied`, zero delta, under default `matchTieRule`.
- **Closeout** — emit `MatchClosedOut` with the hole number and the `holesUp`/`holesRemaining` reason.
- **`allPairs` mode with odd field** — every distinct pair generates its own triple of matches; deltas sum across pairs. Missing scores propagate per-pair.

## 10. Worked Example

Two players — Alice (scratch) and Bob (course handicap 5). Course indices from Shadow Hills. Stake = 1 unit per match. `pressRule = 'auto-2-down'`. `pressScope = 'nine'`. `appliesHandicap = true`. Bob receives 1 stroke on each of holes 2, 4, 7, 12, 16 (the five lowest-index holes).

### Front 9

| H | Par | Idx | A gross | B gross | B stroke | A net | B net | Winner | Front A | Front B | Overall A | Overall B |
|---:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 1 | 4 | 7 | 5 | 4 | — | 5 | 4 | B | 0 | 1 | 0 | 1 |
| 2 | 4 | 3 | 3 | 4 | +1 | 3 | 3 | tie | 0 | 1 | 0 | 1 |
| 3 | 3 | 15 | 3 | 4 | — | 3 | 4 | A | 1 | 1 | 1 | 1 |
| 4 | 5 | 1 | 5 | 5 | +1 | 5 | 4 | B | 1 | 2 | 1 | 2 |
| 5 | 4 | 11 | 4 | 5 | — | 4 | 5 | A | 2 | 2 | 2 | 2 |
| 6 | 3 | 17 | 3 | 4 | — | 3 | 4 | A | 3 | 2 | 3 | 2 |
| 7 | 4 | 5 | 5 | 4 | +1 | 5 | 3 | B | 3 | 3 | 3 | 3 |
| 8 | 5 | 9 | 5 | 6 | — | 5 | 6 | A | 4 | 3 | 4 | 3 |
| 9 | 4 | 13 | 5 | 5 | — | 5 | 5 | tie | 4 | 3 | 4 | 3 |

**Front match result:** A wins front 4–3.

### Back 9

Entering hole 10 the back match starts fresh at 0–0. The overall match stands at A 4, B 3.

| H | Par | Idx | A gross | B gross | B stroke | A net | B net | Winner | Back A | Back B | Overall A | Overall B |
|---:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 10 | 4 | 8 | 4 | 5 | — | 4 | 5 | A | 1 | 0 | 5 | 3 |
| 11 | 3 | 16 | 3 | 4 | — | 3 | 4 | A | 2 | 0 | 6 | 3 |

After hole 11 the back match is A 2-up, B is 2 down. Under `pressRule = 'auto-2-down'` the UI prompts Bob. Bob confirms a press starting hole 12 scoped to the back 9 (`pressScope = 'nine'`). A `PressOpened` event is recorded with `actor = Bob`.

| H | Par | Idx | A gross | B gross | B stroke | A net | B net | Winner | Back A | Back B | Press A | Press B | Overall A | Overall B |
|---:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 12 | 5 | 2 | 4 | 5 | +1 | 4 | 4 | tie | 2 | 0 | 0 | 0 | 6 | 3 |
| 13 | 4 | 6 | 5 | 4 | — | 5 | 4 | B | 2 | 1 | 0 | 1 | 6 | 4 |
| 14 | 4 | 12 | 5 | 4 | — | 5 | 4 | B | 2 | 2 | 0 | 2 | 6 | 5 |
| 15 | 3 | 18 | 4 | 3 | — | 4 | 3 | B | 2 | 3 | 0 | 3 | 6 | 6 |
| 16 | 4 | 4 | 3 | 5 | +1 | 3 | 4 | A | 3 | 3 | 1 | 3 | 7 | 6 |
| 17 | 5 | 10 | 5 | 6 | — | 5 | 6 | A | 4 | 3 | 2 | 3 | 8 | 6 |
| 18 | 4 | 14 | 4 | 4 | — | 4 | 4 | tie | 4 | 3 | 2 | 3 | 8 | 6 |

**Back match result:** A wins back 4–3.
**Press match result:** B wins press 3–2.
**Overall match result:** A wins overall 8–6.

### Settlement

| Match | Winner | ΔA | ΔB |
|---|---|:-:|:-:|
| Front | A | +1 | −1 |
| Back | A | +1 | −1 |
| Back press | B | −1 | +1 |
| Overall | A | +1 | −1 |

Round totals: **A = +2, B = −2.** Σ delta = **0**.

## 11. Implementation Notes

Scoring file: `src/games/nassau.ts`. Emitted events: `NassauHoleResolved`, `PressOffered`, `PressOpened`, `PressVoided`, `MatchClosedOut`, `MatchTied`, `NassauHoleForfeited`, `NassauWithdrawalSettled`. Imports `strokesOnHole` from `src/games/handicap.ts`; imports the `ScoringEvent` union from `src/games/events.ts`.

`src/games/nassau.ts` is stateful at the match level — it threads a `MatchState[]` through `aggregate.ts`. Per-hole state is still passed positionally; no module-level mutable storage.

USGA stroke allocation is delegated to `strokesOnHole`. Nassau does not reimplement handicap.

No floating-point arithmetic occurs in Nassau settlement.

## 12. Test Cases

### Test 1 — Worked example (verbatim from section 10)

Two players, stake 1, `pressRule = 'auto-2-down'`, `pressScope = 'nine'`, handicap applied, Bob strokes on holes 2, 4, 7, 12, 16. Assert:

- Match wins: front A 4–3, back A 4–3, back-press B 3–2, overall A 8–6.
- Round totals = `{ A: +2, B: −2 }`.
- Σ delta = 0.
- Every delta satisfies `Number.isInteger`.
- Exactly one `PressOpened` event, `actor = Bob`, `hole = 12`, parent = back match.
- Zero `PressOpened` events on the front or overall match.

### Test 2 — Manual press refused

Same setup, `pressRule = 'manual'`. Bob is 2 down after hole 11 but declines the press prompt. Assert: zero `PressOpened` events. Front and back matches settle per the gross-score table. No press match exists.

### Test 3 — Match closeout on the back 9

Setup: A wins holes 10–14 straight in the back match; A is 5 up with 4 holes to play. Assert:
- `MatchClosedOut` event with `hole = 14`, `holesUp = 5`, `holesRemaining = 4`.
- Back match delta settles immediately: `{ A: +1, B: −1 }`.
- Holes 15–18 of the back match do not score (overall match continues).

### Test 4 — Tied overall match

Setup: after 18 holes, `overall.holesWonA === overall.holesWonB`. Assert:
- `MatchTied` event on the overall match, zero delta from that match.
- Front and back deltas still apply.
- Zero-sum holds.

### Test 5 — `allPairs` mode with 3 players

Setup: 3 players (A, B, C), `pairingMode = 'allPairs'`, stake 1, manual press. Three Nassau triples run: (A,B), (A,C), (B,C). Assert:
- Nine matches total (front/back/overall per pair).
- Σ delta across all three players = 0.
- Every pair's front+back+overall is zero-sum within that pair.

### Test 6 — Withdrawal mid-round

Setup: Bob withdraws after hole 13 with front match settled (A up 1) and back match standing A 3, B 0. Assert:
- Front delta = `{ A: +1, B: −1 }` (already settled).
- `NassauWithdrawalSettled` event; back delta = `{ A: +1, B: −1 }`; overall delta = `{ A: +1, B: −1 }` since A was ahead at withdrawal.
- Holes 14–18 do not score.
- Σ delta = 0.
