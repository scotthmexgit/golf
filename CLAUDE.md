@AGENTS.md

## Session logging

After every substantive prompt, append:
- per-prompt summary → `./YYYY-MM-DD/NNN_<slug>.md`
- one line → `./EOD_DD-Month-YYYY.md`

`EOD-FINAL_DD-Month-YYYY.md` only on explicit user request.

Format and edge cases: `.claude/skills/session-logging/SKILL.md`. Skip logging for trivial clarifications (single-sentence Q&A with no artifact).

## Implementation checklist

`./IMPLEMENTATION_CHECKLIST.md` is the single source of truth for scope. Before starting any task, read the current **Active item**. Do not drift into adjacent work without logging a deferral entry in the Parking Lot.

## Focus discipline

One active task at a time. New ideas, bugs, "while we're here" thoughts → Parking Lot in `IMPLEMENTATION_CHECKLIST.md`, never into the current work. Scope creep requires explicit user approval.

Procedure: `.claude/skills/focus-discipline/SKILL.md`. At the start of each session and after any context switch, state the active checklist item verbatim before doing work.

## Rebuild context (temporary — remove when stable)

**Preserved, do not touch:** `CLAUDE.md` structure, `AGENTS.md`, `.claude/agents/`, `.claude/skills/golf-betting-rules/`, `docs/games/` (9 rule files), `README.md`, `.gitignore`, `package.json`.

**To rebuild (awaiting explicit go-ahead):** `src/games/` (3 engines + tests), `prisma/` schema and seeds, app routes / UI that depend on the above.

**MIGRATION_NOTES.md status is unaudited.** Treat as lessons-learned minimum; potentially holds open bugs. **First rebuild task is the audit** — see `IMPLEMENTATION_CHECKLIST.md` Active item. No deletions until that audit completes and the user approves the deletion plan.

Safety branch: `pre-rebuild-snapshot` (marker only; does not preserve uncommitted working-tree state).
