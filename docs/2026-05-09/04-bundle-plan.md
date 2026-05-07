---
prompt_id: "04"
timestamp: 2026-05-09T00:00:00Z
tags: [plan, cowork-findings, bundle, b1-b6]
status: AWAITING_CODEX_REVIEW
---

# Cowork Bundle B1–B6: Plan

**Approval gate:** Yes — touches 4+ files including scorecard page and game logic paths.  
**Verification mode:** Standard — surface to GM after codex review. STOP before Develop.

---

## Ambiguities resolved

| Item | Resolution |
|---|---|
| B2 — page identity | `/bets/[roundId]` ("Bet History page") ≠ BetDetailsSheet ("Round Summary" sheet). BetDetailsSheet works correctly. B2 is about adding per-hole deltas to the separate Bet History page. |
| B4 — per-hole vs end-of-round block | **Per-hole block recommended.** The rule doc's "block end-of-round close" was the only available enforcement when written; per-hole block catches missing declarations sooner. Implement both: per-hole guard in `handleSaveNext` + belt-and-suspenders end-of-round guard in `confirmFinish`. |
| B6 — em-dash intent | **Not a bug.** '—' for Nassau in-progress holes is correct (match-close settlement, not per-hole). Spec update only. |

---

## B1 — Currency formatter fix (XS)

**File to modify:** `src/app/bets/[roundId]/page.tsx`

**Change:**
```typescript
// Before (line 6):
import { vsPar, parLabel, parColor, formatMoney } from '@/lib/scoring'
// line 27:
{formatMoney(payouts[p.id] || 0)}

// After:
import { vsPar, parLabel, parColor, formatMoneyDecimal } from '@/lib/scoring'
// line 27:
{formatMoneyDecimal(payouts[p.id] || 0)}
```

**Tests:** No new unit test needed — the formatter functions are pure and already tested. The Playwright `nassau-flow.spec.ts` results display check serves as the integration guard for `formatMoneyDecimal`. If we add a Playwright spec for Bet History (see B2 below), it should assert the header pills format correctly.

**GR notes:** N/A — no scoring logic. UI-only change.

---

## B2 — Add per-hole bet deltas to Bet History page (S)

**File to modify:** `src/app/bets/[roundId]/page.tsx`

**Data shape available:** `computePerHoleDeltas(holes, players, games)` returns:
```typescript
{
  totals:  { holeNum → { playerId → netDelta } }    // sum across all games
  byGame:  { holeNum → { gameId → { playerId → delta } } }  // per-game
}
```

**Changes:**
1. Add imports: `computePerHoleDeltas` from `'@/lib/perHoleDeltas'`; `formatMoneyDecimal` already imported after B1 fix
2. Compute `const { totals, byGame } = computePerHoleDeltas(holes, players, games)` at component top
3. In each player row inside each hole card: add a `formatMoneyDecimal(totals[h.number]?.[p.id] ?? 0)` right-side amount, color-coded (green/red/muted like Results page)
4. Optional (same pattern as BetDetailsSheet): add expandable per-game breakdown rows per player. If the per-game breakdown adds complexity, defer it to a follow-on and ship only the totals column now. Plan includes it; Develop decides.

**Orchestration code (proposed player row):**
```typescript
<div key={p.id} className="flex items-center justify-between text-xs">
  <span style={{ color: 'var(--ink)' }}>{(p.name || 'Golfer').split(' ')[0]}</span>
  <div className="flex items-center gap-2">
    <span className="font-mono">{score}</span>
    <span className="font-mono w-12 text-right" style={{ color: parColor(diff) }}>{parLabel(diff)}</span>
    <span className="font-mono w-14 text-right font-semibold"
      style={{ color: holeDelta > 0 ? '#22c55e' : holeDelta < 0 ? 'var(--red-card)' : 'var(--muted)' }}>
      {formatMoneyDecimal(holeDelta)}
    </span>
  </div>
</div>
```
Where `holeDelta = totals[h.number]?.[p.id] ?? 0`.

**Tests:** Add to Playwright wolf-skins-multibet-flow or create a new bets-page Playwright check verifying the hole delta amounts appear and format correctly (+$X.XX for winner, -$X.XX for loser).

**GR notes:** No scoring logic changes. Pure display. GR2 (integer math) preserved — `totals` values are already in minor units; `formatMoneyDecimal` divides by 100.

---

