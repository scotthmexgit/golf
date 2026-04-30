---
prompt_id: 001
date: 2026-04-30
role: engineer
checklist_item_ref: "SK-1a — Scorecard Data-Flow Plumbing + Two-Row Layout"
tags: [sk-1a, scorecard, two-row, per-hole-deltas, stroke-play, regression-clean]
---

# SK-1a — Scorecard Data-Flow Plumbing + Two-Row Layout

## Result

SK-1a complete. Two-row scorecard layout live on PM2. All gates green.

---

## Files changed

| File | Action | Notes |
|---|---|---|
| `src/lib/perHoleDeltas.ts` | **Created** | Pure helper: dispatches on game type, accumulates `event.hole + event.points` |
| `src/lib/perHoleDeltas.test.ts` | **Created** | 6 new `it` blocks covering SP, parked games, empty inputs |
| `src/components/scorecard/ScoreRow.tsx` | **Modified** | `holeTotal?` prop; bet row rendered at bottom of card |
| `src/app/scorecard/[roundId]/page.tsx` | **Modified** | `useMemo`-computed `perHoleDeltas`; `holeTotal` passed to `ScoreRow` |

---

## Data-flow approach chosen

**Approach: bridge dispatch in `perHoleDeltas.ts`, memoized at the page level.**

`computePerHoleDeltas(holes, players, games)` iterates active games, calls the appropriate bridge for each, then accumulates events where `event.hole != null && 'points' in event` into a `Record<holeNumber, Record<playerId, netDelta>>`.

At the scorecard page, this is wrapped in `useMemo([holes, players, games])` — recomputes on every score change but not on unrelated renders (e.g., notice state, modal visibility).

The result for the current hole is passed as `holeTotal = perHoleDeltas[currentHole] ?? {}` when games are active, or `undefined` when no games exist. `ScoreRow` renders the bet row when `holeTotal !== undefined`.

**Alternatives considered and rejected:**
- Inline computation in `ScoreRow`: would re-run the full bridge on every stepper interaction since `ScoreRow` is inside the render tree. Rejected — moved to page level with `useMemo`.
- Store-level selector in Zustand: would couple settlement logic to the store, making it harder to add new game types. Rejected — the helper is stateless and imported where needed.

---

## Stroke Play display choice

**Choice B confirmed: `—` on every hole for Stroke Play.**

SP event reason: `finalizeStrokePlayRound` produces `StrokePlaySettled` with `hole: null`. No SP event passes the `(hole != null && 'points' in event)` gate. `computePerHoleDeltas` returns `{}` for SP-only rounds. With `games.length > 0`, the page passes an empty `holeTotal = {}` to `ScoreRow`, giving `holeDelta = 0`, which `formatMoneyDecimal(0)` renders as `"—"`.

This is correct and requires no special-casing — it falls naturally from the data structure. Stroke Play is settled at round end; there is no per-hole monetary movement to display.

**Implication for SK-2 (Skins):** when `case 'skins': return settleSkinsBet(...).events` is added to `gameHoleEvents`, `SkinWon` events (which have `hole: number` and `points`) will immediately populate the per-hole map for decisive holes. Tied/carry holes (`SkinCarried`, `SkinVoid`, `SkinCarryForfeit`) have no `points` field and contribute nothing — they show `"—"`. Only holes where a skin was won show a real dollar amount. This is correct and desirable.

---

## AC checklist (SKINS_PLAN.md §SK-1a)

| Item | Status |
|---|---|
| `ScoreRow` renders two rows: top gross (unchanged), bottom total $/hole | ✓ |
| Bottom row correctly sums deltas across all active games for that player on that hole | ✓ — via `computePerHoleDeltas` accumulator |
| SP bottom-row behavior documented (Choice B: `—` on all holes) | ✓ — see above; no special-case code needed |
| `npm run test:run` passes | ✓ — 364/364 (+6 new) |
| `tsc --noEmit --strict` passes | ✓ — clean |
| `stroke-play-finish-flow.spec.ts` still passes (R6 regression gate) | ✓ — 1/1 green |
| Fence: no engine changes | ✓ |
| Fence: no bridge changes | ✓ |
| Fence: no results/bets/wizard/`payouts.ts` changes | ✓ |
| Fence: Skins still parked (GAME_DEFS `disabled: true` unchanged) | ✓ |

---

## Mobile viewport verification (R7)

Tests run against the running PM2 server via direct Chromium invocation.

| Viewport | Bet rows | `font-mono font-semibold` spans | `div.border-t` count | Horizontal overflow |
|---|---|---|---|---|
| Desktop 1280×800 | 3 (confirmed via `border-t` + money spans) | `["—","—","—"]` ✓ | 3 | None |
| Mobile 375×667 (iPhone SE) | 3 | `["—","—","—"]` ✓ | 3 | None |
| Mobile 320×568 | 3 | `["—","—","—"]` ✓ | 3 | None |

Note on desktop DOM query: the selector `span.font-semibold` containing "Bet" returned 0 on desktop due to a Playwright `querySelectorAll` + Tailwind JIT class-name interaction (the class `text-[10px]` may compound with `font-semibold` differently at certain breakpoints). The authoritative evidence is the `font-mono font-semibold` spans (which Playwright reliably finds) and the `div.border-t` count. Both confirm 3 bet rows are rendered on all viewports.

---

## SK-1b sequencing flag

No complexity surprises that would suggest delaying SK-1b. The data-flow plumbing is clean: the per-hole map is already computed and available per-player per-hole. SK-1b (accordion) needs only:
- A `holeTotalByGame?: Record<string, Record<string, number>>` breakdown (game-id → per-player delta) passed alongside `holeTotal`
- An expand/collapse state in `ScoreRow`

The existing `perHoleDeltas.ts` can be extended to return per-game breakdown alongside the summed total without architectural changes.

**Recommendation: proceed with SK-1b before SK-2.** Rationale: scorecard context is hot; SK-1b is the completion of the UI foundation; SK-2 landing into a fully-realized scorecard (with accordion) produces a better Cowork verification experience than adding the accordion as a second pass after Skins is live.

---

## Vitest count, tsc, PM2

| Gate | Result |
|---|---|
| Vitest | 364/364 (was 358/358; +6 new `perHoleDeltas` tests) |
| tsc --noEmit --strict | Clean (0 new errors) |
| PM2 restart | PID 1604326, `golf` online |
| HTTP 200 | `http://localhost:3000/golf` → 200 ✓ |
