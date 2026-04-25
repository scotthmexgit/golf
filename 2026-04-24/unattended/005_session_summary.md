# Session summary — 2026-04-24

Compiled from individual session logs 001–007 in `2026-04-24/`. See also REBUILD_PLAN.md
Post-#8 Tooling section and IMPLEMENTATION_CHECKLIST.md for engineering context.

---

## 1. Individual session log inventory

| File | Agent | One-line summary |
|---|---|---|
| `001_w9-prereq-resolve-documenter.md` | documenter | Resolved stale "W9-prereq" flag in IMPLEMENTATION_CHECKLIST.md Status line for #6; confirmed Phase 4d spec was already written; closed drift flag Case A. |
| `002_phase4d-close-documenter.md` | documenter | Closed #6 Match Play engine in IMPLEMENTATION_CHECKLIST.md; added 2 parking-lot items from reviewer notes; verified AUDIT.md references; filed 4 addendum process notes covering engineer-scope drift, tsc-clean ≠ reachable, and schema decision process. |
| `003_phase2-close-and-process.md` | documenter synthesis | Closed #7 Phase 2 (CTP+Greenie+LD); three process observations: engineer prompt drift pattern, tsc-clean ≠ reachability, schema gaps surface during execution not scope. |
| `004_phase1_scope_drift.md` | documenter | Filed parking-lot entry for aggregate.ts Phase 1 over-build: engineer wired all 11 monetary events, plan said Junk-only. Surfaced by Phase 2 planning researcher; plan amended. |
| `005_phase3_interpretation_fork.md` | documenter | Documented Interpretation A decision (event-walk, not settle-function calls) and Phase 4 alignment. Root cause: ambiguous plan language; hole-boundary researcher pass forced explicit choice. |
| `006_phase3_close.md` | documenter | Closed #8 Phase 3 (buildMatchStates + finalizer invocation + compound keys). Iter 1 finding: PressOpened void-guard missing (hard fail). Iter 2 finding: ZeroSumViolationError event count wrong. |
| `007_phase4_and_8_close.md` | documenter | Closed all of #8 (292 tests, tsc clean). Process patterns: engineer prompt drift (3 instances), tsc-clean ≠ reachable, confident-summary-without-grep (4 instances), schema decisions during execution, finalizer convention inconsistency filed to parking lot. |

---

## 2. Process patterns observed

### Engineer prompt drift — narrow vs wide

**Instances (3)**:
1. **#7 Phase 1 narrower-than-plan** (002 addendum): prompt deferred isCTP/isLongestDrive/isGreenie helpers to Phase 2 even though Phase 1 AC included them. Reviewer caught dead code (isLongestDrive compiled but unreachable).
2. **#7 Phase 2 Iter 1 wider-than-plan** (002 addendum): Iter 1 prompt produced 25 it() blocks vs 5 scenarios; one wrong fixture produced 5 events where 3 were expected. Fixed via fixture correction and iteration split.
3. **#8 Phase 1 wider-than-plan** (004): aggregate.ts engineer wired all 11 monetary events in Phase 1 switch; plan said Junk-only. Engineer added an inline comment documenting the decision. Surfaced by Phase 2 planning researcher pass. Plan amended post-hoc.

**Pattern**: Engineer over-builds or under-builds; plan doesn't auto-amend to match; downstream phase planning discovers mismatch. When over-build, the scope stays but no scope amendment was filed same-session.

**Mitigation applied/codified (003)**: Re-read plan AC immediately before drafting each engineer prompt. When engineer scope exceeds plan scope, reviewer must verify a scope amendment is filed same-session.

---

### Reviewer reachability discipline

**Instance**: #7 Phase 4d — `isLongestDrive` compiled clean (tsc-clean) but was never called from `settleJunkHole`. Code path existed but was dead. Reviewer explicit grep-based reachability audit caught it.

**Codified as baseline**: tsc-clean is necessary but not sufficient for reviewer gate. Reviewer confirms that new engine functions appear in the settlement function body (or its direct callers), not just in definitions. Named as "reachability audit" in reviewer discipline.

---

### Confident summary without grep (four instances)

**Instances** (from 007):
1. **W9 claim** (001): Status line referenced a "W9 REBUILD_PLAN.md rewrite" artifact that didn't exist. Caught by documenter grep audit.
2. **team1/team2 teamId** (undated, per 007): claim about teamId values made without grep confirmation.
3. **Shape D label**: scope pass labeled something "Shape D" without verifying that label existed in plan text.
4. **Aggregate scope summary** (004): Phase 2 planning researcher summarized Phase 1 scope from memory; the memory was wrong (Junk-only claim vs all-11 implementation).

