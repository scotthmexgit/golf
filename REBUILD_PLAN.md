# Rebuild Plan — 2026-04-20

Drafted from `AUDIT.md` (9 Open items) plus the 7 Wolf follow-ups in `/tmp/round-5-notes.md` folded into #3 per user decision at prompt 002. Revised at prompts 003–004 with three user decisions: legacy Match Play mapping confirmed, cutover moved to parallel-path with grep gates, bet-id refactor included as new #4. Entries renumbered to sequential integers #3 through #11. Awaiting final user approval before any code changes begin on #3+.

## Scope

In-scope: 9 Open audit items (#1, #2, #3, #5, #6, #10, #14, #18, #19) + 7 Wolf follow-ups + the bet-id string-lookup refactor (pulled in from deviation flag D at user direction, prompt 004).

Explicit inclusions beyond pure "close the 9 open items":
- **#11 cutover session** — included per user constraint 5. Deletion of `src/lib/*` parallel paths; not itself an audit item but resolves parallel-path carryover noted against Fixed items #4, #7, #8, #15.
- **#4 bet-id string-lookup refactor** — promoted from deviation flag D at prompt 004. Lands before Nassau/Match Play/Junk so all 5 engines share the `id: BetId` pattern from day one rather than accumulating the reference-identity anti-pattern.

## Deviations from AUDIT-implied scope

Three AUDIT sub-gaps and two forward-facing rebuild items are **NOT** covered in this plan.

| # | Not in plan | Why excluded | Recommended disposition |
|---|---|---|---|
| A | Audit #9 sub-gap: ScoringEvent Prisma model | `#9` is classified Fixed; the Prisma-model carryover is strictly out of the "9 Open items" scope you set. | Add to backlog after this rebuild lands; don't expand current plan. |
| B | Audit #17 sub-gap: Final Adjustment engine logic + UI | `#17` is Fixed (type-level); engine logic was explicitly out of Round 3 Sub-Task 2's scope. | Same — separate post-rebuild item. |
| C | Hole-state builder (was #12 in prior checklist) | Not an audit item; UI-integration concern. | Keep in Deferred until a UI-integration phase. |
| E | UI wiring / Zustand route migration (was #13) | Not an audit item; post-cutover UI-integration concern. | Deferred. |

Flag D (bet-id string-lookup refactor) was previously deviation-flagged; user decision at prompt 004 pulled it into scope as #4. No longer a deviation.

Audit #18 (v2 quorum override) is in the 9 Open items but will remain **deferred with no work** this phase — per its own merge decision ("v2 planning round"). Plan entry is a one-line acknowledgment in the Deferred section, not a task.

Audit #19 (`matchTieRule` removal) is **folded into plan #5 Nassau engine** rather than given its own entry — removal is a one-line type change most naturally done while touching `NassauCfg`.

## Plan entries

Each entry: title + audit references, acceptance criteria with fence sentence, files touched, dependencies, sizing, risk flags.

---

### #3 — Wolf follow-ups (Round 5 cleanups)

**Audit references**: none directly (Round-5 follow-ups). Keeps `src/games/wolf.ts` aligned with the cleaned-up `docs/games/game_wolf.md` that landed in Round 5 Sub-Task 1.

**Acceptance criteria**:
- The 7 items listed in `/tmp/round-5-notes.md` Sub-Task 1 are complete:
  1. `WolfCfg.teeOrder` removed from `src/games/types.ts`.
  2. `WolfCfg.lastTwoHolesRule` removed from `src/games/types.ts`.
  3. `src/games/wolf.ts` no longer reads `teeOrder`; captain rotation sources from `RoundConfig.players[]` via `(hole - 1) mod players.length`.
  4. `src/games/wolf.ts` no longer reads `lastTwoHolesRule`; the `lowest-money-first` branch and `moneyTotalsFromEvents` helper are deleted as dead code.
  5. `src/games/__tests__/wolf.test.ts` updated: `makeWolfCfg` fixtures cleaned; 2 config-error tests + the captain-tiebreak test deleted; Test 1 Worked Example assertions updated to `{ A: +21, B: -19, C: +1, D: -3 }` with hole-17 decision `{kind: 'partner', captain: 'A', partner: 'B'}` and hole-18 decision `{kind: 'lone', captain: 'B', blind: false}`.
  6. `WolfDecisionMissing.captain` sourced from `roundCfg.players[((hole - 1) % N)].id` instead of `config.teeOrder[...]`.
  7. `WolfCaptainTiebreak` kept as reserved dead code. Variant count remains 55. A one-line comment in `src/games/events.ts` on the variant notes it is reserved for future captain-selection rules.
- `npm run test:run` passes. Total test count after #3: still 100 (the 3 deleted Wolf tests balance against no additions in #3 itself — any net change must be explicitly justified).
- `npx tsc --noEmit --strict` passes with zero errors.
- Portability grep on `src/games/` returns no forbidden imports.
- **No other changes to `wolf.ts` or `wolf.test.ts` in this PR.** No changes to `skins.ts`, `stroke_play.ts`, or their test files. No changes to `docs/games/game_wolf.md` (the rule file is the source of truth this work aligns to, not a target).

**Files touched**:
- Modify: `src/games/types.ts` (delete 2 fields from `WolfCfg`).
- Modify: `src/games/wolf.ts` (stop reading 2 fields; delete dead-code branch; re-source captain).
- Modify: `src/games/events.ts` (one-line comment on `WolfCaptainTiebreak`).
- Modify: `src/games/__tests__/wolf.test.ts` (fixtures + assertions + 3 test deletions).

**Dependencies**: none. Can land first.

**Sizing**: **S**. Single PR, no new files.

**Risk flags**:
- `WolfCfg` field removal is a type-level change. If any caller outside `src/games/` accesses `teeOrder` or `lastTwoHolesRule` it will fail to compile. Confirmed none today (grep → zero matches outside `src/games/`).
- Test 1 arithmetic change: the number `{ A: +21, B: -19, C: +1, D: -3 }` must match the rule file `docs/games/game_wolf.md` § 10 output. Rule file was rewritten in Round 5 with these numbers; engineer verifies against the rule file, not by invention.

---

### #4 — Bet-id string-lookup refactor

**Audit references**: none directly (Round 1 Spec Gap 4). Closes the reference-identity anti-pattern across all 5 `*Cfg` interfaces before Nassau / Match Play / Junk inherit it.

**Acceptance criteria**:
- All 5 `*Cfg` interfaces in `src/games/types.ts` gain an `id: BetId` field: `SkinsCfg`, `WolfCfg`, `NassauCfg`, `MatchPlayCfg`, `StrokePlayCfg`.
- The 3 `findBetId` helpers in `src/games/skins.ts`, `src/games/stroke_play.ts`, `src/games/wolf.ts` are rewritten from reference-identity (`b.config === cfg`) to string-id comparison (`b.id === cfg.id`).
- Test-file fixtures (`make*Cfg` defaults and any test-scoped config overrides) in `src/games/__tests__/skins.test.ts`, `wolf.test.ts`, `stroke_play.test.ts` gain an `id` field. The `makeRoundCfg` helpers and `BetSelection.id` continue to match for reference-check callers during this transition.
- `npm run test:run` passes. Total test count remains at 100 (modulo the #3 net-zero). `npx tsc --noEmit --strict` passes. Portability grep empty.
- After #4, the 3 new engines (#5 Nassau, #6 Match Play, #7 Junk) are built string-id-native — they use `b.id === cfg.id` from day one, never copy the reference-identity pattern.
- **Only the 5 `*Cfg` interfaces, the 3 `findBetId` helpers in skins/wolf/stroke_play, and the test-file defaults are modified. No engine logic changes. No UI or persistence touched.**

**Files touched**:
- Modify: `src/games/types.ts` (add `id: BetId` to 5 interfaces).
- Modify: `src/games/skins.ts` (rewrite `findBetId` at line 102–105).
- Modify: `src/games/wolf.ts` (rewrite equivalent `findBetId` helper).
- Modify: `src/games/stroke_play.ts` (rewrite `findBetId` at line 135–138).
- Modify: `src/games/__tests__/skins.test.ts` (add `id` to fixtures).
- Modify: `src/games/__tests__/wolf.test.ts` (add `id` to fixtures).
- Modify: `src/games/__tests__/stroke_play.test.ts` (add `id` to fixtures).

**Dependencies**: #3 (types.ts churn ordering — #3 removes Wolf fields from the same file; #4 adds `id` to all 5 interfaces).

**Sizing**: **S**. Mechanical pattern replacement; test-file fixture updates are the bulk of line count.

**Risk flags**:
- Low. If any fixture or engine site is missed, TypeScript would surface the `id` requirement at compile time; runtime reference-equality failures become unreachable after the refactor.
- A `makeRoundCfg` helper that constructs `BetSelection.id` from a parameter (already true in all 3 test files today) keeps the round-config id and the cfg id aligned. Engineer must verify this alignment in each test-file's helper.

---

### #5 — Nassau engine

**Audit references**: closes #5 (Nassau 2-player limit + no press logic), #19 (`matchTieRule` type/doc mismatch); partially closes #1 (per-game `src/games/`), #10 (pure-function signature).

**Acceptance criteria**:
- `src/games/nassau.ts` implements `settleNassauHole`, `finalizeNassauRound`, `offerPress`, `openPress` (or equivalents per `docs/games/game_nassau.md` § 5) matching the `(hole, config, roundCfg, ...) => ScoringEvent[]` signature contract.
- All rule-file features implemented: 2–5 players via `pairingMode: 'singles' | 'allPairs'`; three match bases (front / back / overall); press rules (`manual`, `auto-2-down`, `auto-1-down`) per `pressRule`; press scope (`nine`, `match`) per `pressScope`; closeout when `holesUp > holesRemaining`; halved matches emit `MatchTied` with zero delta; disputes escalate to Final Adjustment.
- `src/games/types.ts` `NassauCfg.matchTieRule` field **deleted** (closes #19). No replacement field.
- Bet-id lookup uses `b.id === cfg.id` (from #4), never reference identity.
- Test file `src/games/__tests__/nassau.test.ts` covers: § 10 Worked Example verbatim (Test 1); every § 9 edge case; every § 12 Test Case; Round Handicap integration test (mirrors Wolf Test 10 and Stroke Play Test 12).
- Zero-sum assertion on every point-producing test.
- `npx tsc --noEmit --strict` passes. Portability grep empty. No `any` / `@ts-ignore` / non-null `!` on untrusted input.
- **No changes to `src/games/skins.ts`, `wolf.ts`, `stroke_play.ts`, or their test files. No changes to `docs/games/game_nassau.md`. No UI wiring.** Old `computeNassau` in `src/lib/payouts.ts` stays untouched (parallel-path hold until #11 cutover).

**Files touched**:
- Create: `src/games/nassau.ts`.
- Create: `src/games/__tests__/nassau.test.ts`.
- Modify: `src/games/types.ts` (delete `NassauCfg.matchTieRule`; no other changes).

**Dependencies**: #3 (types.ts churn ordering), #4 (string-id pattern).

**Sizing**: **L**. Per the Round 4 Summary baseline, Nassau is the most complex remaining engine (press composition, match state across pairs, closeout). Expect Wolf-comparable line count (400–500 engine lines, 600+ test lines).

**Risk flags**:
- `src/games/types.ts` is shared with every other engine. Field removal on `NassauCfg` is low-risk but any incidental edit elsewhere in the file could break Skins/Wolf/Stroke Play. Mitigation: diff scope limited to `NassauCfg` interface.
- Rule file `game_nassau.md` § 4 interface and § 5 pseudocode may have spec gaps similar to Wolf's Round 3 gaps. Expect to log divergences to `/tmp/round-6-notes.md` (engineer session's worklist).

---

### #6 — Match Play engine

**Audit references**: closes #6 (format labels); partially closes #1, #10.

**Acceptance criteria**:
- `src/games/match_play.ts` implements `settleMatchPlayHole`, `finalizeMatchPlayRound`, `closeoutCheck` (or equivalents per `docs/games/game_match_play.md`) matching the signature contract.
- Four formats: `'singles' | 'best-ball' | 'alternate-shot' | 'foursomes'`. Closeout (`holesUp > holesRemaining` → `MatchClosedOut`). Team handicap via `teamCourseHandicap(courseHcp_p1, courseHcp_p2)` using 50%-combined rule.
- `src/types/index.ts` `GameInstance.matchFormat` widened from `'individual' | 'teams'` to the four-format union. This is a breaking type change for existing callers.
- `src/games/types.ts` `MatchPlayCfg.format` already matches the four formats (confirmed in audit); no change needed there.
- Bet-id lookup uses `b.id === cfg.id` (from #4), never reference identity.
- **Legacy-value mapping** (user-confirmed at prompt 004): migration shim for pre-existing rounds that were created under the old `'individual' | 'teams'` enum. Legacy `'individual'` maps to new `'singles'`; legacy `'teams'` maps to new `'best-ball'`. **This mapping is a one-way migration path for pre-existing rounds only — new round creation picks from the full 4-format UI** and never emits the legacy values.
- Test file `src/games/__tests__/match_play.test.ts`: § 10 Worked Example verbatim, every § 9 edge case, every § 12 Test Case, Round Handicap integration test.
- Zero-sum on every point-producing test. `tsc --noEmit --strict` passes. Portability grep empty.
- **No changes to Skins/Wolf/Stroke Play/Nassau engines. No changes to `docs/games/game_match_play.md`. No cutover of the old `computeMatchPlay` in `src/lib/payouts.ts`.**

**Files touched**:
- Create: `src/games/match_play.ts`.
- Create: `src/games/__tests__/match_play.test.ts`.
- Modify: `src/types/index.ts` (widen `matchFormat` union).
- Modify: `src/store/roundStore.ts` (line 155: default for new rounds uses `'singles'`, not `'individual'`).
- Modify: `src/components/setup/GameInstanceCard.tsx` (lines 69, 71: migration-shim read-path only — preserves existing-round rendering under the two new canonical values).

**Dependencies**: #3 (types.ts churn ordering), #4 (string-id pattern), optionally #5 (team-handicap rule shared).

**Sizing**: **L**. Four formats is multiplicative complexity on the state machine. Closeout logic, best-ball team-score computation, alternate-shot timing all add surface.

**Risk flags**:
- **Type-widening `matchFormat` is breaking**. Three consumer files must compile under the new union. Legacy-value mapping (`'individual'→'singles'`, `'teams'→'best-ball'`) avoids runtime breakage in `src/app/round/new/page.tsx` and `GameInstanceCard` during the transition. UI rewrite post-cutover (deferred) removes the shim.
- If `game_match_play.md` § 5 or § 6 has spec gaps (e.g., how handicap applies in best-ball vs. alternate-shot), expect engineer to log divergences.

---

### #7 — Junk engine

**Audit references**: closes #14 (junk engine-side rewrite); partially closes #1.

**Acceptance criteria**:
- `src/games/junk.ts` implements `settleJunkHole(hole, config, roundCfg)` and any finalization helpers per `docs/games/game_junk.md` § 5.
- All seven Junk kinds per `JunkKind` type (`ctp | longestDrive | greenie | sandy | barkie | polie | arnie`). `groupResolve` vs `carry` CTP tie-handling per `ctpTieRule`. Longest-drive tie split with `RoundingAdjustment` fallback. Every event is zero-sum within the declaring-bet's bettor set.
- Bet-id lookup uses `b.id === cfg.id` (from #4), never reference identity.
- Emits only existing `ScoringEvent` variants: `JunkAwarded`, `CTPWinnerSelected`, `CTPCarried`, `LongestDriveWinnerSelected`, `RoundingAdjustment`, `FieldTooSmall`. **No new variants added** (confirmed by audit — `events.ts` already covers Junk). If the rule file names a variant not in `events.ts`, the engineer stops and escalates — no invention.
- Test file `src/games/__tests__/junk.test.ts`: § 10 Worked Example verbatim, every § 9 edge case, every § 12 Test Case. Zero-sum asserted.
- `tsc --noEmit --strict` passes. Portability grep empty.
- **No changes to Skins/Wolf/Stroke Play/Nassau/Match Play engines. No changes to `docs/games/game_junk.md`. No deletion of `src/lib/junk.ts` — that is cutover (#11).**

**Files touched**:
- Create: `src/games/junk.ts`.
- Create: `src/games/__tests__/junk.test.ts`.

**Dependencies**: #4 (string-id pattern). Can run in parallel with #5 or #6 on a different branch if schedule permits.

**Sizing**: **M**. Per-hole scoring is simpler than Wolf; complexity is the event-multiplication rule (one `JunkAwarded` per declaring-bet × junkKind) and the CTP carry logic.

**Risk flags**:
- Rule file has the drift closures from Round 5 Sub-Task 2. Should be cleaner to implement than Nassau or Match Play.

---

### #8 — `src/games/aggregate.ts`

**Audit references**: closes #10 remainder (pure-function signature contract names `aggregate.ts` for round-total aggregation).

**Acceptance criteria**:
- `src/games/aggregate.ts` provides `aggregateRound(events: ScoringEvent[], roundCfg: RoundConfig): RunningLedger` that walks the event log and produces the `RunningLedger` shape already defined in `src/games/types.ts`.
- Idempotent and pure. Identical input → identical output. No dependence on event ordering beyond `hole` ascending; within a hole, the emit order from per-hole `settle*Hole` functions is preserved.
- Zero-sum assertion holds: `Σ netByPlayer == 0` when every registered game module has settled.
- Test file `src/games/__tests__/aggregate.test.ts`: purity test, zero-sum test against a multi-game round (Skins + Wolf + Stroke Play + Nassau + Match Play + Junk events), per-bet ledger slice.
- `tsc --noEmit --strict` passes. Portability grep empty.
- **No changes to any engine file. No changes to `src/games/types.ts` or `events.ts`. No routing through `src/lib/*`.**

**Files touched**:
- Create: `src/games/aggregate.ts`.
- Create: `src/games/__tests__/aggregate.test.ts`.

**Dependencies**: #5, #6, #7 (for a meaningful multi-game zero-sum test; technically can land with Skins+Wolf+StrokePlay only, but a strong test asks Nassau/Match Play/Junk events to round-trip too).

**Sizing**: **S**. Small module; the complexity is in `RunningLedger` correctness against a realistic event stream.

**Risk flags**: none significant.

---

### #9 — `GAME_DEFS` cleanup

**Audit references**: closes #3 (9 game types with no disabled flag).

**Acceptance criteria**:
- `src/types/index.ts` `GAME_DEFS` entries for `stableford`, `bestBall`, `bingoBangoBongo`, `vegas` gain a `disabled: true` field. The `GAME_DEFS` type literal is widened to include `disabled?: boolean`.
- In-scope games (`strokePlay`, `matchPlay`, `skins`, `nassau`, `wolf`) keep `disabled` unset or `disabled: false` (prefer unset for terseness).
- **No removal of the four non-scope games from the `GameType` union** — AGENTS.md rationale ("keep the extra labels visible in UI but mark non-scope games as disabled") preserved.
- **This item is a pure data-shape change. It adds the flag and widens the type; it does NOT change any UI rendering behavior.** The `GameList.tsx` hide-vs-greyed-out decision belongs to the UI wiring phase and is explicitly out of scope here.
- **No changes outside `src/types/index.ts`.** No test changes (no tests cover this today; adding tests is out of scope).

**Files touched**:
- Modify: `src/types/index.ts` (widen `GAME_DEFS` type; mark 4 entries).

**Dependencies**: none.

**Sizing**: **XS**.

**Risk flags**: none. Type-level change only. UI continues to render all 9 entries unchanged; downstream UI consumers opt into the `disabled` signal when the UI rewrite phase picks it up.

---

### #10 — Prisma `stake` `Float` → `Int` cents migration

**Audit references**: closes #2.

**Acceptance criteria**:
- `prisma/schema.prisma` lines 79 and 98 changed from `Float` to `Int` for `Game.stake` and `SideBet.stake`. Integer represents minor units (cents).
- **Migration strategy: drop and recreate.** Per project baseline, existing data is disposable. The migration does not preserve rows; `npx prisma migrate reset` (or equivalent destructive migration) is acceptable. No data-preservation work required.
- `src/lib/scoring.ts` `formatMoneyDecimal` is preserved during this PR (needed by UI display for the cents-to-dollars render boundary). **Deletion of `formatMoneyDecimal` happens post-cutover, not here.**
- Stake consumers that currently assume dollar values get a conversion-boundary update: the UI display sites (`src/app/scorecard/[roundId]/resolve/[hole]/page.tsx:100`, `src/app/results/[roundId]/page.tsx:66`, `src/app/round/new/page.tsx:48`) continue to use `formatMoneyDecimal` (no behavior change). Engine-side sites in `src/games/*` already treat `stake` as integer (confirmed in audit); no change needed there.
- Existing 100 tests still pass.
- **No deletion of `src/lib/payouts.ts`, `src/lib/junk.ts`, or `src/lib/scoring.ts`** — those are cutover-time deletions/renames in #11.
- **No engine-file changes** beyond what's strictly required by a schema migration (should be zero).

**Files touched**:
- Modify: `prisma/schema.prisma` (two lines).
- Create: `prisma/migrations/<timestamp>_stake_int_cents/migration.sql` (drop-and-recreate shape).
- Possibly modify: `src/store/roundStore.ts:173` if the default stake expression uses a float literal (verify; I don't think it does — the audit evidence suggests integer already in UI).

**Dependencies**: none. Independent track; can interleave with #5/#6/#7.

**Sizing**: **S**. Schema change + disposable-data migration.

**Risk flags**:
- Low. No data to preserve; no pre-migration SELECT needed; no fractional-value reconciliation. Consumer sites that format stake as dollars will display `100` instead of `$1.00` if the conversion boundary isn't preserved — `formatMoneyDecimal` exists for exactly this reason and stays in place until UI rewrite.

---

### #11 — Cutover session (delete `src/lib/*` parallel paths)

**Audit references**: resolves parallel-path carryover from Fixed items #4, #7, #8, #15; deprecated shim from audit #11. Not itself an audit item.

**Strategy (user-confirmed at prompt 004): parallel-path migration, consumer-by-consumer commits with grep gates.** A single-commit cutover was considered and rejected — parallel-path means if consumer N breaks, consumers 1..N-1 still work, and per-commit revert is targeted rather than wholesale.

**Acceptance criteria**:

**Commit 1 — inline handicap re-export:**
- `src/games/handicap.ts` replaces its re-exports from `src/lib/handicap.ts` with inline function bodies (`calcCourseHcp`, `calcStrokes`, `strokesOnHole`). `src/games/` has no remaining dependency on `src/lib/*`.
- `npm run test:run` passes. `tsc --noEmit --strict` passes.
- **Grep gate**: `git grep -rn "from.*['\"][@./]*lib/handicap" src/games/` returns zero matches. **If any match remains, commit 1 is not complete.**

**Commits 2–N — consumer migrations (one commit per consumer or small cluster):**
- Each commit migrates a single consumer or a tightly-coupled small cluster away from `@/lib/payouts` / `@/lib/junk` / `@/lib/handicap` / `@/lib/scoring` to the appropriate `@/games/*` or presentation-tier equivalent.
- `npm run test:run` passes after each commit.
- Proposed sequence (adjustable):
  - Commit 2: `src/store/roundStore.ts` — switch `calcCourseHcp`, `calcStrokes` to `@/games/handicap`.
  - Commit 3: `src/components/scorecard/ScoreRow.tsx` — switch `strokesOnHole` to `@/games/handicap`.
  - Commit 4: rename `src/lib/scoring.ts` → `src/components/util/format.ts`. Update 6 consumer imports. `src/lib/scoring.ts` does NOT exist after this commit (git-rename semantics).
  - Commit 5: migrate `defaultJunk`, `syncJunkAmounts`, `hasGreenieJunk`, `hasAnyJunk` consumers (4 files) from `@/lib/junk` to the equivalents in `@/games/junk` (provided by #7) or a thin `src/games/junk-config.ts`.
  - Commit 6: migrate `src/app/results/[roundId]/page.tsx` and `src/app/bets/[roundId]/page.tsx` from `computeAllPayouts` to `aggregateRound` (from #8), wrapping output via `payoutMapFromLedger(ledger: RunningLedger): PayoutMap` in the presentation tier. Adapter confirmed at prompt 003 to stay one release cycle.

**Final deletion commit:**
- Delete: `src/lib/payouts.ts`, `src/lib/junk.ts`, `src/lib/handicap.ts` (the deprecated shim). `src/lib/scoring.ts` already gone from commit 4's rename.
- Preserve: `src/lib/prisma.ts` (Prisma client singleton — not a scoring target; not subject to cutover).
- **Grep gates (all three must return zero matches before the deletion commit lands)**:
  - `git grep -rn "from.*['\"][@./]*lib/payouts" src/` → 0.
  - `git grep -rn "from.*['\"][@./]*lib/junk" src/` → 0.
  - `git grep -rn "from.*['\"][@./]*lib/handicap" src/` → 0.
- `npm run test:run` passes. `tsc --noEmit --strict` passes. A manual smoke test of the app's three main screens (scorecard, bets, results) produces correct deltas against a known multi-game round.

**Cross-commit fence**:
- **No new engine features during #11. No test additions beyond what's required to keep existing tests green. No UI rewrite — adapter handles the `PayoutMap` / `RunningLedger` shape mismatch, and UI rewrite is explicitly deferred.**

**Divergence-window disclosure**: during commits 2–N (estimated elapsed time: one to a few days), different pages of the app call different scoring paths. Users navigating between migrated and unmigrated pages may see different numbers for the same round. For a pre-v1 app with no production users this is acceptable; for v1+ rollout a feature flag or transient banner would be advisable.

**Consumer migration table** (what each commit above touches):

| Consumer | Current import | Replace with | Target commit |
|---|---|---|---|
| `src/store/roundStore.ts:7` | `calcCourseHcp, calcStrokes` from `@/lib/handicap` | `@/games/handicap` | 2 |
| `src/components/scorecard/ScoreRow.tsx:4` | `strokesOnHole` from `@/lib/handicap` | `@/games/handicap` | 3 |
| `src/app/scorecard/[roundId]/resolve/[hole]/page.tsx:8` | `vsPar` from `@/lib/scoring` | `@/components/util/format` | 4 |
| `src/app/scorecard/[roundId]/page.tsx:14` | `vsPar` | Same | 4 |
| `src/app/results/[roundId]/page.tsx:6` | `formatMoneyDecimal, vsPar` | Same | 4 |
| `src/app/bets/[roundId]/page.tsx:5` | `vsPar, parLabel, parColor, formatMoney` | Same | 4 |
| `src/components/scorecard/ScoreRow.tsx:5` | `vsPar, parLabel, parColor` | Same | 4 |
| `src/components/layout/LiveBar.tsx:4` | `vsPar` | Same | 4 |
| `src/app/scorecard/[roundId]/resolve/[hole]/page.tsx:9` | `hasGreenieJunk` from `@/lib/junk` | `@/games/junk` (from #7) | 5 |
| `src/app/scorecard/[roundId]/page.tsx:13` | `hasGreenieJunk` | Same | 5 |
| `src/app/round/new/page.tsx:12` | `hasAnyJunk` from `@/lib/junk` | Same | 5 |
| `src/store/roundStore.ts:8` | `defaultJunk, syncJunkAmounts` from `@/lib/junk` | Same | 5 |
| `src/app/results/[roundId]/page.tsx:7` | `computeAllPayouts` from `@/lib/payouts` | `aggregateRound` from `@/games/aggregate` (+ `payoutMapFromLedger` adapter) | 6 |
| `src/app/bets/[roundId]/page.tsx:6` | Same | Same | 6 |

`src/lib/scoring.ts` is NOT a scoring-engine file despite its name. Rename to `src/components/util/format.ts` during commit 4; do not delete.

**Dependencies**: #5, #6, #7, #8 must all land before commits 5–6 (#7 provides `@/games/junk` helpers; #8 provides `aggregateRound`). Commits 1–4 can start once #3 and #4 land.

**Sizing**: **M**. Mechanical consumer migration distributed across ~7 commits; risk comes from correctness-verification, not line count.

**Risk flags**:
- Highest-severity risk in the plan. Mitigation: parallel-path sequence with grep gates bounds the blast radius to one commit at a time.
- `PayoutMap` vs `RunningLedger` shape mismatch handled by adapter — kept one release cycle, removed in UI rewrite phase.
- **Revert path**: `git revert <commit-N>` returns a single consumer to the old path. The engine files `src/games/*.ts` remain throughout; the only thing that can be lost is the consumer-migration commit itself. No data loss.
- Divergence-window risk is explicit and acceptable for pre-v1.

---

## Deferred (not touched by this plan)

Carried forward from AUDIT.md; no work in this phase.

- **#18** — Role-holder disconnect quorum override (v2 deferred). Variant stays in the union; no code emits it this phase. Single sentence acknowledgment.
- **Audit #9 sub-gap** — ScoringEvent Prisma model. Post-rebuild.
- **Audit #17 sub-gap** — Final Adjustment engine logic + UI. Post-rebuild.
- **Hole-state builder** — Post-cutover, UI-integration phase.
- **UI wiring / Zustand store migration** — Post-cutover.
- **Player abandonment / `PlayerWithdrew` UI flow** — Deferred indefinitely.
- **Comeback Multiplier** — Deferred to PlayerDecision design round.
- **`PlayerDecision` generic mechanism** — Deferred to its own design round.

## Dependency graph

```
#3 (Wolf cleanups) ──> #4 (bet-id refactor)
                             │
                             ├──> #5 (Nassau)
                             ├──> #6 (Match Play)
                             └──> #7 (Junk)

#5, #6, #7 ──> #8 (aggregate.ts)

#9 (GAME_DEFS)    ─── independent
#10 (Prisma Int)  ─── independent

#11 (cutover)     ─── parallel-path; commits 1–4 start once #3, #4 land; commits 5–6 require #7, #8
```

Parallelization opportunities: #9 and #10 can run any time. #5 + #6 + #7 can parallelize after #3 and #4 land (three independent engines). #11 commits 1–4 can interleave with engine work; commits 5–6 are final.

## Risk register (consolidated)

| Risk | Item | Severity | Mitigation |
|---|---|---|---|
| Prisma `Float → Int` schema change | #10 | Low | Drop-and-recreate per disposable-data baseline. No preservation work. |
| `matchFormat` widening breaks consumers | #6 | Medium | Legacy-value mapping (`'individual'→'singles'`, `'teams'→'best-ball'`) as one-way migration shim; new rounds pick from full 4-format UI. |
| Cutover correctness across 14 consumers | #11 | Medium (was High) | Parallel-path strategy with grep gates per commit. Downgrade reflects commit-level revert granularity. |
| `src/lib/scoring.ts` name misleadingly implies scoring-engine content | #11 | Low | Rename to `src/components/util/format.ts` rather than delete; preserve display helpers. |
| Rule-file spec gaps for Nassau / Match Play | #5, #6 | Medium | Log divergences to `/tmp/round-6-notes.md`; follow Wolf pattern. |
| `WolfCaptainTiebreak` variant reserved vs removed | #3 | Low | User decision: keep reserved. One-line comment suffices. |
| Missed `id` fixture in a test file | #4 | Low | TypeScript surfaces missing field at compile time. |
| Divergence window during cutover (migrated vs unmigrated pages) | #11 | Low | Acceptable for pre-v1; feature flag available if needed. |

## Open questions for user before #3 starts

None. All three previously-paused items resolved at prompt 004:
- #6 legacy-value mapping: confirmed (`'individual'→'singles'`, `'teams'→'best-ball'`; migration shim only, new rounds use full 4-format UI).
- #11 cutover strategy: confirmed (parallel-path with grep gates).
- Flag D bet-id refactor: confirmed (included as new #4).

## Sizing totals

| Item | Size |
|---|---|
| #3 | S |
| #4 | S |
| #5 | L |
| #6 | L |
| #7 | M |
| #8 | S |
| #9 | XS |
| #10 | S |
| #11 | M |

Rough effort order: S + S + L + L + M + S + XS + S + M. Three parallel tracks possible (engines #5/#6/#7 after #3+#4 land; infrastructure #9/#10 interleaved; cutover #11 commits 1–4 can start as soon as #4 lands).

---

## Plan status

**Awaiting user approval.** No code changes until the user signs off. #2 (this rebuild plan) stays Active until sign-off; #3 then becomes Active.
