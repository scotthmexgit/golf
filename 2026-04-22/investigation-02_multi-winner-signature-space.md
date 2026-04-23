# Multi-winner signature decision space

Context: §5/§6 contradiction affects Sandy, Barkie, Polie, Arnie (Class A) and Longest Drive (Class B).
See `investigation-01` for the contradiction analysis.

This document maps the design space. No decision is made here — it is enumerated for user review.

---

## The problem in one sentence

§5 detection functions return `PlayerId | null` (null on ties), but §6 requires tied winners to collect.
To implement §6, either the return type must change, or the dispatch layer above it must change.

---

## Option A — keep `PlayerId | null`; tie = no award (current §5 semantics)

**Implementation**: no change to signatures. `candidates.length === 1 ? candidates[0] : null` stands.
**Settlement**: tied sandy = zero award to anyone.
**Trades off**: violates §6 "all tied winners collect" for Class A kinds.
**Advantage**: no type changes, no test fixture changes.
**Use case**: acceptable only if §6 is intentionally overridden by a house-rule flag.
**Verdict**: violates the rule file as written.

---

## Option B — change detection functions to return `PlayerId[]`

**Implementation**: `isSandy`, `isBarkie`, `isPolie`, `isArnie`, and `isLongestDrive` return `PlayerId[]`.
- Empty array = no award.
- One-element array = sole winner.
- Multi-element array = tied winners (each collects per §6).

**`HoleState` changes required**:
- `longestDriveWinner: PlayerId | null` → `longestDriveWinners: PlayerId[]`
- `ctpWinner: PlayerId | null` — not changed (CTP = single winner, see §5)
- Sandy/Barkie/Polie/Arnie: input to detection is `hole.gross`, `hole.bunkerVisited`, `hole.putts`, `hole.inFairway` — no new HoleState fields needed, but `makeHole` fixture needs `bunkerVisited` parameter support

**`settleJunkHole` changes required**:
- New dispatch path for multi-winner kinds
- `pushAward` (single-winner) cannot be reused; need `pushMultiAward` or per-winner loop
- Zero-sum invariant: in tied sandy (2 winners, N-2 losers), each winner collects from each loser; math must still be integer-unit and zero-sum

**`settleJunkHole` zero-sum with multi-winner**:
- K winners, N participants total, N-K losers
- Each winner receives: `(N - K)` points (one from each loser)
- Each loser pays: `-K` points (one to each winner)
- Check: K*(N-K) + (N-K)*(-K) = 0 ✓ Zero-sum holds regardless of K.

**Advantage**: mechanically correct per §6; test structure is clear.
**Disadvantage**: breaking change to `HoleState` type; all consumers of `longestDriveWinner` must be audited; test fixtures must add `bunkerVisited` parameter.

---

## Option C — keep `PlayerId | null`; add multi-winner dispatch layer above settleJunkHole

**Implementation**: detection functions unchanged. Add `isSandyCandidates` (returns `PlayerId[]`) alongside the existing `isSandy`. `settleJunkHole` calls `isSandyCandidates` instead of `isSandy` for settlement.

**Advantage**: preserves `PlayerId | null` shape for external consumers that depend on it; no HoleState changes.
**Disadvantage**: parallel function pairs are confusing; the `PlayerId | null` versions become dead code for settlement; rule-file §5 describes only the single-result form.

---

## Option D — per-kind tie rules via config (`tieRule: 'cancel' | 'all-collect'`)

**Implementation**: add `sandyTieRule` (and similar) to `JunkRoundConfig`. Settlement branches on the rule.
**Advantage**: supports house rules; matches `ctpTieRule` precedent.
**Disadvantage**: §6 is not ambiguous — "all tied winners collect" is stated unconditionally for Sandy/Barkie/Polie/Arnie. Adding a `cancel` option invites incorrect configuration.
**Note**: §6 does have a tie-rule slot for CTP (`ctpTieRule: 'groupResolve' | 'carry'`), so the pattern exists. But CTP tie rules govern *who wins* (resolved to one winner), not *whether multiple winners collect*.

---

## Option E — array only for multi-winner kinds; keep PlayerId|null for single-winner kinds

**Implementation**: split the type:
- `isCTP`, `isGreenie` → `PlayerId | null` (unchanged)
- `isSandy`, `isBarkie`, `isPolie`, `isArnie`, `isLongestDrive` → `PlayerId[]`

**Advantage**: preserves CTP/Greenie unchanged; accurately models the rule-file distinction.
**Disadvantage**: the seven detection functions now have two different return types; `settleJunkHole` needs two dispatch paths.

---

## Recommended option for user decision

**Option E** is the most accurate to the rule file:
- CTP and Greenie are single-winner by rule; `PlayerId | null` is correct.
- Sandy/Barkie/Polie/Arnie are multi-winner by §6; `PlayerId[]` is correct.
- Longest Drive is multi-winner by §6; `PlayerId[]` is correct.

Option B is a close second (simpler: all detection functions return `PlayerId[]`, including CTP/Greenie with guaranteed length ≤ 1 for those two).

**The user must pick before Phase 2 of Turn 4 (isSandy) can proceed.**

---

## Impact on HoleState if Option E or B is chosen

| Field                  | Current type        | Required type       | Breaking? |
|------------------------|---------------------|---------------------|-----------|
| `longestDriveWinner`   | `PlayerId \| null`   | `PlayerId[]`        | Yes       |
| `ctpWinner`            | `PlayerId \| null`   | unchanged           | No        |
| `bunkerVisited`        | `Record<PlayerId,boolean>` | unchanged    | No (exists) |

`bunkerVisited` already exists in `HoleState` (zero-initialized in `makeHole` factory).
`makeHole` test fixture needs a `bunkerVisited` parameter to set non-zero values in Sandy tests.
