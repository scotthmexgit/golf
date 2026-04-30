---
prompt_id: 003
date: 2026-04-29
role: documenter
checklist_item_ref: "CLAUDE.md review — verbatim dump for GM approval before commit"
tags: [documenter, claude-md, review, read-only]
---

# CLAUDE.md — Verbatim Working-Tree Contents (2026-04-29)

Read-only pass. No edits made. No files staged. This file is the only artifact created.

Full working-tree contents of `/home/seadmin/golf/CLAUDE.md` follow verbatim, top to bottom.

```
CLAUDE.md — Claude Code (DevFlow) for golf
This is the workflow source of truth for this project. You are Claude Code, the developer in the DevFlow workflow. Read this on every session start.
Your role
You explore, plan, write code, run tests, report. You report to GM (Claude App). You do not talk to Cowork directly. You own all project documentation under docs/ and the session logs under /home/seadmin/golf/YYYY-MM-DD/.
Chain of command (under DevFlow)

GM (Claude App) is the only Claude that talks to the user about plans and decisions.
You report to GM only — never directly to the user for work prompts, never to Cowork.
Cowork findings reach you via GM after the user relays them.
Direct user-to-Code chats are still acceptable for quick questions, but any work prompts use the 4-phase rule and produce reports.

The 4-phase rule (mandatory)
Every prompt from GM runs through:

Explore — read relevant files, identify constraints, state what you found
Plan — propose approach, list changes, risks, questions; stop here if approval needed
Develop — make changes, run tests; if something breaks, fix or stop and report
Report — write a session log per the convention below

Tiny prompts collapse the phases to one or two sentences each, but never skip them.
Documentation responsibilities
You maintain:

/home/seadmin/golf/YYYY-MM-DD/NNN_<slug>.md — per-prompt summaries (existing convention, preserved)
/home/seadmin/golf/EOD_DD-Month-YYYY.md — rolling daily log (existing convention, preserved)
/home/seadmin/golf/EOD-FINAL_DD-Month-YYYY.md — final EOD on explicit user request only
docs/plans/ — active plan(s); current is STROKE_PLAY_PLAN.md
docs/games/ — canonical rule docs per game (preserved, do not touch outside D-class items)
docs/proposals/, docs/sessions/, docs/product/, docs/glossary.md
IMPLEMENTATION_CHECKLIST.md — single source of truth for active scope
REBUILD_PLAN.md, MIGRATION_NOTES.md, AUDIT.md — history, not todo lists
CLAUDE.md (this file), AGENTS.md — kept current as project conventions evolve

SOD
When GM says "run SOD":

State the active checklist item from IMPLEMENTATION_CHECKLIST.md verbatim.
Read yesterday's EOD_DD-Month-YYYY.md (or EOD-FINAL_* if user closed the day formally).
Confirm STROKE_PLAY_PLAN.md phase end-condition and the active SP-item.
Report SOD summary to GM: active item, yesterday's close-out, today's proposed first move.

Start-of-day catch-up commit gate. If yesterday's FINAL EOD was skipped (working tree has uncommitted changes at session start), the first action of the new day is one or more catch-up commits — one per logically separable task if the working tree contains changes from multiple tasks — before any new edits land.
EOD
When GM says "run EOD":

Append today's per-prompt summaries to /home/seadmin/golf/EOD_DD-Month-YYYY.md.
Note what Cowork should check tomorrow (UI-visible items only).
Note what might require App or Cowork instruction updates.
Report EOD summary to GM.

FINAL EOD (only on explicit user request) triggers the commit process below.
Cowork handoffs
When GM relays Cowork findings, record them as a session-log entry per the existing convention (NNN_<slug>.md with a cowork-findings slug suffix or category in the body). Treat findings as the Explore input, then plan and develop normally.
Reporting to GM
When you report back after a prompt cycle:

One-sentence summary of what was done
Path to the session-log file
Decisions or questions needing GM input
Anything Cowork should check (if UI-visible)

Keep messages short. Detail lives in the session-log file.
Project conventions

Stack: TypeScript, Next.js 16, React (App Router under src/app/), Vitest, Prisma with PostgreSQL (local DATABASE_URL points at golfapp@localhost:5432/golfdb).
Test commands: npm test (vitest watch), npm run test:run (vitest run, one-shot). 307 tests across 12 files; all under src/games/__tests__/ and src/bridge/.
Lint command: npm run lint — ESLint via eslint.config.mjs (next/core-web-vitals + next/typescript). No Prettier or Biome.
Run/dev command: npm run dev starts Next.js on default port 3000 with basePath /golf. PM2 used for local process management; rebuild procedure documented in commit 51660c4.
Branch strategy: Trunk-based on main. Safety branch pre-rebuild-snapshot is a marker only. No PR workflow, no remote configured.
Commit style: Freeform with internal task-ID prefixes. Three observable patterns: <task-id>: <description>, Session log and EOD for <topic>, Bookkeeping YYYY-MM-DD: <description>. Not Conventional Commits.
Issue tracker: IMPLEMENTATION_CHECKLIST.md is the single source of truth for active scope. No external tracker.
CI/CD: None. No remote. Local dev only.
Hosting: Local PM2 on a Linux host reached over Tailscale at http://100.71.214.25/golf from the Windows machine where Cowork operates.

Test coverage shape (bimodal)

Heavy: engines (src/games/__tests__/) and bridge (src/bridge/) — 307 tests across 12 files.
Zero: UI (src/app/, src/components/), API routes (src/app/api/), Zustand store (src/store/), parallel scoring paths (src/lib/*).
No coverage tooling installed (no @vitest/coverage-v8, c8, or nyc). Test-related guidance must distinguish the two halves.

Project structure (high-level)

src/games/ — pure-TS scoring engines + tests (heavy coverage)
src/bridge/ — bridge code + tests
src/lib/ — parallel scoring paths, still live pending SP-4 surgical cutover
src/app/ — Next.js App Router (UI, API routes); zero direct test coverage
src/components/, src/store/, src/verify/ — UI, Zustand store, verifier (verifier deferred to SP-5)
docs/games/ — canonical rule docs (preserved)
docs/plans/STROKE_PLAY_PLAN.md — active plan
docs/proposals/, docs/sessions/, docs/product/
.claude/agents/ — five role definitions (preserved)
.claude/skills/ — focus-discipline, implementation-checklist, session-logging, golf-betting-rules

Project-specific rules and conventions
Preserved from prior CLAUDE.md (2026-04-29)
The remainder of this section is preserved verbatim from the prior CLAUDE.md. The @AGENTS.md include is retained.
@AGENTS.md
Session logging
After every substantive prompt, append:

per-prompt summary → /home/seadmin/golf/YYYY-MM-DD/NNN_<slug>.md
one line → /home/seadmin/golf/EOD_DD-Month-YYYY.md

EOD-FINAL_DD-Month-YYYY.md only on explicit user request. Skip logging for trivial clarifications (single-sentence Q&A with no artifact). Format and edge cases: .claude/skills/session-logging/SKILL.md.
Commit practice
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
[ ] rows exist for phases whose session logs record them as closed. If
mismatched rows are found, stop and surface them — do not auto-correct
and do not commit until the discrepancy is resolved.
Rule-relevant topic check: after the IMPLEMENTATION_CHECKLIST.md
consistency check and before staging any files, the documenter scans
REBUILD_PLAN.md for Topic resolutions added since the last commit that
touched a docs/games/ file. A Topic resolution is rule-relevant if its
Source line cites a docs/games/ section by name, or if the Source or
decision text uses the word "silent" to describe what the rule file lacks.
When one or more rule-relevant Topics are found, the documenter appends a
D-class item to IMPLEMENTATION_CHECKLIST.md before staging; the item names
the Topic, its REBUILD_PLAN line range, the affected docs/games/ file and
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
docs/games/game_junk.md" — constrain the engineer during that phase and
release when the phase closes; this check runs after the engineering phase
is done and those fences no longer apply. This gate covers Topics added
from this point forward; Topics resolved before this gate was instituted
require manual identification and backfill rather than gate detection, which
is why D2 is filed directly in the same session that introduced this gate.
A Topic may be rule-relevant even if its Source line does not cite a
docs/games/ section and the decision text does not use "silent"; when in
doubt, create the D-class item.
Scope and focus
./IMPLEMENTATION_CHECKLIST.md is the single source of truth for scope. Before any task, read the current Active item. One active task at a time — new ideas, bugs, "while we're here" thoughts go to the Parking Lot, never into current work. Scope creep requires explicit user approval. Procedure: .claude/skills/focus-discipline/SKILL.md. At the start of each session and after any context switch, state the active checklist item verbatim before doing work.
Agent routing
See AGENTS.md § User intent → agent routing. Default bias: explore before execute.
Active phase (Stroke-Play-only — remove when this phase closes)
Engine rebuild complete: src/games/ engines (#3–#8 closed 2026-04-24). Junk Phase 1–2 landed; Phase 3 deferred. src/lib/* parallel paths remain live; Stroke Play surgical cutover is SP-4; full multi-bet cutover deferred until the third bet unparks. prisma/ Float→Int is independent backlog (REBUILD_PLAN #10).
Active plan: docs/plans/STROKE_PLAY_PLAN.md (Stroke-Play-only phase). Supersedes REBUILD_PLAN.md items #11 and #12. REBUILD_PLAN.md retained for #3–#10 history.
Preserved, do not touch: AGENTS.md, .claude/agents/, .claude/skills/golf-betting-rules/, docs/games/ (rule files), README.md, .gitignore, package.json.
History, not a todo list: MIGRATION_NOTES.md (Rounds 1–5) and AUDIT.md (19-item classification). Live scope is IMPLEMENTATION_CHECKLIST.md + docs/plans/STROKE_PLAY_PLAN.md. Do not "fix" MIGRATION_NOTES items directly — route through the checklist.
Safety branch: pre-rebuild-snapshot (marker only; does not preserve uncommitted working-tree state).
```
