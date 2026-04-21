---
prompt_id: 052
timestamp: 2026-04-21T17:49:00Z
checklist_item_ref: "#7 — Junk engine — Turn 1: isCTP"
tags: [junk, engineer, tdd, ctp]
---

## Prompt
Junk loop Turn 1: isCTP only. Two sub-turns with a stop between.
Sub-turn 1a: failing test (red). Sub-turn 1b: passing implementation (green).

## Action

### Pre-work (read-only)
- Read docs/games/game_junk.md (full)
- Read src/games/types.ts — confirmed JunkRoundConfig, HoleState, BetSelection (participants not bettors), RoundConfig (bets not declaringBets)
- Read src/games/events.ts — confirmed JunkAwarded in ScoringEvent union; all 4 junk event variants present (JunkAwarded, CTPWinnerSelected, CTPCarried, LongestDriveWinnerSelected)
- Read nassau.test.ts for fixture patterns (makeHole, makeRoundCfg shape)
- Grepped REBUILD_PLAN.md for #7 AC — confirmed string-id-native, no type widening

### Naming gap noted (not a rule ambiguity)
Rule-file § 5 pseudocode uses `roundCfg.declaringBets` and `bet.bettors`; actual types use
`roundCfg.bets` and `bet.participants`. Semantic mapping unambiguous; no rule dispute; proceeded
without stopping.

### Sub-turn 1a (red)
- Created src/games/__tests__/junk.test.ts
  - Fixtures: defaultJunkCfg, makePlayers, makeCtpBet (SkinsCfg inline, type='skins'), makeRoundCfg, makeHole (positional: holeNum, par, gross, ctpWinner)
  - Test: 3 players, junkItems=['ctp'], par-3 hole, ctpWinner='p1', all gross=4 (bogey, no par)
  - Assertions: 1 event, kind='JunkAwarded', winner='p1', junk='ctp', Σpoints=0, all Number.isInteger
- Created src/games/junk.ts stub: settleJunkHole returns []
- Result: 1 failed | 128 passed (129 total); failure = "expected [] to have a length of 1 but got +0"

### User note (loop-shape, not a change)
"nobody makes par" and "p2 makes par but p1 is CTP" are equivalent for this test shape because
junkItems=['ctp'] only — greenie cannot emit regardless of scores. The stronger variant (testing
that no greenie fires when CTP winner misses par, and that greenie does fire when CTP winner makes
par) belongs to Turn 2 (isGreenie) with a bet declaring both 'ctp' and 'greenie'. Parked
makeHole positional-argument shape note for when a second kind touches the fixture.

### Sub-turn 1b (green)
- Implemented settleJunkHole in src/games/junk.ts:
  - isCTP helper: ctpEnabled guard, par===3 guard, returns hole.ctpWinner ?? null
  - Loop: roundCfg.bets → bet.junkItems; skip non-'ctp' kinds (if kind !== 'ctp' continue);
    isCTP call; participant-membership guard; N-1/−1 points formula; JunkAwarded push
  - String-id-native: declaringBet: bet.id; string-id lookup for participant check

## Result
- Files touched: src/games/junk.ts, src/games/__tests__/junk.test.ts (created)
- 129 tests / 8 files passing
- tsc --noEmit --strict clean

## Open questions
- None; Turn 2 (isGreenie) is next pending user approval.

## Parking lot additions
- makeHole positional signature (holeNum, par, gross, ctpWinner) will get crowded when LD/Sandy/Barkie add more optional state fields; consider object-argument shape when a second kind touches the fixture — 2026-04-21 — prompt 052
