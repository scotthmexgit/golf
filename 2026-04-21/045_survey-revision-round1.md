---
prompt_id: 045
timestamp: 2026-04-21T22:36:20Z
checklist_item_ref: "meta — loop candidate survey"
tags: [survey, planning, revision, read-only]
---

## Prompt
Six revision items against initial survey:
1. Strike recommendation line — do not recommend starting item.
2. Option A "recommended" label: justify with specific risk or remove.
3. Nassau Phase 3 turn 1: reclassify as plan-only (design decision before any code).
4. Junk turn 1: reduce to one kind (isCTP only) or defend pairing.
5. Restore iteration-count estimates.
6. D1: state reason for single-shot classification.

## Action
1. Produced full revised survey addressing all six items.
2. Option A/B presented as equivalent with specific risk differentiator: A avoids manual re-entry risk on already-authored stash content; B avoids stash-pop mechanism failure.
3. Nassau Phase 3 turn 1 reclassified as plan-only: two options (closedOut flag in MatchState vs post-hoc in finalizeNassauRound) with tradeoffs; no code in turn 1.
4. Junk turn 1 reduced to isCTP only (isGreenie dropped; each kind is the per-iteration unit).
5. Iteration counts restored: Nassau ~4 (later corrected to ~5–6), Junk ~5 (later corrected to ~9), Match Play ~5 (later corrected to ~9–11), Aggregate ~2.
6. D1 single-shot reason stated: two edits to one file, no tests between them, one coordinated change.

## Result
- Files touched: none (read-only)
- Recommendation line removed; Option A/B presented as choice with specific tradeoffs
- Nassau Phase 3 plan-only turn established as pattern
- Junk one-kind-per-turn principle confirmed

## Open questions
- Iteration counts for Junk and Match Play later found too low — corrected in subsequent revision rounds

## Parking lot additions
- none
