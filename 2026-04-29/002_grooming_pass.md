---
prompt_id: 002
date: 2026-04-29
role: documenter
checklist_item_ref: "Bookkeeping + checklist grooming — close Apr27 items, rewrite active item, fix backlog header and timeline"
tags: [documenter, grooming, checklist, bookkeeping]
---

# Grooming Pass — 2026-04-29

Source: `2026-04-29/001_gm_context_pull.md` (GM context pull). Fence: `IMPLEMENTATION_CHECKLIST.md` only.

---

## 1. Changes Made to IMPLEMENTATION_CHECKLIST.md

### 1a. Parking lot closures — `[ ]` → `[x]`

Seven items closed. Commit hashes appended inline at end of each item.

| Item | Commit(s) | Closure note appended |
|---|---|---|
| SP-UI-1 | cd6ec99 | `— closed 2026-04-27 — commit cd6ec99` |
| SP-UI-2 | 647520f | `— closed 2026-04-27 — commit 647520f` |
| SP-UI-3 | ab0f3b1 | `— closed 2026-04-27 — commit ab0f3b1` |
| PF-1-F3 | 645cc61, 481ad90 | `— closed 2026-04-27 — no code defect; two root causes: PM2 restart storm (~16/17 failures) + gross: undefined payload race on round 12 hole 18 (1/17); ops fix documented — commits 645cc61, 481ad90` |
| PF-1-F4 (a+b) | debd931, 25839a9 | commits already inline in item body; appended `— closed 2026-04-27 — engineering complete; commits debd931, 25839a9; phase-end closure pending SP-4 §4 manual playthrough` |
| PF-1-F5A | 5c36797 | `— closed 2026-04-27 — commit 5c36797` |
| PF-1-F6 | 6150ba8 | `— closed 2026-04-27 — commit 6150ba8` |

### 1b. Done section additions

Seven new entries appended after the PF-1 entry (append-only, per section convention):

- SP-UI-1, SP-UI-2, SP-UI-3 (one line each)
- PF-1-F3, PF-1-F4, PF-1-F5A, PF-1-F6 (one line each)

### 1c. Active item rewrite

Old title: **"PF-2 correctness cluster + SP-UI fence-violation fixes."**

New title: **"SP-4 §4 manual browser playthrough (PF-2 phase-end gate)."**

Body replaced with: sole remaining gate (browser session, no code blocker), prerequisite ops step (pm2 rebuild), open investigation (F9-a-HOLE18-RACE), backlog (PUT-HANDLER-400), updated attribution line citing `2026-04-29/001_gm_context_pull.md`.

### 1d. Backlog section header

Old: `Items D1–D4, #9, #10 carry forward.`

New: `Items #3–#10 are done (see Done section; #9 closed as SP-6 2026-04-25; #10 Float→Int 2026-04-26). Items #11 and #12 are superseded/split — see the active plan. Carry-forward backlog: D2 (open), D4 (open); D1 partial (sub-task A done, sub-task B parked pending two questions); D3 withdrawn.`

### 1e. Design timeline — Phase 5

Old: `**done** — SP-1–SP-4 closed 2026-04-25; SP-5 deferred; SP-6 closed 2026-04-25`

New: `**in progress** — SP-1–SP-4 + SP-6 closed 2026-04-25; SP-5 deferred; SP-UI-1/2/3 + PF-2 code items closed 2026-04-27; SP-4 §4 manual playthrough open`

Row label also updated from `SP-1–SP-6` to `SP-1–SP-6 + PF-2`.

---

## 2. CLAUDE.md Diff Summary (read-only — NOT committed this pass)

CLAUDE.md has been substantially rewritten since commit 51660c4. It is the only uncommitted file in the working tree (`git status` shows ` M CLAUDE.md`). It is NOT staged and NOT included in this pass's commit.

### What was added (new content above the divider)

The new CLAUDE.md opens with a DevFlow structure section covering:

