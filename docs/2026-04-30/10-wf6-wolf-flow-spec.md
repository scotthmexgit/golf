# Report: WF-6 Playwright wolf-flow.spec.ts

## Header
- **Date:** 2026-04-30
- **Number:** 10
- **Type:** prompt
- **Title slug:** wf6-wolf-flow-spec
- **Linked issues:** none (WF-6 per WOLF_PLAN.md)
- **Pipeline item:** Today #8 (WF-6 — next item after WF-5)

## Prompt (verbatim)

> Objective: Write a new Playwright E2E spec tests/playwright/wolf-flow.spec.ts covering Wolf-specific UI flows added in WF-1 through WF-5: partner declaration, lone wolf, blind lone, WolfDeclare visibility fence, and game picker fence.
> [Full WF-6 prompt as delivered by GM — §1–§6 assertion groups, 4-player fixture, approach (b) for delta values, reviewer gate, per-prompt commit.]

## Scope boundaries
- **In scope:** `tests/playwright/wolf-flow.spec.ts` (new file, 209 lines)
- **Out of scope:** 5-player Wolf rotation, full 18-hole playthrough, Wolf+Skins combined round, BetDetailsSheet accordion scrolling, Exit Round spec, session-logging skill update, CLAUDE.md commit-hygiene note
- **Deferred:** none

## 1. Explore

- **Files read:** `tests/playwright/skins-flow.spec.ts` (pattern reference), `src/components/scorecard/WolfDeclare.tsx` (testids: `wolf-declare-panel`, `wolf-partner-{pid}`, `wolf-declare-lone`, `wolf-declare-blind`), `src/components/scorecard/BetDetailsSheet.tsx` (testids: `sheet-row-{hole}-{pid}`, `sheet-breakdown-{hole}-{pid}-{gameId}`), `src/components/scorecard/ScoreRow.tsx` (`hole-bet-total-{pid}`), `src/bridge/wolf_bridge.ts` + `wolf_bridge.test.ts` (settlement math), `src/types/index.ts` (GAME_DEFS: Nassau/Match Play have `disabled: true`; Wolf does not), `src/store/roundStore.ts` (addGame defaults: stake=500, loneWolfMultiplier=2), `playwright.config.ts` (baseURL `http://localhost:3000`), `src/app/round/new/page.tsx` (wizard canContinue, local setupStep state resets on hard nav).
- **Findings:**
  - WolfDeclare renders only when `wolfGame &&` in scorecard page (line 284); absent in DOM for non-wolf rounds.
  - BetDetailsSheet stays mounted (never unmounted); `expandedKey` persists across open/close cycles — §3 and §4 re-open with alice's row already expanded.
  - F9-a (useEffect in scorecard page) writes par to Zustand for all players on hole mount; hole 1 (par=4) appears in sheet scoredHoles immediately.
  - `page.goto()` is a hard navigation — Zustand resets to empty initial state. Must go through full wizard for §5, not shortcut via `page.goto('/golf/round/new')`.
  - All-scratch players (hcpIndex=0): net=gross, no handicap adjustment — delta values can be computed exactly without "handicap-adjusted hand-computation."
- **Constraints:** Approach (b) adopted: used all-scratch fixture so engine math is transparent; confirmed values by running spec first and observing DOM output (§1–§4 passed on first run; §5 hard-nav bug caught and fixed before report).

## 2. Plan

- **Approach:** Single `test()` block with six `test.step()` groups. §1+§6 handled together at the wizard games-step. §2-§4 sequential on the same wolf scorecard (no hole advance needed — BetDetailsSheet reads live Zustand state). §5 as final step using a fresh skins round via `page.goto('/golf')`.
- **Files to change:** none
- **Files to create:** `tests/playwright/wolf-flow.spec.ts`
- **Risks:**
  - `page.goto('/golf/round/new')` resets Zustand → Continue disabled. Fixed by using `page.goto('/golf')` + full wizard for §5.
  - BetDetailsSheet `expandedKey` persists → §3 and §4 do not re-click the row. Correct by design.
- **Open questions for GM:** none
- **Approval gate:** auto-proceed (spec file only, no source changes, no new dependencies, no schema or public API change)

## 3. Develop

- **Commands run:**
  - `npx playwright test tests/playwright/wolf-flow.spec.ts` (first run): 1 failed — §5 hard-nav bug
  - `npx playwright test tests/playwright/wolf-flow.spec.ts` (after §5 fix): 1/1 passed
  - `npx playwright test` (full suite, pre-fix): 2/3 (§5 failing)
  - `npx playwright test` (full suite, post-fix + MINOR guard fix): 3/3 passed
- **Files changed:**
  - `tests/playwright/wolf-flow.spec.ts` — new file, 209 lines (see spec for inline rationale)
- **Test results:** Playwright 3/3 (wolf-flow + skins-flow + stroke-play-finish-flow)
- **Commits:** `7de52c6` — `WF-6: Playwright wolf-flow.spec.ts — §1–§6 E2E closure spec`

## 4. Outcome

- **Status:** complete
- **Summary:** `tests/playwright/wolf-flow.spec.ts` added — 6 assertion groups covering partner declaration, lone wolf, blind lone, and two fence checks; Playwright 3/3; reviewer APPROVED; committed at `7de52c6`.
- **For GM:** WF-6 is done. Next item is WF-7 (Cowork visual verification of Wolf phase). WOLF_PLAN.md stepper-affordance note at §5 is stale (the described bug doesn't exist — Stepper is fully controlled); can be corrected as a one-line doc edit within WF-7 or deferred.
- **For Cowork to verify:** No new UI elements added in this prompt. The spec exercises WolfDeclare UI that Cowork should verify in WF-7 per existing queue.
- **Follow-ups created:** none

---

## Delta assertion values — rationale and derivation

All-scratch fixture (hcpIndex=0, courseHcp=0): net=gross, no handicap adjustment.

Hole 1 (Chambers Bay par=4). Scores: Alice=3, Bob=Carol=Dave=4. Alice wins all.

Wolf game: stake=500 minor units ($5), loneWolfMultiplier=2. blindLoneMultiplier = max(2+1, 3) = 3 (wolf_bridge.ts hard-coded default).

| Declaration | Multiplier | Alice delta | Bob/Carol/Dave |
|---|---|---|---|
| Partner (Alice+Bob) | 1× per pair | +$10.00 | Bob +$10.00, Carol -$10.00, Dave -$10.00 |
| Lone Wolf | 2× | +$30.00 | each -$10.00 |
| Blind Lone | 3× | +$45.00 | each -$15.00 |

Derivation for Partner: wolf team [Alice, Bob] best net=3 vs [Carol, Dave] best net=4; wolf wins; each loser pays each winner 1×stake=500. Alice: +500×2=+1000. Bob: +500×2=+1000.
Derivation for Lone: Alice vs B+C+D; 3 losers × stake × 2 = 3000. Alice: +3000=+$30.00; each opponent: -1000=-$10.00.
Derivation for Blind: same, mult=3. Alice: 3×500×3=4500=+$45.00; each opponent: -1500=-$15.00.

Confirmed by running spec first (all four delta assertions passed on second run after §5 fix). No re-baselining needed unless engine changes.

## Reviewer note

Reviewer returned APPROVED. One MINOR finding: `bobTestId!` lacked explicit `waitForSelector` guard on `[data-testid^="wolf-partner-"]`. Fixed before commit by adding `await page.waitForSelector('[data-testid^="wolf-partner-"]')` between the two existing waitForSelector calls.
