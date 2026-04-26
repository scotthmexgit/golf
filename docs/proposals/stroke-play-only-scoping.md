# Stroke-Play-Only Scoping Report

**Date:** 2026-04-25  
**Status:** Investigation only. No code, no rule-doc, no plan edits.  
**Context:** Scoping the cost and shape of a development model where Stroke Play is built to fully functional before any other bet enters active scope. Builds on `pending-items-evaluation.md`; does not duplicate its content.

---

## 1. Defining "Park"

### Option (a) — Hide from UI; engine code and tests unchanged

**What changes:**
- `src/components/setup/GameList.tsx:33` — `GAME_DEFS.map(def => ...)` currently renders a pill for every entry. Add a filter: skip entries whose `key` is not `'strokePlay'`. One conditional in the map loop. `GAME_DEFS` itself is untouched; the GameType union is untouched; engine files are untouched.
- No changes to `src/types/index.ts`, `src/games/`, or any test file.

**Test impact:** None. All 307 tests continue to run and pass.

**Reversal:** Remove the filter from `GameList.tsx`. One-line change. The engine, types, and tests are exactly as today.

**Constraint:** Users who have an existing saved round containing a Skins/Wolf/Nassau/Match Play game will still see those games' data processed by `computeAllPayouts`. The legacy compute path remains active for any games in the store.

---

### Option (b) — Hide from UI; freeze engine code (no maintenance, no doc updates, tests still run in CI)

**What changes:**
- Same UI change as Option (a).
- Additionally: a team-wide policy that no engineer prompts touch `skins.ts`, `wolf.ts`, `nassau.ts`, `match_play.ts`, their test files, or their rule docs during the Stroke Play phase. This is a workflow constraint, not a code change.

**Test impact:** Tests run in CI. No changes to pass/fail today. Risk: if `types.ts` or `events.ts` changes during the Stroke Play phase (possible — the bridge adds a builder that reads these types), the frozen engines' tests might break. A broken frozen-engine test must be parked rather than fixed under the freeze policy, which creates a CI red state or requires a policy exception.

**Reversal:** Lift the freeze policy. If any type changes occurred during the freeze that broke frozen-engine tests, those tests need catch-up fixes. Reversal cost scales with how many cross-cutting type changes landed while frozen.

**Constraint:** The freeze policy needs to be explicitly stated somewhere (CLAUDE.md, the plan document, or both). Implicit freezes fail silently when someone fixes a "trivial" compilation error in a frozen file.

---

### Option (c) — Remove from GAME_DEFS; engine files and tests remain on disk

**What changes:**
- `src/types/index.ts:146` — remove or mark-disabled the four entries for `'skins'`, `'wolf'`, `'nassau'`, `'matchPlay'` from the `GAME_DEFS` array. This is exactly what REBUILD_PLAN.md #9 describes (`disabled: true` on non-scope games), though #9 covers only four of the nine entries and the AC says "does NOT change any UI rendering behavior." A park-via-#9 only hides bets if `GameList.tsx` is also updated to filter `disabled` entries — so this option is Option (a) plus #9 together.
- The `GameType` union in `src/types/index.ts:38` is NOT changed. Game instances typed `'skins'` etc. still compile; `computeAllPayouts` still routes them through legacy functions. Removing from `GAME_DEFS` only removes them from the game-setup picker.

**Test impact:** None to engine tests. The `GameType` union is unchanged. The only tests that would break are if any test directly constructs a `GAME_DEFS` lookup — a grep shows `GameList.tsx` is the only consumer, and it's a UI component not tested.

**Reversal:** Add entries back to the `GAME_DEFS` array. One entry per bet. The `GameList.tsx` filter from Option (a) would also be removed if combined.

**Key distinction from Option (a):** Option (c) changes a data file (`src/types/index.ts`); Option (a) changes a render component (`GameList.tsx`). Option (c) + #9 completion is a prerequisite for any future `GameList.tsx` that auto-respects `disabled: true` without manual filter logic.

---

## 2. Defining "Fully Functional" for Stroke Play

### Minimal — one settlement mode, total 18, basic UI

**Engine surface exercised:**
- `settleStrokePlayHole` with `settlementMode: 'winner-takes-pot'`
- `finalizeStrokePlayRound` winner-takes-pot path
- `tieRule: 'split'` only (no card-back, no scorecard-playoff)
- 2–5 players, `appliesHandicap: true/false`
- Edge cases already handled: missing gross score (`IncompleteCard`), all-tied round (zero delta under `split`)

