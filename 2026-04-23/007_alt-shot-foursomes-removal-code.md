---
prompt_id: "007"
timestamp: "2026-04-23T21:15:00Z"
checklist_item_ref: "#6 — Match Play engine (Turn 2 engineer: alt-shot/foursomes permanent removal from code)"
tags: [match-play, subtractive-pass, engineer, alt-shot, foursomes]
---

## Prompt

Turn 2 (engineer): Remove alt-shot/foursomes from source code. Strict file order: match_play.ts → match_play.test.ts → handicap.test.ts → handicap.ts → types.ts. tsc check after each file. Expected final count: 207 or 208 (count discrepancy to resolve at Phase 4a describe block).

## Evidence gates (pre-edit)

Read all affected files: match_play.ts (lines 83–110: holeWinner with alt-shot/foursomes branch), match_play.test.ts (220 tests; located 8 tests to delete: §12 Test 4 describe ×2, alt-shot holeWinner describe ×3, foursomes holeWinner describe ×2, Phase 4a Test 2 ×1), handicap.test.ts (4 teamCourseHandicap tests in a single describe block), handicap.ts (teamCourseHandicap export at lines 68–74), types.ts (MatchPlayCfg.format union, HoleState.teamGross/teamStrokes), src/types/index.ts (GameInstance.matchFormat union).

Count discrepancy resolved: Phase 4a Test 1 (singles) retained; only Test 2 (alt-shot) deleted. 220 − 12 = 208 expected.

## Action (strict file order)

**1. match_play.ts:**
- Collapsed `holeWinner`: removed `if (alternate-shot || foursomes)` branch + `let netA/netB` pattern; kept the else-branch logic as the direct body; changed `let netA/netB` to `const`; updated comment to "singles and best-ball"
- Updated in-line comment in `settleMatchPlayHole` else-branch from "best-ball (Phase 2a). alternate-shot/foursomes: Phase 2b." to "best-ball: split stake across team members"
- tsc: zero errors ✓

**2. src/games/__tests__/match_play.test.ts:**
- Removed `import { teamCourseHandicap, strokesOnHole } from '../handicap'` (line 9)
- Removed `teamGross?` and `teamStrokes?` from `makeHole` opts type
- Removed `teamGross: opts.teamGross` and `teamStrokes: opts.teamStrokes` from HoleState construction
- Deleted `§ 12 Test 4 (alternate-shot team handicap, Gap 2)` describe block: 2 tests + separator comment
- Deleted `alternate-shot holeWinner` describe block: 3 tests + separator comment
- Deleted `foursomes holeWinner` describe block: 2 tests + separator comment
- Trimmed Phase 4a comment header: removed alt-shot reference and Test 2 arithmetic block
- Deleted Phase 4a Test 2 (`alternate-shot: caller pre-computes teamStrokes...`): 1 test
- tsc: zero errors ✓

**3. src/games/__tests__/handicap.test.ts:**
- Removed `teamCourseHandicap` from import
- Deleted `game_match_play.md § 2 Gap 2 — teamCourseHandicap` describe block: 4 tests + separator comment
- tsc: zero errors ✓

**4. src/games/handicap.ts:**
- Deleted `teamCourseHandicap` export function (lines 68–74) + JSDoc comment
- tsc: zero errors ✓

**5. src/games/types.ts + src/types/index.ts:**
- `MatchPlayCfg.format`: `'singles' | 'best-ball' | 'alternate-shot' | 'foursomes'` → `'singles' | 'best-ball'`
- `HoleState.teamGross?: Record<string, number>` — deleted
- `HoleState.teamStrokes?: Record<string, number>` — deleted
- `GameInstance.matchFormat` (index.ts): narrowed to `'singles' | 'best-ball'`
- tsc: 4 errors in `src/components/setup/GameInstanceCard.tsx` (legacy shims comparing to `'alternate-shot'` and `'foursomes'`)

**5a. src/components/setup/GameInstanceCard.tsx (tsc fix):**
- Trimmed two Pill `active` props: removed `&& game.matchFormat !== 'alternate-shot' && game.matchFormat !== 'foursomes'` from the "Individual" pill condition, and `|| game.matchFormat === 'alternate-shot' || game.matchFormat === 'foursomes'` from the "Teams 2v2" pill condition
- tsc: zero errors ✓

## Result

- Files touched: `src/games/match_play.ts`, `src/games/__tests__/match_play.test.ts`, `src/games/__tests__/handicap.test.ts`, `src/games/handicap.ts`, `src/games/types.ts`, `src/types/index.ts`, `src/components/setup/GameInstanceCard.tsx`, `IMPLEMENTATION_CHECKLIST.md`
- `npm run test:run`: 9 test files, **208 tests passed** (220 − 12 deletions: 8 from match_play.test.ts + 4 from handicap.test.ts)
- Count resolution: 208 (not 207). Phase 4a Test 1 (singles) retained. Alt-shot test deleted. Net Phase 4a contribution: 1 test.
- `npx tsc --noEmit --strict`: zero errors
- Gate greps: `b.config === cfg` → 0; `b.id === cfg.id` → 5 (unchanged)
- `teamCourseHandicap|teamGross|teamStrokes` grep across `src/`: 0 hits
- `alternate-shot|foursomes` grep across `src/`: 0 hits

## Open questions

- None. Subtractive pass complete. Gate to Phase 4b pre-req: documenter pass to add concession input API spec to game_match_play.md § 7 (specifying `HoleState.conceded: PlayerId[]` semantics), then Phase 4b engineer pass.

## Parking lot additions

- (none new)
