---
prompt_id: "16"
timestamp: 2026-05-08T00:00:00Z
checklist_item_ref: "Phase 7 #11 — perHoleDeltas.ts cutover"
tags: [explore, phase-7, perHoleDeltas]
status: STOP_FOR_GM — plan ready; codex review in 17-perholedeltas-plan.md
---

# perHoleDeltas.ts — Explore Report (Step 1)

## Files read

- `src/lib/perHoleDeltas.ts` (84 lines)
- `src/lib/perHoleDeltas.test.ts` (241 lines)
- `src/games/aggregate.ts` (aggregateRound return type + finalizer logic)
- `src/games/events.ts` (NassauHoleResolved, MatchClosedOut, WithPoints)
- `src/bridge/nassau_bridge.ts` (settleNassauBet, finalizeNassauRound call)
- `src/games/nassau.ts` (matchPoints, finalizeNassauRound, MatchClosedOut emission)
- `src/components/scorecard/BetDetailsSheet.tsx` (stale comment)
- `docs/2026-05-07/07-wf72-develop.md` (WF7-2 deferral context)
- `cowork-claude.md` (B6 — Nassau per-hole display spec)
- Git history: `git log --oneline src/lib/perHoleDeltas.ts`

---

## 10-item dispatch-shape checklist

| # | Question | Answer |
|---|---|---|
| 1 | **Overall dispatch shape?** | Per-game: one bridge call per game type, all holes fed at once. Returns `ScoringEvent[]` for hole-level filtering. |
| 2 | **Per-bet or per-hole log assembly?** | Per-game. `gameHoleEvents(holes, players, game)` calls one bridge for the full round; outer loop iterates games. |
| 3 | **Compound keys (Nassau `${betId}::${matchId}`)?** | NOT relevant here. `byGame` uses `game.id` as the key; compound-key disambiguation is `aggregateRound`'s concern, not the event-filter path. |
| 4 | **Finalizer concern?** | Nassau finalizer (`finalizeNassauRound`) runs INSIDE `settleNassauBet` (bridge line 130). Finalizer emits `MatchClosedOut` with `hole: match.endHole` (e.g., 9 for front-9) and `points`. These LAND in the per-hole map — this is how Nassau settlement holes show money. |
| 5 | **Direct bridge calls?** | Yes: `settleStrokePlayBet`, `settleSkinsBet`, `settleWolfBet`, `settleNassauBet`. All four active types already present. |
| 6 | **Dispatch completeness for Phase 7 scope?** | YES. All four active bet types are wired. `matchPlay` stays `default: return []` (disabled in GAME_DEFS). |
| 7 | **Can use `aggregateRound`?** | **NO.** `aggregateRound` returns `RunningLedger = { netByPlayer, byBet, lastRecomputeTs }` — no events, no per-hole data. The "aggregateRound cutover" framing from prior EODs is architecturally inapplicable to this function. `computePerHoleDeltas` needs raw per-hole events; `aggregateRound` returns round-level settlement. |
| 8 | **GR8 id chain?** | Holds. `buildNassauCfg(game)` → `cfg.id = game.id` → `MatchClosedOut.declaringBet = game.id` → `byGame[hole][game.id]`. `buildWolfCfg(game).id === game.id` and `buildSkinsCfg(game).id === game.id` similarly confirmed in prior sweep tests. |
| 9 | **matchPlay case?** | Out of scope — `disabled: true` in GAME_DEFS. `default: return []` is correct. |
| 10 | **Test surface?** | `perHoleDeltas.test.ts` covers SP (Choice B — no per-hole), Wolf (WF-1 era), Skins (SK-2 era). **Zero Nassau tests.** Nassau wired in NA-1 but no test coverage added. |

---

## Key architectural finding

`NassauHoleResolved` (the per-hole win event) has NO `points` field:
```typescript
type NassauHoleResolved = EventBase & WithBet & {
  kind: 'NassauHoleResolved'
  hole: number
  matchId: string
  winner: 'A' | 'B' | 'tie'
}
```

`perHoleDeltas.ts` filters `event.hole != null && 'points' in event`. Therefore `NassauHoleResolved` is FILTERED OUT — it does NOT contribute to the per-hole delta map. This is CORRECT and INTENTIONAL.

Nassau per-hole deltas come from `MatchClosedOut` events (WITH `points`):
- `settleNassauHole` emits early `MatchClosedOut` when a side goes +4 (non-playable lead)
- `finalizeNassauRound` emits end-of-match `MatchClosedOut` at `hole: match.endHole` (9, 18, etc.)

This produces the behavior described in `cowork-claude.md`:
> "Only holes where a match closes will show a $ amount — for a front-9 Nassau, that is typically hole 7–9 (when the front match closes out)"

Nassau per-hole map:
- Regular in-progress holes → `—` (NassauHoleResolved has no points → filtered)
- Settlement/closeout hole → `$N` (MatchClosedOut has hole + points → lands in map)

This matches B6's conclusion: Nassau `—` per hole is NOT a bug.

---

## Stale artifacts found

| Location | Line | Stale content |
|---|---|---|
| `src/lib/perHoleDeltas.ts` | 16-17 | `// • Parked games (wolf, nassau, matchPlay, etc.): default → [] until their bridges are wired.` — Wolf and Nassau ARE wired |
| `src/components/scorecard/BetDetailsSheet.tsx` | 20-21 | `// automatically. Nassau and Match Play will appear when their perHoleDeltas.ts // dispatch is wired.` — Nassau IS wired |

---

## Git history

- `c3f7e0a` (SK-0–SK-5): Skins case added; file created
- `e77e05a` (DevFlow Day 1): Wolf case added
- `95e7c41` (NA-1): Nassau case added

All four active types were added incrementally. No wiring gap remains.

---

## Explore conclusion

The "perHoleDeltas.ts cutover" is ALREADY FUNCTIONALLY COMPLETE. All four active bet types dispatch correctly. Nassau per-hole behavior is correct and intentional.

**Remaining scope (not a structural migration):**
1. Update 2 stale comments (XS)
2. Add Nassau test coverage to `perHoleDeltas.test.ts` — 6 test cases, NHC1-NHC6 (S)
3. No functional code changes needed

This recharacterizes the prompt from "aggregateRound migration (S)" to "test coverage + comment cleanup (S)".