## B3 — Results page Game Breakdown per-player subtotals (S)

**File to modify:** `src/app/results/[roundId]/page.tsx`

**Current:** Game Breakdown renders `{formatMoneyDecimal(g.stake)}{stakeUnitLabel(g.type)}` per game — shows stake, not player outcomes.

**Target:** For each game, show per-player subtotals below the game label.

**Data approach:** Compute per-game PayoutMap by calling `computeAllPayouts(holes, players, [g])` for each game individually. This reuses the existing engine correctly — each call produces the isolated payout for one bet.

```typescript
// Compute inside the component (after const payouts = computeAllPayouts(...)):
const gamePayouts = games.map(g => ({
  game: g,
  perPlayer: computeAllPayouts(holes, players, [g]),
}))
```

**Proposed Game Breakdown render:**
```typescript
{gamePayouts.map(({ game: g, perPlayer }) => (
  <div key={g.id} className="py-1.5 border-b last:border-0" style={{ borderColor: 'var(--line)' }}>
    {/* Game label row */}
    <div className="flex items-center justify-between text-sm">
      <span>{g.label}</span>
      <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
        {formatMoneyDecimal(g.stake)}{stakeUnitLabel(g.type)}
      </span>
    </div>
    {/* Per-player subtotals */}
    {sorted.map(p => {
      const amt = perPlayer[p.id] ?? 0
      return (
        <div key={p.id} className="flex items-center justify-between text-xs pl-3 mt-0.5">
          <span style={{ color: 'var(--muted)' }}>{(p.name || 'Golfer').split(' ')[0]}</span>
          <span className="font-mono font-semibold"
            style={{ color: amt > 0 ? '#22c55e' : amt < 0 ? 'var(--red-card)' : 'var(--muted)' }}>
            {formatMoneyDecimal(amt)}
          </span>
        </div>
      )
    })}
  </div>
))}
```

**Tests:** Add assertions to wolf-skins-multibet-flow.spec.ts (already exercises the results page) or nassau-flow.spec.ts that per-player game subtotals appear and sum to zero per game.

**GR3 note:** Per-game subtotals must sum to 0 within each game (GR3 invariant). `computeAllPayouts([g])` enforces this via `aggregateRound`'s `ZeroSumViolationError`.

---

## B4 — Wolf per-hole save guard (XS)

**File to modify:** `src/app/scorecard/[roundId]/page.tsx`

**Guard 1: Per-hole (in `handleSaveNext`):**
```typescript
const handleSaveNext = async () => {
  if (!allScored || !holeData) return

  // Wolf declaration guard — must declare before saving hole
  if (wolfGame && !holeData.wolfPick) {
    setNotices(prev => [...prev.filter(n => !n.includes('Wolf')),
      'Wolf: captain must declare before saving this hole.'])
    return
  }

  detectNotices()
  // ... rest of handler unchanged
}
```

**Guard 2: End-of-round belt-and-suspenders (in `confirmFinish`):**
```typescript
const confirmFinish = async () => {
  setShowFinishConfirm(false)
  // Belt-and-suspenders: block finish if any hole missing Wolf declaration
  if (wolfGame) {
    const missing = holes.filter(h =>
      scoredHoles.has(h.number) && !h.wolfPick
    )
    if (missing.length > 0) {
      setFinishError(`${missing.length} hole(s) missing Wolf declaration. Go back and declare.`)
      return
    }
  }
  // ... rest of handler unchanged
}
```

**Notice approach:** Guard 1 re-uses the existing `notices` state (already rendered at line 337). No new UI component needed. The notice text is distinct from existing birdie/eagle/snake notices.

**Disable button approach (alternative):** Modify the BottomCta `disabled` prop: `disabled={!allScored || (!!wolfGame && !holeData?.wolfPick)}`. This is cleaner but gives no explanation. Combine: use button disable AND a notice for the first attempt.

**Recommended implementation:** Disable button immediately when Wolf is active + no declaration (user sees button grey out), plus show the notice after the first attempt. This is the simplest and most user-friendly.

**Tests:** Update wolf-flow.spec.ts or wolf-skins-multibet-flow.spec.ts: assert that "Save & Next Hole" is disabled when Wolf is active and no declaration exists; assert it enables after declaring.

**GR7 note:** The engine emits `WolfDecisionMissing` (explicit event, zero delta) for holes without a declaration — GR7 is satisfied at the engine level. This guard is a UI-only enforcement that prevents the user from creating more missing-decision holes.

