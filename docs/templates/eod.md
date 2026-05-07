<!-- DEVFLOW GENERATED FILE
     DevFlow version: 1.0
     Generated at: 2026-05-06 13:23
     Template source: devflow-runtime-templates.md (EOD_TEMPLATE)
     Refresh: re-running HUB on this project regenerates these templates.
-->
# EOD: yyyy-mm-dd<-N if not session 1>

> **Strict format.** EOD is user-initiated only. Reports are written as standalone files throughout the session; EOD is compiled fresh from those reports when the user explicitly triggers it. The "Tomorrow's seed" section is the direct input to the next SOD's section 1. Do not add, remove, or reorder sections.

## EOD trigger guard
Before writing this file, confirm: did the user explicitly request EOD? If GM proposed EOD on its own (not from explicit user instruction), push back rather than write this file. A typical work day spans roughly 6 hours of actual development — a handful of prompts is not a full day.

## Header
- **Date:** yyyy-mm-dd
- **Session number:** N (1 for first EOD on this calendar date, 2 if a second session, etc.)
- **Filename:** eod.md (session 1) or eod-N.md (later sessions)
- **Day index:** N (matches the SOD)
- **Linked SOD:** path to the matching sod file (session-paired: eod-2.md links to sod-2.md)
- **Reports filed this session:** count and list of filenames in docs/yyyy-mm-dd/

## 1. Today's plan vs reality
For each Plan entry in the matching SOD, report status. This section is the accountability check.

| Plan entry | Maps to Today item | Status | Notes |
|---|---|---|---|
| 1 | #1 | complete / partial / blocked / not started / dropped | one line |
| 2 | #2 | ... | ... |

Status definitions:
- **complete** — success criteria met
- **partial** — some work done, more needed (becomes carryover)
- **blocked** — work stopped due to a blocker (becomes carryover with blocker noted)
- **not started** — no work attempted (must explain in notes — was it descoped, deprioritized, deferred?)
- **dropped** — actively decided not to do (must explain in notes)

## 2. Shipped this session
Concrete deliverables that hit the codebase or were finalized.
- **Merged/committed:** list with commit SHAs
- **Deployed:** list with target environments, or "no deploys this session"
- **Issues closed:** list of issue IDs closed this session

## 3. In progress (carryover candidates)
Work started but not complete. These will appear in the next SOD section 1.
- Item: <description>
  - Started: HH:MM
  - State: <where it stands>
  - Next step: <what comes next>
  - Estimate to finish: S/M/L

## 4. Blocked
Work stuck. These will appear in the next SOD section 1 unless cleared.
- Item: <description>
  - Blocker: <specific blocker>
  - Owner of unblock: <user / GM / external>
  - Asked to clear by: yyyy-mm-dd

## 5. Codebase changes (this session)
- **Files added:** list
- **Files removed:** list
- **Files significantly refactored:** list
- **Dependencies added/removed/upgraded:** list
- **Schema or config changes:** list, or "none"

## 6. Updates to CLAUDE.md or templates
- **CLAUDE.md changes this session:** list of section names changed, with one-line reason
- **Template changes:** list, or "none"

## 7. Cowork queue for next session
UI-visible changes that need verification. GM uses this to prompt the user to run Cowork checks.
- ...
- ... or "no UI changes this session — Cowork not needed"

## 8. Pipeline drift check
Did this session's actual work match the matching SOD's pipeline?
- **Items completed from Today:** count / total
- **Items added off-pipeline:** list with reason — was it an emergency, GM call, scope creep?
- **Day +1-2 items pulled forward:** list, or "none"
- **Today items pushed back:** list with new placement (Day +1-2 or +3-5)

If "added off-pipeline" has more than 1 entry on a regular session, flag in section 10 — it suggests planning issues.

## 9. Instruction-health notes for GM
Things noticed this session that suggest App or Cowork instructions need updating.
- **App instructions:** [no drift / suggest edit: ...]
- **Cowork CLAUDE.md:** [no drift / suggest edit: ...]
- **Code CLAUDE.md:** changes already applied this session (see section 6) or pending edits

## 10. Tomorrow's seed
Direct input to the next SOD section 1. Be specific. "Next SOD" may be later today (a new session) or tomorrow.

### Carryover items
- **In progress to continue:** copy from section 3
- **Blocked to monitor:** copy from section 4

### Suggested Today items for next session
2-4 items GM should consider committing to next SOD's Today section. Each item should match the Today table format.

| # | Item | Source | Estimate | Scope notes |
|---|---|---|---|---|
| 1 | ... | ... | ... | ... |

### Pipeline shifts to apply
- Items to add to Day +1-2: ...
- Items to add to Day +3-5: ...
- Items to drop from pipeline: ... with reason

### Watchouts for next session
- ...

---

## Format rules to enforce

- Section 1 must have one row per Plan entry from the matching SOD — none can be missing.
- Section 3 (in progress) and section 4 (blocked) must show up in section 10's Carryover.
- Section 8 must compare apples-to-apples: count of completed Today items vs count in matching SOD's Today.
- Section 10's "Suggested Today items" must total 2-4. If fewer, the project is under-committed; if more, push some to Day +1-2.
- "Linked SOD" in the header must use the same session number (eod-2.md → sod-2.md).
