---
prompt_id: 055
timestamp: 2026-04-22T01:26:17Z
checklist_item_ref: "meta — skill maintenance"
tags: [meta, skill, focus-discipline, commit-split-discipline]
---

## Prompt
Correct memory wording and apply approved commit-split discipline rule verbatim to
.claude/skills/focus-discipline/SKILL.md. Append retroactive-cost sentence. Show diff
and session-log draft before committing; stop for confirmation.

## Action
- Read focus-discipline/SKILL.md (53 lines, existing sections: Trigger, Parking Lot rules,
  Scope-creep signals, Re-focus protocol, What this skill does NOT do)
- Appended new section "## Commit-split discipline" after final existing section
- Content: approved verbatim rule (3-step procedure + applicability clause) plus
  retroactive-cost sentence as plain paragraph (not blockquoted, per SKILL.md style)
- git diff produced; verbatim verification table produced
- File written; commit withheld pending user confirmation

## Result
- .claude/skills/focus-discipline/SKILL.md: +21 lines, 1 new section
- No other files touched
- Commit F: 107ea79

## Open questions
- None.

## Parking lot additions
- None.
