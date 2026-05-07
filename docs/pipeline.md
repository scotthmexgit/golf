# Pipeline: golf
Last updated: 2026-05-07 (SOD Phase 7 Day 1)

## Today (Day 0)

| # | Item | Source | Estimate | Scope notes |
|---|---|---|---|---|
| 1 | Skill-path reconciliation | CLAUDE.md tech-debt / SOD in-scope | XS | Fix SKILL.md edge-case: `YYYY-MM-DD/` → `docs/yyyy-mm-dd/`, `EOD_*` → `eod.md`, `NNN` → `NN`. Commit. |
| 2 | Wolf Explore (Phase 7 kickoff) | SOD directive; Phase 7 #11 | S | Inventory engine, bridge, UI, schema, store, E2E. Produce `docs/2026-05-07/02-wolf-explore.md`. |
| 3 | Wolf Plan (Phase 7) | SOD directive; Phase 7 #11 | S | WF7-0–WF7-4 slicing. File inventory, schema delta, decisions D+E, 7 ground rules. STOP before Develop. |
| 4 | /codex:review on Wolf Plan | SOD success criteria | S | Findings in `docs/2026-05-07/04-wolf-plan-codex-review.md`. |

## Day +1 to +2 — committed next

| # | Item | Source | Estimate | Blocker if any |
|---|---|---|---|---|
| 1 | NA-5 — Nassau Cowork visual verification | NASSAU_PLAN.md §NA-5 | 1 session | Cowork scheduling; NA-4 Playwright green |
| 2 | WF7-1 — Wolf wizard config completeness | docs/2026-05-07/03-wolf-plan.md §WF7-1 | S | Blocked on GM Plan approval + Decision D |
| 3 | Wolf plan iteration (if GM feedback) | Plan review | XS | Blocked on GM reading 03-wolf-plan.md |

## Day +3 to +5 — planned

| # | Item | Source | Estimate |
|---|---|---|---|
| 1 | WF7-2 — `aggregateRound` cutover (payouts.ts + perHoleDeltas.ts) | 03-wolf-plan.md §WF7-2 | M |
| 2 | WF7-3 — Wolf multi-bet E2E spec | 03-wolf-plan.md §WF7-3 | S |
| 3 | Nassau phase closure (after NA-5) | NASSAU_PLAN.md §7 | XS |
| 4 | D4 — Nassau §7 press Junk annotation | IMPLEMENTATION_CHECKLIST.md backlog | XS |
| 5 | SCORECARD-DECISIONS-WIRING verification + close | Parking lot (may be already closed) | XS |

## Beyond +5
See IMPLEMENTATION_CHECKLIST.md for active scope, parking lot, and backlog. Last reviewed 2026-05-07 SOD.

Post-Phase-7-Wolf items: WF7-4 (Cowork), Phase 7 Skins/Nassau/SP sweep, Match Play unpark, Junk Phase 3, F12-TIED-WITHDRAWAL-EVENT fix.

## Active phase: Phase 7 — Full multi-bet cutover (#11)
- Wolf pilot: WF7-0 (Plan) — **TODAY** (Explore + Plan, awaiting GM approval)
- WF7-1 (wizard config): Day +1, blocked on GM approval + Decision D
- WF7-2 (aggregateRound): Day +3
- WF7-3 (E2E): Day +4
- WF7-4 (Cowork): Day +5

### Nassau (parallel — pending Cowork)
- NA-0 through NA-4: CLOSED
- F11-PRESS-GAME-SCOPE: CLOSED
- NA-5 (Cowork): Day +1 (pending Cowork scheduling)
