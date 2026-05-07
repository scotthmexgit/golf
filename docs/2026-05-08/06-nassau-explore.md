---
prompt_id: "06"
timestamp: 2026-05-08T00:00:00Z
checklist_item_ref: "Phase 7 — Nassau sweep cutover — Explore"
tags: [explore, nassau, phase-7, sweep]
status: COMPLETE
---

# Nassau Phase 7 Explore — aggregateRound Cutover

Template: Wolf-pilot pattern (WF7-2). All 10 verification items answered from direct code reads.

---

## Verification checklist

### NE1 — Current dispatch shape in payouts.ts

**Finding:**
```typescript
case 'nassau': return settleNassauBet(holes, players, game).payouts
```
Single line. `payouts` is a `PayoutMap` returned directly from the bridge. No `aggregateRound` involvement today.

**Status:** ✓ confirmed

---

### NE2 — Bridge return shape

**Finding:** `settleNassauBet` signature (nassau_bridge.ts:158):
```typescript
export function settleNassauBet(
  holes: HoleData[],
  players: PlayerSetup[],
  game: GameInstance,
): { events: ScoringEvent[]; payouts: PayoutMap }
```
Returns `{ events, payouts }` — NOT `{ events, ledger }` like Wolf/Skins.

**Divergence from template:** `.payouts` (already a `PayoutMap`) vs `.ledger` (raw `Record<string, number>`). After the cutover, only `events` is consumed; `.payouts` is discarded and re-derived via aggregateRound.

**Status:** ✓ confirmed — divergence documented, not a blocker

---

### NE3 — buildNassauCfg: already exported?

**Finding:** nassau_bridge.ts:
```typescript
export function buildNassauCfg(game: GameInstance): NassauCfg {
```
Already exported. No 1-char change needed (unlike Skins where `buildSkinsCfg` was private).

**Status:** ✓ confirmed — no bridge change required

---

### NE4 — buildNassauCfg sets id: game.id?

**Finding:** nassau_bridge.ts buildNassauCfg body:
```typescript
return {
  id: game.id,          // ← game.id preserved
  stake: game.stake,
  ...
}
```
`id: game.id` is the first field. GR8 chain intact.

**Status:** ✓ confirmed — GR8 guard `if (nassauCfg.id !== game.id)` is a valid runtime check

---

### NE5 — Finalizer placement (inside bridge or aggregateRound's loop?)

**Finding — bridge side:** nassau_bridge.ts `settleNassauBet` calls `finalizeNassauRound(matches, cfg)` immediately before building `.payouts`. All matches are pre-closed (`match.closed = true`) by the time events are returned.

**Finding — aggregate side:** aggregate.ts finalizer loop routes Nassau bets through `finalizeNassauRound`. BUT `finalizeNassauRound` skips any match where `match.closed === true`. Since the bridge pre-closes all matches, the aggregateRound finalizer pass is a safe no-op.

**Double-finalization risk:** None. Bridge-closed matches are skipped in the aggregateRound pass.

**Status:** ✓ confirmed — same safe pattern as Wolf/Skins; no double-finalization

---

### NE6 — byBet key shape: simple betId or compound?

**Finding:** aggregate.ts reduceEvent for Nassau monetary events:
```typescript
case 'MatchClosedOut': {
  const key = `${e.declaringBet}::${e.matchId}`   // compound key
  // accumulate into result.byBet[key]
}
case 'NassauWithdrawalSettled': {
  const key = `${e.betId}::${e.matchId}`           // compound key
}
```
Nassau uses compound keys `${betId}::${matchId}` in `byBet`. Wolf/Skins use simple `betId` keys.

**Critical divergence from template:** `result.byBet[game.id]` is ALWAYS `undefined` for Nassau. Wolf/Skins extraction pattern is not viable.

**Status:** ✓ confirmed — extraction must use an alternative path

---

### NE7 — Monetary event types (what carries points?)

**Finding from events.ts + aggregate.ts reduceEvent:**

| Event | Has `points`? | byBet key | netByPlayer? |
|---|---|---|---|
| `NassauHoleResolved` | ✗ | — | ✗ |
| `NassauHoleForfeited` | ✗ | — | ✗ |
| `PressOffered` | ✗ | — | ✗ |
| `PressOpened` | ✗ | — | ✗ |
| `PressVoided` | ✗ | — | ✗ |
| `MatchTied` | ✗ | — | ✗ (GR7 informational) |
| `MatchClosedOut` | ✓ (`WithPoints & WithBet`) | `${declaringBet}::${matchId}` | ✓ |
| `NassauWithdrawalSettled` | ✓ (`WithPoints & WithBet`) | `${betId}::${matchId}` | ✓ |

Only `MatchClosedOut` and `NassauWithdrawalSettled` contribute to `netByPlayer`.

**Status:** ✓ confirmed

---

### NE8 — byBet[game.id] viable for ledger extraction?

**Finding:** No. See NE6. Compound keys mean `result.byBet[game.id]` is `undefined`. The `??{}` fallback would silently zero all payouts — a silent wrong-answer bug, not a safe fallback.

**Status:** ✗ NOT viable — explicit rule: do not use `byBet[game.id]` for Nassau

---

### NE9 — Alternative extraction path

**Finding:** `result.netByPlayer` accumulates every monetary event across the entire log. In `computeGamePayouts`, the log is built from a single bet's events only (one `case 'nassau'` call handles one `game`). Therefore `result.netByPlayer` == this Nassau bet's total net deltas.

**Proposed extraction:**
```typescript
return payoutMapFromLedger(result.netByPlayer, game.playerIds)
```
`payoutMapFromLedger` already handles the ledger → PayoutMap shape. No new utility needed.

**Safety check:** `computeGamePayouts` is called once per game instance (outer loop in `computeAllPayouts`). The log assembled in the `case 'nassau'` block contains only events from `settleNassauBet(holes, players, game)` for that specific game. No cross-bet contamination.

**Status:** ✓ `result.netByPlayer` is safe and correct

---

### NE10 — Existing test coverage (bridge-level baseline)

**Finding:** `src/bridge/nassau_bridge.test.ts` — comprehensive bridge coverage exists. The orchestration tests to be written (NP1–NP10) test the payouts.ts dispatch layer, not the bridge internals. No bridge test changes needed.

**Status:** ✓ confirmed — bridge tests unchanged; payouts.ts tests are additive

---

## Summary of divergences from Wolf/Skins template

| Aspect | Wolf/Skins | Nassau |
|---|---|---|
| Bridge return `.ledger`? | Yes (`{ events, ledger }`) | No — `.payouts: PayoutMap` (discarded post-cutover) |
| `buildNassauCfg` already exported? | Skins required export patch | Yes — no bridge change |
| byBet key shape | Simple `betId` | Compound `${betId}::${matchId}` |
| Extraction path | `result.byBet[game.id] ?? {}` | `result.netByPlayer` |
| `??{}` fallback viable? | Yes — safe zero-event fallback | No — would silence wrong payouts |
| Finalizer location | Bridge only | Bridge + aggregateRound no-op (safe) |

---

## Decision required before Plan

**D-1: netByPlayer extraction** — confirmed viable (single-bet log, no cross-bet contamination).  
No alternatives needed; `result.netByPlayer` is unambiguous.

**No open decisions.** Plan may proceed.
