# Roadmap: golf
Refreshed at: 2026-05-06 (SOD Session 1)
Source: IMPLEMENTATION_CHECKLIST.md

## Active phase: Nassau (NA-0–NA-5)

| Item | Status |
|---|---|
| NA-0 — Plan doc | CLOSED 2026-05-01 |
| NA-pre-1 — RoundingAdjustment emission | CLOSED 2026-05-01 (commit 572dc32) |
| NA-1 — Nassau bridge + cutover | CLOSED 2026-05-01 (commit 95e7c41) |
| NA-2 — Nassau wizard UI | CLOSED 2026-05-01 (commit 7509f24) |
| NA-3 — Press offer UI + decisions wiring | CLOSED 2026-05-01 (commit ac9d38b) |
| **NA-4 — Playwright spec** | **ACTIVE — unblocked** |
| NA-5 — Cowork visual verification | Blocked on NA-4 |

## High priority
1. **NA-4 — Nassau Playwright spec** (`tests/playwright/nassau-flow.spec.ts`) — 8 assertion groups per NASSAU_PLAN.md §NA-4. Dependencies met; no blockers. **Today #1.**
2. **IMPLEMENTATION_CHECKLIST.md grooming** — mark NA-3 CLOSED with commit hash, set NA-4 as active item, file F11/F12 deferred items. XS. **Today #2 (folds into NA-4 commit or stands alone).**

## Medium priority
- **F11-PRESS-GAME-SCOPE** — Press decisions not scoped to Nassau game instance; deferred follow-up from Codex NA-3 review. Low probability in production (typical rounds have 1 Nassau game). File and schedule; do not fold into NA-4.
- **F12-TIED-WITHDRAWAL-EVENT** — Tied withdrawal closes match without replayable event; pre-existing engine behavior. Deferred to engine pass post-NA-5.
- **Manual press button ("Request press")** — Stretch goal from NA-3; no UI for `pressRule='manual'` presses. Parking-lot item.
- **D4** — Nassau §7 press Junk annotation (docs) (XS)
- **WOLF_PLAN.md stepper-affordance stale note** (XS) — still open from prior session

## Low priority
- **PUT-HANDLER-400-ON-MISSING-FIELDS** — 500 on missing fields; backlog hardening (XS)
- **D1 sub-task B** — Nassau §9 N35 tied-withdrawal back-propagation; gated on two open questions
- **D2** — Junk game_junk.md §5 superseded-pseudocode annotation; blocked on #7b Phase 3
- **PARKING-LOT-SKINS-1** — bet-row tap target <44px height
- **PARKING-LOT-SKINS-2** — hole-1 shows non-zero deltas before input
- **Stepper par-default affordance** — stepper shows 0 while Zustand has par

## Closed phases
- **Wolf phase (WF-0–WF-7):** COMPLETE 2026-04-30
- **Skins phase (SK-0–SK-5):** COMPLETE 2026-04-30
- **Stroke Play phase (SP-1–SP-6, PF-1/PF-2):** COMPLETE 2026-04-29

## Notes
- **598/598 vitest tests passing as of NA-3 close. tsc clean.**
- **PM2 last rebuilt at NA-2/NA-3 — may need rebuild if NA-3 UI changes were not picked up.**
- **Nassau is live (GAME_DEFS disabled flag removed in NA-1).** Press confirmation modal live for auto modes. Manual press UI pending (NA-3 stretch goal not implemented).
- **Phase 7** (full multi-bet cutover) requires one more bet after Nassau. Match Play is the natural next candidate.
