---
prompt_id: SP1
timestamp: 2026-04-25T18:20:00Z
checklist_item_ref: "SP-1 — Stroke Play Rule Doc Check"
tags: [sp1, documenter, rule-doc-check, stroke-play]
---

## Prompt

SP-1 verification pass: confirm `docs/games/game_stroke_play.md` is consistent with Option α Minimal scope. No doc edits in this prompt. Cross-check against `src/games/stroke_play.ts` and `src/games/__tests__/stroke_play.test.ts`.

## Action

Read `docs/games/game_stroke_play.md` in full (all 11 sections). Read `src/games/stroke_play.ts` in full. Read `src/games/__tests__/stroke_play.test.ts` in full. Read `src/games/types.ts` (StrokePlayCfg definition, lines 82–94). Read `src/games/events.ts` (Stroke Play event types, lines 204–249). Grep `src/games/aggregate.ts` to verify §11 dispatch-ownership claim.

---

## Section-by-section verification

### §1 Overview — **Consistent** ✓

"Stroke Play totals every player's strokes over the round and ranks the field by lowest total. Betting settles under one of three modes: winner-takes-pot, per-stroke, or places. Ties resolve under one of three modes: split, card-back, or scorecard-playoff. This file specifies Stroke Play for 2–5 players; `src/games/stroke_play.ts` is the authority on behavior."

All claims accurate. Doc correctly covers the full engine scope; Option α Minimal restricts the v1 UI, not the rule doc.

---

### §2 Players & Teams — **Consistent** ✓

"Minimum 2 players, maximum 5. No teams."

Engine validates: `cfg.playerIds.length < 2 || cfg.playerIds.length > 5 → StrokePlayConfigError`. Consistent.

Handicap formula (`strokesOnHole(strokes, holeIndex)` when `appliesHandicap === true`) matches `netFor()` in the engine.

---

### §3 Unit of Wager — **Consistent** ✓

All three settlement modes' payoff formulas match engine implementations:
- `winner-takes-pot`: `points[winner] = stake * (N−1)` ✓
- `per-stroke`: pairwise `diff * stakePerStroke` ✓
- `places`: `placesPayout[rank] - stake` ✓
- "Multipliers: none" ✓

---

### §4 Setup — **Minor inconsistency (non-blocking)**

**Finding 1 — Interface name mismatch:** Doc shows `interface StrokePlayConfig`. Actual TypeScript type is `StrokePlayCfg` (defined in `src/games/types.ts:82`). The pseudocode name is illustrative but could mislead a reader searching for the type.

**Finding 2 — Missing `id` field:** Actual `StrokePlayCfg` (types.ts:82) has `id: BetId` as its first field. Doc's `StrokePlayConfig` does not include it. The engine relies on this field in `findBetId()` via `b.id === cfg.id`. This is a silent gap — the doc's config interface is incomplete.

All other fields match (stake, settlementMode, stakePerStroke, placesPayout, tieRule, cardBackOrder, appliesHandicap, playerIds, junkItems, junkMultiplier) — both union values and types are consistent.

`tieRule` default: doc says `'card-back'`; Option α Minimal spec says `'split'` is the v1 primary. These are not in conflict — doc describes the engine's conventional default; Option α restricts the UI to `'split'`. Not a doc inconsistency.

---

### §5 Per-Hole Scoring — **Minor inconsistency (non-blocking)**

**Finding 3 — Function name:** Doc pseudocode names the function `recordStrokePlayHole`. Engine exports `settleStrokePlayHole`. Illustrative pseudocode, but the name difference could confuse. The per-hole function in the engine is `settleStrokePlayHole(hole, config, roundCfg): ScoringEvent[]`.

**Finding 4 — Return type:** Doc pseudocode returns `ScoringEvent` (singular). Engine returns `ScoringEvent[]` because `settleStrokePlayHole` can emit both `IncompleteCard` (for a missing gross) and `StrokePlayHoleRecorded` for a single hole call. The plural is necessary. Pseudocode is simplified.

**Finding 5 — Phantom `delta` field:** Doc pseudocode includes `delta: zero(cfg.playerIds)` in the `StrokePlayHoleRecorded` return. The actual `StrokePlayHoleRecorded` event type (`events.ts:204–208`) has no `delta` field — only `hole: number` and `nets: Record<PlayerId, number>`. The field does not exist in the emitted event. This is a phantom field in the pseudocode.

`IncompleteCard` is correctly placed in §9 rather than §5 — consistent with engine behavior (IncompleteCard fires from `settleStrokePlayHole` but represents an edge case, not normal-path output).

---

### §6 Tie Handling — **Consistent** ✓

