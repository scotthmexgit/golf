<!-- DEVFLOW GENERATED FILE
     DevFlow version: 1.0
     Generated at: 2026-05-06 13:23
     Template source: devflow-runtime-templates.md (REPORT_TEMPLATE)
     Refresh: re-running HUB on this project regenerates these templates.
-->
# Report: <short title>

> **Strict format.** Do not add, remove, or reorder sections. Use "N/A" if a section genuinely doesn't apply. Keep each section terse — bullets, not prose.

## Header
- **Date:** yyyy-mm-dd
- **Number:** NN (sequential within today across all sessions of the calendar date, zero-padded: 01, 02, ...)
- **Type:** prompt | cowork-findings | external-review | audit | adhoc
- **Title slug:** kebab-case, used in filename
- **Linked issues:** [#123, #456] or none
- **Pipeline item:** which today/+1-2/+3-5 item this advances, or "off-pipeline" with reason
- **Session:** N (which session of the day this report belongs to)
- **Verification mode (set by GM):** Codex-verified | Standard | Codex-only check
- **Mode at completion:** Codex-verified-cleared | Standard-pending-GM | escalated-to-Standard (with reason if escalated)
- **Loop mode (set by GM):** none | safe — `<pattern>[, max=N]`
- **Loop mode at completion:** none | success in N iterations | cap-hit | scope-expansion | gate-trip | aborted-by-checkpoint

## Prompt (verbatim)
Paste the GM prompt that triggered this report, exactly as received.

<paste GM prompt here>

## Scope boundaries
- **In scope:** bullet list of what this report's work covers
- **Out of scope:** bullet list of explicitly excluded things noticed during work
- **Deferred:** items noticed but pushed to a follow-up — must include a note about how they'll be tracked (issue ID, pipeline item, or docs/issues.md entry)

## 1. Explore
What was read or inspected. Findings only — no opinions yet.
- Files read: ...
- Findings: ...
- Constraints discovered: ...

## 2. Plan
- **Approach:** one or two sentences
- **Files to change:** list with brief reason for each
- **Files to create:** list with brief reason for each
- **Risks:** list, or "none identified"
- **Open questions for GM:** list, or "none"
- **Approval gate:** [auto-proceed / waited for GM / GM approved with note: ...]

Stop after Plan and report back to GM if any of these apply: new dependency, refactor across 3+ files, schema change, public API change, security-sensitive change, deletion of code older than 30 days. Otherwise auto-proceed.

## 3. Codex pre-review (plan-level)
Run before Develop. Reads the plan as text.
- **Command run:** `/codex:adversarial-review` with plan as focus text
- **Findings count:** N
- **In scope, addressed via plan revision:** list with one-liner per change
- **Out of scope, deferred:** list with tracking refs
- **Declined:** list with brief reasoning per item
- **Codex session ID:** for resume if needed
- Or: "clean — no findings"

## 4. Codex pre-review (diff-level)
Required when prompt hits an approval gate (new dep, refactor 3+ files, schema, public API, security, deletion of old code). Otherwise: "skipped — not high-stakes."
- **Command run:** `/codex:adversarial-review` against uncommitted diff
- **Findings count:** N
- **In scope, addressed:** list with one-liner per fix
- **Out of scope, deferred:** list with tracking refs
- **Declined:** list with brief reasoning per item
- **Codex session ID:** for resume if needed
- Or: "clean — no findings" / "skipped — not high-stakes"

## 5. Develop
- **Commands run:** verbatim, with exit codes
- **Files changed:** with one-line description per file
- **Test results:** pass/fail counts, or "no tests run because <reason>"
- **Browser check:** "N/A — no UI" / "headless smoke OK, screenshot at /tmp/devflow-<slug>-after.png" / "Playwright tests/e2e/<file> passed" / "skipped — informational prompt"
- **Commits:** SHA + message, or "no commits — uncommitted working tree"
- **Loop iteration log:** if Loop mode was active, include a chronological log here. One line per iteration:
```
  #1  | hh:mm:ss | fix: <one-line summary> | result: pass / fail / scope-expansion / gate-trip
  #2  | hh:mm:ss | fix: <one-line summary> | result: ...
  #3  | hh:mm:ss | fix: <one-line summary> | result: ... | [Codex checkpoint: clean / N findings / fixes applied: M]
  ...
```
  If Loop mode was `none`, omit this bullet.

## 5.5 Loop summary
**Only filled when Loop mode was active. If Loop mode was none, write "N/A — Loop mode not used."**

- **Pattern:** tests-green | lint-clean | codex-clean | rename-sweep | migration-sweep | coverage-gap | custom: `<description>`
- **Success criterion:** the closed-form check that decides "done"
- **Attempt cap:** N (default 5; GM-set value if overridden)
- **Attempts taken:** N
- **Final outcome:** success | cap-hit | scope-expansion | gate-trip | aborted-by-checkpoint
- **Mid-loop Codex checkpoints:** count and brief outcome
- **Items addressed:** count and brief list
- **Out-of-scope items surfaced during the loop:** list with deferral note
- **If outcome was anything but `success`:** explain what stopped the loop and what state the codebase is in

## 6. Codex post-review (final state)
Reads the committed/final state.
- **Command run:** `/codex:adversarial-review`
- **Findings count:** N
- **In scope, addressed:** list with one-liner per fix
- **Out of scope, deferred:** list with tracking refs
- **Declined:** list with brief reasoning per item
- **Codex session ID:** for resume if needed
- Or: "clean — no findings"

## 7. Autonomous fixes audit
For every fix Code applied without GM intervention (across all three Codex phases), record:
- **Finding addressed:** one-line description of what Codex flagged
- **Fix applied:** one line
- **Phase the finding came from:** plan / diff / post
- **High-confidence justification:** show that all five rules were met (in scope / no schema-dep-API-security / unambiguous / small / Code's own high confidence)

If no autonomous fixes were made, write "None."

## 8. Outcome
- **Status:** complete | partial | blocked | abandoned
- **Summary:** one sentence — what was achieved
- **For GM:** any decision needed, or "none — Codex-verified self-cleared"
- **For Cowork to verify:** specific things to check, or "no UI impact"
- **Follow-ups created:** new issues filed, pipeline items added, deferred work tracked
- **Mode at completion (repeat from header):** Codex-verified-cleared | Standard-pending-GM | escalated-to-Standard

---

## Notes for type: cowork-findings

When this report records Cowork's UI findings (relayed by GM), use this section mapping. The three Codex review phases (sections 3, 4, 6) only run if a fix is applied; if the report is purely a record of findings with no code changes, write "N/A — no code changes in this report" in those sections.

- **Explore (1)** = the findings GM relayed (paste verbatim)
- **Plan (2)** = proposed fix or response
- **Codex pre-review (3, 4)** = run only if fix applied; otherwise "N/A — no code changes"
- **Develop (5)** = the fix itself, or "no code changes — recorded for tracking only"
- **Codex post-review (6)** = run only if fix applied
- **Autonomous fixes (7)** = list any, or "None"
- **Outcome (8)** = result + whether Cowork should re-verify

Everything else (Header, Scope boundaries, format) stays the same.

## Notes for type: external-review

When this report records substantial external review findings, use this section mapping:

- **Prompt** = the review command run, with flags and any focus text
- **Explore (1)** = the findings Codex returned, paste verbatim or summarize if very long
- **Plan (2)** = triage of findings — which are in scope to address now, which are deferred, which are dismissed (with reason)
- **Codex pre-review (3, 4)** = "N/A — this report IS the review"
- **Develop (5)** = any fixes applied immediately, or "none — all findings deferred or dismissed"
- **Codex post-review (6)** = run only if fixes applied; otherwise "N/A"
- **Autonomous fixes (7)** = list any, or "None"
- **Outcome (8)** = summary plus list of follow-up issues or pipeline items created
