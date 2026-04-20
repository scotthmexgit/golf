# Game: Junk

Link: `.claude/skills/golf-betting-rules/SKILL.md` · Scoring file: `src/games/junk.ts`

## 1. Overview

Junk is a family of side awards — CTP, Longest Drive, Greenie, Sandy, Barkie, Polie, and Arnie — that ride on top of main bets. Each main bet opts in via a `junkItems: JunkKind[]` field on its `BetSelection` and applies its own `junkMultiplier` to every Junk event that bet declares. Junk stores integer points per event; money is computed only at the render boundary. See `.claude/skills/golf-betting-rules/SKILL.md` for cross-game invariants; `src/games/junk.ts` is the authority on behavior.

## 2. Players & Teams

Minimum 2 players, maximum 5. Eligibility is per declaring main bet — only the bettors of a declaring main bet are eligible to collect that bet's Junk points. A non-bettor who wins a raw award (e.g. CTP by group consensus) is recorded for bookkeeping via `CTPWinnerSelected` or `LongestDriveWinnerSelected` but collects zero from any Junk event. Handicap strokes do not apply to Junk awards — every Junk item is evaluated on the gross event (tee shot, sand play, green in regulation, par, and so on).

## 3. Unit of Wager

Stake lives on each declaring main bet's `BetSelection`, not on Junk itself. Each Junk event stores integer points per player. Money at the render boundary is `points × mainBet.stake × mainBet.junkMultiplier` for the declaring main bet. No Junk payout exists outside a declaring main bet's stake × multiplier — a round with zero declaring main bets produces zero Junk money.

## 4. Setup

```ts
type JunkKind = 'ctp' | 'longestDrive' | 'greenie' | 'sandy' | 'barkie' | 'polie' | 'arnie'

interface JunkRoundConfig {
  girEnabled: boolean              // default true — gates Greenie emission on CTP + par
  longestDriveHoles: number[]      // default [] — holes (1..18) designated for LD; par-4 and par-5 only
  ctpEnabled: boolean              // default true
  ctpTieRule: 'groupResolve' | 'carry'
                                   // default 'groupResolve' — governs tied-CTP resolution
  longestDriveEnabled: boolean     // default true
  greenieEnabled: boolean          // default true
  sandyEnabled: boolean            // default true
  barkieEnabled: boolean           // default true
  polieEnabled: boolean            // default true
  arnieEnabled: boolean            // default true
  polieMode: 'automatic' | 'invoked'
                                   // default 'automatic'
  barkieStrict: boolean            // default true — solid wood only, not leaves
  superSandyEnabled: boolean       // default false — fairway bunker = 2× points
}
```

`JunkKind` values populate the `junkItems: JunkKind[]` array on every declaring main bet's `BetSelection`. `junkMultiplier: number` on the same selection is a positive integer, default 1.

Points formula for a Junk event of kind `K` awarded to winner `w` in declaring main bet `B` with bettor set `S_B` of size `N = |S_B|`:

- `event.points[w] = N − 1`.
- `event.points[p] = −1` for every other `p ∈ S_B`.
- `event.points` is undefined for players not in `S_B`.
- `Σ event.points = (N − 1) + (N − 1) × (−1) = 0` — zero-sum holds on every event.

## 5. Per-Hole Scoring

```ts
import type { HoleState, RoundConfig, ScoringEvent, PlayerId, BetId } from './types'

type JunkAwarded = Extract<ScoringEvent, { kind: 'JunkAwarded' }>

function settleJunkHole(
  holeState: HoleState,
  roundCfg: RoundConfig,
  junkCfg: JunkRoundConfig,
): JunkAwarded[] {
  const events: JunkAwarded[] = []
  for (const bet of roundCfg.declaringBets) {
    for (const kind of bet.junkItems) {
      const winner = resolveJunkWinner(kind, holeState, junkCfg)
      if (winner === null) continue
      if (!bet.bettors.includes(winner)) continue
      const N = bet.bettors.length
      const points: Record<PlayerId, number> = {}
      for (const p of bet.bettors) points[p] = p === winner ? N - 1 : -1
      events.push({
        kind: 'JunkAwarded', hole: holeState.hole, junk: kind, winner,
        declaringBet: bet.id, points, actor: 'system', timestamp: holeState.timestamp,
      })
    }
  }
  return events
}
```