All three tie modes are specified and match engine behavior:
- `split`: loser-pot division, lowest-playerId absorber for remainder → matches `winnerTakesPotPoints()` exactly ✓
- `card-back`: `cardBackOrder` segment walk → matches `resolveTieByCardBack()` ✓
- `scorecard-playoff`: cardBackOrder then hole-by-hole 18..1 → matches `resolveTieByScorecardPlayoff()` ✓
- `TieFallthrough` payload (`from`, `to: 'split'`) → matches all emission sites ✓
- `TieFallthrough` for direct-split path (`from: 'split'`) is documented in §6 and §11. Engine emits it in `emitSplitSettlement()` with `skipFallthrough=false` (no upstream tiebreaker). Consistent with MIGRATION_NOTES #15 ✓
- Final Adjustment screen referenced for truly irresolvable ties ✓

---

### §7 Press & Variants — **Consistent** ✓

"No press mechanic" — engine has no press code ✓. Variants summary consistent with §3/§8.

---

### §8 End-of-Round Settlement — **Consistent** ✓

All three settlement mode pseudocode blocks match engine logic. `places` tie-cluster iterative resolution matches `breakTieForPlaces()`. Zero-sum proofs are correct for all three modes.

---

### §9 Edge Cases — **Phantom feature (non-blocking)**

Cases 1–5 are implemented and consistent with the engine.

**Finding 6 — Phantom withdrawal spec:** Final bullet: "Player withdraws mid-round — withdrawing player is excluded from final rankings; remaining players settle per `settlementMode`. The withdrawn player's `stake` ante (in `places` mode) is redistributed: add `stake` evenly back to remaining players; remainder routes to `RoundingAdjustment`."

The engine has no mid-round withdrawal detection. `settleStrokePlayHole` checks only `gross <= 0` for IncompleteCard — it does not check `hole.withdrew`. A withdrawn player who records no gross scores would naturally receive `IncompleteCard` via the existing path, but the `places`-mode stake redistribution specified here is not implemented. This is a phantom specification.

**Operator note (this session):** "i don't think it is worth the effort to contemplate mid-round withdrawal." The withdrawal spec in §9 can be removed or replaced with a one-line note pointing to IncompleteCard as the handling mechanism. This is a follow-on documenter task; not a SP-2 blocker.

---

### §10 Worked Example — **Consistent (informational)** ✓

Example uses `tieRule = 'card-back'` (outside Option α primary of `'split'`). Acceptable per prompt guidance — the worked example covers the full engine; it doesn't contradict Option α. All four scenarios (outright win, per-stroke, places, card-back tie) are arithmetically correct and match engine behavior.

---

### §11 Implementation Notes — **Two inaccuracies (non-blocking)**

**Finding 7 — Import path for `ScoringEvent`:** "Imports `strokesOnHole` from `src/games/handicap.ts` and `ScoringEvent` from `src/games/events.ts`." The engine (`stroke_play.ts:29–36`) imports `ScoringEvent` from `'./types'`, not `'./events'`. `./types` re-exports from `./events`, so this is technically equivalent at runtime, but the stated import path is inaccurate.

**Finding 8 — tieRule dispatch ownership:** "aggregate.ts owns the `tieRule` dispatch." Confirmed incorrect by grep. `aggregate.ts:370–377` simply calls `finalizeStrokePlayRound(strokeEvents, bet.config)`. The tieRule dispatch — all branching on `config.tieRule`, all calls to `resolveTieByCardBack` / `resolveTieByScorecardPlayoff` / `emitSplitSettlement` — is entirely inside `stroke_play.ts`. `aggregate.ts` is the caller, not the dispatcher.

Emitted events list is complete and accurate: `StrokePlayHoleRecorded`, `StrokePlaySettled`, `CardBackResolved`, `ScorecardPlayoffResolved`, `TieFallthrough`, `RoundingAdjustment`, `IncompleteCard`, `FieldTooSmall` — all verified in `events.ts` and `STROKE_EVENT_KINDS` set in the engine ✓.

`TieFallthrough` payload description matches the event type and all emission sites ✓.

---

### §12 Test Cases — **Incomplete test inventory (non-blocking)**

§12 lists 7 test cases. The test file contains 16 test describes. All 7 §12 cases have corresponding test coverage ✓:

| §12 case | Test describe | Status |
|---|---|---|
| Test 1 — Worked example | `§ 10 Worked Example verbatim` | ✓ |
| Test 2 — Per-stroke | `settlementMode = per-stroke` | ✓ |
| Test 3 — Places | `settlementMode = places` | ✓ |
| Test 4 — Card-back resolution | `tieRule = card-back — back-9 segment separates` | ✓ |
| Test 5 — Tie-fallthrough | `tieRule = card-back — every segment tied → TieFallthrough` | ✓ |
| Test 6 — Incomplete card | `§ 12 Test 6: incomplete card` | ✓ |
| Test 7 — places validation | `§ 12 Test 7: placesPayout sum mismatch` | ✓ |

