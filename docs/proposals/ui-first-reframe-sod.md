# UI-First Reframe — SOD Report

**Date:** 2026-04-25  
**Status:** Investigation only. No code, no rule-doc, no plan edits. For review before any implementation prompts.  
**Scope:** Two decisions from the ui-first-reframe scoping pass: (1) Skins player-count correction, (2) per-bet bridge structure and cutover cadence.

---

## 1. Current State of `docs/games/game_skins.md`

### §2 verbatim

> ## 2. Players & Teams
>
> Minimum 2 players, maximum 5. No teams. Every player plays for themselves. Handicap strokes apply per hole via `strokesOnHole(strokes, holeIndex)` in `src/games/handicap.ts`.

### Every other reference to player counts or 2-player assumptions in `game_skins.md`

| Location | Text | Type |
|---|---|---|
| `game_skins.md:7` (§1 Overview) | "This file specifies Skins for 2–5 players" | Config-range declaration |
| `game_skins.md:26` (§4 Setup) | `` playerIds: PlayerId[]  // length 2..5 `` | Interface comment |
| `game_skins.md:151` (§9 Edge Cases) | "If fewer than 2 players remain, emit `FieldTooSmall`" | Per-hole mechanic |
| `game_skins.md:156` (§9 Edge Cases) | "Field shrinks below 2 mid-round — scoring halts; remaining holes emit `FieldTooSmall`" | Per-hole mechanic |
| `game_skins.md:229` (§12 Test 4) | "### Test 4 — Field of 2 players" | Explicit 2-player test case |
| `game_skins.md:231` | "Stake 1, all defaults, 18 holes. Assert zero-sum holds…" | Test body using 2-player field |

**Notes on the §9 references:** The two "fewer than 2 contenders" references are per-hole mechanics describing what happens when players have missing scores — a field of 4 can shrink to 1 eligible contender on a given hole. These describe the contenders-at-scoring-time floor, not the config minimum. They would be unchanged if the minimum player count becomes 3. Rewriting to "fewer than 2 contenders remain for this hole" makes the distinction explicit, but no logic changes.

---

## 2. Engine and Test 2-Player Audit

### `src/games/skins.ts`

**Line 81** — the validation guard:
```ts
if (!Array.isArray(cfg.playerIds) || cfg.playerIds.length < 2 || cfg.playerIds.length > 5) {
  throw new SkinsConfigError('playerIds', 'length must be 2..5')
}
```
If 2-player is dropped: change `< 2` to `< 3`; update the error message to `'length must be 3..5'`. One-line change.

**Line 144** — the per-hole contenders floor:
```ts
if (contenders.length < 2) {
  return [{ kind: 'FieldTooSmall', ... }]
}
```
This is a per-hole mechanics check (field shrinkage during a round), not a config minimum. It stays at `< 2` regardless of the config minimum change. A skin requires two surviving contenders to be contested; that doesn't change.

No other 2-player structural assumptions exist in `skins.ts`. The scoring math is purely player-count-agnostic: `stake * losers.length` and the `for (const l of losers)` loop work for any N ≥ 2.

### `src/games/__tests__/skins.test.ts`

Five tests use 2-player configurations:

| Test | Lines | Setup | Nature | Change required |
|---|---|---|---|---|
| Test 5 "field of 2 players" | 338–362 | `playerIds: ['A', 'B']`, 18-hole round | Dedicated 2-player test per §12 Test 4 spec | **Remove or replace** with a 3-player equivalent |
| Test 10 "handicap strokes produce a negative net" | 429–457 | `playerIds: ['A', 'B']`, appliesHandicap | Tests negative-net correctness; 2-player is incidental | **Rewrite** fixture to 3 players; keep the assertion |
| Test 12 "net-score handicap changes skin winner" | 488–519 | `playerIds: ['A', 'B']`, appliesHandicap | Tests handicap flip; 2-player is incidental | **Rewrite** fixture to 3 players; keep the assertion |
| Test 17 "Round Handicap integration" | 633–697 | `playerIds: ['A', 'B']`, effectiveCourseHcp | Tests effectiveCourseHcp routing; 2-player is incidental | **Rewrite** fixture to 3 players; keep the assertion |
| Config error test "playerIds outside 2..5" | 590–593 | `playerIds: ['A']` (length 1) | Tests validation; boundary shifts | **Update** test description and expected error message to `3..5` |

**Summary of required changes if minimum becomes 3:**
- `skins.ts`: 1 validation guard line
- `skins.test.ts`: 1 test removed or rewritten, 3 tests with fixture rewrite (keep assertions), 1 test description/message update
- `game_skins.md`: §1, §2, §4 comment, §12 Test 4 (4 locations)

No changes to `finalizeSkinsRound`, carry logic, or any scoring math — all are N-agnostic.

---

## 3. Variants Question

The user's statement is: "Traditional skins is 3 players. Never 2 — 2-player is match play, not skins. Variants are allowed but the boundary needs definition."

The framing distinguishes two things: (a) the canonical/traditional form (3 players) and (b) the variants question (4 and 5 players, "allowed but the boundary needs definition"). The decision is what to say in the rule doc and what to enforce in the engine.

