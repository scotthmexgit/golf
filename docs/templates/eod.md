# EOD: yyyy-mm-dd

> **Strict format.** Code appends throughout the day, finalizes at EOD. The "Tomorrow's seed" section is the direct input to the next SOD's section 1. Do not add, remove, or reorder sections.

## Header
- **Date:** yyyy-mm-dd
- **Day index:** N (matches the SOD)
- **Linked SOD:** path to today's sod.md
- **Reports filed today:** count and list of filenames in docs/yyyy-mm-dd/

## 1. Today's plan vs reality
For each Plan entry in today's SOD, report status. This section is the accountability check.

| Plan entry | Maps to Today item | Status | Notes |
|---|---|---|---|
| 1 | #1 | complete / partial / blocked / not started / dropped | one line |
| 2 | #2 | ... | ... |

Status definitions:
- **complete** — success criteria met
- **partial** — some work done, more needed (becomes Day +1 carryover)
- **blocked** — work stopped due to a blocker (becomes carryover with blocker noted)
- **not started** — no work attempted (must explain in notes — was it descoped, deprioritized, deferred?)
- **dropped** — actively decided not to do (must explain in notes)

## 2. Shipped today
Concrete deliverables that hit the codebase or were finalized.
- **Merged/committed:** list with commit SHAs
- **Deployed:** list with target environments, or "no deploys today"
- **Issues closed:** list of issue IDs closed today

## 3. In progress (carryover candidates)
Work started but not complete. These will appear in tomorrow's SOD section 1.
- Item: <description>
  - Started: HH:MM
  - State: <where it stands>
  - Next step: <what comes next>
  - Estimate to finish: S/M/L

## 4. Blocked
Work stuck. These will appear in tomorrow's SOD section 1 unless cleared.
- Item: <description>
  - Blocker: <specific blocker>
  - Owner of unblock: <user / GM / external>
  - Asked to clear by: yyyy-mm-dd

## 5. Codebase changes (today)
- **Files added:** list
- **Files removed:** list
- **Files significantly refactored:** list
- **Dependencies added/removed/upgraded:** list
- **Schema or config changes:** list, or "none"

## 6. Updates to CLAUDE.md or templates
- **CLAUDE.md changes today:** list of section names changed, with one-line reason
- **Template changes:** list, or "none"

## 7. Cowork queue for tomorrow
UI-visible changes that need verification. GM uses this to prompt the user to run Cowork checks.
- ...
- ... or "no UI changes today — Cowork not needed tomorrow"

## 8. Pipeline drift check
Did today's actual work match the SOD's pipeline?
- **Items completed from Today:** count / total
- **Items added off-pipeline:** list with reason — was it an emergency, GM call, scope creep?
- **Day +1-2 items pulled forward:** list, or "none"
- **Today items pushed back:** list with new placement (Day +1-2 or +3-5)

If "added off-pipeline" has more than 1 entry on a regular day, flag in section 10 — it suggests planning issues.

## 9. Instruction-health notes for GM
Things noticed today that suggest App or Cowork instructions need updating.
- **App instructions:** [no drift / suggest edit: ...]
- **Cowork CLAUDE.md:** [no drift / suggest edit: ...]
- **Code CLAUDE.md:** changes already applied today (see section 6) or pending edits

## 10. Tomorrow's seed
Direct input to tomorrow's SOD section 1. Be specific.

### Carryover items
- **In progress to continue:** copy from section 3
- **Blocked to monitor:** copy from section 4

### Suggested Today items for tomorrow
2-4 items GM should consider committing to tomorrow's Today section. Each item should match the Today table format.

| # | Item | Source | Estimate | Scope notes |
|---|---|---|---|---|
| 1 | ... | ... | ... | ... |

### Pipeline shifts to apply
- Items to add to Day +1-2: ...
- Items to add to Day +3-5: ...
- Items to drop from pipeline: ... with reason

### Watchouts for tomorrow
- ...

---

## Format rules to enforce

- Section 1 must have one row per Plan entry from today's SOD — none can be missing.
- Section 3 (in progress) and section 4 (blocked) must show up in section 10's Carryover.
- Section 8 must compare apples-to-apples: count of completed Today items vs count in today's SOD.
- Section 10's "Suggested Today items" must total 2-4. If fewer, the project is under-committed; if more, push some to Day +1-2.
