# Pipeline: golf
Last updated: 2026-05-09 (SOD Phase 7 Day 3)

## Today (Day 0)

| # | Item | Source | Estimate | Scope notes |
|---|---|---|---|---|
| 1 | WF7-4 + NA-5 Cowork scheduling check | Phase 7 gate | XS | Has GM scheduled Cowork? If findings available, Code triages. If not, convert WF7-4/NA-5 to "blocked backlog" and move on. |
| 2 | perHoleDeltas.ts cutover (Explore + Plan + Develop) | Phase 7 #11; deferred WF7-2 | S | Final code slice for Phase 7 main sweep. Explore dispatch shape, then plan, then develop. Approval gate before Develop. |
| 3 | CLAUDE.md instruction-health touch | CLAUDE.md §instruction-health | XS | Codex CWD discipline note; nassau-flow.spec.ts gap; AGENTS.md pointer update. One commit. |

## Day +1 to +2 — committed next

| # | Item | Source | Estimate | Blocker if any |
|---|---|---|---|---|
| 1 | Phase 7 #11 closure declaration | Phase 7 #11 | XS | After perHoleDeltas closes |
| 2 | WF7-4 — Cowork findings triage + closure | Phase 7 gate | S | Blocked on Cowork running |
| 3 | NA-5 — Nassau Cowork findings triage + closure | Nassau gate | S | Blocked on Cowork running |
| 4 | Nassau phase closure declaration | NASSAU_PLAN.md §7 | XS | After NA-5 closes |

## Day +3 to +5 — planned

| # | Item | Source | Estimate |
|---|---|---|---|
| 1 | Nassau buildHoleState 0-vs-undefined gap | Parking lot (filed 2026-05-08) | S |
| 2 | Phase 8 direction decision (Match Play? Junk? F12?) | GM decision | XS |
| 3 | Phase 8 kickoff (first slice of whatever GM decides) | Phase 8 | TBD |
| 4 | D4 — Nassau §7 press Junk annotation | IMPL_CHECKLIST backlog | XS |

## Beyond +5
Post-Phase-7: Match Play unpark (L), Junk Phase 3 (M), F12 engine fix (XS-S), Round-state verifier (M). GM decides ordering.

## Active phase: Phase 7 — Full multi-bet cutover (#11)
- WF7-0–WF7-3: COMPLETE 2026-05-07
- WF7-4 (Cowork): OPEN — pending scheduling
- Phase 7 sweep (Skins/Nassau/Stroke Play): COMPLETE 2026-05-08
- perHoleDeltas.ts cutover: OPEN — today's target

### Nassau (parallel — pending Cowork)
- NA-0–NA-4, F11: CLOSED
- NA-5 (Cowork): OPEN — pending scheduling
