---
prompt_id: "006"
timestamp: "2026-04-23T21:00:00Z"
checklist_item_ref: "#6 — Match Play engine (Turn 1 documenter: alt-shot/foursomes permanent removal from docs)"
tags: [match-play, subtractive-pass, documenter, alt-shot, foursomes]
---

## Prompt

Turn 1 (documenter): Remove alt-shot/foursomes from Match Play docs permanently. Product decision 2026-04-23. Scope: game_match_play.md + _ROUND_HANDICAP.md (expanded from original game_match_play.md-only scope after stop-condition triggered). Add retrospective annotations to REBUILD_PLAN.md (Phase 2b, Phase 4a). Add won't-do entry to IMPLEMENTATION_CHECKLIST.md.

## Evidence gates (pre-edit)

**docs/** grep for 'alternate-shot', 'foursomes' — two files hit:
- `docs/games/game_match_play.md` — expected, target of edits
- `docs/games/_ROUND_HANDICAP.md` line 70 — stop condition triggered; scope expanded with user approval

**Expanded grep** ('alternate-shot', 'foursomes', 'teamCourseHandicap', 'teamGross', 'teamStrokes') — same two files only, no additional surprises. Stop condition cleared for Turn 1 to proceed.

**_ROUND_HANDICAP.md § 6 line 70 (pre-edit):** "Alternate-shot and foursomes compute team handicap via `teamCourseHandicap(effectiveCourseHcp[p1], effectiveCourseHcp[p2])` — the 50%-combined rule layers on top of the already-adjusted per-player values."

## Action (game_match_play.md)

- § 1: "four formats: singles, best-ball (four-ball), alternate-shot, and foursomes" → "two formats: singles and best-ball (four-ball)"
- § 2 table: removed `alternate-shot` and `foursomes` rows; removed sharing-sentence prose
- § 2 USGA: removed "Alternate-shot / foursomes" handicap bullet and full Gap 2 formula block (`teamCourseHandicap` definition + explanation)
- § 4 Setup: `format: 'singles' | 'best-ball' | 'alternate-shot' | 'foursomes'` → `format: 'singles' | 'best-ball'`
- § 5 holeWinner pseudocode: removed `teamCourseHandicap` from import; simplified `teamNet` to single-expression arrow (removed if-branch and alt-shot/foursomes dead code)
- § 5 Best-ball partial miss: removed trailing sentence about alt-shot/foursomes teamGross
- § 9 TeamSizeReduced bullet: trimmed `teamCourseHandicap` references; kept core "remaining player's net + emit TeamSizeReduced" language for best-ball
- § 11 imports: "Imports `strokesOnHole` and `teamCourseHandicap` from `src/games/handicap.ts`" → "Imports `strokesOnHole` from `src/games/handicap.ts`"
- § 11: deleted teamGross/teamStrokes UI note; trimmed floating-point sentence (dropped alt-shot clause)
- § 12 Test 4 (alternate-shot team handicap): deleted; renamed old Test 5 (Conceded match) → Test 4
- Formatting: two blank-line gaps left by removals corrected

## Action (_ROUND_HANDICAP.md)

- § 6 line 70: deleted "Alternate-shot and foursomes compute team handicap via `teamCourseHandicap(effectiveCourseHcp[p1], effectiveCourseHcp[p2])` — the 50%-combined rule layers on top of the already-adjusted per-player values." — Match Play bullet now reads only the singles and best-ball clauses.

## Action (REBUILD_PLAN.md)

- Added retrospective comment after Phase 3 gate (Phase 2 context): notes scope B + F were completed then removed by product decision; points to IMPLEMENTATION_CHECKLIST.md won't-do
- Added retrospective comment after Phase 4a gate: notes alt-shot test completed then removed; singles test retained; net Phase 4a contribution = 1 test

## Action (IMPLEMENTATION_CHECKLIST.md)

- Added won't-do entry: "`alternate-shot` and `foursomes` Match Play formats — removed from scope by product decision 2026-04-23; `singles` and `best-ball` only. `teamCourseHandicap`, `HoleState.teamGross`, `HoleState.teamStrokes` removed from engine and types; `GameInstance.matchFormat` narrowed accordingly."

## Result

- Files touched: `docs/games/game_match_play.md`, `docs/games/_ROUND_HANDICAP.md`, `REBUILD_PLAN.md`, `IMPLEMENTATION_CHECKLIST.md`
- Post-edit grep confirms zero residual hits for alternate-shot|foursomes|teamCourseHandicap|teamGross|teamStrokes across docs/**
- _ROUND_HANDICAP.md § 6 internal consistency: no stranded references after deletion; list reads cleanly
- game_match_play.md read end-to-end: no stranded references; § 2 table clean; § 5 pseudocode simplified; § 12 tests renumbered (4 tests total)
- No engine files touched. Fence held.

## Open questions

- None for Turn 1. Gate to Turn 2 (engineer subtractive pass).

## Parking lot additions

- (none new)
