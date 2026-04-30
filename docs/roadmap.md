# Roadmap: golf
Refreshed at: 2026-04-30 (first DevFlow SOD)
Source: IMPLEMENTATION_CHECKLIST.md

## High priority
1. **Next phase: Wolf (Phase 8)** — unpark Wolf UI; engine complete at `src/games/wolf.ts`; bridge not yet created. Recommended at first DevFlow SOD over Nassau/Match Play (see SOD section 6 for rationale). Plan to be written at Day +1-2.

## Medium priority
- **PARKING-LOT-SKINS-1** — bet-row tap target ~23 px (below mobile guidelines); XS CSS fix
- **PARKING-LOT-SKINS-2** — hole-1 shows non-zero deltas before user input; S (suppress or pending state)
- **No mid-round home navigation** — no Exit Round / Pause surface on scorecard; M
- **PUT-HANDLER-400-ON-MISSING-FIELDS** — PUT handler returns 500 on missing fields; should return 400; backlog hardening item

## Low priority
- **Stepper par-default affordance** — stepper shows 0 while Zustand has par; S component fix
- **D1 sub-task B** — Nassau §9 N35 tied-withdrawal back-propagation; XS docs; gated on two open questions (see IMPLEMENTATION_CHECKLIST.md)
- **D2** — Junk game_junk.md §5 superseded-pseudocode annotation; XS docs; blocked on #7b Phase 3
- **D4** — Nassau §7 press inherits junkItems annotation; XS docs; independent of engine work
- **PARKING-LOT-SKINS-3** — documentation note: `/hole` label for Skins is correct and intentional

## Notes
- **Active phase:** none (phase boundary as of 2026-04-30 — Skins phase SK-0–SK-5 complete).
- **Phase 7** (full multi-bet cutover, REBUILD_PLAN #11) remains deferred until the third bet unparks — not eligible yet.
- **AGENTS.md** pointer is stale (reads SK-5 / Skins active); update scheduled as Today item #1.
- **session-logging skill** path drift flagged; update scheduled as Today item #1.
