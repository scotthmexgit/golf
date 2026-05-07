---
prompt_id: "06"
timestamp: 2026-05-09T00:00:00Z
tags: [develop, cowork-findings, bundle, b1-b6]
status: COMPLETE
---

# Cowork Bundle B1–B6: Develop Report

**Prompt:** Cowork Bundle B1–B6 Develop, proceed  
**Verification mode:** Standard  
**Approval gate:** Yes — 4+ files, scorecard + game logic paths  
**Step 4 (diff-level Codex):** Skipped — approval was at plan level per standard gate pattern

---

## Summary

All six Cowork bundle items implemented, tested, and verified. One high-priority Codex adversarial finding (manual press idempotency) caught and fixed autonomously before shipping. Reviewer sub-agent APPROVED. 6/6 E2E specs pass (new nassau-manual-press-flow.spec.ts + extended wolf-skins + 4 existing specs). 766/766 Vitest tests pass.

---

## formatMoney grep result + chosen action (B1 decision)

```
src/app/bets/[roundId]/page.tsx:6:import { vsPar, parLabel, parColor, formatMoney } from '@/lib/scoring'
src/app/bets/[roundId]/page.tsx:27:{formatMoney(payouts[p.id] || 0)}
src/lib/scoring.ts:28:export function formatMoney(amount: number): string {
```

**Only caller: bets page (the one being fixed in B1).**  
**Chosen action: DELETE** `formatMoney` entirely from `src/lib/scoring.ts`. No other callers. The function was a display bug (showed raw minor units without dividing by 100). No deprecation needed — a dead function is worse than no function.

---

## Develop

### B1 — src/lib/scoring.ts, src/app/bets/[roundId]/page.tsx

- Deleted `formatMoney` (lines 28–32 of original file). No remaining callers.
- Bets page import: `formatMoney` → `formatMoneyDecimal`. Header pill formatter fixed.

### B2 — src/app/bets/[roundId]/page.tsx

- Added `import { computePerHoleDeltas } from '@/lib/perHoleDeltas'`
- `const { totals } = computePerHoleDeltas(holes, players, games)` computed at component top
- Each hole card player row now shows a `w-14 text-right font-semibold` delta column (`formatMoneyDecimal(holeDelta)`) color-coded green/red/muted
- Delta column only renders when `games.length > 0` (no games → no column)
- Per-game expandable rows deferred; comment added near totals render noting the deferral

### B3 — src/app/results/[roundId]/page.tsx

- Added `const gamePayouts = games.map(g => ({ game: g, perPlayer: computeAllPayouts(holes, players, [g]) }))`
- Game Breakdown expanded: each game now shows game label + stake row followed by per-player subtotal rows (pl-3 indented, color-coded by sign)
- Uses existing `sorted` player order (descending by total payout)
- GR3: per-game subtotals are zero-sum by construction (aggregateRound enforces via ZeroSumViolationError)

### B4 — src/app/scorecard/[roundId]/page.tsx

Three mechanisms implemented per decisions:

1. **Button disabled:** `disabled={!allScored || (!!wolfGame && !(holeData?.wolfPick))}` — BottomCta grays out when Wolf active + no declaration
2. **Proactive notice:** useEffect fires when `wolfGame && allScored && holeData && !holeData.wolfPick` → sets "Wolf: captain must declare before saving this hole." notice
3. **handleSaveNext guard:** Belt-and-suspenders inside handleSaveNext → returns early with notice if wolf undeclared (handles any path that bypasses disabled state)
4. **confirmFinish guard:** Checks `holes.filter(h => scoredHoles.has(h.number) && !h.wolfPick)` → fires `setFinishError` with count + message, re-shows confirm overlay

**UX note:** Native HTML `disabled` prevents onClick. Notice is therefore proactive (fires via useEffect when allScored + wolfPick missing) rather than click-triggered. Both mechanisms are visible simultaneously. Comment added: references `game_wolf.md §9`.

**wolf-skins spec update (B4):** The existing §4 "Complete round" step was updated to declare lone wolf on holes 3-17 and hole 18 before saving, since the B4 guard now blocks saves without a declaration. Wolf delta remains $0 per hole (WolfHoleTied under no-points rule with all-par scores). Settlement unchanged: +$30.00 × 2, -$30.00 × 2.

### B5 — src/lib/nassauPressDetect.ts + src/app/scorecard/[roundId]/page.tsx

