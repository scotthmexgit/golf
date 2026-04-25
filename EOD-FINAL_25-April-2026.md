# EOD-FINAL 25-April-2026

Documentation + testing hardening day: no new engine features; all work was rule-doc annotation, claim-discipline instrumentation, test gap closure, a §9 Match Play documenter pass, and three UX framing analyses.

---

## Executive Summary

- **CLAUDE.md extended with the rule-relevant topic check gate** (pre-commit gate for any `docs/games/` commit). Gate fires today for the first time in production use; found one qualifying Topic (D4 filed, `game_nassau.md §7` junkItems annotation).
- **15 tests added (292 → 307)**: Skins multi-bet pass-through, Wolf carryover+Lone boundary, Nassau allPairs through `aggregateRound`, `concedeMatch` inverted-concession, two serialization round-trip tests.
- **`stroke_play.ts` finalizer calling-convention fixed** (Iteration 3 Item 3): `finalizeBetEvents` now returns new events only (line 263: `result = []`). All five finalizers now return new-events-only. Three `stroke_play.test.ts` tests updated to match new contract.
- **D1 sub-task A landed**: `game_nassau.md §5` updated with pair-wise USGA allocation pseudocode matching existing engine behavior. Sub-task B (§9 N35 tied-withdrawal) withdrawn as premature pending I3 decision provenance resolution.
- **§9 Match Play documenter pass (Stage 1 only)**: Four rule questions (mutual forfeit, all-team-withdrew, concession+withdrawal overlap, TeamSizeReduced double-withdrawal) surfaced, analyzed, and deferred. All four parking-lot items dropped; late-arrival/early-departure future-bucket entry filed as the umbrella feature.
- **Four research documents produced**: SOD + triage (`TRIAGE_25-April-2026.md`), claim discipline survey, documenter proposals (two gates installed), UX framing (tie-rule semantics, Stroke Play deferred feedback, out-of-order entry correction).
- **21 parking-lot items processed**: 13 closed by execution (tests/code/doc), 8 dropped (moot or deferred), 4 new entries filed (future-bucket + blocked back-propagation triggers).
- **`docs/proposals/ui-first-reframe.md`** committed as an undocumented artifact from today's session; referenced in Notes for next session.

---

## Per-Turn Summary

| Turn | Role | Prompt focus | Output |
|---|---|---|---|
| SOD + triage | researcher | SOD review, engine stress-test survey, §3.5–3.6 architectural classification | `SOD_25-April-2026.md`, `TRIAGE_25-April-2026.md` |
| Gap closure | researcher | Verify §5 gaps in `game_nassau.md`; confirm D1 scope | `GAP_CLOSURE_25-April-2026.md` |
| Claim discipline survey | researcher | Survey project for claim-tagging patterns; rate 10 candidate patterns | `CLAIM_DISCIPLINE_SURVEY_25-April-2026.md` |
| Proposals | researcher + documenter | Two proposals: rule-relevant topic check gate + commit wording | `PROPOSALS_25-April-2026.md` |
| Turn 1 | documenter | `CLAUDE.md` commit wording: "one or more catch-up commits" | `CLAUDE.md` line 23–27 |
| Turn 2 | documenter | `CLAUDE.md` rule-relevant topic check gate; D2 + D3 items | `CLAUDE.md`, `IMPLEMENTATION_CHECKLIST.md` |
| Turn 3 | documenter | D3 attempt — stopped at Stage 1 (CTPCarried not implemented) | No file edits |
| Turn 4 | documenter | D3 withdrawal; eligibility filter appended to `CLAUDE.md` gate; D2 reframing | `CLAUDE.md`, `IMPLEMENTATION_CHECKLIST.md` |
| Turn 5 | documenter | D1 Stage 1 decision + Stage 2 execution: sub-task A (`game_nassau.md §5`); sub-task B withdrawn | `game_nassau.md`, `IMPLEMENTATION_CHECKLIST.md` |
| Iteration 1 | engineer | 7 cosmetic items: stale comments, `junk.ts` null guard, `betId` defaults, test style | 5 src files, 1 skill file |
| Iteration 2 | engineer | 4 tests: skins pass-through, Wolf carryover+Lone, Nassau allPairs, `concedeMatch` inverted | 3 test files |
| Iteration 3 | engineer | Item 3: `stroke_play.ts:263` fix + 3 test updates; Item 1: 2 serialization tests; Item 2: stop condition fired | `stroke_play.ts`, 2 test files |
| Admin pass 1 | documenter | Lines 79, 90 dropped; stale rebuild-context future-bucket entry | `IMPLEMENTATION_CHECKLIST.md` |
| Admin pass 2 (§9 precursor) | documenter | Lines 68, 80, 82, 95 dropped; late-arrival future-bucket entry | `IMPLEMENTATION_CHECKLIST.md` |
| §9 Stage 1 | researcher | Full §9 Match Play analysis: 4 questions, §9 current state, options, recommendations | Stage 1 report (in-conversation) |
| §9 Stage 2 admin | documenter | Lines 93, 64, 69 closed; Triage §2 Findings 1, 2, 4, 7 filed+closed | `IMPLEMENTATION_CHECKLIST.md` |
| UX framing | researcher | 3-item UX analysis: tie-rule UI, Stroke Play deferred feedback, out-of-order entry | `2026-04-25/UX_FRAMING_25-April-2026.md` |
| FINAL EOD | documenter | Gate 2 D4 filed; this file written; rolling EOD created; commit | All files listed below |

