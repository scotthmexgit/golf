# Report: Wolf phase plan

## Header
- **Date:** 2026-04-30
- **Number:** 02
- **Type:** prompt
- **Title slug:** wolf-phase-plan
- **Linked issues:** none
- **Pipeline item:** Day +1-2 #1 (Wolf phase plan) — pulled forward into same session as Today #1

## Prompt (verbatim)

> Objective: Write docs/plans/WOLF_PLAN.md — the phase plan for unparking Wolf as the project's third live bet. [Full prompt as received from GM.]

## Scope boundaries
- **In scope:** docs/plans/WOLF_PLAN.md only. Both assessment sections (Decisions D and E), parking-lot folding, bridge design, Lone Wolf gesture spec, pop-up spec, phase sub-items WF-0 through WF-7.
- **Out of scope:** All code changes. No src/, prisma/, tests/, or non-plan files touched. IMPLEMENTATION_CHECKLIST.md and AGENTS.md updates deferred to first WF-N implementation prompt.
- **Deferred:** IMPLEMENTATION_CHECKLIST.md update (first WF-N prompt). AGENTS.md "Current item: WF-1" (post-GM approval of plan). `WOLF_PLAN.md` sub-item sizing may be refined by engineer at each WF-N Explore phase.

## 1. Explore

- Files read: `docs/plans/SKINS_PLAN.md` (structure template), `src/bridge/skins_bridge.ts` (bridge pattern), `src/games/wolf.ts` (engine surface), `src/types/index.ts` (GameInstance, HoleData, GAME_DEFS), `src/bridge/shared.ts` (buildHoleState, buildMinimalRoundCfg, payoutMapFromLedger), `src/components/scorecard/ScoreRow.tsx` (existing accordion, hot path), `src/app/scorecard/[roundId]/page.tsx` (scorecard page, existing overlay pattern).
- Key findings:
  - Engine confirmed production-ready: `settleWolfHole`, `finalizeWolfRound`, `applyWolfCaptainRotation` all exported. No engine changes needed.
  - `GameInstance.loneWolfMultiplier` already present. Remaining WolfCfg fields (`blindLoneEnabled`, `blindLoneMultiplier`, `tieRule`, `appliesHandicap`) not on `GameInstance` → hardcoded v1 defaults.
  - `HoleData.wolfPick?: string | 'solo'` exists for legacy pick storage. Bridge translates to `WolfDecision | null` using captain rotation internally. Caller signature stays `(holes, players, game)`.
  - GAME_DEFS already has `wolf` with `minPlayers: 4, maxPlayers: 5`. Unpark = remove `disabled: true` only.
  - `ScoreRow.tsx` accordion is `isExpanded` local state + `holeBreakdown` prop. On the hot path. Every WF touching it requires Playwright regression.
  - Finish confirmation overlay (`fixed inset-0 z-50`) is inline in scorecard page — no shared primitive exists. Pop-up will be the first.
  - `'blind'` wolfPick value not currently in the `HoleData.wolfPick` type; widening needed in WF-1 Explore.
- Constraints: No new dependencies may be added without surfacing as open question. `buildHoleState` in shared.ts already stubs `withdrew/pickedUp/conceded` — Wolf bridge reuses it as-is.

## 2. Plan

- **Approach:** Mirror SKINS_PLAN.md structure. Two assessment sections (Decisions D and E) preserve GM decision authority. Eight sub-items: WF-0 (plan), WF-1 (bridge + cutover + guard), WF-2 (pop-up), WF-3 (Skins migration), WF-4 (Exit Round own slot), WF-5 (declaration gesture), WF-6 (Playwright), WF-7 (Cowork).
- **Files to create:** `docs/plans/WOLF_PLAN.md`
- **Files to change:** none
- **Risks:** none at plan phase (all implementation risks documented in WOLF_PLAN.md §8)
- **Open questions for GM:** Two decisions require explicit GM selection before implementation begins — Decision D (Skins accordion handling, Code recommends option c) and Decision E (pop-up style, Code recommends slide-up bottom sheet). These are the plan's two gate conditions.
- **Approval gate:** auto-proceed to Develop (plan writing); plan itself is the artifact requiring GM approval before WF-1 starts.

## 3. Develop

- **Commands run:** `npm run test:run` → exit 0 — 16 passed, 396 passed (no source files touched; regression confirmed)
- **Files changed:** `docs/plans/WOLF_PLAN.md` (created, 9 sections, WF-0 through WF-7)
- **Test results:** 396/396 passed
- **Commits:** none — uncommitted working tree (commit at EOD)

## 4. Outcome

- **Status:** complete
- **Summary:** `docs/plans/WOLF_PLAN.md` written and ready for GM review; two decisions (D: Skins accordion handling, E: pop-up style) identified as gate conditions for WF-1 start.
- **For GM:**
  - Decision D: Code recommends option (c) — build pop-up in WF-2, migrate Skins accordion to it in WF-3. Please confirm or override.
  - Decision E: Code recommends slide-up bottom sheet (option b) — mobile-first, swipe-dismiss, scrollable data view. Please confirm or override.
  - Once both decisions are confirmed, Code will update AGENTS.md to "Current item: WF-1" and IMPLEMENTATION_CHECKLIST.md Active item, and WF-1 implementation prompt can be issued.
- **For Cowork to verify:** no UI impact (planning document only)
- **Follow-ups created:** AGENTS.md pointer update (deferred to GM plan approval). IMPLEMENTATION_CHECKLIST.md Active item update (first WF-N prompt).
