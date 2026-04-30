# Report: WF-2 scorecard pop-up shared primitive

## Header
- **Date:** 2026-04-30
- **Number:** 04
- **Type:** prompt
- **Title slug:** wf2-bet-details-sheet
- **Linked issues:** SKINS-1 (rides alongside)
- **Pipeline item:** Day+3-5 (Wolf phase WF-2, pulled into same session)

## Prompt (verbatim)

> Objective: Implement WF-2 per docs/plans/WOLF_PLAN.md. Build BetDetailsSheet.tsx — the slide-up bottom sheet [...] Decision E = (b) slide-up bottom sheet locked. The Skins inline accordion stays in place during WF-2 — its migration is WF-3.

## Scope boundaries
- **In scope:** `BetDetailsSheet.tsx` (new), `roundStore.ts` (sheet slice), `scorecard/[roundId]/page.tsx` (trigger + sheet render), `ScoreRow.tsx` (SKINS-1 CSS only), `perHoleDeltas.test.ts` (stale descriptions fixed + 2 new Wolf tests), AGENTS.md + IMPLEMENTATION_CHECKLIST.md
- **Out of scope:** Skins accordion migration (WF-3 — accordion untouched: `isExpanded`, `holeBreakdown`, accordion JSX all preserved). Wolf declaration, Exit Round, bridge/engine files.
- **Deferred:** none

## 1. Explore

- Files read: `roundStore.ts`, `perHoleDeltas.test.ts`, scorecard page (prior reads), `ScoreRow.tsx` (prior), `perHoleDeltas.ts` (prior)
- Key findings:
  - Vitest config: `environment: 'node'`, includes `src/lib/**` but not `src/components/**`. No DOM / React Testing Library → BetDetailsSheet cannot be component-tested. `perHoleDeltas.test.ts` is the right vehicle for data-shape tests.
  - `perHoleDeltas.test.ts` lines 76–88 and 96–108: described Wolf as "parked" but Wolf is live since WF-1. Assertions still passed (no wolfPick → no points events) but descriptions were stale. Fixed.
  - `roundStore.ts`: single `create<RoundStore>` — slice fits cleanly alongside existing state.
  - Trigger location: header `rightAction` already has a `flex gap-2` container for "Bets" + "Finish". Adding "Summary" button there is minimal and consistent.
  - SKINS-1 button: `className="w-full flex items-center justify-between border-t pt-1.5"` — `pt-1.5` is 6px, no bottom padding, ~23px total. Fix: `py-2 min-h-[40px]`.
  - Tailwind transition utilities sufficient: `transition-transform duration-300 ease-out`, `translate-y-full`, `translate-y-0`. No animation dependency needed.
- Constraints: BetDetailsSheet always rendered for CSS transitions — conditional `return null` would prevent close animation.

## 2. Plan

- **Approach:** Always-rendered component with CSS-driven slide/fade. Reads from `useRoundStore()` directly. `useMemo` on `computePerHoleDeltas` for performance. Single expanded key for accordion state.
- **Zustand slice:** `openSheet()` / `closeSheet()` pair (explicit, readable). Initialized false, reset to false.
- **Trigger:** header `rightAction` — "Summary" text button, renders when `games.length > 0`.
- **Unscored holes:** hidden (only `scoredHoles` where ≥1 player has gross > 0 are shown).
- **Accordion in sheet:** single-key expansion (`expandedKey: string | null`), `rowKey = "${holeNum}-${playerId}"`. Tap same row to collapse.
- **Test path:** update `perHoleDeltas.test.ts` (node-compatible, in scope). Two new tests verifying Wolf-with-pick produces entries (data the sheet depends on).
- **Files to change:** 4 existing + 1 new
- **Approval gate:** auto-proceed — no new dep, no schema, no engine change.

## 3. Develop

