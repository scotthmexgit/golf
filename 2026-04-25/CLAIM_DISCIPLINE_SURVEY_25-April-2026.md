# Claim Discipline Survey — 25 April 2026

Researcher: Claude Sonnet 4.6
Date: 2026-04-25
Scope: Golf project only (`/home/seadmin/golf/`)

---

## Preamble

**Session window surveyed:** Days 1–5 of the rebuild, covering 2026-04-20 through 2026-04-24.

**Artifact set summary:**

| Day | Date | Session logs | Raw artifacts | Rolling EOD | FINAL EOD | Commits |
|---|---|---|---|---|---|---|
| 1 | 2026-04-20 | 17 (`001–017` in `2026-04-20/`) | 0 | `EOD_20-April-2026.md` | `EOD-FINAL_20-April-2026.md` | 1 (next morning) |
| 2 | 2026-04-21 | 14 (`044–057` in `2026-04-21/`) | 29 (`015–043`) | `EOD_21-April-2026.md` | `EOD-FINAL_21-April-2026.md` | 24 |
| 3 | 2026-04-22 | 18 (`001–018` in `2026-04-22/`) | 6 (`investigation-*`) | `EOD_22-April-2026.md` | none | 1 (batch, next morning) |
| 4 | 2026-04-23 | 10 (`001–010` in `2026-04-23/`) | 0 | `EOD_23-April-2026.md` | none (d205e09 commit) | 3 |
| 5 | 2026-04-24 | 9 (`001–009`) + 5 unattended | 0 | none (`009_eod_state.md` interim) | none | 30 |

Total: 59 commits since rebuild start (excluding pre-rebuild snapshot `9055de5`).

**Day 2 raw-artifact distinction (addressing Note 1):** Files `015–043` in `2026-04-21/` are raw gate artifacts produced during the first context-window session on Day 2. These consist of patch files (`*.patch`), staged-diff files (`*_staged-diff.md`), unstaged-diff files, commit message files (`*_message.md`), test output captures, and one prompt-enumeration file. None of these files have the `---\nprompt_id:` YAML frontmatter that defines a structured session log. The first structured session log after the context reset is `044_survey-initial-draft.md`. For all P7 and other pattern counts, files `015–043` are classified as raw artifacts, not session logs. This distinction is applied consistently throughout this report. The parking-lot item at `IMPLEMENTATION_CHECKLIST.md:63` explicitly notes and acknowledges this deviation.

The Day 3 `investigation-00` through `investigation-05` files (6 files in `2026-04-22/`) are similarly classified as research artifacts: they lack the NNN-prefix structured format and YAML frontmatter, and were produced as overnight research passes outside the per-prompt logging flow.

**Cross-reference to GAP_CLOSURE:** `GAP_CLOSURE_25-April-2026.md` in `2026-04-25/` concluded: every engine completion claim (Days 3–5) maps to a git commit or expected pre-FINAL disk state; the F2-shaped pattern (claimed edits not landing) does not exist in golf; `ca0c3d9` is the known unreconstructible-tree-state instance, self-documented; Day 5 has no FINAL EOD, which is expected under the golf convention. These conclusions are cited here and not re-litigated.

---

## P1 — Claim Inflation

**Finding: PARTIAL — two classes of double-claiming detected; both are architectural, not deceptive.**

**EOD-vs-session-log overlap (normal synthesis pattern):** The EOD-FINAL files synthesize work first logged in session logs. This is the intended design (rolling EOD → FINAL EOD). For example, `EOD-FINAL_20` summarizes nassau.ts Phase 1 and Phase 2 Turn 1 work that was already in session logs `013` and `015`. This is synthesis, not inflation — the FINAL provides counts and commit hashes rather than re-claiming independent activity.

**Two genuine double-claim signals found:**

1. **AUDIT.md test count claim (stale then re-corrected):** AUDIT.md item 13 stated "100 tests / 6 files" — a count that was already stale by the time `EOD-FINAL_21` was written (actual count was 128). `EOD-FINAL_21` AUDIT.md sweep section (lines 57–62) both identifies this as stale and corrects it. The claim existed in two artifacts with conflicting values before the correction. Severity: low (self-corrected in the same session).

