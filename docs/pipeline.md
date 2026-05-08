# Pipeline: golf
Last updated: 2026-05-08 (SOD Day 4 — date-correction: prior SOD Day 3 was misfiled to docs/2026-05-09/ but system date was 2026-05-08)

## Today (Day 0, 2026-05-08 session 2)

| # | Item | Source | Estimate | Scope notes |
|---|---|---|---|---|
| 1 | perHoleDeltas.ts cutover | Phase 7 #11 carry | S | Explore dispatch shape → Plan → STOP → Develop → adversarial. Approval gate before Develop. |
| 2 | Post-bundle Cowork follow-ups (4 items) | Post-bundle Cowork findings | S total | B4 auto-advance, B5 label clarity, B3 $0.00 vs '—', legacy bets investigation. Bundle all four. |
| 3 | Phase 8 direction discussion | GM | XS | After perHoleDeltas closes. Match Play? Junk Phase 3? F12? Nassau buildHoleState gap? |

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

## Active phase: Phase 7 — Full multi-bet cutover (#11)
- WF7-0–WF7-3: COMPLETE 2026-05-07
- WF7-4 (Cowork): OPEN — re-run session pending GM scheduling
- Phase 7 sweep (Skins/Nassau/Stroke Play): COMPLETE 2026-05-08
- B1–B6 Cowork bundle: COMPLETE 2026-05-08 (commit f679105)
- perHoleDeltas.ts cutover: OPEN — today's primary
- Post-bundle follow-ups: OPEN — today (4 items, XS–S each)

### Nassau (parallel — pending Cowork re-run)
- NA-0–NA-4, F11: CLOSED
- NA-5 (Cowork): OPEN — re-run session pending GM scheduling
