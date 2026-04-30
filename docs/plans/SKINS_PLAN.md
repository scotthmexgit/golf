# Skins Phase Plan

**Authored:** 2026-04-29  
**Status:** ACTIVE — single source of truth for AC during the Skins phase.  
**Source research:** `docs/2026-04-29/015_skins_phase_research.md`  
**Preceding phase:** Stroke-Play-only phase — closed 2026-04-29 per `docs/plans/STROKE_PLAY_PLAN.md`

---

## Scope

The Skins phase begins at adoption of this plan and ends when **SK-5 closes**.

**"Live in production" definition (SK-5 closure trigger):**

All of the following must be true before SK-5 is declared closed:

1. `git grep -rn "computeSkins" src/` returns zero matches.
2. All Skins engine and bridge tests pass (`npm run test:run`).
3. `tsc --noEmit --strict` passes.
4. Playwright spec `tests/playwright/skins-flow.spec.ts` passes (see SK-4 §3).
5. Cowork verification pass complete (see SK-5 §3).

Closing SK-5 does **not** automatically unpark Wolf, Nassau, or Match Play. The next bet to unpark is a separate operator decision.

**Does not supersede:** `STROKE_PLAY_PLAN.md` (retained for history). Items #3–#10 in `REBUILD_PLAN.md` are done. Item #11 (full multi-bet cutover) remains deferred until the third bet unparks.

---

## 1. Resolved Decisions

The following decisions were open at Stroke-Play-only phase close. They are resolved here and encoded as plan scope. They are **not re-litigable within this phase**.

### Decision A — Player-count wizard guard

**Resolution: Option B′.** Skins instances require ≥ 3 selected players. The game setup wizard prevents "Tee It Up" (or rejects the Skins bet submission) when a Skins `GameInstance` has `playerIds.length < 3`. The engine's `assertValidSkinsCfg` guard (`skins.ts:81`) remains the computational backstop, not the primary failure surface.

**AC impact:** SK-3 adds a wizard-level guard. Error message visible to the user; engine throw is suppressed as a backstop, not user-facing.

### Decision B — Per-hole bet display as a scorecard rearchitecture

**Resolution: Universal two-row scorecard.** Every player row in the scorecard becomes two rows by default:
- **Top row:** gross score (current behavior, unchanged).
- **Bottom row:** total bet $/hole, summed across all active games for that hole.

Each player row is **expandable** (accordion) to show the per-bet breakdown — e.g., "Skins +$3, Stroke Play $0" — for that hole.

This is **universal**, not Skins-specific. It applies to Stroke Play (already live) and all future bets as they unpark. SK-1 builds this foundation; SK-2 rides on it. Match Play, Wolf, Nassau will use the same surface when they unpark.

**Stroke Play display note:** Stroke Play settlement is round-level (`finalizeStrokePlayRound` produces no per-hole delta). The bottom row for an in-progress Stroke Play game shows `$0` on every hole until the round is finalized. Once finalized, each player's net delta is attributable to no specific hole; the engineer implementing SK-1a chooses a sensible attribution (proposed: assign the final settlement delta to the last scored hole for display purposes; or show `$0` on all holes and only display the total in the results page). The engineer records the choice in the SK-1a session log.

### Decision C — R4 (reload mid-round triggers wrong final-hole resolution)

**Resolution: Fix in SK-2 (cutover ticket), not a separate ticket.** The bug: `finalizeSkinsRound` determines the "final hole" dynamically as `max(event.hole)` across emitted events. A mid-round reload with only holes 1–12 hydrated causes hole 12 to receive `tieRuleFinalHole` resolution prematurely.

**Proposed fix shape (not locked — engineer chooses implementation):**

Add an optional `finalHole?: number` parameter to `finalizeSkinsRound`. The bridge (`settleSkinsBet`) passes `roundConfig.holesCount` (18 for a full round) as `finalHole` when it is known. Only a `SkinCarried` event on the true final hole receives `tieRuleFinalHole` dispatch; all other `SkinCarried` events accumulate carry normally. When `finalHole` is not provided, current behavior (max hole) applies.

The bridge may also check `holes.length === roundConfig.holesCount` before calling `finalizeSkinsRound` to skip finalization entirely for an incomplete round — this is a valid alternative. The engineer documents the approach in the SK-2 session log.

