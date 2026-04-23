---
prompt_id: "001"
timestamp: "2026-04-23T00:48:32Z"
checklist_item_ref: "#6 — Match Play engine (Phase 2a: best-ball holeWinner, teams validation, delta split)"
tags: [match-play, phase2a, best-ball, engineer]
---

## Prompt

Engineer proceeds to Phase 2a after user approved 2a/2b split. Scope: MatchConfigInvalid event for invalid teams (Gap 10), best-ball holeWinner, settleMatchPlayHole routing for best-ball, per-player delta split with RoundingAdjustment for odd stakes (Gap 7). Fence: match_play.ts + match_play.test.ts only. No alt-shot/foursomes, no teamCourseHandicap (Phase 2b).

## Evidence gates (pre-edit)

- `RoundingAdjustment` confirmed in events.ts lines 240–244: `EventBase & WithPoints & WithBet & { kind, hole, absorbingPlayer: PlayerId }`. In ScoringEvent union at line 403. No events.ts changes needed.
- `MatchConfigInvalid` confirmed as event type in events.ts lines 174–177: `{ kind, reason: string }`. Rule doc §4 line 70: "emits MatchConfigInvalid (not a thrown error)." No new error class — scope item A resolved by emitting the event.
- § 5 best-ball holeWinner (rule doc lines 88–96): `Math.min` over team members; singles uses 1-element side arrays.
- `MatchPlayCfg.teams` type: `[[PlayerId, PlayerId], [PlayerId, PlayerId]]` (types.ts line 78).
- Gap 7 rounding paper arithmetic verified: stake=101, teamSize=2 → baseMag=50, remainder=+1/−1; lex-lowest of ['alice','bob']='alice'; lex-lowest of ['carol','dave']='carol'; final alice=+51, bob=+50, carol=−51, dave=−50; Σ=0 ✓.

## Pre-write test count

10 new tests (193 → 203 total):
- 4 MatchConfigInvalid: teams missing, wrong member count, member not in playerIds, duplicate
- 4 § 12 Test 3: MatchClosedOut at H16, per-player deltas, integer check, final state
- 2 Gap 7 rounding: [alice,bob] absorbs, [bob,alice] still absorbs (lex, not array order)

## Action

**match_play.ts:**
1. Added `validateTeams(cfg)` → `string | null`: checks 4 conditions per § 4 contract; returns reason string on failure.
2. Restructured `holeWinner` to dispatch on `cfg.format`: singles uses `[playerIds[0]]`/`[playerIds[1]]` 1-element sides; best-ball uses `cfg.teams![0]`/`cfg.teams![1]`; alt-shot/foursomes throws ("Phase 2b"). Both paths use `Math.min` over side members via `netScore` helper.
3. Added `splitToTeam(team, totalPoints)`: floor-divides stake, lex-lowest of sorted team absorbs remainder; returns `{ base, adjPlayer, remainder }`.
4. Updated `settleMatchPlayHole`: non-singles formats validate teams before proceeding (emits MatchConfigInvalid and returns if invalid); closeout path now branches on format — singles uses existing direct delta; best-ball uses `splitToTeam` for each team and emits up to 2 `RoundingAdjustment` events if `stake % teamSize !== 0`.

**match_play.test.ts:**
- Added describe `§ 4a MatchConfigInvalid` (4 tests, one per invalidity mode)
- Added describe `§ 12 Test 3 (best-ball, stake 100, AB wins 3&2)` (4 tests; 16-hole sequence, AB wins H1–H3, H4–H16 halved; closeout at H16)
- Added describe `Gap 7 rounding (best-ball, stake 101, lex-lowest absorbs remainder)` (2 tests; [alice,bob] and [bob,alice] variants)

## Result

- Files touched: `src/games/match_play.ts`, `src/games/__tests__/match_play.test.ts`, `IMPLEMENTATION_CHECKLIST.md`
- `npm run test:run`: 9 test files, **203 tests passed** (193 existing + 10 new match_play Phase 2a tests)
- `npx tsc --noEmit --strict`: zero errors
- Gate greps: `b.config === cfg` → 0; `b.id === cfg.id` → 5 (unchanged) ✓

## Open questions

- None. Gate to Phase 2b: `teamCourseHandicap` not yet in handicap.ts; alt-shot/foursomes holeWinner not yet implemented.

