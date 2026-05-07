# Roadmap: golf
Refreshed at: 2026-05-08 (SOD Day 2 Phase 7)
Source: IMPLEMENTATION_CHECKLIST.md

## Active phase: Phase 7 — Full multi-bet cutover (#11)

**Wolf pilot complete (WF7-0–WF7-3 CLOSED 2026-05-07). Active item: WF7-4 (Cowork).**

| Item | Status |
|---|---|
| WF7-0 — Plan doc | CLOSED 2026-05-07 (`docs/2026-05-07/03-wolf-plan.md`) |
| WF7-1 — wolfTieRule wizard config + GR1 correction | CLOSED 2026-05-07 (commit 94ddeb5) |
| WF7-2 — aggregateRound cutover, Wolf-pilot | CLOSED 2026-05-07 (commit 5a88052) |
| WF7-3 — multi-bet E2E spec (Wolf+Skins) | CLOSED 2026-05-07 (commit 4fbc72a) |
| **WF7-4 — Cowork visual verification** | **OPEN — pending GM scheduling** |
| Phase 7 sweep: Skins cutover | Not started — pending GM direction + WF7-4 gate |
| Phase 7 sweep: Nassau cutover | Not started — pending |
| Phase 7 sweep: Stroke Play cutover | Not started — pending |

## Nassau phase (parallel)

| Item | Status |
|---|---|
| NA-0 through NA-4, F11-PRESS-GAME-SCOPE | CLOSED 2026-05-01–2026-05-06 |
| **NA-5 — Cowork visual verification** | **OPEN — pending GM scheduling** |

## High priority

1. **WF7-4** — Cowork visual verification (Wolf wizard + multi-bet UI). GM schedules; Code files closure report when findings arrive.
2. **NA-5** — Nassau Cowork. Same hand-off; can run same Cowork session.
3. **Phase 7 sweep — Skins cutover** — `payouts.ts` Skins case → aggregateRound (Wolf pattern). Independent; can proceed if GM approves Skins as next.
4. **SCORECARD-DECISIONS-WIRING close** — Appears implemented at scorecard page:166–169 (`buildHoleDecisions` called, `decisions` in PUT body). Verify and formally close parking-lot item.

## Medium priority

- **perHoleDeltas.ts aggregateRound cutover** — deferred from WF7-2. Per-hole scorecard display still on per-bet dispatch. Phase 7 follow-on.
- **F12-TIED-WITHDRAWAL-EVENT** — pre-existing; deferred to engine pass post-Phase-7.
- **D4** — Nassau §7 press Junk annotation (XS, backlog).
- **D1 sub-task B** — Nassau §9 N35 tied-withdrawal documentation (on hold).

## Low priority / backlog

- Match Play unpark (engine exists; no bridge, UI, still `disabled: true`)
- Junk Phase 3 (Sandy/Barkie/Polie/Arnie stubs)
- PUT-HANDLER-400-ON-MISSING-FIELDS
- TEES constant (hardcoded; deferred to course integration)

See IMPLEMENTATION_CHECKLIST.md for full backlog and parking lot.