---

## B5 — Nassau Manual press trigger (M)

**Files to modify:**
1. `src/lib/nassauPressDetect.ts` — add `detectManualNassauPressOffers` export
2. `src/app/scorecard/[roundId]/page.tsx` — render "Press?" button for Manual mode

### nassauPressDetect.ts additions

Add a new export below the existing `detectNassauPressOffers`:

```typescript
/**
 * Returns press offers for Manual press mode.
 *
 * Unlike detectNassauPressOffers (auto modes only), this function handles
 * pressRule='manual' by computing the current match standings and returning
 * an offer for every open match that has a down player. The player opt-in
 * (tapping the "Press?" button) is the gate — engine will accept any lead > 0.
 *
 * Called on every render to reactively update button visibility. Returns []
 * when no press is eligible (no down player, no open matches in window).
 */
export function detectManualNassauPressOffers(
  currentHole: number,
  holes: HoleData[],
  players: PlayerSetup[],
  game: GameInstance,
): PressOffer[] {
  if (game.pressRule !== 'manual') return []

  const bettingPlayers = players.filter(p => game.playerIds.includes(p.id))
  const cfg = buildNassauCfg(game)
  const roundCfg = buildMinimalRoundCfg(cfg, 'nassau')

  const sortedHoles = [...holes].sort((a, b) => a.number - b.number)
  const holesUpToCurrent = sortedHoles.filter(h => h.number <= currentHole)

  let matches: MatchState[] = initialMatches(cfg)

  // Thread MatchState through all holes including prior confirmed presses.
  // (Same threading logic as detectNassauPressOffers — shares correctness.)
  for (const hd of holesUpToCurrent) {
    const state = buildHoleState(hd, bettingPlayers)
    const { matches: updatedMatches } = settleNassauHole(state, cfg, roundCfg, matches)
    matches = updatedMatches
    const priorPresses = hd.number < currentHole ? (hd.presses?.[cfg.id] ?? []) : []
    for (const parentMatchId of priorPresses) {
      const parent = matches.find(m => m.id === parentMatchId)
      if (!parent || parent.closed) continue
      const [pA, pB] = parent.pair
      const openingPlayer = parent.holesWonA < parent.holesWonB ? pA : pB
      const { matches: pressed } = openPress({ hole: hd.number, parentMatchId, openingPlayer }, cfg, roundCfg, matches)
      matches = pressed
    }
  }

  const offers: PressOffer[] = []
  for (const match of matches) {
    if (match.closed) continue
    if (currentHole < match.startHole || currentHole > match.endHole) continue
    const [playerA, playerB] = match.pair
    let downPlayer: string | null = null
    if (match.holesWonA < match.holesWonB) downPlayer = playerA
    else if (match.holesWonB < match.holesWonA) downPlayer = playerB
    if (!downPlayer) continue
    offers.push({ gameId: game.id, matchId: match.id, downPlayer, pair: [playerA, playerB] })
  }
  return offers
}
```

### scorecard page additions

```typescript
// Add import:
import { detectNassauPressOffers, detectManualNassauPressOffers } from '@/lib/nassauPressDetect'

// Add memoized manual offers (reactive to score changes):
const manualNassauGames = games.filter(g => g.type === 'nassau' && g.pressRule === 'manual')
const manualPressOffers = useMemo(
  () => manualNassauGames.flatMap(g =>
    holeData ? detectManualNassauPressOffers(currentHole, holes, players, g) : []
  ),
  [currentHole, holes, players, manualNassauGames, holeData],
)

const handleManualPress = () => {
  if (manualPressOffers.length > 0) {
    setPendingPressOffers(manualPressOffers)
  }
}
```

Add "Press?" button in the scorecard content area (after `WolfDeclare`, before score rows):
```typescript
{manualPressOffers.length > 0 && (
  <button
    type="button"
    onClick={handleManualPress}
    className="w-full py-2.5 rounded-xl text-sm font-semibold"
    style={{ background: 'var(--green-mid)', color: 'var(--sand)' }}
    data-testid="manual-press-button"
  >
    Press? {manualPressOffers.map(o => `(${players.find(p => p.id === o.downPlayer)?.name?.split(' ')[0] || o.downPlayer} is down)`).join(', ')}
  </button>
)}
```