**Playwright verification:** Use `skins-flow.spec.ts` (SK-4) to exercise reload mid-round. The spec navigates away from the scorecard after hole 6 and verifies that the carry state on reload is correct (not prematurely finalized). This is in addition to the full round end-to-end test.

### Decision D — Phase gate

See §Phase-End Trigger Criteria below. Five-item gate; all five required for SK-5 close.

---

## 2. Park Definitions

**Skins is the only bet unparking in this phase.** All other bets remain parked under Option (c) (`disabled: true` in GAME_DEFS, filtered in `GameList.tsx`). No GAME_DEFS changes for parked bets in this phase.

### 2a. Wolf

**Park option:** (c) — maintained.  
`src/types/index.ts` GAME_DEFS entry for `'wolf'` retains `disabled: true`.  
**Unpark trigger:** Separate operator decision after SK-5 closes.

### 2b. Nassau

**Park option:** (c) — maintained.  
`src/types/index.ts` GAME_DEFS entry for `'nassau'` retains `disabled: true`.  
**Unpark trigger:** Separate operator decision. D1 sub-task B questions remain open (see `STROKE_PLAY_PLAN.md §7`).

### 2c. Match Play

**Park option:** (c) — maintained.  
`src/types/index.ts` GAME_DEFS entry for `'matchPlay'` retains `disabled: true`.  
**Unpark trigger:** Separate operator decision. Decision D (sequence position) and Decision E (format toggle) remain open (see `STROKE_PLAY_PLAN.md §7`).

### 2d. Junk (side-bet engine)

Junk is not a primary bet and has no GAME_DEFS entry. **Junk remains structurally parked** in this phase.

`GameInstanceCard.tsx` renders the Junk / Side Bets collapsible section for all game types except Stroke Play (line 123 condition). This section is **visible** on a Skins instance in the wizard — this is pre-existing behavior — but produces no Skins settlement effect. `skins_bridge.ts` hardcodes `junkItems: []` and `junkMultiplier: 1`. No junk events are emitted or settled for Skins in v1.

**No change to junk wiring is in scope for this phase.** The section appearing in the wizard is an acknowledged cosmetic artifact; suppressing it is out of scope until junk Phase 3 unparks.

**Unpark trigger:** Separate operator decision when a primary bet that supports junk (Skins, Wolf, Nassau, Match Play) reaches Phase 3.

### 2e. Skins config options parked for v1

Two `SkinsConfig` fields are not surfaced in the wizard and are hardcoded in the bridge:

| Field | Hardcoded value | Wizard surface | Unpark trigger |
|---|---|---|---|
| `tieRuleFinalHole` | `'split'` | Not present | Separate operator decision |
| `appliesHandicap` | `true` | Not present | Separate operator decision |

`escalating` is **not** parked — the wizard already has the "Escalating skins" checkbox at `GameInstanceCard.tsx:78–83`.

---

## 3. Fully Functional — Skins v1

### Engine surface exercised

- `settleSkinsHole(hole, config, roundCfg)` — per-hole stateless provisional events.
- `finalizeSkinsRound(events, config)` with R4 fix applied (see §1 Decision C).
- `tieRuleFinalHole: 'split'` (hardcoded default; zero-sum preserved).
- `appliesHandicap: true` (hardcoded; net scoring).
- `escalating: true | false` (wizard toggle, both paths live).
- 3–5 players.
- `junkItems: []` (empty).

### UI surfaces in scope

| Surface | File | Role | New in this phase |
|---|---|---|---|
| Escalating toggle | `GameInstanceCard.tsx:78–83` | Already exists — no change | No |
| Player-count guard | `GameInstanceCard.tsx` or wizard submit handler | Prevent Tee It Up with < 3 Skins players | **Yes (SK-3)** |
| Two-row scorecard — total $/hole | `ScoreRow.tsx` + data-flow changes | Per-hole net $ across all active games | **Yes (SK-1a)** |
| Accordion per-bet breakdown | `ScoreRow.tsx` expand/collapse | Per-game per-hole delta | **Yes (SK-1b)** |
| Skins results integration | `results/[roundId]/page.tsx`, `bets/[roundId]/page.tsx` | Net totals per player (PayoutMap, same as SP) | No new component needed |

### UI surfaces NOT in scope for v1

- `tieRuleFinalHole` picker — parked (§2e).
- `appliesHandicap` toggle — parked (§2e).
- Per-hole skin-winner annotation on the scorecard (e.g., "B won this skin") — deferred; the accordion breakdown covers the $ amount.
- Junk side bets — parked (§2d).

