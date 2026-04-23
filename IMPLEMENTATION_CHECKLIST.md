# Implementation Checklist

Single source of truth for scope. Read the **Active item** before any work. Tangents → Parking Lot. Closed items → Done (append-only).

## Project North Star

Golf betting app: a pure-TypeScript scoring engine under `src/games/` plus a Next.js 16 UI that collects per-hole scores, runs five canonical betting games (Skins, Wolf, Nassau, Match Play, Stroke Play) with Junk side bets, and settles zero-sum at round end. Portable to React Native.

<!-- TODO if the above understanding drifts, update from docs/games/ + AGENTS.md -->

## Design timeline

Updated at EOD-FINAL.

| Phase | Target | Status |
|---|---|---|
| 1. Audit MIGRATION_NOTES.md | 2026-04-20 | **done** (closed 2026-04-20 at prompt 001; see `AUDIT.md`) |
| 2. Rebuild plan approval | 2026-04-20 | **done** (closed 2026-04-20 at prompt 004; see `REBUILD_PLAN.md`) |
| 3. Targeted rebuild (#3–#8: Wolf follow-ups, bet-id refactor, Nassau, Match Play, Junk, aggregate) | TBD | active (starting with #3) |
| 4. `prisma/` Float→Int migration + GAME_DEFS cleanup (#9, #10) | TBD | independent of phase 3 |
| 5. Cutover session (#11, delete `src/lib/*` parallel paths) | TBD | blocked on phase 3 |
| 6. UI routes + hole-state builder (deferred beyond this rebuild) | TBD | blocked on phase 5 |

## Active item

### #6 — Match Play engine

**Why**: End-to-end Match Play engine: `src/games/match_play.ts` + tests. Four formats (singles, best-ball, alternate-shot, foursomes). Widen `GameInstance.matchFormat` from the legacy 2-value union to the four-format union with legacy shims.

**Acceptance criteria**: see `REBUILD_PLAN.md` `### #6 — Match Play engine` and `### Phase breakdown — #6 Match Play engine` for full AC. Summary:
- `src/games/match_play.ts` implements `settleMatchPlayHole`, `finalizeMatchPlayRound` per `docs/games/game_match_play.md`.
- Four formats: singles, best-ball, alternate-shot, foursomes.
- `GameInstance.matchFormat` widened from `'individual' | 'teams'` to `'singles' | 'best-ball' | 'alternate-shot' | 'foursomes'` with legacy shims.
- Zero-sum on every point-producing test. `tsc --noEmit --strict` clean. Portability grep empty. No `any` / `@ts-ignore` / non-null `!` on untrusted input.
- Fence sentence: **No changes to `src/games/skins.ts`, `wolf.ts`, `stroke_play.ts`, `nassau.ts`, or their test files. No changes to `docs/games/game_match_play.md`. No UI wiring.**

**Must complete before**: #7 Junk, #8 aggregate.

**Phase tracking**:
- [x] Phase 1a — Type widening + `MatchState` interface (no new behavior) — closed 2026-04-22 at prompt 016. `matchFormat` widened; legacy shims in roundStore + GameInstanceCard; `match_play.ts` skeleton (MatchState, error classes, initialMatch); stub test. 178 tests, tsc+greps clean.
- [x] Phase 1b — Singles `holeWinner` + `settleMatchPlayHole` + § 10 worked example — closed 2026-04-22 at prompt 018. Engine correct per § 5; § 10 table bug (H13 not H14) surfaced via pre-write arithmetic gate, corrected in documenter turn (prompt 017), test assertions updated. 193 tests, tsc+greps clean.
- [x] Phase 2a — Best-ball holeWinner + teams validation (Gap 10) + settleMatchPlayHole routing + per-player delta split + RoundingAdjustment (Gap 7) — closed 2026-04-23 at prompt 001. MatchConfigInvalid emitted per § 4; splitToTeam lex-lowest absorption; 203 tests, tsc+greps clean.
- [x] Phase 2b — teamCourseHandicap in handicap.ts + alternate-shot/foursomes holeWinner — closed 2026-04-23 at prompt 002. teamGross/teamStrokes keyed '0'/'1'; alt-shot and foursomes share branch per § 2; 214 tests, tsc+greps clean.
- [x] Phase 3 — End-of-round settlement — closed 2026-04-23 at prompt 004. finalizeMatchPlayRound; tieRule collapsed to 'halved'; 218 tests, tsc+greps clean.
- [x] Phase 4a — Round Handicap integration test — closed 2026-04-23 at prompt 005. 2 tests (singles + alt-shot), caller-applies confirmed, 220 tests, tsc clean. (Alt-shot test removed in subtractive pass prompt 007; 1 test retained; final count 208.)
- [x] Phase 4b — Concession-closeout ordering (Gap 4) — closed 2026-04-23 at prompt 009. concedeMatch + hole-concession short-circuit; § 12 Tests 4–5; 219 tests, tsc+greps clean. Engine-level only — HoleState.conceded has no UI writer; see #12.
- [x] Phase 4c — Best-ball partial miss + HoleForfeited (Gap 9) — closed 2026-04-23 at prompt 010. getMissingScoreForfeit + bestNet partial-miss fix; § Phase 4c tests 1–5; 235 tests, tsc+greps clean. Engine-level only — HoleForfeited fires on missing gross; no UI path currently produces missing gross (withdrew, pickedUp, blank-entry flows all absent from HoleData); see #12.
- [ ] Phase 4d — TeamSizeReduced emit logic

**Status**: Active — Phase 4d next; pending W9-prereq (§ 9 TeamSizeReduced timing decision) then W9 REBUILD_PLAN.md rewrite.

## Backlog

Ordered; rough sizing in parens. Backlog structure revised after audit and rebuild plan: Skins, Wolf, Stroke Play meet their merge decisions and are NOT rebuilt. See `REBUILD_PLAN.md` for full acceptance criteria per item. Backlog numbers here match `REBUILD_PLAN.md` numbers.

- (#6 is currently Active — see "Active item" section above.)
- **D1** — Documenter: resolve Nassau rule-file ambiguities surfaced at prompt 012. Update `docs/games/game_nassau.md` § 5 pseudocode to show pair-wise USGA allocation (matching § 2 prose, which is authoritative per I1/I4 decision). Update § 9 N35 to clarify that "in favor of opposing player" applies only when a lead exists — tied in-flight matches on withdrawal get `MatchTied` zero-delta per § 6. Independent of all engine work; can be done any time. (XS)
- **#7** — Junk engine: `src/games/junk.ts` + tests. (M)
- **#8** — `src/games/aggregate.ts` for round-total aggregation. (S)
- **#9** — `GAME_DEFS` cleanup: mark 4 non-scope games as `disabled: true`. (XS)
- **#10** — Prisma `Float` → `Int` cents migration; drop-and-recreate per disposable-data baseline. (S)
- **#11** — Cutover session: parallel-path migration across ~7 commits with grep gates. Depends on #5, #6, #7, #8. (M)
- **#12** — HoleData ↔ HoleState bridge: wire withdrew/pickedUp/conceded; covering-score field; setScore(0) guard; Wolf PlayerWithdrew writer; Nassau settleNassauWithdrawal caller. (L)

Deferred beyond this rebuild plan (see REBUILD_PLAN.md "Deferred" section): ScoringEvent Prisma model, Final Adjustment engine logic + UI, hole-state builder, UI wiring, Player abandonment, Comeback Multiplier, PlayerDecision generic mechanism.

## Parking Lot

Untriaged. Dated and sourced to a prompt. Triage at EOD-FINAL or on explicit request.

<!-- format: - [ ] <description> — YYYY-MM-DD — prompt NNN -->

- [ ] SKILL.md NNN-format redundancy: new inline note and trailing standalone sentence overlap — consider a future tightening pass — 2026-04-20 — prompt 006
- [ ] wolf.test.ts has 4 stale references to `teeOrder` in describe names + one inline comment (lines 314, 317, 337, 364) that describe logic that now uses `roundCfg.players[]`. Fence sentence prevented updates in #3; not functional defect; worth a cosmetic pass in a later cleanup — 2026-04-20 — prompt 007
- [ ] Stroke Play is played in several formats including Front 9, Back 9, Total 18. Investigate methods to make the UI simple and intuitive. No junk bets for skins — amount is based on chosen bet format. Could be 3 bets if the user selects Front 9 winner, Back 9 winner, and Total winner as the option. — 2026-04-21 — prompt 001
- [ ] On the Closest to the Pin screens, all players are shown for Bingo Bango Bongo. Unclear whether other bet types have the same issue. Investigate. — 2026-04-21 — prompt 001
- [ ] `makeRoundCfg` helpers in `skins.test.ts` (line 51), `stroke_play.test.ts` (line 55), and `wolf.test.ts` (line 55) all retain unused `betId` defaults after commit 3 drops their sole non-default callers; parameters are now dead code — cosmetic cleanup, not bundled into commit 3 — 2026-04-21 — prompt 021
- [ ] `nassau.test.ts` comment at the forfeit-on-final-hole describe header ("NassauHoleForfeited precedes the loop so it emits unconditionally") is stale after Gate 2's inside-loop refactor; comment describes old behavior, not current. Cosmetic cleanup. — 2026-04-22 — prompt 009/010
- [ ] Stress-test the refactored engines (Skins, Wolf, Stroke Play, Nassau once Phase 2 Turn 2 lands) with end-to-end sample data to surface integration issues unit tests don't catch — particularly around serialization boundaries and the bet-id string-lookup refactor's assumptions — 2026-04-21 — prompt 033
- [ ] Per-prompt NNN_slug.md session log entries were not produced for the prior context-window session; artifact files 015–041 in 2026-04-21/ are raw gate artifacts and diffs, not structured log entries. Structured per-prompt logging resumed in the post-reset session at 044. Skill is silent on context-reset and extended-session handling; amendment is a deferred item — 2026-04-21 — prompt 027
- [ ] Session-logging skill should be reviewed for (i) long-session exception clause with prompt-count threshold, and (ii) integration with EOD-FINAL routine for handling days where per-prompt logs are absent or deferred. Today's deviation (prompt 027 above) is the trigger. Amendment belongs in a session focused on skill maintenance, not inline during engineering work — 2026-04-21 — prompt 027
- [x] `makeHole` in `junk.test.ts` uses a positional signature (holeNum, par, gross, ctpWinner). Will become crowded when LD/Sandy/Barkie/Polie/Arnie turns add longestDriveWinner, bunkerVisited, treeSolidHit, etc. Consider switching to an object-argument shape when a second junk kind touches the fixture — 2026-04-21 — prompt 052 — **resolved in commit 31adf21 (turn 3a-prep)**
- [ ] Match Play mutual forfeit (both sides missing gross) behavior: doc (§ 5, § 9) is silent on the case where both players/teams have no score. Engine currently falls through to holeWinner's Infinity path → halved (no HoleForfeited). Needs documenter rule decision + test before being locked. Parked per Phase 4c stop-condition. — 2026-04-23 — prompt 010
- [ ] concedeMatch inverted-concession test (conceder was winning): preMatch holesUp=-3 (B leads), B concedes — points should still go to A. buildCloseoutEvent takes winner explicitly so trust-the-type-system holds, but a test locking this decoupling at the assertion level is pending. — 2026-04-23 — prompt 009
- [ ] Main screen: clicking a recent round should allow resume/view; currently non-functional. Requires authentication system. [FUTURE-UX] — 2026-04-23 — UI walkthrough
- [ ] User authentication system needed as prerequisite for prior-round access (resume/view) and friends features. [FUTURE-UX] — 2026-04-23 — UI walkthrough
- [ ] Friends list and auto-add friends to new round player setup. [FUTURE-UX] — 2026-04-23 — UI walkthrough
- [ ] Hole score entry: default each player's score to par so "Next" is immediately clickable without manual entry; current requirement to change every score before advancing is unnecessary friction. [UI-FLOW] — 2026-04-23 — UI walkthrough
- [ ] Greenie eligibility hard-restricted to "par or better" — enforced at both layers: engine (`junk.ts:23`: `gross[winner] > hole.par`) and UI (`resolve/[hole]/page.tsx:55`: `vsPar ≤ 0`). Should be user-configurable, not hard-enforced; changing requires both layers. [UI-FLOW] — 2026-04-23 — UI walkthrough
- [ ] Stroke play greenie resolution shows "nobody" option on hole 6 when all 5 players birdied; match play and skins correctly show all 5 players as eligible. Bet-scope filtering bug specific to stroke play — may be bet-membership mapping, junk-kind filter logic, or HoleData→HoleState translation (5 players assumed; confirm). [BRIDGE-#12] — 2026-04-23 — UI walkthrough
- [ ] Greenie pop-up: no back-navigation to current hole's score entry from within greenie selection; user must advance to next hole then retreat. Navigation gap. [UI-FLOW] — 2026-04-23 — UI walkthrough
- [ ] Results screen renders winners/losers correctly but lacks detail; presentationally complete but informationally thin. Low priority. [UI-FLOW] — 2026-04-23 — UI walkthrough

## Done

Append-only. Close date + pointer to prompt NNN or EOD.

<!-- format: - [x] #N — <title> — closed YYYY-MM-DD — prompt NNN -->

- [x] #1 — Audit `MIGRATION_NOTES.md` — closed 2026-04-20 — prompt 001 — output: `AUDIT.md`
- [x] #2 — Rebuild plan — closed 2026-04-20 — prompt 004 — output: `REBUILD_PLAN.md`
- [x] #3 — Wolf follow-ups — closed 2026-04-20, prompt 007. Final test count 97 (AC's "still 100" figure was arithmetically wrong; 100 − 3 deletions = 97 was the intended result).
- [x] #4 — Bet-id string-lookup refactor — closed 2026-04-20, prompt 009. Final test count 97 (AC's "100 modulo the #3 net-zero" figure was arithmetically wrong; 97 start, 97 end, 0 net change is correct).
- [x] #5 — Nassau engine — closed 2026-04-22, prompt 011. 177 tests, tsc+greps clean. All phases 1–4d complete. `NassauCfg.matchTieRule` deleted; allPairs/singles both fully supported; press rules; closeout; finalize; forfeit per-match; withdrawal per-pair.

## Deferred / won't-do

With reason.

<!-- format: - [ ] <description> — reason — YYYY-MM-DD -->

- `alternate-shot` and `foursomes` Match Play formats — removed from scope by product decision 2026-04-23; `singles` and `best-ball` only. `teamCourseHandicap`, `HoleState.teamGross`, `HoleState.teamStrokes` removed from engine and types; `GameInstance.matchFormat` narrowed accordingly. (2026-04-23)
- Tied-match-at-endHole adjustment prompt for Match Play — deferred to Final Adjustment design round. Contract: after `finalizeMatchPlayRound` emits `MatchHalved`, the app MAY present a human-arbitration screen that lets players record a post-round adjustment; single `MatchClosedOut` event with agreed delta, emitted after `MatchHalved`, keyed to the same `matchId`. No engine logic until then. (2026-04-23)
- Player abandonment / `PlayerWithdrew` UI flow — deferred indefinitely per product decision (2026-04-20).
- Comeback Multiplier (last-hole stakes adjustment) — deferred to post-v1 PlayerDecision design round (2026-04-20).
- `PlayerDecision` generic mechanism — deferred to its own design round after Nassau/Match Play (2026-04-20).
