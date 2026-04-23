---
prompt_id: 004
timestamp: 2026-04-22T14:20:27Z
timestamp_note: incorrectly copied from 003; actual time not recoverable
checklist_item_ref: "#5 — Nassau engine, Phase 4 scope tightenings"
tags: [nassau, scope, phase4, gate-greps, round-handicap, pair-tuple]
---

## Prompt
Five scope tightenings + audit trail note:
1. Quote grep output for four b.id === cfg.id hits — verify all are findBetId-shaped, no near-misses.
2. MatchState grep scope: confirm full src/**  not narrower; re-run if needed.
3. Gate 1 verification: replace hardcoded "145" with "pre-4c baseline" (4a/4b will add tests).
4. Pin pair field type as tuple [PlayerId, PlayerId], not PlayerId[].
5. Per-test expected failure mode for 4a two-test pair: name it per test.
6. Add 002 timestamp footnote.

## Action

- Ran b.id === cfg.id grep with 2-line context; confirmed all four are identical findBetId helpers.
- Ran MatchState grep against src/**/*.ts; confirmed only nassau.ts + nassau.test.ts reference the type.
- Addressed items 3–5 as scope delta additions.
- Added footnote to 002.

## Result

- Files touched: `2026-04-22/002_phase4-scope-refinement.md` (footnote), `2026-04-22/004_phase4-scope-tightenings.md` (this file), `EOD_22-April-2026.md`
- Item 1: four hits confirmed as identical findBetId pattern — type-guard AND id-guard AND typed-error-on-miss AND return bet.id. No near-misses.
- Item 2: MatchState in full src/** = only nassau.ts + nassau.test.ts. 11 sites confirmed complete.
- Item 3: Gate 1 now says "pre-4c baseline, zero regressions" — no hardcoded count.
- Item 4: pair field pinned as [PlayerId, PlayerId] tuple.
- Item 5: Test A failure = double-applied strokes → W_double ≠ W_adj. Test B failure = engine applies roundHandicap to unadjusted strokes → W_adj when W_unadj expected. Design constraint: all three winners (W_unadj, W_adj, W_double) must differ; verified post-doc-read before writing tests.
- Item 6: footnote added to 002.

## Open questions
- None blocking 4a start.

## Parking lot additions
- (none)
