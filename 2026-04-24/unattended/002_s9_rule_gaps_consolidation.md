# Pass 2 — §9 rule gaps consolidation (Match Play)

Date: 2026-04-24  
Status: COMPLETE — no halt

---

## 1. game_match_play.md §9 verbatim (full section)

```markdown
## 9. Edge Cases

- **Missing score** — the team with a missing scorecard entry forfeits that hole. Emit `HoleForfeited`. For `best-ball`, see the partial-miss clarification in § 5: a team forfeits only when ALL members have missing scores; a single valid score is used as the team's best-ball net.
- **Concession** — conceding a hole is equivalent to losing it; emit `ConcessionRecorded` with the conceded unit (`'hole' | 'stroke' | 'match'`). See § 7 for concession input API and closeout event ordering.
- **Conceded match** — `ConcessionRecorded` with `unit: 'match'` ends the match immediately with `delta` in favor of the recipient. Remaining holes do not score.
- **Closeout on the final scheduled hole** — emitting `MatchClosedOut` and reaching `holesToPlay` are identical outcomes; emit both events to keep the audit trail unambiguous.
- **Invalid team configuration** — `format !== 'singles'` without a valid `teams` array: scoring refuses to start; emit `MatchConfigInvalid`. See § 4 for the full validation contract.
- **Team with a 1-player gap** (e.g. partner withdraws) — team's score on subsequent holes is the remaining player's net. Emit `TeamSizeReduced`.
```

---

## 2. game_match_play.md §5 relevant sections (verbatim)

### Partial-miss clarification (lines 97–105):

```markdown
**Best-ball partial miss clarification:**

Existing § 5 `holeWinner` pseudocode (lines above): the `teamNet` function for `best-ball` calls `Math.min(...side.map(pid => state.gross[pid] - strokesOnHole(...)))`. This naturally handles partial availability:

- If one partner has a missing gross score and the other has a valid score, the team uses the available partner's score. A single valid score is vacuously the best available net — it is as if `Math.min` is called over a one-element array.
- Only if **all** team members have missing gross scores does the team forfeit the hole. See § 9 for the `HoleForfeited` event.

This applies to `format: 'best-ball'` only.
```

### Hole concession (§7 lines 144–151, referenced by §9):

```markdown
**Hole concession engine contract (`'hole'`):**

When `state.conceded` is non-empty, `settleMatchPlayHole` inspects it before invoking `holeWinner`:

- **Singles:** if the conceding player is `cfg.playerIds[1]` (side 2), hole outcome is `'team1'`; if `cfg.playerIds[0]` (side 1), `'team2'`. Net scores are not compared.
- **Best-ball (per-player):** the conceding player's ball is excluded from the team's `bestNet` computation — treated identically to a missing gross score per the § 5 partial-miss rule. If **all** members of a team are in `state.conceded`, the team forfeits the hole (`HoleForfeited`). If only one member concedes, the partner's score stands.
```

### TeamSizeReduced (§9 last bullet):

```markdown
**Team with a 1-player gap** (e.g. partner withdraws) — team's score on subsequent holes is the remaining player's net. Emit `TeamSizeReduced`.
```

---

## 3. Current code behavior — per case

### Case 1: Mutual forfeit (both sides missing gross)

**Trace through `settleMatchPlayHole` (match_play.ts):**

1. Concession check (line 278): `hole.conceded.length > 0` — false. No concession. Continue.
2. `getMissingScoreForfeit(hole, cfg)` called (line 317).

In `getMissingScoreForfeit` (match_play.ts:223–241):

```typescript
// singles:
const p0Missing = hole.gross[cfg.playerIds[0]] === undefined
const p1Missing = hole.gross[cfg.playerIds[1]] === undefined
if (p0Missing && !p1Missing) return { forfeiter: cfg.playerIds[0], winner: 'team2' }
if (!p0Missing && p1Missing) return { forfeiter: cfg.playerIds[1], winner: 'team1' }
return null   // both missing → returns null
```

```typescript
// best-ball:
const team1AllMissing = cfg.teams![0].every((p) => hole.gross[p] === undefined)
const team2AllMissing = cfg.teams![1].every((p) => hole.gross[p] === undefined)
if (team1AllMissing && !team2AllMissing) return ...
if (!team1AllMissing && team2AllMissing) return ...
return null   // both teams all-missing → returns null
```

**Both-sides-missing: returns `null`.**

3. `forfeit` is null → forfeit path not taken.
4. Falls through to `holeWinner(hole, cfg)` (line 346).