### Option A — v1 is 3-player only; engine and UI both restricted to 3

Rule doc minimum and maximum both become 3. Engine validation: `cfg.playerIds.length !== 3`. V1 UI enforces exactly 3. 4 and 5 are post-v1 variants.

**Problem with Option A:** The existing worked example in `game_skins.md §10` uses 4 players (Alice, Bob, Carol, Dave) across an 18-hole table. Restricting the engine to exactly 3 would require rewriting or replacing the worked example — a non-trivial doc change — and would mean a round combining Wolf (4-or-5-player only) with Skins is impossible until post-v1.

### Option B — Minimum 3, maximum 5; 4 and 5 are documented variants; engine supports 3–5; v1 UI enforces minimum 3

Rule doc §2 becomes: "Minimum 3 players, maximum 5. Canonical form: 3 players. 4 and 5-player variants are supported." Engine validation changes to `< 3`. V1 UI enforces minimum 3 at game setup; the engine supports 3–5 without restriction.

**Option B preserves:** the §10 worked example (4-player), Wolf+Skins combination rounds (Wolf requires 4–5; Skins supporting 4–5 means a single round can include both), and the §9 edge cases (all N-agnostic).

### Option C — Nothing in the existing code/docs suggests a third framing worth pursuing.

### Recommendation: **Option B**

Three reasons:
1. The engine math is already N-agnostic. Restricting it to exactly 3 in the validation guard would be artificial and would need reverting the moment a 4-player game occurs — which will happen the first time a Wolf+Skins round is set up (Wolf requires 4–5).
2. The §10 worked example uses 4 players. Keeping it requires supporting 4 players in the engine. Replacing it with a 3-player example is a larger doc change than just updating the minimum.
3. "Variants allowed but boundary needs definition" maps cleanly to Option B: the boundary is "minimum 3 (canonical form)"; the upper bound stays at 5; v1 UI may further restrict the default or recommended player count at the setup layer without engine restrictions.

**If Option B is approved:** §1 and §2 of `game_skins.md` gain a v1 scope note clarifying that the rule constraint is 3–5, and the v1 UI enforces a minimum of 3. The §12 Test 4 "Field of 2 players" becomes "Field of 3 players." The §9 prose references to "fewer than 2 contenders" stay as-is (per-hole mechanics, unchanged).

---

## 4. Per-Bet Bridge Analysis

### 4a. Shared vs independent: what the five engines have in common at the HoleState boundary

All five engine entry points share the same first three parameters:

```ts
settleSkinsHole    (hole: HoleState, config: SkinsCfg,     roundCfg: RoundConfig)
settleWolfHole     (hole: HoleState, config: WolfCfg,      roundCfg: RoundConfig, decision: WolfDecision | null)
settleNassauHole   (hole: HoleState, config: NassauCfg,    roundCfg: RoundConfig, matches: MatchState[])
settleMatchPlayHole(hole: HoleState, cfg: MatchPlayCfg,    roundCfg: RoundConfig, match: MatchState)
settleStrokePlayHole(hole: HoleState, config: StrokePlayCfg, roundCfg: RoundConfig)
```

`HoleState` is a single shared type (`src/games/types.ts:158`). Every engine receives the same struct. The `gross`, `strokes`, `withdrew`, `conceded`, `pickedUp`, `ctpWinner`, `longestDriveWinners`, junk-metadata booleans — all are populated in `HoleState` and consumed selectively by each engine.

**Shared layer:** The conversion from `HoleData` (what the UI store holds) to `HoleState` (what every engine requires) is structurally identical for all five bets. It is a single function regardless of which bet is being resolved. This is the natural shared layer.

**Divergent by engine:**

| Dimension | Skins | Stroke Play | Wolf | Nassau | Match Play |
|---|---|---|---|---|---|
| Extra params | none | none | `WolfDecision \| null` | `MatchState[]` (all in-flight matches) | `MatchState` (single match) |
| Return type | `ScoringEvent[]` | `ScoringEvent[]` | `ScoringEvent[]` | `{ events: ScoringEvent[]; matches: MatchState[] }` | `{ events: ScoringEvent[]; match: MatchState }` |
| UI decision required | no | no | yes — captain partner/lone | yes — press confirmation | optional — concession |
| State threading | none | none | none | MatchState threads in/out | MatchState threads in/out |

**Recommendation: one shared `HoleData → HoleState` builder, five independent per-bet orchestration wrappers.**

The shared builder is small: map UI score fields to `gross`, map handicap to `strokes`, map junk booleans, set `withdrew`/`conceded`/`pickedUp`. Implementing it once and using it in all five bridges is the correct abstraction — the struct is identical at the boundary.

The per-bet wrappers are genuinely different. Wolf's wrapper must gather a `WolfDecision` from the UI before calling the engine. Nassau's wrapper threads `MatchState[]` across holes and surfaces press events to a UI confirmation dialog before letting play continue. Match Play's wrapper manages a single `MatchState` and handles concession events. Skins and Stroke Play's wrappers are straightforward: build HoleState, call engine, collect events.

