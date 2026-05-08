# Pipeline: golf
Last updated: 2026-05-08 (EOD Day 4 — Phase 7 code work complete; Phase 8 direction set)

## Today (Day 0, 2026-05-08 session 2) — final status

| # | Item | Source | Actual |
|---|---|---|---|
| 1 | perHoleDeltas.ts cutover | Phase 7 #11 carry | **COMPLETE** — NHC1-NHC6 + comment cleanup; Phase 7 #11 code closed |
| 2 | Post-bundle Cowork follow-ups (4 items) | Post-bundle Cowork findings | **COMPLETE** — B3/B4/B5 shipped; (d) expected/won't fix |
| 3 | Phase 8 direction discussion | GM | **COMPLETE** — F12 first, then Match Play unpark + close-the-matrix |

## Day +1 (2026-05-09) — committed next

| # | Item | Source | Estimate | Blocker if any |
|---|---|---|---|---|
| 1 | Phase 7 #11 closure declaration | Phase 7 #11 | XS | After perHoleDeltas closes |
| 2 | WF7-4 formal closure (Cowork re-run) | Phase 7 gate | S | GM schedules re-run Cowork session |
| 3 | NA-5 formal closure (Cowork re-run) | Nassau gate | S | GM schedules re-run Cowork session |
| 4 | Nassau phase closure declaration | NASSAU_PLAN.md §7 | XS | After NA-5 closes |

## Day +2 to +3 — pending

| # | Item | Source | Estimate | Notes |
|---|---|---|---|---|
| 1 | Nassau buildHoleState 0-vs-undefined gap | Parking lot (2026-05-08) | S | Explore + Develop; separate slice |
| 2 | Phase 8 first slice (TBD by GM) | Phase 8 | TBD | GM decides after perHoleDeltas closes |
| 3 | D4 — Nassau §7 press Junk annotation | IMPL_CHECKLIST backlog | XS | Docs only |

## Day +4 to +5 — planned

| # | Item | Source | Estimate |
|---|---|---|---|
| 1 | Phase 8 slice 2 (TBD) | Phase 8 | TBD |
| 2 | F12 engine fix (tied-withdrawal) | Parking lot | XS-S |

## Beyond +5
Post-Phase-7: Match Play unpark (L), Junk Phase 3 (M), Round-state verifier (M). GM decides ordering.

## Phase 7 status
- WF7-0–WF7-3: COMPLETE 2026-05-07
- Phase 7 sweep (payouts.ts + perHoleDeltas.ts): COMPLETE 2026-05-08
- B1–B6 Cowork bundle + follow-ups: COMPLETE 2026-05-08
- WF7-4 (Cowork re-run): OPEN — GM-scheduled
- NA-5 (Cowork re-run): OPEN — GM-scheduled
- Phase 7 #11 code work: COMPLETE 2026-05-08

## Phase 8 — Match Play unpark + close-the-matrix
- F12 engine fix (Day 1 first slot): OPEN — `settleNassauWithdrawal` tied-match event gap
- Match Play Explore (Day 1 second slot): OPEN — bridge/wizard/E2E scope checklist
