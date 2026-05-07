---
name: session-logging
description: Append a per-prompt summary and a rolling EOD entry after every substantive response. A response is substantive when it touches a file, gathers evidence, reasons about scope or trade-offs, or makes a decision — regardless of whether a checklist item closes. Multi-turn revisions log once per substantive response, not once per thread.
---

# Session logging

## Do this, every substantive response

1. Append to `docs/yyyy-mm-dd/NN-<slug>.md` — per-prompt report (DevFlow path; NN is 2-digit, docs/-relative).
2. Append one line to `docs/yyyy-mm-dd/eod.md` — rolling EOD entry.
3. `docs/yyyy-mm-dd/eod.md` is finalized (not a separate file) when GM runs EOD.

## What counts as "substantive" — log all of these

- Any file created, modified, deleted, or renamed.
- Evidence gathered that informs a decision (grep, read, test run, command output cited in the response).
- Reasoning about scope, architecture, trade-offs, sequencing, or risk.
- A decision that affects scope, schedule, backlog, or future work — **including decisions inside an Active item that does not close**.
- Revision of a prior plan or document, even if the plan stays Active.
- Pushback on a prior recommendation with justification.

Multi-turn revisions on the same topic log **once per substantive response**, not once for the whole thread. A `⏸` tag signals "response substantive, Active item still open."

## Skip-logging rule — ALL 4 conditions must hold

Skip only when every condition is true:
- Response is a single clarification question or single-fact answer.
- No file was touched.
- No evidence was gathered.
- No reasoning presented beyond the direct answer.

Example skips:
- "Is the branch called `main` or `master`?" → answer "main" → skip.
- "Did that file have 28 or 29 untracked entries?" → answer "28" → skip.

Example **not** skipped (log even though Active item stays open):
- User pushes back on a recommendation; response gathers evidence + revises the recommendation → log.
- User asks for a plan revision; response applies some edits and pauses others for more input → log.
- User asks a question that triggers re-reading a rule file and citing it → log.

## Paths (DevFlow convention as of 2026-04-30)

- Per-prompt: `docs/yyyy-mm-dd/NN-<slug>.md`
  NN is a zero-padded 2-digit counter starting at `01`, reset daily; `<slug>` is kebab-case, ≤5 words.
- Rolling EOD entry: appended to `docs/yyyy-mm-dd/eod.md`
- EOD finalization: `docs/yyyy-mm-dd/eod.md` is finalized on explicit EOD run (no separate EOD-FINAL file under DevFlow).

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
HH:MM | NN-<slug> | <checklist item # or "parking" or "meta"> | <≤12-word summary> | <tag>
```

Tags: `✓` done, `⏸` partial, `⚠` blocked, `🅿` parking-lot add, `🧭` scope-check triggered.

Example:
```
14:22 | 03-audit-migration-notes | #1 | classified 19 items; 9 closed 5 partial 5 open | ✓
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

- **Midnight rollover**: new `docs/yyyy-mm-dd/` dir, new `eod.md` (in that folder). Do not backfill across days; a task that spans days carries the same checklist item # in both files.
- **Re-running the same prompt**: increment `NN` and add `supersedes: NN` to frontmatter. Do not overwrite.
- **User says "update prior entry"**: edit the existing file in place; append a `## Edit YYYY-MM-DDTHH:MMZ` section describing what changed and why. Do not silently rewrite.
- **Multi-day task**: same `checklist_item_ref` on each day's per-prompt file; EOD-FINAL notes "carried over" in "Checklist items still open".
- **Multiple prompts in rapid succession on the same narrow topic**: each gets its own NNN; do not batch.
