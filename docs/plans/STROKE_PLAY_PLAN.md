# Stroke-Play-Only Phase Plan

**Authored:** 2026-04-25  
**Status:** ACTIVE — single source of truth for AC during the Stroke-Play-only phase. SOD April 27 "structurally complete" characterization is superseded: open fence-violation items (SP-UI-1, SP-UI-2) and PF-2 correctness gates pending (see §3 PF-2, §3 SP-4 closure note, and Fence-Violation Items below).  
**Source proposals:** `docs/proposals/ui-first-reframe.md`, `docs/proposals/ui-first-reframe-sod.md`, `docs/proposals/pending-items-evaluation.md`, `docs/proposals/stroke-play-only-scoping.md`, `docs/proposals/junk-architecture-evaluation.md`

---

## Scope

The Stroke-Play-only phase begins at adoption of this plan and ends when **SP-4 closes**.

**"Live in production" definition (SP-4 closure trigger):**

All of the following must be true before SP-4 is declared closed:

1. `git grep -rn "computeStrokePlay" src/` returns zero matches.
2. SP-2 builder tests pass (`npm run test:run`).
3. SP-3 bridge integration tests pass (`npm run test:run`).
4. Manual playthrough: at least one full 18-hole Stroke Play round played end-to-end through the new engine path on the running dev server. Handicap applied (`appliesHandicap: true`). Final settlement displayed on the results page. Payouts computed correctly (winner collects from all others; zero-sum verified by inspection). The manual playthrough is **required for SP-4 closure**, not a separate validation step.
5. `tsc --noEmit --strict` passes.

Closing SP-4 does **not** automatically unpark any other bet. The next bet to unpark is a separate operator decision.

**Supersedes:**

- `REBUILD_PLAN.md` item **#11** (full multi-bet cutover) for the duration of this phase. SP-4 replaces #11 for Stroke Play only. The full #11 is deferred until all five bets are live; revisit when the third bet unparks.
- `REBUILD_PLAN.md` item **#12** (HoleData ↔ HoleState bridge, edge-case field threading) is split: SP-2 covers happy-path plumbing for Stroke Play; the original #12 edge-case scope (`withdrew`, `conceded`, `pickedUp`, Wolf `PlayerWithdrew` writer, Nassau `settleNassauWithdrawal` caller) is superseded for Stroke Play (those fields are stubbed) and deferred for parked bets until they unpark.

**Does not supersede:** `REBUILD_PLAN.md` items #3–#10. Items #3–#8 are done. Items #9 and #10 carry forward as independent backlog.

**Fence-Violation Items (in scope for current phase, dispatchable independently of PF-2):**

SP-UI-1 (`src/components/setup/GameInstanceCard.tsx` junk-block guard) and SP-UI-2 (`src/components/scorecard/ScoreRow.tsx` dot-button visibility) are fence-enforcement work — they fix junk UI surfaces visible in Stroke Play rounds in violation of §1e ("No junk side bets are wired, displayed, or settable on Stroke Play rounds"). SP-UI-3 (`src/app/page.tsx` playDate UTC display) fixes a date rendering defect. All three are dispatchable as separate engineer turns without waiting for PF-2 to begin or complete.

---

## 1. Park Definitions

All four primary bets are parked under **Option (c)** from `docs/proposals/stroke-play-only-scoping.md §1`: remove entries from `GAME_DEFS` in `src/types/index.ts` (marking them `disabled: true`) and update `GameList.tsx` to respect the flag. Engine files, test files, and rule docs remain on disk unchanged. This is the combined Option (c) + REBUILD_PLAN.md #9 approach; the `GameList.tsx` filter is implemented in SP-6.

### 1a. Skins

**Park option:** (c)  
**Code change implementing the park (SP-6):** `src/types/index.ts` GAME_DEFS entry for `'skins'` gains `disabled: true`.  
**What unparked looks like:** Remove or set `disabled: false` on the GAME_DEFS entry; remove the Skins entry from the GameList filter; file an engineer prompt for the Skins HoleState builder and bridge wiring.  
**Unpark trigger:** Separate operator decision after SP-4 closes. Unpark includes resolution of Decision A (Skins UI player-count enforcement 3-only vs 3–5) and Decision B (rule-doc-only vs combined for the §2 minimum correction in `game_skins.md`). See §7 (Decisions Deferred).

### 1b. Match Play

