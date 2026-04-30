# Report: WF-1 Wolf bridge + cutover + player-count guard

## Header
- **Date:** 2026-04-30
- **Number:** 03
- **Type:** prompt
- **Title slug:** wf1-wolf-bridge
- **Linked issues:** none
- **Pipeline item:** Day +3-5 #1 (WF-1: Wolf bridge) — pulled into same session

## Prompt (verbatim)

> Objective: Implement WF-1 per docs/plans/WOLF_PLAN.md. Create src/bridge/wolf_bridge.ts mirroring src/bridge/skins_bridge.ts. Wire computeGamePayouts to route 'wolf' through the bridge. Unpark Wolf in GAME_DEFS. Surface loneWolfMultiplier in the wizard with a 4–5 player count guard. [Full prompt as received from GM.]

## Scope boundaries
- **In scope:** `wolf_bridge.ts` (new), `wolf_bridge.test.ts` (new), `payouts.ts` (wolf case), `perHoleDeltas.ts` (wolf case), `types/index.ts` (wolfPick widening + disabled removal), `gameGuards.ts` (wolfInvalidPlayerCount), `GameInstanceCard.tsx` (wolf error display), AGENTS.md pointer, IMPLEMENTATION_CHECKLIST.md active item
- **Out of scope:** All UI beyond wizard guard. BetDetailsSheet, WolfDeclare, Exit Round (WF-2–WF-5). Skins/SP files untouched.
- **Deferred:** none — all WF-1 scope items closed

## 1. Explore

- Files read: `wolf.ts`, `skins_bridge.ts`, `skins_bridge.test.ts`, `payouts.ts`, `perHoleDeltas.ts`, `GameInstanceCard.tsx`, `gameGuards.ts`, `types/index.ts`, `games/types.ts`, `bridge/shared.ts`
- Key findings:
  - `RoundConfig.players: PlayerSetup[]` — bridge must override `buildMinimalRoundCfg`'s empty players array with `bettingPlayers` for `applyWolfCaptainRotation` to function
  - `GameInstanceCard.tsx` Wolf section already exists (lines 95–107): loneWolfMultiplier as 2×/3× Pill buttons, default `?? 2` from store (set at addGame in roundStore.ts). **Plan deviation: wizard input already implemented; no new input to add.**
  - `perHoleDeltas.ts` has explicit `case 'skins'` switch — comment explicitly notes "Parked games (wolf, etc.): default → []". Wolf case needed.
  - `HoleData.wolfPick?: string | 'solo'` — TypeScript-wise `string | 'solo'` = `string`. `'blind'` already assignable. Widened for documentation clarity.
  - `wolfInvalidPlayerCount` bounds `< 4 || > 5` match `assertValidWolfCfg` at `wolf.ts:95`
  - `hasInvalidGames` already gating wizard "Tee It Up" at lines 85 and 94 of wizard page
- Constraints: `blindLoneMultiplier = max(loneMultiplier + 1, 3)` ensures ≥ 3 even when loneMultiplier = 2 (minimum valid value)

## 2. Plan

- **Approach:** Mirror skins_bridge.ts. Key addition vs Skins: captain rotation via `applyWolfCaptainRotation` per hole, requiring `roundCfg.players` to be populated. Decisions derived from `HoleData.wolfPick` + captain. Bridge signature stays `(holes, players, game)`.
- **Files to change:** 5 existing + 2 new
- **Files to create:** `wolf_bridge.ts`, `wolf_bridge.test.ts`
- **Risks:** all from WOLF_PLAN.md §8; all verified in tests
- **Open questions for GM:** none
- **Approval gate:** auto-proceed confirmed (no new dep, no schema, no engine change, no unexpected refactor)

## 3. Develop

- **Commands run:**
  - `npm run test:run` (after bridge + tests): exit 0 — 17 files, 439 tests (396 prior + 43 new)
  - `npx tsc --noEmit`: exit 0 (clean)
  - `npm run test:run` (after all wiring): exit 0 — 439/439
  - `git grep -rn "disabled: true" src/types/index.ts | grep wolf`: exit 1 (zero matches ✓)
