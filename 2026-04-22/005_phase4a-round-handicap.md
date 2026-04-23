---
prompt_id: 005
timestamp: 2026-04-22T14:36:19Z
checklist_item_ref: "#5 — Nassau engine, Phase 4a"
tags: [nassau, tests, round-handicap, phase4a]
---

## Prompt
Approved Phase 4a. Read _ROUND_HANDICAP.md first; stop if doc contradicts caller-applies prediction.
Build local RoundConfig with non-zero roundHandicap. Construct two-test distinguishing pair.
Pre-write check: print three computed winners, confirm all distinct. No nassau.ts changes.

## Action

1. Read `_ROUND_HANDICAP.md` — confirmed caller-applies: "Round Handicap feeds in through the
   builder, not through [the engine]." Engine reads state.strokes only. No engine gap.
2. Read `src/lib/handicap.ts` to confirm strokesOnHole formula:
   - returns 0 if strokes ≤ 0
   - returns 2 if strokes ≥ 18 + holeIndex
   - returns 1 if strokes ≥ holeIndex
   - returns 0 otherwise
3. Pre-write winner computation (A courseHcp=5, roundHandicap=+10; B courseHcp=5, roundHandicap=0;
   gross {A:5, B:4}, holeIndex=2):
   - W_unadj: strokes {A:5,B:5}, diff=0, strokesOnHole(0,2)=0 → A net=5, B net=4 → B
   - W_adj:   strokes {A:15,B:5}, diff=10, strokesOnHole(10,2)=1 → A net=4, B net=4 → tie
   - W_double: strokes {A:25,B:5}, diff=20, strokesOnHole(20,2)=2 → A net=3, B net=4 → A
   All three distinct (B / tie / A). Constraint satisfied.
4. Appended 'Round Handicap integration — caller-applies model' describe block (2 tests)
   to nassau.test.ts. Local RoundConfig built inline; makeRoundCfg not extended.

## Result

- Files touched: `src/games/__tests__/nassau.test.ts`
- Tests: 147 passed, 0 failed (was 145; +2 new tests). All 8 test files pass.
- `npx tsc --noEmit --strict` clean (no output).
- Portability grep: zero imports from restricted modules; two comment-line matches ignored.
- Doc-read outcome: caller-applies confirmed, no engine gap found.

## Open questions
- None. Phase 4a complete.

## Parking lot additions
- (none)
