# EOD-FINAL 21-April-2026

## Executive summary
- Nassau #5 Phase 2 complete: Turn 1 (offerPress / openPress / settleNassauHole MatchState[] iteration, d4bddb3) and Turn 2 (§ 10 full integration, manual-press negative case, unit proof, 5716120); 128 tests / 7 files
- Loop-candidate survey produced and accepted after 4 revision rounds: 4 candidates with per-turn estimates, stash resolution options, single-shot task list; no starting item chosen — choice deferred to user
- Match Play scope fully established from rule file: 13-turn baseline (~12–14), researcher pre-loop pass required; Turn 12 split into 12a/12b on additive-migration grounds
- Stash housekeeping complete: commit-6-gate-test dropped; 39 files in commit 7 (cc51363); Phase 2 tracker synced with real hashes; stash artifacts recovered via stash^3 checkout
- AUDIT.md items 19 and 13 confirmed stale; addressed in sweep section below

## Decisions made
- **Nassau Phase 3 turn 1 is plan-only.** Engineer writes the two design options (closedOut flag in MatchState vs. post-hoc detection in finalizeNassauRound) with tradeoffs before any code. Prior session.
- **Match Play Turn 12 split into 12a/12b.** REBUILD_PLAN.md says "widen matchFormat with legacy-value migration shim" — additive widening keeps old values in the union, so the type change does not break consumer compile; steps are separable. Prior session.
- **Junk one-kind-per-turn** established as the per-iteration unit after the isCTP/isGreenie pairing was challenged and defended inadequately. Prior session.
- **Match Play alternate-shot/foursomes merged into one turn.** §2 of game_match_play.md explicitly states the engine does not enforce tee-order; identical teamNet and teamCourseHandicap code paths confirmed. Prior session.
- **Match Play concession split:** 'hole' + 'stroke' one turn (same state path, discriminator-only); 'match' separate turn (closes match, emits settlement, stops scoring). Prior session.
- **Match Play TeamSizeReduced is a separate turn** from HoleForfeited/MatchConfigInvalid: mid-round handicap recompute via teamCourseHandicap and downstream teamGross shape change is a non-trivial state transition. Prior session.
- **Option B reclassified for stash resolution.** Original Option B (drop with re-derive) was extended: stash^3 checkout recovers 28 untracked artifact files that would otherwise be lost; checklist edits re-derived manually; stash drop stays explicit. This session.
- **AUDIT.md triage:** EOD-FINAL sweep beats standalone D-class task while sweep remains within ~1 week. Prior session.

## Artifacts produced
- `2026-04-21/015–050` — session artifact files (gate diffs, commit messages, test outputs, loop-candidate survey logs, per-prompt session logs)
- `EOD_21-April-2026.md` — rolling session log, entries 044–050
- `IMPLEMENTATION_CHECKLIST.md` — Phase 2 tracker closed at d4bddb3 / 5716120; status updated to Phase 3 next; 2 parking-lot entries added (session-logging skill maintenance)

## Checklist items closed today
- none fully closed (#5 Phase 2 tracking updated to Phase 2 complete; #5 does not close until all 4 phases land)

## Checklist items still open
- **#5 Nassau engine** — Phase 2 complete; Phase 3 (end-of-round settlement + closeout) is next; plan turn required first

## Parking lot additions today
*(entries added to IMPLEMENTATION_CHECKLIST.md in commit cc51363)*
- Per-prompt NNN_slug.md entries not produced for prior context-window session; artifact files 015–041 are raw gate files, not structured log entries; skill silent on context-reset handling — prompt 027
- Session-logging skill amendment needed: long-session exception clause + context-reset and EOD-FINAL-integration handling — prompt 027

*(entries from earlier today already in IMPLEMENTATION_CHECKLIST.md via commit b85cdb7)*
- makeRoundCfg unused `betId` defaults in skins/stroke_play/wolf test files — prompt 021
- Stress-test refactored engines with end-to-end sample data post-Phase-2-Turn-2 — prompt 033
- Stroke Play multi-format UI (Front 9 / Back 9 / Total 18 selector) — prompt 001
- Closest-to-the-Pin player-list scope for non-BBB bet types — prompt 001

## Blockers
- none

## Tomorrow's starting item
User to select from accepted survey. No default assigned. Options:
- Nassau Phase 3 — plan turn first (design decision gates all engineer turns); active item
- Junk — no pre-loop pass needed; isCTP as turn 1
- Match Play — researcher pre-pass required before engineer turns begin

## Timeline delta
On track for Phase 3 targeted rebuild.

## AUDIT.md sweep
Two stale entries confirmed in Phase 1 inventory (this session). Applying corrections now.

### Item 13 — test count stale
Current: "100 tests / 6 files." Actual (confirmed by test run this session): **128 tests / 7 files**.
Evidence block in AUDIT.md cites `grep -c "it(" ... = 100` and Round 4 Summary "100 tests passing." Both are pre-Nassau counts.

### Item 19 — NassauCfg.matchTieRule classified Open
Current: Open, "removal pending." Actual: field deleted in Nassau Phase 1 (commit d4bddb3, 2026-04-21). IMPLEMENTATION_CHECKLIST.md Phase 1 row confirms "NassauCfg.matchTieRule deleted (closes audit #19)."
