# SOD Review — 25 April 2026

Golf bet-tracking app. Researcher pass only — no code edits, no doc edits, no checklist edits.

---

## Section 1 — EOD Log Review

### 1.1 Prior session evidence

The most recent EOD files are not accessible as flat files in `/home/seadmin/golf/` under the naming patterns tried (EOD_24-April-2026.md, EOD-FINAL_24-April-2026.md, 2026-04-24/EOD-FINAL_2026-04-24.md). The dated sub-folder `/home/seadmin/golf/2026-04-24/` exists as a directory but its contents are not reachable via the Read tool when running from the superecon working directory. All evidence below is sourced from `IMPLEMENTATION_CHECKLIST.md` (read in full), `REBUILD_PLAN.md` (lines 1–50), and the engine source and test files directly.

### 1.2 Design timeline status

| Phase | Checklist claim | Tree evidence |
|---|---|---|
| 1. Audit | done 2026-04-20 | `AUDIT.md` present — VERIFIED |
| 2. Rebuild plan | done 2026-04-20 | `REBUILD_PLAN.md` present — VERIFIED |
| 3–8. Targeted rebuild | all closed per Done section | All five engine files plus `aggregate.ts` and `junk.ts` present with correct exports — VERIFIED |

### 1.3 Active item at EOD: #8 aggregate.ts closed 2026-04-24

Checklist claims #8 closed with 292 tests.

- `src/games/aggregate.ts` present and complete; exports `aggregateRound`, `buildMatchStates`, `ZeroSumViolationError` — VERIFIED (`aggregate.ts:337`, `aggregate.ts:170`, `aggregate.ts:33`).
- `src/games/__tests__/aggregate.test.ts` present; Phase 1 (Junk formula, purity), Phase 3 Iter 1 (Nassau/MP MatchState threading), Phase 3 Iter 2 (finalizer tests), ZeroSumViolationError throw test confirmed — VERIFIED.
- 292 test count: not independently verified (test runner not invoked from this researcher pass).
- All five game finalizers invoked from `aggregateRound` loop — VERIFIED (`aggregate.ts:357–383`).

### 1.4 Verifier pre-scope

Checklist Active item: `src/verify/verifyRound.ts`. Status: pre-scope, no engineer work until scope written. No file at `src/verify/` — consistent with pre-scope status — VERIFIED.

### 1.5 Closed-without-evidence check

- **#5 Nassau** (closed 2026-04-22): `nassau.ts` ships all claimed exports. `nassau.test.ts` covers §10 worked example, press rules, closeout, withdrawal — VERIFIED.
- **#6 Match Play** (closed 2026-04-24): `match_play.ts` ships `settleMatchPlayHole`, `finalizeMatchPlayRound`, `concedeMatch`. Phase 4d `TeamSizeReduced` emit block at `match_play.ts:352–373` present — VERIFIED.
- **#7 Junk Phase 2** (closed 2026-04-24): `junk.ts` ships `settleJunkHole` with CTP, Greenie, LD fan-out. Sandy/Barkie/Polie/Arnie stubs return null — VERIFIED (`junk.ts:66–77`).
- **#8 aggregate.ts** (closed 2026-04-24): `aggregate.ts` present with full Phase 1–4 scope. `ZeroSumViolationError` throw at `aggregate.ts:388–389` — VERIFIED.
- **Parking lot item: TeamSizeReduced regression** (IMPLEMENTATION_CHECKLIST.md line 93, added 2026-04-24): `match_play.ts:352–373` loop iterates `hole.withdrew` per-player, hardcodes `remainingSize: 1` on every iteration — bug confirmed present, unfixed — VERIFIED.

### 1.6 Pending items from prior sessions (selected from IMPLEMENTATION_CHECKLIST.md Parking Lot)

