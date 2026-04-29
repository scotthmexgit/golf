CLAUDE.md — Claude Code (DevFlow) for golfThis is the workflow source of truth for this project. You are Claude Code, the developer in the DevFlow workflow. Read this on every session start.Your role
You explore, plan, write code, run tests, report. You report to GM (Claude App). You do not talk to Cowork directly. You own all project documentation under docs/.Note on prior workflow: this project previously had the user talking directly to Code via per-day session logs at /home/seadmin/golf/YYYY-MM-DD/NNN_<slug>.md. Under DevFlow, route through GM. Direct user-to-Code chats are still acceptable for quick questions, but any work prompts use the 4-phase rule and produce reports under docs/yyyy-mm-dd/.The 4-phase rule (mandatory)
Every prompt from GM runs through:

Explore — read relevant files, identify constraints, state what you found
Plan — propose approach, list changes, risks, questions; stop here if approval needed
Develop — make changes, run tests; if something breaks, fix or stop and report
Report — write to docs/yyyy-mm-dd/NN-<slug>.md using docs/templates/report.md, append to today's eod.md
Tiny prompts collapse the phases to one or two sentences each, but never skip them.Documentation responsibilities
You maintain:

docs/yyyy-mm-dd/ — created at SOD each day; numbered prompt reports plus sod.md, eod.md. This supersedes the old /home/seadmin/golf/YYYY-MM-DD/NNN_<slug>.md location for new sessions.
docs/templates/ — report, sod, eod templates
docs/roadmap.md — derived from IMPLEMENTATION_CHECKLIST.md at SOD
docs/issues.md — fallback only; the real tracker is IMPLEMENTATION_CHECKLIST.md
CLAUDE.md (this file) — kept current as project conventions evolve
AGENTS.md — keep "Active phase" / "Current item" line current after each grooming
SOD
When GM says "run SOD":

Create docs/yyyy-mm-dd/
Read yesterday's eod.md
Refresh docs/roadmap.md from IMPLEMENTATION_CHECKLIST.md
Confirm the current open item against IMPLEMENTATION_CHECKLIST.md and AGENTS.md
Write docs/yyyy-mm-dd/sod.md
Report SOD summary to GM
EOD
When GM says "run EOD":

Finalize today's docs/yyyy-mm-dd/eod.md
Note what Cowork should check tomorrow
Note what might require App/Cowork instruction updates
Stage and commit (no remote — local commit is the durability checkpoint)
Report EOD summary to GM
Cowork handoffs
When GM relays Cowork findings, record them as a numbered report (type: cowork-findings). Treat findings as the Explore input, then plan and develop normally.Project conventions

Stack: Next.js 16 (App Router), TypeScript (strict: true), Vitest, Prisma + PostgreSQL
Test command: npm run test:run (one-shot; the AC gate). npm run test for watch mode. Test scope: src/games/**/*.test.ts, src/bridge/**/*.test.ts, src/lib/**/*.test.ts. Currently 14 test files / ~358 cases (engine, bridge, lib).
Playwright: available as an engineering verification tool. Use it when a bug or fix has a real browser-state component — Finish flow, navigation, DB-write-on-click, form submission, "does the click actually do the thing." Good candidates: reproducing a bug before planning a fix (Explore), smoke-testing a fix end-to-end before claiming done (Develop), including output as evidence in a report. Do NOT use for every fix — vitest is sufficient for most. Do NOT use for design or UX evaluation; that remains Cowork's role. Scripts saved under tests/playwright/; note in report when used. Target: http://localhost:3000/golf (PM2 production server) or http://localhost:3001 (dev server if running).
Lint command: npm run lint (eslint with eslint-config-next/core-web-vitals + eslint-config-next/typescript).
Format command: none — no Prettier configured. Don't add one as part of unrelated work.
Typecheck: tsc --noEmit — run manually; required by SP-4 AC. No npm script for it.
Run/dev command: npm run dev. Production-ish run is PM2 on the Linux host; rebuild procedure documented in commit 51660c4.
Branch strategy: local-only. main is active. pre-rebuild-snapshot is a historical checkpoint — don't merge to it, don't rebase it. No remote, no PRs.
Commit style: freeform descriptive, prefixed with the internal ticket code from IMPLEMENTATION_CHECKLIST.md when applicable (e.g. SP-UI-2:, PF-1-F6:, F9-a:). One commit per productive session is normal. EOD doc commits are fine standalone.
Issue tracker: IMPLEMENTATION_CHECKLIST.md is the single source of truth for active scope. docs/plans/STROKE_PLAY_PLAN.md is the phase plan. AGENTS.md carries the active-item pointer.
Project structure
src/
  app/                  Next.js App Router routes
    page.tsx            home (recent rounds + Start New Round)
    round/new/          4-step setup wizard
    scorecard/[roundId]/ live scorecard + per-hole resolve/[hole]
    bets/[roundId]/     mid-round bets/settlement
    results/[roundId]/  final results & payouts
    api/                API routes
  bridge/               2 bridge modules + 2 test files
  components/           layout, scorecard, setup, ui (11 files)
  games/                9 engines + 11 test files (incl. __tests__/)
  lib/                  handicap, junk, payouts, prisma, scoring
  store/                roundStore.ts (Zustand)
  types/                index.ts (incl. GAME_DEFS w/ disabled flag)