**UI components required:**
- Score entry per hole (exists: `ScoreRow.tsx`)
- Hole navigation (exists: `HoleHeader.tsx`)
- Settlement display: winner, money summary (exists: `results/[roundId]/page.tsx`, informationally thin)
- Game setup: stake input only (exists: `GameInstanceCard.tsx`)
- Nothing new in `GameInstanceCard.tsx` — `winner-takes-pot` with a single stake field is the current default

**Parking-lot items resolved:** None. `IMPL:60` (Front 9 / Back 9 / Total 18 investigation) remains open.

**Parking-lot items unblocked but not resolved:** None.

**What is NOT covered:** `per-stroke` mode, `places` mode, card-back tie resolution, front-9/back-9 holesets, withdrawal edge case.

---

### Mid — all three settlement modes, total 18 only

**Engine surface exercised:** Everything in Minimal, plus:
- `per-stroke` pairwise delta computation across all player pairs
- `places` payout schedule: `placesPayout[]` config, rank ordering, tie fallthrough under card-back, `TieFallthrough` event
- `tieRule: 'card-back'` — requires `cardBackOrder` segments in config; finalizer reads per-hole `StrokePlayHoleRecorded` events (not HoleState directly) to compute segment nets
- `RoundingAdjustment` in `places` mode when `placesPayout` contains a remainder after integer split

**UI components required:** Everything in Minimal, plus:
- Settlement mode picker in game setup (`GameInstanceCard.tsx` addition — new radio or dropdown: Winner Takes Pot / Per Stroke / Places)
- Stake-per-stroke field (visible only when `per-stroke` selected)
- Places payout configuration (visible only when `places` selected — currently no UI for this)
- Results display: shows per-rank result under `places` mode, per-pair differences under `per-stroke` mode (currently results page shows a single winner; needs adaptation)

**Parking-lot items resolved:** Partial `IMPL:60` — total-18 for all three modes is covered; front-9/back-9 remains open.

**What is NOT covered:** Front-9/back-9 holesets, withdrawal edge case.

---

### Full — all three settlement modes, front-9/back-9/total-18 holesets, all edge cases including withdrew/pickedUp

**Engine surface exercised:** Everything in Mid, plus:
- Front-9 holeset: bridge passes only holes 1–9 events to `finalizeStrokePlayRound`; bridge scopes `settleStrokePlayHole` calls to holes 1–9 only
- Back-9 holeset: same pattern, holes 10–18
- The engine itself has no holeset field in `StrokePlayCfg` — holeset scoping is an orchestration concern in the bridge, not an engine change
- Withdrawal: `IncompleteCard` event path; engine excludes players with incomplete cards; remaining players settle among themselves; `places` ante redistribution
- `pickedUp` field: Stroke Play does NOT read `pickedUp` from `HoleState` — a player who picks up scores as an incomplete card (gross = 0 or missing). The engine already handles this via the `gross[pid] ?? 0` missing-score path.

**UI components required:** Everything in Mid, plus:
- Holeset picker in game setup: Front 9 / Back 9 / Total 18 (new field in `GameInstanceCard.tsx` for Stroke Play)
- The UI may support up to three simultaneous Stroke Play bets per round (one per holeset), or a single Stroke Play game with holeset selection — `IMPL:60` asks exactly this question

**Parking-lot items resolved:** `IMPL:60` resolved entirely — investigation of Front 9 / Back 9 / Total 18 UI representation is answered here.

**What is NOT covered:** `scorecard-playoff` tie rule (engine supports it, but the UI for conducting a playoff has no spec).

---

## 3. Verifier-vs-Bridge Conflict Cost

`IMPLEMENTATION_CHECKLIST.md:26` currently lists the verifier agent researcher pass as the active item. The reframe (and this model) promotes the bridge work to active. Three options for the verifier under Stroke-Play-only:

### Option 1 — Defer verifier entirely until after Stroke Play is live

The researcher pass does not run. `src/verify/verifyRound.ts` is not started.

**Cost to IMPL:94:** "Add Invariant 11 (event payload consistency) before Phase 3 engineer work begins." Phase 3 is Junk Phase 3 (Sandy/Barkie/Polie/Arnie), which is gated on rules pass and not near-term. Deferral does not breach this dependency.