Per-item award conditions (`resolveJunkWinner` dispatch):

```ts
function isCTP(state: HoleState, cfg: JunkRoundConfig): PlayerId | null {
  // Par-3 only. Winner selected by UI (`CTPWinnerSelected` event) among players
  // whose tee shot came to rest on the putting green. Hole-in-one supersedes.
  if (!cfg.ctpEnabled) return null
  if (state.par !== 3) return null
  return state.ctpWinner ?? null
}

function isLongestDrive(state: HoleState, cfg: JunkRoundConfig): PlayerId | null {
  // Par-4 or par-5 only. Hole must appear in cfg.longestDriveHoles.
  // Winner: longest measured tee shot coming to rest in the fairway.
  // Source: https://www.golfcompendium.com/2020/02/nicklauses-golf-bet.html
  //         https://help.18birdies.com/article/55-dots-junk
  if (!cfg.longestDriveEnabled) return null
  if (state.par < 4) return null
  if (!cfg.longestDriveHoles.includes(state.hole)) return null
  return state.longestDriveWinner ?? null
}

function isGreenie(state: HoleState, cfg: JunkRoundConfig): PlayerId | null {
  // Derived from CTP. Trigger: CTP awarded on a par 3 AND cfg.girEnabled AND
  // the CTP winner made par or better. Source:
  // https://www.myscorecard.com/cgi-bin/knowledgecenter.pl?mode=article&category=golf_games&file=junk&article=Junk
  if (!cfg.greenieEnabled) return null
  if (!cfg.girEnabled) return null
  const ctp = isCTP(state, cfg)
  if (ctp === null) return null
  if (state.gross[ctp] > state.par) return null
  return ctp
}

function isSandy(state: HoleState, cfg: JunkRoundConfig): PlayerId | null {
  // Par or better after being in a sand bunker during the hole.
  // Super Sandy (fairway bunker) applies when superSandyEnabled — handled at
  // point emission, not winner selection.
  if (!cfg.sandyEnabled) return null
  const candidates = Object.keys(state.gross).filter(p =>
    state.bunkerVisited[p] === true && state.gross[p] <= state.par)
  return candidates.length === 1 ? (candidates[0] as PlayerId) : null
}

function isBarkie(state: HoleState, cfg: JunkRoundConfig): PlayerId | null {
  // Par or better after hitting a tree. Solid wood only when barkieStrict.
  // Source: https://thegolfnewsnet.com/ryan_ballengee/2022/08/30/golf-terms-what-is-a-barky-or-barkie-in-golf-and-what-does-it-mean-to-get-one-126970/
  if (!cfg.barkieEnabled) return null
  const candidates = Object.keys(state.gross).filter(p => {
    const tree = cfg.barkieStrict ? state.treeSolidHit[p] : state.treeAnyHit[p]
    return tree === true && state.gross[p] <= state.par
  })
  return candidates.length === 1 ? (candidates[0] as PlayerId) : null
}

function isPolie(state: HoleState, cfg: JunkRoundConfig): PlayerId | null {
  // Sink a putt longer than the flagstick (approx 7 feet).
  // Automatic: any qualifying putt counts. Invoked: caller flags via state.polieInvoked.
  // Source: https://www.golfcompendium.com/2021/02/poley-golf-game.html
  if (!cfg.polieEnabled) return null
  const mode = cfg.polieMode
  const candidates = Object.keys(state.gross).filter(p =>
    state.longPutt[p] === true && (mode === 'automatic' || state.polieInvoked[p] === true))
  return candidates.length === 1 ? (candidates[0] as PlayerId) : null
}

function isArnie(state: HoleState, cfg: JunkRoundConfig): PlayerId | null {
  // Par on a par-4 or par-5 without hitting the fairway off the tee and without GIR.
  // Source: https://www.myscorecard.com/cgi-bin/knowledgecenter.pl?...
  //         https://help.18birdies.com/article/55-dots-junk
  if (!cfg.arnieEnabled) return null
  if (state.par < 4) return null
  const candidates = Object.keys(state.gross).filter(p =>
    state.gross[p] === state.par &&
    state.fairwayHit[p] === false &&
    state.gir[p] === false)
  return candidates.length === 1 ? (candidates[0] as PlayerId) : null
}

function resolveJunkWinner(
  kind: JunkKind, state: HoleState, cfg: JunkRoundConfig,
): PlayerId | null {
  switch (kind) {
    case 'ctp': return isCTP(state, cfg)
    case 'longestDrive': return isLongestDrive(state, cfg)
    case 'greenie': return isGreenie(state, cfg)
    case 'sandy': return isSandy(state, cfg)
    case 'barkie': return isBarkie(state, cfg)
    case 'polie': return isPolie(state, cfg)
    case 'arnie': return isArnie(state, cfg)
  }
}
```

