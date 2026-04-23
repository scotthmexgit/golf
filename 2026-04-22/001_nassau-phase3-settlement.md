---
prompt_id: 001
timestamp: 2026-04-22T13:57:10Z
checklist_item_ref: "#5 — Nassau engine, Phase 3"
tags: [nassau, engine, settlement, closeout, tests]
---

## Prompt
Confirmed Phase 3 scope (end-of-round settlement + closeout) with three additions:
1. grep for `finalizeNassauRound` callers before changing signature; report count explicitly.
2. Note if `findBetId` uses reference-identity (it's #3.5's scope); flag but don't fix.
3. Add a read-side contract comment on `MatchState.closed`.
Also: Test 3 must feed holes 15–18 through `settleNassauHole` to prove back state is frozen.

## Action

**Pre-flight checks**:
- `finalizeNassauRound` callers: **zero** outside the file itself and docs/logs.
- `findBetId` lookup: `b.type === 'nassau' && b.id === cfg.id` — already string-id (correct). Not reference-identity. No bug multiplied.

**Engine changes (`src/games/nassau.ts`)**:
1. `MatchState.closed?: boolean` field added with comment: "undefined or false = open; true = settled (closeout or finalization)".
2. `matchPoints` helper extracted (used in both closeout path and finalize).
3. `settleNassauHole` inner loop updated:
   - Skip condition: `match.closed || hole outside window`.
   - After `applyHoleToMatch`, check `holesUp > holesRemaining`; if true → emit `MatchClosedOut` with delta, set `closed: true`.
   - Else → emit `NassauHoleResolved` as before.
4. `finalizeNassauRound` stub replaced: signature changed to `(config, roundCfg, matches)` (dropping unused `_events` param); loops over open matches, emits `MatchTied` (equal) or `MatchClosedOut` (winner, `holesRemaining: 0`).

**Test changes (`src/games/__tests__/nassau.test.ts`)**:
- `finalizeNassauRound` added to import.
- 3 existing test assertions updated in front-9 describe block (hole 9 closes front match, reducing `NassauHoleResolved` count from 18→17 and front count from 9→8; winner sequence loses the final 'tie' entry).
- § 10 full-18 describe extended: 3 new `it()` blocks asserting all 4 matches auto-close via `settleNassauHole` (finalizeNassauRound emits nothing), round totals A+2/B-2 from MatchClosedOut events, integer constraint.
- New describe: § 12 Test 3 (closeout) — uses pre-constructed MatchState to isolate back closeout at h14 from overall; 6 assertions including frozen-state, overall-not-closed-at-14, NassauHoleResolved for overall h15-16, zero-sum.
- New describe: § 12 Test 4 (tied overall) — constructs end-of-round state directly (front A wins, back B wins, overall 9-9); 5 assertions including MatchTied on overall, MatchClosedOut on front/back, zero-sum, integer constraint.

**Key design finding discovered during execution**:
The closeout condition (`holesUp > holesRemaining`) fires on the FINAL hole of any match where the leader has any lead — e.g., a match that ends A 4-3 fires closeout at the last hole (holesRemaining=0, holesUp=1). This means in normal 18-hole play, ALL non-tied matches close out via `settleNassauHole`; `finalizeNassauRound` only handles matches that end exactly tied. This is correct behavior per § 8 and was verified by the § 10 integration test.

**Two correction rounds during test execution**:
- Round 1: Test 3 original setup (front 9 all ties) caused overall to also close out at h14 — BOTH back and overall had 5-0, triggering simultaneous closeout. Switched to pre-constructed MatchState with B-leading overall (B 6, A 4 at h14 entry).
- Round 2: NassauHoleResolved count for overall after h14 expected 3 but got 2 — at h17, overall A 8-6, holesUp=2, holesRemaining=1 → 2>1 → closes at h17 not h18. Corrected to `.toHaveLength(2)`.

## Result
- Files touched: `src/games/nassau.ts`, `src/games/__tests__/nassau.test.ts`
- Tests: 145 passed, 0 failed (was 131 before Phase 3; +14 new tests, 3 existing assertions updated).
- `npx tsc --noEmit --strict` clean.
- Portability grep: zero matches in `src/games/`.

## Open questions
- None. Phase 3 complete.

## Parking lot additions
- (none)
