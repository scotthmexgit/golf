---
prompt_id: 053
timestamp: 2026-04-21T18:08:00Z
checklist_item_ref: "#7 — Junk engine — Turn 2: isGreenie"
tags: [junk, engineer, tdd, greenie, ctp-conditional]
---

## Prompt
Junk engine Turn 2: isGreenie. Pre-turn rule-file read (read-only), then 2a (red), then 2b (green).
One-kind-per-turn discipline; interaction/tie-handling scenarios deferred to later turns.

## Action

### Pre-turn rule-file read
- Read docs/games/game_junk.md in full
- Read src/games/__tests__/junk.test.ts to assess fixture extension need
- Four questions confirmed from rule file (quoted §5 + §9):
  1. isGreenie conditions: greenieEnabled + girEnabled + isCTP non-null + gross[ctp] ≤ par
  2. §6 tie table: Greenie absent; structurally consistent because isGreenie returns exactly the CTP
     winner — no multi-winner path exists; tie resolved upstream in CTP
  3. Greenie is CTP-conditional. §9: "Greenie without CTP — impossible." Non-CTP player cannot earn
     Greenie regardless of score.
  4. ctp + greenie co-declared: both events emit independently. §5 prose: "A CTP on a par 3 with
     GIR toggle ON, declared on two main bets, produces four events: two for CTP, two for Greenie."
     Neither subsumes the other.
- Fixture assessment: makeHole already carries par, gross, ctpWinner — no extension needed.
  makeCtpBet hardcodes junkItems=['ctp']; a parallel makeGreenieBet factory required for the test.

### Sub-turn 2a (red)
- Added makeGreenieBet(id, participants) factory to junk.test.ts (parallel shape to makeCtpBet;
  junkItems=['greenie'])
- Added describe block 'settleJunkHole — isGreenie' with one test:
  - 3 players, junkItems=['greenie'] only, par-3 hole 5, scores {p1:3, p2:4, p3:4}, ctpWinner='p1'
  - Assertions: 1 event, kind='JunkAwarded', junk='greenie', winner='p1', Σpoints=0,
    Number.isInteger for all deltas, events.filter(junk==='ctp').length === 0
- No junk.ts changes needed; existing `if (kind !== 'ctp') continue` naturally skips 'greenie'
- Result: 1 failed | 129 passed (130 total); failure = "expected [] to have a length of 1 but got +0"

### Sub-turn 2b (green)
- Replaced `if (kind !== 'ctp') continue` guard with two parallel if-blocks:
  - `if (kind === 'ctp')`: identical body to prior implementation
  - `if (kind === 'greenie')`: greenieEnabled guard, girEnabled guard, isCTP call (reuse,
    no duplication), gross[winner] > par guard, participant-membership guard, N-1/−1 points,
    JunkAwarded push
- No shared helper extracted; parallel duplication retained per turn-3 refactor decision plan
- Result: 130 / 130 pass; tsc --noEmit --strict clean

## Result
- Files touched: src/games/junk.ts, src/games/__tests__/junk.test.ts
- 130 tests / 8 files passing
- tsc --noEmit --strict clean
- Commits: A = f959471 (junk.ts + junk.test.ts)

## Open questions
- None; Turn 3 (isLongestDrive) pending user approval.

## Parking lot additions
- None this turn.
