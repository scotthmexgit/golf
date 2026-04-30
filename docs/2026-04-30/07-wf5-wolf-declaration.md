# Report: WF-5 Lone Wolf declaration gesture + SKINS-2 + Stepper affordance

## Header
- **Date:** 2026-04-30
- **Number:** 07
- **Type:** prompt
- **Title slug:** wf5-wolf-declaration
- **Linked issues:** SKINS-2 (hole-1 non-zero delta suppression); stepper-affordance (par-default display)
- **Pipeline item:** Today #7 (SOD 2026-04-30 — stretch pull-forward from Day+1-2)

## Prompt (verbatim)

> Objective: Implement WF-5 per docs/plans/WOLF_PLAN.md. Add the per-hole Wolf declaration UI (WolfDeclare.tsx) to the scorecard hole-entry screen, render only when a Wolf game is active. Two parking-lot items ride alongside: SKINS-2 (hole-1 delta suppression until user edit), stepper par-default affordance. Reviewer gate required. Per-prompt commit at reviewer APPROVED.

## Scope boundaries
- **In scope:** `WolfDeclare.tsx` (new); `Stepper.tsx` (`initialValue?` prop); `ScoreRow.tsx` (`showBetDelta`, `onScoreEdit`); `roundStore.ts` (`setWolfPick` type); `scorecard/[roundId]/page.tsx` (WolfDeclare render + suppressBetDelta state + handleHoleChange); AGENTS.md + IMPLEMENTATION_CHECKLIST.md
- **Out of scope:** BetDetailsSheet wolf-captain annotation (WF-9/deferred), blind-lone timing enforcement, player withdrawal UI, wolf bridge changes, engine changes, wizard/results/bets pages, Playwright wolf-flow.spec.ts (WF-6)

## 1. Explore

- **`getWolfCaptain` signature:** `(hole, game, players, eventsSoFar?) → { captain: PlayerId; events: ScoringEvent[] }`. Filters internally to `game.playerIds` — pass all players, bridge handles filtering. Captain is a `PlayerId` (string); look up display name via `players.find(p => p.id === captain)`.
- **`Stepper.tsx` is fully controlled** — no local state. Renders `{value}` directly. `onChange` fires immediately on button click. ScoreRow already passes `value={score || par}`, so the stepper already displays par on mount when score is 0. The "stepper shows 0" bug described in the prompt does not exist in the current code. `initialValue` prop is added as a documented no-op for API completeness and forward-compatibility; no local state is required or added.
- **`setWolfPick` already exists** in roundStore.ts (line 316). Type annotation was `string | 'solo'` (= `string` in TS — union collapses). Updated to `'solo' | 'blind' | string` for documentation clarity. Implementation renamed `partnerId` → `pick` for alignment.
- **SKINS-2 spec safety:** `skins-flow.spec.ts` checks the hole-7 bet row amount (+$20.00) AFTER a `page.reload()`. On reload, React state reinitializes: `suppressBetDelta = false` → delta shows immediately → spec passes without modification. The only hole-6 interaction in the spec (decrement Bob/Carol) calls ScoreRow's Stepper `onChange` → `onScoreEdit` → `suppressBetDelta = false` before the sheet is opened. No spec changes needed.
- **Stepper consumers:** Only `ScoreRow.tsx` renders `<Stepper />`. No other consumers found.

## 2. Plan

