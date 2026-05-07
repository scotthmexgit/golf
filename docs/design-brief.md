<!-- DEVFLOW GENERATED FILE
     DevFlow version: 1.0
     Generated at: 2026-05-06 13:23
     Template source: hub-instructions.md (design-brief scaffold)
     Status: BLANK — fill at first UI SOD before any UI prompt proceeds past Plan.
     Refresh policy: this file is project-owned. DevFlow does not regenerate it on re-onboard. Update it as design intent evolves.
-->
# Design brief: golf

This file is the source of truth for "what good looks like" for users. Every UI prompt anchors against this brief. Cowork verifies against it. Codex post-review on UI changes reads it as context.

**Status: BLANK — to be filled at first UI SOD.** PLANNER captured the user goal as the north star; design specifics deferred. Code stops UI work at Plan and asks GM to fill before continuing.

## User goal (verbatim from PLANNER handoff)
v1 lets users create a golf round, add players, and run stroke + wolf + nassau or match play bets concurrently with clear per-bet results.

The phrase "clear per-bet results" is the user's stated UI acceptance bar. First UI SOD must turn this into concrete acceptance criteria below.

## Target user
- Primary user persona: TBD — fill at first UI SOD
- Context of use: TBD — current deployment is PM2 at `localhost:3000/golf` accessed over Tailscale; likely desktop or laptop in a casual setting (golf course clubhouse? home? on-course?). Confirm with user.
- Existing alternatives they use: TBD — paper scorecards? other apps? mental tally?

## Primary workflows
List the 1-3 workflows that define v1 success. For each:
- Workflow name: TBD
- Steps: TBD (max 5 steps; if more than 5, the workflow is too complex)
- Primary action: TBD (the single most important button/interaction)
- Success state: TBD (what the user sees when this workflow completes)

**Seed from PLANNER first milestone:** "A user can create a round, add 1-5 players, start one of the functional bets, enter scores hole-by-hole, and see live standings." This implies at minimum:
- Workflow 1: round setup (create round → add players → pick bet)
- Workflow 2: hole-by-hole score entry (gross score per player per hole)
- Workflow 3: live standings view (per-bet results, updated after each hole)

First UI SOD refines.

## Simplicity principles (defaults — adjust if project has reason to deviate)
Every UI prompt is checked against these:
- **Minimum clicks to primary action.** State the click count from app open to primary action complete. TBD for this project.
- **No required fields beyond essential.** Every required form field must be defended.
- **Clear empty / loading / error states.** Every screen specifies all four states (default, empty, loading, error). Missing states are blockers.
- **Mobile-first reachability** — **CONFIRM AT FIRST UI SOD.** This project's runtime context (PM2 on a Linux server accessed via Tailscale at `localhost:3000/golf`) suggests desktop-first or device-agnostic, NOT mobile-first. The default below is wrong for this project until confirmed otherwise.
- **No surprise navigation.** Back button always returns to the previous logical screen. Modals dismiss without losing user input.

## Breakpoints
TBD at first UI SOD. Defaults below; cross out / adjust based on confirmed device target:
- Mobile: 375 px (iPhone SE baseline) — likely OPTIONAL for this project given runtime context
- Tablet: 768 px — likely OPTIONAL
- Desktop: 1280 px — likely REQUIRED (primary target)
- Wide: 1920 px — TBD

## Visual acceptance criteria
- **Color palette:** TBD at first UI SOD
- **Typography:** TBD — Tailwind 4 defaults are starting point
- **Component library:** custom components in `src/components/ui/` per project structure (no shadcn or MUI)
- **Spacing scale:** Tailwind 4 default scale
- **Motion:** minimal — only meaningful transitions (TBD; adjust if there's reason)

## A11y target
- Contrast ratio: minimum WCAG AA (4.5:1 body, 3:1 large text). Override only with documented reason.
- Keyboard reachability: 100% of primary workflows operable without mouse.
- Screen reader: semantic HTML / ARIA where needed.
- Reduced motion: respect `prefers-reduced-motion`.

## Out of scope (design boundaries)
TBD at first UI SOD. Likely candidates per PLANNER and audit:
- Match Play UI — engine exists but no bridge; explicitly out of v1 unless user reverses
- Junk Phase 3 (Sandy/Barkie/Polie/Arnie) — deferred per tech debt note
- Internationalization, dark mode, offline mode — none mentioned by user as v1 needs

## Open questions
Track design questions that need resolution. Each becomes a first-UI-SOD agenda item.
- Is the primary device desktop (per runtime context) or mobile (per common golf-app expectation)?
- "Concurrent" bets in the goal — does this mean multiple bets share one score-entry path (one input, all bets settle)? Or separate UIs per bet that run in parallel?
- "Per-bet results" — single combined view with per-bet sections, or separate result screens?
- Nassau vs Match Play in v1 — both required, or alternatives the user picks between?
