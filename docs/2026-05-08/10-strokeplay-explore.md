---
prompt_id: "10"
timestamp: 2026-05-08T00:00:00Z
checklist_item_ref: "Phase 7 — Stroke Play sweep cutover — Explore"
tags: [explore, strokePlay, phase-7, sweep]
status: COMPLETE
---

# Stroke Play Phase 7 Explore — aggregateRound Cutover

Template: Wolf/Skins pattern (simple byBet key). All 10 verification items answered from direct code reads.

---

## Verification checklist

### SE1 — Current dispatch shape in payouts.ts

**Finding:**
```typescript
case 'strokePlay': {
  const { ledger } = settleStrokePlayBet(holes, players, game)
  return payoutMapFromLedger(ledger, game.playerIds)
}
```
Two lines. Extracts `.ledger` from bridge, then `payoutMapFromLedger`. No `aggregateRound` involvement today.

**Status:** ✓ confirmed

---

### SE2 — Bridge return shape

**Finding:** `settleStrokePlayBet` signature (stroke_play_bridge.ts:57):
```typescript
export function settleStrokePlayBet(
  holes: HoleData[],
  players: PlayerSetup[],
  game: GameInstance,
): { events: ScoringEvent[]; ledger: Record<string, number> }
```
Returns `{ events, ledger }` — SAME as Wolf/Skins (not Nassau's `{ events, payouts }`). After cutover, only `events` is consumed; `.ledger` is discarded.

**Status:** ✓ confirmed — Wolf/Skins template applies directly

---

### SE3 — Finalizer placement and double-finalization risk

**Finding — bridge side:** `settleStrokePlayBet` calls `finalizeStrokePlayRound(holeEvents, cfg)` and returns ONLY the final events (StrokePlaySettled, TieFallthrough, RoundingAdjustment, FieldTooSmall). The `StrokePlayHoleRecorded` events are consumed internally and NOT returned.

**Finding — aggregate side:** `aggregate.ts` aggregateRound has a `strokePlay` case in the finalizer loop (lines 384-393):
```typescript
} else if (bet.type === 'strokePlay') {
  const strokeEvents = log.events.filter(
    e => e.kind === 'StrokePlayHoleRecorded' && e.declaringBet === bet.id
  )
  const spEvents = finalizeStrokePlayRound(strokeEvents, bet.config as StrokePlayCfg)
  finalizerEvents.push(...spEvents)
}
```
This filters for `StrokePlayHoleRecorded` events only. Since the bridge returns no `StrokePlayHoleRecorded` events (only finalized events), `strokeEvents = []`. Then `finalizeStrokePlayRound([])` returns `[]` (byBet is empty, no events to group, result is empty). No finalizerEvents pushed.

**Double-finalization risk:** None — the finalizer is a structural no-op when the log contains only finalized events.

**Critical divergence from Wolf/Skins:** Wolf/Skins have NO aggregateRound finalizer case. Stroke Play HAS a finalizer case, but it's a no-op. The mechanism differs; the outcome is the same. This must be documented because the no-op guarantee is fragile: if the bridge is ever refactored to return ALL events (hole records + final), the finalizer would double-finalize, producing 2× payouts and breaking zero-sum.

**Status:** ✓ confirmed — no double-finalization; mechanism is fragile (bridge contract dependency)

---

### SE4 — Stroke Play event types and monetary status

| Event | `WithPoints`? | byBet key | Monetary? | reduceEvent case |
|---|---|---|---|---|
| `StrokePlayHoleRecorded` | No | — | No | `default: break` |
| `IncompleteCard` | No | — | No | `default: break` |
| `FieldTooSmall` | No | — | No | `default: break` |
| `TieFallthrough` | No | — | No | `default: break` |
| `CardBackResolved` | No | — | No | `default: break` |
| `ScorecardPlayoffResolved` | No | — | No | `default: break` |
| `StrokePlaySettled` | YES | `declaringBet` (simple) | YES | `case 'StrokePlaySettled': accumulate(...)` |
| `RoundingAdjustment` | YES | `declaringBet` (simple) | YES | `case 'RoundingAdjustment': accumulate(...)` |

Only `StrokePlaySettled` and `RoundingAdjustment` contribute to `byBet`. Both use simple `declaringBet` = `game.id`.

**`RoundingAdjustment` fires when:** tied winners and integer division leaves a remainder. Example: 3-way tie in a 4-player game (3 winners, 1 loser, pot=100 → 33 per winner, remainder=1). Absorbing player is the lexicographically-first winner.

**Status:** ✓ confirmed — both monetary events use simple `betId` key

---

### SE5 — byBet key shape

**Finding:** From aggregate.ts reduceEvent:
```typescript
case 'StrokePlaySettled':
case 'RoundingAdjustment': {
  accumulate(netByPlayer, byBet, (event as { declaringBet: BetId }).declaringBet, event.points)
  break
}
```
Simple `declaringBet` key = `game.id`. NOT compound. `result.byBet[game.id]` extraction is viable.

**`?? {}` fallback:** When `FieldTooSmall` fires (no scoring players), no `StrokePlaySettled` is emitted, `byBet[game.id]` is `undefined`. The `??{}` fallback IS needed and IS correct for Stroke Play. This is different from Nassau (where `??{}` was structurally unreachable). The fallback is intentional, not a silent-failure risk.

**Status:** ✓ confirmed — Wolf/Skins `byBet[game.id] ?? {}` extraction pattern applies

---

### SE6 — buildSpCfg: exported?

**Finding:** stroke_play_bridge.ts:22:
```typescript
function buildSpCfg(game: GameInstance): StrokePlayCfg {
```
NOT exported (no `export` keyword). Needs 1-char change: `export function buildSpCfg(...)`.

`buildSpCfg` sets `id: game.id` (first field). GR8 chain intact.

**Status:** ✗ NOT exported — 1-char export patch required (Skins precedent)

---

### SE7 — Config flags affecting test fixtures

Bridge hardcodes ALL Stroke Play config flags in v1 (`buildSpCfg`):

| Flag | Hardcoded value | Range of legal values | Test fixture trap? |
|---|---|---|---|
| `settlementMode` | `'winner-takes-pot'` | `'winner-takes-pot'` \| `'per-stroke'` \| `'places'` | None — all orchestration tests use hardcoded value |
| `tieRule` | `'split'` | `'split'` \| `'card-back'` \| `'scorecard-playoff'` | None — bridge fixes this |
| `appliesHandicap` | `true` | `boolean` | None — always true in v1 |
| `stakePerStroke` | `1` | positive integer (only for `per-stroke`) | None — per-stroke unused |
| `placesPayout` | `[]` | array (only for `places`) | None — places unused |
| `cardBackOrder` | `[9,6,3,1]` | non-empty int array (card-back/playoff only) | None — split unused |

**Conclusion:** No Skins-escalating-style test fixture trap. The bridge fixes all config flags; tests always exercise 'winner-takes-pot' + 'split'. The split path with a tied result is where test design must be careful (see SE9).

**Status:** ✓ confirmed — no flag traps for orchestration tests

---

### SE8 — Existing coverage

**Bridge tests:** `src/bridge/stroke_play_bridge.test.ts` — 291 lines; comprehensive bridge-level coverage of settlement modes, tie rules, handicap, FieldTooSmall, withdrawal (N/A for Stroke Play), and GR8 chain.

**E2E:** `tests/playwright/stroke-play-finish-flow.spec.ts` — E2E coverage exists. ✓

**No withdrawal handling:** Stroke Play has no withdrawal mechanic. `NassauWithdrawalSettled` is Nassau-specific. Stroke Play uses `IncompleteCard` for players missing scores, which leads to `FieldTooSmall` if fewer than 2 players complete the round.

**Status:** ✓ confirmed — baseline coverage exists; orchestration tests are additive

---

### SE9 — Anticipated adversarial concerns

**SE9-A: aggregateRound Stroke Play finalizer — fragile no-op guarantee**

The no-op property of the aggregateRound Stroke Play finalizer depends on the bridge returning ONLY finalized events. If the bridge were refactored to return all events (both `StrokePlayHoleRecorded` AND finalized events), the finalizer would double-finalize: A would receive 2× stake, breaking zero-sum.

*Mitigation:* The basic winner test (STP1) catches this immediately — doubled payouts would produce wrong values. Add a comment in the orchestration code noting this dependency.

*Test to write:* STP1 (clear winner) implicitly validates no double-finalization. No additional specific test needed.

**SE9-B: TieFallthrough + RoundingAdjustment event chain**

A tied round under `tieRule: 'split'` produces:
1. `TieFallthrough` (informational, no points — hits `default: break`)
2. `StrokePlaySettled` (split points per winner, negative per loser)
3. Possibly `RoundingAdjustment` (remainder point to lexicographically-first winner)

Both `StrokePlaySettled` and `RoundingAdjustment` accumulate to `byBet[game.id]`. If either is missed, the zero-sum check in `aggregateRound` would throw. Test STP4 (2-way tie) and STP7 (3-way tie with remainder) cover this.

**SE9-C: FieldTooSmall ?? {} fallback — intentional, not silent**

When FieldTooSmall fires (all players have 0 scores → all `IncompleteCard` → scoringSet empty), no `StrokePlaySettled` emits, `byBet[game.id]` is `undefined`. The `??{}` fallback yields `{}`, `payoutMapFromLedger({}, playerIds)` → all zeros.

This is correct behavior, not a silent bug. However, it means the `??{}` fallback IS reachable for Stroke Play, unlike Wolf/Skins where it's a "should never fire" safety net.

*Difference from Stroke Play's 0-score handling vs Nassau:* Stroke Play correctly checks `gross <= 0` → `IncompleteCard` (player excluded). Nassau saw `gross=0` as a valid score (0 net = tie). The `buildHoleState` 0-vs-undefined gap filed for Nassau does NOT affect Stroke Play — Stroke Play has its own `gross <= 0` guard. ✓

**SE9-D: Zero-sum enforcement in aggregateRound**

`aggregateRound` throws `ZeroSumViolationError` if Σ netByPlayer ≠ 0. For Stroke Play, the zero-sum guarantee must hold even with `RoundingAdjustment` (remainder assigned to absorbing player). The engine handles this correctly — `RoundingAdjustment.points` carries the exact remainder that makes the sum zero. Verified by running all tests after every change.

---

### SE10 — Architectural divergences from Wolf/Skins/Nassau template

| Aspect | Wolf | Skins | Nassau | Stroke Play |
|---|---|---|---|---|
| Bridge returns `.ledger`? | Yes | Yes | No (`.payouts`) | Yes ✓ |
| `buildXxxCfg` already exported? | Yes | No → 1-char fix | Yes | No → 1-char fix |
| aggregateRound finalizer case? | None | None | Has case (no-op via closed matches) | Has case (no-op via empty filter) |
| byBet key shape | Simple | Simple | Compound | Simple |
| Extraction path | `byBet[game.id] ?? {}` | `byBet[game.id] ?? {}` | `netByPlayer` | `byBet[game.id] ?? {}` |
| `?? {}` fallback semantics | Safe (no monetary events = empty) | Safe | N/A | Required (FieldTooSmall path is real) |
| Config flag traps | tieRule (Wolf only) | `escalating` | None (hardcoded) | None (all hardcoded) |
| Withdrawal handling | No | No | Yes | No |

**Conclusion:** Stroke Play fits the Wolf/Skins template exactly for the extraction path. The only implementation difference from Wolf/Skins is the aggregateRound finalizer case (no-op but present). The `?? {}` fallback is semantically richer for Stroke Play (FieldTooSmall path is real and reachable) but mechanically identical.

No new extraction path needed (no compound keys, no netByPlayer fallback required).

---

## Summary

- `buildSpCfg`: private → needs 1-char export (same as Skins `buildSkinsCfg`)
- Bridge return: `{ events, ledger }` → Wolf/Skins template directly applicable
- byBet key: simple `game.id` → `byBet[game.id] ?? {}` extraction ✓
- Finalizer: aggregateRound has Stroke Play case but it's a no-op (bridge returns only finalized events)
- Config flags: all hardcoded in v1, no test fixture traps
- FieldTooSmall: `?? {}` fallback is intentional and reachable (differs from Wolf/Skins where it's precautionary)
- No compound keys, no withdrawal handling, no presses — simplest sweep slice

**No open decisions. Plan may proceed.**
