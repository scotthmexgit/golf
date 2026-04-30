---
prompt_id: 002
date: 2026-04-30
role: engineer
checklist_item_ref: "SK-1b — Scorecard Accordion: Per-Bet Breakdown"
tags: [sk-1b, scorecard, accordion, per-bet-breakdown, data-testid, regression-clean]
---

# SK-1b — Scorecard Accordion: Per-Bet Breakdown

## Result

SK-1b complete. Accordion expansion live on PM2. All gates green.

---

## Files changed

| File | Action | Notes |
|---|---|---|
| `src/lib/perHoleDeltas.ts` | **Modified** | Returns `{ totals, byGame }` instead of bare totals; single bridge pass |
| `src/lib/perHoleDeltas.test.ts` | **Modified** | Updated to destructure `{ totals, byGame }`; added byGame contract tests |
| `src/components/scorecard/ScoreRow.tsx` | **Modified** | `useState` collapse default; `useEffect` hole-reset; bet row as `<button>`; accordion; `data-testid` |
| `src/app/scorecard/[roundId]/page.tsx` | **Modified** | Destructures `totals`/`byGame`; passes `holeBreakdown`; key changed to `${p.id}-${currentHole}` |

---

## Helper return shape chosen

**`{ totals, byGame }` from `computePerHoleDeltas` — single bridge-dispatch pass.**

```ts
export interface PerHoleDeltasResult {
  totals: Record<number, Record<string, number>>           // hole → pid → netDelta
  byGame: Record<number, Record<string, Record<string, number>>>  // hole → gameId → pid → delta
}
```

**Rationale:** Running the bridge once and populating both maps in the same inner loop is more efficient than two separate passes. The existing `totals` consumer (`holeTotalForCurrentHole`) is unchanged — just reads `.totals[hole]`. The new accordion consumer reads `.byGame[hole]`. The contract is: both maps are absent for holes with no monetary events (SP contributes nothing, Skins will add entries at SK-2).

The page call site changes from `computePerHoleDeltas(...)` (bare record) to destructured `{ totals, byGame } = computePerHoleDeltas(...)`. One call site, one-line change. No other consumers affected.

---

## Expansion target: `<button>` on the bet row (not the full card)

**GM lean was full-card tap target.** Deviation documented here.

The `Stepper` component's `−`/`+` buttons use inline `onClick` handlers with no `stopPropagation`. If the outer card div had `onClick`, clicking the stepper would increment/decrement the score AND toggle the accordion — conflicting interactions. Confirmed by reading `src/components/ui/Stepper.tsx`.

**Resolution:** The bet row itself (`<button type="button">`) is the tap target. Chevron indicator (`▾`/`▴`) makes expandability discoverable. The stepper row is visually and interactively separate; score entry is unaffected by expand/collapse state.

**Default state: collapsed.** Matches GM lean (accordion is information-on-demand; score entry is primary). State resets to collapsed on hole navigation via:
1. `useEffect(() => setIsExpanded(false), [hole])` — fires when `hole` prop changes.
2. `key={`${p.id}-${currentHole}`}` in the page — forces full remount on hole change, guaranteeing a fresh collapsed state even before the effect fires.

Both mechanisms are harmless and doubly safe.

---

## `data-testid` naming convention

| Attribute | Element | Pattern |
|---|---|---|
| `hole-bet-total-{playerId}` | `<button>` tap-to-expand | Per-player per-hole bet total + toggle |
| `hole-bet-breakdown-{playerId}-{gameId}` | `<div>` sub-row | Per-player per-game per-hole delta |

Exact match to GM-suggested convention. Verified present via `document.querySelectorAll` in Playwright on all three viewports.

---

## Visual treatment

- No animation (matches existing scorecard vocabulary — no animations anywhere in the codebase).
- Chevron `▾` (collapsed) / `▴` (expanded) inline in the "Bet" label span. No separate chevron element.
- Sub-rows are slightly indented (`pl-3`) to visually subordinate them under the bet row.
- Sub-row colors match the bet row: green for positive, red for negative, muted for zero.

---

## AC checklist (SKINS_PLAN.md §SK-1b)

| Item | Status |
|---|---|
| Collapsed state is the default | ✓ — `useState(false)`; resets on hole navigation |
| Tap/click on bet row expands to per-game breakdown | ✓ — `<button onClick={toggle}>` on the bet row |
| Tap again collapses | ✓ — toggle logic; confirmed with Playwright |
| Per-game sub-rows show ALL active games (including $0 entries) | ✓ — `playerGames.map(g => ...)` iterates all games in player's `playerIds` |
| $0 sub-rows shown, not hidden | ✓ — SP shows "strokePlay —" in every accordion expansion |
| Score entry unaffected by expand/collapse | ✓ — stepper and dot buttons are not part of the button tap target |
| `data-testid` attributes on bet row and sub-rows | ✓ — `hole-bet-total-{pid}` and `hole-bet-breakdown-{pid}-{gameId}` |
| `npm run test:run` passes | ✓ — 367/367 |
| `tsc --noEmit --strict` passes | ✓ — clean |
| `stroke-play-finish-flow.spec.ts` still passes (R6 regression gate) | ✓ — 1/1 green |
| Fence: no engine/bridge/results/bets/wizard/`payouts.ts` changes | ✓ |
| Fence: Skins stays parked | ✓ — GAME_DEFS unchanged |
| SK-1a `holeTotal` prop shape unchanged | ✓ — still `Record<string, number>` |

---

## Mobile viewport verification (R7 — additive over SK-1a)

Tests against PM2 server using Playwright direct Chromium.

| Viewport | Bet buttons | Expand: breakdown rows | Sub-row text (SP) | Collapse | Overflow |
|---|---|---|---|---|---|
| Desktop 1280×800 (4p) | 4 ✓ | 1 ✓ | `"strokePlay—"` ✓ | 0 ✓ | None |
| Mobile 375×667 (3p) | 3 ✓ | 1 ✓ | `"strokePlay—"` ✓ | 0 ✓ | None |
| Mobile 320×568 (2p) | 2 ✓ | 1 ✓ | `"strokePlay—"` ✓ | 0 ✓ | None |

**Note on sub-row label:** sub-row text shows `"strokePlay"` (camelCase) on hydrated rounds because `hydrateRound` in `roundStore.ts` sets `label: g.type` rather than a human-readable label. This is a pre-existing issue recorded in today's closeout report (IMPL: "camelCase strokePlay label, XS cleanup"). Not introduced by SK-1b. Fresh wizard-created rounds show `"Stroke Play"` correctly (as `gameLabel()` returns the GAME_DEFS label). The SK-4 Playwright spec will use wizard-created rounds and will see the correct label.

---

## Vitest count, tsc, PM2

| Gate | Result |
|---|---|
| Vitest | 367/367 (unchanged from SK-1a +3; no new tests added in SK-1b beyond updated existing) |
| tsc --noEmit --strict | Clean (0 new errors) |
| PM2 restart | PID 1615926, `golf` online |
| HTTP 200 | `http://localhost:3000/golf` → 200 ✓ |

---

## SK-2 readiness note

The accordion is ready to show real Skins data immediately after SK-2 adds `case 'skins': return settleSkinsBet(...).events` to `gameHoleEvents` in `perHoleDeltas.ts`. `SkinWon` events have `hole: number` and `points`, so they land in both `totals` and `byGame` automatically. The accordion sub-row will then show "Skins +$X" on decisive holes and "Skins —" on carried/tied holes. No further scorecard changes needed.