- **WolfDeclare UX:** Button-group style — all options always visible (partner pills + Lone Wolf + Go Blind), selected option highlighted with `var(--green-deep)` / `var(--sand)`. No separate summary/edit toggle. Summary label rendered below the buttons when a pick is made. "No declaration yet" in amber (#d97706) when undeclared. No blocking on "Save & Next Hole" — undeclared holes produce WolfDecisionMissing (zero delta) in the bridge.
- **SKINS-2 mechanism:** `suppressBetDelta: boolean` state in the page (starts `false`). `handleHoleChange(h)` sets it `true` (navigation = suppress). `onScoreEdit` on ScoreRow sets it `false` (user intent = show). Page load / hydration never calls `handleHoleChange`, so reloads show deltas immediately.
- **Stepper:** `initialValue?: number` prop added to interface only. No behavioral change (controlled component).
- **Files to change:** 5 source files + 2 doc files. Auto-proceed (no mid-prompt gate needed).

## 3. Develop

- **Commands run:**
  - `npx tsc --noEmit`: exit 0 (clean)
  - `npm run test:run`: exit 0 — 441/441
  - PM2 rebuild: `pm2 stop golf && npm run build && pm2 start golf`
  - `npx playwright test`: 2/2 pass (skins-flow + stroke-play-finish-flow)
- **Files changed:**
  - `src/components/scorecard/WolfDeclare.tsx` — new component (90 lines). Reads `useRoundStore()` for players/holes/setWolfPick. Calls `getWolfCaptain(currentHole, wolfGame, players)`. Button-group UX. `data-testid="wolf-declare-panel"`, `wolf-partner-{pid}`, `wolf-declare-lone`, `wolf-declare-blind`.
  - `src/components/ui/Stepper.tsx` — `initialValue?: number` added to StepperProps (no-op; documented in comment).
  - `src/components/scorecard/ScoreRow.tsx` — `showBetDelta?: boolean` (default true); `onScoreEdit?: () => void`; Stepper `initialValue={par}` + `onChange` calls `onScoreEdit?.()`. Bet row amount: `{showBetDelta ? formatMoneyDecimal(holeDelta) : '—'}`. Color guard updated.
  - `src/store/roundStore.ts` — `setWolfPick` type: `'solo' | 'blind' | string`; renamed `partnerId` → `pick`.
  - `src/app/scorecard/[roundId]/page.tsx` — `import WolfDeclare`; `suppressBetDelta` state; `wolfGame` derived const; `handleHoleChange` function; HoleHeader/HoleDots updated to use `handleHoleChange`; `handleSaveNext` else-branch updated; `<WolfDeclare wolfGame={wolfGame} currentHole={currentHole} />` conditional render; `showBetDelta={!suppressBetDelta}` + `onScoreEdit` on every ScoreRow.
  - `AGENTS.md` — Current item: WF-6
  - `IMPLEMENTATION_CHECKLIST.md` — WF-5 closure evidence added; active item → WF-6
- **Test results:** 441/441 vitest; tsc clean; Playwright 2/2
- **Commits:** WF-5 (per-prompt commit at reviewer APPROVED — first prompt to apply this workflow improvement)

## 4. Outcome

- **Status:** complete
- **Summary:** Wolf declaration gesture (WolfDeclare.tsx) added to scorecard; captain rotates per hole; partner/lone/blind buttons highlight selection; bridge reads wolfPick at settlement (wired in WF-1). SKINS-2: bet-row delta suppressed on hole navigation until user edits a score — page-load/reload shows deltas immediately. Stepper affordance: `initialValue?` prop added (Stepper was already controlled and showed par via `value={score || par}`; no behavioral change needed).
- **For GM:** WF-5 is done. Next item is WF-6 (Playwright wolf-flow.spec.ts). Today is now at 3 prompts vs. 2 committed — this is on-pipeline-stretch (Day +1-2 pull-forward), to be documented in EOD section 8. Per-prompt commit is now live for WF-5 and forward.
- **For Cowork to verify:** Open a Wolf round. Per-hole, the "Wolf: [Name]" declaration panel appears above the score rows. Tap a partner name → button highlights green → summary shows "Wolf + Partner". Tap "Lone Wolf" → highlights → summary shows "Wolf — Lone Wolf". Tap "Go Blind" → highlights → "Wolf — Blind Lone". On hole navigation (← / → arrows or save & next), the Bet-row briefly shows "—" until any stepper button is tapped. After page reload, deltas show immediately (SKINS-2 suppression is navigation-only).

## Reviewer note

Reviewer returned APPROVED. Two style nits noted (non-blocking):
1. Double `games.find(g => g.type === 'wolf')` call in JSX — fixed immediately by extracting `const wolfGame = games.find(g => g.type === 'wolf')` as a derived constant, removing the `!` assertion.
2. `#d97706` hardcoded hex for amber — intentional for v1; flagged for future CSS-variable pass.

## Explore finding: Stepper affordance already satisfied

The WF-5 prompt described the Stepper as having local state that needs re-initialization on hole change. On Explore, confirmed Stepper has NO local state — it is fully controlled. `value={score || par}` in ScoreRow already ensures the display shows `par` when score is 0. The `initialValue` prop is added for API completeness / forward-compatibility but has no current behavioral effect. Documented here and in Stepper.tsx comment.

## AC checklist

- [x] `WolfDeclare.tsx` exists under `src/components/scorecard/`
- [x] Component renders only when ≥ 1 Wolf game is active (guard: `wolfGame && <WolfDeclare.../>`)
- [x] Captain name displays correctly per rotation (delegates to `getWolfCaptain` → `applyWolfCaptainRotation`)
- [x] Partner declaration: tapping stores `wolfPick = partnerId` (player's ID string)
- [x] Lone Wolf: tapping stores `wolfPick = 'solo'`
- [x] Blind Lone: tapping stores `wolfPick = 'blind'`
- [x] Selected pick highlighted (green-deep/sand); summary label rendered below buttons
- [x] Undeclared state: "No declaration yet" in amber; `wolfPick` remains undefined; bridge produces WolfDecisionMissing ($0 delta)
- [x] No next/* imports in WolfDeclare.tsx
- [x] SKINS-2: hole 1 default state shows "—" on Bet row (navigation sets suppressBetDelta=true)
- [x] SKINS-2: after user stepper edit, delta computes and displays normally
- [x] SKINS-2: page reload does NOT suppress (suppressBetDelta starts false)
- [x] Stepper.tsx accepts `initialValue?: number` prop
- [x] Stepper affordance already satisfied by `value={score || par}`; no local state added
- [x] `setWolfPick` type updated to `'solo' | 'blind' | string`
- [x] 441/441 vitest; tsc clean; Playwright 2/2
- [x] PM2 rebuilt — Cowork-ready
- [x] Reviewer: APPROVED
- [x] Per-prompt commit at reviewer APPROVED (first application of WF-4 suggested improvement)
- [x] AGENTS.md and IMPLEMENTATION_CHECKLIST.md updated as part of commit