- **D1 — Nassau rule-file ambiguity** (line 42): `docs/games/game_nassau.md §5` pseudocode vs `§2` prose for pair-wise USGA allocation. Documenter pass needed. No doc change in tree.
- **Verifier round-state agent** (line 92): pre-scope, no file created. Expected.
- **TeamSizeReduced regression** (line 93): confirmed present at `match_play.ts:352–373`.
- **Supersession schema design** (line 87): `EventBase` has no `id` field; `ScoringEventLog.supersessions` has zero writers. Deferred as expected.
- **RoundingAdjustment dead schema** (line 88): `events.ts` retains the type; never emitted. Pending resolve-or-remove decision.
- **Finalizer calling-convention inconsistency** (line 91): `finalizeNassauRound` and `finalizeMatchPlayRound` return only new events; `finalizeStrokePlayRound` returns input events plus new events (`stroke_play.ts:263`). Confirmed unfixed.
- **junk.ts `hole.timestamp` null guard** (line 83): `pushAward` receives `hole.timestamp` (string in `HoleState`, not optional in `types.ts:HoleState`). Not a current runtime risk but worth noting before #7b.
- **Stroke play greenie bug** (line 73): all-birdie field shows nobody for stroke play. The resolve page (`src/app/scorecard/[roundId]/resolve/[hole]/page.tsx`) filtering logic is in the UI layer and could not be confirmed in this pass.

---

## Section 2 — Hole-by-Hole Bet Engine Stress Test

Test methodology: source-code tracing and test-file reading. The Vitest runner was not invoked (no Bash tool available in researcher pass). Behavioral claims are grounded in code traces with file:line citations; test existence is confirmed by direct file reads.

### 2.1 Skins (`src/games/skins.ts`, `docs/games/game_skins.md`)

#### (a) Standalone on a round

`skins.test.ts:159–258` implements the full §10 18-hole worked example via the `runRound` helper (`skins.test.ts:142–157`). The helper calls `settleSkinsHole` per hole in sequence, then `finalizeSkinsRound`. Assertions cover: net totals `{A:+15, B:+11, C:-13, D:-13}`, Σ=0, exactly 5 `SkinCarried` events (holes 2, 3, 10, 16, 17), one `SkinWon` per non-tied hole.

Two-phase pattern confirmed: `skins.ts:159–174` emits provisional `SkinWon` with `stake × losers.length`; `skins.ts:261–268` scales by `(1 + carryCount)` at finalize. Integer-safe because `carryStake` is always a whole-number multiple of `stake` (`skins.ts:259`).

#### (b) Combined with another active bet on the same round

`finalizeSkinsRound` partitions events by `SKINS_EVENT_KINDS` membership and `declaringBet` presence (`skins.ts:211–227`). Events not matching are placed in `passThrough` and concatenated to the result. No test runs Skins alongside Wolf or Nassau in a single `RoundConfig` through either `finalizeSkinsRound` or `aggregateRound`. The pass-through mechanism is correct by inspection but is an untested integration path.

#### (c) Hole-by-hole score entry

`settleSkinsHole` is stateless — reads only the supplied `HoleState`, emits provisional events without threading carry. `finalizeSkinsRound` sorts owned events by hole number before carry processing (`skins.ts:242–245`). Out-of-order submission to the event list would be handled correctly by the sort. No out-of-order entry test exists.

Score correction requires replacing the prior `SkinWon` or `SkinCarried` event in the log before calling `finalizeSkinsRound`. No helper for event replacement exists in the engine; this is a caller-level concern.

Mid-round bet activation is not supported. Config is locked at `RoundConfigLocked`.

#### Tie and carry boundaries per rule doc

Final-hole tie with `tieRuleFinalHole = 'split'`: covered by §10 worked example (hole 18, carry=2, A+B tie, C+D lose). All three modes (`split`, `carryover`, `no-points`) implemented at `skins.ts:311–347`. All-tied path (`losers.length === 0`) emits `SkinCarryForfeit` (`skins.ts:322–329`). Rule doc §6 explicitly describes this path; code matches.

`escalating = false`: tied hole emits `SkinVoid`, no carry (`skins.ts:177–183`). Tested in `skins.test.ts`.

### 2.2 Wolf (`src/games/wolf.ts`, `docs/games/game_wolf.md`)

#### (a) Standalone on a round

`wolf.test.ts` covers §10 worked example (4-player, 18 holes), Blind Lone, 5-player Lone, tied hole under `no-points`, missing decision. Captain rotation tests at `wolf.test.ts:336–370` verify the full 1–16 cycle for 4- and 5-player configurations.

#### (b) Combined with another bet

`finalizeWolfRound` partitions by `WOLF_EVENT_KINDS` and pass-through (`wolf.ts:285–303`). Same untested integration path as Skins. Aggregate Phase 2 test uses pre-built synthetic events, not a multi-bet `RoundConfig` through the engine layer.