**Cost to IMPL:96:** "Decision required before Verifier Phase 2 engineer starts." Verifier Phase 2 hasn't started; no breach.

**Cost to the verifier's stated value:** REBUILD_PLAN.md Post-#8 Tooling states: "catches bugs from today's class (`{}` payload `RoundingAdjustment`, dead `isLongestDrive`) via end-to-end synthetic-round tests." Under full deferral, these catches are only available via manual test or incident-driven debugging once the bridge is live.

---

### Option 2 — Defer verifier to post-Stroke-Play

Same as Option 1 in cost, different in intent: the researcher pass is explicitly scheduled to run after the Stroke Play bridge is validated, not after all five bets are live. The verifier then has a running Stroke Play bridge to test against — `aggregateRound` (which `verifyRound` depends on) is provably exercised by live code.

---

### Option 3 — Run verifier in parallel (different session)

The researcher pass is read-only scoping work. It does not conflict with bridge engineering work at the file level. These can run in parallel if the operator dispatches two sessions: one engineering the bridge, one scoping the verifier. No code conflict. Risk: if the verifier researcher pass produces AC that conflicts with bridge design choices already made, integration work is needed.

---

### Option 4 — Scope verifier for Stroke Play only; defer other engines' invariants

The verifier's 10 invariants (`REBUILD_PLAN.md:1379`) break down by applicability:

| Invariant | Applies to Stroke Play? | Notes |
|---|---|---|
| 1. Money zero-sum per bet | Yes | Directly testable after bridge lands |
| 2. Zero-sum across overlapping-participant bets | Yes (multi-bet rounds) | Testable |
| 3. MatchState consistency | No | Nassau/Match Play only |
| 4. Hole coverage | Partial | SP has no early closeout (`IMPL:96` early-closeout ambiguity is N/A to SP) |
| 5. Player validity | Yes | |
| 6. Bet validity | Yes | |
| 7. Integer invariants | Yes | |
| 8. Junk award validity | Partial | Only if junkItems non-empty |
| 9. State-transition consistency | Yes | SP events have defined payload shapes |
| 10. Supersession consistency | Deferred | No writer exists yet |
| 11. Event payload consistency (IMPL:94) | Partial | SP events: `StrokePlayHoleRecorded.nets`, `StrokePlaySettled` amounts testable |

A Stroke-Play-scoped verifier defers Invariants 3 and 10 entirely, narrows Invariant 4 to "coverage through all 18 holes (or scoped holeset)" without the early-closeout question (`IMPL:96` is irrelevant to SP), and defers the match-specific parts of Invariant 11 to when Nassau/Match Play unpark.

**What IMPL:94's "add before Phase 3 engineer work" dependency means here:** Invariant 11 for Junk Phase 3 is about Sandy/Barkie/Polie/Arnie payload correctness. This invariant can be added to the verifier when #7b Phase 3 enters scope — it is not blocking a Stroke-Play-only verifier researcher pass.

---

## 4. Bridge Work Under Stroke-Play-Only

### HoleState fields each engine actually reads (grepped)

