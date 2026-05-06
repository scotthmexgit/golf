# SOD: 2026-05-01 — Session 1

## Header
- **Date:** 2026-05-01
- **Day index:** 3 (third DevFlow work session)
- **Prior EOD:** docs/2026-04-30/eod-2.md (Session 2 — Wolf phase closure)
- **Generated at:** 2026-05-01

---

## 1. Carryover from prior EOD

**In progress yesterday:** none — Wolf phase closed clean. Both Session 2 plan entries completed.

**Blocked yesterday:** none.

**Seed from prior EOD (docs/2026-04-30/eod-2.md §10):**

| # | Item | Source | Estimate | Scope notes |
|---|---|---|---|---|
| 1 | Next-phase selection and plan | GM priority — Wolf phase closed | TBD | GM picks next bet (Nassau, Match Play, parking-lot sprint, or other). Code writes phase plan once GM decides. Cannot start without GM decision. |
| 2 | Session-logging skill path update | EOD Sessions 1 & 2 instruction-health | XS | Update `.claude/skills/session-logging/SKILL.md` Paths section: `./YYYY-MM-DD/NNN_slug.md` → `docs/yyyy-mm-dd/NN-slug.md`. Behavior rules unchanged. |
| 3 | CLAUDE.md commit-hygiene note | EOD Session 1 §9 | XS | Document per-prompt-commit workflow (adopted WF-5) in CLAUDE.md commit hygiene section. One-line addition. |

Watchout from prior EOD: WOLF_PLAN.md §5 has a stale note describing a stepper-shows-0-on-mount bug that WF-5 confirmed does not exist. One-line doc correction; can fold into next phase plan prompt.

---

## 2. Issue tracker snapshot

Refreshed from IMPLEMENTATION_CHECKLIST.md as of 2026-05-01.

- **High priority open:** 1
  - Next-phase selection (GM gate — no engineering starts without phase selection)

- **Medium priority open:** 3
  - Session-logging skill path update (XS)
  - CLAUDE.md commit-hygiene note (XS)
  - WOLF_PLAN.md stepper-affordance stale note (XS)

- **Recently opened (last 3 days):** 3
  - PARKING-LOT-SKINS-1 (tap target height, opened 2026-04-30)
  - PARKING-LOT-SKINS-2 (immediate settlement delta on load, opened 2026-04-30)
  - PARKING-LOT-SKINS-3 (docs note only, opened 2026-04-30)

- **Stale issues (>30 days):** 0 — DevFlow started 2026-04-20; no items aged past 30 days yet.

### Phase status summary

| Phase | Status |
|---|---|
| Skins (SK-0–SK-5) | COMPLETE 2026-04-30 |
| Wolf (WF-0–WF-7) | COMPLETE 2026-04-30 |
| Next phase | TBD — GM selects at this SOD |
| Phase 7 full multi-bet cutover | Deferred — blocked until third bet unparks |

**Active item:** none. 396/396 vitest tests. tsc clean. PM2 on commit 71b2b55 (WF-5-era; no source changes in WF-6/WF-7).

---

## 3. Five-day pipeline

### Today (Day 0)

| # | Item | Source | Estimate | Scope notes |
|---|---|---|---|---|
| 1 | Next-phase selection and plan | GM directive + EOD-2 seed | S–M | GM picks next bet or sprint. Code produces phase plan doc (docs/plans/<PHASE>_PLAN.md) + updates AGENTS.md + IMPLEMENTATION_CHECKLIST.md active item. No engineering until plan is approved. |
| 2 | Session-logging skill path update | EOD Sessions 1 & 2 instruction-health | XS | `.claude/skills/session-logging/SKILL.md` only. Path reference update. One commit. |
| 3 | CLAUDE.md commit-hygiene note | EOD Session 1 §9 | XS | Add one line to CLAUDE.md commit hygiene section documenting per-prompt-commit workflow. Can fold into plan commit or stand alone. |

### Day +1 to +2 — committed next

| # | Item | Source | Estimate | Blocker if any |
|---|---|---|---|---|
| 1 | Phase implementation — item 1 (first work item of next phase) | Phase plan approved at Today #1 | S–M | Blocked on Today #1 (phase selection + plan) |
| 2 | WOLF_PLAN.md stepper-affordance stale note correction | EOD Session 2 §10 watchouts | XS | One-line doc fix; independent; can fold into any next commit |
| 3 | PUT-HANDLER-400-ON-MISSING-FIELDS | IMPLEMENTATION_CHECKLIST.md backlog | XS | Independent; pick up any session |

### Day +3 to +5 — planned, lower confidence

| # | Item | Source | Estimate |
|---|---|---|---|
| 1 | Phase implementation — items 2–3 | Phase plan | TBD |
| 2 | D4 — Nassau §7 press Junk annotation (docs) | IMPLEMENTATION_CHECKLIST.md backlog | XS |
| 3 | D1 sub-task B — Nassau §9 N35 back-propagation | IMPLEMENTATION_CHECKLIST.md backlog — two gate questions | XS |
| 4 | Parking-lot sprint (SKINS-1, SKINS-2, Stepper affordance) | IMPLEMENTATION_CHECKLIST.md parking lot | S |

### Beyond +5 — backlog reference

