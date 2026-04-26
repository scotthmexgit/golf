---
prompt_id: SKINS_PLAYER_COUNT_FIX
timestamp: 2026-04-25T19:57:00Z
checklist_item_ref: "Skins unpark — player-count combined fix (rule doc + engine guard + test fixtures)"
tags: [skins, unpark, player-count, rule-doc, engine-guard, test-rewrite]
---

## Prompt

Combined fix: update game_skins.md (§1/§2/§4/§12 Test 4), skins.ts validation guard, and 5 test fixtures from 2-player to 3-player minimum. Operator decision: Option B — engine 3–5, UI matches.

## Action

Read game_skins.md, skins.ts, skins.test.ts in full. Applied all edits.

---

## Item 1 — docs/games/game_skins.md diffs

### §1 Overview (line 7)
- Before: `This file specifies Skins for 2–5 players`
- After: `This file specifies Skins for 3–5 players, with 3 as the canonical form and 4–5 as documented variants`

### §2 Players & Teams (line 11)
- Before: `Minimum 2 players, maximum 5. No teams.`
- After: `Minimum 3 players, maximum 5. The canonical form is 3 players; 4–5 are documented variants. No teams.` + new line: `2-player formats use match play, not skins (see \`game_match_play.md\`).`

### §4 Setup — playerIds comment (line 28)
- Before: `// length 2..5`
- After: `// length 3..5`

### §12 Test 4 (lines 229–231)
- Before: `### Test 4 — Field of 2 players` + single-assertion spec
- After: `### Test 4 — Field of 3 players` with 3-player arithmetic spec (A wins odd holes, B wins even holes, C never wins; 18 SkinWon events; per-event zero-sum)

**Sections NOT modified:** §3, §5–§8, §9 (contenders-at-scoring-time floor correctly stays at 2), §10–§11, §12 Tests 1–3 and Test 5.

---

## Item 2 — src/games/skins.ts diff (single line)

Line 81–82:
```
-  if (!Array.isArray(cfg.playerIds) || cfg.playerIds.length < 2 || cfg.playerIds.length > 5) {
-    throw new SkinsConfigError('playerIds', 'length must be 2..5')
+  if (!Array.isArray(cfg.playerIds) || cfg.playerIds.length < 3 || cfg.playerIds.length > 5) {
+    throw new SkinsConfigError('playerIds', 'length must be 3..5')
```

Line 144 (`contenders.length < 2`) was read and confirmed unchanged — it's the per-hole contenders floor, not the config minimum.

No other logic in skins.ts was modified.

---

## Item 3 — src/games/__tests__/skins.test.ts diffs

### Test 5 (describe: "field of 2 players" → "field of 3 players")
- `playerIds: ['A', 'B']` → `playerIds: ['A', 'B', 'C']`
- Gross fixture: alternating A-wins-odd / B-wins-even / C-always-4 (no ties, 18 SkinWon events)
- Per-event zero-sum check: `A+B` → `A+B+C`
- Describe text: "field of 2 players" → "field of 3 players"

### Test 10 ("handicap strokes produce a negative net")
- `playerIds: ['A', 'B']` → `playerIds: ['A', 'B', 'C']`
- Hole fixture: `{ A: 4, B: 3 }` → `{ A: 4, B: 3, C: 5 }`, `strokes: { A: 0, B: 36 }` → `{ A: 0, B: 36, C: 0 }`
- Assertion `expect(won.winner).toBe('B')` unchanged ✓ (B net 1 still beats A net 4 and C net 5)

### Test 12 ("net-score handicap changes skin winner")
- Both configs: `playerIds: ['A', 'B']` → `playerIds: ['A', 'B', 'C']`
- Hole fixture: `{ A: 4, B: 4 }` → `{ A: 4, B: 4, C: 6 }`, strokes updated to include C: 0
- `expect(won.winner).toBe('B')` unchanged ✓ (B net 3 beats A net 4, C net 6)
- `expect(grossEvents.some((e) => e.kind === 'SkinCarried')).toBe(true)` unchanged ✓ (A and B still tie at gross 4; C's 6 doesn't affect the A–B tie)

