---
prompt_id: SP3_SP4
timestamp: 2026-04-25T19:10:00Z
checklist_item_ref: "SP-3 — Stroke Play Bridge Wiring + SP-4 — Stroke Play Cutover"
tags: [sp3, sp4, engineer, bridge, cutover, payouts]
---

## Pre-Research Findings (R1–R5)

### R1 — aggregateRound (`aggregate.ts:337–397`)

Signature: `aggregateRound(log: ScoringEventLog, roundCfg: RoundConfig): RunningLedger`

Returns `{ netByPlayer: Record<PlayerId, number>, byBet: Record<string, Record<PlayerId, number>>, lastRecomputeTs: string }`. `byBet` uses simple betId keys for Stroke Play (compound `betId::matchId` only for Nassau/MatchPlay).

Stroke Play dispatch at `aggregate.ts:370–379`: filters `StrokePlayHoleRecorded` events for the bet by declaringBet ID, calls `finalizeStrokePlayRound(strokeEvents, cfg)`, reduces returned events. Aggregate.ts is the caller — tieRule dispatch is in stroke_play.ts (confirmed SP-1 F8 finding).

No halt condition: plan assumptions match.

### R2 — payouts.ts (`payouts.ts:1–195`)

- `PayoutMap` type: imported from `@/types` (`src/types/index.ts:142`): `type PayoutMap = Record<string, number>`. ✓
- `computeAllPayouts`: `payouts.ts:169–194`. Loops over `games`, calls `computeGamePayouts` per game, accumulates into combined PayoutMap.
- `computeGamePayouts`: `payouts.ts:158–167`. `case 'strokePlay'` → `computeStrokePlay`. `default` → `computeStrokePlay` (Wolf fallthrough — wrong behavior, fixed by SP-4).
- `computeStrokePlay`: `payouts.ts:16–43`. Legacy winner-takes-pot only; no tie handling (silent zero-pay on tie); no IncompleteCard.
- `emptyPayouts`: `payouts.ts:6–10`. Already defined. SP-4 default case uses this directly.
- `computeStrokePlay` is exported but has **zero external importers** (`grep -rn "computeStrokePlay" src/` confirmed 3 matches, all in payouts.ts).

No halt condition.

### R3 — computeAllPayouts callers

- `src/app/results/[roundId]/page.tsx:7,13` — calls `computeAllPayouts(holes, players, games)`. Uses `payouts[p.id]` for display only.
- `src/app/bets/[roundId]/page.tsx:6,12` — same pattern.
- No caller accesses computeStrokePlay directly. No bet-type-specific field access on PayoutMap. Both pages only need `payouts[pid]: number`.

No halt condition. No imports need updating in src/app/.

### R4 — settleStrokePlayHole signature

`stroke_play.ts:158`: `settleStrokePlayHole(hole: HoleState, config: StrokePlayCfg, roundCfg: RoundConfig): ScoringEvent[]`

Returns array of events per hole (IncompleteCard + StrokePlayHoleRecorded). Matches what the bridge needs.

### R5 — HoleData[] at runtime

`roundStore.ts:63`: `holes: HoleData[]` in the store. Both app pages pull `holes` from the store and pass it to `computeAllPayouts`. The bridge receives the same array via `computeAllPayouts → computeGamePayouts → settleStrokePlayBet`.

---

## SP-3 Implementation

### Signature deviation

The prompt suggested `settleStrokePlayBet(holeData, players, bet: BetSelection, roundCfg: RoundConfig)`. Actual signature: `settleStrokePlayBet(holes: HoleData[], players: PlayerSetup[], game: GameInstance)`. Rationale: SP-4's integration point is `computeGamePayouts(holes, players, game: GameInstance)` which has no BetSelection or RoundConfig. Building those internally keeps SP-4 a one-liner. Document.

### buildSpCfg deviation

`GameInstance` has no `junkMultiplier` field — only `GameInstance.junk: JunkConfig`. Fixed: `junkMultiplier: 1` (hardcoded, Option α has no junk). This was caught by tsc during the SP-3 gate.

### appliesHandicap: Test 6

Prompt asked for "appliesHandicap: false" test. `buildSpCfg` hardcodes `appliesHandicap: true` (Option α Minimal). Test 6 uses all-zero-hcp players; with `strokesOnHole(0, holeIndex) = 0`, net = gross on every hole. Functionally equivalent to appliesHandicap=false. Documented as a deviation; no API change made.

### Test 7 — IncompleteCard assertion correction