---

## Closures Landed Today

### Closed by execution (test, code, or rule-doc work)

| Line | Item | Closed by |
|---|---|---|
| 58 | SKILL.md NNN-format redundancy | Iteration 1 (merged into inline note) |
| 59 | `wolf.test.ts` stale `teeOrder` describe names | Iteration 1 (cosmetic fix) |
| 62 | `makeRoundCfg` unused `betId` defaults | Iteration 1 (dead-code removal) |
| 63 | `nassau.test.ts` stale forfeit-loop comment | Iteration 1 (comment fix) |
| 64 | Stress-test refactored engines | Iteration 3 Item 1 (2 serialization tests) |
| 69 | `concedeMatch` inverted-concession test | Iteration 2 (3 it() blocks in `match_play.test.ts`) |
| 83 | Phase 4d team1/team2 test style | Iteration 1 (split into 2 it() blocks, +1 test to 293) |
| 84 | `remainingSize: 1` invariant comment | Iteration 1 (comment added) |
| 85 | `junk.ts` `hole.timestamp` null guard | Iteration 1 (`const ts = hole.timestamp ?? ''`) |
| 92 | `pushAward` multiplier hazard comment | Iteration 1 (guard comment added) |
| 93 | Finalizer calling-convention inconsistency | Iteration 3 Item 3 (`stroke_play.ts:263` `result = []`) |
| 102 | Triage §2 Finding 1 — Skins multi-bet pass-through | Iteration 2 (filed+closed same day) |
| 103 | Triage §2 Finding 2 — Wolf carryover+Lone boundary | Iteration 2 (filed+closed same day) |
| 104 | Triage §2 Finding 4 — Stroke Play finalizer return shape | Iteration 3 (filed+closed same day) |
| 105 | Triage §2 Finding 7 — Nassau allPairs through `aggregateRound` | Iteration 2 (filed+closed same day) |

### Dropped (deferred or moot — no code change, decision not to act)

| Line | Item | Reason |
|---|---|---|
| 68 | Match Play mutual forfeit | §9 pass: user handles via score entry; halved-via-Infinity preserved without ratification |
| 79 | Status line quotes plan wording | Commit `c218c1f` removed original concern before Iteration 1 ran |
| 80 | Best-ball mutual partner withdrawal | §9 pass: same defer rationale as line 68 |
| 82 | Same-hole concession + withdrawal overlap | §9 pass: audit-log fidelity gap acceptable until broader feature lands |
| 90 | RoundingAdjustment existence question | Admin pass 1: schema is live (6 emission sites confirmed); retain-or-remove resolved as retain |
| 95 | TeamSizeReduced regression | §9 pass: narrow bug tied to late-arrival feature; deferred |

### New parking-lot entries filed today

