---
prompt_id: 004
date: 2026-04-30
role: engineer
checklist_item_ref: "SK-3 — Wizard Player-Count Guard for Skins"
tags: [sk-3, skins, wizard, player-count-guard, regression-clean]
---

# SK-3 — Wizard Player-Count Guard for Skins

## Result

SK-3 complete. Player-count guard live. All gates green. Proceeding to SK-4.

---

## Files changed

| File | Action | Notes |
|---|---|---|
| `src/lib/gameGuards.ts` | **Created** | `skinsTooFewPlayers`, `hasInvalidGames` — pure functions, vitest-testable |
| `src/lib/gameGuards.test.ts` | **Created** | 19 new tests covering Skins 0–5 players, non-Skins types, hasInvalidGames combinations |
| `src/components/setup/GameInstanceCard.tsx` | **Modified** | Red border when `playerCountError`; error text paragraph with `data-testid`; imports `skinsTooFewPlayers` |
| `src/app/round/new/page.tsx` | **Modified** | `canContinue()` returns `!hasInvalidGames(store.games)` for steps 2+3; belt-and-suspenders guard in `handleNext`; imports `hasInvalidGames` |

---

## UX choice

**Per-instance live guard + submit backstop.** (Matches GM lean.)

- **Red border** on the outer card div (`borderColor: 'var(--red-card)'` instead of `'var(--green-soft)'`) — immediate visual cue without being disruptive.
- **Error text** below the Players section: `"Skins requires at least 3 players"` — specific, actionable.
- **Continue → button disabled** on the Games step (step 2) while any Skins game has < 3 players.
- **Tee It Up button disabled** on the Review step (step 3) via the same `canContinue()` return value.
- **Belt-and-suspenders** in `handleNext`: `if (hasInvalidGames(store.games)) return` before the API call.

**Why not submit-time-only:** The game card is where the user configures players. Immediate feedback at the card level is far more actionable than a generic error after clicking Tee It Up.

**Why red border (not disabled inputs):** Disabling the player chips would prevent the user from fixing the issue. The red border signals the problem; the chips remain clickable to resolve it.

---

## Error message

`"Skins requires at least 3 players"` — rendered in `var(--red-card)` color with `text-[11px] font-semibold`, consistent with the existing scorecard's strokes indicator weight/size.

`data-testid={`skins-player-count-error-${game.id}`}` — stable selector for SK-4 Playwright spec.

---

## AC checklist (SKINS_PLAN.md §SK-3)

| Item | Status |
|---|---|
| Skins card shows error when playerIds.length < 3 | ✓ — red border + error text |
| Error visible immediately on chip toggle (reactive) | ✓ — Playwright: remove Carol → error appears; re-add Carol → error clears |
| Wizard prevents Continue/Tee It Up with invalid Skins | ✓ — `canContinue()` returns false; BottomCta disabled |
| Belt-and-suspenders guard in submit handler | ✓ — `if (hasInvalidGames(store.games)) return` |
| Guard is Skins-specific (SP with 2 players unaffected) | ✓ — Test 3 Playwright: SP(2) no error; Continue enabled |
| Multiple Skins instances each checked independently | ✓ — `hasInvalidGames` uses `.some()` across all games |
| Mixed SP(2) + Skins(3) submits clean | ✓ — Playwright Test B: no error, reaches Review step |
| Removing Skins instance (×) clears the error | ✓ — removing the game removes `playerCountError`; guard re-evaluates |
| `npm run test:run` passes | ✓ — 396/396 (+19 new) |
| `tsc --noEmit --strict` passes | ✓ — clean |
| SP regression gate | ✓ — `stroke-play-finish-flow.spec.ts` 1/1 green |

---

## Mobile viewport verification (R7)

| Viewport | Error visible | No overflow |
|---|---|---|
| 375×667 | ✓ | ✓ |
| 320×568 | ✓ | ✓ |

The error text and red border are inside the card — compact, no new layout surfaces. No overflow risk.

---

## Hard stop evaluation

All conditions for proceeding to SK-4 are met:
- All AC items green ✓
- vitest 396/396 (no regressions) ✓
- tsc clean ✓
- SP Playwright spec green ✓
- Guard works end-to-end (chip toggling, submit block, no false positive) ✓
- No fence violations ✓

**Proceeding to SK-4.**

---

## Vitest count, tsc, PM2

| Gate | Result |
|---|---|
| Vitest | 396/396 (was 377; +19 new gameGuards tests) |
| tsc --noEmit --strict | Clean |
| PM2 restart | PID 1655112, online |
| HTTP 200 | `http://localhost:3000/golf` → 200 ✓ |
