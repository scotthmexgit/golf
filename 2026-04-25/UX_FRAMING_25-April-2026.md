# UX Framing — 25 April 2026

Researcher: Claude Sonnet 4.6  
Date: 2026-04-25  
Scope: framing only. No design proposals, no pattern picks, no engineering scope.

Sources: `src/games/types.ts`, `src/games/skins.ts`, `src/games/wolf.ts`, `src/games/stroke_play.ts`, `src/games/nassau.ts`, `src/games/aggregate.ts`, `src/games/events.ts`, `src/types/index.ts`, `docs/games/game_skins.md`, `docs/games/game_wolf.md`, `docs/games/game_stroke_play.md`, `docs/games/game_nassau.md`, `TRIAGE_25-April-2026.md §3`.

Reviewer lens: "each bet is essentially distinct because it could have any combination of players etc from the group, but the UI/UX should take advantage when the same question across multiple bets when possible for efficiency in the UI and intuitiveness."

---

## Item 1 — Tie-Rule Field-Name and Semantics

### 1.1 User Decision/Input/Awareness Moment

The tie-rule question arises exclusively at **round setup**, once per active bet that exposes a configurable tie rule. It does not recur during hole-by-hole score entry or at round close. The specific moments:

- **Skins setup**: After selecting Skins and entering the stake, the user is asked: "What happens if the final hole also ties?" (`tieRuleFinalHole`). This question does not arise for any earlier hole — all earlier Skins ties always carry.
- **Wolf setup**: After selecting Wolf and entering the stake and multipliers, the user is asked: "What happens when a Wolf hole is tied?" (`tieRule`). This question applies to every hole in the round.
- **Stroke Play setup**: After selecting Stroke Play and the settlement mode, the user is asked: "How should ties in total net strokes be broken?" (`tieRule`). This question applies only at round end.
- **Nassau setup**: No tie-rule question. All Nassau tied matches produce zero-delta by protocol; the user makes no tie-rule decision.

If a round has Skins + Wolf + Stroke Play all active (a plausible combination for a competitive group), the user faces three tie-rule decisions in the setup flow, each with different options.

### 1.2 Cross-Bet Unifiability Under Reviewer Direction

**Where the same question repeats with the same shape:**

Wolf's `no-points` and Skins' `no-points` are semantically identical: a tied hole produces zero delta. If both bets are active in a round, a user who chooses `no-points` for Wolf might reasonably expect `no-points` to mean the same thing if it appeared on Skins. It does — but Skins only exposes this for the final hole, while Wolf applies it to every hole.

**Where the question looks the same but means something different:**

`carryover` appears in both Skins (`tieRuleFinalHole`) and Wolf (`tieRule`), but means different things:
- **Skins `carryover`** (final-hole only): if the last hole of the round also ties, the accumulated carry is forfeited. Zero-sum breaks intentionally; a `SkinCarryForfeit` event is emitted. This is a money *disappearance* outcome. (`game_skins.md:147`)
- **Wolf `carryover`** (every hole): a tied hole rolls the stakes to the next hole; the carry multiplier grows. Money does not disappear — it transfers on the next non-tied hole. (`game_wolf.md:133`)

A user who sees `carryover` in both a Skins row and a Wolf row on the same setup screen is looking at the same word with opposite practical meanings (money forfeited vs money deferred).

**Stroke Play's tie-rule options** (`split`, `card-back`, `scorecard-playoff`) describe round-end tiebreaking methods that have no analog in Skins or Wolf. They can't be unified with either.

**Nassau** has no tie-rule concept at the config layer — it simply doesn't appear, which is correct.

**Summary unifiability table:**

| Bet | Field | Scope | Shareable options |
|---|---|---|---|
| Skins | `tieRuleFinalHole` | Final hole only | `no-points` (same meaning as Wolf) |
| Wolf | `tieRule` | Every hole | `no-points` (same meaning as Skins final-hole) |
| Stroke Play | `tieRule` | Round end | None shared |
| Nassau | (none) | — | — |

The only genuinely shared option is `no-points`. `carryover` is a false cognate. Stroke Play's options are entirely disjoint.

### 1.3 Candidate UI Patterns

**Pattern A — Per-bet contextual labels, separate inputs**

