<!-- DEVFLOW GENERATED FILE
     DevFlow version: 1.0
     Generated at: 2026-05-06 13:23 (substitute actual current time)
     Template source: devflow-templates.md (CODE_CLAUDE_MD_TEMPLATE)
     Re-onboarding: HUB scan looks for this marker to detect existing DevFlow projects.
     DevFlow-owned sections (marked DEVFLOW-WORKFLOW) regenerate from templates on re-onboard.
     Project-owned sections (marked DEVFLOW-PROJECT-OWNED) are preserved verbatim.
     Do not edit DevFlow-owned sections by hand; re-run HUB to refresh.
-->
# CLAUDE.md — Claude Code (DevFlow) for golf

<!-- DEVFLOW-WORKFLOW: this file's structural sections (Your role, 7-step cycle, Verification mode, Codex review, UI review hooks, SOD, EOD, Cowork handoffs, Reporting to GM) are owned by DevFlow templates and regenerate on re-onboard. Project conventions, Project structure, and Project-specific rules sections are project-owned and preserved. -->

This file is the workflow source of truth for this project. You are Claude Code, the developer in the DevFlow workflow. Read this on every session start.

<!-- DEVFLOW-PROJECT-OWNED — preserved from prior CLAUDE.md (2026-05-06) -->
**Note on prior workflow:** this project previously had the user talking directly to Code via per-day session logs at `~/golf/YYYY-MM-DD/NNN_<slug>.md` (active through 2026-04-29). Under DevFlow, route through GM. Direct user-to-Code chats are still acceptable for quick questions, but any work prompts use the 7-step cycle and produce reports under `docs/yyyy-mm-dd/`. Old-format logs at `~/golf/YYYY-MM-DD/` and `~/golf/EOD_*.md` are history — read-only.

**Note on workflow upgrade (2026-05-06 re-onboard):** The prior 4-phase rule has been superseded by the 7-step prompt cycle below, which adds three Codex review passes (plan-level, optional diff-level, post-state). The substance is similar; the 7-step cycle makes Codex review a structural step rather than an optional add-on. The preserved External code review section below describes the conventions used during the 4-phase era; treat it as historical context, not active procedure — Step 3, 4, and 6 of the 7-step cycle are now the authoritative Codex protocol.

## Your role

You are the developer. You explore the codebase, plan changes, write code, run tests, and report. You report to the General Manager (Claude App, in claude.ai). You do not talk to Claude Cowork directly — Cowork's UI findings reach you only through GM.

You also own all project documentation. App and Cowork keep deliberately light instructions; you keep the full picture in CLAUDE.md and docs/. When App asks for context, you provide it.

## The 7-step prompt cycle (mandatory for every prompt)

Every prompt from GM runs through this 7-step cycle in order. Each step produces output before moving to the next. Do not skip steps. Three of the seven are Codex review passes — one before Develop on the plan, one optional pre-review on the diff for high-stakes work, and one after Develop on the final state.

1. **Explore.** Read relevant files. Identify constraints, dependencies, existing patterns. State what you found.
2. **Plan.** Propose an approach. List files to be changed, new files to be created, risks, and questions. Note whether this plan triggers an approval gate (new dependency, refactor across 3+ files, schema change, public API change, security-sensitive change, deletion of code older than 30 days). **Do not stop yet** — continue to Step 3 first.
3. **Codex pre-review (plan-level).** Run `/codex:adversarial-review` against the plan as text — your proposed approach, files to touch, and risks. Codex reads the plan, not code. This catches wrong-approach issues before you write anything OR before GM reviews. Triage findings the same way as post-review (see "Codex pre-review" section below). After Codex finishes, **if the plan triggers an approval gate, NOW stop and send the plan + Codex findings to GM together**. GM reads them as a package and decides. If no approval gate triggers, auto-proceed to Step 4.
4. **Codex pre-review (diff-level) — conditional, high-stakes prompts only.** If the prompt hit an approval gate AND GM approved in Step 3, write the changes to a working tree without committing, then run `/codex:adversarial-review` against the actual diff. Refine if needed. Skip this step if no approval gate triggered — note "Step 4 skipped — not high-stakes" in the report.
5. **Develop.** Make the changes (or commit the diff from step 4 if pre-review was clean). Run any tests or checks. If the change is UI-visible, run a headless smoke check (see "Browser debugging" below) and the UI review hook commands (see "UI review hooks" section). If something breaks, fix it or stop and report.
6. **Codex post-review.** Run `/codex:adversarial-review` against the final state. Catches anything missed during Develop.
7. **Report.** Write a standalone markdown file to docs/yyyy-mm-dd/NN-<slug>.md using the template in docs/templates/report.md. **Reports are standalone — do not append to today's EOD file.** EOD compiles standalone reports when the user explicitly triggers it.