In `holeWinner` → `bestNet` (match_play.ts:98–105):

```typescript
const valid = pids.filter(
  (p) => state.gross[p] !== undefined && !state.withdrew.includes(p),
)
return valid.length === 0
  ? Infinity
  : Math.min(...)
```

Both sides have no gross → both return `Infinity`.

Back in `holeWinner` (lines 109–111):

```typescript
if (netA < netB) return 'team1'
if (netB < netA) return 'team2'
return 'halved'   // Infinity === Infinity → halved
```

**Result: `HoleHalved` emitted. No `HoleForfeited` from either side.**

**Rule gap**: §9 says "the team with a missing scorecard entry forfeits that hole" — only specifies single-side forfeiture. The mutual case is not addressed. Current behavior (halved by Infinity fall-through) is plausible but undocumented.

---

### Case 2: Mutual partner withdrawal (best-ball, both players on one team withdrew)

**Two sub-cases based on whether gross scores are present:**

#### Sub-case 2a: Both team members withdrew AND have no gross score

- `getMissingScoreForfeit` sees `team1AllMissing = true` (gross undefined) and `team2AllMissing = false`
- Returns `{ forfeiter: teams[0][0], winner: 'team2' }` → `HoleForfeited` emitted
- Forfeit path returns early (match_play.ts:317–343)
- `hole.withdrew` check at lines 352–373 is **never reached**
- **`TeamSizeReduced` is dropped**

#### Sub-case 2b: Both team members withdrew but HAVE gross scores

1. `getMissingScoreForfeit`: `team1AllMissing = false` (gross present, even though withdrew) → returns `null`
2. `holeWinner` called. `bestNet` for team 1: `valid = pids.filter(p => gross[p] !== undefined && !withdrew.includes(p))` → both filtered by withdrew → `valid.length === 0` → returns `Infinity`
3. Team 2 has finite bestNet → `netA > netB` → `holeWinner` returns `'team2'`
4. `updatedMatch = advanceMatch(match, 'team2', cfg.holesToPlay)`
5. Phase 4d `TeamSizeReduced` block (match_play.ts:352–373):
   ```typescript
   if (cfg.format === 'best-ball' && hole.withdrew.length > 0) {
     for (const wid of hole.withdrew) {
       // ... find teamId ...
       events.push({ kind: 'TeamSizeReduced', ..., teamId, remainingSize: 1 })
     }
   }
   ```
   - Both withdrew players loop through → **two `TeamSizeReduced` events emitted**, both with `remainingSize: 1`
   - `remainingSize: 1` is wrong when both players withdrew (correct value is 0)
6. `HoleResolved` emitted (line 377) with `winner: 'team2'`

**Result**: `HoleResolved` (not `HoleForfeited`) + two `TeamSizeReduced` with wrong `remainingSize`.

**Rule gap**: §9 says "Team with a 1-player gap ... Emit `TeamSizeReduced`" — implies 1 player remaining. When 0 players remain (full team withdrawal), the rule is silent. The "missing score → HoleForfeited" rule doesn't fire when withdrew players still have gross scores.

---

### Case 3: Concession + withdrawal overlap

**Trace when `hole.conceded = [playerB]` and `hole.withdrew = [playerC]` (on same hole)**:

1. Concession check (match_play.ts:278): `hole.conceded.length > 0` → true
2. Concession path executes, emits `ConcessionRecorded`, potentially `MatchClosedOut`
3. **Returns early at match_play.ts:313**: `return { events: concededEvents, match: updatedConcededMatch }`
4. Lines 352–373 (`TeamSizeReduced` block) are **never reached**
5. **`TeamSizeReduced` is dropped entirely**

**Rule gap**: §9 says "Team with a 1-player gap — Emit `TeamSizeReduced`." §7 says "When `state.conceded` is non-empty, `settleMatchPlayHole` inspects it before invoking `holeWinner`." Neither section addresses what happens when concession and withdrawal occur on the same hole. The `TeamSizeReduced` event for a partner withdrawal is silently dropped.

---

## 4. Cross-references — are these three cases related?

**Shared mechanism (Cases 1 and 2)**: `getMissingScoreForfeit` handles only single-side forfeit (one side missing, other present). When both sides have an invalid state, it returns `null` and code falls through to `holeWinner` which uses `Infinity` for teams with no valid players. Infinity vs Infinity → halved; finite vs Infinity → normal winner.

