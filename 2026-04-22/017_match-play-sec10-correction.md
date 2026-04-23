---
prompt_id: "017"
timestamp: "2026-04-22T13:30:00Z"
checklist_item_ref: "#6 — Match Play engine (§ 10 rule-doc correction)"
tags: [match-play, rule-doc, documenter, worked-example, stop-and-report]
---

## Prompt

Documenter pass: correct the § 10 worked example in `docs/games/game_match_play.md`. A contradiction between § 5 pseudocode and § 10 table was surfaced during Phase 1b pre-write arithmetic gate. Fence: rule doc only, no src/ changes.

## Evidence gates (pre-edit)

**§ 10 / § 12 reference grep across docs/ and src/:**
- All other "§ 10 / worked example" hits are in game_wolf.md, game_nassau.md, game_skins.md, game_stroke_play.md, _TEMPLATE.md — independent engines, no cross-reference to Match Play's worked example.
- `nassau.test.ts:684` "hole 14" is Nassau's own test, unrelated.
- `match_play.test.ts` has wrong assertions mirroring the old table — engineer handles in follow-up turn.
- Only `docs/games/game_match_play.md` needed editing.

**"6 & 4" / "hole 14" hits in game_match_play.md:**
- Line 261: H14 table row (to be deleted) 
- Line 263: narrative (to be updated)
- Line 284: § 12 Test 1 assertion (to be updated)
- Line 288: § 12 Test 1 assertion (to be updated)
- Line 289: § 12 Test 1 HoleHalved count (to be updated)

**Additional consistency check (all table rows H1–H13):**
All B-stroke values verified against `strokesOnHole(5, idx)`, all net scores checked, holesUp progression verified. No additional arithmetic error found.

## Root cause

§ 10 table row H13 was marked "no" despite `|holesUp|=6 > holesRemaining=5` being true. This caused the table to show an H14 row that is never reached (match closes at H13). The text and § 12 Test 1 assertions downstream of the table propagated the error ("6 & 4", hole 14, holesRemaining=4, H14 HoleHalved event).

§ 5 `advanceMatch` pseudocode is correct: `Math.abs(next.holesUp) > holesRemaining` closes the match at H13 ("6 & 5"). The engine implementation is unchanged.

## Action

1. Table H13 row: changed `no` → `**yes** — \`|−6| > 5\``
2. Deleted H14 row from the table (H14 is never played).
3. Line 263 narrative: "hole 14" → "hole 13"; "holesRemaining = 4" → "holesRemaining = 5"; "6 & 4" → "6 & 5"; "6 up with 4 to play" → "6 up with 5 to play"; "Holes 15–18" → "Holes 14–18".
4. § 12 Test 1 line 284: "hole 14" → "hole 13"; "holesRemaining = 4" → "holesRemaining = 5".
5. § 12 Test 1 line 288: "Holes 15–18" → "Holes 14–18".
6. § 12 Test 1 line 289: "6 HoleHalved events, on holes 2, 5, 7, 10, 13, and 14" → "5 HoleHalved events, on holes 2, 5, 7, 10, and 13".

Post-edit re-read: no stranded H14 references remain in § 10 or § 12.

## Result

- Files touched: `docs/games/game_match_play.md`
- § 10 table ends at H13, marked closed, "6 & 5" throughout.
- § 12 Test 1 assertions corrected to H13 / holesRemaining=5 / 5 HoleHalved events.
- Engine unchanged. Test file unchanged (engineer follow-up).

## Open questions

- None. Rule doc is stable. Engineer resumes Phase 1b test assertion updates against H13.

## Parking lot additions

- (none new)