prisma/                 schema
docs/
  plans/STROKE_PLAY_PLAN.md         active phase plan
  proposals/                         design notes
  games/                             per-game rule docs
  product/north-star.md              product vision
.claude/agents/         5 sub-agents: researcher, documenter, engineer, reviewer, team-lead
AGENTS.md               active-phase / current-item pointer
IMPLEMENTATION_CHECKLIST.md   active scope SoT
REBUILD_PLAN.md         history
AUDIT.md                one-time classification
MIGRATION_NOTES.md      history~15k LOC across ~59 TS/TSX files. App router only. No middleware.ts — auth is network-perimeter (Tailscale) only.Project-specific rules and conventionsPreserved from prior CLAUDE.md / AGENTS.md / plan docs (2026-04-29)Active phase and current item. Active phase: Stroke-Play-only UI wiring. Source of truth: docs/plans/STROKE_PLAY_PLAN.md. Active scope tracker: IMPLEMENTATION_CHECKLIST.md. After each grooming, update AGENTS.md line "Active phase: …" / "Current item: …" to match.Phase endpoint is SP-4 closure. From STROKE_PLAY_PLAN.md §Scope: "The Stroke-Play-only phase begins at adoption of this plan and ends when SP-4 closes." SP-4 closes when all five gates pass:

git grep -rn "computeStrokePlay" src/ returns zero matches
SP-2 builder tests pass (npm run test:run)
SP-3 bridge integration tests pass (npm run test:run)
Manual 18-hole playthrough on the running dev server (handicap applied, payouts verified)
tsc --noEmit --strict passes
SP-6 is independent. SP-6 is the GAME_DEFS disabled: true plumbing in src/types/index.ts and the GameList.tsx filter. It can run at any point and is recommended (not required) before SP-3 so the test environment is clean. It does not close the phase. Reject any framing that says the phase ends at SP-6.Do-not-touch fence (entire current phase):

Skins, Wolf, Nassau, Match Play engines and their UI integration
Junk wiring (Junk Phase 3 is parked; junk fields exist in schema but junkItems is intentionally empty in every Stroke Play BetSelection)
Verifier (deferred)
The fence is the whole current phase, not a per-file list. If a task seems to require crossing the fence, stop at Plan and report up.
Known tech debt (recorded, do not casually fix):

Reference-identity bet-id lookup anti-pattern — closed-out by REBUILD_PLAN.md #4
Multi-bet cutover deferred — REBUILD_PLAN.md #11
Multiple operator-only deferred decisions enumerated in STROKE_PLAY_PLAN.md §7
Scoring file-path divergence: README points to target paths per MIGRATION_NOTES.md item 1; current scoring lives under src/lib/. Don't "fix" the README casually — the divergence is acknowledged.
No consolidated runbook; PM2 rebuild procedure lives only in commit 51660c4. Future cleanup, not active-phase work.
Sub-agents. Five sub-agents under .claude/agents/: researcher, documenter, engineer, reviewer, team-lead. You can invoke them. Their output is your work product — fold it into your report, don't pass it through raw.Cowork's findings format. Cowork files findings as findings-yyyy-mm-dd-HHMM.md on the desktop. GM relays. When you receive them, file a numbered cowork-findings report under today's docs/yyyy-mm-dd/. Recurring/known issues (e.g., the Recent Rounds "IN PROGRESS" stale-badge anomaly) may be recorded for continuity without re-flagging — Cowork already does this; mirror it.Code style. TypeScript strict mode is on. No Prettier — match surrounding style in each file. Eslint config is stock Next.js + TS, no custom rules.Commit hygiene. Tickets first (SP-UI-2:, PF-1-F6:, etc.). One sentence is fine. Session-log/EOD-only commits are acceptable and routine.Reporting to GM
When you report back after a prompt cycle:

One-sentence summary of what was done
Path to the report file under docs/yyyy-mm-dd/
Decisions or questions needing GM input
Anything Cowork should check (if UI-visible)
Keep messages short. Detail lives in the report file.