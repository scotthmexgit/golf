---
prompt_id: CLEANUP_TSC_CHECKLIST
timestamp: 2026-04-25T18:12:00Z
checklist_item_ref: "SP-6 closure + SP-1 activation (pre-SP-1 cleanup)"
tags: [cleanup, tsc, checklist, sp6-close, sp1-activate]
---

## Prompt

Pre-SP-1 cleanup: two bundled items. Item 1 — fix three pre-existing `ScoringEvent` tsc errors in `src/games/__tests__/match_play.test.ts` (missing import). Item 2 — update `IMPLEMENTATION_CHECKLIST.md` to record SP-6 as closed and set SP-1 as the new active item.

## Action

### Item 1 — tsc baseline fix

1. Confirmed `ScoringEvent` export location: `src/games/events.ts` line 367 (`export type ScoringEvent = ...`).
2. Read `match_play.test.ts` lines 1–20 (existing imports) and lines 1170–1196 (error sites). All three errors are type assertions: `events.find(...) as (ScoringEvent & { ... }) | undefined`. The symbol is used as a type only — runtime behavior unchanged.
3. Added `import type { ScoringEvent } from '../events'` at line 10 (before the existing `from '../types'` block).
4. Ran `tsc --noEmit --strict`: exit 0, zero errors.
5. Ran `npm run test:run`: 307/307 pass.

**tsc before:** 3 errors (`Cannot find name 'ScoringEvent'` at lines 1177, 1185, 1191 — confirmed pre-existing via prior `git stash` baseline in SP-6 session log).
**tsc after:** exit 0, zero errors.

### Item 2 — IMPLEMENTATION_CHECKLIST.md update

Three targeted edits:

1. **Design Timeline row 5** — "SP-6 is current item" → "SP-1 is current item".
2. **Active item section** — SP-6 entry replaced with SP-1 entry (AC pointer, summary, status).
3. **Done section** — SP-6 closure record appended after #8.

**Before (Active item):**
```
### SP-6 — GAME_DEFS cleanup + GameList filter
**AC:** See `docs/plans/STROKE_PLAY_PLAN.md` SP-6 for full acceptance criteria.
**Summary:** Mark `skins`, `matchPlay`, `wolf`, `nassau` ...
**Status:** Not started. ...
```

**After (Active item):**
```
### SP-1 — Stroke Play Rule Doc Check
**AC:** See `docs/plans/STROKE_PLAY_PLAN.md` SP-1 for full acceptance criteria.
**Summary:** Verify `docs/games/game_stroke_play.md` is consistent with Option α Minimal scope ...
**Status:** Not started. Documenter task, XS.
```

**Done section addition (appended after #8):**
```
- [x] SP-6 — GAME_DEFS cleanup + GameList filter — closed 2026-04-25 — session log:
  `2026-04-25/SP6_GAMEDEFS_PARK_25-April-2026.md`. `disabled: true` added to 8 entries
  in `src/types/index.ts` GAME_DEFS; `GameList.tsx` filter added. 307/307 tests.
  tsc baseline clean post-fix (3 pre-existing `ScoringEvent` import errors in
  `match_play.test.ts` resolved separately).
```

## Result

- **Files touched:** `src/games/__tests__/match_play.test.ts`, `IMPLEMENTATION_CHECKLIST.md`
- **tsc:** exit 0, zero errors (baseline now clean)
- **Tests:** 307/307 (no regression)
- **Active item:** SP-1 — Stroke Play Rule Doc Check (documenter, XS)
- **SP-6 status:** Closed, recorded in Done section with session log reference

## Open questions

None. Baseline is clean. SP-1 is next.
