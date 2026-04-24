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

### #8 — aggregate.ts

**Why**: Reduce a `ScoringEventLog` to a `RunningLedger`. Shape A (combined orchestrator + reducer). Junk-only stake-scaled formula; all other monetary events pass points through directly. Zero-sum enforcement via `ZeroSumViolationError`.

**Acceptance criteria**: see `REBUILD_PLAN.md` `### #8` for full AC.

**Must complete before**: #11 cutover (engine-side).

**Phase tracking**:
- [x] Phase 1 — Scaffold + Junk reducer + junk.ts dead-code deletion — closed 2026-04-24 (commit 8c0a147). 277 tests, tsc clean. Supersession filter deferred (Option C); RoundingAdjustment branch removed (Outcome A).
- [ ] Phase 2 — Skins + Wolf reduction
- [ ] Phase 3 — Nassau + Match Play with MatchState threading
- [ ] Phase 4 — Stroke Play + all-5-games integration test

**Status**: Active — Phase 1 closed 2026-04-24.

## Backlog

Ordered; rough sizing in parens. Backlog structure revised after audit and rebuild plan: Skins, Wolf, Stroke Play meet their merge decisions and are NOT rebuilt. See `REBUILD_PLAN.md` for full acceptance criteria per item. Backlog numbers here match `REBUILD_PLAN.md` numbers.

