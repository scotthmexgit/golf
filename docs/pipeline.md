# Pipeline: golf
Last updated: 2026-05-07 (EOD Phase 7 Day 1)

## Status at EOD

**Phase 7 Wolf pilot: WF7-0 through WF7-3 COMPLETE (ahead of plan).**
WF7-4 (Cowork) is the only remaining Wolf pilot slice — pending GM scheduling.

## Day +1 (next session)

| # | Item | Source | Estimate | Notes |
|---|---|---|---|---|
| 1 | WF7-4 — Cowork visual verification (Wolf pilot) | 03-wolf-plan.md §WF7-4 | 1 session | GM schedules Cowork hand-off; no Code work until findings received |
| 2 | NA-5 — Nassau Cowork visual verification | NASSAU_PLAN.md §NA-5 | 1 session | Pending Cowork scheduling; independent of WF7-4 |
| 3 | Phase 7 sweep planning — next bet after Wolf pilot | Post-WF7-4 GM decision | XS | GM decides: Skins, Nassau, or Stroke Play as next bet in aggregateRound sweep |

## Day +2 to +3 — committed next (post-WF7-4 approved)

| # | Item | Source | Estimate | Blocker |
|---|---|---|---|---|
| 1 | Phase 7 Skins cutover (payouts.ts + E2E update) | Phase 7 sweep, Wolf pattern | S | WF7-4 Cowork approved; GM selects Skins as next |
| 2 | Nassau phase closure declaration | NASSAU_PLAN.md §7 | XS | NA-5 Cowork approved |
| 3 | D4 — Nassau §7 press Junk annotation | IMPLEMENTATION_CHECKLIST.md backlog | XS | Independent; low priority |

## Day +3 to +5 — planned, lower confidence

| # | Item | Source | Estimate |
|---|---|---|---|
| 1 | Phase 7 Nassau cutover (payouts.ts + E2E) | Phase 7 sweep | S |
| 2 | Phase 7 Stroke Play cutover (payouts.ts) | Phase 7 sweep | S |
| 3 | perHoleDeltas.ts aggregateRound cutover (deferred from WF7-2) | WF7-2 deferred scope | M |
| 4 | SCORECARD-DECISIONS-WIRING verification + close | Parking lot (likely already closed) | XS |

## Beyond +5
See IMPLEMENTATION_CHECKLIST.md for full backlog. Last reviewed 2026-05-07 EOD.

Post-Phase-7 sweep: Match Play unpark (engine + bridge + UI still needed), Junk Phase 3, F12-TIED-WITHDRAWAL-EVENT fix.

## Phase 7 — Full multi-bet cutover (#11)
**Wolf pilot: COMPLETE 2026-05-07**
- WF7-0 (Plan): ✓ CLOSED
- WF7-1 (wolfTieRule wizard config): ✓ CLOSED 2026-05-07
- WF7-2 (aggregateRound cutover, Wolf-pilot): ✓ CLOSED 2026-05-07
- WF7-3 (multi-bet E2E spec): ✓ CLOSED 2026-05-07
- WF7-4 (Cowork verification): **OPEN — pending scheduling**

**Sweep (Skins, Nassau, SP): Day +2 onwards — depends on GM Phase 7 sweep decision**

### Nassau (parallel — pending Cowork)
- NA-0 through NA-4: CLOSED
- F11-PRESS-GAME-SCOPE: CLOSED
- NA-5 (Cowork): **OPEN — pending Cowork scheduling**
- Nassau phase closure: after NA-5 closes