Each bet type's setup card uses its own label and dropdown. Skins: "Final-hole tie rule." Wolf: "Hole tie rule." Stroke Play: "Tiebreaker method." Nassau: no row shown.

- **User cognitive load**: Three separate decisions if all three bets are active. But each decision is labeled correctly for what it governs.
- **Engine accuracy**: Perfect — no ambiguity about scope.
- **Cross-bet consistency**: None — each bet is fully independent. The reviewer's "unify when same question repeats" goal is not served.
- **Implementation cost surface**: Low — each bet's setup card is self-contained. Labels live in UI string constants.

**Pattern B — Shared "Tie Rules" section, per-bet rows with contextual scope labels**

A single collapsible "Tie Rules" section in setup. Each active bet contributes one row. Row format: `[Bet name] Tie rule: [dropdown] [scope subtext]`. Example: "Skins — Final hole: [carryover ▾] — what happens if hole 18 also ties" and "Wolf — Every hole: [no-points ▾] — what happens when a Wolf hole is tied."

- **User cognitive load**: Slightly reduced by grouping. The user sees all tie-rule questions together, which signals that this is a configuration category with a natural relationship. But the per-row subtext must be read to avoid confusion between `carryover` options.
- **Engine accuracy**: Accurate if the scope labels are clear. Risk: the shared `carryover` option appearing in two rows with different scope labels could confuse users who don't read the subtext.
- **Cross-bet consistency**: Visually grouped; semantically distinct. The grouping implies a relationship that is only partially real.
- **Implementation cost surface**: Moderate — requires a setup architecture that renders a consolidated section across active bet types, with bet-specific option sets and labels per row.

**Pattern C — Default all tie rules; surface only advanced settings**

All tie-rule fields use opinionated defaults (Skins: `carryover`; Wolf: `no-points`; Stroke Play: `card-back`) and are not shown in the primary setup flow. An "Advanced settings" disclosure panel reveals them.

- **User cognitive load**: Near-zero for casual users. Advanced users can find the settings.
- **Engine accuracy**: Full — defaults are valid config values.
- **Cross-bet consistency**: The tie-rule question is effectively unified by hiding it. Nassau's absence aligns naturally.
- **Implementation cost surface**: Low for primary flow. Advanced panel requires UI but no engine changes. Risk: users with strong tie-rule preferences may be frustrated by the depth.

**Pattern D — Inline question within each bet's setup card, no cross-bet unification**

The tie-rule question appears inline within each bet's own setup flow, labeled exactly as it is in the rule doc (e.g., "Tie rule for last hole" for Skins). No attempt at cross-bet presentation.

- **User cognitive load**: Moderate — each bet walk-through asks the question naturally. No confusion from false cross-bet relationships.
- **Engine accuracy**: Perfect.
- **Cross-bet consistency**: None — explicitly rejected for this option.
- **Implementation cost surface**: Minimal — self-contained per bet card.

### 1.4 Dependencies

| Dependency | Status | Nature |
|---|---|---|
| #11 parallel-path cutover | Blocking for production | Setup screen is currently legacy (`GameInstance`); the new `SkinsCfg`, `WolfCfg`, `StrokePlayCfg` shapes land with #11 |
| #12 HoleData bridge | Informational | Tie-rule setup is config-time; bridge doesn't affect it |
| Supersession schema (line 89) | Not relevant | Setup is pre-round; no supersession dependency |
| Rule-doc state | Informational | All four engines' tie-rule semantics are documented; Nassau absence is documented (`game_nassau.md` has no tie-rule field) |

#11 is the material dependency: the new config types (`SkinsCfg.tieRuleFinalHole`, `WolfCfg.tieRule`, `StrokePlayCfg.tieRule`) are in `src/games/types.ts` but the setup UI currently builds `GameInstance` (`src/types/index.ts:60`), which has no tie-rule fields at all. The UI pattern can be designed now, but cannot be wired until #11.

### 1.5 Open Questions Before Committing to a Pattern

1. Does the false-cognate risk of showing `carryover` under both Skins and Wolf in the same UI section outweigh the grouping benefit? Or is the scope subtext (final-hole vs every-hole) sufficient disambiguation?
2. Should a "same question, same label" goal apply when the options have different meanings — or only when both the label and the meaning are the same?
3. Is there a user segment that cares enough about tie-rule configuration to warrant primary-flow exposure (Pattern A or B) vs. one that would be equally served by defaults and an advanced panel (Pattern C)?
4. Given that Nassau has no tie-rule config and Match Play has only `halved` (not user-configurable), should the "Tie Rules" setup section explicitly acknowledge those bets' fixed behavior — or simply omit them silently?