## Parking lot additions

- (none new)

## Edit 2026-04-23T00:53:45Z

Backfill from post-acceptance audit (user items 1a–1c, plus item 4 test gap corrected).

### 1a — Pre-write test count (pinned breakdown)

10 tests enumerated before any code was written:
- **MatchConfigInvalid (4 tests):** (i) `teams` missing for best-ball, (ii) team has wrong member count (e.g., length 1), (iii) team member not in `playerIds`, (iv) duplicate player ID across teams.
- **§ 12 Test 3 (4 it() blocks):** (i) `MatchClosedOut` fires at H16 with `holesUp=3`, `holesRemaining=2`; (ii) per-player deltas `alice+50, bob+50, carol-50, dave-50`, Σ=0; (iii) all deltas are integers; (iv) final `MatchState` has `closedOut=true`, `holesPlayed=16`, `holesUp=3`.
- **Gap 7 rounding (2 it() blocks):** (i) `[alice,bob]` team stake 101 → alice absorbs +1; (ii) `[bob,alice]` team stake 101 → alice still absorbs +1 (lex sort, not array order).

All 10 landed exactly as enumerated.

### 1b — § 5 best-ball rule quote (with line numbers)

`docs/games/game_match_play.md` lines 84–104 (§ 5 pseudocode block):

```
Line 84:  function holeWinner(state: HoleState, cfg: MatchPlayConfig)
Line 87:    const teamNet = (side: PlayerId[]): number => {
Line 88:      if (cfg.format === 'singles' || cfg.format === 'best-ball') {
Line 90:        return Math.min(...side.map(pid =>
Line 91:          cfg.appliesHandicap
Line 92:            ? state.gross[pid] - strokesOnHole(state.strokes[pid], state.holeIndex)
Line 93:            : state.gross[pid]))
Line 99:    const a = teamNet(cfg.teams ? cfg.teams[0] : [cfg.playerIds[0]])
Line 100:   const b = teamNet(cfg.teams ? cfg.teams[1] : [cfg.playerIds[1]])
```

Implementation maps this exactly: `side1 = cfg.format === 'singles' ? [cfg.playerIds[0]] : cfg.teams![0]`; `bestNet = Math.min(...pids.map(pid => netScore(state, pid, cfg.appliesHandicap)))`. The `netScore` helper is identical to the inline lambda in the rule doc pseudocode.

### 1c — Gap 7 lex-check arithmetic on paper

stake=101, teamSize=2, AB wins:
- `baseMag = Math.floor(101 / 2) = 50`; `baseAmt_win = +50`, `baseAmt_lose = −50`
- `MatchClosedOut.points = { alice: +50, bob: +50, carol: −50, dave: −50 }`
- Win team remainder: `101 − 50×2 = +1`; `[...['alice','bob']].sort()[0] = 'alice'` → alice absorbs +1
- Lose team remainder: `−101 − (−50×2) = −101 + 100 = −1`; `[...['carol','dave']].sort()[0] = 'carol'` → carol absorbs −1
- `RoundingAdjustment` 1: `absorbingPlayer='alice'`, `points: { alice: +1 }`
- `RoundingAdjustment` 2: `absorbingPlayer='carol'`, `points: { carol: −1 }`
- Final effective deltas: alice=+51, bob=+50, carol=−51, dave=−50; Σ=51+50−51−50=**0** ✓

Tests assert exactly these values: `points[alice] === 1`, `points[carol] === -1` (added in follow-up edit below).

### Item 4 correction — losing-team absorber test gap patched

Original rounding tests asserted:
- `roundingEvts.toHaveLength(2)` — both events exist ✓
- `alice` absorber: `absorbingPlayer === 'alice'`, `points[alice] === 1` ✓
- Σ=0 across all events ✓

Missing: `carol` absorber was not pinned. Σ=0 would still pass if the losing team mistakenly emitted `{ dave: -1 }` instead of `{ carol: -1 }` (amounts cancel regardless of which losing player absorbs).

**Fix applied:** both rounding `it()` blocks now also assert `carolAdj.absorbingPlayer === 'carol'` and `carolAdj.points[carol] === -1`. Test count unchanged at 203. 203/203 pass after fix.