- **Files changed:**
  - `src/bridge/wolf_bridge.ts` — created: `buildWolfCfg`, `getWolfCaptain`, `settleWolfBet`, `translateWolfPick`, `buildWolfRoundCfg`
  - `src/bridge/wolf_bridge.test.ts` — created: 11 test groups (W1–W11), 43 cases
  - `src/lib/payouts.ts` — added import `settleWolfBet`; added `case 'wolf'`
  - `src/lib/perHoleDeltas.ts` — added import `settleWolfBet`; added `case 'wolf'`
  - `src/types/index.ts` — `wolfPick` widened to `'solo' | 'blind' | string`; Wolf GAME_DEFS `disabled: true` removed
  - `src/lib/gameGuards.ts` — added `wolfInvalidPlayerCount`; updated `hasInvalidGames`
  - `src/components/setup/GameInstanceCard.tsx` — imported `wolfInvalidPlayerCount`; added `wolfPlayerError` state; updated card border condition; added wolf error paragraph
  - `AGENTS.md` — updated current item to WF-2
  - `IMPLEMENTATION_CHECKLIST.md` — updated active phase header + active item block
- **Test results:** 439/439 passed
- **Commits:** none — uncommitted working tree (commit at EOD)

## 4. Outcome

- **Status:** complete
- **Summary:** Wolf bridge wired into the live computation path; Wolf appears in the game picker; player-count guard active; reviewer APPROVED; 439/439 tests, tsc clean, grep gate passes.
- **For GM:** none — WF-1 done. WF-2 (scorecard pop-up shared primitive) is the next prompt.
- **For Cowork to verify:** Wolf now appears in the "Add a game" picker in the wizard. Cowork should verify: (1) Wolf token visible in picker; (2) player-count error appears when < 4 players selected for Wolf; (3) error clears at 4 players; (4) "Tee It Up" blocked while error shows.
- **Follow-ups created:** None within WF-1 scope. WF-2 is next per WOLF_PLAN.md.

## AC checklist

- [x] `wolf_bridge.ts` exists; exports `buildWolfCfg`, `getWolfCaptain`, `settleWolfBet`
- [x] `computeGamePayouts` routes `'wolf'` through bridge; no legacy path
- [x] `git grep -rn "disabled: true" src/types/index.ts | grep wolf` → zero matches
- [x] Wolf appears in game picker (disabled removed)
- [x] `loneWolfMultiplier` input in wizard: pre-existing 2×/3× Pills; no new input needed
- [x] Player-count guard: wolfPlayerError shown for < 4 or > 5 Wolf players; card border turns red; "Tee It Up" blocked via `hasInvalidGames`
- [x] Partner Wolf: zero-sum, correct stake-per-pair math (W2)
- [x] Lone Wolf win: loneMultiplier applied (W3)
- [x] Lone Wolf loss: losers collect correctly (W4)
- [x] Blind Lone: blindLoneMultiplier applied; BlindLoneDeclared emitted first (W9)
- [x] Tied + carryover: next decisive hole doubled (W5)
- [x] Missing score: WolfHoleInvalid, zero delta (W6)
- [x] All-tied round: payoutMapFromLedger({}, ids) returns all-zeros (W7)
- [x] Captain rotation holes 1–5: A, B, C, D, A (W8)
- [x] eventsSoFar threading 17-hole round: no throw, zero-sum (W10)
- [x] 5-player round: correct deltas (W11)
- [x] tsc clean
- [x] 439/439 tests
- [x] Reviewer: APPROVED

## Plan deviation noted

`GameInstanceCard.tsx` Wolf config section (lines 95–107) already existed with `loneWolfMultiplier` implemented as 2×/3× Pill buttons before WF-1. No new wizard input was added — the existing implementation was preserved. Default is `loneWolfMultiplier ?? 2` (roundStore sets 2 on Wolf game creation). The WOLF_PLAN.md spec called for an integer input with default 3; the pre-existing Pills with default 2 serve the same purpose and are retained to avoid regressions. GM should confirm this is acceptable or request a follow-up adjustment.