| HoleState field | Stroke Play | Skins | Wolf | Nassau | Match Play | Junk |
|---|---|---|---|---|---|---|
| `hole` (number) | reads | reads | reads | reads | reads | reads |
| `par` | not read | not read | not read | not read | not read | reads (ctpWinner ≥ par check, longestDrive eligible) |
| `holeIndex` | reads | reads | reads | reads | reads | reads (longestDriveHoles check) |
| `timestamp` | reads | reads | reads | reads | reads | reads |
| `gross[pid]` | reads | reads | reads | reads | reads | reads |
| `strokes[pid]` | reads | reads | reads | reads | reads | not read (junk doesn't apply handicap) |
| `withdrew` | not read | not read | not read | not read | **reads** (best-ball TeamSizeReduced; Phase 4d) | not read |
| `conceded` | not read | not read | not read | not read | **reads** (hole concession) | not read |
| `pickedUp` | not read | not read | not read | not read | not read | not read |
| `ctpWinner` | not read | not read | not read | not read | not read | **reads** |
| `longestDriveWinners` | not read | not read | not read | not read | not read | **reads** |
| `gir[pid]` | not read | not read | not read | not read | not read | **reads** (greenie GIR check) |
| `bunkerVisited[pid]` | not read | not read | not read | not read | not read | reads (Sandy — Phase 3) |
| `treeSolidHit[pid]` | not read | not read | not read | not read | not read | reads (Barkie — Phase 3) |
| `treeAnyHit[pid]` | not read | not read | not read | not read | not read | reads (Arnie — Phase 3) |
| `longPutt[pid]` | not read | not read | not read | not read | not read | reads (Polie — Phase 3) |
| `polieInvoked[pid]` | not read | not read | not read | not read | not read | reads (Polie invoked mode) |
| `fairwayHit[pid]` | not read | not read | not read | not read | not read | not currently read (Phase 3) |
| `status` | not read | not read | not read | not read | not read | not read |

**Stroke Play's actual HoleState consumption:** 5 fields — `hole`, `holeIndex`, `timestamp`, `gross[pid]`, `strokes[pid]`. The remaining 15 HoleState fields can be stub-populated (empty arrays, `null`, empty records, `false`) and Stroke Play will produce correct results.

### HoleData → HoleState: fields with no source in HoleData

`HoleData` (UI store type) has: `number`, `par`, `index`, `scores`, `dots`, `wolfPick`, `presses`, `greenieWinners`, `bangoWinner`.

The following HoleState fields have no corresponding field in HoleData today:
- `withdrew: PlayerId[]` — not in HoleData; needs UI store extension + new interaction
- `conceded: PlayerId[]` — not in HoleData; needs UI store extension + new interaction  
- `pickedUp: PlayerId[]` — not in HoleData; needs UI store extension + new interaction
- `longestDriveWinners: PlayerId[]` — not in HoleData (HoleData has no longestDrive field)
- `strokes: Record<PlayerId, number>` — not in HoleData; computed from PlayerSetup.courseHcp + round handicap
- `timestamp: string` — not in HoleData; generated at build time
- `status: HoleStatus` — not in HoleData; derived from scoring state

The fields that DO have sources in HoleData: `hole` ← `HoleData.number`, `par` ← `HoleData.par`, `holeIndex` ← `HoleData.index`, `gross` ← `HoleData.scores`, `ctpWinner` ← `HoleData.greenieWinners[betId]`, junk booleans ← `HoleData.dots`.

### Implementation cost: Stroke-Play-only builder vs all-five builder

**Stroke-Play-only builder:** Map 5 fields; stub 15. The only mapping work for Stroke Play specifically is: `gross` from `HoleData.scores`, `strokes` from `PlayerSetup` handicap computation, `holeIndex` from `HoleData.index`, `hole` from `HoleData.number`, `timestamp` generated. All other fields stubbed as empty arrays / null / false.

**All-five builder:** Same 5 mapped fields plus additionally: `par` from `HoleData.par` (trivial), `ctpWinner` from `HoleData.greenieWinners[betId]` (requires per-bet lookup, modest complexity), junk booleans from `HoleData.dots` (requires understanding `HoleDots` structure), and `longestDriveWinners` which has no HoleData source today regardless of scope. `withdrew`, `conceded`, `pickedUp` also have no HoleData source and are stubbed empty in both versions.

**Net additional cost of all-five over Stroke-Play-only:** Roughly the `HoleData.dots → junk booleans` mapping plus the `greenieWinners → ctpWinner` lookup. Both are non-trivial but neither is large.

### Rework risk when parked bets unpark

The Stroke-Play-only builder stubs `conceded: []`, `withdrew: []`, `pickedUp: []`, and `longestDriveWinners: []`. When Match Play unparks, the builder needs `conceded` and `withdrew` populated from somewhere. Since HoleData currently has no `conceded` or `withdrew` fields, unparking Match Play requires:

1. New UI interactions (concession recording, withdrawal recording) — these do not exist today regardless of the bridge
2. New fields in `HoleData` or the Zustand store to carry this data
3. Builder extension to map those new fields

The builder itself is not the bottleneck — the UI interaction layer is. Builder rework when Match Play unparks is additive (add new field mappings) rather than rewrite (the existing 5-field mappings are not affected). The risk is **low for the builder code itself, and deferred to Match Play UI work**.

---

## 5. Cutover (#11) Under Stroke-Play-Only

The current #11 strategy is batched: delete all legacy compute functions once all consumers are migrated. Under Stroke-Play-only, three options:

### Option A — Surgically replace only the `strokePlay` case in `computeGamePayouts`

`src/lib/payouts.ts:158–166`:
```ts
function computeGamePayouts(holes, players, game): PayoutMap {
  switch (game.type) {
    case 'strokePlay': return computeStrokePlay(...)  // ← replace this
    case 'matchPlay':  return computeMatchPlay(...)   // ← stays legacy
    case 'nassau':     return computeNassau(...)      // ← stays legacy
    case 'stableford': return computeStableford(...) // ← stays legacy
    case 'skins':      return computeSkins(...)       // ← stays legacy
    default:           return computeStrokePlay(...)  // ← update or leave
  }
}
```

The `case 'strokePlay'` branch calls a thin adapter: `payoutMapFromBridgeResult(bridge.settleRound(...))`. `computeStrokePlay` is deleted. All other cases unchanged. `computeAllPayouts`, `bets/results pages` — all unchanged.

**Grep gate for "Stroke Play cutover complete":**
```
git grep -rn "computeStrokePlay" src/ → 0
```
Independent of the other four bets. Does not require the other cases to be replaced.

**Bets/results pages:** No conditional routing needed. `computeAllPayouts` is still the entry point; Stroke Play results just come from the new path internally.

**Lines of payouts.ts touched:** Lines 16–43 (`computeStrokePlay` function body) — deleted. Lines 160 (the `case 'strokePlay'` branch) — updated. Line 165 (`default: return computeStrokePlay(...)`) — needs updating or will call a deleted function. Approximately 30 lines changed, 165 remaining.

**Risk:** The `default` case currently falls through to `computeStrokePlay` — used by Wolf (which has no named case). Deleting `computeStrokePlay` without handling the `default` case would break Wolf. Options: replace `default` with `return emptyPayouts(game.playerIds)` (zero out unknown game types), or add a named `case 'wolf'` with zero output explicitly. Either is a ~2-line change.

---

### Option B — Leave payouts.ts entirely; validate Stroke Play bridge via unit tests only

No changes to payouts.ts. The bridge is implemented and tested via unit tests (bridge function + engine call chain), but the live bets/results pages still call `computeAllPayouts`. The bridge is "live" in the sense that it exists and is tested; it is not in the UI production path.

**Grep gate:** Not applicable — there is nothing to verify deleted.

**Trade-off:** The bridge is validated against known fixtures in tests but not exercised in the actual UI. The Stroke Play cutover (replacing `computeStrokePlay` in payouts.ts) becomes a separate step, not part of the bridge prompt.

---

### Option C — Full batched cutover deferred (as in current plan)

No partial cutover. Payouts.ts stays fully legacy until all five bridges are live. The Stroke Play bridge is implemented but the cutover waits for the other four bets to complete their bridges. This preserves the current plan's structure; the only change is that the bridge work is split across five prompts rather than one.

---

## 6. Plan Shape Under Stroke-Play-Only

A single-bet plan document (not an integration into REBUILD_PLAN.md, not a full multi-bet plan) would contain:

**Header:** Scope statement — Stroke Play is the only in-scope bet; other four bets are parked per [chosen park option]; reframe ends when Stroke Play is fully functional per [chosen level] and [chosen park option] is in place.

**Section 1 — Park definition:** One entry per parked bet. Each entry: bet name, park option applied, what "unparked" looks like, unpark trigger criteria (explicit criterion for when the bet is allowed back into active scope).

**Section 2 — Fully functional definition:** Explicit statement of Minimal / Mid / Full with the engine surfaces, UI components, and parking-lot items that resolve.

**Section 3 — Plan entries (phases):** Matching REBUILD_PLAN.md structure (title, AC with fence, files touched, dependencies, sizing, risk flags):
- Phase SP-1: Rule doc fix for Stroke Play (any open rule-doc items for SP; currently none identified — Stroke Play rule doc is not under correction pressure)
- Phase SP-2: Shared HoleState builder (5-field Stroke-Play-scoped builder; note which fields are stubbed and why)
- Phase SP-3: Stroke Play bridge (per-bet orchestration wrapper; engine wiring; settlement modes per chosen "fully functional" level)
- Phase SP-4: Stroke Play cutover (Option A, B, or C from §5 above; grep gate stated)
- Phase SP-5 (optional): Verifier scoped to Stroke Play (Invariants 1, 2, 4, 5, 6, 7, 8, 9 only; Invariants 3 and 10 deferred)
- Phase SP-6: GAME_DEFS cleanup #9 (XS; can run any time; marks non-scope bets disabled in `src/types/index.ts`)
- Phase SP-10: Prisma Float→Int migration #10 (S; independent; can interleave)

**Section 4 — Parking-lot policy:** Three categories:
- Active for Stroke Play phase: `IMPL:60` (if Full level chosen), `IMPL:73` (par-default UX), `IMPL:77` (results display), `IMPL:75` (greenie bet-scope filtering bug — bridge-#12 dependent)
- Deferred until bet unparks: `IMPL:86` (singles withdrew in bestNet), `IMPL:78` (mutual forfeit), `IMPL:81`, and all Match Play / Wolf / Nassau / Skins–specific items
- Future-bucket (independent of any bet): `IMPL:65`, `IMPL:66` (skill amendments), `IMPL:70–72` (auth/friends)

**Section 5 — Dependency graph:** SP-2 → SP-3 → SP-4. SP-1, SP-5, SP-6, SP-10 are independent. Verifier (SP-5) ideally follows SP-3.

**Section 6 — Relationship to REBUILD_PLAN.md:** Explicit statement that #9 and #10 carry forward; #11 is either superseded by Stroke-Play partial cutover (Option A in §5) or deferred until all five bets are live (Option C); #12 is split: SP-2 (builder) + SP-3 (bridge) replace the original monolithic #12.

---

## 7. Operator Decisions Needed

Ordered by dependency — later decisions may depend on earlier ones:

1. **Park option:** Which of (a), (b), or (c) applies to the four non-Stroke-Play bets? This determines what code changes are in scope in the first prompt.

2. **"Fully functional" level for Stroke Play:** Minimal (one mode), Mid (three modes), or Full (three modes + holesets)? This determines the scope of the bridge prompt and whether `IMPL:60` gets resolved.

3. **Verifier disposition:** Defer entirely, defer to post-Stroke-Play, run in parallel, or scope verifier to Stroke Play–only invariants? This determines which of the two active-item designations (verifier vs bridge) takes precedence.

4. **Cutover option:** Option A (surgical replacement of `computeStrokePlay` case), Option B (bridge validated via unit tests only, cutover deferred), or Option C (full batched cutover deferred until all five bets)? This determines whether payouts.ts is touched during the Stroke Play phase.

5. **Plan shape:** Does this model produce a new single-bet plan document, or do the SP-phase entries integrate into REBUILD_PLAN.md as a continuation of #9–#12? (This is Decision H from `pending-items-evaluation.md`, now narrowed to the Stroke-Play-only context.)

6. **Junk in Stroke Play:** Does Stroke Play at any "fully functional" level include Junk side bets (`junkItems: ['greenie', 'longestDrive', ...]`)? If yes, the builder must also map `par`, `ctpWinner`, `gir`, and `longestDriveWinners` — expanding the bridge scope and potentially requiring HoleData extensions. If no, junk items stay empty in `StrokePlayCfg` and those fields remain stubbed in the builder.

---

## Noticed But Out of Scope

1. `computeStrokePlay` in `payouts.ts:16` implements only `winner-takes-pot` with no tie handling (if `winners.length !== 1`, the function returns zero payouts for all players). The legacy function does not implement `per-stroke` or `places`. Under Stroke-Play-only, any existing rounds that were configured with `per-stroke` or `places` mode would be showing $0 payouts today. This is a pre-existing silent bug in the legacy path, not introduced by the reframe.

2. The `HoleData.dots` type structure (`Record<string, HoleDots>`) is not surveyed in this report — the mapping from `HoleDots` fields to `HoleState` junk booleans would be needed for the all-five builder or for a Stroke-Play-with-junk bridge. Deferred to the bridge prompt.

3. `src/store/roundStore.ts` is the writer of `HoleData` objects. Any HoleData extensions (new fields for `withdrew`, `conceded`) require changes to the store, not just the builder. This was noted in §4 but not surveyed in detail.

4. The `scorecard-playoff` tie rule in `StrokePlayCfg` has no UI spec and no engine implementation — `assertValidStrokePlayCfg` accepts the value but `finalizeStrokePlayRound` does not implement it (the function has no `case 'scorecard-playoff'` branch — this should be confirmed but was not grepped during this survey). If the Full level is chosen and `scorecard-playoff` is in scope, this would be a gap.
