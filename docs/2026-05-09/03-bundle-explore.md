---
prompt_id: "03"
timestamp: 2026-05-09T00:00:00Z
tags: [explore, cowork-findings, bundle, b1-b6]
status: COMPLETE
---

# Cowork Bundle B1–B6: Explore Findings

**Source:** Cowork findings 2026-05-09 rounds 50 (WF7-4) and 51 (NA-5).

---

## B1 — Currency formatter on Bet History header pills

**File:** `src/app/bets/[roundId]/page.tsx`

**Current code (line 6, 27):**
```typescript
import { vsPar, parLabel, parColor, formatMoney } from '@/lib/scoring'
// ...
{formatMoney(payouts[p.id] || 0)}
```

**`formatMoney` (scoring.ts:28-32):**
```typescript
export function formatMoney(amount: number): string {
  if (amount === 0) return '—'
  const sign = amount > 0 ? '+' : '-'
  return `${sign}$${Math.abs(amount).toFixed(0)}`
}
```

**`formatMoneyDecimal` (scoring.ts:34-38):**
```typescript
export function formatMoneyDecimal(amount: number): string {
  if (amount === 0) return '—'
  const sign = amount > 0 ? '+' : '-'
  return `${sign}$${(Math.abs(amount) / 100).toFixed(2)}`
}
```

**Root cause:** Payouts from `computeAllPayouts` are in minor units (e.g., 1000 = $10.00). `formatMoney` does NOT divide by 100 — it outputs the raw integer as if it were dollars. `formatMoneyDecimal` divides by 100 and adds two decimal places, producing the correct display.

Example: stake=$10/hole, Wolf winner gets 3000 minor units.
- `formatMoney(3000)` → `+$3000` (wrong — shows raw minor units)
- `formatMoneyDecimal(3000)` → `+$30.00` (correct)

The Results page already uses `formatMoneyDecimal` (line 8 of results page) and displays correctly. The bets page uses `formatMoney` — the only place this bug manifests.

**Fix scope:** 1-char import swap + 1 usage site. XS.

---

## B2 — Per-hole $ deltas missing from Bet History page

**Naming resolution:** Two distinct surfaces exist:
- `/golf/bets/[roundId]` — "Bet History page." A standalone page showing holes played with gross scores + par labels. No bet deltas.
- `BetDetailsSheet.tsx` — "Round Summary" sheet. A scorecard bottom sheet showing per-hole per-game bet deltas via `computePerHoleDeltas`. Accessed via the "Summary" button on the scorecard header.

Cowork navigated to the Bet History page. The CLAUDE.md Cowork spec refers to BetDetailsSheet. They are two different surfaces. **BetDetailsSheet already works correctly** — it calls `computePerHoleDeltas`, renders per-player totals and per-game breakdowns. The Bet History page does not.

**Current bets page structure (src/app/bets/[roundId]/page.tsx):**
- Header pills: running totals via `computeAllPayouts` + `formatMoney` (B1 bug)
- Per-hole cards: one card per scored hole, showing player name + gross score + par label. No bet deltas. No `computePerHoleDeltas` call.

**Data available:** The store provides `holes`, `players`, `games`. `computePerHoleDeltas` is already implemented and works for all game types. The bets page just needs to call it and render the results.

**Fix scope:** Import `computePerHoleDeltas` and `formatMoneyDecimal`, compute `totals` and `byGame`, add per-player bet delta column to each hole card row. S.

---

## B3 — Results page Game Breakdown shows stakes only

**Current code (results/[roundId]/page.tsx:89-100):**
```typescript
{games.map(g => (
  <div key={g.id} className="...">
    <span>{g.label}</span>
    <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
      {formatMoneyDecimal(g.stake)}{stakeUnitLabel(g.type)}
    </span>
  </div>
))}
```

**What renders:** `Wolf  +$10.00/hole`, `Skins  +$10.00/hole`. This is the stake, not the per-player outcome.

**What spec requires:** Per-player subtotals per game (what each player won/lost from each bet type). This lets users reconcile the Money Summary total against individual game contributions.

**Data to add:** `computeAllPayouts(holes, players, [g])` for each game `g` returns a `PayoutMap` with each player's net result for just that game. This is already computed inside `computeAllPayouts` for the combined result — calling it with a single game is a cheap and correct approach.

**Fix scope:** Expand Game Breakdown section. For each game, render both the stake line and a per-player payout sub-section. S.

---

## B4 — Wolf scorecard allows advance without captain declaration

**Save button (scorecard page:351):**
```typescript
<BottomCta label={isLastHole ? 'Finish Round →' : 'Save & Next Hole →'}
  onClick={handleSaveNext}
  disabled={!allScored}
/>
```

**`handleSaveNext` (lines 205-222):** No Wolf declaration guard. Only checks `!allScored`. The Wolf declaration check via `detectNotices()` generates a notice string but is NOT blocking — the function returns a notice list and sets `setNotices(n)` while `handleSaveNext` continues to `await proceedSave()`.

**Wolf rule doc §9:** "The UI must block end-of-round close until every hole has a decision."

**Spec says:** "end-of-round close." Not per-hole save.

**Spec ambiguity resolution (recommendation):**
Both interpretations are defensible, but **per-hole block is recommended** because:
1. Catches the missing declaration at the source (hole N) rather than discovering 15 holes later
2. The "No declaration yet" notice already fires per-hole — adding a block is a natural extension
3. End-of-round-only block allows a round to be "completed" with 18 missing decisions silently
4. The spec was written before per-hole save existed as a concept; "end-of-round close" was the only available enforcement point at that time