---

## Item 2 — Stroke Play Deferred Feedback During Round

### 2.1 User Decision/Input/Awareness Moment

This is not a **decision** moment for the user — it's an **awareness** gap. The user enters scores hole by hole. After each hole:

- **Skins**: shows which player won the skin (or carry status). Provisional event visible per hole.
- **Wolf**: shows per-hole delta — which team won, how much, running total per player.
- **Nassau**: shows per-match `holesUp` status after each hole.
- **Stroke Play**: shows nothing. By rule, `StrokePlayHoleRecorded` (`events.ts:204`) carries `nets: Record<PlayerId, number>` but no monetary delta. Settlement fires only via `finalizeStrokePlayRound` at round end (`stroke_play.ts:210`). The per-hole event is explicitly non-settling. (`game_stroke_play.md:52`: "Stroke Play does not produce a per-hole monetary delta.")

The awareness gap manifests at the **post-hole confirmation screen**, when the user sees feedback from Skins/Wolf/Nassau but a silent card for Stroke Play. It also manifests at the **round summary** screen, where Stroke Play results appear for the first time while other bets have shown incremental progress throughout.

### 2.2 Cross-Bet Unifiability Under Reviewer Direction

**Where the question is the same shape:** Every bet in the round has a "what is my current standing in this bet?" question. For Skins/Wolf/Nassau, the engine answers it per hole. For Stroke Play, the engine answers it only at round end.

**Where the question diverges:** The divergence is engine-enforced, not UI-optional (triage §3.1 Finding 1 classification: EI). The engine cannot produce a settled Stroke Play delta mid-round without violating the rule. The UI cannot ask the engine for a mid-round Stroke Play standing and receive one.

However, the UI *can* read the accumulated `StrokePlayHoleRecorded` events already in the log (`nets: Record<PlayerId, number>` per hole) and sum them client-side to produce a projected net total. This does not require any engine call or engine change — it is UI-layer arithmetic over existing event data.

The critical question: does showing a projected net total imply the same certainty as a settled delta shown for Wolf? The answer depends on what the UI labels it as. If Wolf shows "+$30" and Stroke Play shows "+$30 projected," the distinction exists but may be visually lost in a compact display.

**Nassau** also defers money to match-end, but it shows per-hole `holesUp` state (a match progress indicator, not a money figure). Stroke Play has no equivalent non-monetary progress indicator — the only meaningful signal is cumulative net strokes.

### 2.3 Candidate UI Patterns

**Pattern A — Status quo: Stroke Play card shows "pending" until round end**

No per-hole feedback. The Stroke Play bet card shows "Settlement at round end" throughout the round.

- **User cognitive load**: Zero per hole. One catch-up moment at round end.
- **Engine accuracy**: Perfect — no false precision.
- **Cross-bet consistency**: Acknowledged inconsistency. The parity gap with Skins/Wolf is visible but honest.
- **Implementation cost surface**: Zero — current behavior.

**Pattern B — Projected ranking (ordinal, no money)**

After each hole's scores are confirmed, sum each player's `StrokePlayHoleRecorded.nets` from the event log (already available) and show player rank order. Label explicitly: "Current standing (provisional)." Show hole count: "After 12 holes." Do not show dollar amounts.