| Line | Entry | Filed by |
|---|---|---|
| 98 | CTP carry back-propagation trigger (re-trigger of D3) | Turn 4 |
| 99 | D1 sub-task B — Nassau §9 N35 tied-withdrawal, two open questions | Turn 5 |
| 100 | Stale rebuild-context status content [future-bucket] | Admin pass 1 |
| 101 | Late-arrival / early-departure player handling across bets [future-bucket] | Admin pass 2 |

### D-class items

- **D1 sub-task A** — Executed: `game_nassau.md §5` pair-wise pseudocode landed.
- **D1 sub-task B** — Withdrawn; two questions open; parking-lot line 99.
- **D2** — Blocked on #7b Phase 3; no change.
- **D3** — Withdrawn 2026-04-25 (premature); re-trigger at line 98.
- **D4** — Filed 2026-04-25 by FINAL EOD Gate 2: annotate `game_nassau.md §7` with press junkItems inheritance.

---

## Files Modified Today

| File | Change |
|---|---|
| `CLAUDE.md` | Turn 1: commit wording. Turn 2: rule-relevant topic check gate paragraph. Turn 4: eligibility filter. |
| `IMPLEMENTATION_CHECKLIST.md` | ~15 distinct edits across the day: closures, annotations, new entries, D4. |
| `.claude/skills/session-logging/SKILL.md` | Iteration 1: removed redundant NNN trailing sentence. |
| `docs/games/game_nassau.md` | D1 sub-task A: §5 pair-wise USGA allocation pseudocode updated. |
| `src/games/stroke_play.ts` | Iteration 3 Item 3: line 263 `result = [...betEvents]` → `result = []`. |
| `src/games/junk.ts` | Iteration 1: `const ts = hole.timestamp ?? ''` null guard; `pushAward` multiplier hazard comment. |
| `src/games/match_play.ts` | Iteration 1: `remainingSize: 1` 2-player-team invariant comment. |
| `src/games/__tests__/aggregate.test.ts` | Iteration 2: Nassau allPairs 4 it() blocks. Iteration 3: 2 serialization tests. |
| `src/games/__tests__/match_play.test.ts` | Iteration 1: team2 split (+1). Iteration 2: inverted-concession (+3). |
| `src/games/__tests__/nassau.test.ts` | Iteration 1: stale forfeit-loop comment removed (0 test delta). |
| `src/games/__tests__/skins.test.ts` | Iteration 1: `betId` default removal. Iteration 2: multi-bet pass-through test (+1). |
| `src/games/__tests__/stroke_play.test.ts` | Iteration 3: 3 tests updated for new-events-only finalizer contract (0 net delta). |
| `src/games/__tests__/wolf.test.ts` | Iteration 1: 4 stale `teeOrder` references fixed. Iteration 2: carryover+Lone test (+2). |
| `2026-04-24/` (7 files) | Prior-session artifacts committed in this FINAL (no April 24 EOD was run). |
| `2026-04-25/` (6 files) | Today's research reports: SOD, GAP_CLOSURE, CLAIM_DISCIPLINE_SURVEY, PROPOSALS, TRIAGE, UX_FRAMING. |
| `docs/proposals/ui-first-reframe.md` | Undocumented artifact created today; committed as-is. See Notes for next session. |
| `EOD-FINAL_25-April-2026.md` | This file. |
| `EOD_25-April-2026.md` | Rolling EOD (created today; no daily rolling file was maintained). |

---

## Test Count Trajectory

