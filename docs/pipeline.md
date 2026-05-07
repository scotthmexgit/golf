# Pipeline: golf
Last updated: 2026-05-09 (EOD Phase 7 Day 3)

## Today (Day 0) — final status

| # | Item | Source | Actual |
|---|---|---|---|
| 1 | WF7-4 + NA-5 Cowork scheduling check | Phase 7 gate | Escalated — findings arrived; bundle shipped; formal closure re-run still pending |
| 2 | perHoleDeltas.ts cutover | Phase 7 #11 | **DEFERRED** to 2026-05-10 — Cowork bundle consumed capacity |
| 3 | CLAUDE.md instruction-health touch | CLAUDE.md | COMPLETE ✓ |

## Day +1 (2026-05-10) — committed next

| # | Item | Source | Estimate | Notes |
|---|---|---|---|---|
| 1 | perHoleDeltas.ts cutover | Phase 7 #11 carry | S | Explore → Plan → STOP → Develop → adversarial review |
| 2 | Post-bundle Cowork follow-ups (4 items) | Post-bundle Cowork | S total | B5 auto-advance, B5 label clarity, B3 $0.00 vs '—', legacy bets investigation |
| 3 | Phase 8 direction discussion | GM | XS | After perHoleDeltas closes |

## Day +2 — pending

| # | Item | Source | Estimate | Blocker |
|---|---|---|---|---|
| 1 | Phase 7 #11 closure declaration | Phase 7 #11 | XS | After perHoleDeltas closes |
| 2 | WF7-4 formal closure (Cowork re-run) | Phase 7 gate | S | GM scheduling re-run session |
| 3 | NA-5 formal closure (Cowork re-run) | Nassau gate | S | GM scheduling re-run session |
| 4 | Nassau phase closure declaration | NASSAU_PLAN.md §7 | XS | After NA-5 closes |

## Day +3 to +5 — planned

| # | Item | Source | Estimate |
|---|---|---|---|
| 1 | Nassau buildHoleState 0-vs-undefined gap | Parking lot (2026-05-08) | S |
| 2 | Phase 8 kickoff (first slice, TBD by GM) | Phase 8 | TBD |
| 3 | D4 — Nassau §7 press Junk annotation | IMPL_CHECKLIST backlog | XS |

## Beyond +5
Post-Phase-7: Match Play unpark (L), Junk Phase 3 (M), F12 engine fix (XS-S), Round-state verifier (M). GM decides ordering.

## Active phase: Phase 7 — Full multi-bet cutover (#11)
- WF7-0–WF7-3: COMPLETE 2026-05-07
- WF7-4 (Cowork): OPEN — re-run pending scheduling
- Phase 7 sweep (Skins/Nassau/Stroke Play): COMPLETE 2026-05-08
- perHoleDeltas.ts cutover: OPEN — tomorrow's primary

### Cowork bundle B1–B6: COMPLETE 2026-05-09
- B1–B5: code fixes shipped (commit f679105)
- B6: spec update shipped (cowork-claude.md)
- Post-bundle Cowork follow-ups (4 items): queued for 2026-05-10

### Nassau (parallel — pending Cowork re-run)
- NA-0–NA-4, F11: CLOSED
- NA-5 (Cowork): OPEN — re-run pending scheduling