### Edge cases in scope

- Tied hole carries to next hole (escalating=true).
- Tied hole voids (escalating=false, `SkinVoid`).
- Final-hole tie resolves under `split` (default).
- Missing gross score: player excluded from that hole's contenders; delta = 0.
- All players tie: `SkinCarryForfeit`, zero delta.
- Player count 3, 4, 5 (all valid).
- Reload mid-round: R4 fix ensures no premature final-hole resolution.

### Edge cases out of scope for v1

- `tieRuleFinalHole: 'carryover'` and `'no-points'` paths (engine-complete; bridge hardcodes `'split'`).
- `appliesHandicap: false` gross scoring (engine-complete; bridge hardcodes `true`).
- Per-hole skin-winner display (accordion shows $ only, not winner attribution).
- Junk items with Skins.

---

## 4. Phases

### SK-0 — Plan Doc (this document)

**Type:** Documenter  
**Sizing:** S  
**Status:** **CLOSED 2026-04-29** (this document is the deliverable).

---

### SK-1a — Scorecard Data-Flow Plumbing + Two-Row Layout

**Type:** Engineer  
**Sizing:** M  
**Dependencies:** None (can proceed immediately after SK-0).

**Purpose:** Thread per-hole settlement data to the scorecard page and render the two-row layout. This is the structural foundation on which SK-1b (accordion), SK-2 (Skins), and future bet unparks all build.

**What changes:**

The scorecard page currently has no per-hole settlement data — it displays gross scores only. After SK-1a, each `ScoreRow` receives a per-hole dollar total for that player across all active bets, and renders it as a second row below the gross score.

Data-flow approach (engineer chooses; record in session log):
- Call the bet bridge(s) from the scorecard page or a Zustand selector to compute per-hole `ScoringEvent[]` for all active games.
- Project events per hole: for each hole number, sum `points[pid]` across all `ScoringEvent` entries where `event.hole === holeNumber` and `event.points` is present.
- Pass the per-hole per-player total to `ScoreRow` as a new prop.

For Stroke Play (already live), per-hole delta is zero on every hole until round finalization (see §1 Decision B). The engineer chooses a display approach and documents it in the session log (proposed: $0 on in-progress holes; final delta attributed to last scored hole or shown in results page only).

**Acceptance criteria:**

- `ScoreRow.tsx` renders two rows per player: top row gross score (unchanged), bottom row total $/hole.
- Bottom row correctly sums deltas across all active games for that player on that hole.
- Stroke Play rounds: bottom row behavior matches the engineer's documented choice from the session log.
- `npm run test:run` passes. `tsc --noEmit --strict` passes.
- **Fence:** Changes are limited to scorecard page, `ScoreRow.tsx`, and data-flow wiring (Zustand selector or page-level computation). No engine changes. No bridge changes. No results/bets page changes. No wizard changes. No `payouts.ts` changes.

**Risk flags:**
- `ScoreRow.tsx` is used in the live Stroke Play path. Any change must not regress Stroke Play score entry. Playwright `stroke-play-finish-flow.spec.ts` (commit 2cd2b39) is the regression baseline — run it as part of SK-1a verification.
- Per-hole bridge calls on every render could be expensive if the round has 18 holes and multiple games. Consider memoizing or computing once in a parent and passing down.

---

### SK-1b — Scorecard Accordion (Per-Bet Breakdown)

**Type:** Engineer  
**Sizing:** S  
**Dependencies:** SK-1a complete.

**Purpose:** Make the bottom row expandable. When a player taps or clicks the two-row unit, it expands to show a per-bet breakdown — one line per active game with that game's label and delta for that hole. Tap again to collapse.

**Acceptance criteria:**

- Collapsed state: shows gross + total $/hole (SK-1a output — no change to collapsed view).
- Expanded state: one sub-row per active game. Each sub-row shows game label (e.g., "Skins", "Stroke Play") and that player's delta for that game on that hole. Sub-rows with $0 are shown (not hidden) so the user sees which games are active.
- Expand/collapse does not affect score entry interaction (stepper/number input above the row is unaffected).
- For a Stroke Play-only round, expanded view shows "Stroke Play $0" on in-progress holes and the final delta on the last hole (consistent with SK-1a behavior).
- `npm run test:run` passes. `tsc --noEmit --strict` passes.
- Playwright `stroke-play-finish-flow.spec.ts` still passes (Stroke Play regression).
- **Fence:** `ScoreRow.tsx` and any new sub-component only. No engine, bridge, or page-level logic changes beyond passing the per-bet breakdown to `ScoreRow`.

