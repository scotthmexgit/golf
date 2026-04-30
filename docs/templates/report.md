# Report: <short title>

> **Strict format.** Do not add, remove, or reorder sections. Use "N/A" if a section genuinely doesn't apply. Keep each section terse — bullets, not prose.

## Header
- **Date:** yyyy-mm-dd
- **Number:** NN (sequential within today, zero-padded: 01, 02, ...)
- **Type:** prompt | cowork-findings | audit | adhoc
- **Title slug:** kebab-case, used in filename
- **Linked issues:** [#123, #456] or none
- **Pipeline item:** which today/+1-2/+3-5 item this advances, or "off-pipeline" with reason

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

## 3. Develop
- **Commands run:** verbatim, with exit codes
- **Files changed:** with one-line description per file
- **Test results:** pass/fail counts, or "no tests run because <reason>"
- **Commits:** SHA + message, or "no commits — uncommitted working tree"

## 4. Outcome
- **Status:** complete | partial | blocked | abandoned
- **Summary:** one sentence — what was achieved
- **For GM:** any decision needed, or "none"
- **For Cowork to verify:** specific things to check, or "no UI impact"
- **Follow-ups created:** new issues filed, pipeline items added, deferred work tracked

---

## Notes for type: cowork-findings

When this report records Cowork's UI findings (relayed by GM), use this section mapping:

- **Explore** = the findings GM relayed (paste verbatim)
- **Plan** = proposed fix or response
- **Develop** = the fix itself
- **Outcome** = result + whether Cowork should re-verify

Everything else (Header, Scope boundaries, format) stays the same.
