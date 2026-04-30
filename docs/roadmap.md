# Roadmap: golf
Refreshed at: 2026-04-30 (SOD Session 2)
Source: IMPLEMENTATION_CHECKLIST.md + docs/plans/WOLF_PLAN.md

## High priority
1. **WF-6** — Playwright wolf-flow.spec.ts (S). New E2E spec covering Wolf declaration flows (partner, Lone Wolf, Blind Lone), per-player BetDetailsSheet Wolf totals, round completion. **Today #1.**
2. **WF-7** — Cowork phase-end visual verification (1 session). WolfDeclare UI, declaration persistence, sheet height, Exit Round. Wolf phase gate — phase does not close until WF-7 PASS. **Today #2.**

## Medium priority
- **Session-logging skill update** (XS) — skill file may still reference old `NNN_slug.md` root-relative path format; update to `NN-slug.md` docs/yyyy-mm-dd/ DevFlow format. Stretch if WF-6 closes quickly.
- **WOLF_PLAN.md stepper-affordance note** (XS) — §5 describes a bug (stepper shows 0 on mount) that WF-5 confirmed does not exist. Stale doc note; low-priority one-line edit.

## Low priority
- **PUT-HANDLER-400-ON-MISSING-FIELDS** — PUT handler returns 500 on missing fields; backlog hardening
- **PARKING-LOT-SKINS-2** — hole-1 shows non-zero deltas before input; closed by WF-5 (suppressBetDelta)
- **D1 sub-task B** — Nassau §9 N35 tied-withdrawal back-propagation; docs; gated on two open questions
- **D2** — Junk game_junk.md §5 superseded-pseudocode annotation; blocked on #7b Phase 3
- **D4** — Nassau §7 press inherits junkItems annotation; independent docs item

## Notes
- **Active phase:** Wolf — WF-6 is the current item.
- **WF-1–WF-5:** all CLOSED 2026-04-30. Reports at docs/2026-04-30/03-07.
- **Phase 7** (full multi-bet cutover, REBUILD_PLAN #11) deferred until third bet unparks.
- **PM2:** current build includes all WF-1–WF-5 changes. No rebuild needed before WF-6.
- **Per-prompt commit:** active from WF-5. WF-6 commits at reviewer APPROVED.