**Note on sequencing:** SK-1b can be dispatched in parallel with SK-2 or after SK-2. If SK-1b lands after SK-2, the accordion will show real Skins deltas immediately. If SK-1b lands before SK-2, the accordion shows "Skins $0" (Skins still parked). Either ordering is acceptable; the phase gate (SK-4 + SK-5) requires SK-1b to be complete before the Playwright spec and Cowork pass.

---

### SK-2 — Skins Cutover + R4 Fix

**Type:** Engineer  
**Sizing:** S–M  
**Dependencies:** SK-1a complete (scorecard data flow must be in place for Skins deltas to appear in the UI after cutover).

**Purpose:** Unpark Skins in GAME_DEFS, replace the legacy `computeSkins` call in `computeGamePayouts` with the engine bridge path, and apply the R4 reload fix.

**Unpark procedure (three steps):**

1. `src/types/index.ts`: Remove `disabled: true` from the `'skins'` GAME_DEFS entry (or set `disabled: false`).
2. `src/components/setup/GameList.tsx`: Remove `'skins'` from the disabled filter (if it is explicitly filtered rather than reading GAME_DEFS).
3. `src/lib/payouts.ts`: Replace `case 'skins': return computeSkins(holes, players, game)` with:
   ```ts
   case 'skins': return payoutMapFromLedger(
     settleSkinsBet(holes, players, game).ledger,
     game.playerIds,
   )
   ```
   Add the import: `import { settleSkinsBet } from '../bridge/skins_bridge'` and `import { payoutMapFromLedger } from '../bridge/shared'` (or consolidate with the existing shared import).

**R4 reload fix (incorporated here):**

Apply the fix chosen under §1 Decision C. The engineer documents the exact approach in the session log. Key AC item:

- After the fix, a mid-round reload with only holes 1–12 hydrated does NOT apply `tieRuleFinalHole` resolution to hole 12. Carry state at hole 12 is preserved correctly (not finalized). Verified by Playwright reload scenario in SK-4.

**Grep gate:** `git grep -rn "computeSkins" src/` → **zero matches** before SK-2 is declared done.

**Additional verification (use Playwright during development, not just at the gate):**

Per §1 Decision C: use Playwright during SK-2 development to exercise the reload scenario before filing the SK-2 report. The session log should include a Playwright output confirming the reload fix.

**Acceptance criteria:**

- `computeSkins` function body deleted from `src/lib/payouts.ts` (or the case replaced with the bridge call — `computeSkins` itself may remain as dead code if still referenced, but the dispatch path must use the bridge). Grep gate must pass.
- `case 'skins':` in `computeGamePayouts` routes through `settleSkinsBet → payoutMapFromLedger`.
- Skins game appears in the "Add a game" picker (GAME_DEFS `disabled` removed).
- Three-player Skins round settles correctly: zero-sum `PayoutMap`, correct winner, correct carry amounts.
- R4 reload fix applied and verified (Playwright or manual reload test documented in session log).
- `npm run test:run` passes (all 358+ tests, including existing Skins engine + bridge suites unchanged).
- `tsc --noEmit --strict` passes.
- Playwright `stroke-play-finish-flow.spec.ts` still passes (Stroke Play regression).
- **Fence:** `src/lib/payouts.ts`, `src/types/index.ts`, `src/components/setup/GameList.tsx`, and the R4 fix target file (bridge or engine). No new UI components. No wizard changes beyond the GAME_DEFS unpark. `computeMatchPlay`, `computeNassau`, `computeWolf` (or `default:` fallthrough) in `payouts.ts` remain untouched.

**Risk flags:**

- The legacy `computeSkins` and the new engine produce different results for a final-hole tied carry (legacy: carry accumulates silently, zero delta; new engine: split resolution). There are likely no historical Skins rounds in the DB with this edge case (Skins was never unparked in production). The engineer runs `SELECT * FROM "Game" WHERE type = 'skins'` to confirm before filing SK-2 report. If any exist, note them in the session log.
- Empty ledger edge case: if all 18 holes are tied under `escalating: true` and hole 18 also ties under `split` with all players tied → `SkinCarryForfeit`, the ledger is empty `{}`. `payoutMapFromLedger({}, game.playerIds)` must return all-zeros for all players. Confirm this behavior with a unit test or a manual assertion during SK-2.

