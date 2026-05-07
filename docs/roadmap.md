# Roadmap: golf
Refreshed at: 2026-05-09 (SOD Day 3 Phase 7)
Source: IMPLEMENTATION_CHECKLIST.md

## Active phase: Phase 7 — Full multi-bet cutover (#11)

**Main sweep complete (Skins + Nassau + Stroke Play CLOSED 2026-05-08). Remaining: perHoleDeltas.ts cutover + WF7-4 Cowork.**

### Wolf pilot

| Item | Status |
|---|---|
| WF7-0 — Plan doc | CLOSED 2026-05-07 |
| WF7-1 — wolfTieRule wizard config | CLOSED 2026-05-07 (commit 94ddeb5) |
| WF7-2 — aggregateRound cutover (Wolf) | CLOSED 2026-05-07 (commit 5a88052) |
| WF7-3 — multi-bet E2E spec | CLOSED 2026-05-07 (commit 4fbc72a) |
| **WF7-4 — Cowork visual verification** | **OPEN — pending GM scheduling** |

### Phase 7 sweep (payouts.ts aggregateRound cutover)

| Item | Status |
|---|---|
| Skins cutover | CLOSED 2026-05-08 (commit effb63d; SP1–SP10; 677 tests) |
| Nassau cutover | CLOSED 2026-05-08 (commit b528b52; NP1–NP10; 718 tests; netByPlayer) |
| Stroke Play cutover | CLOSED 2026-05-08 (commit 3a09d79; STP1–STP11+STP5b; 762 tests; F1 guard) |
| **perHoleDeltas.ts cutover** | **OPEN — Phase 7 #11 final code slice (deferred WF7-2)** |

### Nassau phase (parallel)

| Item | Status |
|---|---|
| NA-0 through NA-4, F11-PRESS-GAME-SCOPE | CLOSED 2026-05-01–2026-05-06 |
| **NA-5 — Cowork visual verification** | **OPEN — pending GM scheduling** |

## High priority

1. **perHoleDeltas.ts cutover** — sole remaining Phase 7 #11 code work. Single session (S).
2. **WF7-4** — Cowork visual verification. GM schedules; Code files closure report when findings arrive.
3. **NA-5** — Nassau Cowork. Can share WF7-4 session. GM schedules.

## Medium priority (backlog)

- Nassau buildHoleState 0-vs-undefined gap (parking-lot; filed 2026-05-08 doc 09)
- CLAUDE.md / AGENTS.md instruction-health sweep (Codex CWD discipline, stale refs)
- Phase 7 #11 closure declaration (after perHoleDeltas + WF7-4 close)
- Nassau phase closure declaration (after NA-5 closes)
- D4 — Nassau §7 press Junk annotation (docs, XS)
- F12-TIED-WITHDRAWAL-EVENT (engine, deferred)
- D1 sub-task B — Nassau §9 N35 (on hold)

## Low priority / backlog

- PUT-HANDLER-400-ON-MISSING-FIELDS
- TEES constant (hardcoded; deferred to course integration)

## Post-Phase-7 candidates (GM to decide)

| Option | Size |
|---|---|
| Match Play unpark | L |
| Junk Phase 3 (Sandy/Barkie/Polie/Arnie) | M |
| F12 engine fix (tied-withdrawal NassauWithdrawalSettled) | XS-S |
| Round-state verifier (parking-lot) | M |

See IMPLEMENTATION_CHECKLIST.md for full backlog and parking lot.