#### (c) Hole-by-hole score entry and decision

`settleWolfHole` is stateless and accepts `decision: WolfDecision | null`. Captain identity is derived from `roundCfg.players[(hole-1) % N]` on every call — order-invariant lookup. Out-of-order submission is safe for Wolf.

`tieRule = 'carryover'` boundary: `finalizeBetEvents` at `wolf.ts:317–362` tracks `consecutiveTies` and applies `max(carryMult, decMult)` on the next resolution event. Specific untested boundary: 2 consecutive tied holes (carryMult=4) followed by Lone Wolf (decMult=3). Code at `wolf.ts:334–336` applies `Math.max(carryMult, decMult) = max(4, 3) = 4` — correct per rule doc §6, but no named test covers this combination.

End-of-round open carry (round ends on a tied hole): `finalizeBetEvents` exits the loop after processing the last event. A trailing `WolfHoleTied` increments `consecutiveTies` but no resolution event follows; the carry is silently dropped. No forfeit or terminal event is emitted. Rule doc §6 does not specify this case. Zero-sum is preserved (tied hole has zero delta) but the user expectation of carry resolution is unmet.

### 2.3 Stroke Play (`src/games/stroke_play.ts`, `docs/games/game_stroke_play.md`)

#### (a) Standalone on a round

`stroke_play.test.ts` covers §10 worked example across all three settlement modes, card-back tie (Test 4), tie-fallthrough to split (Test 5), incomplete card (Test 6), places config validation (Test 7). `runRound` helper (`stroke_play.test.ts:114–126`) calls `settleStrokePlayHole` per hole then `finalizeStrokePlayRound`.

#### (b) Combined with another bet

Aggregate `aggregateRound` calls `finalizeStrokePlayRound` with pre-filtered events for the specific bet (`aggregate.ts:374–378`). This prevents cross-bet contamination. No test runs Stroke Play alongside another game through the full `aggregateRound` path.

#### (c) Hole-by-hole score entry

`settleStrokePlayHole` is stateless. `finalizeStrokePlayRound`'s `finalizeBetEvents` iterates `holeRecords` in array order with no sort (`stroke_play.ts:243–293`). Net total accumulation (`stroke_play.ts:276–280`) and card-back resolution (`stroke_play.ts:597–625`, filtering by `e.hole >= startHole`) are both order-invariant. Out-of-order submission produces identical results to in-order submission for this engine.

Calling-convention note: `finalizeStrokePlayRound` returns `[...betEvents, ...settlementEvents]` (`stroke_play.ts:263`). The passed-in events appear in the output. This is flagged at `stroke_play.ts:1–27` (divergence log) and in IMPLEMENTATION_CHECKLIST.md line 91. The aggregate caller handles this correctly by reducing all returned events through `reduceEvent`, where `StrokePlayHoleRecorded` events produce no money (fall through `default: break`).

`scorecard-playoff` tie-breaking: resolves cardBackOrder segments first (`stroke_play.ts:637`), then walks holes 18..1 individually (`stroke_play.ts:650–668`). The case where all individual holes also tie has no test (falls through to `winner: null`, then `TieFallthrough`).

### 2.4 Nassau (`src/games/nassau.ts`, `docs/games/game_nassau.md`) — in progress per checklist

#### (a) Standalone on a round

`nassau.test.ts` covers the §10 front-9 worked example, pair-wise USGA allocation proof, press mechanics (auto-2-down trigger, manual-refused, press scoring unit proof), match closeout at non-final hole (Test 3 in-file), allPairs 3-player initial match count, withdrawal settlement. `finalizeNassauRound` is tested through `aggregate.test.ts` Phase 3 Iter 2 (not confirmed beyond line 846 of that file, where the Phase 3 Iter 2 fixture functions begin).

#### (b) Combined with another bet

Nassau's `byBet` compound key `${betId}::${matchId}` (`aggregate.ts:115`, `aggregate.ts:122`) prevents key collisions with other game types. No test exercises Nassau + Skins or Nassau + Wolf through a single `aggregateRound` call.

#### (c) Hole-by-hole entry and press confirmation

