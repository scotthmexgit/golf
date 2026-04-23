---
prompt_id: "009"
timestamp: "2026-04-23T21:53:00Z"
checklist_item_ref: "#6 — Match Play engine (Phase 4b engineer: concession + concedeMatch implementation)"
tags: [match-play, phase4b, concession, engineer]
---

## Prompt

Phase 4b engineer pass: implement concession input API per game_match_play.md § 7 contract. Scope: (1) hole concession short-circuit in settleMatchPlayHole, (2) concedeMatch export function, (3) Tests 4 and 5 per § 12.

## Evidence gates (pre-edit)

- Read IMPLEMENTATION_CHECKLIST.md: Phase 4b active.
- Read match_play.ts (353 lines): holeWinner (lines 83–98), settleMatchPlayHole (lines 192–261 closeout block).
- Read game_match_play.md § 7 (lines 133–161): concession input API + contracts.
- Read game_match_play.md § 12 Tests 4 and 5 (lines 252–270): input shapes + assertions.
- Read events.ts: ConcessionRecorded shape (lines 184–189): hole: number | null, conceder: PlayerId, unit: 'hole' | 'stroke' | 'match'.
- Read types.ts: HoleState.conceded: PlayerId[] confirmed at line 176.
- Read match_play.test.ts (647 lines): fixture helpers makeHole (conceded: []), makeRoundCfg, insertion point at EOF.

## Action (strict file order)

**1. src/games/match_play.ts:**

- Modified `holeWinner`: added optional third param `conceded: ReadonlySet<PlayerId> = new Set()`. For best-ball, filters each side's player list to active (non-conceded) players before computing bestNet. Empty side returns `Infinity` (naturally loses). Existing callers unaffected (default empty set).

- Extracted `buildCloseoutEvent(timestamp, holeNum, cfg, holesUp, holesRemaining, winner)` helper: consolidates the duplicated MatchClosedOut + optional RoundingAdjustment logic from settleMatchPlayHole and finalizeMatchPlayRound. Takes `winner: 'team1' | 'team2'` explicitly (not from holesUp) so concedeMatch can pass the conceder-derived winner regardless of match.holesUp sign.

- Modified `settleMatchPlayHole`: added concession short-circuit block immediately after declaringBet assignment. If `hole.conceded.length > 0`: (a) for singles, determine winner from which playerIds index conceded (no net-score comparison); (b) for best-ball, call holeWinner with conceded set. Emit ConcessionRecorded first, then advanceMatch, then buildCloseoutEvent if closedOut. Returns early. Normal scoring path (holeWinner → HoleResolved/HoleHalved → buildCloseoutEvent) runs only when no concession.

- Modified `finalizeMatchPlayRound`: replaced duplicated 40-line closeout block with `buildCloseoutEvent` call. Logic identical; code halved.

- Added `concedeMatch` export: takes `(cfg, roundCfg, match, concedingPlayer, hole)`. Guards: closedOut → no-op; bet not found → throw. Emits ConcessionRecorded (unit='match') then buildCloseoutEvent with winner derived from concedingPlayer's side. Returns `{ events, match: { ...match, closedOut: true } }`.

- tsc: zero errors ✓

**2. src/games/__tests__/match_play.test.ts:**

- Added `concedeMatch` to import from '../match_play'.

- Added § 12 Test 4 describe block (5 it tests): `concedeMatch(cfg, roundCfg, preMatch, 'B', 10)` with holesUp=+3, holesPlayed=10. Asserts: 2 events in order [ConcessionRecorded, MatchClosedOut], unit='match', conceder='B', hole=10, holesUp=3, holesRemaining=8, points={A:+1,B:-1}, Σ=0, closedOut=true.

- Added § 12 Test 5 describe block (6 it tests): `settleMatchPlayHole` with HoleState.conceded=['B'], preMatch holesUp=+3, holesPlayed=15. Asserts: 2 events [ConcessionRecorded, MatchClosedOut], unit='hole', conceder='B', hole=16, holesUp=4, holesRemaining=2, no HoleResolved, points={A:+1,B:-1}, Σ=0, closedOut=true, holesPlayed=16.

- Note: h16 constructed via `{ ...makeHole(16, 6, { A: 4, B: 5 }), conceded: ['B'] }` (spread override; no makeHole signature change needed).

## Result

- Files touched: `src/games/match_play.ts`, `src/games/__tests__/match_play.test.ts`
- `npm run test:run`: 9 test files, **219 tests passed** (208 + 11 new: 5 Test 4 + 6 Test 5)
- `npx tsc --noEmit --strict`: zero errors
- Gate greps: `b.config === cfg` → 0 hits; `alternate-shot|foursomes` → 0 hits
- Arithmetic checks: Test 4: holesRemaining=18−10=8 ✓; Test 5: holesUp=3+1=4, holesRemaining=18−16=2, |4|>2 → closedOut ✓

## Open questions

- None. Gate to Phase 4c: best-ball partial miss + HoleForfeited (Gap 9). Note: best-ball concession path (holeWinner with conceded set) is already implemented; Phase 4c adds HoleForfeited event when all team members have missing gross scores or are all conceded.

## Parking lot additions

- (none new)