**nassauPressDetect.ts:**
- File header comment updated: documents both functions and their roles
- Added `detectManualNassauPressOffers` export (~60 lines)
- Threads MatchState through all holes (same logic as `detectNassauPressOffers`)
- Applies prior confirmed presses + withdrawals (withdrawal threading matches auto-detect for consistency)
- Returns offers for any match with a down player (no threshold filter — manual mode)
- **Idempotency guard (autonomous fix after Codex adversarial):** Collects `hd.presses?.[cfg.id]` for the CURRENT hole and skips offers where `match.id` is already present. Prevents duplicate press matches if user re-taps "Press?" after a failed save PUT. See Codex section.

**scorecard page:**
- `detectManualNassauPressOffers` imported alongside `detectNassauPressOffers`
- `manualPressOffers` memoized: `useMemo(() => { const manualGames = games.filter(...); return manualGames.flatMap(g => detectManualNassauPressOffers(currentHole, holes, players, g)) }, [currentHole, holes, players, games, holeData])`
- `handleManualPress`: calls `setPendingPressOffers(manualPressOffers)` → existing `PressConfirmationModal` handles the rest (no new modal)
- "Press?" button rendered between WolfDeclare and score rows; `data-testid="manual-press-button"` for E2E; displays down player name(s) in label; only renders when `manualPressOffers.length > 0`

### B6 — golf/cowork-claude.md

Created `/home/seadmin/golf/cowork-claude.md` (Golf Cowork CLAUDE.md — was not on disk from prior session, only provided as conversation output). Includes:
- Project context (app URL, auth)
- Cowork queue: WF7-4, NA-5 items with verification checklists
- Per-game display rules with B6 Nassau clarification: "In-progress holes (where no match has closed yet) correctly show '—'. '$0.00 for tied holes' applies to Skins and Wolf, not Nassau."
- Findings file format

---

## Tests

### Vitest
- 766 tests total (762 pre-bundle + 4 new B5 unit tests)
- **New B5 tests (nassauPressDetect.test.ts):** 4 cases for `detectManualNassauPressOffers`:
  - Manual mode + 1-down → returns front AND overall offers (`.toBeGreaterThanOrEqual(2)`, asserts both matchIds)
  - Manual mode + tied → returns []
  - auto-2-down mode → returns []
  - auto-1-down mode → returns []

### E2E Playwright (6 specs, 6 passed)
- **nassau-manual-press-flow.spec.ts** (NEW — B5): §1–§6 closure. Verified: Press? button visible when 1-down, save without pressing works, Press? tap → modal → accept both offers → save proceeds, settlement Alice +$10.00 / Bob -$10.00 (zero-sum)
- **wolf-skins-multibet-flow.spec.ts** (extended — B3, B4): Added B4 step (save disabled + notice fires when wolfGame + no declaration); added B3 step (Game Breakdown per-player subtotals: Wolf +$20.00 × 2, Skins +$10.00 × 2, 8 pl-3 rows total); updated §4 to declare lone wolf on holes 3-18 (B4 guard requires it)
- nassau-flow.spec.ts: no changes, passes ✓
- skins-flow.spec.ts: no changes, passes ✓
- stroke-play-finish-flow.spec.ts: no changes, passes ✓
- wolf-flow.spec.ts: no changes, passes ✓

### tsc
`npx tsc --noEmit`: clean, no errors.

---

## Codex review findings

### Codex pre-review (plan) — 05-bundle-plan-codex-review.md
Verdict: APPROVE, no material findings. (Working tree was docs-only at that point.)

### Codex pre-review (diff-level)
Skipped — not required for this prompt type (approval gate was at plan level; no high-stakes designation).

### Codex /review — working tree
- **[P2] Manual press duplicate on save-retry** — `nassauPressDetect.ts` returns offers for open matches even if a press was already accepted on the current hole. If the PUT fails, user can re-trigger the modal and duplicate the matchId.
- **Action: Autonomous fix** — Added `alreadyPressedIds` Set constructed from `currentHoleHd?.presses?.[cfg.id]`, checked before pushing to `offers[]`. Meets all 5 autonomous-fix rules: in scope, no schema/API/security changes, unambiguous, small (3–4 lines + comment), high confidence.

### Codex adversarial-review — working tree
- **[high] Same idempotency issue** as /review (flagged from the same root cause, different path). Already fixed autonomously above. No additional findings.
- Three focus areas from prompt: B4 guard bypass (Codex found none — guard is belt-and-suspenders with disabled button and useEffect notice), B5 stale offer (found the duplicate-on-retry issue — fixed), B3 isolation (found none — `computeAllPayouts([g])` correctly isolates per-game payouts).

### Autonomous fixes applied: 1
- `detectManualNassauPressOffers` idempotency guard: added `alreadyPressedIds` Set check to skip re-offering matches already pressed on the current hole. **Why autonomous:** fix is in scope (nassauPressDetect.ts), no schema change, Codex recommendation unambiguous, 4 lines, would have proposed unprompted. Scored all 5 rules.