---

### SK-3 — Wizard Player-Count Guard for Skins

**Type:** Engineer  
**Sizing:** XS  
**Dependencies:** SK-2 complete (Skins must be unparked before the guard is testable in the wizard).

**Purpose:** Implement Decision A. Prevent "Tee It Up" from proceeding when a Skins bet has fewer than 3 players selected.

**Acceptance criteria:**

- When a Skins `GameInstance` has `playerIds.length < 3`, the wizard disables or blocks the "Tee It Up" submit. A visible error message or disabled-state explanation is shown near the Skins card (e.g., "Skins requires at least 3 players").
- The guard is specific to Skins. Stroke Play (2+ players) and other game types are unaffected.
- Removing a player from a Skins bet below 3 triggers the guard immediately (not on submit only); or alternatively the submit button is disabled and the Skins card is highlighted — engineer chooses and documents.
- Adding players back above 3 clears the guard.
- `npm run test:run` passes. `tsc --noEmit --strict` passes.
- **Fence:** Wizard / setup components only (`GameInstanceCard.tsx` or the wizard page `round/new/page.tsx`). No engine or bridge changes.

---

### SK-4 — Playwright Spec

**Type:** Engineer  
**Sizing:** S  
**Dependencies:** SK-1a, SK-1b, SK-2, SK-3 all complete.

**Purpose:** Machine-verifiable closure evidence for the Skins phase. Parallels `stroke-play-finish-flow.spec.ts` for Skins. Required for the phase gate.

**Spec file:** `tests/playwright/skins-flow.spec.ts`

**Spec scope (minimum assertions for gate):**

1. **Setup:** Create a new round with 3 players, add a Skins bet (`escalating: true`, stake $5), start the round.
2. **Carry scenario:** Enter scores for holes 1–9. Ensure at least one tied hole (all players same gross) followed by a decisive hole. Assert that the scorecard bottom row shows the correct delta on the decisive hole (reflecting the carry).
3. **Reload mid-round:** After holes 1–6 are entered, reload the page. Assert that carry state is not prematurely finalized on hole 6 (R4 fix verification). Specifically, if hole 6 had a carry in, hole 6 should still show a carry state (not a resolved split) after reload.
4. **Accordion:** Expand a player row. Assert per-bet breakdown shows "Skins +$X" or "Skins −$X" for the decisive hole, and "Skins $0" for tied/carry holes.
5. **Finish flow:** Complete all 9 holes, finish the round.
6. **Results page:** Assert ledger is zero-sum across all 3 players. Assert each player's payout on the results page matches the expected engine output (computed from known gross scores in the spec fixture).
7. **DB assertion:** `Round.status = 'Complete'` in DB after finish.
8. **Fence tokens absent:** `computeSkins` not present in `src/lib/payouts.ts` (grep assertion). Wolf / Nassau / Match Play absent from the game picker (visible check). Junk section shown but `junkItems: []` in any round API response (or confirm junk UI is present but inactive).

**Acceptance criteria:**

- All 8 assertion groups pass on a clean run.
- Spec is self-contained (creates its own round, does not depend on pre-existing DB state beyond a running server).
- `npm run test:e2e` exits 0.
- **Fence:** New test file only. No application code changes.

---

### SK-5 — Cowork Visual Verification Pass

**Type:** Cowork  
**Sizing:** 1 session  
**Dependencies:** SK-4 green.

**Purpose:** Human visual verification of the complete Skins feature and the scorecard rearchitecture. Provides the qualitative evidence that Playwright cannot: correct visual layout, readable per-hole display, natural UX flow.

**Cowork verification checklist:**

1. **Scorecard two-row layout:** Player rows show gross score (top) and total $/hole (bottom). Layout is readable, numbers are correct.
2. **Accordion:** Expanding a player row shows per-bet breakdown. Label ("Skins", "Stroke Play") and $ amount match what the score on that hole should produce. Collapse restores the two-row view.
3. **Carry display:** On a hole where carry was accumulated, the decisive winner's bottom row shows the scaled pot (e.g., stake × 3 carry multiplier × field). The carry itself is visible either in the $ total or in the expanded view.
4. **Skins in wizard:** Skins appears in the "Add a game" picker. Escalating toggle works. Player selection produces immediate guard feedback if < 3 players.
5. **Parked engines absent:** Wolf, Nassau, Match Play do not appear in the game picker. Junk section appears in the Skins wizard card but does not affect settlement.
6. **Results page:** Net totals per player are correct. Zero-sum holds (Cowork verifies by inspection: sum of all player payouts = $0).
7. **Known issues to watch for (from risk register):** Note any hole where the bottom row shows a surprising amount. Note any accordion line that shows the wrong game label or amount. Note any display glitch in the two-row layout on small viewport.

