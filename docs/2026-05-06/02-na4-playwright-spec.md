---
prompt_id: 02
timestamp: 2026-05-06
checklist_item_ref: "NA-4 — Playwright spec (nassau-flow.spec.ts)"
tags: [na-4, playwright, e2e, nassau, press, decisions]
---

## Header
- **Date:** 2026-05-06
- **Number:** 02
- **Type:** engineering
- **Title slug:** na4-playwright-spec
- **Linked issues:** NA-4
- **Pipeline item:** Today #1

---

## §1 — Explore

PM2 hard gate:
- `pm2 status` showed golf process online, uptime 6 days (started ~2026-04-30, pre-NA-3 build)
- Rebuilt: `pm2 stop golf && npm run build && pm2 start golf` — confirmed online with new PID

Files read:
- `tests/playwright/skins-flow.spec.ts` + `wolf-flow.spec.ts` — patterns (saveHole helper, decrement via `button.rounded-l-lg`, sheet testids, DB query, extractRoundId)
- `src/games/nassau.ts` — `offerPress` logic: `auto-2-down` fires when `lead === 2` exactly; `lead = Math.abs(holesWonA - holesWonB)`
- `src/lib/nassauPressDetect.ts` — `detectNassauPressOffers` iterates all open matches after threading holes 1..currentHole
- `src/bridge/nassau_bridge.ts` — `buildNassauCfg`, `settleNassauBet`, confirmed `stake=500` default from store
- `src/components/scorecard/PressConfirmationModal.tsx` — testids: `press-confirmation-modal`, `press-down-player`, `press-accept`, `press-decline`; queuing modal (internal idx state); `onComplete` fires after last offer
- `src/components/setup/GameInstanceCard.tsx` + `src/components/ui/Pill.tsx` — Pill does NOT forward `data-testid` (PillProps has no testid field); must use text-based selectors for press rule buttons
- `src/app/scorecard/[roundId]/page.tsx` — `handleSaveNext` / `proceedSave` flow confirmed; press modal intercepts before PUT; PUT fires inside `proceedSave` after `onComplete`

Key discovery (fixture calibration):
- After hole 2: both `front` match (1-9) and `overall` match (1-18) have `holesWonA=2, holesWonB=0` → **two press offers** at hole 2 (front AND overall), not one. Modal queues them as "(1 of 2)" and "(2 of 2)".
- Spec design: accept offer 1 (Front 9), decline offer 2 (Overall) → keeps settlement at Alice +$15.00 / Bob -$15.00.

---

## §2 — Plan (mapping before Develop)

**Fixture:** Chambers Bay, 18 holes, 2 scratch players (Alice hcpIndex=0, Bob hcpIndex=0), Nassau auto-2-down / nine / singles / stake=$5 (500 minor units)

| Hole | Alice | Bob | Front | Press-1 (3→9) | Overall | Back | Event |
|---|---|---|---|---|---|---|---|
| 1 | 3 | 4 | 1-0 | — | 1-0 | — | lead=1, no offer |
| 2 | 3 | 4 | 2-0 | — | 2-0 | — | **2 offers** (front + overall); accept front, decline overall |
| 3 | 3 | 4 | 3-0 | 1-0 | 3-0 | — | press-1 tracking |
| 4-6 | 4 | 4 | 3-0 | 1-0 | 3-0 | — | no change |
| 7 | 4 | 4 | CLOSED | 1-0 | 3-0 | — | front closes (3>2) → Alice +$5 |
| 8 | 4 | 4 | ✗ | 1-0 | 3-0 | — | |
| 9 | 4 | 4 | ✗ | CLOSED | 3-0 | — | press-1 closes (1>0) → Alice +$5 |
| 10-15 | 4 | 4 | ✗ | ✗ | 3-0 | 0-0 | |
| 16 | 4 | 4 | ✗ | ✗ | CLOSED | 0-0 | overall closes (3>2) → Alice +$5 |
| 17-18 | 4 | 4 | ✗ | ✗ | ✗ | 0-0 | |
| finalize | | | | | | MatchTied | back $0 |

**Settlement:** Alice +$15.00, Bob -$15.00. Zero-sum ✓

**Approval gate:** none (new test file only). Step 4 skipped.

---

## §3 — Develop

### Iterations

**Iteration 1** — Initial spec written. Ran `npm run test:e2e` → 4 failures:
1. **nassau spec**: `nassau-press-rule-manual-` testid not in DOM — Pill doesn't forward `data-testid`. Fix: replaced with `getByRole('button', { name: /auto 2.down/i }).click()` and `getByText('Press rule')` visibility check.
2. **skins-flow, wolf-flow, stroke-play-finish-flow** regressions: stale fence assertions saying "Nassau must not appear in picker" — Nassau was unparked in NA-1. Fix: updated all three specs to remove Nassau from the absent-list and add it to the present-list (Match Play remains the only absent game).