### Test 17 ("Round Handicap integration × Skins")
- `playerIds: ['A', 'B']` → `playerIds: ['A', 'B', 'C']`; `gross = { A: 4, B: 5 }` → `{ A: 4, B: 5, C: 6 }`
- `basePlayer('C', 0, 0)` added to rh0 and rh2 in all three sub-tests
- `won.points` assertion: `{ A: 1, B: -1 }` → `{ A: 2, B: -1, C: -1 }` (A wins 2 stakes in a 3-player field)
- `strokesFor(rh0)` assertion: `{ A: 0, B: 0 }` → `{ A: 0, B: 0, C: 0 }`
- `strokesFor(rh2)` assertion: `{ A: 0, B: 2 }` → `{ A: 0, B: 2, C: 0 }`
- `SkinCarried` assertion unchanged ✓ (A net 4 ties B net 4; C net 6 doesn't affect the A–B tie)

### Config error test (line 590-594)
- Description: `'throws SkinsConfigError on playerIds outside 2..5'` → `'throws SkinsConfigError on playerIds outside 3..5'`
- Fixture: `playerIds: ['A']` → `playerIds: ['A', 'B']` — tests the new lower boundary explicitly (2-player now rejects)

### Multi-bet pass-through (near line 706)
- `playerIds: ['A', 'B']` → `playerIds: ['A', 'B', 'C']`
- Hole: `{ A: 3, B: 4 }` → `{ A: 3, B: 4, C: 4 }` (A still wins; all 3 assertions hold)
- This test was not in the SOD report's explicit list of 5 tests to modify, but the grep constraint required zero remaining 2-player Skins configs.

---

## Verification: test count and tsc

- **Tests:** 326/326 ✓ (zero additions; fixture rewrites only)
- **tsc:** exit 0 ✓ (pre-existing `.next/types/validator.ts` errors no longer present — dev server stopped, cache cleared)

---

## Grep verification

| Check | Result |
|---|---|
| `minimum 2 / min 2 / 2–5 / length 2..5` in rule doc | **ABSENT** ✓ |
| `3..5 / 3 players` in rule doc | lines 11 (§2), 28 (§4), 231 (§12 Test 4) ✓ |
| `length must be 2..5` in skins.ts | **ABSENT** ✓ |
| `length must be 3..5` in skins.ts | line 82 ✓ |
| `playerIds: ['A', 'B']` in skins.test.ts | **line 594 only** — this is the config-error test where `['A', 'B']` is used as the *invalid* fixture to prove the new 3-player minimum rejects 2-player. Not a valid 2-player Skins test; its presence confirms the validation boundary works. No valid 2-player game config remains. ✓ |

---

## Assertion preservation check

| Test | Original assertion | After 3-player rewrite | Preserved? |
|---|---|---|---|
| Test 5 | zero-sum per hole, 18 SkinWon events, per-event A+B=0 | zero-sum per hole, 18 SkinWon events, per-event A+B+C=0 | ✓ (same invariant, updated players) |
| Test 10 | `won.winner === 'B'` (negative-net wins) | same | ✓ (B net 1 still lowest) |
| Test 12 | `won.winner === 'B'` (net flip); `SkinCarried` under gross | same | ✓ (A–B gross tie unaffected by C=6) |
| Test 17 | `won.winner === 'A'`; SkinCarried on +2; effectiveCourseHcp routing | `won.points` updated for 3-player; others same | ✓ (A wins, amounts updated for N=3) |
| Config error | throws SkinsConfigError | same (fixture changed to test new boundary) | ✓ (2-player now correctly invalid) |

Note: Test 17's `won.points` assertion changed from `{ A: 1, B: -1 }` to `{ A: 2, B: -1, C: -1 }`. This is not a weakened assertion — it's the correct expected value for a 3-player field where A wins. The invariant (A wins, amounts are zero-sum) is preserved; the specific amounts reflect the field size.

---

## Noticed but out of scope

- `skins.ts` header comment (line 8) references `/tmp/execution-notes.md` — same pattern as `stroke_play.ts`. Not addressed per fence.
- §9 references to "fewer than 2 contenders" (lines 151, 156) correctly stay at 2 — these describe per-hole mechanics (field shrinks mid-round), not the config minimum.
- Cosmetic improvements in game_skins.md analogous to the F1/F3/F4/F7/F9 cleanup applied to game_stroke_play.md were visible. Not applied per focus discipline; parked for a future Skins SP-1 analog cleanup pass.

## Result

- **Files modified:** `docs/games/game_skins.md`, `src/games/skins.ts`, `src/games/__tests__/skins.test.ts`
- **Engine logic changed:** validation guard only (line 81–82); no math, no event logic modified
- **Tests:** 326/326, count unchanged
- **tsc:** exit 0