`settleJunkHole` returns one `JunkAwarded` event per (declaringBet × junkKind) awarded. A CTP on a par 3 with GIR toggle ON, declared on two main bets, produces four events: two for CTP (one per declaring bet) and two for Greenie (one per declaring bet).

## 6. Tie Handling

| Junk item | Tie behavior |
|---|---|
| CTP | Branches on `ctpTieRule`. When `'groupResolve'` (default), the UI presents the tied candidates, the group selects one winner, `CTPWinnerSelected` emits with that winner, and scoring proceeds normally for every declaring main bet. When `'carry'`, no winner is selected; `CTPCarried` emits with `hole`, `fromHole`, and `carryPoints`, and the pot transfers to the next eligible par 3 in the round. If no subsequent par 3 exists (for example, the tie occurs on the final par 3 of the round), the carry stays unresolved and escalates to the Final Adjustment screen per `docs/games/_FINAL_ADJUSTMENT.md`; the app never plays extra holes. |
| Longest Drive | Split evenly among tied winners. With `N` bettors, `w` tied winners, each winner's points = `N − w`, each loser's points = `−w`. When `(N − w)` is not divisible by `w` in the split computation (here `w ≥ 2`, so each winner receives `N − w` flat), integer cleanness holds for LD — but when the downstream money math (`points × stake × multiplier`) leaves a per-winner cent remainder, the remainder absorbs into the tied winner with the lowest `playerId` via a `RoundingAdjustment` event. |
| Sandy, Barkie, Polie, Arnie | All tied winners collect. With `N` bettors and `w` tied winners, each winner's points = `N − w`, each loser's points = `−w`. Σ = `w × (N − w) + (N − w) × (−w) = 0` — zero-sum holds. |

Every tie resolution emits its own typed event (`CTPCarried`, `RoundingAdjustment`) alongside the `JunkAwarded` events.

## 7. Press & Variants

Junk itself does not press. When a main bet opens a press, every Junk event awarded during the press window inherits the parent bet's `junkMultiplier` — the press is just another declaring bet for Junk purposes, and its `junkMultiplier` applies at the money-rendering boundary.

Variants:

- **Greenie-with-GIR** (toggle `girEnabled`, default ON). When OFF, Greenie is never emitted even on a CTP + par combination. Source: https://www.myscorecard.com/cgi-bin/knowledgecenter.pl?mode=article&category=golf_games&file=junk&article=Junk
- **Super Sandy** (toggle `superSandyEnabled`, default OFF). When ON, a Sandy from a fairway bunker doubles the winner's points; the event stores `points × 2` for the winner and `points × 2` for each loser's debit (zero-sum preserved). Source: same myscorecard citation.
- **Barkie-solid-wood-only** (toggle `barkieStrict`, default ON). When OFF, any tree contact (including leaves) qualifies. Source: https://thegolfnewsnet.com/ryan_ballengee/2022/08/30/golf-terms-what-is-a-barky-or-barkie-in-golf-and-what-does-it-mean-to-get-one-126970/
- **Polie auto-vs-invoked** (enum `polieMode`, default `'automatic'`). `'invoked'` requires the player to call the putt before stroking it; a three-putt after invocation doubles the loss. Source: https://www.golfcompendium.com/2021/02/poley-golf-game.html
- **CTP tie behavior** (enum `ctpTieRule`, default `'groupResolve'`). `'groupResolve'` lets the group select one winner among tied CTP candidates and resolves the hole as a single award; `'carry'` defers the award to the next eligible par 3 via a `CTPCarried` event. See § 6 for the full branch.

Every Junk item in `junkItems` pays out at `points × stake × junkMultiplier` for every declaring main bet.