**Shared mechanism (all three cases)**: `TeamSizeReduced` emission lives in a single code block (lines 352–373) that is only reached in the "normal path" (not forfeit path, not concession path). Any early return before line 352 drops `TeamSizeReduced`.

**Connecting pattern**: The three cases are variations on "early-return path bypasses `TeamSizeReduced`" or "getMissingScoreForfeit is unaware of withdrew state." The root is that `TeamSizeReduced` is tightly coupled to the normal-path HoleResolved flow, rather than being emitted independently of hole outcome.

**Case 1 (mutual forfeit) is independent of the other two** — it's a documentation/rule gap, not a code structure gap. The behavior is consistent with the `Infinity → halved` pattern from §5 partial-miss.

---

## 5. What a unified rule decision would need to cover

A documenter/rules pass closing all three gaps needs to decide:

1. **Mutual forfeit rule (Case 1)**:
   - Option (a): Current behavior is correct — both teams forfeit → hole is halved. Add explicit rule to §9.
   - Option (b): Mutual forfeit is treated as "void hole" — no HoleHalved, match doesn't advance. New rule + event.
   - Option (c): Emit HoleForfeited for BOTH sides (two events). Semantics: who "won" if both forfeit? Ambiguous.

2. **Mutual partner withdrawal with gross scores (Case 2b)**:
   - Option (a): Treat as implicit forfeit — emit `HoleForfeited` (overriding `HoleResolved`) when all team members withdrew.
   - Option (b): Current behavior correct — team with all withdrew has Infinity bestNet, loses the hole. `HoleResolved` is fine. Just fix `remainingSize` to 0 and emit only one `TeamSizeReduced` per team.
   - Option (c): Rule mandates that a team must have at least 1 active player; if all withdrew, treat identically to all-missing-gross.

3. **`TeamSizeReduced` emission timing (Cases 2 and 3)**:
   - Option (a): `TeamSizeReduced` is independent of hole outcome — emit it always if `withdrew.length > 0`, regardless of forfeit/concession path.
   - Option (b): `TeamSizeReduced` only makes sense on the normal path — don't emit it on forfeit/concession holes.
   - Note: §9 says "on subsequent holes" — `TeamSizeReduced` is a state-change notification, not a hole-outcome event. This suggests Option (a): it fires whenever a withdrawal occurs, regardless of how that hole scored.

---

## 6. Cross-engine impact

**Nassau**: `settleNassauHole` in nassau.ts has its own missing-score/withdrawal logic (via `withdrawnPlayers` param and `NassauWithdrawalSettled`). Does not call `settleMatchPlayHole`. Not directly affected by these three gaps.

**Skins, Wolf, Stroke Play**: independent engines. Not affected.

**aggregate.ts**: If `HoleForfeited` behavior changes (Case 1 or 2), `buildMatchStates` in aggregate.ts handles `HoleForfeited` via the `NassauHoleForfeited` branch — that's for Nassau, not Match Play. Match Play `HoleForfeited` is not threaded in `buildMatchStates`; it's only handled in `reduceEvent` where it hits `default: break` (bookkeeping, no money). No monetary impact.

**Verifier**: If invariant 9 ("state-transition consistency") checks that MatchClosedOut matches the holesUp trajectory from buildMatchStates, and if a mutual-forfeit hole currently produces `HoleHalved` but should produce something else, the verifier would catch the discrepancy after the rule decision is made. No current verifier work is unblocked or blocked by these gaps.

---

## Summary

| Case | Current behavior | Rule gap | Code change needed |
|---|---|---|---|
| 1. Mutual forfeit | `HoleHalved` (Infinity→halved) | §9 silent on mutual case | None (behavior may be correct — needs rule decision) |
| 2a. Mutual withdrawal, no gross | `HoleForfeited`, no `TeamSizeReduced` | TeamSizeReduced dropped on forfeit path | Code: emit `TeamSizeReduced` before forfeit path returns |
| 2b. Mutual withdrawal, has gross | `HoleResolved` + 2× `TeamSizeReduced` (remainingSize:1 wrong) | Not `HoleForfeited`; remainingSize wrong | Code: emit only 1 `TeamSizeReduced` per team with correct count; rule: clarify if `HoleForfeited` should fire |
| 3. Concession + withdrawal | `ConcessionRecorded`, no `TeamSizeReduced` | TeamSizeReduced dropped on concession early-return | Code: emit `TeamSizeReduced` before concession path returns |

**No cross-engine impact. No halt.**