2. **REBUILD_PLAN.md AC test-count discrepancies (#3 and #4):** The Acceptance Criteria for #3 stated "still 100" and for #4 stated "100 modulo the #3 net-zero." Both AC claims were arithmetically wrong. The actual counts (97 after #3 deleted 3 tests; 97 unchanged after #4) were acknowledged explicitly in the Done-entry notes at `EOD-FINAL_20` lines 80–81. The REBUILD_PLAN.md plan text was left unchanged per the decision at prompt 002 ("arithmetic corrections later live in Done-entry notes, not plan edits"). The plan ACs remain wrong but the Done-entries correctly document the actuals. Severity: low (plan text vs Done-entry divergence is documented; no confusion about what shipped).

**No example found** of the same discrete edit being simultaneously claimed in an independent session log AND an EOD as two separate pieces of work inflating an apparent activity count.

---

## P2 — Detached Closures

**Finding: NOT FOUND for Days 3–5 (per GAP_CLOSURE); NOT FOUND for Days 1–2 at FINAL-EOD level.**

Per `GAP_CLOSURE_25-April-2026.md` Section 1.4, every checklist closure in Days 3–5 maps to an EOD or session-log acknowledgement. GAP_CLOSURE was exhaustive for those days; its conclusion is not re-litigated here.

For Days 1–2, checking at FINAL-EOD level only:

- `EOD-FINAL_20` lines 78–81: explicitly lists #1, #2, #3, #4 as "Checklist items closed today" with prompt and Done-entry references. Each maps to a session log entry in `EOD_20`.
- `EOD-FINAL_21` line 26: explicitly states "none fully closed (#5 Phase 2 tracking updated to Phase 2 complete; #5 does not close until all 4 phases land)." Correct — no checklist item moved to Done on Day 2. Phase 2 tracker boxes were checked in IMPLEMENTATION_CHECKLIST.md at commit `cc51363` (Phase 2 tracker sync), acknowledged in session log `050`.

No detached closures found at FINAL-EOD level for Days 1–2.

---

## P3 — Unreconstructible Tree States

**Finding: FOUND — one documented instance (ca0c3d9); one additional partial instance (Day 1 code).**

**Instance 1 — ca0c3d9 (self-documented, known):** Commit `ca0c3d9` (2026-04-23 08:57:56) bundles all work from Day 3 (2026-04-22) and Day 4 (2026-04-23) through Phase 4c into a single 5,242-line diff across 51 files. The commit message explicitly states: "Catch-up commit: all sessions since 2026-04-21 bundled; iterative work including add-then-remove of alt-shot/foursomes is folded into single diff. Going forward, commits per CLAUDE.md ## Commit practice (FINAL EOD anchor)." This was self-acknowledged. Per-day audit of code state during Days 3–4 is not possible from git history alone; the add-then-remove of alt-shot/foursomes (Phase 2b added, then removed in Phase 4a sessions 006/007) is irrecoverably folded.

**Instance 2 — Day 1 code state:** Day 1 session work (prompts 007, 009, 013, 015 — Wolf follow-ups, bet-id refactor, Nassau Phase 1, Nassau Phase 2 Turn 1) produced real code changes. The Day 1 batch commit `403f7d6` (committed 2026-04-21 08:35) contains ONLY docs and session artifacts — zero `src/` files. The code changes arrived in per-task commits on Day 2 morning: `72894b2` (#3), `6f6cada` (#4), `d4bddb3` (#5 Ph1+Ph2T1). End-of-Day-1 code state as a single point-in-time snapshot does not exist in git. However, per-task audit IS possible (each task has its own commit); the per-task commits are fine-grained. This is less severe than `ca0c3d9` because per-task reconstruction is feasible.

**Evidence:** `git log --oneline --format="%ad %h %s" --date=short` — 2026-04-20 has 1 commit (`9055de5` snapshot); 2026-04-21 has 24 commits; no intermediate Day 1 code commits exist. `git show 403f7d6 --name-only | grep "src/"` returns 0 results.

---

## P4 — Doc-vs-Code Drift

**Finding: PARTIAL — rule-interpretation decisions from the #8 rules pass are in REBUILD_PLAN.md but not back-propagated to game_junk.md; two doc gaps exist but the first is a known backlog item.**

**What changed in docs/games/ since rebuild start:**

The only docs/games/ files changed after `9055de5` (snapshot) are `game_match_play.md` and `_ROUND_HANDICAP.md`, both in commit `ca0c3d9`. The `game_match_play.md` update was the result of an explicit documenter pass (session `013_match-play-gap-resolution`, 2026-04-22) that resolved 10 scoping gaps and amended the rule file before engine implementation. This is the correct pattern: doc-first, then code. The `_ROUND_HANDICAP.md` change removed a stale alt-shot/foursomes reference after that format was removed from scope.

`game_nassau.md`, `game_junk.md`, `game_skins.md`, `game_wolf.md`, and `game_stroke_play.md` have not changed since the snapshot. Verified: `git log --oneline --name-only -- docs/games/game_nassau.md` returns only `9055de5`.

**Two specific drift gaps:**

1. **game_nassau.md §5 pseudocode stale:** The §5 pseudocode still shows the old allocation logic. The rebuild decision (prompt 012 I4 decision, documented in `EOD-FINAL_20` and IMPLEMENTATION_CHECKLIST.md) established pair-wise USGA allocation; nassau.ts was built against this decision; but §5 pseudocode was not updated to match. This gap is acknowledged as D1 backlog item in IMPLEMENTATION_CHECKLIST.md line 42. Severity: documentation debt, not a code correctness issue; the engine and §2 prose are authoritative per the I4 decision.

2. **game_junk.md §5 vs. rules-pass Topic 2 resolution:** game_junk.md §5 pseudocode for Sandy/Barkie/Polie/Arnie returns `candidates.length === 1 ? candidates[0] : null` (confirmed by grep, lines 122, 133, 144). Rules pass commit `8ccd9f5` (Topic 2) resolved: "§6 is authoritative; §5 pseudocode is informative but superseded for the multi-candidate case." This resolution lives in REBUILD_PLAN.md lines 638–645 but was NOT back-propagated to game_junk.md. The #7 engineer scope AC (REBUILD_PLAN.md line 497) explicitly states "No changes to docs/games/game_junk.md" — so the omission was within declared scope. However, a future reader of game_junk.md §5 will see single-winner dispatch code without the supersession annotation. Severity: minor doc debt, scoped as not-yet-done, no code incorrectness.

3. **game_junk.md §6 missing CTPCarried accumulation formula:** Rules pass Topic 1 decided the carry accumulation formula (`carryPoints_new = carryPoints_old + 1`) because game_junk.md §6 is "silent on how carryPoints accumulates when a second CTP tie occurs" (REBUILD_PLAN.md line 912). The formula is in REBUILD_PLAN.md lines 914–920 but not in game_junk.md. Same scope note as Gap 2: #8 AC scoped out docs/games/ changes.

**SRC_ONLY commit count:** 22 of 23 non-batch code commits are SRC_ONLY (touching `src/games/` without `docs/games/`). This is expected — rule files are written before implementation, not updated during implementation.

---

## P5 — Parking-Lot Accumulation

**Finding: NOT FOUND as a deficit pattern, given the project timeline. 37 open items is growth consistent with active engineering across 5 game engines; no evidence of items silently superseded without acknowledgement.**

**Ratio and count:** 37 open (`[ ]`) to 11 closed (`[x]`). IMPLEMENTATION_CHECKLIST.md line 2: "Tangents → Parking Lot." The ratio is noted per Note 2 without over-weighting.

**Age distribution of open items (by date added):**
- 2026-04-20: 2 items (5 days old as of this survey)
- 2026-04-21: 7 items (4 days old)
- 2026-04-22: 1 item
- 2026-04-23: 12 items (UI walkthrough session added 9 UI/UX items)
- 2026-04-24: 15 items (Day 5 engineering generated the largest batch)

**Oldest open items (Day 1 and Day 2, lines 56–64):**

- `SKILL.md NNN-format redundancy` — 2026-04-20 — cosmetic, text overlap. No movement; still open. Low urgency: it's a documentation style issue.
- `wolf.test.ts teeOrder stale references` — 2026-04-20 — cosmetic, not a functional defect. No movement; still open.
- `makeRoundCfg unused betId defaults` — 2026-04-21 — cosmetic dead code. No movement.
- `Stress-test refactored engines with end-to-end sample data` — 2026-04-21 — this item was filed when Nassau Phase 2 was "once Phase 2 Turn 2 lands." All engines are now closed (#5–#8 done). The stress-test is now unblocked but still open. This item is not superseded (the need is real and arguably more urgent now), but it has not been promoted or prioritized.
- `Per-prompt session-log skill amendment` (2 entries) — 2026-04-21 — process improvement items. No movement; both explicitly note "belongs in a session focused on skill maintenance."

**Characterization:** The open items fall into four categories: (1) cosmetic code/comment cleanup (4 items); (2) process/skill maintenance (3 items); (3) future-UX and UI-flow concerns (8 items, all filed Day 4 UI walkthrough); (4) active engine-work gating decisions and invariant questions (22 items from Days 4–5). The Day 5 burst of 15 items reflects intentional problem discovery during the unattended research passes. None of the open items show evidence of being silently dropped or superseded without acknowledgement — items that were resolved (makeHole signature, byBet compound key, Junk RoundingAdjustment) were moved to `[x]` with a dated resolution note.

**Stress-test item edge case:** The Day 2 stress-test item (line 62) was written when "once Phase 2 Turn 2 lands" was the trigger. All engines are now closed. The item's text is slightly stale in its framing but the underlying need (end-to-end synthetic-round tests) is partially addressed by the aggregate.ts capstone test (all-5-games integration test in Phase 4 Iter 2, commit `ba54c24`). The parking-lot item is not superseded but its scope has partially been addressed by the aggregate.ts capstone. No movement in the checklist on this item.

---

## P6 — MIGRATION_NOTES Discipline

**Finding: NOT FOUND — no evidence of actionable treatment.**

`MIGRATION_NOTES.md` has not been modified since the pre-rebuild snapshot (`9055de5`). Verified: `git log --oneline --name-only -- MIGRATION_NOTES.md` returns only `9055de5`.

CLAUDE.md line 46 states: "Do not 'fix' MIGRATION_NOTES items directly — route through the checklist." This instruction was added in the rebuild infrastructure at prompt 006. No session log or EOD in Days 1–5 references MIGRATION_NOTES as a source of actionable work. The one reference outside of Day 1 is in session log `001_w9-prereq-resolve-documenter.md` (Day 5), where it appears as a searched file in a grep table (result: 0 hits for "W9") — a read-only consultation, not a write action.

Nothing has been added to MIGRATION_NOTES recently. The only session that touched it would have been the audit pass (#1) on Day 1 — and the audit decision explicitly routed outputs to `AUDIT.md` rather than modifying MIGRATION_NOTES. Evidence: `EOD-FINAL_20` line 15 decision table, prompt 001 row.

---

## P7 — Session-Log-to-EOD Bridge

**Finding: PARTIAL — Day 2 raw-artifact batch (015–043) has no individual EOD entries by design; Day 3 investigation files are similarly unlogged; Day 5 has no rolling EOD file. All three deviations are acknowledged.**

**Applying the Day 2 raw-artifact distinction:** Files `015–043` in `2026-04-21/` are 29 raw gate artifacts (patches, diffs, commit messages, test output). They are NOT session logs and therefore are not expected to have EOD entries. The work they represent (Nassau Phase 2 Turn 1 — commits `d4bddb3` — and Phase 2 Turn 2 — commit `5716120`) is bridged to the EOD at two levels: (a) `EOD_21-April-2026.md` entries `050` covers the housekeeping stash resolution which explicitly records Phase 2 tracker sync with real hashes; (b) `EOD-FINAL_21-April-2026.md` executive summary line 4 states "Nassau #5 Phase 2 complete: Turn 1 (d4bddb3) and Turn 2 (5716120); 128 tests / 7 files." The raw artifacts contribute to a gap in session-level logging, acknowledged at IMPLEMENTATION_CHECKLIST.md lines 63–64 as a parking-lot item.

**Day 1 (all 17 session logs → EOD):** All 17 session logs (`001–017` in `2026-04-20/`) have corresponding `EOD_20-April-2026.md` entries (lines 3–22). `EOD-FINAL_20` accounts for all 17. No gaps.

**Day 2 structured session logs (044–057 → EOD):** All 14 structured session logs have corresponding entries in `EOD_21-April-2026.md`. The EOD starts at entry `044` and runs through `057`. Files `042–043` (raw artifacts: commit test output and commit message) have no EOD entry, consistent with their classification as artifacts rather than session logs.

**Day 3 (001–018 → EOD):** All 18 structured session logs have corresponding `EOD_22-April-2026.md` entries. The 6 `investigation-*` files (research artifacts, no frontmatter) have no EOD entries. These were overnight investigation passes filed between sessions; they represent intermediate research, not per-prompt session logs. GAP_CLOSURE confirms their outputs landed in the rule-doc corrections and planning decisions bundled in `ca0c3d9`.

**Day 4 (001–010 → EOD):** All 10 structured session logs have `EOD_23-April-2026.md` entries.

**Day 5 (001–009 and unattended 001–005):** There is no `EOD_24-April-2026.md` file. Per CLAUDE.md, the rolling EOD file is appended each session; its absence is a structural gap. The interim EOD function is served by `009_eod_state.md` (tagged `[eod, resume-state]`). Unattended passes `001–005` are bridged through `unattended/005_session_summary.md`, which explicitly states no commits were made and all 5 passes are complete. `009_eod_state.md` acknowledges the unattended queue at lines 14–15. However, 3 of the 5 unattended passes are listed as "unread artifacts" at `009_eod_state.md` lines 52–54 — their findings have not yet been synthesized into an EOD entry. This is consistent with a pre-FINAL session state, not a dropped item.

**EOD claims without session-log backing:** None found. Each EOD line item points to a specific session log (`NNN_slug`) or a commit hash.

---

## P8 — Test-Count Claim Hygiene

**Finding: NOT FOUND for optimistic reporting. One deliberate downward count (documented); two AC arithmetic errors (corrected in Done-entries). Count is stable and verified live.**

**Full trajectory:**

| Checkpoint | Count | Delta | Source |
|---|---|---|---|
| Pre-rebuild snapshot | 100 | — | `9055de5` |
| After #3 (Wolf cleanup) | 97 | −3 (3 tests deleted) | `72894b2`, Done-entry note |
| After #4 (bet-id refactor) | 97 | 0 | `6f6cada`, Done-entry note |
| After #5 Phase 1 | 107 | +10 | Session log `013` |
| After #5 Phase 2 T1 | 120 | +13 | Session log `015` |
| After #5 Phase 2 T2 | 128 | +8 | Commit `5716120` |
| After #5 Phase 3 | 145 | +17 | EOD_22 line 1 |
| After #5 Phase 4a | 147 | +2 | EOD_22 line 5 |
| After #5 Phase 4b | 156 | +9 | EOD_22 line 6 |
| After #5 Phase 4b corrections | 162 | +6 | EOD_22 line 7 |
| Gate 2 | 167 | +5 | EOD_22 line 9 |
| Gate 2 revert | 171 | +4 | EOD_22 line 10 |
| After #5 Phase 4d (#5 CLOSED) | 177 | +6 | EOD_22 line 11 |
| After #6 Phase 1a | 178 | +1 | EOD_22 line 16 |
| After #6 Phase 1b | 193 | +15 | EOD_22 line 18 |
| After #6 Phase 2a | 203 | +10 | EOD_23 line 1 |
| After #6 Phase 2b | 214 | +11 | EOD_23 line 3 |
| After #6 Phase 3 | 218 | +4 | EOD_23 line 5 |
| After #6 Phase 4a | 220 | +2 | EOD_23 line 6 |
| **After alt-shot/foursomes removal** | **208** | **−12 (deliberate)** | EOD_23 line 8, session log `007` |
| After #6 Phase 4b | 219 | +11 | EOD_23 line 10 |
| After #6 Phase 4c (#6 CLOSED) | 235 | +16 | EOD_23 line 11 |
| After #7 Phase 2 (#7 CLOSED) | 273 | +38 | IMPLEMENTATION_CHECKLIST.md line 109 |
| After #8 Phases 1–4 (#8 CLOSED) | 292 | +19 | IMPLEMENTATION_CHECKLIST.md line 110 |
| **Live check 2026-04-25** | **292** | — | `npx vitest run` (verified this session) |

**The 208 count:** The downward revision from 220 to 208 was explicitly documented. Session log `007_alt-shot-foursomes-removal-code.md` states "12 tests deleted: 8 from match_play.test.ts + 4 from handicap.test.ts" following the product decision to remove alt-shot/foursomes. EOD_23 line 8 notes "12 tests deleted." This is a legitimate subtraction, not optimistic overcounting.

**AC arithmetic errors (#3 and #4):** Both REBUILD_PLAN.md ACs stated incorrect test counts. These were not revised downward from a higher claim — they were wrong from the start due to miscalculation in the plan. Done-entry notes in IMPLEMENTATION_CHECKLIST.md lines 105–106 record the corrections with explicit "AC was arithmetically wrong" language. No evidence of post-hoc rationalization.

**AUDIT.md item 13 stale count:** AUDIT.md claimed "100 tests / 6 files" but the actual count at that point in Day 2 was 128 (after Nassau Phase 2). This was stale, not optimistic. EOD-FINAL_21 lines 57–62 corrected it in the same session. No test count claim was left overstated without correction in the permanent record.

---

## P9 — Commit Granularity Trajectory

**Finding: FOUND (oscillation documented). Days 1–2 were fine-grained per-task but Day 1 code was delayed until Day 2 morning; Days 3–4 collapsed to a 2-day batch (ca0c3d9); Day 5 returned to fine-grained per-task commits. The oscillation is self-documented.**

**Evidence — commits per day:**
- 2026-04-20: 0 code commits (Day 1 code committed Day 2 morning)
- 2026-04-21: 24 commits (per-task fine-grained)
- 2026-04-22: 1 commit (`c218c1f` — context trim only, no engine work)
- 2026-04-23: 3 commits (`ca0c3d9` batch + `d205e09` FINAL EOD + `b282778` CLAUDE.md)
- 2026-04-24: 30 commits (per-task fine-grained)

Source: `git log --format="%ad" --date=short | sort | uniq -c`.

**Cause (documented):** The `ca0c3d9` commit message explicitly states: "Catch-up commit: all sessions since 2026-04-21 bundled; iterative work including add-then-remove of alt-shot/foursomes is folded into single diff. Going forward, commits per CLAUDE.md ## Commit practice (FINAL EOD anchor)." The CLAUDE.md commit practice section (`b282778`, 2026-04-23) was created in the same session as the batch commit — the policy was being formalized at the same time as the deviation occurred.

**Effect on per-day audit:** Days 3–4 code state is irrecoverable at the per-task level from git history. The alt-shot/foursomes add-then-remove within Phase 2b/4a/4a-removal is folded into the single diff. This is the `ca0c3d9` unreconstructible-tree-state finding (P3). Day 5 fully recovered — all 30 commits are named per-task (e.g., `#8 Phase 3 Iter 2: finalizers + byBet compound keys + money tests`). Audit for Day 5 is fully supported.

**Day 1 nuance:** Day 1 code work was committed in fine-grained per-task commits but delayed until Day 2 morning. Per-task audit IS possible (separate commits `72894b2` for #3, `6f6cada` for #4, `d4bddb3` for #5). The delay makes end-of-Day-1 code state unavailable as a snapshot, but the per-task commits are unambiguous. This is a softer variant of the granularity gap — less severe than `ca0c3d9`.

---

## P10 — Rules-Pass Changes Landing in REBUILD_PLAN Only

**Finding: NOT A DRIFT FINDING. Answering the three sub-questions from Note 3 before concluding.**

**Sub-question (a): Does the project have a documented or de-facto promotion path from REBUILD_PLAN rules decisions to docs/games/ rule files?**

No documented promotion path exists. Neither CLAUDE.md, AGENTS.md, nor REBUILD_PLAN.md defines a formal mechanism for back-propagating REBUILD_PLAN decisions to docs/games/ files. The de-facto practice, observed in Match Play, was: a documenter agent directly edits the rule file in a dedicated documenter pass (session `013_match-play-gap-resolution`, 2026-04-22), then the rule file is the input for the engineer. That is a doc-first-then-code path, not a code-then-back-propagate path. There is no "REBUILD_PLAN decision → docs/games/ promotion gate" in the project workflow. Evidence: AGENTS.md lines 46–53 define agent routing for "Draft / update docs/games/*.md" as `documenter → reviewer`, with no step from REBUILD_PLAN.

**Sub-question (b): Have prior rules decisions made the journey, and through what gate?**

The one case where rules decisions reached docs/games/ was Match Play: 10 gaps resolved in a documenter pass (session `013`) that directly updated `game_match_play.md`. The gate was: explicit operator request for a documenter pass ("Match Play scoping survey" → "Match Play gap resolution" session sequence). This was triggered by a researcher pass (session `012_match-play-scoping-survey`), not by a REBUILD_PLAN entry. The path was: researcher pass → documenter pass → rule file updated → engineer builds. No REBUILD_PLAN intermediate. By contrast, Junk and Nassau rules decisions accumulated in REBUILD_PLAN (for Nassau, decisions in session `012_nassau-phase-clarification-and-i4.md`; for Junk, rules-pass Topics 1–9 in `8ccd9f5`/`40d4d80`) without a follow-on documenter pass updating the respective rule files.

**Sub-question (c): Are the six Day 5 rules-topic resolutions (commits 8ccd9f5 and 40d4d80) at a stage where docs/games/ promotion is expected but missing, or at a stage where it hasn't been triggered yet?**

These commits resolved Topics 1–6 for `aggregate.ts` behavior: CTPCarried accumulation (Topic 1), CTPCarried resolution (Topic 2), FinalAdjustmentApplied routing (Topic 3), byBet compound key (Topic 4), zero-sum enforcement (Topic 5), Nassau press junk inheritance (Topic 6). These are implementation/architectural decisions about how `aggregate.ts` computes, not modifications to the game rules themselves. The resolutions fill gaps in the docs (e.g., game_junk.md §6 is silent on the accumulation formula) rather than contradicting them.

The #8 engineer scope AC (REBUILD_PLAN.md line 497) explicitly states "No changes to Skins/Wolf/Stroke Play/Nassau/Match Play engines. No changes to docs/games/game_junk.md." This fence sentence explicitly scoped out doc updates for the #8 engineering work. The rules-pass decisions are in REBUILD_PLAN.md as the designed-for-this-codebase authority record.

**Conclusion:** There is no documented promotion path, and prior decisions (Nassau) also did not reach docs/games/ via REBUILD_PLAN promotion. The finding is: the project has a gap — implementation-level decisions that refine or extend rule-file content accumulate in REBUILD_PLAN.md rather than being back-propagated to the canonical rule files. This is a structural pattern, not a Day 5 failure to follow an existing step. Day 5 specifically dropped nothing; it followed the same path as prior days. The finding is a missing promotion mechanism, not a per-session discipline failure.

---

## Logged for Future Triage

Items observed incidentally during this survey that are not tracked elsewhere or warrant clarification:

1. **game_junk.md §5 single-winner dispatch vs. §6 tie table (NOT in checklist):** Rules-pass Topic 2 resolution (REBUILD_PLAN.md line 639: "§5 is superseded for Sandy/Barkie/Polie/Arnie tie cases") has not been annotated in game_junk.md §5. A future reader of game_junk.md §5 without access to REBUILD_PLAN will see apparently authoritative pseudocode (`candidates.length === 1 ? candidates[0] : null`) that contradicts the implemented behavior for #7b. The item at IMPLEMENTATION_CHECKLIST.md line 84 (Polie rules pass) is related but focuses on Polie schema, not the §5 vs §6 hierarchy. This gap should be a D-class documenter task similar to D1 (Nassau §5 pseudocode update). It is NOT currently in the checklist.

2. **game_junk.md §6 missing CTPCarried accumulation formula (NOT in checklist):** The formula decided in REBUILD_PLAN.md Topic 1 (`carryPoints_new = carryPoints_old + 1`) is not in game_junk.md §6, which is currently the canonical rule file for CTP carry behavior. A future engineer implementing the CTPCarried carry path would find the rule file silent on accumulation. This is related to IMPLEMENTATION_CHECKLIST.md line 89 (CTPCarried stub coverage gap) but distinct from it. Also not in the checklist.

3. **Stress-test item (IMPLEMENTATION_CHECKLIST.md line 62) needs scope update:** This parking-lot item was filed when Nassau Phase 2 was the trigger. All engines (#5–#8) are now closed. The item's trigger condition ("once Phase 2 Turn 2 lands") is long past. The aggregate.ts all-5-games integration test (commit `ba54c24`) partially addresses the end-to-end concern but the parking-lot item was not updated to reflect this. Not a blocker, but the item is stale in framing.

---

## Summary Table

| Pattern | Finding | Severity | Key Evidence |
|---|---|---|---|
| P1 — Claim Inflation | PARTIAL | Low | AUDIT.md test count stale-then-corrected (EOD-FINAL_21 lines 57–62); #3/#4 AC arithmetic errors acknowledged in Done-entries (IMPLEMENTATION_CHECKLIST.md lines 105–106) |
| P2 — Detached Closures | NOT FOUND | — | GAP_CLOSURE §1.4 (Days 3–5); EOD-FINAL_20 lines 78–81 and EOD-FINAL_21 line 26 (Days 1–2) |
| P3 — Unreconstructible Tree States | FOUND | Moderate | `ca0c3d9` self-documented (commit message); Day 1 code committed Day 2 morning (`git log` shows 0 2026-04-20 code commits, `403f7d6` has zero src/ files) |
| P4 — Doc-vs-Code Drift | PARTIAL | Low | game_nassau.md §5 stale (D1 backlog, IMPLEMENTATION_CHECKLIST.md line 42); game_junk.md §5 single-winner dispatch superseded in REBUILD_PLAN (line 639) but not in rule file |
| P5 — Parking-Lot Accumulation | NOT FOUND (as deficit) | — | 37 open, 11 closed; oldest items cosmetic; Day 5 burst reflects intentional research; no silently superseded items |
| P6 — MIGRATION_NOTES Discipline | NOT FOUND | — | No changes since `9055de5`; single reference is a grep read; CLAUDE.md directive respected |
| P7 — Session-Log-to-EOD Bridge | PARTIAL | Low | Day 2 raw artifacts (015–043) acknowledged at IMPLEMENTATION_CHECKLIST.md line 63; Day 3 investigation files are research artifacts; Day 5 has no rolling EOD file (pre-FINAL state) |
| P8 — Test-Count Claim Hygiene | NOT FOUND | — | Full trajectory reconstructed; 208 downcount documented; AC errors acknowledged; live count 292 verified |
| P9 — Commit Granularity Trajectory | FOUND (oscillation documented) | Moderate | `ca0c3d9` self-documented; commit-per-day via `git log --format="%ad" --date=short` |
| P10 — Rules-Pass Landing in REBUILD_PLAN Only | NOT FOUND (as per-session drift) | Low (structural gap) | No documented promotion path exists; prior decisions (Nassau) also stayed in REBUILD_PLAN; Day 5 followed same pattern; structural finding, not session-specific discipline failure |
