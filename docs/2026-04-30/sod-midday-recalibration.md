# SOD: 2026-04-30 (mid-session recalibration)

> **Note:** This document was generated mid-session on 2026-04-30 due to date drift in the AI context. It is NOT a Day 2 SOD — there was only one calendar day (2026-04-30). Preserved as-is (content remains accurate) with this header note added during EOD date-correction. The prior sod.md at docs/2026-04-30/sod.md is the authoritative Day 1 SOD.

## Header
- **Date:** 2026-04-30 (corrected from 2026-05-01)
- **Day index:** 1 (single DevFlow work session — date drift caused incorrect "Day 2" label)
- **Prior EOD:** docs/2026-04-30/eod.md
- **Generated at:** 2026-04-30 (corrected)

---

## 1. Carryover from prior EOD

Pulled from docs/2026-04-30/eod.md section 10.

- **In progress yesterday:** none — WF-0, WF-1, WF-2 all completed to reviewer APPROVED.
- **Blocked yesterday:** none.
- **Seed from prior EOD:** "Suggested Today items: WF-3 (Skins accordion → pop-up migration, S) and WF-4 (Exit Round surface, M). Stretch if both close quickly: WF-5 (Lone Wolf declaration gesture, M)." Watchouts: WF-3 must update skins-flow.spec.ts assertion group 4 in the same commit; PM2 rebuild needed before Cowork can verify WF-1+WF-2; console-exception triage unresolved; loneWolfMultiplier default (2× vs 3×) awaiting GM confirmation.

---

## 2. Issue tracker snapshot

Pulled from docs/roadmap.md (refreshed at this SOD from IMPLEMENTATION_CHECKLIST.md + WOLF_PLAN.md).

- **High priority open:** 2 — WF-3 (current active item), WF-4 (own slot for no-mid-round-nav parking lot)
- **Medium priority open:** 4 — WF-5 (Day+1-2), PM2 rebuild + Cowork verification, PARKING-LOT-SKINS-2, stepper par-default affordance
- **Recently opened (last 3 days):** 0 — no new items since 2026-04-30
- **Stale issues (>30 days no activity):** 0

---

## 3. Five-day pipeline

### Today (Day 0)

| # | Item | Source | Estimate | Scope notes |
|---|---|---|---|---|
| 1 | WF-3: Skins accordion → pop-up migration | WOLF_PLAN.md + EOD seed | S | Remove isExpanded/accordion/holeBreakdown from ScoreRow.tsx; Bet-row tap → openSheet(); update skins-flow.spec.ts group 4; reviewer gate required |
| 2 | WF-4: Exit Round surface | WOLF_PLAN.md WF-4 + parking-lot no-mid-round-nav | M | Exit trigger on scorecard (all holes); confirmation overlay; navigate to / on confirm; does NOT patch Complete; reviewer gate required |

### Day +1 to +2 — committed next

| # | Item | Source | Estimate | Blocker if any |
|---|---|---|---|---|
| 1 | WF-5: Lone Wolf declaration gesture | WOLF_PLAN.md | M | WF-3 preferred first (cleaner ScoreRow); SKINS-2 + stepper affordance ride alongside |
| 2 | PM2 rebuild + Cowork verification (WF-1/WF-2/WF-3) | operational | XS + session | WF-3 must land first; rebuild once, verify all three sub-items together |

### Day +3 to +5 — planned, lower confidence

| # | Item | Source | Estimate |
|---|---|---|---|
| 1 | WF-6: Playwright wolf-flow.spec.ts | WOLF_PLAN.md | S |
| 2 | WF-7: Cowork visual verification (Wolf phase gate) | WOLF_PLAN.md | 1 session |

### Beyond +5 — backlog reference

- See IMPLEMENTATION_CHECKLIST.md for active scope, parking lot, and backlog. Last reviewed 2026-04-30.

---

## 4. Today's structured plan

### Plan entry 1

- **Maps to today item:** #1
- **Objective:** Remove the inline accordion expand from `ScoreRow.tsx` and route the Bet-row tap to `BetDetailsSheet` via `openSheet()`, leaving `BetDetailsSheet` as the sole path to per-game per-hole breakdown.
- **In scope:**
  - `ScoreRow.tsx` — remove `isExpanded` state, the `useEffect` that resets it on hole change, and the accordion expand JSX (`{isExpanded && playerGames.map(...)}`); remove `holeBreakdown?: ...` from `ScoreRowProps`; change Bet-row `onClick` to call a new `onOpenSheet` prop (passed from parent)
  - `scorecard/[roundId]/page.tsx` — stop computing/passing `holeBreakdownForCurrentHole` to ScoreRow; add `onOpenSheet={() => openSheet()}` prop to each ScoreRow render
  - `tests/playwright/skins-flow.spec.ts` — update assertion group 4 (accordion expand) to use the sheet trigger instead: open the sheet, assert per-bet deltas are visible in the sheet content rather than in an inline expand
- **Out of scope:**
  - `BetDetailsSheet.tsx` — no changes; its content model is already correct
  - `holeTotal` and the Bet-row button itself remain in `ScoreRow.tsx` — only the expansion behavior and the `holeBreakdown` prop are removed
  - Wolf declaration, Exit Round, any settlement or engine files
  - `perHoleDeltas.ts` / bridge files (read-only)
- **Success criteria:**
  - `ScoreRow.tsx` has no `isExpanded`, no `useEffect` for accordion reset, no accordion expand JSX, no `holeBreakdown` prop
  - `ScoreRowProps` no longer includes `holeBreakdown`
  - `scorecard/[roundId]/page.tsx` no longer passes `holeBreakdown` to ScoreRow
  - Tapping the Bet-row on any player opens `BetDetailsSheet` (via `onOpenSheet`)
  - `skins-flow.spec.ts` passes with updated assertion group 4
  - `stroke-play-finish-flow.spec.ts` still passes
  - `npm run test:run` passes
  - `tsc --noEmit --strict` passes
  - Reviewer returns APPROVED
