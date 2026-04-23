---
prompt_id: 011
timestamp: 2026-04-22T17:30:00Z
checklist_item_ref: "#5 — Nassau engine, Phase 4d (allPairs withdrawal)"
tags: [nassau, phase4d, allPairs, withdrawal, settleNassauWithdrawal, closed]
---

## Prompt

Gate 2 accepted. Revert confirmed clean. Proceed to Phase 4d.

Scope: extend `settleNassauWithdrawal` to support allPairs. Remove singles-only guard.
Identify matches where `withdrawingPlayer === match.pair[0] || match.pair[1]`. Settle
affected matches in favor of the opposing pair member; pass non-participant matches
through open. Edge case: withdrawer not in any pair → NassauConfigError (§ 9 silent,
treat as caller contract violation).

Evidence gates: show exact lines changing before coding; enumerate 9 MatchStates
pre-withdrawal; compute Σ on paper; run gate greps after.

## Action

### Evidence gate 1 — lines changing in settleNassauWithdrawal (nassau.ts:417-452)

Lines removed:
- 418-423: `if (config.pairingMode !== 'singles') { throw ... }` — the singles-only guard
- 425: `const [playerA, playerB] = config.playerIds`
- 426: `const opposing = withdrawingPlayer === playerA ? playerB : playerA`

Lines added (after assertValidNassauCfg):
- Non-participant validation: `if (!config.playerIds.includes(withdrawingPlayer)) throw NassauConfigError`

Lines added (inside loop, after `if (match.closed)` block):
- Non-participant skip: `if (match.pair[0] !== withdrawingPlayer && match.pair[1] !== withdrawingPlayer) { updatedMatches.push(match); continue }`
- Per-match opposing: `const opposing = match.pair[0] === withdrawingPlayer ? match.pair[1] : match.pair[0]`

### Evidence gate 2 — 9 MatchStates pre-withdrawal (B withdraws after hole 5)

```
id           | holesWonA | holesWonB | pair  | closed
-------------|-----------|-----------|-------|-------
front-A-B    | 3         | 1         | [A,B] | open
back-A-B     | 0         | 0         | [A,B] | open
overall-A-B  | 3         | 1         | [A,B] | open
front-A-C    | 2         | 2         | [A,C] | open
back-A-C     | 0         | 0         | [A,C] | open
overall-A-C  | 2         | 2         | [A,C] | open
front-B-C    | 1         | 3         | [B,C] | open  (pair[0]=B, pair[1]=C)
back-B-C     | 0         | 0         | [B,C] | open
overall-B-C  | 1         | 3         | [B,C] | open
```

### Evidence gate 3 — Σ arithmetic (stake=100)

B is in pairs (A,B) and (B,C). A-C is non-participant.

Per match (stake=100):
- front-A-B:   3≠1 → opposing=A → {A:+100, B:−100}; closed
- back-A-B:    0=0 → TIED, no event; closed
- overall-A-B: 3≠1 → opposing=A → {A:+100, B:−100}; closed
- front-A-C:   B not in pair → pass through open
- back-A-C:    B not in pair → pass through open
- overall-A-C: B not in pair → pass through open
- front-B-C:   1≠3 → opposing=C(pair[1]) → {C:+100, B:−100}; closed
- back-B-C:    0=0 → TIED, no event; closed
- overall-B-C: 1≠3 → opposing=C → {C:+100, B:−100}; closed

Events: 4 NassauWithdrawalSettled.

Per-player totals:
  A: +100 (front-A-B) + 100 (overall-A-B) = +200
  B: −100 (front-A-B) − 100 (overall-A-B) − 100 (front-B-C) − 100 (overall-B-C) = −400
  C: +100 (front-B-C) + 100 (overall-B-C) = +200
  Σ = 200 − 400 + 200 = 0 ✓. Per-pair Σ=0. ✓

### § 9 press-in-allPairs rule question

§ 9 does not address presses in allPairs withdrawal. Current implementation handles press
matches naturally: press matches have the same `pair` as their parent, so the withdrawal
loop closes them as participant matches if the withdrawer is in the pair. No special case
needed. Not a stop-and-report condition.

### Changes executed

1. `nassau.ts`: replaced `settleNassauWithdrawal` per evidence gate 1. Updated section
   comment (removed "Singles mode only (Phase 4b). AllPairs withdrawal is Phase 4d.").
2. `nassau.test.ts`:
   - Deleted `it("throws NassauConfigError when pairingMode='allPairs'", ...)` inside
     the §12 Test 6 describe — tested the guard that is now removed. (−1)
   - Added `describe('§ 9 allPairs — withdrawal settles participant matches, leaves
     non-participant open', ...)` — 6 it() blocks covering: 4 events emitted, zero for
     A-C, Σ=0, A-B/B-C all closed, A-C open, tied matches close without events.
   - Added `describe('§ 9 allPairs — non-participant withdrawer throws NassauConfigError',
     ...)` — 1 it() block. (−1 + 7 = net +6)
3. `2026-04-22/010_gate2-forfeit-revert.md`: appended Edit section with full Gate 2
   evidence artifacts (9 MatchStates, Test 5 Σ arithmetic, inside-loop forfeit rationale).
4. `IMPLEMENTATION_CHECKLIST.md`: Phase 4d marked [x]; #5 marked CLOSED; #5 added to Done
   section.

## Result

- Files touched: `src/games/nassau.ts`, `src/games/__tests__/nassau.test.ts`,
  `2026-04-22/010_gate2-forfeit-revert.md`, `IMPLEMENTATION_CHECKLIST.md`
- Tests: 177 passed, 0 failed. Net from 171: −1 deleted + 7 added = +6.
- `npx tsc --noEmit --strict` clean.
- Gate grep 1 (`b.config === cfg`): 0 — passes.
- Gate grep 2 (`b.id === cfg.id`): 4 — passes.
- #5 Nassau engine CLOSED.

## Open questions

- None. #5 is closed.

## Parking lot additions

- (none new)
