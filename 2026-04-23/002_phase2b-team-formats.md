---
prompt_id: "002"
timestamp: "2026-04-23T01:05:03Z"
checklist_item_ref: "#6 — Match Play engine (Phase 2b: teamCourseHandicap, alt-shot/foursomes holeWinner)"
tags: [match-play, phase2b, team-formats, engineer]
---

## Prompt

Engineer proceeds to Phase 2b after 2a audit accepted. Scope: add `teamCourseHandicap` to `src/games/handicap.ts`, implement alt-shot/foursomes `holeWinner` branch reading `state.teamGross/teamStrokes`, remove Phase-2b placeholder throws, write § 12 Test 4 + alt-shot + foursomes integration tests. Fence: handicap.ts, handicap.test.ts, match_play.ts, match_play.test.ts only. No Phase 3 logic.

## Evidence gates (pre-edit)

- `teamCourseHandicap` → zero existing references in src/ ✓
- **Goes in `src/games/handicap.ts`** — rule doc § 5 line 75: `import { strokesOnHole, teamCourseHandicap } from './handicap'`; file is the migration-target home with existing re-exports from lib/handicap.ts.
- **Alt-shot and foursomes share identical engine scoring logic** — rule doc § 2 lines 17-18: "They differ only in tee-off assignment, which `match_play.ts` does not enforce." One implementation path handles both formats.
- `state.teamGross` and `state.teamStrokes` keyed by `string` in HoleState (types.ts line 169-170). Key convention chosen: `'0'` = team1, `'1'` = team2. Index-based; stable regardless of player IDs; easy to populate in tests.
- `teamCourseHandicap` signature: `(hcp1: number, hcp2: number): number` — matches rule doc formula `Math.ceil((hcp1 + hcp2) / 2)`; takes numeric values like `strokesOnHole(strokes, index)`. Not called internally by `holeWinner` — utility for callers building HoleState; no unused import in match_play.ts.
- Formula verified: `teamCourseHandicap(4, 8) = ceil(12/2) = 6`; `teamCourseHandicap(6, 10) = ceil(16/2) = 8`; diff = 2 → `strokesOnHole(2, 1) = 1`, `strokesOnHole(2, 2) = 1`, `strokesOnHole(2, 3) = 0`.
- handicap.test.ts exists at `src/games/__tests__/handicap.test.ts` (8 existing tests).

## Pre-write test count

11 new tests (203 → 214 total):
- **4 teamCourseHandicap unit tests (handicap.test.ts):** (4,8)=6; (6,10)=8; (4,9)=7 half-round-up; (0,0)=0 scratch
- **2 § 12 Test 4 (match_play.test.ts):** AB=6/CD=8 formula; CD receives 2 strokes on hcpIndex 1 and 2
- **3 alt-shot integration (match_play.test.ts):** team1 wins; halved; handicap strokes via teamStrokes reduce net
- **2 foursomes integration (match_play.test.ts):** team2 wins; halved

All tests assert at event-field granularity (event.kind + winner field) per item-4 lesson from 2a.

## Action

**src/games/handicap.ts:**
- Added `teamCourseHandicap(hcp1, hcp2): number = Math.ceil((hcp1 + hcp2) / 2)` with one-line doc comment referencing game_match_play.md § 2 Gap 2 and the half-round-up rule.

**src/games/match_play.ts:**
- Restructured `holeWinner`: replaced the Phase-2b placeholder throw with an `if (format === 'alternate-shot' || format === 'foursomes')` branch that reads `state.teamGross['0'/'1']` and `state.teamStrokes['0'/'1']` (pre-computed by caller). Singles/best-ball remain in the `else` branch unchanged.
- Key convention comment added: `'0' = team1, '1' = team2`.

**src/games/__tests__/handicap.test.ts:**
- Added import of `teamCourseHandicap` from `'../handicap'`.
- Added describe `game_match_play.md § 2 Gap 2 — teamCourseHandicap` (4 tests).

**src/games/__tests__/match_play.test.ts:**
- Added `import { teamCourseHandicap, strokesOnHole } from '../handicap'`.
- Extended `makeHole` opts to include `teamGross?: Record<string, number>` and `teamStrokes?: Record<string, number>`; return object passes through both fields.
- Added describe `§ 12 Test 4 (alternate-shot team handicap, Gap 2)` (2 tests).
- Added describe `alternate-shot holeWinner` (3 tests).
- Added describe `foursomes holeWinner` (2 tests).

## Result

- Files touched: `src/games/handicap.ts`, `src/games/__tests__/handicap.test.ts`, `src/games/match_play.ts`, `src/games/__tests__/match_play.test.ts`, `IMPLEMENTATION_CHECKLIST.md`
- `npm run test:run`: 9 test files, **214 tests passed** (203 existing + 11 new Phase 2b tests)
- `npx tsc --noEmit --strict`: zero errors
- Gate greps: `b.config === cfg` → 0; `b.id === cfg.id` → 5 (unchanged) ✓

## Open questions

- None. Gate to Phase 3: end-of-round settlement + extra holes.

## Parking lot additions

- (none new)