- **User cognitive load**: Low — an ordinal rank is easy to interpret. No money amounts reduce the risk of treating it as final.
- **Engine accuracy**: Good for ranking; honest about what's missing (card-back hasn't run; tie-breaking rules don't apply until round end). A player currently tied for first by net total may lose the card-back. The rank is therefore provisional in the strictest sense.
- **Cross-bet consistency**: Fills the awareness gap without implying settlement. Other bets show results; Stroke Play shows progress. Semantically different things but both present.
- **Implementation cost surface**: UI-layer only. Sum `nets[player]` over seen `StrokePlayHoleRecorded` events, sort by ascending total, display ordinal. No engine change. No new event type. Depends on the app having access to the event log (available via `aggregateRound` input, but the current `src/lib/` path doesn't use it).

**Pattern C — Running net totals per player (no ranking)**

Show each player's cumulative net strokes to date after each hole. E.g., "Alice: 68 net (12 holes)." No relative ranking shown — the user does their own mental math.

- **User cognitive load**: Slightly higher than Pattern B (user must compare values). Avoids ranking mechanics that could mislead in a tie.
- **Engine accuracy**: Same as Pattern B — honest about provisional nature.
- **Cross-bet consistency**: Provides a raw progress signal comparable to Nassau's `holesUp` (a progress number, not a money figure).
- **Implementation cost surface**: Same as Pattern B. Shows net totals instead of rank.

**Pattern D — Projected money with uncertainty flag**

Show the money outcome that *would* result if the round ended now, based on current net totals. Clearly labeled "If the round ended now: Alice +$30." Flag the uncertainty: "Tie-breaking rules (card-back) haven't run."

- **User cognitive load**: High clarity on money impact. But the disclaimer requires reading.
- **Engine accuracy**: Moderate risk. The projected amounts ignore tie-breaking rules. In a close round, the projected winner and actual winner may differ significantly after card-back. Showing projected money pre-settlement could mislead users in tied or near-tied situations.
- **Cross-bet consistency**: Matches the money-delta format of Wolf and Skins results. Highest parity with other bets' feedback style.
- **Implementation cost surface**: UI-layer settlement arithmetic (winner-takes-pot formula from `game_stroke_play.md §8`). No engine call needed. Higher complexity than Patterns B or C because it must implement the settlement formula client-side without the card-back tiebreaker, then present the result with caveats.

### 2.4 Dependencies

| Dependency | Status | Nature |
|---|---|---|
| #11 parallel-path cutover | Blocking for production | The new engine's `StrokePlayHoleRecorded` events aren't accessible from the current `src/lib/` routes |
| #12 HoleData bridge | Blocking for access | The bridge must pass `StrokePlayHoleRecorded` events back to the UI display layer |
| Supersession schema (line 89) | Not relevant | Projected standing doesn't require score correction |
| Rule-doc state | Informational | `game_stroke_play.md §5` explicitly states the per-hole event carries nets; §7 defines the settlement formula |

The primary implementation dependency is having the event log accessible in the post-hole display context — specifically, the accumulated `StrokePlayHoleRecorded` events. This is a #12 bridge concern: the bridge must expose the event log (or a derived summary) to the UI, not just the computed `RunningLedger`. The `RunningLedger.byBet` slice for Stroke Play only populates at finalization — mid-round, it's empty.

### 2.5 Open Questions Before Committing to a Pattern

1. Is per-hole projected standing for Stroke Play "table stakes for parity with other bets" (expected feature) or "scope creep beyond the current rebuild plan" (out of scope for now)?
2. If showing projected standing, is the risk of tie-breaking confusion (Pattern B/D) acceptable? What happens in the UI when two players are tied in net total after 15 holes — does the projected ranking show them as tied, or does the UI apply card-back early?
3. Does the "projected" label need to be permanent for Stroke Play (visible throughout the round), or only while holes remain? At round end, `finalizeStrokePlayRound` runs and the real result replaces the projected one — when does the display switch from provisional to final?
4. Should the Stroke Play mid-round display format be consistent with how Nassau shows `holesUp` (a progress indicator, not a money figure) — or with how Wolf shows per-hole money deltas? The answer shapes whether Patterns B/C (progress) or Pattern D (money) is the right direction.

---

## Item 3 — Out-of-Order Hole Entry / Correction Asymmetry

### 3.1 User Decision/Input/Awareness Moment

Two distinct sub-scenarios:

**Sub-scenario A — Out-of-order entry**: A group plays hole 5, then hole 3 (e.g., pace-of-play allows skipping ahead). The scorer wants to enter hole 5's scores before going back to hole 3.

**Sub-scenario B — Score correction**: After entering hole 7 and continuing to hole 10, a player realizes hole 7's score was wrong. The scorer wants to edit it.

These moments arise **during the active round**, between the first hole and the round-close confirmation. They're "exception path" moments — the normal flow is sequential entry.

For Sub-scenario A: the question arises when the scorer tries to navigate to a non-sequential hole on the hole-entry screen.

For Sub-scenario B: the question arises when the scorer tries to navigate back to a prior hole from the current hole screen.

### 3.2 Cross-Bet Unifiability Under Reviewer Direction

**Where the question is the same shape:** Every active bet in the round is affected by a score change on any hole. A correction to hole 7's gross scores re-settles that hole across all active bets simultaneously. The "can I correct a prior hole?" question applies equally to Skins, Wolf, Nassau, and Stroke Play — in that sense, it's a perfectly unified question.

**Where the question diverges:** The *engine consequences* of out-of-order or out-of-sequence state differ fundamentally across bets:

- **Skins, Stroke Play** (`skins.ts`, `stroke_play.ts:263`): The engines are accumulative and don't thread explicit state between holes. `SkinWon` and `StrokePlayHoleRecorded` events are independent. Re-processing hole 7 in isolation is feasible — only the hole 7 events need to be replaced.

- **Wolf** (`wolf.ts`): Carry state accumulates through `consecutiveTies` in `finalizeBetEvents`. A change to hole 7 affects carry multipliers for holes 8–N. Re-processing requires replaying from hole 7 forward.

- **Nassau** (`nassau.ts:352, 387`): MatchState (`holesWonA`, `holesWonB`, `closed`) threads through every hole call. `holesRemaining = match.endHole - hole.hole` is computed from current hole number against the active match's end boundary. A change to hole 7 potentially changes `closed` states, `holesWonA/B` deltas, and press trigger eligibility — for every match, for every pair. Re-processing requires replaying from hole 7 forward through all matches. This is what makes Nassau incompatible with casual hole navigation.

  Key evidence: `nassau.ts:352`: `if (match.closed || hole.hole < match.startHole || hole.hole > match.endHole)` — this guard is protective but doesn't protect against cumulative state becoming stale if prior holes are submitted out of order.

- **Score correction**: Requires either (a) supersession schema (`ScoringEventLog.supersessions`, zero writers, `EventBase` has no `id` field — `IMPLEMENTATION_CHECKLIST.md:89`, hard blocker), or (b) full log recomputation. No intermediate option is currently available.

The asymmetry: a UI "allow correction" affordance would be safe for Skins and Stroke Play with a partial re-run, but requires a full round replay for Wolf and Nassau to preserve correctness. This is an architectural question, not a UI styling question.

### 3.3 Candidate UI Patterns

**Pattern A — Sequential entry enforced; no back-navigation**

The hole-entry screen disables prior-hole navigation. Holes must be entered in order. No exception path.

- **User cognitive load**: Zero decision cost on out-of-order or correction requests — they simply aren't possible. High friction when corrections are needed (must complete the round and request a manual override, or start over).
- **Engine accuracy**: Perfect — no out-of-order or correction risk.
- **Cross-bet consistency**: Fully unified. All bets receive holes in sequence.
- **Implementation cost surface**: Current closest-to-existing behavior. No engine changes. UI enforces ordering through screen navigation guards.

**Pattern B — Bridge-layer ordering (#12 scope); UI allows any navigation**

The UI allows free hole navigation (any hole accessible at any time). The #12 HoleData→HoleState bridge buffers entries and submits to engines in hole-number sequence. If the user navigates to hole 5 before hole 3, hole 5 is buffered; when hole 3 is confirmed, both are submitted in order.

- **User cognitive load**: Flexible and natural for the user. Hidden complexity in the bridge.
- **Engine accuracy**: Depends on bridge implementation. For Nassau, the bridge must correctly handle the case where a "buffered" hole arrives after a subsequent hole that already used a stale MatchState — full re-run from the earliest modified hole is necessary.
- **Cross-bet consistency**: Fully unified from the user's perspective. All bets get correctly ordered input.
- **Implementation cost surface**: Significant. Requires #12 bridge to implement ordering and buffering logic. For Nassau in particular, the bridge must be stateful enough to detect when a submitted hole is earlier than the latest processed hole and trigger a re-run.

**Pattern C — Per-engine navigation policy (differentiated)**

Nassau and Match Play require sequential entry (navigation guards applied only when these bets are active in the round). Skins, Wolf, and Stroke Play allow free navigation.

- **User cognitive load**: The user sees different behavior depending on which bets are active. If Nassau is in the round, they're constrained. If only Skins is active, they're free. A user who plays with Nassau sometimes and without it other times will experience different behavior. This is potentially confusing.
- **Engine accuracy**: Correct for each engine. Nassau gets sequential input; others get whatever order they receive.
- **Cross-bet consistency**: Inconsistent — this is the exact asymmetry the item describes, surfaced to the user rather than abstracted away.
- **Implementation cost surface**: Moderate. Navigation guards conditioned on active bet types. No bridge changes needed, but the guard logic must inspect the active round's bet set.

**Pattern D — Full log recomputation on any change**

The UI allows free navigation and score editing. Any time a hole's score is changed (including correction or out-of-order entry), the entire event log is recomputed from hole 1 forward using the updated HoleState sequence. The displayed ledger reflects the recomputed result.

- **User cognitive load**: Transparent. User edits a score; everything updates. No awareness of per-engine constraints required.
- **Engine accuracy**: Perfect — `aggregateRound` is pure and idempotent (`aggregate.ts`). The same log produces the same ledger; a corrected log produces the corrected ledger.
- **Cross-bet consistency**: Fully unified. All engines are re-run together.
- **Implementation cost surface**: Requires #12 bridge to expose a "full recompute" path. Does not require supersession schema (which is blocked). The recompute is bounded: typical 18-hole round, 5 players, 5 bets — fast enough client-side for the new pure-TS engine. The key dependency is having all HoleState data accessible (scores confirmed for all completed holes) when the recompute runs.

**Note on supersession**: Pattern D is the only pattern that enables score correction without the supersession schema (blocked, `IMPLEMENTATION_CHECKLIST.md:89`). Patterns A–C do not enable correction at all (A) or require supersession for safe partial updates (B, C). If score correction is in scope, Pattern D is the only currently unblocked architectural path.

### 3.4 Dependencies

| Dependency | Status | Nature |
|---|---|---|
| #11 parallel-path cutover | Blocking for production | New engine not accessible from current UI routes |
| #12 HoleData bridge | Blocking | Bridge translates `HoleData` → `HoleState`; ordering and correction both require this |
| Supersession schema (line 89, `IMPLEMENTATION_CHECKLIST.md:89`) | Hard blocker for partial correction | Zero writers on `EventBase.id`; `ScoringEventLog.supersessions` unused |
| `RoundConfigLocked` semantics | Informational | Config is frozen at lock (`RoundConfig.locked: boolean`, `events.ts:282`); mid-round participant changes out of scope |
| Nassau MatchState threading | Informational for Pattern D, blocking for B/C | Any correction before the latest hole requires full replay |

Supersession is a hard blocker specifically for partial log updates (where only the corrected hole's events are replaced, not the whole log). Pattern D bypasses this blocker by recomputing the whole log.

### 3.5 Open Questions Before Committing to a Pattern

1. Is out-of-order entry a constraint the app accepts (Pattern A) or a feature it engineers around (Patterns B, C, D)? The answer sets the scope of #12's ordering requirements.
2. Is score correction in the current rebuild scope? If yes, Pattern D is the only unblocked path. If no, the supersession question (line 89) can remain deferred.
3. For Pattern D (full recomputation): is a visible "recalculating..." moment acceptable UX when a hole is corrected mid-round? In a 5-player, 18-hole round with 5 active bets, the recompute is fast, but the UI must either show a loading state or be confident it's synchronous.
4. Should the UI communicate to the user *why* it's re-running (e.g., "Updating Nassau match state...") or keep the recompute invisible?
5. Does "free navigation" (Patterns B, D) include navigating to a *future* hole (entering hole 9 before hole 7) — or only to *past* holes (correcting hole 7 after hole 9)? The forward-navigation case has no engine implication (the hole simply hasn't been settled yet) but may confuse users.

---

## Logged for Future Triage

One additional UX-framing question surfaced during the research pass and is logged here without expansion. It is not in scope for this pass.

**`junkMultiplier` absent from `GameInstance` and setup screens**: `GameInstance` (`src/types/index.ts:60`) has no `junkMultiplier` field. All four engine config types (`SkinsCfg`, `WolfCfg`, `StrokePlayCfg`, `NassauCfg`) include `junkMultiplier: number`. There is no setup screen question for junk multiplier. This is a setup-flow gap for Junk, not addressed in the three items above. Source: TRIAGE_25-April-2026.md Coda.

---

*End of framing document. No patterns selected. No designs proposed. Reviewer decides scope and direction.*
