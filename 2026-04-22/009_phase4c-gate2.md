---
prompt_id: 009
timestamp: 2026-04-22T15:59:06Z
checklist_item_ref: "#5 — Nassau engine, Phase 4c Gate 2"
tags: [nassau, phase4c, gate2, allPairs, hot-path, Test5]
---

## Prompt

Phase 4c Gate 2: update `settleNassauHole`, `finalizeNassauRound`, and `initialMatches`
to use `match.pair[0/1]` instead of `config.playerIds[0/1]`; add allPairs branch to
`initialMatches` (C(n,2) triples); remove the singles-only guard from `settleNassauHole`;
move forfeit check inside the per-match loop with Set-based deduplication.
Write §12 Test 5 (3 players, allPairs, 6 it() blocks).

## Action

1. **Forfeit-in-allPairs flag resolution**: §9 line 147 explicitly states "Missing scores
   propagate per-pair" for allPairs mode. Flag condition resolved without stopping.
   Inside-loop approach with `Set<PlayerId>` deduplication implements this correctly.
2. **Pre-implementation evidence gates**:
   - Stated 9 MatchStates explicitly (3 pairs × 3 bases, IDs `front/back/overall-A-B` etc.).
   - Computed Test 5 arithmetic on paper: A=+300, B=-300, C=0, Σ=0; per-pair sums all 0.
   - Declared 6 it() blocks before running.
3. **Edited `initialMatches`**: singles branch unchanged; added allPairs branch generating
   C(n,2) pairs via nested loop; match IDs keyed `<base>-<pA>-<pB>`.
4. **Edited `settleNassauHole`**: removed Phase-1 singles-only guard and pre-loop
   `const [playerA, playerB] = config.playerIds`; added `Set<PlayerId>` before loop;
   moved forfeit check inside loop using `match.pair[0/1]` with Set deduplication;
   added `const [playerA, playerB] = match.pair` inside loop.
5. **Edited `finalizeNassauRound`**: removed `const [playerA, playerB] = config.playerIds`
   from function scope; added `const [playerA, playerB] = match.pair` inside loop.
6. **Edited `nassau.test.ts`**:
   - Deleted stale test "throws NassauConfigError when pairingMode='allPairs' (Phase 1
     supports singles only)" — this tested the guard that Gate 2 removes.
   - Added §12 Test 5 describe block (6 it() blocks, allPairs mode, 3 players A/B/C).
7. Ran full test suite: 167 passed (162 baseline − 1 deleted + 6 new), 0 failed.
8. `npx tsc --noEmit --strict` clean.
9. Gate grep 1 (b.config === cfg): zero matches.
10. Gate grep 2 (b.id === cfg.id): exactly four matches. #4 intact.
11. Portability grep: only comment-line matches, no actual forbidden imports.

## Result

- Files touched: `src/games/nassau.ts`, `src/games/__tests__/nassau.test.ts`
- Tests: 167 passed, 0 failed. Net change: −1 stale, +6 Test 5 = +5 from 162.
- `npx tsc --noEmit --strict` clean.
- Gate greps pass (reference-identity 0, string-id 4).
- Portability clean.

## Open questions

- None. Gate 2 complete. Phase 4d (allPairs withdrawal) is next and requires user approval.

## Parking lot additions

- nassau.test.ts line 1106 comment "NassauHoleForfeited precedes the loop so it emits
  unconditionally" is stale after Gate 2's inside-loop refactor; comment describes old
  implementation, not the current one. Cosmetic cleanup, not functional defect.
