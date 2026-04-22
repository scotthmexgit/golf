---
prompt_id: 054
timestamp: 2026-04-21T18:51:00Z
checklist_item_ref: "#7 — Junk engine — Turn 3: isLongestDrive + shared-tail refactor"
tags: [junk, engineer, tdd, longestDrive, refactor, fixture]
---

## Prompt
Junk engine Turn 3: isLongestDrive. Structured as four sub-turns with stop gates between each.

## Action

### Pre-turn rule-file read
- Read docs/games/game_junk.md and src/games/events.ts
- isLongestDrive conditions: longestDriveEnabled + par >= 4 + longestDriveHoles.includes(hole) + longestDriveWinner non-null
- §6 LD tie: split evenly; points are integers (N−w per winner, −w per loser); RoundingAdjustment separate event at money-math layer
- Designated-hole mechanism: cfg.longestDriveHoles: number[] only; no hole-level state flag
- RoundingAdjustment already in events.ts (lines 238–242); no new variant needed
- Fixture gap: makeHole hardcodes longestDriveWinner: null; gap 2 (defaultJunkCfg.longestDriveHoles: []) is a per-test spread, not fixture work

### Sub-turn 3a-prep (fixture only)
- Converted makeHole from positional (holeNum, par, gross, ctpWinner) to object-argument
  ({hole, par, gross, ctpWinner?, longestDriveWinner?})
- Updated two call sites: isGreenie test and isCTP test
- junk.ts not touched; 130/8 pass; tsc clean
- Commit A: 31adf21 (junk.test.ts only)

### Sub-turn 3a (red)
- Added makeLongestDriveBet factory (parallel to makeCtpBet / makeGreenieBet)
- Added isLongestDrive describe block: par-4 hole 5, longestDriveWinner 'p1', bet declares
  only 'longestDrive', ldCfg spread with longestDriveHoles: [5]
- junk.ts not touched; longestDrive kind falls through existing if-blocks; 131 total / 1 failing

### Sub-turn 3b (green — partially entangled with 3c)
- Added isLongestDrive helper to junk.ts; added parallel if (kind === 'longestDrive') branch
- Note: intermediate "full tail" state was never committed; 3c immediately followed

### Sub-turn 3c (refactor — shape b symmetric)
- Added isGreenie module-level helper (wraps greenieEnabled + girEnabled + isCTP + par guard)
- Added pushAward helper (participants check + N calc + points Record + event push)
- Import widened: BetSelection, JunkKind added
- All three branches reduced to symmetric two-line shape: resolve winner + pushAward call
- Initial report claimed shape (b) but delivered (a); corrected after pushback
- 3b and 3c entangled in junk.ts diff (longestDrive branch existed only in 2-line form);
  bundled into Commit B

## Result
- Commits: A = 31adf21 (fixture), B = bd6e9bb (LD kind + refactor)
- 131 tests / 8 files passing
- tsc --noEmit --strict clean
- Parking-lot entry prompt 052 (makeHole positional signature) addressed in Commit A

## Open questions
- None; Turn 4 TBD pending user approval.

## Parking lot additions
- None this turn.