### Reviewer sub-agent verdict
**Initial: CHANGES REQUESTED** — 2 findings:
1. [MAJOR] Missing `overall` match assertion in first B5 unit test (only `front` asserted, not `overall`)
2. [MINOR] Header comment listed 3 test bullets, file had 4 `it()` blocks

**Fixes applied (both autonomous):**
1. Added `expect(offers.some(o => o.matchId === 'overall')).toBe(true)` + changed `toBeGreaterThanOrEqual(1)` → `toBeGreaterThanOrEqual(2)`
2. Updated header to list 4 bullets matching the 4 `it()` blocks

**Re-review: APPROVED** — no remaining findings.

---

## Files changed

| File | Change |
|---|---|
| `src/lib/scoring.ts` | Deleted `formatMoney` |
| `src/app/bets/[roundId]/page.tsx` | B1: formatter swap; B2: `computePerHoleDeltas` + delta column |
| `src/app/results/[roundId]/page.tsx` | B3: per-game per-player subtotals in Game Breakdown |
| `src/app/scorecard/[roundId]/page.tsx` | B4: button disable + notice useEffect + handleSaveNext guard + confirmFinish guard; B5: `detectManualNassauPressOffers` import + `manualPressOffers` memo + `handleManualPress` + "Press?" button |
| `src/lib/nassauPressDetect.ts` | B5: `detectManualNassauPressOffers` export + idempotency fix; header comment updated |
| `src/lib/nassauPressDetect.test.ts` | B5: 4 new unit tests for `detectManualNassauPressOffers` |
| `tests/playwright/nassau-manual-press-flow.spec.ts` | NEW — B5 E2E closure spec |
| `tests/playwright/wolf-skins-multibet-flow.spec.ts` | Extended: B4 assertion step + B3 Game Breakdown step; §4 updated for lone wolf declarations |
| `golf/cowork-claude.md` | NEW — Golf Cowork CLAUDE.md (B6 Nassau clarification included) |

---

## Success criteria check

| Criterion | Status |
|---|---|
| B1: formatMoney deleted; bets page uses formatMoneyDecimal | ✓ |
| B2: Per-hole delta column visible, color-coded green/red/muted | ✓ |
| B3: Game Breakdown shows per-player subtotals; subtotals zero-sum (aggregateRound enforced) | ✓ |
| B4: Button disabled (wolf + no pick); notice fires proactively; confirmFinish blocks end-of-round | ✓ |
| B5: detectManualNassauPressOffers exported; "Press?" button renders; tap → modal → save; E2E passes | ✓ |
| B6: Cowork CLAUDE.md created with Nassau em-dash clarification | ✓ |
| 7 GRs respected | ✓ GR1(refs), GR2(integer math), GR3(zero-sum), GR5(portability), GR6(typed events), GR7(no silent), GR8(game.id chain) |
| 766/766 Vitest tests | ✓ |
| tsc clean | ✓ |
| 6/6 E2E specs | ✓ |
| Reviewer APPROVED | ✓ |
| Codex /review: clean after autonomous fix | ✓ |
| Codex adversarial-review: no unaddressed findings | ✓ |

---

## For Cowork to verify

**B1 (bets page header pills):** Header pills at top of `/bets/{roundId}` now show `+$X.XX` (e.g. `+$30.00`) instead of `+$XXXX` (raw minor units). Verify formatting is correct.

**B2 (bets page per-hole delta column):** Each hole card row now shows a right-aligned delta column. For holes where a bet settled, the delta should show the correct $ amount in green (winner) or red (loser). For holes where no bet settled (Nassau in-progress), shows '—'.

**B3 (results page Game Breakdown):** Under each game name, per-player subtotals now appear (indented rows). Verify: Alice/Bob show positive green amounts; Carol/Dave show negative red amounts (for wolf-skins fixture). Each game's subtotals should sum to zero visually.

**B4 (wolf scorecard guard):** On a Wolf round, with a fresh hole where no captain has been declared: verify "Save & Next Hole →" button is grayed out, and a "Wolf: captain must declare before saving this hole." notice appears. After declaring (tap any player, lone wolf, or blind), the button becomes active.

**B5 (manual press button):** On a Manual press Nassau round, after a player goes 1-down, a "Press? (X is down)" button appears between the WolfDeclare area and the score rows. Tapping it should open the press confirmation modal. The save button should still be active after pressing (the press is separate from save).

**B6 (Cowork CLAUDE.md):** The `golf/cowork-claude.md` file on the Linux server contains the Nassau per-hole display rules. Copy to Windows Desktop project folder to use.
