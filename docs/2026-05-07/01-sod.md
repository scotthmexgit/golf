---
prompt_id: "01"
timestamp: 2026-05-07T00:00:00Z
session: 1
tags: [sod, phase-7, wolf]
---

# SOD: 2026-05-07

## Header

- **Date:** 2026-05-07
- **Session number:** 1
- **Filename:** sod.md
- **Day index:** 1 (first DevFlow day of Phase 7; first DevFlow SOD post-2026-04-30 phase boundary under the pipeline.md tracking model)
- **Prior EOD:** none — first DevFlow day in this format (pipeline.md last session was 2026-05-06; no prior EOD seed for this session)
- **Generated at:** 2026-05-07

---

## 1. Carryover from prior EOD

No prior EOD seed for this session. This is the first DevFlow day of Phase 7.

**Active checklist state at SOD:**
- Phase 6 (Skins): CLOSED 2026-04-30
- Wolf phase (WF-0–WF-7): CLOSED 2026-04-30
- Nassau phase: NA-pre-1–NA-4 CLOSED, F11-PRESS-GAME-SCOPE CLOSED
- **NA-5 (Cowork visual verification):** Active item in IMPLEMENTATION_CHECKLIST.md — still open
- Phase 7 (full multi-bet cutover, #11): begins today per GM directive; Wolf is the first target

**Note on NA-5:** The IMPLEMENTATION_CHECKLIST.md still shows NA-5 as the active item. Phase 7 begins today per GM direction. NA-5 (Nassau Cowork) should be scheduled separately and does not block today's Phase 7 Explore + Plan work, which produces only docs. NA-5 remains a pending hand-off to Cowork.

---

## 2. Issue tracker snapshot

*(Derived from IMPLEMENTATION_CHECKLIST.md at SOD)*

**Active:**
- NA-5: Nassau Cowork visual verification — pending Cowork session
- Phase 7 (#11): Full multi-bet cutover — BEGINS TODAY (Wolf pilot)

**Parking lot (selected items relevant to Phase 7):**
- SCORECARD-DECISIONS-WIRING: wolfPick persistence wiring — **appears closed** (scorecard page:166 calls buildHoleDecisions and includes decisions blob; verify at WF7-1)
- F12-TIED-WITHDRAWAL-EVENT: Tied withdrawal closes Nassau matches without event — pre-existing, not Phase 7 scope
- D4: Nassau §7 press Junk annotation — documenter task, backlog
- D1 sub-task B: Nassau §9 N35 tied-withdrawal — open question, not Phase 7 scope

**Known tech debt relevant to Phase 7:**
- `src/lib/payouts.ts` + `perHoleDeltas.ts`: still use per-bet bridge dispatch (no aggregateRound) — Phase 7 WF7-2 target
- Wolf bridge hardcoded defaults: tieRule, blindLoneEnabled, blindLoneMultiplier — Phase 7 WF7-1 target
- nassau-flow.spec.ts: EXISTS and passes (NA-4 closed) — CLAUDE.md project structure is stale on this point

---

## 3. Five-day pipeline

### Today (Day 0) — 4 items

| # | Item | Source | Estimate | Scope notes |
|---|---|---|---|---|
| 1 | Skill-path reconciliation | CLAUDE.md tech-debt note; SOD in-scope | XS | Fix SKILL.md edge-case section: old `YYYY-MM-DD/`, `EOD_*.md`, `NNN` → new DevFlow paths. Commit. |
| 2 | Wolf Explore | SOD directive; Phase 7 kickoff | S | Inventory Wolf engine, bridge, UI, schema, store, E2E. Produce `02-wolf-explore.md`. |
| 3 | Wolf Plan | SOD directive; Phase 7 kickoff | S | Propose WF7-0–WF7-4 slicing. Identify files, schema delta, decisions. STOP — no Develop. Produce `03-wolf-plan.md`. |
| 4 | /codex:review on Wolf Plan | SOD success criteria | S | Run codex review; triage findings; include in `04-wolf-plan-codex-review.md`. |

### Day +1 to +2 — committed next (≤6)

| # | Item | Source | Estimate | Blocker |
|---|---|---|---|---|
| 1 | NA-5 — Nassau Cowork visual verification | NASSAU_PLAN.md §NA-5; IMPLEMENTATION_CHECKLIST | 1 session | Blocked on Cowork scheduling; Nassau Playwright spec (NA-4) is green |
| 2 | WF7-1 — Wolf wizard config completeness | 03-wolf-plan.md §WF7-1 | S | Blocked on GM approval of Plan + Decision D |
| 3 | Wolf plan iteration (if GM has feedback) | Plan review | XS | Blocked on GM reading 03-wolf-plan.md |

### Day +3 to +5 — planned, lower confidence (≤5)

| # | Item | Source | Estimate |
|---|---|---|---|
| 1 | WF7-2 — `aggregateRound` cutover (payouts.ts + perHoleDeltas.ts) | 03-wolf-plan.md §WF7-2 | M |
| 2 | WF7-3 — Wolf multi-bet E2E spec | 03-wolf-plan.md §WF7-3 | S |
| 3 | Nassau phase closure (NA-5 Cowork closed) | NASSAU_PLAN.md §7 | XS |
| 4 | D4 — Nassau §7 press Junk annotation | IMPLEMENTATION_CHECKLIST.md backlog | XS |
| 5 | SCORECARD-DECISIONS-WIRING verification + close | Parking lot; Explore found it may be closed | XS |

### Beyond +5 — backlog reference

See IMPLEMENTATION_CHECKLIST.md for full backlog. Last reviewed 2026-05-07 SOD.

Key post-Phase-7 items:
- WF7-4: Cowork verification (Wolf multi-bet)
- Phase 7 sweep for Skins + Nassau + Stroke Play (after Wolf pilot validates pattern)
- Nassau Phase closure (post-NA-5)
- Match Play unpark (still disabled; no bridge or UI)
- Phase 8: Full #11 grep-gate sweep (post-Wolf pilot)
- Junk Phase 3 (Sandy/Barkie/Polie/Arnie stubs)
- F12-TIED-WITHDRAWAL-EVENT fix

---

## 4. Today's structured plan

### Plan entry 1 — Skill-path reconciliation

- **Maps to today item:** #1
- **Objective:** Fix SKILL.md edge-case section so all path examples use the DevFlow convention.
- **In scope:**
  - `YYYY-MM-DD/` → `docs/yyyy-mm-dd/` in the Midnight rollover bullet
  - `EOD_*.md` → `eod.md` in the same bullet
  - `NNN` → `NN` in Re-running bullet and frontmatter example
  - Commit the change with a session-log/skill prefix
- **Out of scope:**
  - Any other SKILL.md content
  - CLAUDE.md, AGENTS.md, IMPLEMENTATION_CHECKLIST.md
  - focus-discipline or golf-betting-rules skill files
- **Success criteria:** `grep -n "YYYY-MM-DD/" .claude/skills/session-logging/SKILL.md` returns 0 matches; `grep -n "EOD_" .claude/skills/session-logging/SKILL.md` returns 0 matches; commit exists.
- **Dependencies:** None.
- **Phase plan:** Mechanical edit. Steps 1–7 collapse to one edit + commit; no Codex review needed (doc-only, no code).

---

### Plan entry 2 — Wolf Explore

- **Maps to today item:** #2
- **Objective:** Produce a complete inventory of Wolf's current state as the Phase 7 starting point.
- **In scope:**
  - Engine location and public surface (`src/games/wolf.ts`)
  - Bridge exports (`src/bridge/wolf_bridge.ts`)
  - Existing tests (`src/games/__tests__/wolf.test.ts`, `src/bridge/wolf_bridge.test.ts`)
  - UI scaffolding already present (WolfDeclare.tsx, BetDetailsSheet.tsx, GAME_DEFS)
  - Schema fields (`wolfPick`, `loneWolfMultiplier`, HoleDecision table)
  - Store slices (`roundStore.ts` setWolfPick, wolfPick hydration)
  - Route conventions established by Skins / Stroke Play
  - Gap identification: what Phase 7 still needs
- **Out of scope:** Any implementation. No code changes.
- **Success criteria:** `docs/2026-05-07/02-wolf-explore.md` exists with engine, bridge, UI, schema, store, E2E, and gap sections.
- **Dependencies:** None.
- **Phase plan:** Explore-only. No Plan or Develop today.

---

### Plan entry 3 — Wolf Plan (Phase 7)

- **Maps to today item:** #3
- **Objective:** Propose implementation slicing for Phase 7 with Wolf as pilot, gated for GM approval before any Develop.
- **In scope:**
  - WF7-0 through WF7-4 slice definitions (wizard config, aggregateRound cutover, E2E, Cowork)
  - File inventory: created vs modified vs unchanged
  - Schema delta (wolfTieRule — Decision D)
  - Decisions requiring GM input before Develop (Decision D, Decision E)
  - All 7 ground rules acknowledged as constraints on Develop work
  - STOP marker before Develop
- **Out of scope:**
  - Any implementation code
  - Nassau, Skins, Stroke Play Phase 7 slices (Wolf pilot only)
  - Match Play (still disabled)
  - CLAUDE.md, AGENTS.md, IMPLEMENTATION_CHECKLIST.md edits
- **Success criteria:** `docs/2026-05-07/03-wolf-plan.md` exists with: WF7-0–WF7-4 slices, file inventory, schema delta, two open decisions, 7 ground rules acknowledged, explicit STOP marker.
- **Dependencies:** Plan entry 2 (Wolf Explore) must complete first.
- **Phase plan:** Plan-only. Steps 1-3, then STOP at approval gate (schema change triggers gate).

---

### Plan entry 4 — /codex:review on Wolf Plan

- **Maps to today item:** #4
- **Objective:** Run codex review on the Wolf Plan doc and file findings.
- **In scope:**
  - `/codex:review` run against working tree (03-wolf-plan.md + skill change)
  - Triage findings per high-confidence autonomous fix rules
  - File as `docs/2026-05-07/04-wolf-plan-codex-review.md`
- **Out of scope:** Any code changes in response to findings (those go in Develop, post-GM-approval).
- **Success criteria:** `docs/2026-05-07/04-wolf-plan-codex-review.md` exists; findings included or referenced in Plan doc.
- **Dependencies:** Plan entry 3 must complete first.
- **Phase plan:** Step 3 only (codex plan-review). Output filed as sibling doc.

---

## 5. Risks and watchouts for today

- **NA-5 still open in IMPL_CHECKLIST:** Phase 7 starts today per GM direction. Nassau Cowork (NA-5) is not blocked by today's work but should be scheduled. Flag to GM if Cowork is needed urgently.
- **aggregateRound signature gotcha:** `aggregateRound(log, roundCfg)` takes a pre-built event log, not `(holes, players, games)`. Plan must not suggest replacing bridge calls with aggregateRound directly. Codex review is the backstop.
- **Decision D schema delta:** wolfTieRule addition is small but triggers the approval gate. GM must select D-1/D-2/defer before WF7-1 proceeds.
- **SCORECARD-DECISIONS-WIRING:** Parking-lot item may already be closed — scorecard page:166 calls buildHoleDecisions. Verify at WF7-1 and close if confirmed.

---

## 6. Code's notes for this session

This is the first DevFlow day of Phase 7. Wolf is fully live (WF-0–WF-7 closed), so Phase 7 is about the orchestration-layer cutover (`aggregateRound`) and config completeness — not re-unparking Wolf from the game picker. The Explore + Plan today establishes the baseline; no code changes until GM approves the Plan.

The skill-path reconciliation (item 1) is mechanical and committed today. All other items (2–4) produce docs only. GM reviews Plan + codex findings before WF7-1 can start.

---

*SOD complete — awaiting GM review of pipeline counts and today's sequencing.*
