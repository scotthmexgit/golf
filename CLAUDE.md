@AGENTS.md

## Session logging

After every substantive prompt, append:
- per-prompt summary → `/home/seadmin/golf/YYYY-MM-DD/NNN_<slug>.md`
- one line → `/home/seadmin/golf/EOD_DD-Month-YYYY.md`

`EOD-FINAL_DD-Month-YYYY.md` only on explicit user request. Skip logging for trivial clarifications (single-sentence Q&A with no artifact). Format and edge cases: `.claude/skills/session-logging/SKILL.md`.

## Commit practice

Commit as part of the FINAL EOD process the user calls. FINAL EOD is the
canonical commit trigger — one commit per productive day covering all
files modified since the prior commit: engines, rule docs,
IMPLEMENTATION_CHECKLIST.md, REBUILD_PLAN.md, session logs, and EOD
entries.

The user may request additional mid-day commits when a phase closes or a
logically separable unit of work completes. These are optional and do not
replace FINAL EOD.

Start-of-day gate: if yesterday's FINAL EOD was skipped (working tree has
uncommitted changes at session start), the first action of the new day
is a catch-up commit before any new edits land.

Pre-commit gate: before staging IMPLEMENTATION_CHECKLIST.md, confirm no
`[ ]` rows exist for phases whose session logs record them as closed. If
mismatched rows are found, stop and surface them — do not auto-correct
and do not commit until the discrepancy is resolved.

## Scope and focus

`./IMPLEMENTATION_CHECKLIST.md` is the single source of truth for scope. Before any task, read the current **Active item**. One active task at a time — new ideas, bugs, "while we're here" thoughts go to the Parking Lot, never into current work. Scope creep requires explicit user approval. Procedure: `.claude/skills/focus-discipline/SKILL.md`. At the start of each session and after any context switch, state the active checklist item verbatim before doing work.

## Agent routing

See `AGENTS.md` § User intent → agent routing. Default bias: explore before execute.

## Rebuild context (temporary — remove when rebuild closes)

**Preserved, do not touch:** `AGENTS.md`, `.claude/agents/`, `.claude/skills/golf-betting-rules/`, `docs/games/` (rule files), `README.md`, `.gitignore`, `package.json`.

**Under rebuild:** `src/games/` engines (Nassau in progress; Match Play, Junk pending), `src/lib/*` parallel paths (cutover at REBUILD_PLAN #11), `prisma/` Float→Int (REBUILD_PLAN #10).

**History, not a todo list:** `MIGRATION_NOTES.md` (Rounds 1–5) and `AUDIT.md` (19-item classification). Live scope is `IMPLEMENTATION_CHECKLIST.md` + `REBUILD_PLAN.md`. Do not "fix" MIGRATION_NOTES items directly — route through the checklist.

Safety branch: `pre-rebuild-snapshot` (marker only; does not preserve uncommitted working-tree state).