**Tests:**
- Unit: test `detectManualNassauPressOffers` returns offers when a player is down under Manual mode, returns [] for Auto mode, returns [] when no player is down
- E2E: new Playwright spec `nassau-manual-press-flow.spec.ts` — Manual round, player down after 2 holes, "Press?" button appears, tap Accept, verify press match active

**GR7 note:** `detectManualNassauPressOffers` returns `PressOffer[]` — no silent zero paths. The "Press?" button only appears when offers exist; no offer = no button (explicit absence, not silent).

---

## B6 — Spec update: Nassau per-hole em-dash (XS, no code change)

**Finding:** Nassau '—' per-hole is CORRECT. Match-close settlement model means in-progress holes have $0 delta → `formatMoneyDecimal(0)` = '—'. The spec clause "Tied holes show $0.00, not blank" applies to Skins and Wolf (per-hole games), not Nassau or Stroke Play.

**Change:** Update CLAUDE.md Cowork spec (the Cowork CLAUDE.md just created) to clarify:
> "Nassau per-hole display: in-progress holes (no match closed) correctly show '—'. The '—' means 'no settlement yet on this hole.' Only holes where a match closes (front on hole ~7–9, back/overall on hole ~14–18) will show a $ amount. '$0.00 for tied holes' applies to Skins and Wolf, not Nassau."

**No code changes.**

---

## 7 Ground rules — Develop constraints

- **GR1:** B4 guard comment references `docs/games/game_wolf.md §9`. B5 comment references `docs/games/game_nassau.md §5`. No inline rule restatement.
- **GR2:** B1/B2/B3 use `formatMoneyDecimal` which divides by 100 — preserves minor-unit integer math. B4/B5 don't touch monetary values.
- **GR3:** B3's per-game subtotals come from `computeAllPayouts([g])` which is internally zero-sum enforced. B5's press outcomes are zero-sum by engine construction.
- **GR4:** No handicap changes in any B item.
- **GR5:** nassauPressDetect.ts imports only from types, games/*, bridge/shared — portability preserved.
- **GR6:** B5's `detectManualNassauPressOffers` calls `offerPress` which emits `PressOffered` (typed event). No new event types needed; the modal calls `setPressConfirmation` which feeds into the bridge via the existing typed `hd.presses` blob.
- **GR7:** B4 guard emits an explicit user notice (not silent). B5 "Press?" button only appears when offers are non-empty (no silent-show). `detectManualNassauPressOffers` returns empty array when no down player (explicitly correct, not silent zero).
- **GR8:** B5 passes `game.id` as `gameId` in `PressOffer` — same id chain as Auto press path.

---

## File inventory

| File | Bugs | Change |
|---|---|---|
| `src/app/bets/[roundId]/page.tsx` | B1, B2 | formatter swap + `computePerHoleDeltas` + delta column |
| `src/app/results/[roundId]/page.tsx` | B3 | per-game per-player subtotals in Game Breakdown |
| `src/app/scorecard/[roundId]/page.tsx` | B4, B5 | Wolf guard in save handler + Manual press button |
| `src/lib/nassauPressDetect.ts` | B5 | `detectManualNassauPressOffers` export |
| CLAUDE.md (Cowork doc) | B6 | Spec clarification (no code) |

---

## Estimates

| Bug | Estimate | Notes |
|---|---|---|
| B1 | XS | 1 import + 1 usage |
| B2 | S | ~30 lines: import + `computePerHoleDeltas` call + column in player rows |
| B3 | S | ~25 lines: per-game payout loop + expanded Game Breakdown render |
| B4 | XS | ~15 lines: two guards (per-hole + end-of-round) |
| B5 | M | ~80 lines: new detection function + scorecard integration + E2E test |
| B6 | XS | Spec update only |
| **Bundle total** | **M** | Single session realistic; B5 E2E may spill to tail |

---

## Cross-bug interactions (Develop notes)

1. **B1 + B2 same file:** Do both in a single file edit. Import `formatMoneyDecimal` once, import `computePerHoleDeltas`, apply both changes together.
2. **B4 + B5 both touch scorecard page:** Implement in order — B4 first (guard in save handler, doesn't touch render), B5 second (new button in render area). No conflict.
3. **B2 + B3 share `computeAllPayouts` import:** Results page already imports it. Bets page will add `computePerHoleDeltas`. Different functions, no conflict.

---

## STOP — GM must approve Plan and Codex findings before Develop begins.
