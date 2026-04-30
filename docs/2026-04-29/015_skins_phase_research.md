---
prompt_id: 015
date: 2026-04-29
role: researcher
checklist_item_ref: "Skins phase scoping — research turn"
tags: [skins, phase-scope, research, read-only]
---

# Skins Phase — Research Findings

**Generated:** 2026-04-29  
**Purpose:** Scope inputs for the Skins phase plan document. No code changes. No checklist items filed.

---

## 1. Plan Doc State

`docs/plans/SKINS_PLAN.md` **does not exist**.

The only plan doc under `docs/plans/` is `STROKE_PLAY_PLAN.md`. The first deliverable of the Skins phase is writing a `SKINS_PLAN.md` modeled on that document. The structure should mirror SP: §Scope (phase-end trigger), §Park Definitions, §Fully Functional, §Phases, §Phase-End Trigger Criteria, §Parking-Lot Policy, §Decisions Deferred.

---

## 2. Engine State

### 2a. `computeSkins` completeness

`src/games/skins.ts` is **complete**. Both engine functions are implemented:

- **`settleSkinsHole(hole, config, roundCfg): ScoringEvent[]`** — per-hole stateless pass. Emits provisional `SkinWon`, `SkinCarried`, `SkinVoid`, or `FieldTooSmall`. Carry is always 0 in the provisional points; `finalizeSkinsRound` rescales.
- **`finalizeSkinsRound(events, config): ScoringEvent[]`** — accumulates carry, rewrites `SkinWon` points by integer multiplier `(1 + carryCount)`, resolves final-hole `SkinCarried` under `config.tieRuleFinalHole`. Multi-bet pass-through: non-Skins events flow through unchanged.

Validation guard (`assertValidSkinsCfg`) enforces: positive integer stake, valid `tieRuleFinalHole` enum, boolean `appliesHandicap`/`escalating`, `playerIds.length` 3–5, array `junkItems`, positive integer `junkMultiplier`.

**No gaps found in the engine logic.**

### 2b. Test coverage

| File | Test suites | `it` blocks |
|---|---|---|
| `src/games/__tests__/skins.test.ts` | 17 describe blocks | ~33 |
| `src/bridge/skins_bridge.test.ts` | 5 describe blocks | 22 |
| **Total Skins-specific** | **22** | **~55** |

All 55 are included in the **358/358** global pass confirmed today (2026-04-29).

Engine test scenarios covered: worked example verbatim (§10), hole-18 split default, carryover, no-points, 3-player field, missing gross, all-tied final hole, two-way tie final hole, handicap negative net, carry accumulation, net-handicap flip, player withdraws, field shrinks below 2, typed error throws (6 cases), purity/statelessness, round-handicap integration via `effectiveCourseHcp`. Pass-through (non-Skins events) verified.

Bridge test scenarios covered: 3-player 2-hole basic (S1), carry accumulation 3-player (S2), IncompleteCard path (S3), 4-player variant (S4), `payoutMapFromLedger` output shape (S5).

### 2c. Bridge integration

`src/bridge/skins_bridge.ts` **exists and is complete**.

- Exports `settleSkinsBet(holes, players, game) → { events, ledger }`.
- Imports `settleSkinsHole`, `finalizeSkinsRound` from the engine; `buildHoleState`, `buildMinimalRoundCfg` from `src/bridge/shared.ts` (the shared utilities extracted during Skins bridge work on 2026-04-25).
- Ledger reduction: sums `points` from `SkinWon` events only. `SkinCarryForfeit` (carries `carryPoints`, not `points`) is excluded. `RoundingAdjustment` is never emitted by the Skins engine.
- v1 hardcodes: `tieRuleFinalHole: 'split'`, `appliesHandicap: true`, `junkItems: []`, `junkMultiplier: 1`. The `escalating` field is NOT hardcoded — it reads `game.escalating ?? true` because `GameInstance.escalating?: boolean` already exists.

`src/bridge/shared.ts` also exists, extracting `buildHoleState`, `EMPTY_JUNK`, `buildMinimalRoundCfg`, and `payoutMapFromLedger` for reuse by any bet bridge. Stroke Play bridge was updated to import from shared when this was created.