## 8. End-of-Round Settlement

Aggregation runs through `src/games/aggregate.ts`. For each declaring main bet `B`, sum `event.points[p] × B.stake × B.junkMultiplier` over every `JunkAwarded` event whose `declaringBet === B.id`. Σ money per declaring bet = 0 (every event is zero-sum). Σ money across all declaring bets = 0. No round-level multiplier applies.

## 9. Edge Cases

- **Multiple bets declare the same Junk** — one `JunkAwarded` event per declaring bet. Each event is independently zero-sum within that bet's bettor set. The raw award event (`CTPWinnerSelected`, `LongestDriveWinnerSelected`) fires exactly once per hole; `JunkAwarded` events fan out from it.
- **Non-bettor wins CTP** — `CTPWinnerSelected` records the winner for bookkeeping. Zero `JunkAwarded` events emit. The player collects nothing.
- **Greenie without CTP** — impossible. Greenie derives from CTP; no CTP means no Greenie.
- **GIR toggle OFF** — no Greenie emitted even on a CTP + par combination. `CTPWinnerSelected` still fires; Greenie is silent by design.
- **Longest Drive hole not in `longestDriveHoles`** — no LD event on that hole, even when the UI recorded a winner.
- **Tied Longest Drive with odd cent remainder** — per-winner points are integer-clean (`N − w`), but `points × stake × junkMultiplier` may leave a per-winner cent remainder; a `RoundingAdjustment` event routes the remainder to the tied winner with the lowest `playerId`.
- **Par-3 Arnie** — rejected by `isArnie` (`state.par < 4` branch).
- **Sandy without visiting a bunker** — `state.bunkerVisited[p]` is false; the candidate list is empty; no event.
- **Declaring main bet with a single bettor** (`N = 1`) — `points[w] = 0` and the bettor set has no other members; the event is zero-sum trivially but produces no transfer. The UI disables Junk declaration for `N < 2` at setup.

## 10. Worked Example

**Setup.** Four players — Alice, Bob, Carol, Dave. Two main bets:

- Skins: bettors = `{Alice, Bob, Carol, Dave}`, stake = 100 cents, `junkItems = ['greenie']`, `junkMultiplier = 1`.
- Nassau (singles, all-pairs mode disabled): bettors = `{Alice, Bob}`, stake = 200 cents, `junkItems = ['greenie']`, `junkMultiplier = 2`.
- Round config: `girEnabled = true`.

**Event.** Hole 4, par 3. Alice hits the green in regulation, is closest to the pin, and makes par.

**Events emitted.**

1. `CTPWinnerSelected` `{ hole: 4, winner: Alice, gir: true }`
2. `JunkAwarded` `{ hole: 4, junk: 'greenie', winner: Alice, declaringBet: 'skins', points: { Alice: +3, Bob: −1, Carol: −1, Dave: −1 } }`
3. `JunkAwarded` `{ hole: 4, junk: 'greenie', winner: Alice, declaringBet: 'nassau', points: { Alice: +1, Bob: −1 } }`

**Zero-sum checks.** Skins event Σ = 3 − 1 − 1 − 1 = 0. Nassau event Σ = 1 − 1 = 0.

**Money at display** (per-player, from these two events only):

- Alice: Skins +3 × 100 × 1 = +300 cents; Nassau +1 × 200 × 2 = +400 cents; **total +700 cents ($7.00)**.
- Bob: Skins −1 × 100 × 1 = −100 cents; Nassau −1 × 200 × 2 = −400 cents; **total −500 cents (−$5.00)**.
- Carol: Skins −1 × 100 × 1 = −100 cents; **total −100 cents (−$1.00)**.
- Dave: Skins −1 × 100 × 1 = −100 cents; **total −100 cents (−$1.00)**.

Σ money across all four players = 700 − 500 − 100 − 100 = **0**.

## 11. Implementation Notes

Scoring file: `src/games/junk.ts` (migration target; per `MIGRATION_NOTES.md` item 14, replaces `src/lib/junk.ts` once code lands). Four `ScoringEvent` variants belong to Junk:

