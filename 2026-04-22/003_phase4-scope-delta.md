---
prompt_id: 003
timestamp: 2026-04-22T14:20:27Z
checklist_item_ref: "#5 — Nassau engine, Phase 4 scope refinement (round 2)"
tags: [nassau, scope, phase4, gate-greps, allPairs, withdrawal, round-handicap]
---

## Prompt
Six adjustments to Phase 4 scope doc before 4a starts:
1. 4a falsifiability: add second test with unadjusted strokes to form distinguishing pair.
2. 4b: state type of `hole` param in settleNassauWithdrawal.
3. 4b: NassauConfigError — new class or existing?
4. 4c: grep for all MatchState construction sites in tests before claiming the list is complete.
5. 4c: split into two gates (interface change before behavior change).
6. 4a: don't extend makeRoundCfg; build local RoundConfig with non-zero roundHandicap.
Also: fix placeholder timestamp in 002; run gate greps and report.

## Action

- Ran all four gate grep patterns against src/games/**/*.ts.
- Ran holesWonA grep to find all MatchState literal construction sites in nassau.test.ts.
- Got current timestamp via bash for 002 correction.
- Addressed all six adjustments; produced delta scope doc section.
- Fixed 002 timestamp from 00:00:00Z to 14:20:27Z.

## Result

- Files touched: `2026-04-22/002_phase4-scope-refinement.md` (timestamp fix), `2026-04-22/003_phase4-scope-delta.md` (this file), `EOD_22-April-2026.md`
- Gate grep unexpected result: b.id === cfg.id returns four matches (nassau, skins, stroke_play, wolf — all correct from #4); scope doc said "one" — was a scoping error, not a regression. Corrected expected count to four.
- Reference-identity patterns: zero matches. Clean.
- MatchState construction sites: 11 total (4 in nassau.ts: initialMatches×3, openPress×1; 7 in nassau.test.ts: matchAt×1, preHole14×3, endMatches×3).
- 4a test pair: two tests with same gross + same non-zero roundHandicap in RoundConfig; Test A adjusted strokes, Test B unadjusted. Values chosen so W_adj ≠ W_unadj. Engine bug (reading roundHandicap internally) causes at least one assertion failure. Concrete values deferred to doc-read.
- 4b hole param: `holeNumber: number`. Signature stated.
- 4b NassauConfigError: existing class. No new export.
- 4c gates: Gate 1 = interface + initialMatches + all 11 fixtures (no behavior change, 145 tests must still pass). Gate 2 = hot path + finalize + Test 5.
- 4a fixture: local RoundConfig inline; makeRoundCfg untouched.

## Open questions
- None blocking. Scope accepted by user before 4a begins.

## Parking lot additions
- (none)
