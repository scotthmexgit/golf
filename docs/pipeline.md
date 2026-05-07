# Pipeline: golf
Last updated: 2026-05-08 (SOD Phase 7 Day 2)

## Today (Day 0)

| # | Item | Source | Estimate | Scope notes |
|---|---|---|---|---|
| 1 | SCORECARD-DECISIONS-WIRING verify + close | Parking lot | XS | Scorecard page:166–169 calls buildHoleDecisions and includes decisions in PUT. Confirm in code, read parking-lot item text, formally close in IMPL_CHECKLIST. |
| 2 | Phase 7 sweep — Skins cutover (payouts.ts) | Phase 7 #11; Wolf pattern | S | Migrate Skins case in computeGamePayouts to aggregateRound orchestration. New payouts.test.ts Skins tests. Fence check (grep gate). |
| 3 | WF7-4 + NA-5 Cowork status / hand-off note | EOD carryover | XS | Note whether GM has scheduled Cowork; if so, queue findings. No Code work until findings arrive. |

## Day +1 to +2 — committed next

| # | Item | Source | Estimate | Blocker if any |
|---|---|---|---|---|
| 1 | WF7-4 — Cowork findings triage + closure | Phase 7 gate | S | Blocked on Cowork running |
| 2 | NA-5 — Nassau Cowork findings triage + closure | Nassau gate | S | Blocked on Cowork running |
| 3 | Phase 7 sweep — Nassau cutover (payouts.ts) | Phase 7 #11 | S | After Skins cutover; GM approves Nassau next |

## Day +3 to +5 — planned

| # | Item | Source | Estimate |
|---|---|---|---|
| 1 | Phase 7 sweep — Stroke Play cutover (payouts.ts) | Phase 7 #11 | S |
| 2 | Phase 7 sweep — perHoleDeltas.ts aggregateRound cutover | WF7-2 deferred scope | M |
| 3 | Phase 7 closure declaration (#11 fully closed) | Phase 7 #11 | XS |
| 4 | Nassau phase closure declaration (post-NA-5) | NASSAU_PLAN.md §7 | XS |
| 5 | D4 — Nassau §7 press Junk annotation | IMPLEMENTATION_CHECKLIST.md backlog | XS |

## Beyond +5
See IMPLEMENTATION_CHECKLIST.md. Post-Phase-7: Match Play unpark, Junk Phase 3, F12 engine fix.

## Active phase: Phase 7 — Full multi-bet cutover (#11)
- WF7-0–WF7-3: COMPLETE 2026-05-07
- WF7-4 (Cowork): OPEN — pending scheduling
- Phase 7 sweep: begins today (Skins) if GM approves

### Nassau (parallel — pending Cowork)
- NA-0–NA-4, F11: CLOSED
- NA-5 (Cowork): OPEN — pending scheduling