- **D1** — Documenter: resolve Nassau rule-file ambiguities surfaced at prompt 012. Update `docs/games/game_nassau.md` § 5 pseudocode to show pair-wise USGA allocation (matching § 2 prose, which is authoritative per I1/I4 decision). Update § 9 N35 to clarify that "in favor of opposing player" applies only when a lead exists — tied in-flight matches on withdrawal get `MatchTied` zero-delta per § 6. Independent of all engine work; can be done any time. (XS)
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
- [ ] **Mutual forfeit rule decision** (both sides missing gross) — documenter pass needed; Match Play doc §5/§9 silent. Added 2026-04-24 from prompt 010 parking lot.
- [ ] **Status line quotes plan wording inline** (#6 Status line now embeds "Emit-once: Option (i)..." verbatim) — if Phase 4d spec in REBUILD_PLAN.md evolves, the Status line goes stale again. Consider dropping the quoted detail to a pointer-only ("W9-prereq resolved: see REBUILD_PLAN.md Phase 4d") in a future micro-pass alongside AGENTS.md + #6 "Why" cleanups. Added 2026-04-24.
- [ ] Best-ball mutual partner withdrawal (both players of one team in `state.withdrew` on one hole) — rule question against `game_match_play.md` §9. Current Phase 4c `bestNet` filter falls through to Infinity → halved, which may be incorrect behavior. Cross-ref: existing mutual-forfeit parking-lot item (both sides missing gross, filed 2026-04-23). Both are §9 rule gaps; resolve together. Added 2026-04-24.
- [ ] Singles withdrew exclusion in bestNet: behavior is format-agnostic (Phase 4d AC scoped TeamSizeReduced emit to best-ball only, not the filter). Unspecified whether withdrew + gross set simultaneously in singles should exclude the player. Current caller convention prevents this in practice; gap bites if future phases write withdrew for singles players with gross present. Added 2026-04-24.
- [ ] Same-hole concession + best-ball partner withdrawal overlap: settleMatchPlayHole returns early on concession before the Phase 4d emit block, so TeamSizeReduced is silently dropped when concession and withdrawal coincide. §9 rule gap. Cross-ref: mutual-forfeit (2026-04-23), mutual-partner-withdrawal (2026-04-24). All three resolve together in the §9 documenter pass. Added 2026-04-24.
- [ ] Phase 4d team1/team2 test style inconsistency: team2 branch packs three assertions into one it() block; team1 splits them. Cosmetic. Added 2026-04-24.
- [ ] Phase 4d remainingSize: 1 lacks comment noting 2-player-team invariant enforced by validateTeams. Cosmetic. Added 2026-04-24.
- [ ] junk.ts: hole.timestamp used in pushAward without null guard (line ~46). If HoleState.timestamp is optional, events may emit timestamp: undefined. Added 2026-04-24.
- [ ] **Polie three-putt doubled-loss schema** — rules-pass needed before #7b unskips `isPolie`. Specify: (1) whether "doubles the loss" applies to losers only (zero-sum preserved) or winner + losers; (2) whether `JunkAwarded.doubled: boolean` (schema change to `events.ts`) or a separate event type is the right carrier. Decision deferred from rules-pass 2026-04-24 Topic 7. Gating: #7b `isPolie` stub remains `null`-returning until resolved. — 2026-04-24 — rules-pass
- [x] Junk RoundingAdjustment architectural question: does the branch belong in junk.ts (#7) or aggregate.ts (#8)? Resolved 2026-04-24 — Decision 2 placed it in aggregate.ts. Branch then removed in Phase 1 remediation (Outcome A): integer-only mandate (game_junk.md §11, §12 ACs: `Number.isInteger` on all money values) makes the branch unreachable. See parking-lot item below for remaining open question. Added 2026-04-24.
- [ ] **Pre-Phase-3 gate: byBet compound key widening for Nassau** — `NassauWithdrawalSettled` lands in Phase 1's switch using simple `declaringBet` key (line 135). Phase 3 must widen to compound key `${betId}::${matchId}` per Topic 4 authorization in REBUILD_PLAN.md Open items. Design decision required before Phase 3 engineer scope is finalized: front/back/overall matches under one `betId` must be addressable independently in `byBet`. Added 2026-04-24.
- [ ] **Supersession schema design (pre-Phase-2 gate)** — `EventBase` has no `id` field; `ScoringEventLog.supersessions` has zero writers. Supersession filter was removed from `aggregate.ts` Phase 1 (Option C, remediation pass 2026-04-24). Before Phase 2 can implement supersession reduction, schema decision needed: (A) add `id: EventId` to `EventBase` — breaking change across all emit sites; (B) redesign `supersessions` from `Record<EventId, EventId>` to index-based; or (C) other. Belongs with the feature that writes supersessions. Added 2026-04-24.
- [ ] **RoundingAdjustment existence question** — `RoundingAdjustment` event type exists in `events.ts` as dead schema (never emitted under integer-only mandate; branch removed from `aggregate.ts` Phase 1). Open: remove the event type entirely (schema cleanup), or retain as forward-compatibility scaffold? Resolve before #8 Phase 4 if the all-5-games integration test fixture references `RoundingAdjustment`. Added 2026-04-24.
- [ ] Junk CTPCarried stub: Phase 2 ships CTPCarried with carryPoints: 0, AC-pending rules pass per plan. No §12 test exercises the carry path (all tests use groupResolve). Coverage gap inherited by #7b; rules pass before #7b must specify test coverage for carry accumulation and resolution at Final Adjustment boundary. Added 2026-04-24.
- [ ] `pushAward` multiplier hazard: the `multiplier` param is for event-level point doubling (Super Sandy) only. `bet.junkMultiplier` is a money-rendering boundary value — must NEVER be passed as the `pushAward` multiplier argument. Safe in Phase 2 (all calls use default=1). Add a guard comment above the `multiplier` param before Phase 3 Sandy/Barkie/Polie/Arnie work begins. Added 2026-04-24.

## Done

Append-only. Close date + pointer to prompt NNN or EOD.

<!-- format: - [x] #N — <title> — closed YYYY-MM-DD — prompt NNN -->

- [x] #1 — Audit `MIGRATION_NOTES.md` — closed 2026-04-20 — prompt 001 — output: `AUDIT.md`
- [x] #2 — Rebuild plan — closed 2026-04-20 — prompt 004 — output: `REBUILD_PLAN.md`
- [x] #3 — Wolf follow-ups — closed 2026-04-20, prompt 007. Final test count 97 (AC's "still 100" figure was arithmetically wrong; 100 − 3 deletions = 97 was the intended result).
- [x] #4 — Bet-id string-lookup refactor — closed 2026-04-20, prompt 009. Final test count 97 (AC's "100 modulo the #3 net-zero" figure was arithmetically wrong; 97 start, 97 end, 0 net change is correct).
- [x] #5 — Nassau engine — closed 2026-04-22, prompt 011. 177 tests, tsc+greps clean. All phases 1–4d complete. `NassauCfg.matchTieRule` deleted; allPairs/singles both fully supported; press rules; closeout; finalize; forfeit per-match; withdrawal per-pair.
- [x] #6 — Match Play engine — closed 2026-04-24 — prompts 016–010 (2026-04-22 to 2026-04-24). Phases 1a–4d complete. Engine-level: singles + best-ball; alternate-shot/foursomes deferred (product decision 2026-04-23). See REBUILD_PLAN.md §#6 for full AC.
- [x] #7 — Junk engine (Phase 2 core) — closed 2026-04-24. Phases 1–2 complete: CTP, Greenie, Longest Drive fully implemented and tested (§12 Tests 1–5 pass, 273 tests at close). Schema widening: `JunkAwarded.winners` + `LongestDriveWinnerSelected.winners` → `PlayerId[]`; `HoleState.longestDriveWinners: PlayerId[]`. Phase 3 (#7b — Sandy/Barkie/Polie/Arnie) is backlog, gated on rules pass.

## Deferred / won't-do

With reason.

<!-- format: - [ ] <description> — reason — YYYY-MM-DD -->

- `alternate-shot` and `foursomes` Match Play formats — removed from scope by product decision 2026-04-23; `singles` and `best-ball` only. `teamCourseHandicap`, `HoleState.teamGross`, `HoleState.teamStrokes` removed from engine and types; `GameInstance.matchFormat` narrowed accordingly. (2026-04-23)
- Tied-match-at-endHole adjustment prompt for Match Play — deferred to Final Adjustment design round. Contract: after `finalizeMatchPlayRound` emits `MatchHalved`, the app MAY present a human-arbitration screen that lets players record a post-round adjustment; single `MatchClosedOut` event with agreed delta, emitted after `MatchHalved`, keyed to the same `matchId`. No engine logic until then. (2026-04-23)
- Player abandonment / `PlayerWithdrew` UI flow — deferred indefinitely per product decision (2026-04-20).
- Comeback Multiplier (last-hole stakes adjustment) — deferred to post-v1 PlayerDecision design round (2026-04-20).
- `PlayerDecision` generic mechanism — deferred to its own design round after Nassau/Match Play (2026-04-20).