- `JunkAwarded` — `{ kind, timestamp, hole, actor, declaringBet, junk, winner, points }`. Emitted per `(declaringBet × junkKind)` award.
- `CTPWinnerSelected` — `{ kind, timestamp, hole, actor, winner, gir }`. Bookkeeping-only; fires once per awarded CTP regardless of declaring-bet count.
- `LongestDriveWinnerSelected` — `{ kind, timestamp, hole, actor, winner, distance? }`. Bookkeeping-only; fires once per awarded LD.
- `CTPCarried` — `{ kind, timestamp, hole, actor, fromHole, carryPoints }`. Emitted when `ctpTieRule === 'carry'` and a CTP ties. Has no `declaringBet` field because the carry transfers to the next eligible par 3 at the round level, not per main bet. The `fromHole` field records where the carry originated; `carryPoints` records the stake-equivalent accumulation.

Imports none of `next/*`, `react`, `react-dom`, `fs`, `path` — portability invariant from `.claude/skills/golf-betting-rules/SKILL.md`. Aggregation runs through `src/games/aggregate.ts`, which sums `event.points[p] × B.stake × B.junkMultiplier` per declaring bet `B`. Integer-unit math only — no floating-point arithmetic occurs in Junk settlement.

## 12. Test Cases

### Test 1 — Worked example (verbatim from section 10)

Four players — Alice, Bob, Carol, Dave. Two main bets:

- Skins: bettors = `{Alice, Bob, Carol, Dave}`, stake = 100 cents, `junkItems = ['greenie']`, `junkMultiplier = 1`.
- Nassau (singles, all-pairs mode disabled): bettors = `{Alice, Bob}`, stake = 200 cents, `junkItems = ['greenie']`, `junkMultiplier = 2`.
- Round config: `girEnabled = true`.

Hole 4, par 3. Alice hits the green in regulation, is closest to the pin, and makes par.

Assert:
- Exactly one `CTPWinnerSelected` event with `winner = Alice`, `gir = true`.
- Exactly two `JunkAwarded` events, both with `junk = 'greenie'` and `winner = Alice`.
- Skins event points = `{ Alice: +3, Bob: −1, Carol: −1, Dave: −1 }`; Σ = 0.
- Nassau event points = `{ Alice: +1, Bob: −1 }`; Σ = 0.
- Per-player money: Alice +700, Bob −500, Carol −100, Dave −100.
- Σ money across all players = 0.
- Every `points[p]` and every money value satisfies `Number.isInteger`.

### Test 2 — Parallel awards

Setup: same four players; Skins and Nassau both declare `junkItems = ['greenie']`. Hole 7, par 3. Alice wins CTP + par with GIR ON.

Assert:
- One `CTPWinnerSelected` event.
- Two `JunkAwarded` events, one per declaring bet.
- Each event is independently zero-sum within its own bettor set.

### Test 3 — CTP without Greenie (GIR toggle OFF)

Setup: same four players; Skins declares `junkItems = ['ctp', 'greenie']`; round config `girEnabled = false`. Hole 4, par 3. Alice wins CTP with par.

Assert:
- One `CTPWinnerSelected` event with `gir = false`.
- One `JunkAwarded` event for CTP (Skins).
- Zero `JunkAwarded` events for Greenie.

### Test 4 — Non-bettor CTP winner

Setup: Skins bettors = `{Bob, Carol, Dave}` (Alice not bettor); `junkItems = ['ctp']`. Hole 4, par 3. Alice wins CTP.

Assert:
- One `CTPWinnerSelected` event with `winner = Alice`.
- Zero `JunkAwarded` events.
- Every Skins bettor's round money from Junk = 0 cents.

### Test 5 — Tied Longest Drive with 3 eligible bettors

Setup: Skins bettors = `{Alice, Bob, Carol}` (`N = 3`); `junkItems = ['longestDrive']`, `junkMultiplier = 1`, stake 100 cents. `longestDriveHoles = [5]`. Hole 5, par 4. Alice and Bob tie for longest drive in the fairway (`w = 2`).

Assert:
- Points per winner = `N − w = 1`; points per loser = `−w = −2`.
- Points map: `{ Alice: +1, Bob: +1, Carol: −2 }`; Σ = 1 + 1 − 2 = 0.
- Per-player money: Alice +100, Bob +100, Carol −200; Σ = 0.
- Every `points[p]` and every money value satisfies `Number.isInteger`.