**Phase-end trigger:** SK-4 green AND Cowork files no blocking findings. Minor cosmetic findings filed to parking lot do not block SK-5 close.

---

## 5. Phase-End Trigger Criteria

SK-5 is the terminal phase of the Skins phase. Closure requires all five conditions:

1. `git grep -rn "computeSkins" src/` → **zero matches**.
2. `npm run test:run` → all Skins engine + bridge tests pass (no regression).
3. `tsc --noEmit --strict` → passes.
4. `npm run test:e2e` → `tests/playwright/skins-flow.spec.ts` passes (all 8 assertion groups). The spec covers: carry scenario, reload mid-round (R4 fix), accordion breakdown, finish flow, results page zero-sum, DB Complete status, fence tokens.
5. Cowork verification pass: visual check of scorecard two-row layout, accordion, Skins wizard, parked-engine absence, results page correctness. No blocking findings.

After SK-5 closes, no bet unparks automatically. The next bet is a separate operator decision.

---

## 6. Parking-Lot Policy

Items deferred or out of scope for the Skins phase.

### Active-but-deferred (unblock when Skins closes)

| Item | Location | Notes |
|---|---|---|
| `tieRuleFinalHole` picker in wizard | §2e above | Can unpark with a single `GameInstanceCard` change + bridge de-hardcode |
| `appliesHandicap` toggle | §2e above | Can unpark similarly |
| Per-hole skin-winner annotation | SK-1b accordion | Accordion shows $, not winner name. Winner attribution is a display enhancement. |
| Junk with Skins | §2d | Architecture choice (Alt A vs Alt B) still open per `STROKE_PLAY_PLAN.md §7` |

### Independent of Skins (deferred to own items)

| Item | Source | Trigger |
|---|---|---|
| D1 sub-task B — Nassau §9 N35 tied-withdrawal | `STROKE_PLAY_PLAN.md §7` | Nassau unparks |
| D2 — junk.md §5 annotation | Backlog | #7b Phase 3 lands |
| D4 — nassau.md §7 press/junk annotation | Backlog | Can run any time |
| Verifier (SP-5) | `STROKE_PLAY_PLAN.md §3` | Separate operator decision |
| Match Play concession UI + format toggle | `STROKE_PLAY_PLAN.md §7` Decisions D, E | Match Play unparks |
| Nassau allPairs v1 scope | `STROKE_PLAY_PLAN.md §7` | Nassau unparks |
| Wolf captain decision UI | `STROKE_PLAY_PLAN.md §1c` | Wolf unparks |
| #11 full multi-bet cutover | `REBUILD_PLAN.md` | Third bet unparks |
| PUT-HANDLER-400 | Backlog | Independent cleanup |
| camelCase strokePlay label | Backlog (filed 2026-04-29) | Independent cleanup |
| Recent Rounds ordering tiebreaker | Backlog | Independent cleanup |
| No mid-round home nav from scorecard | Backlog | Future UX |
| Stepper par-default affordance | Backlog | Future UX |
| 21 Uncaught promise exceptions on /round/new | Backlog | Investigate independently |

---

## 7. Risk Register

### R1 — Legacy `computeSkins` semantic divergence at cutover

**Risk:** `computeSkins` (legacy) and `settleSkinsBet` (new engine) produce different settlement amounts when hole 18 ties. Legacy: no final-hole resolution (carry silently accumulates, result is zero delta on the carry). New engine: `tieRuleFinalHole: 'split'` resolution (tied winners collect from losers).

**Likelihood of observable impact:** Low. Skins was parked (`disabled: true`) throughout the Stroke-Play-only phase; there are almost certainly no production Skins rounds in the DB. Confirm with `SELECT COUNT(*) FROM "Game" WHERE type = 'skins'` during SK-2.

**Mitigation:** SK-2 AC includes the DB query. If Skins rounds exist with a tied hole 18, note them in the session log and flag to operator. The new behavior is correct; the legacy was wrong.