**Fix scope:** In `handleSaveNext`, after `detectNotices()`, check: `wolfGame && !holeData.wolfPick` → add a blocking notice and `return`. Also check `confirmFinish` for end-of-round guard (belt-and-suspenders). XS for per-hole guard; XS for end-of-round guard; implement both.

**Wolf declaration state:** `holeData.wolfPick` is the field. Unset = no declaration. Set to `p.id`, `'solo'`, or `'blind'` = declared.

---

## B5 — Nassau Manual press unreachable

**Already fully documented in:** `docs/2026-05-09/02-b5-manual-press-discovery.md`. Verdict (b) Partially wired.

**Key finding (summarized):**
- `nassauPressDetect.ts` line 38: `if (game.pressRule === 'manual') return []` — explicit early return with "NA-4 UI button" TODO
- No manual press trigger exists anywhere in the UI
- Engine, bridge, store, `PressConfirmationModal` all ready

**Plan detail (refined from discovery doc):**

**(a) Detection function location:** Add `detectManualNassauPressOffers` as a new export in `nassauPressDetect.ts` (same file — logically grouped). It mirrors the auto-detection flow (thread MatchState, check for down players) but without the auto-threshold filter, and with no `pressRule === 'manual'` early return. Any lead > 0 qualifies.

**(b) "Press?" button location:** Rendered in the scorecard page's main content area, between `WolfDeclare` and the score rows (or just above the save button). Only visible when a Manual-mode Nassau game has a down player. Must not appear for Auto-mode Nassau.

**(c) Button behavior:** On tap → run `detectManualNassauPressOffers(currentHole, holes, players, game)` → set `pendingPressOffers` → `PressConfirmationModal` opens. Modal already handles accept/decline correctly. No new modal needed.

**(d) Re-evaluation trigger:** Computed via `useMemo` keyed on `[currentHole, holes, players, games]`. Reactive to score changes on the current hole.

**(e) E2E test:** One new Playwright spec — Manual press round: player down after hole 2, press button appears, accept → press match active, verify settlement.

**Fix scope:** M (new detection function ~40 lines + scorecard integration ~20 lines + E2E test ~50 lines).

---

## B6 — Nassau per-hole shows em-dash vs $0.00

**Surface:** BetDetailsSheet ("Round Summary" sheet on scorecard).

**Observed behavior:** Per-hole Nassau rows show '—' for every hole.

**Investigation:**

`formatMoneyDecimal(0) = '—'` (scoring.ts:35). For holes where no Nassau match closes, `totals[hole][playerId]` is absent from the map, defaulting to `0` → '—'.

`finalizeNassauRound` (nassau.ts:481-519) assigns settlement to `hole: match.endHole` (hole 9 for front, hole 18 for back and overall). For Cowork's round 51 (only 2 holes scored, front still open 2-0), `finalizeNassauRound` would assign final settlement to hole 9 and hole 18 — but holes 9 and 18 are not in `scoredHoles` (which filters to holes with at least one score). So settlement deltas land in `totals[9]` and `totals[18]` but no BetDetailsSheet rows render for those holes, because the player didn't score them.

**Conclusion:** The '—' on holes 1 and 2 in round 51 is CORRECT. No match closed on holes 1 or 2 — the per-hole delta is legitimately 0. The '—' means "no payout realized on this hole yet," which is semantically accurate for Nassau (match-close settlement model, not per-hole model).

**Spec clause "Tied holes show $0.00, not blank":** This was written for Skins and Wolf, which are per-hole games where a "tied hole" is a meaningful event (SkinVoid / WolfHoleTied). Nassau holes without a match close are NOT "tied holes" in that sense — they're in-progress holes with no settlement. '—' is the correct display.

**Verdict: NOT a code bug.** The em-dash is semantically correct for in-progress Nassau holes. The spec clause does not apply to Nassau.

**Fix scope:** SPEC UPDATE only (CLAUDE.md Cowork spec, no code). Clarify that '$0.00 for tied holes' applies to Skins and Wolf; Nassau and Stroke Play correctly show '—' for in-progress/no-delta holes, and show the actual delta only on settlement holes.

---

## Cross-bug interactions

| Interaction | Detail |
|---|---|
| B1 + B2: same file | Both fix `src/app/bets/[roundId]/page.tsx`. B1 fixes the formatter; B2 adds per-hole deltas. Can be done in a single file edit. |
| B1 formatter fix | `formatMoney` → `formatMoneyDecimal`. After B2 lands, the bets page also uses `formatMoneyDecimal` for hole-level deltas, making the imports consistent. |
| B2 + B3: per-game data | B2 uses `computePerHoleDeltas` (per-hole breakdowns); B3 uses `computeAllPayouts([g])` per game (round totals). Different functions, different pages. No shared fix path, but conceptually aligned. |
| B4 + B5: both touch scorecard save flow | B4 adds a Wolf guard before `proceedSave`. B5 adds a Manual press button (tap-to-trigger, not in the save flow). They don't conflict — B4 guard runs in `handleSaveNext`, B5 button is a separate UI element. |
| B6 + B1/B2: formatter | B6's spec update clarifies that '—' for Nassau/SP is intentional. This should be noted in code comments where `formatMoneyDecimal` is used in BetDetailsSheet (it returns '—' for 0, which is by design). |
