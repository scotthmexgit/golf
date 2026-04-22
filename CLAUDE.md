@AGENTS.md

## Session logging

After every substantive prompt, append:
- per-prompt summary → `/home/seadmin/golf/YYYY-MM-DD/NNN_<slug>.md`
- one line → `/home/seadmin/golf/EOD_DD-Month-YYYY.md`

`EOD-FINAL_DD-Month-YYYY.md` only on explicit user request. Skip logging for trivial clarifications (single-sentence Q&A with no artifact). Format and edge cases: `.claude/skills/session-logging/SKILL.md`.

## Scope and focus

`./IMPLEMENTATION_CHECKLIST.md` is the single source of truth for scope. Before any task, read the current **Active item**. One active task at a time — new ideas, bugs, "while we're here" thoughts go to the Parking Lot, never into current work. Scope creep requires explicit user approval. Procedure: `.claude/skills/focus-discipline/SKILL.md`. At the start of each session and after any context switch, state the active checklist item verbatim before doing work.

## Agent routing

See `AGENTS.md` § User intent → agent routing. Default bias: explore before execute.

## Rebuild context (temporary — remove when rebuild closes)

**Preserved, do not touch:** `AGENTS.md`, `.claude/agents/`, `.claude/skills/golf-betting-rules/`, `docs/games/` (rule files), `README.md`, `.gitignore`, `package.json`.

**Under rebuild:** `src/games/` engines (Nassau in progress; Match Play, Junk pending), `src/lib/*` parallel paths (cutover at REBUILD_PLAN #11), `prisma/` Float→Int (REBUILD_PLAN #10).

**History, not a todo list:** `MIGRATION_NOTES.md` (Rounds 1–5) and `AUDIT.md` (19-item classification). Live scope is `IMPLEMENTATION_CHECKLIST.md` + `REBUILD_PLAN.md`. Do not "fix" MIGRATION_NOTES items directly — route through the checklist.

Safety branch: `pre-rebuild-snapshot` (marker only; does not preserve uncommitted working-tree state).