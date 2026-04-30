---
prompt_id: 007
date: 2026-04-29
role: researcher
checklist_item_ref: "Stroke Play stake unit — label defect vs settlement defect investigation"
tags: [researcher, stroke-play, settlement, label-defect, read-only]
---

# Stroke Play Stake Unit — Researcher Pass

Read-only. No code edits. No commits. This file is the only artifact.

**Files examined:**
- `docs/games/game_stroke_play.md`
- `src/games/stroke_play.ts`
- `src/bridge/stroke_play_bridge.ts`
- `src/components/setup/GameInstanceCard.tsx`
- `src/app/round/new/page.tsx`
- `src/app/results/[roundId]/page.tsx`

---

## 1. Rule Doc — Stake Unit

**`docs/games/game_stroke_play.md §3` (verbatim):**

> **§ 3. Unit of Wager**
>
> Stake is 1 integer unit per player (default 100 minor units). The shape of the payout depends on `settlementMode`:
>
> - `winner-takes-pot` — the winner collects `stake` from every other player.
> - `per-stroke` — every pairwise stroke differential exchanges `stakePerStroke` units between the two players. Default `stakePerStroke = 1`.
> - `places` — every player antes `stake` into a shared pot; the pot distributes to places 1…N per `placesPayout`.

**And §8 (winner-takes-pot pseudocode, verbatim):**

> ```
> winners = players whose net total == min total
> if winners.length == 1:
>   delta[winners[0]] = stake * (N - 1)
>   for each other player: delta[p] = -stake
> ```

**And §10 Worked Example (verbatim):**

> Four players — Alice (hcp 0), Bob (hcp 5), Carol (hcp 10), Dave (hcp 15). `settlementMode = 'winner-takes-pot'`. Stake = 10 units.
>
> Alice wins outright with 77 net. Settlement under `winner-takes-pot`, stake = 10:
>
> | Player | Delta |
> |---|:-:|
> | Alice | +30 |
> | Bob | −10 |
> | Carol | −10 |
> | Dave | −10 |

**Conclusion from rule doc:** Stake is a **per-round, per-player ante**. For `winner-takes-pot`, the winner collects `stake` once from each other player. The word "hole" does not appear in §3 or §8. The worked example uses stake = 10 and produces Alice +30 (= 10 × 3 losers), not 10 × 18 × 3. The rule doc unambiguously defines stake as a per-round unit.

---

## 2. Engine — What It Computes

**`src/games/stroke_play.ts:297–332` — `settleWinnerTakesPot`:**

```javascript
function settleWinnerTakesPot(netTotals, scoringSet, holeRecords, config, base) {
  const minNet = Math.min(...scoringSet.map(p => netTotals[p]))
  const tied = scoringSet.filter(p => netTotals[p] === minNet)

  if (tied.length === 1) {
    const winner = tied[0]
    const points = zeroPoints(scoringSet)
    points[winner] = config.stake * (scoringSet.length - 1)          // line 311
    for (const p of scoringSet) if (p !== winner) points[p] = -config.stake  // line 312
    out.push({ kind: 'StrokePlaySettled', ...base, mode: 'winner-takes-pot', points })
    return out
  }
  ...
}
```

The engine:
- Collects net totals across all holes via 18 `StrokePlayHoleRecorded` events.
- Calls `finalizeStrokePlayRound` **once** at round end (`stroke_play_bridge.ts:76`).
- Inside that, `settleWinnerTakesPot` is called **once**.
- The winner's delta is `config.stake × (N − 1)` — a single multiplication by the player count.
- Each loser's delta is `-config.stake` — flat, one-time deduction.

There is **no multiplication by hole count anywhere** in `settleWinnerTakesPot` or in `finalizeStrokePlayRound`. The engine produces exactly one `StrokePlaySettled` event per round with a flat stake transfer.

**This is per-round settlement.** `config.stake` is consumed once, not 18 times.

---

## 3. Bridge — How Stake Flows

**`src/bridge/stroke_play_bridge.ts:22–41` — `buildSpCfg`:**

```javascript
function buildSpCfg(game: GameInstance): StrokePlayCfg {
  return {
    id: game.id,
    stake: game.stake,          // line 25 — passes GameInstance.stake verbatim
    settlementMode: 'winner-takes-pot',
    ...
  }
}
```

`game.stake` is passed directly to the engine with no transformation. Whatever `GameInstance.stake` holds at the time `settleStrokePlayBet` is called is what the engine uses as its flat per-round ante.

---

## 4. Round Creation UI — Stake Input and Label

**`src/components/setup/GameInstanceCard.tsx:36–47` — stake row:**

```jsx
<label className="text-[11px] font-semibold">Stake $</label>
<input
  type="number"
  value={game.stake / 100}                                          // converts cents to dollars for display
  onChange={(e) => updateGameStake(game.id, Math.round(parseFloat(e.target.value) * 100) || 0)}
  min="0" step="1"
/>
<span className="text-[10px]">/hole</span>                         // line 47 — the label
```

This `<span>/hole</span>` is unconditional — it renders for ALL game types, including Stroke Play.

**`src/app/round/new/page.tsx:49` — review step:**

```jsx
<span className="font-mono text-xs">{formatMoneyDecimal(g.stake)}/hole</span>
```

Unconditional `/hole` suffix on all game types.

**`src/app/results/[roundId]/page.tsx:96` — results page Game Breakdown:**

```jsx
<span className="font-mono text-xs">{formatMoneyDecimal(g.stake)}/hole</span>
```

Unconditional `/hole` suffix on all game types.