A single "general bridge" that tries to abstract all five orchestration patterns would add complexity without removing duplication — the decision/state-threading differences are structural, not incidental. Per-bet wrappers calling a shared `buildHoleState()` utility is the right split.

### 4b. Cutover cadence: per-bet vs batched

`src/lib/payouts.ts` structure: five per-bet functions (`computeStrokePlay`, `computeMatchPlay`, `computeSkins`, `computeNassau`, `computeStableford`) behind a dispatcher (`computeGamePayouts`) behind a top-level entry point (`computeAllPayouts`). Note: no `computeWolf` — Wolf has no legacy implementation; it falls through to `default: return computeStrokePlay` in the dispatcher (`payouts.ts:165`).

Two callers in the UI: `src/app/bets/[roundId]/page.tsx:6` and `src/app/results/[roundId]/page.tsx:7` — both call `computeAllPayouts`.

The other `src/lib/` files are mostly UI display utilities, not parallel engine logic:
- `src/lib/scoring.ts` — `vsPar`, `parLabel`, `parColor`, `formatMoney` — display helpers, not engine logic; may survive or be absorbed into the UI layer independently of the engine cutover.
- `src/lib/junk.ts` — `defaultJunk`, `syncJunkAmounts`, `hasAnyJunk`, `hasGreenieJunk` — setup and display helpers; same status.
- `src/lib/handicap.ts` — explicitly `@deprecated` with a migration note pointing to `src/games/handicap.ts`. One caller: `src/store/roundStore.ts`. Straightforward cutover.

**Trade-off:**

| Cadence | What it means | Risk |
|---|---|---|
| Per-bet | When bridge X lands, delete `compute<Bet>()` from payouts.ts and route that bet's UI pages away from `computeAllPayouts` | `payouts.ts` is partially hollowed for weeks; bets/results pages need conditional routing logic during the transition; foot-gun if one bet regresses |
| Batched | Leave payouts.ts intact while bridges land; delete the whole file in one commit after all five bridges are validated end-to-end | Higher confidence at cutover; slightly longer carry time for the parallel path |

**Recommendation: batched cutover.**

The structural argument: `computeAllPayouts` is a single dispatch function. During the bridge phase, the UI will transition from calling `computeAllPayouts` for all bets to calling `aggregateRound` (or equivalent) for all bets. The transition is cleanest as a single swap: one commit that updates bets/results pages to call the new path and deletes payouts.ts. Per-bet partial deletion requires the UI pages to route some bets through old code and some through new code simultaneously — that's a temporary split that produces more risk than it saves in cleanup time.

Corollary: the #11 cutover's gate should be "all five per-bet bridges validated, end-to-end play confirmed for each" — not a per-bet trigger. This matches the spirit of the original #11 AC ("~7 commits with grep gates").

---

## 5. Implementation Order (First Three Prompts)

Not drafting the prompts — naming the actions and sequence only.

1. **Rule doc fix:** Update `game_skins.md` — change minimum from 2 to 3 in §1, §2, §4, and §12 Test 4; add a one-line variant note for 4–5 players in §2. No engine changes in this prompt.
2. **Shared HoleState builder + first per-bet bridge (Stroke Play):** Build the `HoleData → HoleState` translator once; wire `settleStrokePlayHole` and `finalizeStrokePlayRound` into the round-resolution flow for Stroke Play bets. Simplest engine signature — no decision UI, no state threading.
3. **Second per-bet bridge (Skins):** Wire `settleSkinsHole` and `finalizeSkinsRound`. Next-simplest: no decision UI, no state threading, but adds carry finalization. Reuses the shared HoleState builder from prompt 2.

Batched cutover (#11) is deferred until prompts 2–6 are all validated end-to-end.

---

## Noticed But Out of Scope

The following were observed during the survey. Parking here without action.

1. **Wolf has no legacy implementation.** `payouts.ts:165` switch statement: `default: return computeStrokePlay(...)` — Wolf falls through to the Stroke Play computation (wrong behavior). This is pre-existing; irrelevant to the cutover because Wolf will be wired directly to the new engine with no legacy-to-new migration needed.
2. **`computeStableford` exists in payouts.ts.** There is no Stableford engine in `src/games/`. The function at `payouts.ts:131` is a legacy implementation of a bet type outside the five-bet scope. If `payouts.ts` is deleted at cutover, `computeStableford` goes with it. This is fine if Stableford is out of scope, but worth flagging: the cutover deletes Stableford computation silently. Not a blocker.
3. **`src/lib/handicap.ts` has exactly one non-deprecated caller** (`src/store/roundStore.ts` — `calcCourseHcp, calcStrokes`). The `@deprecated` notice asks callers to migrate to `src/games/handicap.ts`. The store hasn't migrated yet. Not a blocker for the bridge prompts but will need addressing before the `src/lib/handicap.ts` deletion.
4. **`computeAllPayouts` is missing Wolf** as a named case, not just the legacy functions. If any UI path currently tries to compute Wolf payouts via `computeAllPayouts`, it silently gets Stroke Play results. This bug predates the reframe; it will be resolved when Wolf gets its per-bet bridge.
