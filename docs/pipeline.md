# Pipeline: golf
Last updated: 2026-04-30 (EOD Day 1 correction)

## Today (Day 0)

| # | Item | Source | Estimate | Scope notes |
|---|---|---|---|---|
| 1 | WF-3: Skins accordion → pop-up migration | WOLF_PLAN.md + EOD seed | S | Remove isExpanded/accordion/holeBreakdown from ScoreRow.tsx; connect Bet-row to openSheet(); update skins-flow.spec.ts group 4; reviewer gate |
| 2 | WF-4: Exit Round surface | WOLF_PLAN.md WF-4 + parking-lot | M | Exit trigger on scorecard; confirmation overlay; navigate to /; does NOT patch Complete; reviewer gate |

## Day +1 to +2 — committed next

| # | Item | Source | Estimate | Blocker if any |
|---|---|---|---|---|
| 1 | WF-5: Lone Wolf declaration gesture | WOLF_PLAN.md | M | WF-3 should land first (cleaner ScoreRow) |
| 2 | PM2 rebuild + Cowork WF-1/WF-2/WF-3 verification | operational | XS + session | WF-3 must land first; rebuild once, verify all |

## Day +3 to +5 — planned

| # | Item | Source | Estimate |
|---|---|---|---|
| 1 | WF-6: Playwright wolf-flow.spec.ts | WOLF_PLAN.md | S |
| 2 | WF-7: Cowork visual verification (Wolf phase gate) | WOLF_PLAN.md | 1 session |

## Beyond +5
See IMPLEMENTATION_CHECKLIST.md for active scope, parking lot, and backlog. Phase 7 (full multi-bet cutover, REBUILD_PLAN.md #11) deferred until third bet unparks.

## Active phase: Wolf
- WF-0 (plan): CLOSED 2026-04-30
- WF-1 (bridge + cutover): CLOSED 2026-04-30
- WF-2 (BetDetailsSheet + SKINS-1): CLOSED 2026-04-30
- WF-3 (Skins accordion migration): **Today #1**
- WF-4 (Exit Round): **Today #2**
- WF-5 (Lone Wolf declaration): Day+1-2
- WF-6 (Playwright): Day+3-5
- WF-7 (Cowork): Day+3-5