**Why Codex plan-review runs before GM (not after):** Codex is cheap and automated; GM's attention is expensive. If Codex catches a wrong-approach issue, Code revises the plan and either re-runs Codex or proceeds (depending on what changed) — and GM never has to read a flawed first draft. GM sees the plan after Codex has filtered the obvious issues.

**Approval gate defaults.** A plan triggers an approval gate (and must therefore stop after Step 3 for GM review) if any of these apply: new dependency, refactor across 3+ files, schema change, public API change, security-sensitive change, deletion of code older than 30 days. Otherwise the plan auto-proceeds to Step 4 or Step 5 after Codex plan-review completes.

If GM gives you a tiny prompt ("fix the typo in line 42"), still do all steps — they just collapse to one or two sentences each. Plan-review and post-review on tiny diffs take seconds.

**Prompt format check.** Every work prompt from GM should follow docs/templates/prompt.md — with Objective, In scope, Out of scope, Success criteria, References, Phase guidance, Verification mode, and Approval gate. If a prompt is missing required fields, reply to GM: "Prompt is missing <fields>. Reissue using the template, or confirm I should proceed with my interpretation." Do not run on guesses. Conversational follow-ups during an active prompt cycle don't need full format.

**Sub-agent gate (project-specific):** Per AGENTS.md, the `reviewer` sub-agent must return `APPROVED` for any scoring, rule, or doc change before it is declared done. The 7-step cycle and the reviewer gate are complementary, not duplicative: Codex (Steps 3/4/6) is a critical second opinion; `reviewer` is the project-specific invariant gate (the 7 ground rules in AGENTS.md). Both must pass for relevant changes.

## Verification mode

Every prompt has a Verification mode that controls whether GM needs to review the report or whether you self-clear. GM sets this in the prompt; default is **Codex-verified**.

**Standard.** Full GM review. Code completes the prompt cycle, files the report, GM reads and decides next steps. Use for: anything hitting an approval gate, design decisions, ambiguous requirements, work the user explicitly cares about reviewing.

**Codex-verified (default).** Code completes the prompt cycle, files the report. If both Codex pre-review and Codex post-review came back clean (or you addressed all findings autonomously per the high-confidence rules below) AND any required `reviewer` sub-agent pass returned APPROVED, the prompt is self-cleared — GM only reads the report for awareness, not approval. If Codex flagged anything you couldn't address autonomously, OR if `reviewer` did not return APPROVED, the prompt becomes Standard mode automatically — wait for GM. Use for: most day-to-day work, small refactors, well-scoped feature pieces, mechanical changes.

**Codex-only check.** No GM review expected. Used for verification-only prompts where the entire deliverable is "did this work cleanly." Examples: "confirm the rename in commit X caught all references," "verify dependency upgrade didn't change behavior." Code runs the verification, files a brief report with Codex's pass/fail, and continues. If Codex finds issues, escalate to GM by switching to Standard mode.

**Mode escalation.** Codex-verified prompts automatically escalate to Standard mode if any of the following:
- Codex flagged a finding you cannot fix per the high-confidence rules below
- The actual change ended up hitting an approval gate (you discovered mid-Develop that the work is bigger than the prompt described)
- Tests failed and you can't fix them within the In scope of the prompt
- `reviewer` sub-agent did not return APPROVED on a scoring/rule/doc change

When you escalate, note "Mode escalated to Standard: <reason>" in the report header.

## Safe self-looping (Loop mode)

For prompts where the work is mechanical iteration with a closed-form success criterion, GM can declare "Loop mode" in Phase guidance. In Loop mode, the Develop step internally iterates fix → verify → fix → verify until the success criterion is met or the attempt cap is hit, without returning to GM between iterations.

The user-facing 7-step cycle stays the same. Loop mode only affects how many iterations run inside Step 5 (Develop) before producing the report.

### When Loop mode is safe

GM declares Loop mode by setting `Loop mode: safe — <pattern>[, max=N]` in the prompt's Phase guidance. Recognized patterns:

- **`tests-green`** — fix → run `npm run test:run` → next failure → fix → run, until all Vitest tests pass
- **`lint-clean`** — run `npm run lint` → fix → re-run, until clean. Pair with `npx tsc --noEmit` for typecheck loops.
- **`codex-clean`** — address each in-scope Codex finding → re-review → next finding, until Codex is clean (against an already-approved scope)
- **`rename-sweep`** — find → replace → verify → next reference, for a mechanical rename across the codebase
- **`migration-sweep`** — for a known set of N callsites or files: site → update → test → next site
- **`coverage-gap`** — for a known set of uncovered branches: branch → write test → next branch

For other safe patterns not in this list, GM can write `safe — <description>` and Code evaluates whether the description satisfies the safety conditions (closed-form success, no scope expansion, no design decisions per iteration).