- **Commands run:**
  - `npm run test:run` (after all changes): exit 0 — 17 files, 441 tests (439 prior + 2 new)
  - `npx tsc --noEmit`: exit 0 (clean)
  - `npx playwright test`: exit 0 — 2/2 (skins-flow.spec.ts ✓, stroke-play-finish-flow.spec.ts ✓, including skins accordion assertion group 4 confirming accordion untouched)
- **Files changed:**
  - `src/components/scorecard/BetDetailsSheet.tsx` — created: props `{open, onClose}`, reads store, slide-up bottom sheet with accordion
  - `src/store/roundStore.ts` — added `sheetOpen: boolean`, `openSheet()`, `closeSheet()` to interface and impl; `sheetOpen: false` in initial state and `reset()`
  - `src/app/scorecard/[roundId]/page.tsx` — imported `BetDetailsSheet`; extracted `sheetOpen, openSheet, closeSheet` from store; added "Summary" trigger button (guarded by `games.length > 0`); added `<BetDetailsSheet>` render
  - `src/components/scorecard/ScoreRow.tsx` — bet-row button: `pt-1.5` → `py-2 min-h-[40px]` (SKINS-1 fix, CSS only)
  - `src/lib/perHoleDeltas.test.ts` — fixed 2 stale Wolf descriptions; added 2 new Wolf-live tests
- **Test results:** 441/441 vitest + 2/2 Playwright
- **Commits:** none — uncommitted working tree (commit at EOD)

## 4. Outcome

- **Status:** complete
- **Summary:** BetDetailsSheet slide-up sheet built as shared primitive; SKINS-1 tap target fixed; Wolf + Skins + Stroke Play data all surface through the sheet automatically; reviewer APPROVED.
- **For GM:** none — WF-2 done. Note: EOD section 8 pipeline drift conversation as flagged.
- **For Cowork to verify:**
  - "Summary" button appears in scorecard header when ≥1 game is active
  - Tapping "Summary" opens the sheet (slides up from bottom)
  - Sheet shows per-player rows for each scored hole, with gross score + total $/hole
  - Tapping a player row expands per-game breakdown (Skins / Wolf labels and amounts)
  - Backdrop tap and ✕ button both close the sheet
  - Bet-row buttons on hole-entry (Bet ▾/▴) have comfortable tap target (≥ 40px height)
  - Skins inline accordion (on hole-entry ScoreRow) still works — WF-2 did not migrate it
- **Follow-ups created:** None. WF-3 (Skins accordion → pop-up migration) is next.

## AC checklist

- [x] `BetDetailsSheet.tsx` exists under `src/components/scorecard/`
- [x] Slide-up transition: `translate-y-full` ↔ `translate-y-0`, `duration-300 ease-out`
- [x] Backdrop: `fixed inset-0 z-40 bg-black/40`, tap-to-close
- [x] Close button in sheet header
- [x] No game-type-specific props (`BetDetailsSheetProps = { open, onClose }`)
- [x] Trigger: renders when `games.length > 0`; in header rightAction
- [x] Data source: `computePerHoleDeltas` via `useMemo`
- [x] Per-player rows show gross + total $/hole + expandable per-game breakdown
- [x] "No holes scored yet" fallback when `scoredHoles.length === 0`
- [x] SKINS-1: `min-h-[40px]` on bet-row button
- [x] `roundStore.ts`: `sheetOpen`, `openSheet`, `closeSheet` + `sheetOpen: false` in `reset()`
- [x] 2 stale Wolf test descriptions fixed in `perHoleDeltas.test.ts`
- [x] 2 new Wolf-live data-shape tests added
- [x] 441/441 vitest
- [x] tsc clean
- [x] Playwright 2/2 (skins accordion assertion group 4 passes — accordion untouched)
- [x] Reviewer: APPROVED

## Plan deviation noted

None. BetDetailsSheet as implemented matches WOLF_PLAN.md WF-2 spec. Trigger placed in header rightAction (option a). Accordion-in-sheet uses single-key expansion pattern. No new dependencies.