1. **Role definition** — Claude Code is the developer in the DevFlow workflow; reports to GM (Claude App); does not talk to Cowork directly.
2. **Chain of command** — GM ↔ Code ↔ Cowork three-role hierarchy. Cowork findings reach Code via GM after the user relays them. Direct user-to-Code chats acceptable for quick questions; work prompts use the 4-phase rule.
3. **4-phase rule (mandatory)** — Every GM prompt cycles through: Explore → Plan → Develop → Report. Tiny prompts collapse but never skip phases.
4. **Documentation responsibilities** — Explicit list of what Code maintains: per-prompt session logs, EOD logs, FINAL EOD, docs/plans/, docs/games/, docs/proposals/, docs/sessions/, docs/product/, docs/glossary.md, IMPLEMENTATION_CHECKLIST.md, REBUILD_PLAN.md, MIGRATION_NOTES.md, AUDIT.md, CLAUDE.md, AGENTS.md.
5. **SOD procedure** — When GM says "run SOD": state active checklist item verbatim, read yesterday's EOD, confirm phase end-condition, report SOD summary to GM.
6. **EOD procedure** — When GM says "run EOD": append per-prompt summaries to EOD file, note what Cowork should check, note what may require App/Cowork instruction updates, report EOD summary to GM. FINAL EOD only on explicit user request.
7. **Cowork handoffs** — Record Cowork findings as session-log entry; treat as Explore input.
8. **Reporting to GM** — Four-point format: one-sentence summary, session-log path, decisions/questions for GM, anything Cowork should check. Keep messages short.
9. **Project conventions** (all new inline):
   - Stack: TypeScript, Next.js 16, React App Router, Vitest, Prisma + PostgreSQL
   - Test commands: `npm test` (watch), `npm run test:run` (one-shot); 307 tests / 12 files
   - Lint: `npm run lint` via `eslint.config.mjs`; no Prettier or Biome
   - Run/dev: `npm run dev`, default port 3000, basePath `/golf`; PM2 for process management
   - Branch strategy: trunk-based on `main`; `pre-rebuild-snapshot` is marker only; no PR workflow, no remote
   - Commit style: freeform with internal task-ID prefixes; not Conventional Commits
   - Issue tracker: `IMPLEMENTATION_CHECKLIST.md`; no external tracker
   - CI/CD: none; local dev only
   - Hosting: Local PM2 on a Linux host reached via Tailscale at `http://100.71.214.25/golf` from the Windows Cowork machine
