---
prompt_id: "003"
timestamp: "2026-04-23T01:30:00Z"
checklist_item_ref: "#6 — Match Play engine (documenter: collapse Phase 3 to halved-only)"
tags: [match-play, documenter, phase3-scope, extra-holes-removal]
---

## Prompt

Documenter turn (resumed after /compact): subtractive revision of `docs/games/game_match_play.md` to remove sudden-death extra-hole apparatus and restore `tieRule: 'halved'` as the sole end-of-round rule for tied matches. Revise `REBUILD_PLAN.md` Phase 3 scope accordingly. Add a Deferred entry for the tied-match adjustment prompt. One-line comment on `ExtraHoleResolved` in events.ts. Fence: those four targets only; no src/ code changes beyond the comment.

## Evidence gates (pre-edit)

- `REBUILD_PLAN.md` Phase 3 read: contained extra-holes sudden-death loop (C), cap-exhaustion named sub-item (D), `ExtraHoleResolved` in stop-artifact. Lines 355–374.
- `REBUILD_PLAN.md` MatchPlayCfg: `tieRule: 'halved' | 'extra-holes'` (line 182) + `extraHolesCap: number` (line 183) — target for collapse.
- `REBUILD_PLAN.md` Q4 signature: `finalizeMatchPlayRound(..., extraHoleStates?: HoleState[])` — target for simplification.
- `game_match_play.md` § 6: table with `extra-holes` row + Gap 1 (ExtraHoleResolved contract) + Gap 5 (hole number representation) + pseudocode block (lines 160–180) + Gap 6 (cap-exhausted terminal event) — all removed.
- `game_match_play.md` line 49: `tieRule: 'halved' | 'extra-holes'` in MatchPlayConfig interface — stranded; updated.
- `game_match_play.md` line 215: `ExtraHoleResolved` in emitted-events list — stranded; updated with parenthetical deferral note.
- `ExtraHoleResolved` consumers in src/: events.ts definition + union; `types.test.ts` lines 37 and 103. Zero references in match_play.ts. Comment added to definition only; types.test.ts not touched (fence).
- Post-edit grep: `sudden.death|extra.hole|extraHolesCap|tieRule.*extra` in game_match_play.md → 3 hits, all correct (deferred note on line 49, affirmative "no extra holes" on line 132, parenthetical on line 215). No stranded references.
- `tsc --noEmit --strict`: zero errors.

## Action

**`docs/games/game_match_play.md`:**
- § 6: replaced table + Gap 1 + Gap 5 + pseudocode + Gap 6 (lines 134–187) with a single affirmative sentence: tied match at `holesToPlay` → `MatchHalved` with zero deltas, no extra holes, Final Adjustment escalation.
- MatchPlayConfig interface (line 49): `tieRule: 'halved' | 'extra-holes'` + `extraHolesCap` line → `tieRule: 'halved'` with deferred comment.
- § 11 Implementation Notes: removed `ExtraHoleResolved` from active emitted-events list; added parenthetical noting it's defined but deferred to post-v1.

**`REBUILD_PLAN.md`:**
- MatchPlayCfg type block: collapsed `tieRule` to `'halved'`; removed `extraHolesCap` field.
- Q4 answer: replaced extra-holes rationale with halved-only boundary rationale; simplified signature to remove `extraHoleStates?` parameter.
- Phase 3 section: replaced "End-of-round settlement and extra holes" with "End-of-round settlement" — Nassau-shaped scope, 4 tests minimum, no extra-hole loop, added `types.ts` collapse (tieRule + extraHolesCap) as scope item C.
- Dependency table: removed extra-holes reference from Phase 3 row.

**`IMPLEMENTATION_CHECKLIST.md`:**
- Deferred / won't-do: added tied-match-at-endHole adjustment prompt entry with full contract text.

**`src/games/events.ts`:**
- Added one-line comment above `ExtraHoleResolved` type: "Extra-holes format deferred to post-v1; type retained for exhaustive-switch coverage."

## Result

- Files touched: `docs/games/game_match_play.md`, `REBUILD_PLAN.md`, `IMPLEMENTATION_CHECKLIST.md`, `src/games/events.ts`
- `npx tsc --noEmit --strict`: zero errors
- Post-edit grep: no stranded `sudden-death`, `extra-holes`, `extraHolesCap`, or `tieRule.*extra` references in game_match_play.md
- 214 tests unchanged (no test files touched)

## Open questions

- None. Gate to Phase 3 engineer work: `finalizeMatchPlayRound` — Nassau-shaped, halved-only.

## Parking lot additions

- (none new)