**Pattern**: Summaries synthesized from memory rather than live reads. A confident "X is how it works" claim without a grep is untrustworthy.

**Rule codified**: No confident claim about existing code, plan text, or doc content without a live grep + file:line cite. Applied in this unattended run (all claims in passes 1–4 are backed by verbatim quotes with file:line).

---

### Schema decisions during execution

**Three decisions resolved mid-session that shaped multiple phases**:
1. **Topic 4 byBet compound key** (006 / REBUILD_PLAN.md line 957): Nassau monetary events use `${betId}::${matchId}` as byBet key. Decision forced widening `RunningLedger.byBet` type from `Record<BetId, ...>` to `Record<string, ...>`.
2. **longestDriveWinners widening** (003): `longestDriveWinner: PlayerId` (singular) widened to `longestDriveWinners: PlayerId[]` after §12 Test 5 required two co-winners. Required Option A schema change across HoleState, JunkAwarded, LongestDriveWinnerSelected, and 6 fixture files.
3. **Supersession filter deferral** (005 / REBUILD_PLAN.md lines 1119–1120): EventBase has no `id` field; supersession filter was a production no-op; deferred to schema pass (Option C recommended in 003_supersession_schema_dossier.md).

**Pattern**: Schema gaps that are knowable during scope pass but are not discovered until an engineer hits them. The schema for longestDriveWinner tie was discoverable from §12 Test 5 during scope. The supersession filter was discoverable by checking EventBase for an `id` field.

**Mitigation in scope pass**: Include a grep for tie-bearing fields and spot-check against §12 tie test cases before locking the plan.

---

### Scope-pass two-phase split discipline

**Applied to**: #8 aggregate.ts scope (rules pass + scope pass separated by authorization gate). This prevented rushing from "here's the problem" to "here's the code change." The rules pass surfaced two issues (Issue 2: supersession filter, Issue 3: RoundingAdjustment) that each required an explicit decision before engineer scope was finalized.

**Cite**: #8 scope pass → issues surfaced → operator authorized (C) and Outcome A before engineer prompt was drafted.

---

### Finalizer convention inconsistency surfaced

From 007: `finalizeStrokePlayRound` returns input events + new events (passthrough). Nassau and Match Play finalizers return new events only. This is a calling-convention inconsistency that creates a double-counting foot-gun for callers.

Filed to parking lot (REBUILD_PLAN.md). **Pass 1 of this unattended run** surveyed this gap and produced `001_finalizer_refactor_survey.md`. Finding: S-sized change (~8 LOC in stroke_play.ts + 1 test). No blocking issues.

---

## 3. Plan-structure expansion

**Post-#8 Tooling section** added to REBUILD_PLAN.md (lines 1342–1459) in the session before this summary. This section establishes a structural precedent:

> Standalone tooling items (verifyRound, future fixture libraries, round simulators, etc.) live in a `## Post-#8 Tooling` section, numbered separately from the #3–#11 game-engine sequence.

Before this addition, REBUILD_PLAN.md had only numbered plan entries (#3–#11) and parking-lot items. The Post-#8 Tooling section introduces a third category: feature work that is a consequence of #3–#11 landing, not a parallel track.

**Future tooling precedent**: other post-engine tooling (fixture libraries, round simulators, replay tooling) should follow the same pattern — a named sub-section under `## Post-#8 Tooling`, not folded into the numbered game-engine entries.

---

## 4. Unattended work inventory

Passes executed 2026-04-24 (this unattended run):

| Pass | File | Status | Blocker |
|---|---|---|---|
| 1 — Finalizer refactor scope | `001_finalizer_refactor_survey.md` | COMPLETE | None |
| 2 — §9 rule gaps consolidation | `002_s9_rule_gaps_consolidation.md` | COMPLETE | None |
| 3 — Supersession schema dossier | `003_supersession_schema_dossier.md` | COMPLETE | None |
| 4 — Verifier fixture taxonomy | `004_verifier_fixture_taxonomy.md` | COMPLETE | Invariant 10 deferred (supersession schema) |
| 5 — Session summary | `005_session_summary.md` (this file) | COMPLETE | None |

No commits made. All 5 files in `2026-04-24/unattended/`. Working tree has 5 untracked files.
