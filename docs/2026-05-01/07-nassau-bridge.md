---
prompt_id: 07
timestamp: 2026-05-01
checklist_item_ref: "NA-1 — Nassau bridge + cutover"
tags: [na-1, engineering, nassau, bridge]
---

## Prompt

Create `src/bridge/nassau_bridge.ts` following the Wolf bridge pattern. Cut over `payouts.ts` and `perHoleDeltas.ts` from legacy `computeNassau` dispatch to the bridge. Unpark Nassau in `GAME_DEFS`. Prove the F6 invariant: `buildMatchStates(events).nassauMatches` matches the bridge's final MatchState for a round with at least one press. Atomic commit across all dispatch surfaces (F7).

## Explore Findings

1. **Wolf bridge pattern understood.** `wolf_bridge.ts` exports `buildWolfCfg` + `settleWolfBet`. Bridge maps `GameInstance → WolfCfg`, loops holes, calls engine, accumulates events, builds ledger. Nassau requires explicit MatchState threading (unlike stateless Wolf), making the loop non-trivial.

2. **Nassau engine API confirmed.** `settleNassauHole(state, cfg, roundCfg, matches) → {events, matches}` threads state. `openPress(confirmation, cfg, roundCfg, matches) → {events, matches}` adds press MatchState mid-round. `finalizeNassauRound(cfg, roundCfg, matches)` closes remaining open matches.

3. **`holeData.presses` carries match IDs.** The test design confirmed presses are stored as match IDs (e.g. 'front', 'front-Alice-Bob'). Bridge derives `openingPlayer` from post-hole MatchState: `holesWonA < holesWonB → pair[0] down; else pair[1] down`.

4. **GameInstance missing Nassau fields.** `pressRule`, `pressScope`, `pairingMode` were not on `GameInstance`. Added as optional fields in NA-1 Explore. `buildNassauCfg` defaults them until NA-2 wizard surfaces them.

5. **F6 gap: MatchTied not handled in `buildMatchStates`.** `aggregate.ts` marks matches closed on `MatchClosedOut` and `NassauWithdrawalSettled` but not `MatchTied`. Without this, tied matches replay as open → `aggregateRound` would double-finalize them and the F6 test assertion (`m.closed === true` for all) would fail. Fix: add `case 'MatchTied':` marking closed (valid semantically; prevents double-finalization).

6. **T5 withdrawal test required bridge-free redesign.** T5 originally used `settleNassauBet` (partial round) + `buildMatchStates` to get intermediate MatchState for withdrawal testing. Since the bridge always finalizes at round end (closing all matches), the withdrawal path found no open matches. Redesigned T5 to build MatchState directly via `initialMatches` + manual hole counts.

7. **Excess TypeScript properties in test fixture.** `makeGame` junk literal had `ctp/ctpAmount` (not in `JunkConfig`); `makePlayer` had `strokes` (not in `PlayerSetup`). Both removed to pass strict type checking.

## Plan

Six-file atomic change:
1. **Create** `src/bridge/nassau_bridge.ts` — `buildNassauCfg` + `settleNassauBet`
2. **Fix** `src/bridge/nassau_bridge.test.ts` — excess properties, T5 redesign
3. **Modify** `src/games/aggregate.ts` — add `MatchTied` case to `buildMatchStates`
4. **Modify** `src/lib/payouts.ts` — `case 'nassau':` → bridge call
5. **Modify** `src/lib/perHoleDeltas.ts` — add `case 'nassau':` bridge call
6. **Modify** `src/types/index.ts` — remove `disabled: true` from nassau GAME_DEFS entry

Single commit covering all dispatch surfaces (F7 requirement).

## Develop (TDD)

Tests in `nassau_bridge.test.ts` were written first (failing), then implementation.

**nassau_bridge.ts design decisions:**
- `buildNassauCfg`: defaults `pressRule='manual'`, `pressScope='nine'`, `pairingMode=(length>=3?'allPairs':'singles')`, `appliesHandicap=true`, each with `HARDCODE:` comment per no-silent-defaults rule
- Hole loop: sort ascending, call `buildHoleState`, `settleNassauHole`, then iterate `hd.presses` to call `openPress` with derived down player
- Ledger: accumulate only `MatchClosedOut` and `NassauWithdrawalSettled` points (MatchTied carries none)

**aggregate.ts fix:** Added 12-line `case 'MatchTied':` block to `buildMatchStates`. Only marks Nassau bets (checks `betType === 'nassau'` first to avoid affecting Match Play MatchTied events which don't interact with `nassauMatches`).

**Test results:** 454/454 pass (from 445; +9 new bridge tests). tsc clean.

## Reviewer Agent Output

```
VERDICT: APPROVED

Findings: none

Full verification:
A. Rule alignment — PASS. buildNassauCfg defaults match game_nassau.md §4. settleNassauBet threads MatchState[], opens presses, finalizes — matches §5 and §8. MatchTied→closed prevents double-finalization per §6.
B. All 7 ground rules verified: integer math, zero-sum (zeroSum() in F6/T1-T4/T6), portability clean, handicap in one place (strokesOnHole only in nassau.ts), typed audit trail, no silent defaults (all HARDCODE: commented).
C. Portability clean — no next/*, react, @prisma/client in bridge.
D. TypeScript strict — no any, no ts-ignore, discriminated unions throughout.
E. Test coverage — F6 invariant, T1-T7 all covered. Works Example (§10) in nassau.test.ts unchanged.
F. Style — declarative comments, no weasel words.
G. Doc/code sync — GAME_DEFS change matches T7. game_nassau.md §11 events match emitted kinds.
```

## Result

- **Files changed:** `src/bridge/nassau_bridge.ts` (new, +128), `src/bridge/nassau_bridge.test.ts` (new, +434), `src/games/aggregate.ts` (+15), `src/lib/payouts.ts` (+2, -1), `src/lib/perHoleDeltas.ts` (+3), `src/types/index.ts` (+1, -1)
- **Commit:** `95e7c41`
- **Tests:** 454/454 (from 445; +9 new tests)
- **tsc:** clean

## Open questions

- **Bridge-level withdrawal detection:** `HoleData` has no `withdrew` field; `settleNassauBet` cannot auto-detect mid-round withdrawals. Deferred to NA-3/later. T5 tests the engine path directly; bridge auto-detection requires a future data model change.

## Parking lot additions

- None.

---

**NA-1 complete. Reviewer APPROVED. F6 gate satisfied. F7 atomic commit: `95e7c41`. Nassau unparked. NA-2 unblocked pending GM go-ahead.**
