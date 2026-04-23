---
prompt_id: "018"
timestamp: "2026-04-22T13:47:35Z"
checklist_item_ref: "#6 — Match Play engine (Phase 1b: test assertion update after § 10 correction)"
tags: [match-play, phase1b, test-assertions, engineer]
---

## Prompt

Engineer resumes Phase 1b after documenter corrected § 10 (prompt 017). Update test assertions in `match_play.test.ts` to match corrected rule doc. Engine code unchanged.

## Evidence gate (pre-edit)

Rule doc as corrected (§ 10 / § 12 Test 1):
- Table ends at H13 (halved, `|−6| > 5` → closed). H14 row deleted.
- Narrative: "MatchClosedOut fires after hole 13 with holesUp=6, holesRemaining=5. B wins 6 & 5. Holes 14–18 do not score."
- § 12 Test 1: MatchClosedOut after hole 13, holesRemaining=5; holes 14–18 no events; 5 HoleHalved on holes 2, 5, 7, 10, 13.

## Action

1. Comment block: updated H12 and H13 lines with explicit `holesRemaining` and closeout marker; removed H14 line; updated Σ note.
2. Describe title: "Bob wins 6&4" → "Bob wins 6&5".
3. `holeData` array: removed H14 row (`{ h: 14, idx: 12, aG: 5, bG: 5, par: 4 }`).
4. `it('MatchClosedOut fires...')`: title H14→H13; `toBe(14)` → `toBe(13)`; `toBe(4)` → `toBe(5)`.
5. `it('no HoleResolved events...')`: title "15–18" → "14–18"; filter `>= 15` → `>= 14`.
6. `it('exactly N HoleHalved events...')`: title 6→5, list drops 14; `toHaveLength(6)` → `(5)`; `toEqual([...,14])` → `toEqual([2,5,7,10,13])`.
7. `it('final MatchState...')`: title and `toBe(14)` → `toBe(13)`.

Diff scope: comment text, describe title, one holeData row removal, assertion values. No test structure changed. No engine code touched.

## Result

- Files touched: `src/games/__tests__/match_play.test.ts`, `IMPLEMENTATION_CHECKLIST.md`
- `npm run test:run`: 9 test files, **193 tests passed** (177 existing + 16 match_play: 9 singles/handicap/closeout/error + 6 § 10 worked example + 1 final state)
- `npx tsc --noEmit --strict`: zero errors
- Gate greps: `b.config === cfg` → 0; `b.id === cfg.id` → 5 (wolf, match_play, stroke_play, skins, nassau) ✓
- Phase 1b stop-artifact: § 10 worked example tests pass, all singles-mode `it()` blocks pass, tsc clean, no regressions on existing 177 tests.

## Phase 1b final test count

193 total (177 prior engines + 16 new match_play tests):
- § 1 basic singles results (no handicap): 4 tests
- § 2 handicap allocation: 2 tests
- § 3 closeout trigger: 3 tests
- § 4 error handling: 1 test
- § 10 worked example: 6 tests (MatchClosedOut, deltas, integers, no-events-14-18, HoleHalved×5, final state)

## Open questions

- None. Gate to Phase 2: `holeWinner` and `settleMatchPlayHole` signatures stable. § 12 Test 1 passing.

## Parking lot additions

- (none new)