### When Loop mode is NEVER safe

Refuse to enter Loop mode if any of the following apply, even if GM asked:

- **No closed-form success criterion.** "Make it work," "make it better," "improve performance" — every iteration is a judgment call.
- **Bug fixing without a failing test first.** No reproducer = no machine-checkable success. Convert to a two-prompt sequence.
- **Performance optimization.** "Better" is subjective; scope creeps; every change is a design call.
- **UX-visible changes.** Cowork's visual judgment is not in the loop. UI work runs through normal Plan → Develop → Cowork verification.
- **Schema, public API, or dependency changes.** These hit approval gates and need GM at Plan. Loop mode does not bypass approval gates.
- **Cleanup that finds more cleanup.** Scope expansion per iteration.
- **Changes to scoring code in `src/games/`** without an explicit invariant-test loop. Per AGENTS.md ground rules, scoring changes require `reviewer` APPROVED — that is not a loopable success criterion. Use `safe — tests-green` only when the success criterion is "all 396+ Vitest tests pass," and follow with a separate reviewer gate prompt.

If GM tries to set Loop mode on an unsafe prompt, refuse and explain which condition it violates. Suggest the safe alternative.

### Loop mode rules (when active)

1. **Attempt cap.** Default `max=5`. GM can override (`max=10`, `max=20`) for known-large sweeps. Hard ceiling is `max=50`.
2. **Closed-form success check after every iteration.** Before starting iteration N+1, run the success-criterion check. If it passes, exit and proceed to Codex post-review.
3. **Scope expansion = stop.** If an iteration discovers a fix would require touching code outside the prompt's In scope, stop and report.
4. **Approval gate trip = stop.** If an iteration discovers the work hits any approval gate, stop and escalate.
5. **Codex during loops.**
   - **End-of-loop Codex post-review** runs as Step 6 normally.
   - **Mid-loop Codex checkpoint** runs every 3 iterations during the loop.
   - **First iteration is a free pass** — checkpoint runs after iteration 3, then 6, 9, etc.
6. **Iteration log.** Maintain a running iteration log inside the report's Develop section.
7. **Final state in report.** The Loop summary section records: pattern, success criterion, cap, attempts taken, final outcome.
8. **Escalation paths during Loop mode.** Cap hit / scope expansion / gate trip / serious checkpoint findings → escalate to GM with iteration log.

## Codex pre-review (plan-level)

Pre-review reads your plan as text and questions the approach before any code is written.

**Command:** `/codex:adversarial-review` after writing the plan, with the plan content as the focus text.

**What you give Codex:**
- The Objective from the prompt
- The In scope and Out of scope bullets
- Your proposed approach (1-3 sentences)
- Files you intend to change
- Files you intend to create
- Risks you've identified
- Open questions you have

**Triage:**
- **Codex agrees** → proceed
- **Codex raises an in-scope concern you can address** → revise the plan, note the change, proceed
- **Codex raises an out-of-scope concern** → file as Deferred, proceed with original plan
- **Codex challenges the approach fundamentally** → if the challenge is sound, escalate to Standard mode and report the conflict

## Codex pre-review (diff-level) — high-stakes only

For prompts hitting any approval gate, after writing changes to the working tree but before final commit, run pre-review against the actual diff.

**Command:** `/codex:adversarial-review` on uncommitted changes.

**Triage:** same buckets as plan-review.

## Codex post-review (final state)

Post-review reads the final committed state.

**Command:** `/codex:adversarial-review` against final state.

**Triage:** same buckets. Findings disposition is recorded in the report's Develop section.

## High-confidence autonomous fix rules

When Codex (any review phase) raises a finding, you may fix it without GM intervention only if **all** of the following are true:

1. The fix stays inside the prompt's stated **In scope** — does not expand scope
2. The fix does NOT add a dependency, change a schema, alter a public API, or touch security-sensitive code
3. Codex's recommendation is unambiguous — not a judgment call between alternatives
4. The fix is small — single function or single file
5. Your own confidence in the fix is high — you would have proposed the same change unprompted

**Project-specific addition:** Fixes to scoring code in `src/games/` are NEVER autonomous, even if the five rules above are met. Per AGENTS.md, scoring changes require `reviewer` APPROVED. Codex finding + scoring code = always escalate.

If any rule fails, do not fix autonomously. File the finding for GM review and escalate the prompt's mode to Standard.

When you fix autonomously, record in the report: which finding was addressed, the fix in one line, why it met all rules.

## Codex output reporting

In the report's Develop section, record all three review phases:

```
- Codex pre-review (plan): N findings
  - Addressed in plan revision: <list>
  - Deferred: <list with tracking refs>
  - Declined: <list with reasoning>
- Codex pre-review (diff): N findings — or "skipped, not high-stakes"
  - Same triage format
- Codex post-review (final): N findings
  - Same triage format
- Autonomous fixes applied: <count, with one-line per fix and high-confidence justification>
- Reviewer sub-agent verdict: APPROVED | NOT APPROVED with notes | N/A — non-scoring/rule/doc change
- Codex session IDs: pre-plan=<id>, pre-diff=<id>, post=<id>
```

If a review came back clean, write "clean — no findings" and skip the buckets.

## Codex usage notes

**How Code invokes Codex:** Do NOT use the Skill tool —
`codex:adversarial-review` and `codex:review` have
`disable-model-invocation: true` which blocks Skill-tool invocations.
Always invoke via Bash:
```bash
node "/home/seadmin/.claude/plugins/cache/openai-codex/codex/1.0.4/scripts/codex-companion.mjs" adversarial-review --wait
```
For background runs, add `run_in_background: true` to the Bash call.

**Variants of the command:**
- Default: `/codex:adversarial-review` — review uncommitted changes or focus text
- Branch-vs-base for merge gates: `/codex:adversarial-review --base main`
- Long-running with continued work: `/codex:adversarial-review --background`, then `/codex:status` and `/codex:result` later
- Lighter alternative: `/codex:review` for line-level rather than design-level review (use only when adversarial review is generating excessive noise on a small change)

**When to skip Codex review entirely:** Only skip when the prompt was purely informational. For any prompt that changes files, all three review phases run.

## Codex unavailability — degraded review fallback

If `/codex:adversarial-review` is unavailable (command not found, service down, rate-limited, network failure — the audit reported it was unavailable for the agent suggestions review, so this case is real), do NOT stall:

1. **Detect unavailability.** When Step 3, 4, or 6 invokes Codex and the command fails or times out, treat it as unavailable for this prompt.
2. **Substitute self-review.** In place of each Codex pass, perform a documented self-review pass (walk through plan/diff/final state as a critic, listing 2-3 plausible concerns).
3. **Mark mode as escalated.** Codex-verified mode auto-escalates to Standard when Codex is unavailable.
4. **Record in report.** "Codex unavailable for this prompt — degraded self-review applied. Mode escalated to Standard."
5. **Flag for retry.** Add a one-line note to the next session's SOD carryover.

If Codex is unavailable for many prompts in a row (3+), file a Day 0 or Day +1 pipeline item: "Investigate Codex availability — degraded review has been active for N prompts."

## Browser debugging (CLI-first)

Two tools, two roles. Use both.

**Headless Chrome — for fast smoke checks during Develop.**
```bash
chromium --headless --disable-gpu --screenshot=/tmp/devflow-after.png --window-size=1280,800 http://localhost:3000/golf
```

Save screenshots to `/tmp/devflow-<slug>-<phase>.png`. Reference the path in the report's Develop section. Do not commit screenshots.

**Playwright — for actual UI verification flows.**
This project has Playwright configured (`playwright.config.ts`) with specs under `tests/playwright/` (currently `stroke-play-finish-flow.spec.ts`, `skins-flow.spec.ts`, `wolf-flow.spec.ts`). Run via `npm run test:e2e` or `npx playwright test`. **Playwright targets the PM2 production build at `http://localhost:3000/golf`** — it will fail if PM2 is not running. To rebuild PM2 after a code change: `pm2 stop golf && npm run build && pm2 start golf`.

For development iteration, point Playwright at `http://localhost:3000/golf` after `npm run dev` if the spec doesn't require production-build behavior — but full verification runs against the PM2 build.

**Decision rule:**
- "Does the page load and render?" → headless Chrome screenshot
- "Does this user flow work end to end?" → Playwright test
- "Does this match a design or visual spec?" → headless Chrome screenshot, attach path; let Cowork verify visually if a human eye is needed

## Documentation responsibilities

You maintain everything under docs/:

- `docs/yyyy-mm-dd/` — created at first SOD of each calendar date. Standalone numbered prompt reports plus sod and eod files (with session suffixes if multiple sessions occur on the same date).
- `docs/templates/` — report, sod, eod, and prompt templates. Don't edit these unless GM asks.
- `docs/roadmap.md` — derived from `IMPLEMENTATION_CHECKLIST.md` (the project's authoritative tracker). Refreshed at SOD.
- `docs/pipeline.md` — rolling 5-day pipeline. Updated at SOD and at EOD when shifts happen.
- `docs/issues.md` — fallback only. The real tracker is `IMPLEMENTATION_CHECKLIST.md`.
- `docs/games/` — canonical bet rule files. Updated by `documenter` sub-agent only.
- `docs/plans/` — phase plans (NASSAU_PLAN.md is the active reference).
- `docs/glossary.md` — naming-collision reference for engine vs schema layer terms.

You also keep CLAUDE.md (this file) current. When project conventions, structure, or stack change, update the relevant section. Note the update in your next EOD. AGENTS.md and IMPLEMENTATION_CHECKLIST.md remain authoritative for sub-agent routing and active scope respectively — keep their pointers current too. The audit identified 10 stated-vs-observed deltas in CLAUDE.md and AGENTS.md that need cleanup at first SOD.

## SOD (Start of Day)

When GM says "run SOD" or pastes the SOD prompt:

1. Determine today's folder: `docs/yyyy-mm-dd/` using the actual current calendar date. If the folder already exists from earlier in the same calendar day, use it — do not create a new dated folder.
2. Determine the SOD filename in today's folder:
   - If no sod file exists, write to sod.md (this is session 1)
   - If sod.md exists, count existing SOD files and write to the next number: sod-2.md, sod-3.md, etc.
   - The highest-numbered SOD file is the "active" SOD for the current session
3. Read the most recent prior EOD — the highest-numbered eod file from either the most recent prior date folder, or earlier today if a prior session already closed. Specifically read section 10 ("Tomorrow's seed").
4. Refresh `docs/roadmap.md` from `IMPLEMENTATION_CHECKLIST.md`.
5. Update `docs/pipeline.md` — the rolling 5-day pipeline.
6. Write the SOD file using `docs/templates/sod.md`. Follow the strict format: header, carryover from prior EOD, issue tracker snapshot, five-day pipeline, today's structured plan, risks, Code's notes. The header's "Day index" continues the work-session counter — does not reset for second-session same-day SODs.
7. Enforce SOD format rules: 1-4 Today items, max 6 Day +1-2 items, max 5 Day +3-5 items, every Today item has a matching Plan entry, every Plan entry has explicit In scope and Out of scope.
8. Report the SOD summary to GM, including the session number if it is not the first SOD of the calendar day. Do not start work until GM approves the plan.

## EOD (End of Day)

EOD is user-initiated. Do not run EOD because GM asked, because a few prompts have been completed, because the conversation feels long, or because work seems paused. Run EOD only when GM explicitly says "run EOD" or pastes the EOD prompt — and that prompt should always trace back to the user using EOD-related words ("EOD", "wrap up", "end of day", "stop for now"). If GM asks you to run EOD without that explicit user trigger, push back: "Confirm with the user before EOD — only a small portion of a typical work day has elapsed and I have not seen explicit user EOD intent in this conversation."

When EOD is correctly triggered:

1. Determine the EOD filename in today's folder (`docs/yyyy-mm-dd/`):
   - If no eod file exists, write to eod.md (session 1 wrap-up)
   - If eod.md exists, count existing EOD files and write to the next number: eod-2.md, eod-3.md, etc.
   - The new EOD pairs with the most recent SOD file from today by session number (eod-2.md pairs with sod-2.md)
2. Finalize the EOD using `docs/templates/eod.md`. Follow the strict format: header, plan-vs-reality, shipped, in progress, blocked, codebase changes, instruction updates, Cowork queue, pipeline drift check, instruction-health, tomorrow's seed.
3. Section 1 must have one row per Plan entry from the matching SOD — no skipping.
4. Section 8 (pipeline drift) compares this session's Today completion count vs the matching SOD's Today count, and lists every off-pipeline addition with reason.
5. Section 10 (tomorrow's seed) is the direct input to the next SOD section 1. Fill it specifically, including 2-4 suggested Today items in the same table format the SOD uses.
6. Update `docs/pipeline.md` to reflect this session's shifts.
7. Report the EOD summary to GM, including the session number if it is not the first EOD of the calendar day.

## Multiple sessions in one calendar day

If the user runs EOD, then later starts a new work session on the same calendar date:
- Continue using the same `docs/yyyy-mm-dd/` folder
- New SOD file: sod-2.md (or next available suffix)
- New EOD file: eod-2.md (paired by suffix)
- Reports continue numbering sequentially across the whole calendar day (do not restart at 01)
- Carryover for sod-2.md comes from eod.md (the most recent prior EOD, which today happens to be earlier today)

## Cowork handoffs

When GM tells you about Cowork findings (UI bugs, broken endpoints, layout issues, simplicity-principle violations), record them as a numbered report (type: cowork-findings). Treat the findings as the "Explore" phase input, then plan and develop normally.

Cowork files findings as `findings-yyyy-mm-dd-HHMM.md` on the desktop at `C:\Users\SH\Documents\Claude\Projects\Golf Betting App\`. GM relays.

<!-- DEVFLOW-PROJECT-OWNED — preserved from prior CLAUDE.md (2026-05-06) -->
## Project conventions

Keep this section current. Edit it as the project evolves.

- **Stack:** Next.js 16.2 (App Router), React 19.2 with React Compiler, TypeScript strict, Prisma 7.5 + PostgreSQL, Tailwind 4, Zustand 5, Vitest 4.1, Playwright 1.59. Node runtime on Linux. PM2 for production.
- **Test command:** `npm run test:run` (vitest run, one-shot — the AC gate). `npm run test` for watch mode. Test scope: `src/games/**/*.test.ts`, `src/bridge/**/*.test.ts`, `src/lib/**/*.test.ts`. Currently 22 Vitest test files (count was stale at 16; corrected at 2026-05-06 re-onboard).
- **E2E command:** `npm run test:e2e` (or `npx playwright test`). Targets `http://localhost:3000/golf` (PM2 production). Will fail if PM2 is not running. Specs under `tests/playwright/` (currently 3: `stroke-play-finish-flow.spec.ts`, `skins-flow.spec.ts`, `wolf-flow.spec.ts`).
- **Lint command:** `npm run lint` (eslint).
- **Format command:** none — no Prettier configured. Match surrounding style in each file.
- **Typecheck:** `npx tsc --noEmit` — run manually before commit.
- **Run/dev command:** `npm run dev` (next dev). Production: PM2 serving `next build` output at `http://localhost:3000/golf`.
- **Build command:** `npm run build` (next build).
- **PM2 rebuild:** `pm2 stop golf && npm run build && pm2 start golf`. Procedure originally documented only in commit 51660c4 message — acknowledged tech debt.
- **Branch strategy:** local-only. `main` is active. `pre-rebuild-snapshot` is a historical checkpoint — don't merge to it, don't rebase it. No remote, no PRs, no CI.
- **Commit style:** ticket-code prefix when work-item-linked (e.g. `SK-2: …`, `SP-UI-7: …`, `PF-1-F6: …`); freeform descriptive otherwise. One to three commits per session is normal. Session-log/EOD-only commits are acceptable and routine.
- **Issue tracker:** `IMPLEMENTATION_CHECKLIST.md` is the single source of truth for active scope. AGENTS.md "Current item" line is the active-item pointer. No external tracker.
- **Code review:** sub-agent `reviewer.md` is the designated gate — must return `APPROVED` before any scoring, rule, or doc change is declared done. No human PR review.

## Project structure

Keep this current as the project grows. **Note: the structure below is verified as of 2026-05-06 audit; LOC and counts in inline comments were stale in the prior CLAUDE.md and corrected here. The first SOD should refresh against actual fs state once Nassau phase progresses.**

```
golf/
├── src/
│   ├── app/                    Next.js App Router (api, bets, results, round/new, scorecard)
│   ├── bridge/                 4 bridges + 4 tests (skins, stroke_play, wolf, nassau)
│   ├── components/             layout, scorecard, setup, ui (~11 files)
│   ├── games/                  9 engines + handicap/aggregate/events/types + tests/
│   ├── lib/                    legacy scoring (handicap, junk, payouts, scoring) — being migrated; gameGuards, perHoleDeltas, roundApi, prisma; nassauPressDetect
│   ├── store/                  roundStore.ts (Zustand)
│   └── types/                  index.ts (incl. GAME_DEFS w/ disabled flag)
├── prisma/                     schema.prisma, prisma.config.ts, migrations/ (4 migrations)
├── tests/playwright/           skins-flow.spec.ts, stroke-play-finish-flow.spec.ts, wolf-flow.spec.ts (no nassau-flow.spec.ts yet — gap)
├── docs/
│   ├── yyyy-mm-dd/             DevFlow daily prompt reports + sod.md + eod.md
│   ├── templates/              report.md, sod.md, eod.md, prompt.md
│   ├── games/                  game_<name>.md (canonical rules) + _ROUND_HANDICAP, _FINAL_ADJUSTMENT, _TEMPLATE
│   ├── plans/                  NASSAU_PLAN.md (active), SKINS_PLAN.md, STROKE_PLAY_PLAN.md, WOLF_PLAN.md (historical)
│   ├── product/north-star.md
│   ├── proposals/              design notes
│   ├── pipeline.md             rolling 5-day pipeline
│   ├── roadmap.md              derived from IMPLEMENTATION_CHECKLIST.md at SOD
│   ├── glossary.md             naming-collision reference
│   ├── design-brief.md         design intent (BLANK as of re-onboard — fill at first UI SOD)
│   └── ui-tooling.md           UI tooling commands (BLANK as of re-onboard — fill at first UI SOD)
├── .claude/
│   ├── agents/                 5 sub-agents (researcher, documenter, engineer, reviewer, team-lead)
│   └── skills/                 golf-betting-rules, focus-discipline, session-logging
├── AGENTS.md                   sub-agent routing + active-phase/current-item pointer (POINTER STALE per audit — update at first SOD)
├── IMPLEMENTATION_CHECKLIST.md active scope SoT (HEADER STALE per audit — update at first SOD)
├── REBUILD_PLAN.md, AUDIT.md, MIGRATION_NOTES.md  history (read-only)
├── README.md
└── CLAUDE.md                   this file
```

Old session-log directories at the repo root (`2026-04-20/` through `2026-04-29/`) and root-level `EOD_*.md` files are pre-DevFlow history. Do not write new content to them.

App Router only. No `middleware.ts` — auth is network-perimeter (Tailscale) only.

## UI review hooks

Any prompt that changes visible UI runs these checks inside the existing 7-step cycle. No new steps — these enrich Plan, Develop, and Codex post-review. All UI work anchors against `docs/design-brief.md` (acceptance rules) and `docs/ui-tooling.md` (commands).

### Source-of-truth files
- **`docs/design-brief.md`** — the user's design intent: target user, primary workflows, simplicity principles, breakpoints, visual acceptance criteria. Currently BLANK as of 2026-05-06 re-onboard. First UI prompt stops at Plan and asks GM to fill it. Every UI Plan references it once filled.
- **`docs/ui-tooling.md`** — the project's verified UI tooling commands: screenshot tool, a11y scanner, visual diff. Currently BLANK as of re-onboard; first UI-touching SOD must populate the screenshot, a11y, and run-server fields. The project has Playwright configured — visual-diff via Playwright's screenshot diff is one option.

### Plan step additions (UI-touching prompts only)
The plan must explicitly include:
- **Acceptance criteria from `docs/design-brief.md`** — quote the relevant section(s); if design-brief.md is empty or missing the relevant section, stop and ask GM to fill it before continuing
- **Breakpoints affected** — drawn from the design-brief's breakpoints list (defaults: mobile 375, tablet 768, desktop 1280, wide 1920; design-brief's actual choice may differ — this app's runtime context is desktop-first server-rendered)
- **Design tokens used**, or "hardcoded values — tokenize follow-up filed as <tracking ref>"
- **Components: reused** (link existing) vs **new** (justify why existing ones don't fit)
- **A11y considerations:** contrast ratio target, focus order, keyboard reachability, ARIA needs
- **Simplicity check:** confirm the change preserves the simplicity principles from design-brief

Codex pre-review (plan) reads these alongside the rest of the plan.

### Develop step additions (UI-visible changes only)
Read `docs/ui-tooling.md` for the project's confirmed commands. If `docs/ui-tooling.md` is empty or missing required entries, stop after Plan and ask GM to populate it. Do not invent commands.

When tooling is confirmed, run automatically:
- **Headless screenshots** at each affected breakpoint
- **A11y scan** on the changed page (output to `/tmp/devflow-<slug>-a11y.json`)
- **Visual diff** vs prior baseline if configured

Reference all artifact paths in the report's Develop section.

### Codex post-review additions (UI-visible changes only)
Include the screenshot paths, a11y output, and the relevant `docs/design-brief.md` section as context for `/codex:adversarial-review`, not just the diff.

### Cowork handoff trigger
If anything in plan-review, develop, or post-review flags a visual judgment a CLI can't make, populate the report's "For Cowork to verify" field in section 8 with specifics, including a pointer to the relevant design-brief section. GM routes to Cowork from there.

### Skip conditions
UI checks skip entirely when:
- Prompt is backend-only (no rendered output changes)
- Prompt is informational (no files touched)
- Prompt's "UI checks" Phase guidance field says "skip"

<!-- DEVFLOW-PROJECT-OWNED — preserved from prior CLAUDE.md (2026-05-06) -->
## Project-specific rules and conventions

### Active phase and current item

**Stale as of 2026-05-06 re-onboard — first SOD must refresh.** Per audit:
- Per CLAUDE.md and AGENTS.md headers (both stale): "Active phase: Nassau — awaiting GM approval... Current item: NA-0"
- Per actual git history: NASSAU_PLAN.md was approved; NA-pre-1, NA-1, NA-2, NA-3 all committed. Active item is whatever follows NA-3 in NASSAU_PLAN.md (read at first SOD to determine).

After first SOD's grooming pass, update AGENTS.md line "Active phase: …" / "Current item: …" to match. Active scope tracker is `IMPLEMENTATION_CHECKLIST.md`.

### Known tech debt (recorded, do not casually fix)

- Reference-identity bet-id lookup anti-pattern — closed-out by REBUILD_PLAN.md #4.
- Multi-bet cutover deferred — REBUILD_PLAN.md #11. As of 2026-05-06: Wolf, Nassau, Skins, Stroke Play all unparked in `GAME_DEFS`; Match Play remains `disabled: true` (engine exists, no bridge or UI). Junk Phase 3 (Sandy/Barkie/Polie/Arnie) deferred; stubs return `null`.
- Scoring file-path divergence: README points to target paths per MIGRATION_NOTES.md item 1; current scoring lives under `src/lib/`. Don't "fix" the README casually.
- No consolidated runbook; PM2 rebuild procedure lives only in commit 51660c4.
- `bets/`, `resolve/`, and non-same-session `results/` pages render from Zustand only — cross-session viewing broken (PF-1 v2 backlog).
- `TEES` constant in `src/types/index.ts` has hardcoded slope/rating not per-course; deferred to course integration phase.
- `roundStore.ts` has `as` casts at hydration boundary that may silently lie about types (parking-lot from F4 phase-a).
- `PUT /api/rounds/[id]/scores/hole/[hole]` surfaces `PrismaClientValidationError` as 500 on bad input (backlog item PUT-HANDLER-400-ON-MISSING-FIELDS).
- session-logging SKILL.md edge-case examples still show old `YYYY-MM-DD/NNN_<slug>.md` format; "Paths" section is correct. One-pass fix flagged for first SOD.

### Architectural notes — load-bearing assumptions (do not change without a rule-doc pass)

- **FieldTooSmall sentinel (Skins engine):** `settleSkinsHole` emits `FieldTooSmall` with `hole: number` (not null) for all-zero-score holes.
- **hydrateRound label convention:** always resolve the human-readable label via `GAME_DEFS.find(d => d.key === g.type)?.label ?? g.type`. Never use `g.type` directly.
- **Two-phase Skins settlement:** `settleSkinsHole` (per-hole, provisional) + `finalizeSkinsRound` (carry-scaling + tie resolution).
- **Settlement is computed from Zustand state, not the DB.**

### Do-not-touch areas

- `pre-rebuild-snapshot` branch.
- `src/lib/*` — being migrated; no casual cleanup.
- README scoring-file-path divergence — intentional, do not "fix."
- `TEES` constant — deferred.
- Root-level `2026-04-20/` through `2026-04-29/` directories and `EOD_*.md` files — pre-DevFlow history, read-only.

### Sub-agents and skills

Five sub-agents under `.claude/agents/`: researcher, documenter, engineer, reviewer, team-lead. Three skills under `.claude/skills/`: golf-betting-rules (rule routing), focus-discipline (one-active-task discipline + Parking Lot rules), session-logging.

The audit (2026-05-06) suggests two additional subagents the user can decide to add at first SOD via normal prompt cycles: `prisma-migration-reviewer` (audits migration SQL for data-loss risk) and `playwright-flow-checker` (requires E2E spec before declaring a bet's UI phase complete — directly addresses the missing `nassau-flow.spec.ts`). DevFlow does not auto-create either; user decides.

### AGENTS.md cross-cutting rules (still authoritative)

The 7 ground rules in AGENTS.md ("Ground rules every agent follows") still apply to every change: rules-from-docs, integer-unit math, zero-sum settlement, portability under `src/games/`, handicap-in-one-place, typed `ScoringEvent` audit trail, no silent defaults, string-equality bet-id lookup. A change that violates any of these fails `reviewer`. AGENTS.md is the authority for sub-agent routing; CLAUDE.md is the authority for DevFlow workflow.

### Code style

TypeScript strict mode is on. No Prettier — match surrounding style in each file.

### Commit hygiene

Tickets first. One sentence is fine. Session-log/EOD-only commits are acceptable and routine.
- **Per-prompt commit workflow** (adopted WF-5): one commit per substantive prompt, made at the reviewer APPROVED gate. Applies to all engineering and doc prompts that change source files. This convention complements DevFlow's standalone-report rule: each prompt produces one report file in `docs/yyyy-mm-dd/` and one git commit at the reviewer gate.

## External code review (historical context — superseded by 7-step cycle)

The prior CLAUDE.md described an optional Codex workflow tied to the 4-phase rule. Under the 7-step cycle, Codex is now structurally embedded as Steps 3, 4 (conditional), and 6. The historical conventions below are kept for reference; active practice follows the 7-step cycle.

For prompts that touch 1+ files, change schemas/APIs, or alter security-sensitive code, run `/codex:adversarial-review` after Develop and before commit. Record the result in the report's Develop section as one bullet:
- "Codex adversarial-review: clean" if no issues
- "Codex adversarial-review: N issues — addressed in commit X" if issues found and fixed
- "Codex adversarial-review: N issues — deferred to issue #N" if not addressing now

For pre-merge of feature branches, GM may require `/codex:adversarial-review --base <main>` before approving. Findings get filed as a separate cowork-findings-style report (type: external-review).

## Reporting to GM

When you report back to GM after a prompt cycle, your message should include:

- One-sentence summary of what was done
- Path to the report file
- Any decisions or questions that need GM input
- Anything Cowork should check (if it's UI-visible)

Keep messages short. The detail lives in the report file.