**Park option:** (c)  
**Code change implementing the park (SP-6):** `src/types/index.ts` GAME_DEFS entry for `'matchPlay'` gains `disabled: true`.  
**What unparked looks like:** Remove or set `disabled: false`; remove from GameList filter; file an engineer prompt for the Match Play bridge including concession recording UI. The format toggle in `GameInstanceCard.tsx` (singles vs best-ball) must be resolved per Decision E before the Match Play bridge prompt is written.  
**Unpark trigger:** Separate operator decision. Resolution of Decisions D (sequence position relative to Skins) and E (format toggle hide/disable/remove) required before the bridge prompt.

### 1c. Wolf

**Park option:** (c)  
**Code change implementing the park (SP-6):** `src/types/index.ts` GAME_DEFS entry for `'wolf'` gains `disabled: true`. The `default:` fallthrough in `computeGamePayouts` (`src/lib/payouts.ts:165`) currently routes Wolf silently through `computeStrokePlay`. SP-4 replaces this with `return emptyPayouts(game.playerIds)` — Wolf will show $0 while parked rather than wrong Stroke Play numbers. This is a deliberate behavior improvement bundled into SP-4.  
**What unparked looks like:** Remove or set `disabled: false`; remove from GameList filter; file an engineer prompt for the Wolf bridge including per-hole captain decision UI. Wolf is structurally the most complex bridge (WolfDecision required per hole; 4-or-5-player only per rule doc).  
**Unpark trigger:** Separate operator decision. Wolf has no pending decision conflicts from prior reports.

### 1d. Nassau

**Park option:** (c)  
**Code change implementing the park (SP-6):** `src/types/index.ts` GAME_DEFS entry for `'nassau'` gains `disabled: true`.  
**What unparked looks like:** Remove or set `disabled: false`; remove from GameList filter; file an engineer prompt for the Nassau bridge including press confirmation UI. The D1 sub-task B questions (tied-withdrawal behavior per I3 decision, IMPL checklist line 100) should be resolved before the Nassau bridge prompt is written, but do not block SP-6.  
**Unpark trigger:** Separate operator decision.

### 1e. Junk (side-bet engine, separate treatment)

Junk is not a primary bet and does not appear in `GAME_DEFS`. Its park is structural, not a GAME_DEFS change.

**Park state:** Junk remains at its current Phase 1–2 landed state (`src/games/junk.ts`, 29 tests passing). The `docs/games/game_junk.md §5` multi-winner doc fix (2026-04-25) is the only doc change to Junk during this phase.

**During this phase:** Junk does **not** enter Stroke Play's bridge or settlement under any circumstances. The Stroke Play bridge (SP-2, SP-3) uses `junkItems: []` (empty) in every Stroke Play `BetSelection`. No junk side bets are wired, displayed, or settable on Stroke Play rounds.

