---
prompt_id: 013
timestamp: 2026-04-20T22:50:38Z
checklist_item_ref: "#5 — Nassau engine, Phase 1"
tags: [engineer, nassau, phase-1, types, per-hole-scoring]
---

## Prompt

All four input decisions landed (I1/I4 pair-wise, I2 explicit state threading, I3 tied-withdrawal = MatchTied, I4 full rationale). Phases 1–4 approved; Phase 2 explicitly 2 turns; Phase 4 adds two grep gates. Add documenter backlog item (D1) for rule-file § 5 pseudocode and § 9 N35 resolution. Begin Phase 1: re-state scope verbatim (same re-focus protocol as #3, #4), then execute. Fence: Phase 1 scope only, pair-wise holeResult, no press logic. Park any Phase 2+ observations.

## Action

1. **Added D1 backlog item** to `IMPLEMENTATION_CHECKLIST.md`:
   "Documenter: resolve Nassau rule-file ambiguities surfaced at prompt 012. Update game_nassau.md § 5 pseudocode to show pair-wise USGA allocation (per I1/I4 decision); update § 9 N35 to clarify that 'in favor of opposing player' applies only when a lead exists, so tied in-flight matches on withdrawal get MatchTied zero-delta per § 6. Independent; can be done any time. (XS)"
   Placed right after the `(#5 is currently Active)` placeholder, before #6.

2. **Re-stated Phase 1 verbatim** (scope, files touched, verification checkpoints) in the response before any file change, plus the decision directives from prompt 012 (I1/I4, I2, I3 applied-to-Phase-4-not-here).

3. **Baseline verified**: 97 tests pass, `src/lib/payouts.ts` hash `52a389607248ffda72f4a3f21561300fe05dedac2d938b38e5cb60a27dfd215c`.

4. **Deleted `NassauCfg.matchTieRule`** from `src/games/types.ts` (closes audit #19 per Phase 1 scope).

5. **Created `src/games/nassau.ts`** (206 lines) with:
   - Header comment documenting I1/I4 pair-wise decision and I2 signature divergence.
   - `NassauConfigError`, `NassauBetNotFoundError` typed errors.
   - Exported `MatchState` interface.
   - `assertValidNassauCfg` including the `pairingMode === 'singles'` → `playerIds.length === 2` invariant.
   - `findBetId` using the string-id pattern from #4 (`b.id === cfg.id`).
   - `initialMatches(cfg)` returning 3 singles MatchStates (front 1–9, back 10–18, overall 1–18).
   - `holeResult` — **pair-wise USGA allocation** with in-body comment explicitly stating the § 2 prose authority over the § 5 pseudocode. Algorithm: `diff = |strokes[a] − strokes[b]|`; `strokesOnHole(diff, holeIndex)` on higher-hcp player; zero on lower.
   - `applyHoleToMatch` increments winner's counter; ties don't increment.
   - `settleNassauHole(hole, cfg, roundCfg, matches)` → `{ events, matches }` per I2 signature. Phase 1 gates `pairingMode === 'singles'`; throws `NassauConfigError` on `allPairs` (Phase 4 feature).
   - `finalizeNassauRound` — Phase 3 stub returning `[]`.

6. **Created `src/games/__tests__/nassau.test.ts`** (10 `it()` blocks across 3 describe groups):
   - Describe 1: § 10 Worked Example front-9 (5 its) — asserts 18 NassauHoleResolved events (front + overall, 9 each, 0 back); winner sequence `[B, tie, A, B, A, A, B, A, tie]`; final front `{A: 4, B: 3}`; overall mirrors front through hole 9; back untouched `{0, 0}`.
   - Describe 2: pair-wise allocation vs per-player (2 its) — engineered case where pair-wise produces tie and per-player would produce B win; tied hole does not increment counter.
   - Describe 3: typed errors (3 its) — singles with wrong arity, BetNotFoundError via mismatched id, allPairs in Phase 1 throws.

## Verification checkpoint results

- **`npx tsc --noEmit --strict`**: zero errors. ✓
- **`npm run test:run`**: 107 passing (97 baseline + 10 new Nassau). ✓ [target was 97 + 5–8; slightly above range but all in-scope for Phase 1 coverage.]
- **Portability grep on `src/games/`**: empty. ✓
- **`sha256sum src/lib/payouts.ts`** = `52a389607248ffda72f4a3f21561300fe05dedac2d938b38e5cb60a27dfd215c`. Unchanged. ✓
- **`grep -cE "b\.config === cfg" src/games/*.ts`**: zero in every file (the anti-pattern is gone). ✓
- **`grep -cE "b\.id === cfg\.id" src/games/*.ts`**: 4 matches (skins, stroke_play, wolf, **nassau**). ✓
- **Worked Example holes 1–9 asserts pass**: front match state `{A: 4, B: 3}` matches § 10 table bottom; overall mirrors through hole 9; back untouched. ✓

## Result

- Files touched:
  - `src/games/types.ts` — deleted `NassauCfg.matchTieRule`.
  - `src/games/nassau.ts` (new, 206 lines) — Phase 1 skeleton per decisions.
  - `src/games/__tests__/nassau.test.ts` (new, 212 lines) — 10 tests across 3 describes.
  - `IMPLEMENTATION_CHECKLIST.md` — added D1 backlog item.
- Worked: all Phase 1 verification checkpoints pass. Pair-wise allocation test distinguishes from per-player, proving I1/I4 implementation is correct. All 8 of Nassau's § 11 event variants are still present in events.ts (no additions); only NassauHoleResolved is actually emitted in Phase 1.
- Did not work / blocked: none.

## Fence observations — parked, not folded forward

During Phase 1 execution, noticed several things that belong in Phase 2+ and did NOT fold in:
- Press-handling in `settleNassauHole` — deferred to Phase 2.
- `finalizeNassauRound` actual logic (closeout detection, MatchTied/MatchClosedOut emission, stake-denominated settlement) — deferred to Phase 3.
- `allPairs` expansion in `initialMatches` (need to produce 3 × pairs MatchStates) — deferred to Phase 4; Phase 1 throws explicit `NassauConfigError` on `allPairs`.
- `NassauHoleForfeited` and `NassauWithdrawalSettled` emission paths — deferred to Phase 4.
- Round Handicap integration test — deferred to Phase 4.

No signature changes required beyond what I2 specified. The pair-wise reduction inside `holeResult` uses only `state.strokes`, `state.holeIndex`, and the `(a, b)` playerIds passed in — no new parameters.

## Open questions

- Close Phase 1 and move to Phase 2 (press handling, explicitly 2 turns), or review Phase 1 completion first?

## Parking lot additions

(none — Phase 1 scope was tight; fence-observations listed above are all already in later phases' scope, not new parking items)