10. **Test coverage shape (bimodal)** — Heavy: engines + bridge (307 tests); Zero: UI, API routes, Zustand store, src/lib/*. No coverage tooling.
11. **Project structure (high-level)** — Directory inventory covering src/games/, src/bridge/, src/lib/, src/app/, src/components/, src/store/, src/verify/, docs/games/, docs/plans/, docs/proposals/, docs/sessions/, docs/product/, .claude/agents/, .claude/skills/.
12. **"Project-specific rules and conventions" header** — Divides new content above from preserved content below with timestamp: `Preserved from prior CLAUDE.md (2026-04-29)`.

### What was removed (no longer in the file)

Nothing was removed. The old content is preserved verbatim below the divider.

### What is preserved verbatim below the divider

Everything in the prior CLAUDE.md is still present:
- `@AGENTS.md` include (line 1 of preserved section)
- Session logging convention (per-prompt summary + EOD line + FINAL EOD on explicit request only)
- Commit practice (FINAL EOD as canonical commit trigger; mid-day commits on phase close; start-of-day catch-up gate; pre-commit IMPL checklist consistency check; rule-relevant topic check; full gate text verbatim)
- Scope and focus (IMPLEMENTATION_CHECKLIST.md as single source of truth; focus-discipline skill pointer)
- Agent routing (`AGENTS.md` § pointer)
- Active phase note (engine rebuild complete; active plan reference; preserved-do-not-touch list; history-not-todo-list note; safety branch note)
- BEGIN:nextjs-agent-rules block (the full AGENTS.md content embedded via the `@AGENTS.md` include)

### GM review notes

- The new project conventions section lists test count as "307 tests across 12 files" — this was the count before Apr27 work. Current count is 348/348. The convention note may want updating.
- Tailscale address `100.71.214.25/golf` is now embedded in CLAUDE.md plaintext. Confirm whether this is acceptable to commit publicly.
- The divider timestamp `2026-04-29` is today's date; this is the first time CLAUDE.md has been touched in this way (prior versions were plain AGENTS.md wrappers).
- No mechanical issues with the rewrite. The `@AGENTS.md` include is retained; all old commit-practice gates are preserved.

---

## 3. AGENTS.md — Flag Only

**Not edited.** AGENTS.md is in the do-not-touch list in CLAUDE.md and requires operator authorization to modify.

**Stale item to flag for GM:**

`AGENTS.md` line 21 reads: `"Current item: SP-6 (GAME_DEFS cleanup + GameList filter)."` SP-6 closed 2026-04-25. The current active item is the SP-4 §4 manual browser playthrough. When the operator authorizes an AGENTS.md edit, this line should be updated to reflect current state.

---

## 4. IMPL Checklist Diff (for GM review before commit)

```diff
diff --git a/IMPLEMENTATION_CHECKLIST.md b/IMPLEMENTATION_CHECKLIST.md
index e268318..c40eea8 100644
--- a/IMPLEMENTATION_CHECKLIST.md
+++ b/IMPLEMENTATION_CHECKLIST.md
@@ -20,22 +20,22 @@ Updated at EOD-FINAL.
 | 2. Rebuild plan approval | 2026-04-20 | **done** (closed 2026-04-20 at prompt 004; see `REBUILD_PLAN.md`) |
 | 3. Engine rebuild (#3–#8: Wolf follow-ups, bet-id refactor, Nassau, Match Play, Junk, aggregate) | 2026-04-24 | **done** (all phases closed; see Done section) |
 | 4. `prisma/` Float→Int migration (#10) | 2026-04-26 | **done** — closed 2026-04-26 — session log: `2026-04-26/001_M1_PRISMA_FLOAT_INT_CENTS.md` |
-| 5. Stroke-Play-only UI phase (SP-1–SP-6; see `docs/plans/STROKE_PLAY_PLAN.md`) | 2026-04-25 | **done** — SP-1–SP-4 closed 2026-04-25; SP-5 deferred; SP-6 closed 2026-04-25 |
+| 5. Stroke-Play-only UI phase (SP-1–SP-6 + PF-2; see `docs/plans/STROKE_PLAY_PLAN.md`) | 2026-04-25 | **in progress** — SP-1–SP-4 + SP-6 closed 2026-04-25; SP-5 deferred; SP-UI-1/2/3 + PF-2 code items closed 2026-04-27; SP-4 §4 manual playthrough open |
 | 6. Full multi-bet cutover (#11) | TBD | deferred until third bet unparks (blocked on phase 5) |
 
 ## Active item
 
-**PF-2 correctness cluster + SP-UI fence-violation fixes.**
+**SP-4 §4 manual browser playthrough (PF-2 phase-end gate).**
 
-The SOD April 27 "structurally complete" characterization is superseded. The Stroke-Play-only phase has open fence-violation items and a PF-2 correctness gate cluster that must close before SP-4 §4 manual-playthrough can be attempted.
+All SP-UI fence-violation items (SP-UI-1/2/3) and all PF-2 code items (PF-1-F3/F4/F5A/F6) landed 2026-04-27. The sole remaining gate is the SP-4 §4 manual browser playthrough: one full 18-hole Stroke Play round on the running dev server, `appliesHandicap: true`, correct settlement on the results page, zero-sum verified by inspection. No code blocker; requires a browser session.
 
-**SP-UI items** (fence enforcement per §1e, dispatchable independently of PF-2): SP-UI-1 (`GameInstanceCard.tsx` junk guard), SP-UI-2 (`ScoreRow.tsx` dot-button visibility), SP-UI-3 (playDate UTC display). No prerequisites; dispatchable in any order.
+**Prerequisite before Cowork playthrough:** production server at port 3000 is running a stale Apr26 12:39 build. Run `pm2 stop golf && npm run build && pm2 start golf` before the playthrough to deploy all Apr27 changes.
 
-**PF-2 cluster** (end-to-end correctness gates): PF-1-F4 phase (a) is the next action — a researcher/reviewer pass, not an engineer turn. PF-1-F3 (server diagnosis) is parallel. PF-1-F4 phase (b) and PF-1-F6 are blocked on phase (a). Do not dispatch any PF-2 engineer edit without PF-1-F4 phase (a) completing first.
+**Open investigations:** F9-a-HOLE18-RACE — one `gross: undefined` payload observed on round 12 hole 18 during F3 v2 diagnosis; F9-a `useEffect` may race with Finish Round save on last hole. Researcher pass pending.
 
-**PF-2 AC:** bets and results pages render correctly for a completed Stroke Play round in the browser; SP-4 §4 manual-playthrough condition is met.
+**Backlog:** PUT-HANDLER-400 — PUT handler surfaces `PrismaClientValidationError` as 500; should return 400. Low priority; does not block playthrough.
 
-> Active plan: `docs/plans/STROKE_PLAY_PLAN.md`. SP-UI items enforce §1e fence. PF-2 items are end-to-end correctness gates PF-1's mechanism-only AC did not cover. Full AC for each item: see Parking Lot.
+> Active plan: `docs/plans/STROKE_PLAY_PLAN.md`. PF-2 AC: bets and results pages render correctly for a completed Stroke Play round in the browser; SP-4 §4 manual-playthrough condition is met. Current state sourced from `2026-04-29/001_gm_context_pull.md`.
 
 ## Parked / Deferred
 
@@ -47,7 +47,7 @@ See parking-lot item (checklist line 95) for the verifier's full scope descripti
 
 ## Backlog
 
-Ordered; rough sizing in parens. Items #3–#8 are done (see Done section). Items D1–D4, #9, #10 carry forward. Items #11 and #12 are superseded/split — see the active plan. For AC during the Stroke-Play-only phase, see `docs/plans/STROKE_PLAY_PLAN.md`. Backlog numbers match `REBUILD_PLAN.md` numbers where applicable.
+Ordered; rough sizing in parens. Items #3–#10 are done (see Done section; #9 closed as SP-6 2026-04-25; #10 Float→Int 2026-04-26). Items #11 and #12 are superseded/split — see the active plan. Carry-forward backlog: D2 (open), D4 (open); D1 partial (sub-task A done, sub-task B parked pending two questions); D3 withdrawn. For AC during the Stroke-Play-only phase, see `docs/plans/STROKE_PLAY_PLAN.md`. Backlog numbers match `REBUILD_PLAN.md` numbers where applicable.
 
@@ -127,19 +127,19 @@ Untriaged. Dated and sourced to a prompt.
-| SP-UI-1 | [ ] | — | cd6ec99 |
+| SP-UI-1 | [x] | closed 2026-04-27 | cd6ec99 |
 [... seven parking-lot items changed [ ] → [x] with closure notes ...]
 
@@ -168,6 +168,13 @@ Append-only. Close date + pointer to prompt NNN or EOD.
 [... seven new Done section entries added after PF-1 ...]
```

(Full verbatim diff captured above in §4 body — the inline fenced block is the complete `git diff` output.)

---

## 5. Commit Plan

**Files to stage:** `IMPLEMENTATION_CHECKLIST.md` only.

**Files explicitly excluded:** `CLAUDE.md` (uncommitted by instruction; GM review required first), `AGENTS.md` (do-not-touch), `2026-04-29/002_grooming_pass.md` (this session log — not included per standard convention; session logs are committed at FINAL EOD).

**Commit message:**
```
Grooming 2026-04-29: close Apr27 items in checklist; rewrite active item to SP-4 §4 playthrough gate

Source: 2026-04-29/001_gm_context_pull.md
```

---

## 6. Observations (not actioned — fence)

- **CLAUDE.md test count stale:** New project conventions section states "307 tests across 12 files." Current passing count is 348/348. Should be updated when CLAUDE.md is committed.
- **AGENTS.md line 21 stale:** "Current item: SP-6" — closed 2026-04-25. Requires operator authorization to edit.
- **Phase 6 row in design timeline:** Says "blocked on phase 5" — still accurate since phase 5 is now marked "in progress." No change needed now.