`finalizeStrokePlayRound` returns NEW events only (settlement events). IncompleteCard events from `holeEvents` are consumed by the finalizer and not in `finalEvents`. The assertion `events.some(e => e.kind === 'IncompleteCard'): false` is correct.

### Files modified

- `src/bridge/stroke_play_bridge.ts` — added SP-3 exports: `EMPTY_JUNK`, `buildSpCfg`, `buildMinimalRoundCfg` (internal helpers), `settleStrokePlayBet`, `payoutMapFromLedger`.
- `src/bridge/stroke_play_bridge.test.ts` — added SP-3 tests (Tests 5–7, 10 new `it` blocks).

### SP-3 test gate

| | Before | After |
|---|---|---|
| Tests | 316 | 326 |
| tsc | 0 errors | 0 errors (after fixing `junkMultiplier`) |

---

## SP-4 Implementation

### payouts.ts changes

1. **Import added** (line 5): `import { settleStrokePlayBet, payoutMapFromLedger } from '../bridge/stroke_play_bridge'`

2. **`computeStrokePlay` deleted** (was lines 16–43): Function body and export removed entirely. Zero external importers confirmed pre-edit.

3. **`computeGamePayouts` case 'strokePlay'** replaced:
   - Before: `case 'strokePlay': return computeStrokePlay(holes, players, game)`
   - After:
     ```ts
     case 'strokePlay': {
       const { ledger } = settleStrokePlayBet(holes, players, game)
       return payoutMapFromLedger(ledger, game.playerIds)
     }
     ```

4. **`computeGamePayouts` default** replaced:
   - Before: `default: return computeStrokePlay(holes, players, game)` (Wolf fallthrough → wrong numbers)
   - After: `default: return emptyPayouts(game.playerIds)` (Wolf shows $0 while parked)
   - `emptyPayouts` was already defined at payouts.ts:6.

### SP-4 grep gate

`git grep -rn "computeStrokePlay" src/` → **exit 1 (zero matches)**. ✓

### SP-4 final test gate

| | Count |
|---|---|
| Tests | 326/326 (unchanged from SP-3) |
| tsc | exit 0 (zero errors) |

---

## State at halt

**SP-3: Closed.** Tests 316→326, tsc clean, orchestration and adapter exported from `src/bridge/stroke_play_bridge.ts`.

**SP-4: Code landed; manual playthrough pending.** `computeStrokePlay` deleted; `case 'strokePlay'` routes through new engine path; `default` fallthrough returns `emptyPayouts`. grep gate: zero references. tsc clean. Automated gates pass.

SP-4 closure requires the operator to perform an 18-hole manual playthrough on the dev server and verify settlement on the results page. The checklist is not updated until that step completes.

---

## Operator next steps — Manual playthrough (SP-4 closure)

```bash
# 1. Start the dev server
cd /home/seadmin/golf
npm run dev

# 2. Open the app in a browser (http://localhost:3000)

# 3. Create a new round:
#    - Pick a course
#    - Add 2–4 players (set handicaps; try at least one non-zero hcp)
#    - Add one Stroke Play game with a stake
#    - Confirm setup and lock the round

# 4. Enter gross scores for all 18 holes (all players, all holes)

# 5. Navigate to the Results page

# 6. Verify:
#    - Correct winner shown (lowest net score)
#    - Settlement amounts are correct and zero-sum (winner amount = sum of losers)
#    - No JavaScript errors in browser console
#    - Tied score shows split (amounts divided, not zero-pay)

# 7. Optional: test IncompleteCard edge case
#    - Leave one hole blank for one player
#    - That player should show $0; others settle correctly

# 8. After playthrough passes: update IMPLEMENTATION_CHECKLIST.md
#    - Move SP-4 to Done section
#    - Set SP-5 (or next item) as Active
```

---

## Noticed but out of scope

- `computeMatchPlay`, `computeNassau`, `computeSkins`, `computeStableford` in payouts.ts remain and continue to serve parked bets. No changes made to them.
- `getStrokes(p: PlayerSetup)` helper in payouts.ts still used by the remaining compute functions. Not removed.
- `src/lib/handicap.ts` shim re-export still in place (not touched per fence).

## Result

- **Files modified:** `src/bridge/stroke_play_bridge.ts`, `src/bridge/stroke_play_bridge.test.ts`, `src/lib/payouts.ts`
- **SP-3 tests:** 316 → 326 (10 new its)
- **SP-4 tests:** 326 → 326 (no additions)
- **tsc:** exit 0 both phases
- **SP-4 grep gate:** zero `computeStrokePlay` references
