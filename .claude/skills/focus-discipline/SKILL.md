---
name: focus-discipline
description: Enforce one-active-task-at-a-time discipline. Before responding to any prompt, confirm alignment with the current IMPLEMENTATION_CHECKLIST.md Active item; surface mismatches before doing work; route tangents to the Parking Lot.
---

# Focus discipline

## Trigger

Every prompt. Before doing any work:

1. Read `./IMPLEMENTATION_CHECKLIST.md` **Active item**.
2. Check the prompt aligns. If it does not — **stop, surface the mismatch, ask before proceeding**. Do not start work.
3. At the start of each session and after any context switch, state the active item verbatim in the response before doing anything else.

## Parking Lot rules

Any tangent, new idea, discovered bug, or "while we're here" thought:
- Append one line to `IMPLEMENTATION_CHECKLIST.md` **Parking Lot**: `- [ ] <one-line description> — YYYY-MM-DD — prompt NNN`.
- Do **not** act on it.
- In the per-prompt log, add it under "Parking lot additions" with the same text.

## Scope-creep signals (explicit list — treat as triggers)

User or Claude saying any of these:
- "while we're at it"
- "also"
- "quick fix"
- "just one more thing"
- "it would be cool if"
- "small improvement"
- "already in here so"

When triggered, respond with a scope-check prompt, not with work:

> This is outside active checklist item #N ("<title>"). Options: (1) park it and continue the active item, (2) switch active item to the new work, (3) log a deferral and finish active item first. Which?

Do not proceed until the user picks.

## Re-focus protocol

At start of session / after a break / after `/clear`:

1. Read `IMPLEMENTATION_CHECKLIST.md`.
2. State the Active item verbatim in the first sentence of the response: `Active item: #N — <title>. Acceptance criteria: <criteria>. Proceeding.`
3. Only then do work.

## What this skill does NOT do

- Does not veto the user's scope-change decisions. The user can always switch Active item.
- Does not silently re-prioritize. Backlog reordering requires an explicit prompt.
- Does not delete Parking Lot entries. Triage happens at EOD-FINAL or on explicit user request.

## Commit-split discipline

When producing a staging plan and an entanglement is found — changes A and B cannot be
hunk-selected apart from the working tree without one intermediate state failing tests or
tsc — follow this procedure:

1. Name the entanglement specifically: state which lines of change B depend on change A
   being present, and why staging B without A fails.
2. Present two options explicitly:
   - **Construct intermediate state**: write the file to an A-only disk state, stage and
     commit A, then apply B on top and commit B. Preserves the original grouping.
   - **Bundle**: accept A+B in one commit. State the reason.
3. **Do not proceed until the user picks one.** "Continue" is not a choice when two
   options are on the table. If the response is ambiguous, ask again before staging.

This rule applies regardless of whether the entanglement was reported in the staging plan.
Reporting an entanglement in the plan and then receiving any non-explicit-choice response
does not constitute approval to bundle.

Retroactive splitting is harder, slower, and requires constructing a state that was never committed. Pay the discipline cost at commit time.