### R2 — Per-hole display gap (resolved by SK-1)

**Original risk (015_skins_phase_research.md §7 R2):** Results and bets pages showed only round totals; per-hole skin detail absent.

**Resolution:** SK-1a + SK-1b implement the universal two-row scorecard with accordion. After SK-1, per-hole skin deltas are visible on the scorecard during play. Results and bets pages continue to show round totals (unchanged); the scorecard is the per-hole surface.

**Residual:** Results and bets pages do not show per-hole skin detail — only round totals. This is an acknowledged scope limitation for Skins v1. Cowork may note it during SK-5; it is filed to parking lot, not a blocking finding.

### R3 — Player-count enforcement gap (resolved by SK-3)

**Original risk:** Engine throws `SkinsConfigError` at compute time for < 3 players; wizard had no guard.

**Resolution:** SK-3 adds the wizard-level guard. Engine throw remains as backstop. No user-facing throw expected after SK-3.

### R4 — Reload mid-round triggers wrong final-hole resolution (resolved in SK-2)

**Original risk:** `finalizeSkinsRound` treats `max(event.hole)` as the final hole. Mid-round reload with only 12 holes hydrated causes hole 12 to receive `tieRuleFinalHole` resolution.

**Resolution:** Fix applied in SK-2 (see §1 Decision C). Playwright spec (SK-4) includes a reload scenario to verify. The fix is verified during SK-2 development, not deferred to SK-4.

### R5 — Empty ledger when all skins forfeit

**Risk:** If all 18 holes are tied under `escalating: true` and hole 18 also ties under `split` with all players tied, the ledger is empty `{}`. `payoutMapFromLedger({}, game.playerIds)` must return all-zeros for all players; if it returns an empty object or omits some players, `computeAllPayouts` may crash or produce a wrong `PayoutMap`.

**Mitigation:** SK-2 AC includes an explicit test or manual assertion for the empty-ledger edge case. `payoutMapFromLedger` already initializes all `playerIds` to 0 in `shared.ts` — confirm this handles the empty-ledger case correctly.

### R6 — Scorecard rearchitecture regresses Stroke Play (new)

**Risk:** SK-1a touches `ScoreRow.tsx`, which is the central score-entry component for all live rounds. Any regressions in the gross score entry, stepper interaction, or hole navigation will affect Stroke Play immediately.

**Mitigation:** SK-1a AC explicitly requires `stroke-play-finish-flow.spec.ts` to pass as a regression gate. The engineer runs the existing Playwright spec before filing the SK-1a report. Any scorecard regression is a blocker for SK-1a, not just a note.

### R7 — Two-row layout on small viewport (new)

**Risk:** Mobile viewports may not have room for two rows per player plus the gross score stepper. The app is currently used on mobile (Cowork plays on phone).

**Mitigation:** SK-5 Cowork check includes a small-viewport observation. The engineer implementing SK-1a tests on mobile viewport in dev tools before filing the report. If layout breaks on mobile, it is a blocking finding for SK-1a.

---

## 8. Decisions Deferred

The following are explicitly out of scope until after SK-5 closes:

| Decision | Required before | Source |
|---|---|---|
| `tieRuleFinalHole` picker in wizard | Separate unpark dispatch | §2e above |
| `appliesHandicap` toggle | Separate unpark dispatch | §2e above |
| Match Play sequence position (Decision D) | Match Play bridge prompt | `STROKE_PLAY_PLAN.md §7` |
| Match Play format toggle (Decision E) | Match Play bridge prompt | `STROKE_PLAY_PLAN.md §7` |
| Nassau allPairs v1 scope | Nassau bridge prompt | `STROKE_PLAY_PLAN.md §7` |
| #11 full cutover gate method (Decision C from SP plan) | Third bet unparks | `STROKE_PLAY_PLAN.md §7` |
| Junk architecture (Alternative A vs B) | Before #7b Phase 3 | `STROKE_PLAY_PLAN.md §7` |
| Stroke Play scope beyond Option α Minimal (Decision F) | Separate operator decision | `STROKE_PLAY_PLAN.md §7` |
| ctpWinner data model (bridge lookup) | Before junk enters any bet bridge | `STROKE_PLAY_PLAN.md §7` |
| Results/bets page per-hole Skins detail | Post-Skins v1 | §7 R2 residual |
| Wolf, Nassau, Match Play unpark sequencing | After SK-5 closes | Separate operator decision |
