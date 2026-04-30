---
prompt_id: 004
date: 2026-04-29
role: documenter
checklist_item_ref: "CLAUDE.md edits — test count, active phase note, SOD/EOD ownership clarification"
tags: [documenter, claude-md, edits, pending-gm-approval]
---

# CLAUDE.md Edits — 2026-04-29

Fence: CLAUDE.md only. No other files touched. CLAUDE.md is NOT staged. Awaiting GM approval before commit.

Baseline: `2026-04-29/003_claude_md_review.md` (verbatim working-tree contents at the start of this pass).

---

## 1. Edits Made

### Edit 1 — Test count correction (two occurrences, `replace_all`)

**String replaced:** `307 tests across 12 files`  
**Replacement:** `348 tests across 12 files`  
**Occurrences:** 2 — once in the "Test commands" line of Project conventions, once in the "Test coverage shape (bimodal)" paragraph.  
**Verification:** `npm run test:run` output: `Tests  348 passed (348)` / `Test Files  12 passed (12)`. Count confirmed before edit.

### Edit 2 — Active phase note rewrite

**Section:** `Active phase (Stroke-Play-only — remove when this phase closes)` paragraph, preserved-section portion of CLAUDE.md.

**Old (two-sentence engine + plan block):**
```
Engine rebuild complete: src/games/ engines (#3–#8 closed 2026-04-24). Junk Phase 1–2 landed; Phase 3 deferred. src/lib/* parallel paths remain live; Stroke Play surgical cutover is SP-4; full multi-bet cutover deferred until the third bet unparks. prisma/ Float→Int is independent backlog (REBUILD_PLAN #10).
Active plan: docs/plans/STROKE_PLAY_PLAN.md (Stroke-Play-only phase). Supersedes REBUILD_PLAN.md items #11 and #12. REBUILD_PLAN.md retained for #3–#10 history.
```

**New:**
```
Engine rebuild complete: src/games/ engines (#3–#8 closed 2026-04-24). Junk Phase 1–2 landed; Phase 3 deferred. prisma/ Float→Int closed 2026-04-26 (REBUILD_PLAN #10). Stroke-Play-only phase: SP-1–SP-4 and SP-6 closed 2026-04-25; SP-5 (verifier) deferred post-SP-4; SP-UI-1/2/3 fence fixes and PF-2 code items (PF-1-F3/F4/F5A/F6) closed 2026-04-27. SP-4 §4 manual browser playthrough is the sole open phase-end gate. Parked bets (Skins, Match Play, Wolf, Nassau) are UI-hidden via GAME_DEFS disabled flag; engines remain on disk unchanged. src/lib/* parallel paths remain live; full multi-bet cutover deferred until the third bet unparks.
Active plan: docs/plans/STROKE_PLAY_PLAN.md (Stroke-Play-only phase). Current active item in IMPLEMENTATION_CHECKLIST.md. REBUILD_PLAN.md retained for #3–#10 history.
```

Unchanged: `Preserved, do not touch`, `History, not a todo list`, and `Safety branch` lines.

### Edit 3 — SOD ownership sentence

Added as first item in the SOD procedure list, immediately after the blank line following "When GM says "run SOD":":

```
GM owns the planning loop; SOD is a context-pull and summary report to GM, not an autonomous planning step.
```

### Edit 4 — EOD ownership sentence

Added as first item in the EOD procedure list, immediately after the blank line following "When GM says "run EOD":":

```
GM owns the planning loop; EOD is a summary report to GM, not an autonomous wrap-up step.
```

---

## 2. Full diff (`git diff CLAUDE.md`)

Note: the diff shows the full working-tree delta vs HEAD (commit 51660c4). The working-tree CLAUDE.md was already ahead of HEAD with the DevFlow rewrite before this pass. The four targeted edits of this pass are embedded within the larger delta and are called out in context below.