**Summary:** Three UI locations (`GameInstanceCard.tsx:47`, `round/new/page.tsx:49`, `results/[roundId]/page.tsx:96`) all unconditionally append `/hole` to the stake display for every game type, including Stroke Play. When a user enters `$5`, the store holds `game.stake = 500` (cents). The input displays as `$5.00` and the UI label reads `$5.00/hole` at all three locations.

---

## 5. Settlement Analysis for Round 13

### Given inputs
- 4 players, 18 holes, `game.stake = 500` (cents — user entered "$5")
- Net totals (computed from gross + handicap): Alice 72, Bob 75, Carol 69, Dave 87

### What the engine produces (stake = 500, `winner-takes-pot`, `tieRule = 'split'`)

Carol has the lowest net total (69). No tie. `settleWinnerTakesPot` at line 311:

```
points[Carol] = 500 × (4 − 1) = 1500   → +$15.00
points[Alice] = −500              → −$5.00
points[Bob]   = −500              → −$5.00
points[Dave]  = −500              → −$5.00
```

Σ delta = 1500 − 500 − 500 − 500 = **0**. Zero-sum. ✓

**Engine output: Carol +$15.00, Alice −$5.00, Bob −$5.00, Dave −$5.00.**

### What a per-hole interpretation would produce

If the engine multiplied stake by hole count (18), the winner would collect `500 × 18 × 3 = 27000` cents = **+$270.00**. Each loser would pay `500 × 18 = 9000` cents = **−$90.00**. Total stakes: $360.

This was NOT observed.

### Observed output (round 13)

Carol +$15.00, Alice −$5.00, Bob −$5.00, Dave −$5.00. Total stakes exchanged: $20.

### Comparison

| Interpretation | Carol | Alice | Bob | Dave | Total stakes |
|---|:-:|:-:|:-:|:-:|:-:|
| Per-round (engine, rule doc) | +$15 | −$5 | −$5 | −$5 | $20 |
| Per-hole (18 × stake) | +$270 | −$90 | −$90 | −$90 | $360 |
| **Observed (round 13)** | **+$15** | **−$5** | **−$5** | **−$5** | **$20** |

**The observed output matches the per-round (engine) computation exactly.**

---

## 6. Verdict

**This is a LABEL DEFECT.**

The engine correctly implements the rule doc's per-round stake semantics. For `winner-takes-pot`, the winner collects `stake` once from each other player, as specified in `docs/games/game_stroke_play.md §3` and implemented at `src/games/stroke_play.ts:311–312`. The bridge passes `game.stake` verbatim (`stroke_play_bridge.ts:25`). The settlement for round 13 (Carol +$15, others −$5 each) is arithmetically correct given stake = $5.

The defect is in the UI: the `/hole` label in all three rendering locations is incorrect for Stroke Play. For Stroke Play, stake is a flat per-round ante — the winner collects it once from each loser, regardless of how many holes were played. Displaying it as `$5.00/hole` implies $5 is wagered on each of 18 holes ($90 at risk per player), which is not what the engine computes.

---

## 7. Fix Scope (Label Defect)

Three files, three locations. All three apply `/hole` unconditionally to all game types. The fix requires making the label conditional on game type.

| File | Line | Current string | Correct label for Stroke Play |
|---|---|---|---|
| `src/components/setup/GameInstanceCard.tsx` | 47 | `<span>/hole</span>` (unconditional) | Should render `/round` (or no suffix) when `game.type === 'strokePlay'` |
| `src/app/round/new/page.tsx` | 49 | `` {formatMoneyDecimal(g.stake)}/hole `` (unconditional) | Should render `/round` when `g.type === 'strokePlay'` |
| `src/app/results/[roundId]/page.tsx` | 96 | `` {formatMoneyDecimal(g.stake)}/hole `` (unconditional) | Should render `/round` when `g.type === 'strokePlay'` |

**Correct unit per rule doc §3:** "the winner collects `stake` from every other player" — the stake is wagered once per round, per player. The appropriate label for Stroke Play is `/round` (one collection at end of round, one payment per loser) or no per-unit label at all.

**Note on other game types:** `/hole` is correct for Skins (stake is wagered hole by hole; a won skin pays the per-hole pot). Whether `/hole` is correct for Wolf, Nassau, or Match Play at their current engine states is a separate question; this pass is scoped to Stroke Play only.

---

## 8. Observations (not actioned — fence)

**Observation A — Cowork player expectation gap is significant.** A user entering "$5/hole" for a 4-player 18-hole Stroke Play round may believe they are wagering $90 at risk (18 holes × $5 × 1 loser = $90 if they lose all), but the engine settles for $5 total exposure. The observed round 13 settlement of Carol +$15 (3 others × $5) is the correct per-rule-doc result. The gap between expected and actual is 18×: $360 vs $20. This is a material user experience issue that would cause every Stroke Play settlement to look "wrong" to a user who interpreted the label literally.

**Observation B — Results page also shows `/hole` in Game Breakdown.** `src/app/results/[roundId]/page.tsx:96` shows `$5.00/hole` in the Game Breakdown section. This compounds the confusion: the results page shows the settlement that actually happened ($15/$5/$5/$5) next to a label that says "$5.00/hole," which is visually inconsistent.

**Observation C — No per-hole stake accumulation path exists in the engine.** The `settleStrokePlayHole` function (`stroke_play.ts:158–195`) emits only `StrokePlayHoleRecorded` events with no `delta` field — it records nets, not money. Money is emitted only once by `finalizeStrokePlayRound`. There is no per-hole monetary settlement for Stroke Play, and the engine architecture makes this clear.
