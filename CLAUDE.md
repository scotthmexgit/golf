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
is one or more catch-up commits — one per logically separable task if
the working tree contains changes from multiple tasks — before any new
edits land.

Pre-commit gate: before staging IMPLEMENTATION_CHECKLIST.md, confirm no
`[ ]` rows exist for phases whose session logs record them as closed. If
mismatched rows are found, stop and surface them — do not auto-correct
and do not commit until the discrepancy is resolved.

Rule-relevant topic check: after the IMPLEMENTATION_CHECKLIST.md
consistency check and before staging any files, the documenter scans
REBUILD_PLAN.md for Topic resolutions added since the last commit that
touched a `docs/games/` file. A Topic resolution is rule-relevant if its
Source line cites a `docs/games/` section by name, or if the Source or
decision text uses the word "silent" to describe what the rule file lacks.
When one or more rule-relevant Topics are found, the documenter appends a
D-class item to IMPLEMENTATION_CHECKLIST.md before staging; the item names
the Topic, its REBUILD_PLAN line range, the affected `docs/games/` file and
section, and a treatment hint — annotate-in-place when existing rule-file
text is being superseded, or additive fill when the rule file is silent on
the topic. A rule-relevant Topic is back-propagation-eligible only if the
corresponding code path implements the decision; Topics that appear in a
REBUILD_PLAN.md deferred-items section or whose implementation is a known
stub or absent reducer path are not yet eligible. The documenter verifies
implementation at Stage 1 of any back-propagation execution before
producing the rule-doc edit; if implementation is absent, the D-class item
is closed as premature and a forward-looking parking-lot entry is filed in
its place. D-class items created by this check are deferred documenter
tasks; they do not gate the FINAL EOD commit itself. Per-phase fence
sentences in REBUILD_PLAN.md engineering ACs — such as "No changes to
`docs/games/game_junk.md`" — constrain the engineer during that phase and
release when the phase closes; this check runs after the engineering phase
is done and those fences no longer apply. This gate covers Topics added
from this point forward; Topics resolved before this gate was instituted
require manual identification and backfill rather than gate detection, which
is why D2 is filed directly in the same session that introduced this gate.
A Topic may be rule-relevant even if its Source line does not cite a
`docs/games/` section and the decision text does not use "silent"; when in
doubt, create the D-class item.

## Scope and focus

`./IMPLEMENTATION_CHECKLIST.md` is the single source of truth for scope. Before any task, read the current **Active item**. One active task at a time — new ideas, bugs, "while we're here" thoughts go to the Parking Lot, never into current work. Scope creep requires explicit user approval. Procedure: `.claude/skills/focus-discipline/SKILL.md`. At the start of each session and after any context switch, state the active checklist item verbatim before doing work.

## Agent routing

See `AGENTS.md` § User intent → agent routing. Default bias: explore before execute.

## Active phase (Stroke-Play-only — remove when this phase closes)

**Engine rebuild complete:** `src/games/` engines (#3–#8 closed 2026-04-24). Junk Phase 1–2 landed; Phase 3 deferred. `src/lib/*` parallel paths remain live; Stroke Play surgical cutover is SP-4; full multi-bet cutover deferred until the third bet unparks. `prisma/` Float→Int is independent backlog (REBUILD_PLAN #10).

**Active plan:** `docs/plans/STROKE_PLAY_PLAN.md` (Stroke-Play-only phase). Supersedes REBUILD_PLAN.md items #11 and #12. `REBUILD_PLAN.md` retained for #3–#10 history.

**Preserved, do not touch:** `AGENTS.md`, `.claude/agents/`, `.claude/skills/golf-betting-rules/`, `docs/games/` (rule files), `README.md`, `.gitignore`, `package.json`.

**History, not a todo list:** `MIGRATION_NOTES.md` (Rounds 1–5) and `AUDIT.md` (19-item classification). Live scope is `IMPLEMENTATION_CHECKLIST.md` + `docs/plans/STROKE_PLAY_PLAN.md`. Do not "fix" MIGRATION_NOTES items directly — route through the checklist.

Safety branch: `pre-rebuild-snapshot` (marker only; does not preserve uncommitted working-tree state).