`settleNassauHole` threads `MatchState[]` explicitly through its return value. The caller must pass the updated `matches` from the prior hole's return to the next call. Out-of-order hole entry would corrupt match state — `holesUp` and `holesRemaining` calculations on any hole are derived from the accumulated `holesWonA/B` on the MatchState, which does not include holes skipped. No guard against out-of-order delivery exists at `nassau.ts:338`.

Press confirmation sequence: `offerPress` produces `PressOffered`; `openPress` produces `PressOpened` and returns the new `matches` array. The caller must call `openPress` before the next `settleNassauHole` invocation. No integration test confirms this exact sequence runs correctly in a multi-hole scenario where the press is opened mid-round and scoring continues. Unit-level tests confirm zero `PressOpened` when not called (`nassau.test.ts:617–656`) and press match state is appended when called (`nassau.test.ts:680–720`).

Score correction on a Nassau round requires re-running `settleNassauHole` from the corrected hole forward with reconstructed `MatchState[]`. No helper exists for this. Same caller-level gap as Skins/Wolf but more severe because state threading is explicit.

Final-hole tie: `finalizeNassauRound` emits `MatchTied` with zero delta for matches where `holesWonA === holesWonB` (`nassau.ts:495–501`). Per rule doc §6: Nassau does not use `carryover`; tied match gets `MatchTied`. Implemented correctly.

Press opened on last hole of window: `openPress` at `nassau.ts:236–244` emits `PressVoided` and returns original `matches` unchanged when `startHole > endHole`. Tested in `aggregate.test.ts:819–845`.

---

### Logged for future triage

1. **Skins — multi-bet pass-through untested.** Engine: `skins.ts:211–227`. Scenario: Wolf and Skins active simultaneously; `finalizeSkinsRound` receives a mix of `SkinWon` and `WolfHoleResolved` events. Expected: `WolfHoleResolved` survives unchanged. Observed: pass-through logic is correct by inspection but has no test. Evidence: code trace, no combination test found in `skins.test.ts`. Severity: LOW.

2. **Wolf — carryover + Lone Wolf multiplier boundary case untested.** Engine: `wolf.ts:334–336`. Scenario: 2 consecutive tied holes (carryMult=4) followed by Lone Wolf (decMult=3). Expected: effective multiplier = max(4,3) = 4 per rule doc §6. Observed: code implements `Math.max(carryMult, decMult)` correctly, but no named test covers carryMult > decMult. Evidence: `wolf.test.ts` Test suite covers no carryover+Lone combination. Severity: LOW.

3. **Wolf — end-of-round open carry silently dropped.** Engine: `wolf.ts:319–363`. Scenario: last hole of the round produces `WolfHoleTied` under `tieRule = 'carryover'` with no subsequent resolution hole. Expected: carry is forfeited or a terminal event is emitted. Observed: `finalizeBetEvents` loop exits after the trailing `WolfHoleTied`; `consecutiveTies` is incremented but no resolution or forfeit event is emitted. The carry is silently dropped. Zero-sum holds (tied hole has zero delta) but the carry expectation is unresolved without audit trace. Rule doc §6 is silent on this case. Evidence: `wolf.ts:319–363` code trace; no test found. Severity: MEDIUM.

4. **Stroke Play — `finalizeStrokePlayRound` includes input events in return value.** Engine: `stroke_play.ts:263`. Scenario: caller passes events then concatenates return: `[...events, ...finalizeStrokePlayRound(events, cfg)]`. Input events appear twice. Current caller (`aggregate.ts:374–378`) correctly avoids this. Future callers may not. Logged in IMPLEMENTATION_CHECKLIST.md line 91. Evidence: `stroke_play.ts:263`. Severity: LOW in current use, MEDIUM as future foot-gun.

5. **Nassau — out-of-order hole entry corrupts MatchState.** Engine: `nassau.ts:338`. Scenario: hole 5 submitted before hole 3 (UI allows navigation to any hole). Expected: MatchState reflects hole 3/4 results before hole 5. Observed: `settleNassauHole` has no completeness guard; hole 5's `holesUp` calculation uses whatever `holesWonA/B` was passed in, which would not include holes 3/4. Evidence: `nassau.ts:383–415` code trace; no ordering guard. Severity: MEDIUM — depends on UI enforcing sequential delivery.

