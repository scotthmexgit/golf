---
name: session-logging
description: Append a per-prompt summary and a rolling EOD entry after every substantive prompt. Trigger whenever a prompt produces a concrete result, decision, code change, or artifact. Skip for trivial clarifications (single-sentence Q&A, no artifact).
---

# Session logging

## Do this, every substantive prompt

1. Append `./YYYY-MM-DD/NNN_<slug>.md` — per-prompt summary.
2. Append one line to `./EOD_DD-Month-YYYY.md` — rolling log.
3. `EOD-FINAL_DD-Month-YYYY.md` is only written when the user explicitly asks for it.

Skip logging if: the prompt was a single clarification question, the response was a single factual lookup with no artifact, no file was touched, and no decision was made.

## Paths (today = 2026-04-20, DD-Month-YYYY = 20-April-2026)

- Per-prompt: `./2026-04-20/003_audit-migration-notes.md`
- Rolling EOD: `./EOD_20-April-2026.md`
- EOD-FINAL (on request): `./EOD-FINAL_20-April-2026.md`

`NNN` is a zero-padded 3-digit counter starting at `001`, reset daily.

## Per-prompt file template

```markdown
---
prompt_id: 003
timestamp: 2026-04-20T14:22:11Z
checklist_item_ref: "Audit MIGRATION_NOTES.md"
tags: [audit, docs]
---

## Prompt
<verbatim or tight paraphrase>

## Action
<what was done, in order>

## Result
- Files touched: `path/to/a`, `path/to/b`
- Worked: <concrete>
- Did not work / blocked: <concrete>

## Open questions
- <one per line>

## Parking lot additions
- <one per line, also appended to IMPLEMENTATION_CHECKLIST.md Parking Lot>
```

## Rolling EOD entry (one line per prompt)

```
HH:MM | NNN_<slug> | <checklist item # or "parking" or "meta"> | <≤12-word summary> | <tag>
```

Tags: `✓` done, `⏸` partial, `⚠` blocked, `🅿` parking-lot add, `🧭` scope-check triggered.

Example:
```
14:22 | 003_audit-migration-notes | #1 | classified 19 items; 9 closed 5 partial 5 open | ✓
```

## EOD-FINAL (on explicit request only)

```markdown
# EOD-FINAL 20-April-2026

## Executive summary (3–5 bullets)
- <outcome-level, not process-level>

## Decisions made
- <decision + rationale + prompt NNN>

## Artifacts produced
- `path` — <one-line purpose>

## Checklist items closed today
- #N — <title> — closed at NNN

## Checklist items still open
- #N — <title> — NNN of last touch

## Parking lot additions today
- <item> — prompt NNN

## Blockers
- <blocker + who/what unblocks>

## Tomorrow's starting item
- #N — <title>. First concrete step: <action>.

## Timeline delta
Ahead / on / behind. If behind: <how much, why>.
```

## Edge cases

- **Midnight rollover**: new `YYYY-MM-DD/` dir, new `EOD_*.md`. Do not backfill across days; a task that spans days carries the same checklist item # in both files.
- **Re-running the same prompt**: increment `NNN` and add `supersedes: NNN` to frontmatter. Do not overwrite.
- **User says "update prior entry"**: edit the existing file in place; append a `## Edit YYYY-MM-DDTHH:MMZ` section describing what changed and why. Do not silently rewrite.
- **Multi-day task**: same `checklist_item_ref` on each day's per-prompt file; EOD-FINAL notes "carried over" in "Checklist items still open".
- **Multiple prompts in rapid succession on the same narrow topic**: each gets its own NNN; do not batch.