### 2d. GAME_DEFS entry

`src/types/index.ts:152`:
```ts
{ key: 'skins', label: 'Skins', description: 'Win the hole outright to win the skin', disabled: true },
```

**Unpark procedure** (from `STROKE_PLAY_PLAN.md §1a`):
1. Remove or set `disabled: false` on the GAME_DEFS `'skins'` entry.
2. Remove `'skins'` from the `GameList.tsx` disabled filter.
3. Wire the cutover in `src/lib/payouts.ts`: replace `case 'skins': return computeSkins(...)` with a call to `settleSkinsBet` + `payoutMapFromLedger`.

All three are surgical, well-understood changes. The infrastructure (bridge, shared utilities, engine) is ready.

---

## 3. Spec Summary (`docs/games/game_skins.md`)

### Carryover
**Yes, carryover is the core mechanic under `escalating: true` (default).**

Every tied non-final hole emits `SkinCarried` and adds one `stake` to the carry accumulator. The next decisive hole's winner collects the pot scaled by `(1 + carryCount)`. Under `escalating: false`, tied holes emit `SkinVoid` with zero delta and no carry.

### Validation requirements
**None.** There is no "must win with a birdie" or any threshold-based validation mode in the current spec. The only hole-level filter is the missing-score exclusion (gross ≤ 0 drops the player from that hole's contenders; does not affect carry). No validation mode exists to park.

### Tie behavior on a hole
- **Non-final hole:** Always carries (emit `SkinCarried`) under `escalating: true`. Always voids under `escalating: false`.
- **Final hole (hole 18 or last scored hole):** Resolved under `tieRuleFinalHole`:
  - `split` (default): tied winners collect `potPerOpponent × loserCount`; losers each pay `potPerOpponent` per winner. Zero-sum. If all players tie, forfeit.
  - `carryover`: emit `SkinCarryForfeit`; no payout; breaks zero-sum for the round.
  - `no-points`: emit `SkinCarryForfeit`; void; zero-sum.

`tieRuleFinalHole` governs the **final scored hole only**. All earlier ties always carry regardless of this setting.

### Handicap interaction
`appliesHandicap: true` (default, and hardcoded in the v1 bridge). Net score per hole = `gross - strokesOnHole(strokes, holeIndex)` where `strokes = effectiveCourseHcp(player)` = `courseHcp + roundHandicap`. The bridge already computes this through `buildHoleState → HoleState.strokes[pid]`. Engine reads `hole.strokes[pid]` directly — no re-computation at engine time. Negative nets are allowed (no floor).

### Stake structure
**`$X per skin.`** One skin per hole. The stake is one integer unit (default 100 minor units ≈ $1). With `escalating: true`, a tied hole adds its stake to the next decisive hole's pot. Winner of a hole with `n` carries takes `stake × (1 + n) × loserCount` from the field. Loser pays `stake × (1 + n)` per hole regardless of winner count. No multiplier mechanic. No press.

### Settlement output shape
**Round total per player (via ledger), with per-event detail available.**

`settleSkinsBet` returns `{ events, ledger }`. The `ledger` is a `Record<PlayerId, number>` of net deltas accumulated from `SkinWon` events. `payoutMapFromLedger(ledger, playerIds)` projects this to a `PayoutMap` (which ensures all players have an entry, including zero-delta ones). The `events` array carries per-hole detail (`SkinWon` with hole number and points, `SkinCarried` with hole and contenders). Per-hole detail is not currently surfaced in the bets/results pages — those pages consume a `PayoutMap` only. This is the primary **new UI surface** Skins requires that Stroke Play did not.

---

## 4. UI Scope Estimate

**Do not propose implementations — enumeration only.**

### Wizard (`GameInstanceCard.tsx`)

The Skins block at `src/components/setup/GameInstanceCard.tsx:78–83` **already exists**:
```tsx
{game.type === 'skins' && (
  <label className="flex items-center gap-2">
    <input type="checkbox" checked={game.escalating ?? false}
      onChange={(e) => updateGame(game.id, { escalating: e.target.checked })} />
    <span>Escalating skins</span>
  </label>
)}
```

The escalating toggle is already wired. For v1, the only wizard surface that does NOT yet exist for Skins is:
- **Player-count minimum enforcement** (Decision A, below): optional UI guard rejecting < 3 players. The engine throws `SkinsConfigError` if < 3 — question is whether the wizard surfaces this proactively.

Optional-within-Skins (could park for v1):
- `tieRuleFinalHole` picker (carryover/split/no-points) — currently hardcoded `split` in bridge.
- `appliesHandicap` toggle — currently hardcoded `true` in bridge.

### Scorecard

**No new per-hole data entry surfaces required.** Score entry (`ScoreRow`) is identical to Stroke Play — one gross score per player per hole. There is no "captain decision" analog (cf. Wolf) and no "press confirmation" analog (cf. Nassau).

Optional-within-Skins (could park for v1):
- Per-hole carry indicator showing current accumulated carry in minor units.

### Results / Bets pages

**This is the new surface Skins requires that Stroke Play did not.** The current `PayoutMap`-based display shows only net totals (who is up/down for the round). For Skins, the meaningful display is:
- Which player won each skin (hole number, pot value including carry).
- Which holes carried and how much.
- A per-hole skin table on the bets or results page.

The `events` from `settleSkinsBet` have all this detail. The `PayoutMap` does not. A per-hole skins table requires either: (a) exposing `events` alongside `payoutMap` to the results page, or (b) building a separate `SkinsRoundSummary` projection. This is a **new data flow** that Stroke Play never needed.

The Skins cutover in `computeGamePayouts` only changes the `PayoutMap` route (totals only). If the per-hole skin display is wanted at launch, the engineer must also thread the `events` array to the results/bets page — which requires changes beyond `payouts.ts`. If the per-hole display is parked, the Skins cutover is as surgical as Stroke Play.

---

## 5. Fence

**Stays parked — confirmed:**
- Wolf, Nassau, Match Play: `disabled: true` in GAME_DEFS; no bridge entry points wired into `computeGamePayouts`.
- Junk (Phase 3): parked structurally. `GameInstanceCard` shows the junk section for Skins (line 123 check `game.type !== 'strokePlay'`), but `junkItems: []` is hardcoded in the Skins bridge. No junk events will be emitted or settled. No change needed to park junk within the Skins phase — it is already absent from the bridge.

**Parkable-within-Skins (candidates for explicit v1 park):**
- `tieRuleFinalHole` wizard picker: bridge hardcodes `split`; shipping without a picker is a complete product feature (the default is the correct default).
- `appliesHandicap` toggle: bridge hardcodes `true`; gross scoring is documented as a variant but not required for v1.
- Per-hole skin display on results/bets page: results page shows totals only for Stroke Play and could do the same for v1 Skins.

There is **no validation mode** to park within Skins. The spec has none and there is no in-progress work on one.

---

## 6. Phase Gate Proposal

Modeled on STROKE_PLAY_PLAN.md §4, which requires: grep gate, SP-2 tests, SP-3 integration tests, manual playthrough, and `tsc`.

**Candidate A — Code gates only (narrow)**
1. `git grep -rn "computeSkins" src/` → zero matches.
2. All Skins engine + bridge tests pass (`npm run test:run`).
3. `tsc --noEmit --strict` passes.

*Assessment:* Easy to close. Does not verify browser behavior. Matches SP-4's code gates but omits the manual playthrough that SP-4 §4 condition 4 required (and then retroactively carried as PF-2). Given that SP was burned by deferring the browser verification, Candidate A alone is insufficient.

**Candidate B — Cowork-verified (recommended)**
All gates from Candidate A, plus:
4. Manual playthrough: at least one Skins round played end-to-end on the running dev server. `escalating: true`, `appliesHandicap: true`, at least one carry resolved (i.e., at least one tied hole followed by a decisive hole). Final settlement displayed on the results page. Payouts verified zero-sum by Cowork inspection.

*Assessment:* Same bar as SP-4's actual closure standard (manual playthrough required, not deferred). Skins is simpler to play through than an 18-hole Stroke Play round — 3 players, 9 holes is sufficient to verify carry. This is the recommended gate.

**Candidate C — Exhaustive (higher bar)**
All gates from Candidate B, plus:
5. Per-hole skin table displayed on results or bets page (requires new UI work beyond `payouts.ts`).
6. `tieRuleFinalHole` tested in all three modes via Playwright or Cowork verification.

*Assessment:* Sets a higher bar than Stroke Play. Appropriate if the per-hole skin display is considered core product (not optional). Makes the Skins phase longer. Recommend only if operator decides the per-hole display is launch-required, not parkable.

**Recommendation: Candidate B.** Same evidence standard as SP-4. Parks per-hole display and alternate tie rules as follow-on work. Cowork can play a 9-hole Skins round faster than an 18-hole Stroke Play round.

---

## 7. Risk Areas

### R1 — Legacy `computeSkins` semantic divergence on final hole

`src/lib/payouts.ts:49` implements `computeSkins`. It handles carry via a simple accumulator but **has no `tieRuleFinalHole` logic**. If hole 18 ties under the legacy path, the carry accumulates in the counter and is never resolved — the round total shows zero for those staked holes (silently). The new engine resolves the final hole under `split` (default), so tied hole 18 would produce payouts between tied winners and losers.

**Consequence:** Any Skins rounds played on the legacy path with hole 18 tied will produce different totals on the new engine path. If Cowork has played prior Skins rounds with carries on the final hole, the retrospective results will differ. This is a correct change (the old behavior was wrong), but it may surface as a "why is this different" finding.

Separately: the legacy function doesn't correctly handle `escalating: false` — it accumulates carry silently even when `escalating: false`, then uses `game.stake + 0` for the pot (correct pot value, but the carry counter grows without being used or reset). The new engine correctly emits `SkinVoid` under `escalating: false`. The money math is the same for `escalating: false` rounds, but the event semantics are cleaner.

### R2 — Per-hole results display gap (the SP-UI-7 analog for Skins)

SP-UI-7 was "looks fine until you check the DB" — settlement computed from Zustand was correct, but DB `Round.status` was stuck `InProgress`, causing routing and badge bugs invisible to the settlement display.

The Skins equivalent is: **settlement totals look correct on the results page but the per-hole skin detail is absent**. After the cutover, results page shows `A: +$45, B: -$15, C: -$30` with no indication of which holes A won or how carry built. For Stroke Play this is acceptable (totals are the result). For Skins, the per-hole breakdown is the game — players want to see "B won hole 4 with a 3-skin pot." The totals are correct; the display is informationally incomplete. Cowork is very likely to flag this as a gap during playthrough.

This is not a data bug — it is a display scope decision. Whether per-hole detail must be in-scope for Skins v1 is an operator call. It is the single biggest scope driver for the Skins phase.

### R3 — `playerIds` minimum enforcement gap (Decision A, unresolved)

The engine's `assertValidSkinsCfg` throws `SkinsConfigError('playerIds', 'length must be 3..5')` if < 3 players are in the Skins config. The `GameInstanceCard` has a player toggle that allows removing players freely — a user could add Skins and de-select players down to 2 before submitting. The bridge would then receive a 2-player config and throw at compute time. The results page or bets page would likely crash or display empty payouts rather than showing a friendly error.

SP had no equivalent constraint (2-player Stroke Play is valid). This is new surface area.

**Decision A** (STROKE_PLAY_PLAN.md §7, still deferred) asks: does v1 enforce minimum-3 at the wizard, or let the engine reject it at compute time? Either approach requires an explicit decision before the Skins bridge prompt is written.

### R4 — Carry state with incomplete rounds (reload sensitivity)

Settlement is computed from Zustand state (architecture note in CLAUDE.md, added today): `computeAllPayouts` calls `computeGamePayouts` using `holes` and `games` from the Zustand store or hydrated via `GET /api/rounds/{id}`. No settlement in DB.

For Skins, `settleSkinsBet` processes holes in array order. `finalizeSkinsRound` sorts by hole number internally. If a player reloads mid-round (e.g., after hole 12), `hydrateRound` fetches all Score rows from the DB. Only holes 1–12 have scores; holes 13–18 have no rows. The engine will see 12 holes, treat hole 12 as the "final hole," and apply `tieRuleFinalHole` to resolve any carry on hole 12 as if the round ended there. The settlement on the bets page mid-round would show a final-hole resolution that isn't actually final.

For Stroke Play this is not a problem — `finalizeStrokePlayRound` just sums over whatever holes exist. For Skins, the "final hole" is dynamically determined from the events, so incomplete hydration produces semantically wrong finalization (not just incomplete finalization). This is a latent bug on the reload path. It may or may not be visible during Cowork playthrough, depending on whether they reload mid-round.

### R5 — Two-phase pattern vs. `computeGamePayouts` call site

The `computeGamePayouts` signature in `payouts.ts` is `(holes, players, game) → PayoutMap`. The Skins cutover replaces `computeSkins(holes, players, game)` with `settleSkinsBet(holes, players, game).ledger` projected via `payoutMapFromLedger`. The ledger only contains players who appeared in `SkinWon` events (i.e., players who won at least one skin or were charged). `payoutMapFromLedger` fills in all `game.playerIds` with zero for any not in the ledger — so players who went 0-for-18 (no skins, owed nothing) get a zero entry. This matches the expected `PayoutMap` contract.

**One edge to verify at cutover:** what happens if a Skins round has no `SkinWon` events at all (e.g., all 18 holes tied under `escalating: true`, all carried to hole 18, hole 18 also ties under `tieRuleFinalHole: 'split'` → `SkinCarryForfeit`)? The ledger will be empty `{}`. `payoutMapFromLedger({}, game.playerIds)` should return all-zeros. This is correct behavior (no money changed hands), but it is different from `computeSkins` returning `emptyPayouts` for the same scenario — the same outcome, just through a different code path. Not a bug, but worth a unit test in the bridge cutover.

---

## 8. Summary Table for Plan-Shape Decision

| Topic | Status | Notes |
|---|---|---|
| SKINS_PLAN.md | **Does not exist** | First deliverable of Skins phase |
| Engine (`skins.ts`) | **Complete** | Two-phase, stateless, tested |
| Bridge (`skins_bridge.ts`) | **Complete** | `settleSkinsBet` + `shared.ts` utilities |
| Engine tests | **~55 its, all passing** | 33 engine + 22 bridge |
| GAME_DEFS `disabled: true` | **Confirmed** | Known unpark procedure documented |
| Escalating toggle in wizard | **Already exists** | `GameInstanceCard.tsx:78–83` |
| `tieRuleFinalHole` in wizard | **Not present** (hardcoded `split`) | Parkable for v1 |
| `appliesHandicap` toggle | **Not present** (hardcoded `true`) | Parkable for v1 |
| Per-hole skin display | **Not present** | Scope decision: required or parked? |
| Decision A (player-count UI) | **Unresolved** | Must decide before bridge prompt |
| Wolf / Nassau / Match Play | **Parked** | No change needed |
| Junk within Skins | **Parked** (`junkItems: []` hardcoded) | No change needed |
| Validation mode | **Does not exist in spec** | Nothing to park |
| Recommended phase gate | **Candidate B** | Cowork playthrough required at closure |

---

## 9. Files Consulted

- `docs/plans/STROKE_PLAY_PLAN.md`
- `docs/games/game_skins.md`
- `src/games/skins.ts`
- `src/games/__tests__/skins.test.ts`
- `src/bridge/skins_bridge.ts`
- `src/bridge/skins_bridge.test.ts`
- `src/bridge/shared.ts`
- `src/types/index.ts` (GAME_DEFS)
- `src/components/setup/GameInstanceCard.tsx`
- `src/lib/payouts.ts` (`computeSkins` legacy)
- `docs/proposals/pending-items-evaluation.md`
- `docs/2026-04-29/014_closeout.md`
- `2026-04-25/SKINS_BRIDGE_EXTRACTION_25-April-2026.md`
- `2026-04-25/SKINS_PLAYER_COUNT_FIX_25-April-2026.md`
- `npm run test:run` output (358/358 confirmed)