- **Dependencies:** none (WF-2 complete)
- **Phase plan:** Explore = confirm prop chain and exactly what to remove. Plan = list the removals. Develop = implement + update E2E spec. Reviewer gate. Report.

### Plan entry 2

- **Maps to today item:** #2
- **Objective:** Add an explicit Exit Round surface to the scorecard so players can leave a round intentionally without using browser back.
- **In scope:**
  - `scorecard/[roundId]/page.tsx` — add Exit trigger (location: engineer chooses between header `rightAction` slot or a dedicated item inside `BetDetailsSheet` header, per WOLF_PLAN.md WF-4 options; documents choice in report); add `showExitConfirm` local state and confirmation overlay (mirrors `showFinishConfirm` pattern); on confirm, navigate to `/`; on cancel, return to scorecard
  - Exit does NOT call `patchRoundComplete` — round status stays as-is (IN_PROGRESS)
  - Exit trigger available on all holes (not gated to last hole, unlike Finish)
- **Out of scope:**
  - Any settlement, score, or DB write on exit
  - BetDetailsSheet content changes (unless exit trigger is placed in sheet header — engineer documents)
  - WolfDeclare, WF-5, bridge/engine files
- **Success criteria:**
  - Exit trigger visible on scorecard on all holes 1–18
  - Tapping trigger shows confirmation overlay ("Leave this round?")
  - Confirming navigates to `/` (home); round status not changed
  - Cancelling dismisses overlay, returns to scorecard state unchanged
  - `npm run test:run` passes; `tsc --noEmit --strict` passes; reviewer APPROVED
- **Dependencies:** WF-3 preferred first (avoids a second simultaneous ScoreRow-adjacent edit), but not strictly blocking. If WF-3 runs long, WF-4 can proceed independently since it touches only `scorecard/[roundId]/page.tsx`
- **Phase plan:** Standard 4-phase. Reviewer gate required.

---

## 5. Risks and watchouts for today

- **WF-3 regression gate:** `skins-flow.spec.ts` assertion group 4 must be updated in the same commit as the ScoreRow change. Do not merge with a broken Playwright spec. If the spec update is non-trivial, surface to GM before filing the WF-3 report.
- **ScoreRow.tsx hot path:** WF-3 modifies the component that drives all active rounds. The Stroke Play regression (`stroke-play-finish-flow.spec.ts`) is the backstop — run it before filing WF-3.
- **`holeBreakdown` prop removal:** verify no other consumers of `holeBreakdown` or `holeBreakdownForCurrentHole` exist before deleting. A grep during Explore is sufficient.
- **WF-4 location decision:** WOLF_PLAN.md WF-4 offers two placement options (header rightAction or BetDetailsSheet header). Either is acceptable; document the choice in the report. The header slot is already getting crowded ("Summary" + "Bets" + optional "Finish") — engineer should note if header feels too busy and propose BetDetailsSheet placement instead.
- **Decisions GM needs from user:** (a) loneWolfMultiplier default — 2× acceptable or adjust to 3×? (b) console-exception triage — was it in Cowork findings-2026-04-30-0246.md? Code cannot action either without GM confirmation. These are not blockers for today's Today items.
- **Cowork checks queued:** PM2 rebuild + Cowork session for WF-1/WF-2/WF-3 should be scheduled for Day+1-2. GM should confirm timing.

---

## 6. Code's notes for GM

### Velocity calibration — Day 2 SOD adjusts upward

Day 1 baseline: 4 M-sized items in one session (with reviewer gates ~15–20 min each). Today's commit is 2 items (S + M). This is the right calibration: WF-3 touches live Skins code and requires a Playwright spec update — it warrants focus rather than rushing alongside a full WF-4. WF-4 is M-sized but straightforward (UI overlay, matches existing `showFinishConfirm` pattern). Both are achievable in one session.

If both close faster than expected, WF-5 is the obvious stretch. WF-5 is M-sized and has two parking-lot items riding alongside (SKINS-2, stepper affordance), so it would be a full prompt even if the core declaration UI is simple. Code will surface a stretch offer after WF-4 closes.

### PM2 rebuild timing

Cowork has not yet verified WF-1 (Wolf in picker) or WF-2 (BetDetailsSheet). Rebuild once after WF-3 lands so Cowork verifies all three sub-items in a single session. Rebuilding before WF-3 would require a second rebuild after WF-3 (which touches ScoreRow — a visible change). Recommend: PM2 rebuild at the start of Day+1-2, then a combined Cowork session.

### ScoreRow post-WF-3

After WF-3, `ScoreRow.tsx` will be cleaner: no local expansion state, no accordion JSX, no `holeBreakdown` prop. The only sheet-related interaction is a passed-in `onOpenSheet` callback on the Bet-row button. This sets up a clean base for WF-5, which needs to add `WolfDeclare` above the ScoreRow list — not inside ScoreRow itself.

### Open confirmations still pending from EOD

Neither open item is a Today blocker, but both should be resolved before WF-5 to avoid late-stage replanning:
- **loneWolfMultiplier default** (2× vs 3×): the roundStore.ts `addGame` sets 2 on Wolf game creation; the wizard Pills offer 2×/3×. If 3× is the intended default, it's a 1-line fix in roundStore.ts — trivial to bundle with WF-3 or WF-4.
- **Console-exception triage** (Cowork findings-2026-04-30-0246.md): if a console exception was observed, it may affect WF-6 (Playwright) if it's in the round-creation or scoring path. Earlier triage = more reliable WF-6 spec.
