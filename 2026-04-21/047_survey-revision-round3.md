---
prompt_id: 047
timestamp: 2026-04-21T22:36:20Z
checklist_item_ref: "meta — loop candidate survey"
tags: [survey, planning, revision, read-only]
---

## Prompt
Three Match Play items + one minor:
1. Alternate-shot/foursomes merge: state whether engine needs to distinguish them (stroke order in events, partner-ID in state, handicap computation). One turn if no, split if yes.
2. Concession subtypes: ConcessionRecorded one code path (discriminator only) or distinct state updates per subtype?
3. Edge-case bundle: HoleForfeited + MatchConfigInvalid + TeamSizeReduced — are all low-state-change or is TeamSizeReduced a separate turn?
Minor: if splits → update count to ~12–14.

## Action
Answered all three from game_match_play.md already read:
1. Alternate-shot/foursomes: §2 explicitly states engine does not enforce tee-order; identical teamNet code path, identical teamCourseHandicap, same cfg.teams structure; no event variant distinguishes them. Merge defended: one turn.
2. Concession: 'hole' + 'stroke' → same state path (advanceMatch, opponent wins hole), discriminator only → one turn. 'match' → close match, settle, stop scoring → distinct code path → separate turn.
3. Edge cases: HoleForfeited (error-path emit, no mid-round state change) + MatchConfigInvalid (guard, emit, return) → one turn. TeamSizeReduced → mid-round teamCourseHandicap recompute, subsequent teamGross shape changes → separate turn.
4. Produced 12-turn table with these splits.

## Result
- Files touched: none (read-only)
- Match Play baseline: 12 turns
- Range updated to ~11–13 (variance tied to researcher findings on turn 12)
- No other silent pairings found in the breakdown

## Open questions
- Turn 12 (type migration shim + consumer updates) still a possible split — addressed in next round

## Parking lot additions
- none
