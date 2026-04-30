# Report: WF-4 Exit Round surface

## Header
- **Date:** 2026-04-30
- **Number:** 06
- **Type:** prompt
- **Title slug:** wf4-exit-round
- **Linked issues:** parking-lot no-mid-round-nav (own slot, now closed)
- **Pipeline item:** Today #6 (SOD 2026-04-30 — mid-session pull-forward)

## Prompt (verbatim)

> Objective: Implement WF-4 per docs/plans/WOLF_PLAN.md. Add an explicit Exit Round surface to the scorecard. Trigger available on all holes, confirmation overlay, navigate to / on confirm without patching round to Complete. [Full prompt as received from GM.]

## Scope boundaries
- **In scope:** `BetDetailsSheet.tsx` (header section only — option b placement); `scorecard/[roundId]/page.tsx` (showExitConfirm state, handlers, overlay, onExit wiring); AGENTS.md + IMPLEMENTATION_CHECKLIST.md
- **Out of scope:** Header rightAction (option a not chosen), ScoreRow, Stepper, bridge, engine, results, wizard pages
- **Deferred:** none

## 1. Explore

- Confirmed header crowding: on hole 18 with games active, header has "Summary" + "Bets" + "Finish" = 3 items. Adding a 4th ("Exit") via option (a) would create 4 items on a ~375px mobile header — untenable for comfortable tap targets.
- `BetDetailsSheet.tsx` header: `justify-between` with title span + ✕ button. Room for an "Exit Round" button between the title and ✕.
- `showFinishConfirm` pattern confirmed (lines 24, 175-177, 179-193, 292-313): `useState(false)` → `handleFinish` sets true → `confirmFinish` patches DB + navigates → overlay with Cancel/Confirm buttons.
- `useRouter` already imported (line 4); `router` instantiated (line 20).
- `useState` already imported (line 3).

## 2. Plan

- **Placement: option (b) — BetDetailsSheet header.** Header crowding observation from SOD section 5 confirmed at Explore. Adding Exit to the sheet header provides a natural "survey situation → decide to leave" UX flow. Two deliberate actions (open sheet + tap Exit) reduce accidental exits. Sheet header has room alongside the existing ✕ button.
- **Pattern:** Mirror `showFinishConfirm` exactly — same z-index, same overlay structure, same button layout. `confirmExit` calls only `router.push('/')` (no `patchRoundComplete`).
- **Files to change:** `BetDetailsSheet.tsx` (header section only), `scorecard/[roundId]/page.tsx`
- **Approval gate:** auto-proceed

## 3. Develop

- **Commands run:**
  - `npm run test:run`: exit 0 — 441/441
  - `npx tsc --noEmit`: exit 0 (clean)
  - `npx playwright test`: 2/2 pass (skins-flow + stroke-play-finish-flow)
- **Files changed:**
  - `src/components/scorecard/BetDetailsSheet.tsx` — `onExit?: () => void` prop added; header restructured from single ✕ to `<div className="flex items-center gap-2">` containing conditional "Exit Round" button + ✕. Sheet content, accordion, data wiring unchanged.
  - `src/app/scorecard/[roundId]/page.tsx` — `showExitConfirm` state; `handleExit()` (sets true); `confirmExit()` (sets false, `router.push('/')`); exit confirmation overlay JSX (mirrors showFinishConfirm style); `<BetDetailsSheet onExit={handleExit}>`
- **Test results:** 441/441 vitest + 2/2 Playwright
- **Commits:** uncommitted (EOD commit)

## 4. Outcome

- **Status:** complete
- **Summary:** Exit Round surface added to BetDetailsSheet header; confirmation overlay prevents accidental exits; navigates to / on confirm; round status untouched.
- **For GM:** parking-lot item "no mid-round home navigation" is closed by this sub-item. WF-5 (Lone Wolf declaration gesture) is next.
- **For Cowork to verify:** Open sheet (tap "Summary" or any Bet-row) → "Exit Round" button appears in sheet header (red) → tap → confirmation overlay ("Leave this round?", "Keep Playing" / "Leave") → "Keep Playing" dismisses overlay → "Leave" navigates to home page. Round still IN_PROGRESS after exiting and browsing back to the round list.
- **Follow-ups created:** none

## Reviewer note

First reviewer pass returned CHANGES_REQUESTED because the WF-3 ScoreRow.tsx changes (uncommitted, still in working tree) were visible alongside WF-4 changes. WF-3 had already received its own APPROVED review. Re-submitted with context; second review returned APPROVED for WF-4 changes in isolation. The underlying cause (all changes uncommitted until EOD) is a workflow artifact of the batch-commit pattern. Consider committing per-prompt (at reviewer APPROVED) rather than at EOD to give future reviewer gates a cleaner diff.

## AC checklist

- [x] `onExit?` prop added to `BetDetailsSheetProps`; renders "Exit Round" button in header when provided
- [x] `showExitConfirm` state independent of `showFinishConfirm`
- [x] `confirmExit` calls `router.push('/')` only; no `patchRoundComplete`, no DB write
- [x] Exit overlay style matches finish overlay (z-50, centered modal, dimmed backdrop, same button layout)
- [x] Both overlays mutually exclusive by state; no z-index conflict
- [x] Finish flow unchanged (handleFinish, confirmFinish, patchRoundComplete, results navigation)
- [x] Trigger available on all holes via BetDetailsSheet (sheet opens on any hole via Bet-row or Summary)
- [x] 441/441 vitest; tsc clean; Playwright 2/2
- [x] Reviewer: APPROVED