6. **TeamSizeReduced — per-player loop emits duplicate events on mutual partner withdrawal.** Engine: `match_play.ts:352–373`. Scenario: both members of a best-ball team appear in `hole.withdrew`. Expected: one `TeamSizeReduced` per affected team with correct `remainingSize`. Observed: loop iterates `hole.withdrew` per player; emits one event per withdrawn player, all with hardcoded `remainingSize: 1`; mutual withdrawal produces two events for the same team, both with wrong `remainingSize`. Evidence: `match_play.ts:362–372` confirmed; IMPLEMENTATION_CHECKLIST.md line 93. Severity: MEDIUM (already logged; gated on §9 rule decision, but the duplicate emit is a separate correctness issue).

7. **Nassau — allPairs end-to-end settlement through aggregateRound untested.** Engine: `nassau.ts:124–147` (`initialMatches` allPairs path). Scenario: 3-player allPairs round; `aggregateRound` invoked. Expected: 9 match keys in `byBet`, zero-sum per pair and overall. Observed: `aggregate.test.ts` covers only singles Nassau. allPairs path through the finalizer chain is untested at the aggregate level. Evidence: `aggregate.test.ts` read through line 846 — no allPairs aggregate test found. Severity: MEDIUM.

---

## Section 3 — Bet-Structure and Hole-by-Hole UX Audit

### 3.1 Skins

**Config shape** (`SkinsCfg` at `src/games/types.ts:33–43`, canonical at `docs/games/game_skins.md §4`)

User configures before the round: `stake` (integer minor units per skin), `escalating` (true = carry, false = void on tie), `tieRuleFinalHole` (final hole tie only: `carryover` | `split` | `no-points`), `appliesHandicap`, `playerIds` (2–5), `junkItems`, `junkMultiplier`.

**Per-hole input required from user while recording scores:**

- Gross score for each player.
- Handicap strokes per player (if `appliesHandicap = true`; supplied once at setup as course handicap, not per-hole).
- If `junkItems` non-empty: CTP winner and/or LD winners for the hole.
- No per-hole betting decision. No press confirmation.

The engine's `settleSkinsHole` derives all hole results from `HoleState.gross` and `HoleState.strokes`. The user's sole per-hole input is score entry plus junk selection if applicable.

**Resolution output shape:**

- `SkinWon`: winner, losers, points map (provisional, scaled at finalize). Money per hole not final until `finalizeSkinsRound`.
- `SkinCarried`: carry accumulates silently; no money movement shown per hole.
- `SkinVoid`: for non-escalating ties; no money movement.
- `SkinCarryForfeit`: at final hole on unresolved carry.
- `FieldTooSmall`: when fewer than 2 players have valid scores.

**Consumer wiring:**

Engine (`src/games/skins.ts`) is test-only. The active UI consumer is `src/lib/payouts.ts:computeAllPayouts`, which calls `computeSkins` (old `src/lib/` parallel path). Results screen (`src/app/results/[roundId]/page.tsx`) reads from `computeAllPayouts`. No wiring from `src/games/skins.ts` to any UI route exists. Cutover is backlog #11.

### 3.2 Wolf

**Config shape** (`WolfCfg` at `src/games/types.ts:44–55`, canonical at `docs/games/game_wolf.md §4`)

User configures before the round: `stake`, `loneMultiplier` (default 3), `blindLoneEnabled`, `blindLoneMultiplier` (default 4), `tieRule` (`no-points` | `carryover`), `playerIds` (4–5 only), `appliesHandicap`, `junkItems`, `junkMultiplier`.

Captain rotation order is derived from `RoundConfig.players[]` locked at `RoundConfigLocked` time. The user establishes player order at setup; it cannot change mid-round.

**Per-hole input required from user while recording scores:**

- Gross score for each player.
- The captain's `WolfDecision`: pick a partner (which player) or go Lone Wolf (regular or blind). This decision must be entered before hole results are final; in practice it should be entered before the hole is scored (after tee shots but before holing out).
- For Blind Lone: declaration must occur before any non-captain tees. The engine accepts the decision at settle time; timing enforcement is UI responsibility.
- Junk items if applicable.

Wolf is the only engine of the four that requires a per-hole strategic decision (partner/lone) that is distinct from score entry. The decision determines payout magnitude.

**Resolution output shape:**

