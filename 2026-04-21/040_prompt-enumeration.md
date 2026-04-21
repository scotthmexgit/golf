# Prompt enumeration — 2026-04-21 back-logging plan

Total user prompts this session: **24**
All 24 are loggable — none qualify for skip (4-condition rule never fully satisfied).

Note: timestamps not recoverable for back-logged entries; frontmatter timestamp
will use approximate wall-clock time based on git commit timestamps as anchors.

## Ambiguities flagged

- **Prompts 16 and 17 are duplicates.** The user re-sent the "Message approved,
  proceed to Step C" message because the Step C output got eaten by the rendering
  layer. Per skill edge case "Re-running the same prompt": prompt 017 gets
  `supersedes: 016` in its frontmatter. Two separate entries, two separate NNNs.

- **All single-word/short approvals** ("proceed", "Acknowledged. Step C is
  complete...") are loggable because my responses were substantive (files touched,
  commands run). Skip rule requires ALL 4 conditions; condition 1 ("single
  clarification or single-fact answer") does not describe approvals.

---

## Prompt → slug mapping

| NNN | User prompt summary                                        | Proposed slug                   | Skip? |
|-----|------------------------------------------------------------|---------------------------------|-------|
| 001 | Re-prime + confirm 6 re-prime points + parking-lot format proposal | `reprime-parkingleaf-format` | no |
| 002 | Format approved; line numbers ask; proceed to file 7/7 under gate | `parkingleaf-linenums-file7` | no |
| 003 | Math correction on 17/19 vs 18/20; approved git apply --cached | `types-hunk3-approved`        | no |
| 004 | File 7/7 verification clean; re-order post-7 sequence; step 1 only | `commit3-reorder-step1`      | no |
| 005 | Aggregate review clean; proceed to step 2 (commit message draft) | `commit3-message-draft`       | no |
| 006 | Drop final sentence (forward reference to future engines)  | `commit3-msg-revision`          | no |
| 007 | Read tool collapsed; re-surface via bash cat               | `commit3-msg-recat`             | no |
| 008 | "proceed" (approve stash-test-commit-pop-parking-lot sequence) | `commit3-stash-commit`      | no |
| 009 | Stop — state surfacing failure; demand diagnostic reconstruction | `commit3-diagnostic`         | no |
| 010 | State confirmed clean; commit 4 defensive-surfacing mandate + classification | `commit4-preconditions` | no |
| 011 | Classification approved; file 1/3 (types.ts) workflow      | `commit4-f1-types`              | no |
| 012 | File 1/3 clean; file 2/3 (nassau.ts) workflow              | `commit4-f2-nassau`             | no |
| 013 | File 2/3 clean; file 3/3 (nassau.test.ts) workflow         | `commit4-f3-nassautest`         | no |
| 014 | File 3/3 clean; approve post-3-files sequence (lighter review) | `commit4-aggregate`          | no |
| 015 | Step A clean; file-order correction noted; approve Step B  | `commit4-message-draft`         | no |
| 016 | Message approved (FIRST SEND); proceed to Step C           | `commit4-stash-gate`            | no |
| 017 | Message approved (SECOND SEND = DUPLICATE); same text      | `commit4-stash-gate-dupe`       | no — supersedes: 016 |
| 018 | Acknowledged Step C already ran; proceed to Step D         | `commit4-commit`                | no |
| 019 | Commit 4 clean; approve Step F with stash-pop complication | `commit4-stash-pop`             | no |
| 020 | Step F clean; proceed to Step G (session-artifact commit)  | `commit4-stepg-artifact`        | no |
| 021 | Session-artifact message truncated; re-surface via bash    | `artifact-msg-recat`            | no |
| 022 | Two things: message revision (closing paragraph) + stress-test plan | `artifact-stresstest-plan` | no |
| 023 | Priority decision (a): Phase 2 Turn 2 stays; approve Step G-E | `artifact-commit-ge`         | no |
| 024 | Step G clean; back-logging task planning (current prompt)  | `backlog-enumeration`           | no |
