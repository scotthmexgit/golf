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