- `WolfHoleResolved` (partner play): winner side and loser side, points map. Money is final per hole (no deferred finalization for `no-points` mode).
- `LoneWolfResolved` / `BlindLoneResolved`: captain identity, won/lost, points map.
- `WolfHoleTied`: zero delta.
- `WolfCarryApplied` (carryover mode): metadata event at resolution with effective multiplier.
- `WolfDecisionMissing`: zero delta, blocks round close.
- `WolfHoleInvalid`: zero delta on missing-score hole.

Money is emitted per hole; running total can be updated in real time for this engine.

**Consumer wiring:**

Engine (`src/games/wolf.ts`) is test-only. Legacy consumer: `src/lib/payouts.ts:computeWolf`. `HoleData.wolfPick` (`src/types/index.ts:111`) stores the captain's decision as a string (`string | 'solo'`), feeding the old engine. The new `WolfDecision` discriminated union is richer and not in the `HoleData` shape.

### 3.3 Stroke Play

**Config shape** (`StrokePlayCfg` at `src/games/types.ts:82–94`, canonical at `docs/games/game_stroke_play.md §4`)

User configures before the round: `stake`, `settlementMode` (`winner-takes-pot` | `per-stroke` | `places`), `stakePerStroke` (for `per-stroke` mode), `placesPayout: number[]` (for `places` mode; must sum to `stake × N`), `tieRule` (`split` | `card-back` | `scorecard-playoff`), `cardBackOrder: number[]` (default `[9,6,3,1]`), `appliesHandicap`, `playerIds`, `junkItems`, `junkMultiplier`.

**Per-hole input required from user while recording scores:**

- Gross score for each player.
- Junk items if applicable.
- No per-hole betting decision. No press.

Stroke Play has the lowest per-hole cognitive burden of the four engines. All settlement happens at round end; the user enters scores and receives no hole-by-hole feedback from this engine.

**Resolution output shape:**

- Per hole: `StrokePlayHoleRecorded` (nets map, no money). `IncompleteCard` (missing score player excluded at settlement).
- At round end: `StrokePlaySettled` (points map), `CardBackResolved` / `ScorecardPlayoffResolved` (tie resolution events), `TieFallthrough` (tie fell to split), `FieldTooSmall`, `RoundingAdjustment` (when loser pot not evenly divisible).
- `TieFallthrough` fires even when `tieRule = 'split'` is configured directly (`from: 'split'`), per `stroke_play.ts:556–567`. This is a deliberate design choice (audit log completeness) that differs from the rule doc §6 description, which only mentions fallthrough for `card-back` and `scorecard-playoff`. Logged as a divergence at `stroke_play.ts:21–27`.

**Consumer wiring:**

Engine (`src/games/stroke_play.ts`) is test-only. Legacy consumer: `src/lib/payouts.ts:computeStrokePlay`. Results screen reads `computeAllPayouts`.

### 3.4 Nassau

**Config shape** (`NassauCfg` at `src/games/types.ts:57–67`, canonical at `docs/games/game_nassau.md §4`)

User configures before the round: `stake`, `pressRule` (`manual` | `auto-2-down` | `auto-1-down`), `pressScope` (`nine` | `match`), `appliesHandicap`, `pairingMode` (`singles` | `allPairs`), `playerIds` (2–5; `singles` requires exactly 2), `junkItems`, `junkMultiplier`.

**Per-hole input required from user while recording scores:**

- Gross scores for all players in each pairing.
- Press confirmation: if `pressRule = 'auto-2-down'` or `'auto-1-down'`, the UI must present a confirmation dialog to the down player when `offerPress` fires. The down player must confirm before `openPress` is called and before the next hole is scored. If `pressRule = 'manual'`, the down player may request a press at any time after falling behind; no automatic trigger.
- Junk items if applicable.

Nassau is the only engine that requires the user to make a per-hole decision that changes the structure of the round (not just a scoring choice). Press confirmation adds a new match to `matches[]`, affecting all subsequent settlement calculations.

**Resolution output shape:**

