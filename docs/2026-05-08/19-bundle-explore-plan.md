---
prompt_id: "19"
timestamp: 2026-05-08T00:00:00Z
checklist_item_ref: "Post-bundle Cowork follow-ups B3/B4/B5/(d)"
tags: [explore, plan, cowork-followup]
status: STOP_CODEX — awaiting codex plan-review
---

# Post-bundle Cowork follow-ups — Explore + Plan (Steps 1–2)

## Explore findings

### B4 — Auto-advance decoupling

`PressConfirmationModal` wiring (scorecard page line 424):
```tsx
<PressConfirmationModal hole={currentHole} offers={pendingPressOffers} onComplete={proceedSave} />
```

`PressConfirmationModal.advance()` calls `onComplete()` when the last offer is resolved, which triggers `proceedSave` immediately — saves + advances. The Cowork finding: pressing is a decision, not a save; user should stay on the hole.

**Fix:** Change `onComplete={proceedSave}` to `onComplete={() => setPendingPressOffers([])}`. Modal closes; `pendingPressOffers` clears; user stays on hole and taps "Save & Next Hole →" manually.

Correctness:
- `setPressConfirmation` has already been called by accepted offers before `onComplete` fires
- `proceedSave` reads fresh Zustand state (`useRoundStore.getState().holes`) — accepted presses included ✓
- `handleSaveNext` in manual mode skips auto-press detection (`detectNassauPressOffers` returns `[]` for `pressRule='manual'`) → calls `proceedSave` directly ✓
- After both offers accepted, `alreadyPressedIds` set includes both → `manualPressOffers` returns `[]` → "Press?" button disappears ✓

Playwright impact: `nassau-manual-press-flow.spec.ts` §3 currently expects PUT response on last press accept. Must be updated: accept both offers (no PUT), modal closes, then `saveHole(page, 2)` explicitly.

### B5 — Label clarity

Current template (scorecard page lines 378-381):
```tsx
Press?{' '}{manualPressOffers.map(o =>
  `(${players.find(p => p.id === o.downPlayer)?.name?.split(' ')[0] ?? o.downPlayer} is down)`
).join(', ')}
```
Example: "Press? (Bob is down), (Bob is down)" — confusing when two matches share the same down player.

`PressConfirmationModal.tsx` already has a private `matchLabel` function (lines 32-44) that maps `'front' → 'Front 9'`, `'back' → 'Back 9'`, `'overall' → 'Overall'`, `'press-N' → 'Press #N'`, allPairs variants too.

**Fix:** Add `matchLabel` as a local function in the scorecard page (same logic, duplicate 8 lines). Update template:
```tsx
Press?{' '}{manualPressOffers.map(o =>
  `${matchLabel(o.matchId)}: ${players.find(p => p.id === o.downPlayer)?.name?.split(' ')[0] ?? o.downPlayer} is down`
).join(' · ')}
```
Output: "Press? Front 9: Bob is down · Overall: Bob is down"

No change to `PressOffer` shape or `nassauPressDetect.ts`. Existing B5 unit tests unaffected.

### B3 — Settled-zero display

`formatMoneyDecimal(0)` returns `—` (by design — correct for in-progress/unknown state).
Results page Game Breakdown (line ~110):
```tsx
const amt = perPlayer[p.id] ?? 0
...
{formatMoneyDecimal(amt)}
```
On a settled round, `amt === 0` means the player broke even on this game — should show `$0.00`.

`gamePayouts` is computed via `computeAllPayouts(holes, players, [g])` per game. `perPlayer` is the result. For a game where the player's net is genuinely zero (e.g., Nassau overall tied), `amt === 0` and currently shows `—`.

**Fix:** Inline ternary in the Game Breakdown per-player row only:
```tsx
{amt === 0 ? '$0.00' : formatMoneyDecimal(amt)}
```
No new shared utility. Narrowest change. Does NOT change Money Summary (not in scope; separate concern).

Note: The Money Summary at line 86 has the same issue (`formatMoneyDecimal(amt)` where `amt` can be 0), but the Cowork finding was specifically about Game Breakdown. Leaving Money Summary as-is per scope discipline; file as future parking-lot if needed.

### (d) — Legacy bets investigation

**Root cause identified:** The bets page reads Zustand state only — no server-side hydration. Scorecard page has `useEffect` hydration (PF-1); results page has `useEffect` hydration (PF-1-F6); bets page has NEITHER.

For rounds 50 and 79 navigated cold (from home page after refresh), Zustand is in initial state → `holes = []`, `players = []` → `scoredHoles.length === 0` → "No holes scored yet"; header row shows "Golfer" (fallback for `p.name` undefined) with `formatMoneyDecimal(0)` → `—`.

This matches the documented PF-1 v2 limitation:
> `bets/`, `resolve/`, and non-same-session `results/` pages render from Zustand only — cross-session viewing broken (PF-1 v2 backlog). (IMPLEMENTATION_CHECKLIST.md)

This affects ALL rounds navigated cold, not just 50 and 79. Rounds 50/79 are pre-deploy test rounds; they're confirming the limitation, not introducing a new defect.

**Disposition:** Close as "expected — matches known PF-1 v2 deferred item." No code fix in this bundle. The fix (add `useEffect` hydration to bets page, same pattern as results page) is a valid future item to file if the team wants to address it. Not scoping it here per prompt instructions.

No schema change. No STOP needed.

---

## Plan

### Files to change

| File | Item | Change |
|---|---|---|
| `src/app/scorecard/[roundId]/page.tsx` | B4, B5 | Change `onComplete` to close-only callback; add `matchLabel` helper; update button template |
| `src/app/results/[roundId]/page.tsx` | B3 | Inline ternary for Game Breakdown `amt === 0` case |
| `tests/playwright/nassau-manual-press-flow.spec.ts` | B4 (spec update) | Update §3 to reflect new save-after-press flow; add B5 format assertion |

### Files NOT changed

- `src/lib/nassauPressDetect.ts` — no `PressOffer` shape change
- `src/components/scorecard/PressConfirmationModal.tsx` — no change
- `src/lib/scoring.ts` — no new shared utility
- `IMPLEMENTATION_CHECKLIST.md` — (d) is a known deferred item, no new entry needed

### In scope
- B4 fix + Playwright spec update for new flow
- B5 button label template + Playwright format assertion
- B3 Game Breakdown inline ternary
- (d) investigation documented; close with note

### No approval gate triggered
- 2 source files (scorecard page + results page) — under 3-file refactor threshold
- No schema change, no new dependency, no public API change, no security-sensitive change
- Playwright spec update is a test file, not a source refactor

### Success criteria
- B4: Accepting press offers closes modal WITHOUT saving; user saves manually
- B5: Button shows "Press? Front 9: X is down · Overall: X is down" format
- B3: Game Breakdown shows `$0.00` for settled-zero (not `—`)
- (d): Root cause documented; no code change
- Vitest: 772 tests pass (no count change — no new unit tests for this bundle)
- Playwright: `nassau-manual-press-flow.spec.ts` updated and passing
- tsc clean; Codex post-review clean; Reviewer APPROVED