- See IMPLEMENTATION_CHECKLIST.md for active scope, parking lot, and backlog. Last reviewed 2026-05-01 SOD.

---

## 4. Today's structured plan

### Plan entry 1 — Next-phase selection and plan

- **Maps to today item:** #1
- **Objective:** GM selects the next development phase; Code produces a phase plan doc and updates the active-item pointer.
- **In scope:**
  - GM declares next phase (candidates: Nassau UI phase, Match Play UI phase, parking-lot sprint, Junk #7b, or other)
  - Code writes `docs/plans/<PHASE>_PLAN.md` following the pattern of SKINS_PLAN.md / WOLF_PLAN.md
  - Code updates AGENTS.md "Active phase" and "Current item" lines
  - Code updates IMPLEMENTATION_CHECKLIST.md "Active item" section header
  - One commit: plan doc + pointer updates
- **Out of scope:**
  - Any engineering implementation — plan-only; engineering starts in a separate prompt
  - Changes to GAME_DEFS `disabled` flags (separate engineering prompt)
  - Decisions on deferred phases (Phase 7 full multi-bet cutover remains deferred)
- **Success criteria:** `docs/plans/<PHASE>_PLAN.md` exists with at minimum: Scope, Phase items table with ACs, Success gate, Out of scope. AGENTS.md and IMPLEMENTATION_CHECKLIST.md active-item pointers updated. GM approves plan before engineering begins.
- **Dependencies:** GM decision (cannot proceed without it)
- **Phase plan:** Explore: read IMPLEMENTATION_CHECKLIST.md backlog + existing plan docs for pattern. Plan: draft phase table + ACs. Develop: write plan doc + update pointers. Report: standard report to docs/2026-05-01/01-<phase>-plan.md.

### Plan entry 2 — Session-logging skill path update

- **Maps to today item:** #2
- **Objective:** Update the session-logging skill's path reference to match the DevFlow convention.
- **In scope:**
  - `.claude/skills/session-logging/SKILL.md` — change path format from `./YYYY-MM-DD/NNN_slug.md` to `docs/yyyy-mm-dd/NN-slug.md`
  - No behavior changes — path format only
- **Out of scope:**
  - Any other skill files
  - Changes to actual session-log behavior or rules
- **Success criteria:** SKILL.md path reference updated; grep for old `NNN_slug` pattern returns no matches in SKILL.md.
- **Dependencies:** none
- **Phase plan:** XS — single Edit + commit. No Explore phase needed.

### Plan entry 3 — CLAUDE.md commit-hygiene note

- **Maps to today item:** #3
- **Objective:** Document the per-prompt-commit workflow adopted at WF-5 in CLAUDE.md.
- **In scope:**
  - CLAUDE.md "Commit hygiene" section — add one line noting per-prompt commit workflow (commit at reviewer APPROVED gate, one commit per substantive prompt)
- **Out of scope:**
  - Other CLAUDE.md sections
  - Commit-style format changes
- **Success criteria:** CLAUDE.md commit hygiene section includes a note on per-prompt commit workflow.
- **Dependencies:** none (can fold into Plan entry 1 commit or stand alone)
- **Phase plan:** XS — single Edit.

---

## 5. Risks and watchouts for today

- **Risks:**
  - Phase selection is the only gate for engineering work today. If GM defers the decision, Today #1 produces only a brief "awaiting phase selection" note and the session is XS-only.
  - Nassau UI phase (if selected) is more complex than Skins/Wolf: no bridge exists yet for Nassau or Match Play. Plan needs a bridge-before-UI item or explicit deferral.
  - Match Play UI phase: same bridge gap as Nassau.
  - Parking-lot sprint (if selected): no single plan doc needed — items are independent; phase plan becomes a checklist-style doc.

- **Decisions GM needs from user:**
  - **Which phase is next?** Candidates in rough order:
    1. Nassau UI phase (bet #3 unparks → enables Phase 7 multi-bet cutover path)
    2. Match Play UI phase (bet #4)
    3. Parking-lot sprint (UX fixes: SKINS-1 tap target, SKINS-2 delta suppression, Stepper affordance)
    4. Junk #7b (Sandy/Barkie/Polie/Arnie — gated on Polie schema decision)
    5. Instruction-health / housekeeping sprint only

- **Cowork checks queued:** none today (XS plan; no UI changes). Cowork needed after first engineering prompt of the new phase.

---

## 6. Code's notes for GM

- **Codebase health:** Clean at phase boundary. 396/396 vitest, tsc clean, PM2 on 71b2b55. No regressions since WF-5 build.
- **Nassau/Match Play bridge gap:** `src/bridge/` has only `skins_bridge.ts` and `stroke_play_bridge.ts`. Nassau and Match Play engines are complete under `src/games/` but have no UI bridge. A Nassau or Match Play UI phase will need a bridge as its first item (analogous to WF-1 for Wolf).
- **Wolf bridge pattern:** `src/bridge/wolf_bridge.ts` is the most recent bridge example; use as the pattern for any new bridge.
- **GAME_DEFS disabled flags:** Nassau, Match Play, Wolf, Junk are currently `disabled: true` in `src/types/index.ts`. Unparking a game requires flipping the flag as part of the phase plan.
- **Two XS housekeeping items (Today #2/#3)** can close in a single combined commit — recommend folding them together to keep commit history clean.
