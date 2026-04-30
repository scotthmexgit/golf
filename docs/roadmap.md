# Roadmap: golf
Refreshed at: 2026-05-01 (SOD Day 2)
Source: IMPLEMENTATION_CHECKLIST.md + docs/plans/WOLF_PLAN.md

## High priority
1. **WF-3** — Skins accordion → pop-up migration (S). Remove `isExpanded` and accordion JSX from `ScoreRow.tsx`; connect Bet-row tap to `openSheet()`; update `skins-flow.spec.ts` assertion group 4. **Today #1.**
2. **WF-4** — Exit Round surface (M). Own slot for parking-lot no-mid-round-navigation item. Add Exit button to scorecard, confirmation overlay, navigate to `/`. **Today #2.**

## Medium priority
- **WF-5** — Lone Wolf declaration gesture (M). Day+1-2. SKINS-2 (hole-1 immediate settlement) and stepper par-default affordance ride alongside.
- **PM2 rebuild + Cowork verification** — operational XS + Cowork session. WF-1+WF-2 UI changes unverified by Cowork. Day+1-2 after WF-3 lands (rebuild once, verify WF-3 too).
- **WF-6** — Playwright wolf-flow.spec.ts (S). Day+3-5.
- **WF-7** — Cowork visual verification (1 session). Day+3-5. Phase-end gate.

## Low priority
- **PARKING-LOT-SKINS-2** — hole-1 shows non-zero deltas before input; rides alongside WF-5
- **Stepper par-default affordance** — stepper shows 0 while Zustand has par; rides alongside WF-5
- **PUT-HANDLER-400-ON-MISSING-FIELDS** — PUT handler returns 500 on missing fields; backlog hardening
- **D1 sub-task B** — Nassau §9 N35 tied-withdrawal back-propagation; docs; gated on two open questions
- **D2** — Junk game_junk.md §5 superseded-pseudocode annotation; blocked on #7b Phase 3
- **D4** — Nassau §7 press inherits junkItems annotation; independent docs item
- **PARKING-LOT-SKINS-3** — documentation note only (Skins /hole label is correct)

## Notes
- **Active phase:** Wolf — WF-3 is the current item.
- **Phase 7** (full multi-bet cutover, REBUILD_PLAN #11) deferred until third bet unparks.
- **Console-exception triage** (Skins EOD): GM to confirm whether Cowork findings-2026-04-30-0246.md contained a console exception; Code cannot action without confirmation.
- **loneWolfMultiplier default** (2× vs plan's 3×): waiting GM confirmation; if 2× is acceptable, no action needed.