| Event | Count | Delta |
|---|---|---|
| Start of day (#8 close carry-in) | 292 | — |
| Iteration 1: team2 test style split | 293 | +1 |
| Iteration 2: skins pass-through, Wolf carryover+Lone (×2), Nassau allPairs (×4), `concedeMatch` inverted (×3), Match Play Phase 4d (+1 more) | 305 | +12 |
| Iteration 3: serialization tests (×2), stroke_play.test.ts updates (0 net) | 307 | +2 |
| **End of day** | **307** | **+15** |

All 307 tests passing (`npx vitest run`, confirmed 16:29).

---

## Active Item Status

**Verification agent (`src/verify/verifyRound.ts`)** — pre-scope. No engineer work was done. Status unchanged: researcher pass still needed before any implementation prompt. The parking-lot scope description at line 94 remains the canonical spec input.

---

## Open Items at EOD

### Blocked

- **Line 89** — Supersession schema design: zero `EventBase.id` writers; pre-Phase-2 gate. No unblock path in current scope.
- **Line 91** — Junk `CTPCarried` stub: blocked on #7b rules pass for carry accumulation test spec.
- **Line 86** — Polie three-putt doubled-loss schema: blocked on #7b rules pass.
- **Line 99** — D1 sub-task B: blocked on I3 decision provenance + implementation question.

### Parked (needs scoping, not blocked on a specific prior decision)

- **Line 94** — Round-state verification agent: pre-scope; researcher pass is next.
- **Lines 96, 97** — Verifier Invariants 11 and 4: add to verifier scope before Phase 3 engineer starts.
- **D4** — `game_nassau.md §7` junkItems annotation: XS, independent, no blocker.
- **D2** — `game_junk.md §5` Sandy/Barkie annotation: blocked on #7b Phase 3.
- **Lines 60, 61** — Stroke Play multi-format UI, CTP all-players bug: needs scoping.
- **Lines 65, 66** — Session-logging skill maintenance: needs a focused skill-maintenance session.

### Future-bucket (not actionable until trigger fires)

- **Line 98** — CTP carry back-propagation (trigger: lines 1121–1122 implementation)
- **Line 100** — Stale rebuild-context status (trigger: #10 + #11 close)
- **Line 101** — Late-arrival/early-departure (trigger: explicit operator scoping)
- **Lines 70–77** — FUTURE-UX and UI-FLOW items (trigger: UI work begins)

### Backlog (ordered, no active blocker for #9, #10)

- **#9** — `GAME_DEFS` cleanup (XS, independent)
- **#10** — Prisma Float→Int migration (S, independent)
- **#11** — Cutover session (M, depends on #5–#8 — all done; cutover is now unblocked)
- **#12** — HoleData ↔ HoleState bridge (L)
- **D1 sub-task A done** — sub-task B at line 99

---

## Notes for Next Session

1. **Session-logging gap**: Zero `NNN_slug.md` per-prompt logs were created today. The gap is consistent with the open parking-lot items at lines 65–66 (no context-reset exception clause in the skill). Next session should create per-prompt logs from the start. The research reports in `2026-04-25/` serve as an informal record but are not per-prompt structured logs.

2. **`docs/proposals/ui-first-reframe.md`**: This file was created today and committed but was not produced by any documented prompt in today's session. It is a "UI-First Reframe — Scoping Proposal" dated 2026-04-25, Status: Draft. Five open questions (Q1–Q6) remain unanswered. The proposal's tasks (IMPLEMENTATION_CHECKLIST.md update, REBUILD_PLAN.md #11 restructure, possible v1-scope notes in rule docs) are ready to execute once the user answers Q1, Q4, Q5, Q6, and the stop-condition. The user's message for those answers was submitted with placeholder text; answers are needed before any plan edits.

3. **Gate 2 D4 item filed**: `game_nassau.md §7` needs a one-clause annotation stating that presses inherit `junkItems` and `junkMultiplier` from the parent Nassau bet. XS, independent, no blocker. Can land in the next documenter turn.

4. **Design Timeline in IMPLEMENTATION_CHECKLIST.md is stale**: Phase 3 row still says "active (starting with #3)" but #3–#8 are all in Done. Consider updating the timeline in the next FINAL EOD pass.

5. **#11 cutover is technically unblocked**: All five engines (#5–#8 + #3, #4) are done. The `Depends on #5, #6, #7, #8` gate on #11 is now satisfied. However, the UI-first reframe proposal (if approved) would change the sequencing — #11 per-bet rather than all-at-once. Resolve the Q6 answer before touching #11.

6. **`nassau.test.ts` test count**: Phase 4d test count attribution at checklist line 83 says "test count +1 to 293." Total is 307. The remaining +14 came from Iterations 2+3. Confirmed by `npx vitest run` at day's end.

7. **Line 78 (Mutual forfeit rule decision duplicate)**: This entry (`- [ ] **Mutual forfeit rule decision**...`) is a duplicate of line 68 (which was dropped today). Triage classified it as "Drop." It was not in today's enumerated closure list but should be closed in the next admin pass.