Tests 8–16 in the file have no §12 entries: direct-split TieFallthrough ordering (8), RoundingAdjustment 3-way-5-player (9), card-back back-6 multi-segment (10), scorecard-playoff (11), Round Handicap integration (12), config error throwing (13), event ordering MIGRATION_NOTES #15 (14), FieldTooSmall 3-of-4 miss (15), `resolveTieByCardBack` helper pure (16).

**Finding 9 — Incomplete §12:** Notably, `tieRule = 'scorecard-playoff'` (Test 11) is implemented and tested but has no §12 entry. Same for FieldTooSmall (Test 15) and RoundingAdjustment (Test 9 in the file).

Not a blocker for SP-2. A §12 expansion is a separate documenter task.

---

## Engine cross-check summary

| Claim | Source | Verdict |
|---|---|---|
| `StrokePlayCfg` fields match §4 | types.ts:82–94 | ✓ except `id: BetId` omitted from doc |
| `settleStrokePlayHole` behavior matches §5 | stroke_play.ts:158–195 | ✓ (pseudocode illustrative) |
| `finalizeStrokePlayRound` behavior matches §8 | stroke_play.ts:210–293 | ✓ |
| tieRule dispatch in `aggregate.ts` (§11 claim) | aggregate.ts:370–377 | **Incorrect** — dispatch is in stroke_play.ts |
| All 8 event types exist in events.ts | events.ts:204–249, 241–249 | ✓ |
| `IncompleteCard` excludes player from scoringSet | stroke_play.ts:247–253 | ✓ |
| `FieldTooSmall` on scoringSet.length < 2 | stroke_play.ts:266–272 | ✓ |
| `places` config validation (sum, length, integers) | stroke_play.ts:93–113 | ✓ |

---

## Phantom features

| # | Location | Description |
|---|---|---|
| P1 | §9 last bullet | Mid-round withdrawal stake redistribution — engine has no implementation; operator confirmed withdrawal is out of scope |
| P2 | §5 pseudocode | `delta: zero(cfg.playerIds)` field — `StrokePlayHoleRecorded` event type has no `delta` field |

---

## Silent gaps

| # | Location | Description |
|---|---|---|
| S1 | §4 | `id: BetId` field in `StrokePlayCfg` not documented |
| S2 | §11 | tieRule dispatch is in `stroke_play.ts`, not `aggregate.ts` as stated |
| S3 | §12 | Tests 8–16 (including scorecard-playoff, FieldTooSmall, RoundingAdjustment) not listed in §12 |

---

## Noticed but out of scope

- §11 references `/tmp/round-4-notes.md` for divergence logging. This is a stale developer artifact path; unrelated to correctness.
- §11 cardBackOrder 9-hole note ("A full 9-hole round uses `[3, 1]` by convention") — 9-hole rounds are outside Option α scope. Informational in the doc; harmless.

---

## SP-2 pre-check: HoleState fields consumed

Per the engine, `settleStrokePlayHole` reads the following HoleState fields:

| Field | Usage |
|---|---|
| `hole.hole` | Event `hole` field |
| `hole.holeIndex` | `strokesOnHole(strokes, holeIndex)` when handicap applies |
| `hole.timestamp` | `base.timestamp` |
| `hole.gross[pid]` | Missing-score check (`<= 0`) and net calculation |
| `hole.strokes[pid]` | Handicap calculation (`strokesOnHole`) |

All other HoleState fields (withdrew, conceded, pickedUp, ctpWinner, longestDriveWinners, bunkerVisited, etc.) are **not read** by the Stroke Play engine. SP-2's builder only needs to populate these 5 fields. Consistent with STROKE_PLAY_PLAN.md §2 mapping (5 live, 14 stubbed). ✓

---

## Operator decision needed

**No.** None of the 9 findings require a rule-doc fix before SP-2 starts. All are documentation polish or phantom features that post-date the engine design. SP-2 can proceed against the existing rule doc and engine with confidence.

Optional follow-on documenter tasks (separate from SP-1 closure):
1. §4: Add `id: BetId` to the config interface display (S1).
2. §5: Update pseudocode name to `settleStrokePlayHole`, return type to `ScoringEvent[]`, remove phantom `delta` field (Findings 3–5).
3. §9: Replace withdrawal bullet with "handled via IncompleteCard (withdrawal is out of scope per operator decision 2026-04-25)" (P1, F6).
4. §11: Correct import path to `./types`; correct dispatch ownership to `stroke_play.ts` (Findings 7–8).
5. §12: Add test cases for Tests 8–16 (S3).

None of these gate SP-2.

---

## Result

- **SP-1 status: Closes.** No blocking findings.
- **Files touched:** none (read-only verification pass)
- **Verification artifact:** this file
