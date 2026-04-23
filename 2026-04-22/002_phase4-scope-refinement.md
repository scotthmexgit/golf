---
prompt_id: 002
timestamp: 2026-04-22T14:20:27Z
checklist_item_ref: "#5 — Nassau engine, Phase 4 scope"
tags: [nassau, scope, phase4, allPairs, withdrawal, round-handicap]
---

## Prompt
Phase 3 accepted. Four adjustments before Phase 4 work begins:
1. Pair-field optionality decision (required on all MatchStates vs. optional).
2. Phase 4a "no engine changes expected" — treat as falsifiable prediction.
3. Phase 4b singles-only carve-out: does it apply to missing-score AND withdrawal, or just withdrawal?
4. Gate grep patterns: specify regex, not literal substring.
Also: is there already a `toHaveLength(0)` assertion on finalizeNassauRound in the § 10 test?

## Action

- Read nassau.test.ts to locate or add the finalizeNassauRound zero-length assertion.
- Read game_nassau.md to confirm § 9 / § 12 Test 5–6 scope for Phase 4 sub-steps.
- Answered all four adjustments with explicit rationale.
- Produced revised Phase 4 scope doc (4a/4b/4c/4d) with clarifications folded in.

## Result

- Files touched: `2026-04-22/002_phase4-scope-refinement.md` (this file), `EOD_22-April-2026.md`
- § 10 assertion: already exists at nassau.test.ts:586 — `expect(finalEvents).toHaveLength(0)`. No code change needed.
- Pair-field: decided REQUIRED on all MatchStates (including singles); set by `initialMatches`.
- Phase 4b carve-out: missing-score carve-out NOT needed (branch is loop-local, extends to allPairs in 4c automatically); withdrawal carve-out required (allPairs-withdrawal is 4d, depends on `pair` field from 4c).
- Gate greps: four regex patterns specified (forward + reversed forms of both reference-identity and string-id checks).
- Phase 4 scope: 4a (Round Handicap integration test, test-only, falsifiable), 4b (NassauHoleForfeited + NassauWithdrawalSettled singles-only), 4c (allPairs engine, pair field required), 4d (allPairs withdrawal).

## Open questions
- None blocking Phase 4a start; gate greps must run first.

## Parking lot additions
- (none)

---
*Timestamp corrected in prompt 003 (003_phase4-scope-delta.md); original placeholder was 2026-04-22T00:00:00Z.*