**Phase 3 engineering (#7b — Sandy, Barkie, Polie, Arnie)** is explicitly deferred until at least one bet that uses Junk is unparked. The junk §5 doc now correctly specifies `PlayerId[] | null` return types for Phase 3 items; the engine stubs remain `return null` and that mismatch is acceptable while Phase 3 is parked.

**Unpark trigger:** Separate operator decision when a primary bet that includes junk (Skins, Wolf, Nassau, Match Play all support `junkItems`) re-enters scope. At that point the junk architecture choice (Alternative A vs B from `docs/proposals/junk-architecture-evaluation.md §4`) and the Phase 3 rules pass must precede #7b engineering.

---

## 2. Fully Functional: Option α Minimal

Decision locked per `docs/proposals/stroke-play-only-scoping.md §2` (Minimal level). No re-litigation.

### Engine surface exercised

- `settleStrokePlayHole(hole, config, roundCfg)` with `settlementMode: 'winner-takes-pot'`
- `finalizeStrokePlayRound(events, config)` winner-takes-pot path
- `tieRule: 'split'` (default; no card-back, no scorecard-playoff)
- `appliesHandicap: true` and `appliesHandicap: false` (both supported)
- 2–5 players
- `junkItems: []` (empty — no junk in v1 Stroke Play)

### UI components required (existing — no new components for v1)

| Component | File | Role |
|---|---|---|
| Score entry | `src/components/scorecard/ScoreRow.tsx` | Per-player score per hole |
| Hole navigation | `src/components/scorecard/HoleHeader.tsx` | Prev/next, hole number, par |
| Game setup | `src/components/setup/GameInstanceCard.tsx` | Stake input (existing) |
| Settlement display | `src/app/results/[roundId]/page.tsx` | Winner, money summary |
| Bets history display | `src/app/bets/[roundId]/page.tsx` | Per-hole score/payout history |

### UI components NOT required for v1 (deferred)

- Settlement mode picker (per-stroke, places) — deferred to Mid level
- Holeset picker (Front 9 / Back 9 / Total 18) — deferred to Full level and pending IMPL checklist line 61 investigation
- Places payout configuration UI — deferred
- Per-stroke pairwise differential display — deferred
- Scorecard-playoff conduct UI — deferred

### Edge cases in scope

- Missing gross score: `IncompleteCard` event emitted; that player excluded from settlement; remaining players settle among themselves. Zero-sum holds on settled players.
- All-tied round: zero delta under `tieRule: 'split'` (every player gets back their own stake).

### Edge cases out of scope for v1

- `per-stroke` and `places` settlement modes
- Card-back tie resolution (`tieRule: 'card-back'`)
- Front-9 / back-9 holeset scoping
- Player withdrawal mid-round (settled via IncompleteCard exclusion in practice; `withdrew: PlayerId[]` is stubbed empty in the bridge)

### HoleData → HoleState bridge fields (SP-2)

**Fields populated (5 live):**

| HoleState field | Source in HoleData | Notes |
|---|---|---|
| `hole` | `HoleData.number` | Direct |
| `holeIndex` | `HoleData.index` | Direct |
| `par` | `HoleData.par` | Not read by stroke_play.ts engine; populated for completeness |
| `gross[pid]` | `HoleData.scores[pid]` | Direct |
| `strokes[pid]` | `PlayerSetup.courseHcp` + `roundHandicap` via `effectiveCourseHcp` | Computed; not stored in HoleData |
| `timestamp` | Generated at build time (e.g. `new Date().toISOString()`) | Not in HoleData |

**Fields stubbed (remaining 14+ fields):**

```ts
status: 'Confirmed',
ctpWinner: null,
longestDriveWinners: [],
bunkerVisited: {},    // Record<PlayerId, boolean> — empty object
treeSolidHit: {},
treeAnyHit: {},
longPutt: {},
polieInvoked: {},
fairwayHit: {},
gir: {},
pickedUp: [],
conceded: [],
withdrew: [],
```

Stub values are empty/null/default. `stroke_play.ts` does not read any of these fields; stubs produce correct results for all in-scope Stroke Play scenarios.

---

## 3. Phases

### SP-1 — Stroke Play Rule Doc Check

**Type:** Documenter  
**Sizing:** XS  
**Dependencies:** None — can run before any other phase.

**Purpose:** Verify `docs/games/game_stroke_play.md` is consistent with Option α Minimal scope and contains no outstanding inconsistencies that would block SP-2 or SP-3. No changes expected; this phase exists to confirm the rule doc is a reliable AC anchor before engineering begins.

**Acceptance criteria:**
- Rule doc reviewed against: 2–5 players, `winner-takes-pot` only, `tieRule: 'split'` as primary, `appliesHandicap` supported, `junkItems: []` for v1.
- Any flagged inconsistencies noted in the SP-1 session log. If any change is needed, it lands in this phase before SP-2 starts.
- No rule changes proposed — doc review only.

**Fence:** No engine changes, no plan edits, no other doc changes. If an inconsistency is found that requires a doc rule change (not just a clarification), halt and report before proceeding.

**Files in scope:** `docs/games/game_stroke_play.md` (read; edit only if inconsistency found).

**Risk flags:** None expected. The rule doc was not identified as a problem in prior investigation.

---

### SP-2 — Stroke Play HoleState Builder

**Type:** Engineer  
**Sizing:** S  
**Dependencies:** SP-1 complete (rule doc confirmed clean).

**Purpose:** Implement the `HoleData → HoleState` builder for Stroke Play's 5-field surface (§2 above). This is the shared building block for SP-3 wiring. Stub all non-Stroke-Play HoleState fields.

**Acceptance criteria:**
- New builder function (e.g. `buildStrokePlayHoleState`) implemented. **Engineer chooses the file location** (candidate: `src/bridge/stroke_play_bridge.ts` or `src/lib/stroke_play_bridge.ts`); the chosen path is recorded in the SP-2 session log and referenced in SP-3.
- Builder accepts `HoleData` and `PlayerSetup[]` as inputs. Returns `HoleState`.
- Builder correctly populates: `hole`, `holeIndex`, `par`, `gross[pid]` (from `HoleData.scores`), `strokes[pid]` (computed from `PlayerSetup.courseHcp` and `roundHandicap` via `effectiveCourseHcp`), and `timestamp`.
- Builder stubs all other HoleState fields as specified in §2 (empty arrays, null, empty records, `'Confirmed'` status).
- New test file covers: fixture HoleData → correct `gross` mapping; `strokes` computed from handicap (one test with `appliesHandicap: true`, one with `false` / zero strokes); stubbed fields are correctly empty.
- `npm run test:run` passes. `tsc --noEmit --strict` passes.
- **Fence:** No engine changes. No UI changes. No `payouts.ts` changes. No other bet bridges. Builder file lives outside `src/games/` — portability invariant of `src/games/` (no DOM/store imports) does NOT apply to the builder.

**Files in scope:** One new builder file (path chosen by engineer), one new test file.

**Risk flags:**
- `effectiveCourseHcp` import: the builder needs handicap computation from `PlayerSetup`. Confirm the import path during SP-2 (likely `src/games/handicap.ts` — verify with a grep before writing).
- `timestamp` field: Stroke Play engine requires a non-empty string. Use `new Date().toISOString()` or a similar deterministic approach; document the choice in the SP-2 session log.

---

### SP-3 — Stroke Play Bridge Wiring

**Type:** Engineer  
**Sizing:** M  
**Dependencies:** SP-2 complete (builder file exists and is tested); SP-6 recommended before SP-3 (parked bets hidden so the test environment is clean).

**Purpose:** Wire `settleStrokePlayHole` and `finalizeStrokePlayRound` into the per-hole and round-end resolution flows. After SP-3, the new Stroke Play engine path produces correct settlements end-to-end — but the bets/results pages still call `computeAllPayouts` (the legacy path remains live until SP-4).

**Acceptance criteria:**
- `settleStrokePlayHole` is called once per hole for each Stroke Play bet in the round, using the builder from SP-2 to produce `HoleState` inputs.
- `aggregateRound` (from `src/games/aggregate.ts`) is called at round end and produces a `RunningLedger` with correct `netByPlayer` and `byBet` values for the Stroke Play bet.
- A `payoutMapFromLedger(ledger: RunningLedger): PayoutMap` adapter converts `aggregateRound` output to the `PayoutMap` format consumed by the bets/results pages. **This adapter does not exist yet and must be created in SP-3.** Location: same bridge file as SP-2 or a sibling file (engineer chooses; document in session log).
- New integration test: a fixture round (3 players, 2 holes, known gross scores, `appliesHandicap: true`) run through the builder → `settleStrokePlayHole` → `aggregateRound` → adapter produces correct `PayoutMap`. Assert zero-sum and correct winner delta.
- `npm run test:run` passes. `tsc --noEmit --strict` passes.
- **Fence:** No `payouts.ts` changes. No changes to `src/lib/*` (cutover is SP-4). No changes to the bets/results page components. No other bet engines touched. The legacy `computeAllPayouts` path remains active after SP-3.

**Files in scope:** Bridge file from SP-2 (extend), adapter function (new or in bridge file), new integration test file. Engineer identifies the per-hole resolution call site in the existing round flow (scorecard store action or equivalent) and documents it in the session log — but does NOT change that call site in SP-3. SP-3 validates the engine path in isolation; SP-4 connects it to the live UI.

**Risk flags:**
- `aggregateRound` threading: `aggregateRound` expects a `RoundConfig` and `ScoringEventLog`. The bridge must construct a `RoundConfig` from the Zustand store's round data. Verify the field mapping during SP-3 (it may require `RoundConfigLocked` semantics).
- `payoutMapFromLedger` adapter: confirm the adapter is a thin projection of `ledger.netByPlayer` and does not re-implement settlement logic. It should be ~5 lines.

---

### SP-4 — Stroke Play Cutover

**Type:** Engineer  
**Sizing:** S–M  
**Dependencies:** SP-3 complete and validated; SP-2 builder tests and SP-3 integration tests both green.

**Purpose:** Surgical replacement of the `strokePlay` case in `computeGamePayouts` (`src/lib/payouts.ts`). After SP-4, the bets/results pages route Stroke Play settlement through the new engine path in production. Other four legacy compute functions stay live.

**Acceptance criteria:**
- `computeStrokePlay` function body deleted from `src/lib/payouts.ts`.
- `case 'strokePlay':` in `computeGamePayouts` (`payouts.ts:160`) replaced with a call to the adapter from SP-3.
- `default:` fallthrough (`payouts.ts:165`) updated to `return emptyPayouts(game.playerIds)` (or an explicit `case 'wolf':` equivalent). This eliminates the existing silent wrong-computation for Wolf while it is parked.
- Grep gate: `git grep -rn "computeStrokePlay" src/` → **zero matches**. This gate must pass before SP-4 is declared done.
- Manual playthrough (see §4 below) confirms correct end-to-end settlement on the dev server.
- `npm run test:run` passes. `tsc --noEmit --strict` passes.
- **Fence:** `src/lib/payouts.ts` is the only changed file. No changes to `src/lib/junk.ts`, `src/lib/handicap.ts`, or `src/lib/scoring.ts`. No engine changes. No UI component changes. The remaining four legacy compute functions (`computeMatchPlay`, `computeSkins`, `computeNassau`, `computeStableford`) remain in `payouts.ts` untouched.

**Files in scope:** `src/lib/payouts.ts` only.

**Risk flags:**
- The `payoutMapFromLedger` adapter (from SP-3) must produce output whose shape is compatible with how `computeAllPayouts` aggregates results (summing `PayoutMap` values across games). Confirm during SP-4 that the adapter's output accumulates correctly in `computeAllPayouts`'s inner loop.
- **Wolf silent-wrong behavior fix:** The `default:` case change to `emptyPayouts` means Wolf bets now display $0 while parked rather than (incorrect) Stroke Play numbers. This is the intended behavior; no regression.

**Closure note (2026-04-27):** SP-4 was closed 2026-04-25 with all code gates passing and browser verification explicitly deferred (`2026-04-25/SP3_SP4_BRIDGE_CUTOVER_25-April-2026.md:123–125`). The §4 manual-playthrough closure condition is explicitly unmet: no 18-hole browser playthrough with correct settlement on the results page has been performed. SP-4 is **not reopened**; the manual playthrough is carried as a PF-2 gate. See §3 PF-2 below.

---

### SP-5 — Verifier (Deferred)

**Type:** Engineer (researcher pass first)  
**Sizing:** M  
**Dependencies:** SP-4 complete.  
**Status:** Deferred to post-SP-4. Not active during the Stroke-Play-only phase.

Disposition locked per `docs/proposals/stroke-play-only-scoping.md §3` Option 4 (Stroke-Play-scoped invariants only). When SP-5 activates:

- Invariants 1, 2, 4, 5, 6, 7, 8, 9 are in scope for Stroke Play.
- Invariant 3 (MatchState consistency) — deferred; not applicable to Stroke Play.
- Invariant 10 (supersession consistency) — deferred; no supersession writers exist.
- Invariant 11 (event payload consistency, IMPL checklist line 97) — partial scope; SP events (`StrokePlayHoleRecorded`, `StrokePlaySettled`) are in scope; match-specific events deferred.
- Invariant 4 (early-closeout hole coverage, IMPL checklist line 98) — early-closeout is not applicable to Stroke Play (no `MatchClosedOut` event); simplest definition applies (coverage for all 18 holes).

SP-5 requires a researcher pass to write the full AC before engineering begins. The researcher pass is the first action of SP-5, not a prerequisite checked in this plan.

---

### SP-6 — GAME_DEFS Cleanup (Independent)

**Type:** Engineer  
**Sizing:** XS  
**Dependencies:** None — can run before SP-2 or in parallel. Recommended before SP-2 to make the parked state visible.  
**Source:** REBUILD_PLAN.md item #9 (carried forward and extended with GameList filter).

**Acceptance criteria:**
- `src/types/index.ts` GAME_DEFS entries for `'skins'`, `'matchPlay'`, `'wolf'`, `'nassau'` gain `disabled: true`. The GAME_DEFS type literal is widened to include `disabled?: boolean`.
- In-scope game (`'strokePlay'`) keeps `disabled` unset.
- `stableford`, `bestBall`, `bingoBangoBongo`, `vegas` — mark `disabled: true` (per original #9 AC; these were already out of scope before the reframe).
- `src/components/setup/GameList.tsx` updated to filter out entries where `def.disabled === true` (one conditional in the existing `GAME_DEFS.map()` loop). After SP-6, disabled games do not appear in the "Add a game" picker.
- `npm run test:run` passes. `tsc --noEmit --strict` passes.
- **Fence:** Only `src/types/index.ts` and `src/components/setup/GameList.tsx` changed. No engine changes. No other UI changes. No test additions (no tests cover GAME_DEFS today per original #9 AC).

**Files in scope:** `src/types/index.ts`, `src/components/setup/GameList.tsx`.

**Risk flags:** None. Type-level + single conditional change.

---

### #10 — Prisma Float→Int Migration (Deferred, Independent)

Carried forward from REBUILD_PLAN.md item #10 as independent backlog. Not part of the SP-1 through SP-6 sequence. Can run any time before or after the Stroke-Play-only phase ends. Consult REBUILD_PLAN.md #10 for full AC.

---

### PF-2 — Persistence Floor v2 (Correctness Gates)

**Type:** Mixed (PF-1-F4 phase (a) is a researcher/reviewer pass; subsequent items are engineer turns)  
**Sizing:** M  
**Dependencies:** SP-3 + SP-4 code landed (both closed 2026-04-25); PF-1 mechanism closed (2026-04-26).  
**Status:** Active.

**Scope:** End-to-end correctness gates that PF-1's mechanism-only AC did not cover. PF-1 verified the persistence mechanism (PUT 204, PATCH 204, scorecard hydration on mount, correct smoke-check substeps). PF-2 adds: non-empty `game.playerIds` at round creation, bets and results page hydration, server DB diagnosis, and the SP-4 §4 manual browser playthrough.

**Items:**

- **PF-1-F3** — Diagnose PUT 503s seen in the Cowork session on the Cowork host. No code change until root cause confirmed (migration status check first). Independent of F4; can run in parallel.
- **PF-1-F4 (a)** — Type-contract verification pass (researcher or reviewer; not an engineer turn): verify full int-array round-trip chain from DB `Game.playerIds Int[]` through `hydrateRound` to `assertValidStrokePlayCfg`. Prerequisite for phase (b).
- **PF-1-F4 (b)** — Edit `src/app/api/rounds/route.ts:66`: replace `playerIds: []` with integer IDs of betting players from `playerRecords`. Blocked on phase (a) confirming the chain is consistent. No other files changed.
- **PF-1-F5A** — Fix null backHref in bets page: read `roundId` from `useParams().roundId`. Independent of F4; dispatchable any time.
- **PF-1-F6** — Add server-authoritative `useEffect` hydration to results page, same pattern as scorecard page. Blocked on PF-1-F4 phase (b) landing first.
- **SP-4 §4 manual playthrough** — SP-4 closed 2026-04-25 with browser verification deferred. The §4 closure condition is explicitly unmet (see SP-4 closure note above). SP-4 is not reopened; the playthrough is a PF-2 gate.

**Acceptance criteria:**
- Bets and results pages render correctly for a completed Stroke Play round in the browser (correct winner, monetary amounts, zero-sum verified by inspection).
- SP-4 §4 manual-playthrough condition is met: at least one full 18-hole Stroke Play round played end-to-end through the new engine path on the running dev server, handicap applied (`appliesHandicap: true`), final settlement displayed on the results page, payouts correct.

**Fence:** `src/app/api/rounds/route.ts` (F4b), `src/app/bets/[roundId]/page.tsx` (F5A), `src/app/results/[roundId]/page.tsx` (F6). No engine changes. No `src/games/` changes.

---

## 4. Phase-End Trigger Criteria

SP-4 is the terminal phase of the Stroke-Play-only phase. Closure requires all five conditions listed in the Scope section above:

1. Grep gate zero on `computeStrokePlay`.
2. SP-2 builder tests pass.
3. SP-3 integration tests pass.
4. **Manual playthrough** (required, not optional): one full 18-hole Stroke Play round on the dev server. The round must use handicap (`appliesHandicap: true`). Payouts must be correct (winner collects from all others). Results page must display the winner and correct monetary amounts. The engineer running SP-4 performs the playthrough and records it in the SP-4 session log (number of players, handicaps used, known gross scores for verification on at least the winning hole).
5. `tsc --noEmit --strict` passes.

**After SP-4 closes, no bet unparks automatically.** The Stroke-Play-only phase is complete. The next bet to unpark is a separate operator decision that will result in a new plan entry (or a new plan document for that bet's phase).

---

## 5. Parking-Lot Policy

Items from `IMPLEMENTATION_CHECKLIST.md` categorized by relevance to the Stroke-Play-only phase. Line numbers reference the checklist.

### Active during this phase

These items affect Stroke Play resolution, settlement, or display and may surface during SP-2 through SP-4:

| Checklist line | Item | Notes |
|---|---|---|
| Line 74 | Hole score entry: default each player's score to par | Affects SP score entry UX; may surface during manual playthrough |
| Line 78 | Results screen informationally thin | Affects SP settlement display; acceptable for v1 but noted |

### Active but out of scope for Option α Minimal (deferred to Mid/Full)

| Checklist line | Item | Why deferred |
|---|---|---|
| Line 61 | Stroke Play Front 9 / Back 9 / Total 18 format investigation | Option α Minimal locks to total-18; holeset investigation deferred |

### Deferred until bet unparks

These items gate on parked bets or junk Phase 3 and do not affect the Stroke-Play-only phase:

| Checklist line | Item | Unblock trigger |
|---|---|---|
| Line 62 | CTP screen shows all players for Bingo Bango Bongo | Junk Phase 3 + relevant bet unparks |
| Line 75 | Greenie pop-up eligibility hard-restriction (engine + UI) | Junk unparks |
| Line 76 | Greenie bet-scope filtering bug [BRIDGE-#12] | Junk + bridge unparks |
| Line 77 | Greenie pop-up: no back-navigation | Junk unparks |
| Line 82 | Singles withdrew exclusion in bestNet | Match Play unparks |
| Line 79 | Mutual forfeit rule decision (Match Play doc §5/§9) | Match Play unparks |
| Line 87 | Polie three-putt doubled-loss schema | Junk Phase 3 unparks |
| Line 90 | Supersession schema design | Pre-verifier Phase 2 (general) |
| Line 92 | Junk CTPCarried stub coverage gap | Junk Phase 3 unparks |
| Line 95 | Round-state verification agent (verifier) | SP-5 (deferred post-SP-4) |
| Line 97 | Verifier Invariant 11 — event payload consistency | SP-5 Phase 3 |
| Line 98 | Verifier Invariant 4 — early-closeout hole coverage | SP-5 Phase 2 |
| Line 99 | CTP carry back-propagation to game_junk.md §6 | CTP carry implementation |
| Line 100 | D1 sub-task B — Nassau §9 N35 tied-withdrawal | Nassau unparks |

### Future-bucket (independent of any bet)

| Checklist line | Item |
|---|---|
| Line 66 | Session-logging skill: long-session exception clause |
| Line 67 | Session-logging skill: EOD-FINAL routine for absent log days |
| Line 71 | Main screen: clicking recent round (requires auth) |
| Line 72 | User authentication system |
| Line 73 | Friends list and auto-add |
| Line 101 | Stale rebuild-context status (trigger: #10 + #11 close) |
| Line 102 | Late-arrival / early-departure player handling |

---

## 6. Relationship to REBUILD_PLAN.md

| REBUILD_PLAN.md item | Status | Notes |
|---|---|---|
| #3 Wolf follow-ups | Done 2026-04-20 | Retained as history; no action |
| #4 Bet-id string-lookup refactor | Done 2026-04-20 | Retained as history; no action |
| #5 Nassau engine | Done 2026-04-22 | Retained as history; no action |
| #6 Match Play engine | Done 2026-04-24 | Retained as history; no action |
| #7 Junk engine (Phases 1–2) | Done 2026-04-24 | Retained as history; no action. Phase 3 (#7b) deferred per §1e. |
| #8 aggregate.ts | Done 2026-04-24 | Retained as history; no action |
| #9 GAME_DEFS cleanup | **SP-6 in this plan** | Carried forward and extended with GameList.tsx filter |
| #10 Prisma Float→Int | Backlog (independent) | Not part of the SP phase sequence; see §3 |
| #11 Full cutover | **Superseded for this phase** | SP-4 covers Stroke Play only. Full #11 deferred; revisit when third bet unparks. |
| #12 HoleData ↔ HoleState bridge | **Split** | Happy-path plumbing → SP-2 + SP-3. Edge-case field threading (`withdrew`, `conceded`, `pickedUp`, Wolf PlayerWithdrew writer, Nassau settleNassauWithdrawal caller) superseded for Stroke Play (those fields are stubbed) and deferred for parked bets. |

---

## 7. Decisions Deferred

The following decisions from prior reports are **not resolved by this plan** and are explicitly out of scope until after SP-4 closes. They must be resolved before the indicated downstream work can begin.

| Decision | Required before | Source |
|---|---|---|
| **A** — Skins v1 UI: engine 3–5 with no UI restriction (Option B) vs UI enforces minimum 3 (Option B′) | Skins bridge prompt | `pending-items-evaluation.md §2` |
| **B** — Skins rule-doc scope: rule-doc-only for §2 minimum correction vs combined (rule-doc + engine guard + test rewrites) | Skins bridge prompt | `pending-items-evaluation.md §2` |
| **C** — #11 full cutover gate validation method: manual playthrough, bridge unit tests, integration tests, or combination | When third bet unparks and full #11 resumes | `pending-items-evaluation.md §2` |
| **D** — Match Play sequence position: stays at position 2 (original reframe) or moves behind Skins (SOD report implied) | Match Play bridge prompt | `pending-items-evaluation.md §3` |
| **E** — Match Play format toggle treatment: hide vs disable vs remove `'best-ball'` from the type | Match Play bridge prompt | `pending-items-evaluation.md §3` |
| **F** — Stroke Play scope beyond Option α Minimal: when (and whether) Mid or Full level is chosen for Stroke Play | Separate operator decision post-SP-4 | `stroke-play-only-scoping.md §2` |
| **Junk architecture** — Alternative A (status quo + LD-bypass pattern for Phase 3) vs Alternative B (unified multi-winner dispatch) | Before #7b Phase 3 engineering | `junk-architecture-evaluation.md §4` |
| **Junk §11 event schema** — `JunkAwarded` field name still shows `winner` (singular) in §11 shape comment; actual implementation uses `winners: PlayerId[]`. Rule doc §11 back-propagation needed. | Before junk §11 review | `JUNK_S5_MULTIWINNER_DOC_FIX_25-April-2026.md noticed-but-out-of-scope #1` |
| **Junk §4 formula** — §4 points formula states `N − 1` for single winner but does not cover multi-winner `N − w` formula. §4 and §6 are inconsistent. | Before junk §4 review | `JUNK_S5_MULTIWINNER_DOC_FIX_25-April-2026.md noticed-but-out-of-scope #2` |
| **ctpWinner data model** — `HoleData.greenieWinners` is keyed by GameInstance.id (legacy); `HoleState.ctpWinner` is a round-level PlayerId. Bridge must resolve the lookup before junk can be wired. | Before junk enters any bet bridge | `junk-architecture-evaluation.md §6` |
| **Nassau allPairs v1 scope** — Nassau rule doc supports `pairingMode: 'singles'` (2 players) and `pairingMode: 'allPairs'` (3–5). Which modes are in scope for the Nassau UI phase? | Nassau bridge prompt | `pending-items-evaluation.md §1` |

---

## 8. Out-of-Scope Drift

Items observed during authoring that are outside this plan's scope. Parked here for future triage.

1. **`computeMatchPlay` in `payouts.ts` is not equivalent to the new engine.** The legacy function implements all-pairs match play (every player vs every other); the new `settleMatchPlayHole` engine implements singles (2 players) or best-ball (4 players). When Match Play unparks, the cutover is not a drop-in replacement — the Match Play bridge prompt must handle the algorithm difference explicitly. Noted for the Match Play bridge author.

2. **`computeNassau` in `payouts.ts` assumes exactly 2 players** (`if (inGame.length !== 2) return payouts`). The new Nassau engine supports allPairs (3–5 players). Same caveat as Match Play: cutover is not a drop-in replacement.

3. **`src/lib/handicap.ts` has one active non-deprecated caller** (`src/store/roundStore.ts` — `calcCourseHcp`, `calcStrokes`). The SP-2 builder needs handicap computation; it should import from `src/games/handicap.ts` (not the deprecated shim). The store migration away from `src/lib/handicap.ts` is a REBUILD_PLAN.md #11 commit-2 item and is not in scope here, but the SP-2 author must confirm the import path.

4. **`scorecard-playoff` tie rule** — `assertValidStrokePlayCfg` accepts the `'scorecard-playoff'` value but `finalizeStrokePlayRound` has no `case 'scorecard-playoff'` branch. If this value ever appears in a config, the finalizer silently falls through. Option α Minimal uses `'split'` only, so this gap is not exercised. Deferred; noted for a future Stroke Play rules pass if Mid/Full level is chosen.

5. **HoleData has no `longestDriveWinners` field.** The SP-2 builder stubs `longestDriveWinners: []`. When junk (specifically Longest Drive) eventually re-enters scope, HoleData will need a new field and a new score-entry interaction. This was identified in `junk-architecture-evaluation.md §6` and `stroke-play-only-scoping.md §4`; recorded here as a reminder for the junk bridge author.
