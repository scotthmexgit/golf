@AGENTS.md

## Session logging

After every substantive prompt, append:
- per-prompt summary → `/home/seadmin/golf/YYYY-MM-DD/NNN_<slug>.md`
- one line → `/home/seadmin/golf/EOD_DD-Month-YYYY.md`

`EOD-FINAL_DD-Month-YYYY.md` only on explicit user request.

Format and edge cases: `.claude/skills/session-logging/SKILL.md`. Skip logging for trivial clarifications (single-sentence Q&A with no artifact).

## Implementation checklist

`./IMPLEMENTATION_CHECKLIST.md` is the single source of truth for scope. Before starting any task, read the current **Active item**. Do not drift into adjacent work without logging a deferral entry in the Parking Lot.

## Focus discipline

One active task at a time. New ideas, bugs, "while we're here" thoughts → Parking Lot in `IMPLEMENTATION_CHECKLIST.md`, never into the current work. Scope creep requires explicit user approval.

Procedure: `.claude/skills/focus-discipline/SKILL.md`. At the start of each session and after any context switch, state the active checklist item verbatim before doing work.

## Agent routing

Five agents in `.claude/agents/`; underused by default.

- **researcher** — codebase/doc/rule-file surveys, consumer mapping, pre-loop explore passes, doc-to-code reconciliation. Any task that starts with a question.
- **documenter** — `docs/games/`, `CLAUDE.md` sections, session logs, plan revisions, extracting rules into canonical form.
- **engineer** — code changes, test writing, refactors. Default for execution turns in a loop.
- **reviewer** — post-execution check before the user sees the work. Intermediate gate in multi-step loops, not a replacement for user review.
- **team-lead** — only for prompts spanning multiple agents where sequencing is the hard part. Do not suggest for single-agent work.

Default bias: explore before execute. If a prompt goes straight to engineer when a researcher or documenter pass would surface blockers first, flag it. Suggest agent routing when the task fits; don't force an agent onto trivial edits, follow-ups inside an active loop, or single-file fixes.

## Rebuild context (temporary — remove when stable)

**Preserved, do not touch:** `CLAUDE.md` structure, `AGENTS.md`, `.claude/agents/`, `.claude/skills/golf-betting-rules/`, `docs/games/` (9 rule files), `README.md`, `.gitignore`, `package.json`.

**To rebuild (awaiting explicit go-ahead):** `src/games/` (3 engines + tests), `prisma/` schema and seeds, app routes / UI that depend on the above.

**MIGRATION_NOTES.md status is unaudited.** Treat as lessons-learned minimum; potentially holds open bugs. **First rebuild task is the audit** — see `IMPLEMENTATION_CHECKLIST.md` Active item. No deletions until that audit completes and the user approves the deletion plan.

Safety branch: `pre-rebuild-snapshot` (marker only; does not preserve uncommitted working-tree state).
