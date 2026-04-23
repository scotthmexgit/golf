---
prompt_id: "005"
timestamp: "2026-04-23T20:43:00Z"
checklist_item_ref: "#6 — Match Play engine (Phase 4a: Round Handicap integration test)"
tags: [match-play, phase4a, round-handicap, engineer]
---

## Prompt

Phase 4a: Round Handicap caller-applies integration test (test-only, no engine changes). Read _ROUND_HANDICAP.md, confirm caller-applies model, construct two-test distinguishing pair with all three winners distinct per Nassau 4a discipline, build inline RoundConfig, do not extend shared makeCfg. 218 → 220 tests. Agent: engineer.

## Evidence gates (pre-edit)

**Rule doc quote (_ROUND_HANDICAP.md § 6, lines 65-70):**
> "Every game that reads `strokesOnHole` from `src/games/handicap.ts` sees Round Handicap automatically, with no game-specific code change. [...] **Match Play**: singles uses `effectiveCourseHcp`. Best-ball uses `effectiveCourseHcp` per player. Alternate-shot and foursomes compute team handicap via `teamCourseHandicap(effectiveCourseHcp[p1], effectiveCourseHcp[p2])` — the 50%-combined rule layers on top of the already-adjusted per-player values."

§ 3 (lines 23-29): "`effectiveCourseHcp = courseHcp + roundHandicap`. No game reimplements this addition — performed once, at the handicap-computation boundary."

**Caller-applies confirmed for singles and alt-shot. No engine gap detected.**

**makeHole signature:** `makeHole(holeNum, holeIndex, gross, opts?)` where `opts.strokes` defaults to zeroes and `opts.teamGross`/`opts.teamStrokes` pass through to HoleState. Both opts available; no fixture extension needed.

**Three-winner arithmetic:**

Test 1 (singles, hcpIndex=7): A.gross=4, A.strokes=0; B.gross=5, B.courseHcp=6, B.roundHandicap=10
- W_adj (strokes[B]=16): A net=4, B net=5−strokesOnHole(16,7)=5−1=4 → **halved**
- W_unadj (strokes[B]=6): B net=5−strokesOnHole(6,7)=5−0=5 → **team1**
- W_double (strokes[B]=26): B net=5−strokesOnHole(26,7)=5−2=3 → **team2**
- Arithmetic: strokesOnHole(16,7)=1 (7≤16), strokesOnHole(6,7)=0 (7>6), strokesOnHole(26,7)=2 (floor(1)+1, 26%18=8≥7)
- All distinct ✓

Test 2 (alt-shot, hcpIndex=9): teamGross={0:5,1:4}; AB each courseHcp=8, roundHandicap=+10→eff=18; CD scratch
- W_adj (teamStrokes['0']=teamCHcp(18,18)=18): AB net=5−strokesOnHole(18,9)=5−1=4; CD net=4−0=4 → **halved**
- W_unadj (teamStrokes['0']=teamCHcp(8,8)=8): AB net=5−strokesOnHole(8,9)=5−0=5 → **team2**
- W_double (teamStrokes['0']=teamCHcp(28,28)=28): AB net=5−strokesOnHole(28,9)=5−2=3 → **team1**
- Arithmetic: strokesOnHole(18,9)=1 (floor(1)+0=1, 18%18=0<9), strokesOnHole(8,9)=0 (9>8), strokesOnHole(28,9)=2 (floor(1)+1, 28%18=10≥9)
- All distinct ✓

**Focus-discipline observation (not blocking):** For alt-shot, caller must compute `teamStrokes = teamCourseHandicap(effectiveCourseHcp[A], effectiveCourseHcp[B])` — one extra step vs. singles. Engine reads `state.teamStrokes` directly; it never sees individual `roundHandicap` values. This is consistent with the rule doc's caller-applies boundary model. The extra computation burden on the caller for team formats is a UX concern for the hole-state builder (deferred post-#6), not an engine gap.

## Pre-write test count

Exactly 2 new tests (218 → 220):
1. `singles: caller pre-adjusts strokes to effectiveCourseHcp; net scores reflect roundHandicap`
2. `alternate-shot: caller pre-computes teamStrokes from teamCourseHandicap(effectiveCourseHcp)`

## Action

**src/games/__tests__/match_play.test.ts:**
- Appended `describe('Phase 4a: Round Handicap caller-applies (_ROUND_HANDICAP.md § 6)', ...)` with 2 tests.
- Test 1: constructs hole with `opts.strokes = { A: 0, B: 16 }` (B's effectiveCourseHcp pre-populated by caller); expects `HoleHalved`.
- Test 2: constructs hole with `opts.teamGross = { '0': 5, '1': 4 }` and `opts.teamStrokes = { '0': 18, '1': 0 }` (caller pre-computed from effectiveCourseHcp); expects `HoleHalved`.
- No changes to engine files, handicap.ts, or _ROUND_HANDICAP.md.
- Used `makeCfg({...})` with overrides within test; no changes to shared makeCfg/makeHole signatures.

## Result

- Files touched: `src/games/__tests__/match_play.test.ts`, `IMPLEMENTATION_CHECKLIST.md`
- `npm run test:run`: 9 test files, **220 tests passed** (218 + 2 new Phase 4a tests)
- `npx tsc --noEmit --strict`: zero errors
- Gate greps: `b.config === cfg` → 0; `b.id === cfg.id` → 5 (unchanged) ✓

## Open questions

- None. Gate to Phase 4b: concession-closeout ordering (Gap 4).

## Parking lot additions

- (none new; focus-discipline observation logged above, not a blocker)