**Iteration 2** — Ran `npm run test:e2e` → 1 failure (nassau only):
- `TimeoutError` waiting for PUT after clicking `press-accept`. Root cause: two press offers at hole 2 (front AND overall both 2-0); the PUT only fires after BOTH offers are resolved. Fix: restructured hole 2 step to accept offer 1 (Front 9), wait 150ms, then decline offer 2 (Overall) in a Promise.all with `waitForResponse`.

**Iteration 3** — Ran `npm run test:e2e` → 1 failure (nassau §8 fence only):
- `nassauBlock` (6 lines) bled into adjacent GAME_DEFS entries that have `disabled: true`. Fix: check `lines[nassauLineIdx]` (single line) instead of `lines.slice(...)`.

**Iteration 4** — Ran `npm run test:e2e` → **4/4 PASS** ✓

### Final spec structure

File: `tests/playwright/nassau-flow.spec.ts`

8 assertion groups in 9 test.step() calls:

| Step | Group(s) | Key assertions |
|---|---|---|
| §1 Setup + §8 Fence (picker) | §1, §8 | Round created; Nassau in picker; Match Play absent |
| §2 Hole 1 | §2 | No modal (lead=1) |
| §2+§3 Hole 2 | §2, §3 | Modal "(1 of 2)" · Bob down · Front 9; accept → offer 2 · Overall; decline → PUT fires |
| §4 Hole 3 | §4 | No modal (press-1 lead=1) |
| §4 Holes 4-6 | §4 | No modals |
| §4+§7 Hole 7 | §4, §7 | Front closes; BetDetailsSheet hole-7 Alice Nassau = "+$5.00" |
| §4 Hole 8 | §4 | No closeout yet |
| §4+§7 Hole 9 | §4, §7 | Press-1 closes; BetDetailsSheet hole-9 Alice Nassau = "+$5.00" |
| §5 Holes 10-17 | §5 | No modals (overall closes hole 16 silently) |
| §5 Hole 18 | §5 | Finish Round → PUT + PATCH + navigate |
| §6 Results | §6 | status=Complete; Alice +$15.00; Bob -$15.00; 2 payout spans |
| §8 Fence (code) | §8 | nassau line has no "disabled"; matchPlay line has "disabled: true" |

### Side-effect fixes (not Nassau spec)

Three existing Playwright specs had stale fence assertions from the pre-NA-1 era:
- `skins-flow.spec.ts`: removed Nassau from absent-list; added Nassau to present-list
- `wolf-flow.spec.ts`: same
- `stroke-play-finish-flow.spec.ts`: same

These are correct post-NA-1 state assertions. No logic changes to any spec beyond fence strings.

### Codex review

Codex unavailable (`disable-model-invocation`). Degraded self-review applied; mode escalated to Standard.

**Self-review findings:**
1. (Low) `waitForTimeout(150)` between offer 1 and offer 2 click may be tight under load — within Playwright's 15s action timeout; not a correctness issue.
2. (Low) `extractRoundId` regex assumes `/(\d+)` is the round ID segment — holds for all scorecard URLs in this app.
3. (Pass) Settlement math verified against `nassau.ts:388 (holesUp > holesRemaining)` for all three closeout holes (7, 9, 16). Back MatchTied correct.

No blocking findings.

### Grep gate (fence)

```
git diff --name-only HEAD (staged files)
  tests/playwright/nassau-flow.spec.ts   ← new file
  tests/playwright/skins-flow.spec.ts    ← fence-only update
  tests/playwright/stroke-play-finish-flow.spec.ts ← fence-only update
  tests/playwright/wolf-flow.spec.ts     ← fence-only update
```

No application source files (`.ts`/`.tsx` outside `tests/`) in the diff. ✓

### Test results

```
npm run test:e2e
  4/4 PASS (17.5s)
  nassau-flow: §1–§8 all pass
  skins-flow: pass (fence updated)
  stroke-play-finish-flow: pass (fence updated)
  wolf-flow: pass (fence updated)

npm run test:run
  598/598 vitest pass (unchanged — no source file edits)
```

---

## §4 — Outcome

- **Status:** complete
- **Summary:** `tests/playwright/nassau-flow.spec.ts` written and green. All 8 NASSAU_PLAN.md §NA-4 assertion groups pass. Three existing specs updated for stale Nassau fence assertions (NA-1 unpark). 4/4 E2E pass, 598/598 vitest unchanged.
- **Mode escalated to Standard:** Codex unavailable — degraded self-review applied; no blocking findings.
- **For GM:** NA-4 AC met. NA-5 (Cowork visual verification) is the next and final item before Nassau phase closure.
- **For Cowork to verify:** Full Nassau flow — wizard, press modal on hole 2, BetDetailsSheet Nassau deltas, results page +$15/-$15. See NASSAU_PLAN.md §NA-5 for the full verification checklist.

## Open items

- **F11-PRESS-GAME-SCOPE** — deferred (filed in checklist, see prompt 01)
- **F12-TIED-WITHDRAWAL-EVENT** — deferred (filed in checklist, see prompt 01)
- **Manual press button** — no UI surface; deferred to parking lot
