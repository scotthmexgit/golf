---
prompt_id: "002"
date: "2026-04-24"
agent: documenter
tags: [phase4d, close, match-play, #6]
---

## Done
- Closed #6 Match Play engine in IMPLEMENTATION_CHECKLIST.md: Status line updated, Why summary updated (alt-shot/foursomes stale text removed, parking-lot item removed), #6 moved to Done section.
- Added 2 cosmetic parking-lot items from reviewer pass-with-comments notes.

## Process note
Second-pass engineer brief described change scope as "test-addition only" without stating that pass 1 engine changes remained in the working tree. Reviewer correctly audited both passes together; no defect. Future multi-pass phases: brief the reviewer with full working-tree scope for audit, not per-pass delta.

## Carry-forward
None.

**Addendum (verification pass):** AUDIT.md references in REBUILD_PLAN.md #7 verified. Item #14 and #1 both exist. "closes #14" corrected to "partially closes #14" (cutover is #11, not #7). "Round 5 Sub-Task 2" is real — verbatim in AUDIT.md:200. Risk flag retained as written.

**Addendum (Phase 1 gate — plan amendment):** Phase 1 engineer prompt narrowed scope below REBUILD_PLAN.md Phase 1 AC. Reviewer caught mismatch. Plan amended to match delivery: scope items B/C/D narrowed; isCTP/isLongestDrive/isGreenie and event emission moved to Phase 2. Pattern to watch: engineer-prompt drafting should re-read plan AC immediately before the prompt goes out, not rely on summary. Second occurrence this session of prompt-narrower-than-plan (first: Phase 4d W9-prereq prompt missing Phase 1 context).

**Addendum (Phase 2 Iteration 1 reviewer FAIL — process note):** Reviewer audit revealed `isLongestDrive` was tsc-clean but never called from `settleJunkHole`. tsc-clean is weaker evidence than "code path is exercised and produces correct output." Future reviewer passes: confirm reachability, not just compilation.

**Addendum (Phase 2 Iteration 1 test count note):** Iteration 1 produced 24 it() blocks vs 5 scenarios (sub-assertion splitting). Legitimate style choice. Future iterations: expected test count from prompt is a scenario count, not it() count; engineer discretion on splitting. Review discipline: verify scenarios covered, not it() count match.

**Addendum (Phase 2 Iteration 2 — per-prompt note):** LD surface implementation + schema widening (Option A). types.ts: longestDriveWinner → longestDriveWinners: PlayerId[]. events.ts: JunkAwarded.winner + LongestDriveWinnerSelected.winner → winners: PlayerId[]. junk.ts: isLongestDrive implemented, pushAward multi-winner aware, settleJunkHole LD bookkeeping + fan-out. Six fixture files updated (mechanical rename). §12 Tests 1–5 all pass. 273 tests. Schema decision process: Option A (plural winners uniform) selected after two researcher micro-passes and three intermediate schema deliberations (Options 1-5). Key rule: §9 "fires once per hole" kills Option 5; §6 cardinality (one JunkAwarded per bet × kind × hole) kills Option B. No carry-forward items — Phase 2 AC met.