- Per hole: `NassauHoleResolved` (winner per match) or `NassauHoleForfeited` (missing score) or `MatchClosedOut` (match decided mid-round).
- Press events: `PressOffered` (engine proposes), `PressOpened` (user confirmed), `PressVoided` (zero-window press).
- At round end: `finalizeNassauRound` emits `MatchTied` (tied) or `MatchClosedOut` (decided) for each open match. Money is in `MatchClosedOut.points` or `NassauWithdrawalSettled.points`.
- No per-hole money movement; all settlement deferred to match close.

**Consumer wiring:**

Engine (`src/games/nassau.ts`) is test-only. Legacy consumer: `src/lib/payouts.ts:computeNassau` (if present). Results screen reads `computeAllPayouts`.

---

### 3.5 Cross-bet inconsistencies

1. **Money feedback cadence diverges across active bets.** Skins emits provisional money per hole (final after `finalizeSkinsRound`); Wolf emits final money per hole; Nassau and Stroke Play emit no money per hole. A UI showing a running total after each hole would update for Skins and Wolf in real time but show zero Nassau and Stroke Play contribution until match or round close. This asymmetry is architecturally correct but may surprise users watching the running total after each hole.

2. **Per-hole decision requirement pattern.** Skins and Stroke Play require only score entry per hole. Wolf requires one mandatory captain decision per hole. Nassau requires zero or one optional press confirmation per hole. Users playing all four simultaneously face three different interaction patterns in a single round.

3. **Handicap allocation method differs between Nassau and the other three.** Skins, Wolf, and Stroke Play use `strokesOnHole(strokes[pid], holeIndex)` where `strokes[pid]` is the player's full course handicap. Nassau uses pair-wise USGA allocation: `strokesOnHole(|strokesA - strokesB|, holeIndex)` applied to the higher-handicap player per pair (`nassau.ts:303–313`). In an `allPairs` round a player may receive different strokes in different pair matchups. Rule-correct, but unusual for users accustomed to a fixed stroke count per hole.

4. **Tie-rule field name and semantics are inconsistent across engines.** Skins uses `tieRuleFinalHole` (applies only on the last hole). Wolf uses `tieRule` (applies to every hole). Stroke Play uses `tieRule` (applies at round end, with card-back and scorecard-playoff modes not present in any other engine). Nassau has no `tieRule` field (tied matches always produce `MatchTied` with zero delta). A unified setup UI using a single "Tie Rule" label would mean four different things.

5. **`junkMultiplier` config field is present across all four engine configs but absent from the legacy `GameInstance` type and all current UI flows.** `SkinsCfg`, `WolfCfg`, `NassauCfg`, and `StrokePlayCfg` all declare `junkMultiplier: number`. The legacy `GameInstance` (`src/types/index.ts:60–76`) has no `junkMultiplier` field. The new engine tests use `junkMultiplier: 1` (default). Users cannot currently configure a per-bet junk payout multiplier from any UI screen.

---

### 3.6 UX-simplification candidates (observations only)

- The press confirmation flow (Nassau) is the only per-hole interaction that requires an asynchronous confirmation from a specific player (the down player) before the next hole can proceed. Every other per-hole input is a score entry or junk selection. No UI pattern for this flow exists yet in the codebase (backlog #12 / HoleData bridge).

- Stroke Play defers all feedback to round end while all other engines provide at least some per-hole signal. Users playing Stroke Play alongside Skins receive immediate skin updates but no stroke play signal until hole 18. The information gap is widest when a player is close to the lead — they do not know their standing during the round.

- Wolf decisions (partner pick or lone) are made per hole based on tee shots. In the current `HoleData` type, `wolfPick: string | 'solo'` stores only the partner choice or 'solo'; it does not distinguish blind lone from regular lone. The new `WolfDecision` union (`{kind: 'partner' | 'lone', blind: boolean}`) is richer and correctly models the three-way choice (partner / lone / blind lone).

- Out-of-order hole entry is safe for Skins, Wolf, and Stroke Play but not for Nassau. A UI that allows users to navigate back to a prior hole and correct a score would need to detect which engines are active and apply different correction strategies (replay from corrected hole for Nassau vs simple event replacement for the stateless engines). The distinction is invisible to the user but consequential.

- Score correction across all four engines currently requires either (a) event-level supersession (blocked by `EventBase` having no `id` field — IMPLEMENTATION_CHECKLIST.md line 87) or (b) full log recomputation from the corrected hole forward. The supersession schema design is an architectural prerequisite for any unified score-correction UX experience.