```diff
diff --git a/CLAUDE.md b/CLAUDE.md
index 8098edb..b69d385 100644
--- a/CLAUDE.md
+++ b/CLAUDE.md
@@ -1,45 +1,136 @@
+CLAUDE.md — Claude Code (DevFlow) for golf
+This is the workflow source of truth for this project. You are Claude Code, the developer in the DevFlow workflow. Read this on every session start.
+Your role
+You explore, plan, write code, run tests, report. You report to GM (Claude App). You do not talk to Cowork directly. You own all project documentation under docs/ and the session logs under /home/seadmin/golf/YYYY-MM-DD/.
+Chain of command (under DevFlow)
+
+GM (Claude App) is the only Claude that talks to the user about plans and decisions.
+You report to GM only — never directly to the user for work prompts, never to Cowork.
+Cowork findings reach you via GM after the user relays them.
+Direct user-to-Code chats are still acceptable for quick questions, but any work prompts use the 4-phase rule and produce reports.
+
+The 4-phase rule (mandatory)
+Every prompt from GM runs through:
+
+Explore — read relevant files, identify constraints, state what you found
+Plan — propose approach, list changes, risks, questions; stop here if approval needed
+Develop — make changes, run tests; if something breaks, fix or stop and report
+Report — write a session log per the convention below
+
+Tiny prompts collapse the phases to one or two sentences each, but never skip them.
+Documentation responsibilities
+You maintain:
+
+/home/seadmin/golf/YYYY-MM-DD/NNN_<slug>.md — per-prompt summaries (existing convention, preserved)
+/home/seadmin/golf/EOD_DD-Month-YYYY.md — rolling daily log (existing convention, preserved)
+/home/seadmin/golf/EOD-FINAL_DD-Month-YYYY.md — final EOD on explicit user request only
+docs/plans/ — active plan(s); current is STROKE_PLAY_PLAN.md
+docs/games/ — canonical rule docs per game (preserved, do not touch outside D-class items)
+docs/proposals/, docs/sessions/, docs/product/, docs/glossary.md
+IMPLEMENTATION_CHECKLIST.md — single source of truth for active scope
+REBUILD_PLAN.md, MIGRATION_NOTES.md, AUDIT.md — history, not todo lists
+CLAUDE.md (this file), AGENTS.md — kept current as project conventions evolve
+
+SOD
+When GM says "run SOD":
+
+GM owns the planning loop; SOD is a context-pull and summary report to GM, not an autonomous planning step.   ← EDIT 3
+State the active checklist item from IMPLEMENTATION_CHECKLIST.md verbatim.
+Read yesterday's EOD_DD-Month-YYYY.md (or EOD-FINAL_* if user closed the day formally).
+Confirm STROKE_PLAY_PLAN.md phase end-condition and the active SP-item.
+Report SOD summary to GM: active item, yesterday's close-out, today's proposed first move.
+
+Start-of-day catch-up commit gate. If yesterday's FINAL EOD was skipped (working tree has uncommitted changes at session start), the first action of the new day is one or more catch-up commits — one per logically separable task if the working tree contains changes from multiple tasks — before any new edits land.
+EOD
+When GM says "run EOD":
+
+GM owns the planning loop; EOD is a summary report to GM, not an autonomous wrap-up step.    ← EDIT 4
+Append today's per-prompt summaries to /home/seadmin/golf/EOD_DD-Month-YYYY.md.
+Note what Cowork should check tomorrow (UI-visible items only).
+Note what might require App or Cowork instruction updates.
+Report EOD summary to GM.
+
+FINAL EOD (only on explicit user request) triggers the commit process below.
+Cowork handoffs
+When GM relays Cowork findings, record them as a session-log entry per the existing convention (NNN_<slug>.md with a cowork-findings slug suffix or category in the body). Treat findings as the Explore input, then plan and develop normally.
+Reporting to GM
+When you report back after a prompt cycle:
+
+One-sentence summary of what was done
+Path to the session-log file
+Decisions or questions needing GM input
+Anything Cowork should check (if UI-visible)
+
+Keep messages short. Detail lives in the session-log file.
+Project conventions
+
+Stack: TypeScript, Next.js 16, React (App Router under src/app/), Vitest, Prisma with PostgreSQL (local DATABASE_URL points at golfapp@localhost:5432/golfdb).
+Test commands: npm test (vitest watch), npm run test:run (vitest run, one-shot). 348 tests across 12 files; all under src/games/__tests__/ and src/bridge/.    ← EDIT 1 (first occurrence)
+Lint command: npm run lint — ESLint via eslint.config.mjs (next/core-web-vitals + next/typescript). No Prettier or Biome.
+Run/dev command: npm run dev starts Next.js on default port 3000 with basePath /golf. PM2 used for local process management; rebuild procedure documented in commit 51660c4.
+Branch strategy: Trunk-based on main. Safety branch pre-rebuild-snapshot is a marker only. No PR workflow, no remote configured.
+Commit style: Freeform with internal task-ID prefixes. Three observable patterns: <task-id>: <description>, Session log and EOD for <topic>, Bookkeeping YYYY-MM-DD: <description>. Not Conventional Commits.
+Issue tracker: IMPLEMENTATION_CHECKLIST.md is the single source of truth for active scope. No external tracker.
+CI/CD: None. No remote. Local dev only.
+Hosting: Local PM2 on a Linux host reached over Tailscale at http://100.71.214.25/golf from the Windows machine where Cowork operates.
+
+Test coverage shape (bimodal)
+
+Heavy: engines (src/games/__tests__/) and bridge (src/bridge/) — 348 tests across 12 files.    ← EDIT 1 (second occurrence)
+Zero: UI (src/app/, src/components/), API routes (src/app/api/), Zustand store (src/store/), parallel scoring paths (src/lib/*).
+No coverage tooling installed (no @vitest/coverage-v8, c8, or nyc). Test-related guidance must distinguish the two halves.
+
+Project structure (high-level)
+
+src/games/ — pure-TS scoring engines + tests (heavy coverage)
+src/bridge/ — bridge code + tests
+src/lib/ — parallel scoring paths, still live pending SP-4 surgical cutover
+src/app/ — Next.js App Router (UI, API routes); zero direct test coverage
+src/components/, src/store/, src/verify/ — UI, Zustand store, verifier (verifier deferred to SP-5)
+docs/games/ — canonical rule docs (preserved)
+docs/plans/STROKE_PLAY_PLAN.md — active plan
+docs/proposals/, docs/sessions/, docs/product/
+.claude/agents/ — five role definitions (preserved)
+.claude/skills/ — focus-discipline, implementation-checklist, session-logging, golf-betting-rules
+
+Project-specific rules and conventions
+Preserved from prior CLAUDE.md (2026-04-29)
+The remainder of this section is preserved verbatim from the prior CLAUDE.md. The @AGENTS.md include is retained.
 @AGENTS.md
-
-## Session logging
-
+Session logging
 After every substantive prompt, append:
-- per-prompt summary → `/home/seadmin/golf/YYYY-MM-DD/NNN_<slug>.md`
-- one line → `/home/seadmin/golf/EOD_DD-Month-YYYY.md`
-
-`EOD-FINAL_DD-Month-YYYY.md` only on explicit user request. Skip logging for trivial clarifications
-(single-sentence Q&A with no artifact). Format and edge cases: `.claude/skills/session-logging/SKILL.md`.
 
-## Commit practice
+per-prompt summary → /home/seadmin/golf/YYYY-MM-DD/NNN_<slug>.md
+one line → /home/seadmin/golf/EOD_DD-Month-YYYY.md
 
+EOD-FINAL_DD-Month-YYYY.md only on explicit user request. Skip logging for trivial clarifications
+(single-sentence Q&A with no artifact). Format and edge cases: .claude/skills/session-logging/SKILL.md.
+Commit practice
 Commit as part of the FINAL EOD process the user calls ...
 [commit-practice block unchanged — full text in diff above]
 
-## Active phase (Stroke-Play-only — remove when this phase closes)
-
-**Engine rebuild complete:** `src/games/` engines (#3–#8 closed 2026-04-24). Junk Phase 1–2 landed;
-Phase 3 deferred. `src/lib/*` parallel paths remain live; Stroke Play surgical cutover is SP-4; full
-multi-bet cutover deferred until the third bet unparks. `prisma/` Float→Int is independent backlog
-(REBUILD_PLAN #10).
-
-**Active plan:** `docs/plans/STROKE_PLAY_PLAN.md` (Stroke-Play-only phase). Supersedes REBUILD_PLAN.md
-items #11 and #12. `REBUILD_PLAN.md` retained for #3–#10 history.
-
+Active phase (Stroke-Play-only — remove when this phase closes)                        ← EDIT 2 START
+Engine rebuild complete: src/games/ engines (#3–#8 closed 2026-04-24). Junk Phase 1–2 landed; Phase 3
+deferred. prisma/ Float→Int closed 2026-04-26 (REBUILD_PLAN #10). Stroke-Play-only phase: SP-1–SP-4 and
+SP-6 closed 2026-04-25; SP-5 (verifier) deferred post-SP-4; SP-UI-1/2/3 fence fixes and PF-2 code items
+(PF-1-F3/F4/F5A/F6) closed 2026-04-27. SP-4 §4 manual browser playthrough is the sole open phase-end gate.
+Parked bets (Skins, Match Play, Wolf, Nassau) are UI-hidden via GAME_DEFS disabled flag; engines remain on
+disk unchanged. src/lib/* parallel paths remain live; full multi-bet cutover deferred until the third bet
+unparks.
+Active plan: docs/plans/STROKE_PLAY_PLAN.md (Stroke-Play-only phase). Current active item in
+IMPLEMENTATION_CHECKLIST.md. REBUILD_PLAN.md retained for #3–#10 history.              ← EDIT 2 END
+Preserved, do not touch: AGENTS.md, .claude/agents/, .claude/skills/golf-betting-rules/,
+docs/games/ (rule files), README.md, .gitignore, package.json.
+History, not a todo list: MIGRATION_NOTES.md (Rounds 1–5) and AUDIT.md (19-item classification).
+Live scope is IMPLEMENTATION_CHECKLIST.md + docs/plans/STROKE_PLAY_PLAN.md. Do not "fix" MIGRATION_NOTES
+items directly — route through the checklist.
+Safety branch: pre-rebuild-snapshot (marker only; does not preserve uncommitted working-tree state).
```

---

## 3. Working tree state post-edit

```
 M CLAUDE.md
?? 2026-04-29/
```

`CLAUDE.md` is modified but not staged. `2026-04-29/` is untracked (contains 001–004 session logs).

---

## 4. Commit plan (pending GM approval)

**File to stage:** `CLAUDE.md` only.

**Proposed commit message:**
```
CLAUDE.md: add DevFlow structure, fix test count, update active phase note, clarify SOD/EOD ownership
```

---

## 5. AGENTS.md flag (unchanged from prior pass)

`AGENTS.md` line 21 still reads "Current item: SP-6 (GAME_DEFS cleanup + GameList filter)." Not touched this pass; still requires operator authorization to edit.

---

## 6. Observations (not actioned — fence)

- **Formatting shift in preserved section:** The working-tree CLAUDE.md (from the DevFlow rewrite) removed markdown `##` heading prefixes and backtick formatting from the preserved section (e.g., `## Commit practice` → `Commit practice`, `` `[ ]` `` → `[ ]`). This is already in the working tree before this pass; not introduced by these edits. The content is identical — only rendering will differ (plain text vs styled headings/code). Flag for GM awareness: if Claude Code reads CLAUDE.md expecting `## Commit practice` as a heading, it will parse it correctly either way since it reads raw text, not rendered markdown. No action needed unless GM prefers to restore the `##` markers.
- **No-newline at end of file:** The diff shows `\ No newline at end of file` on the last line. This was already present in the working tree before this pass.
