---
prompt_id: "016"
timestamp: "2026-04-22T13:17:50Z"
checklist_item_ref: "#6 — Match Play engine (Phase 1a: type widening + MatchState)"
tags: [match-play, phase1a, type-widening, match-state, engineer]
---

## Prompt

Phase 1a execution. Scope:
A. Widen `GameInstance.matchFormat` in `src/types/index.ts` from `'individual' | 'teams'` to `'singles' | 'best-ball' | 'alternate-shot' | 'foursomes'`.
B. Legacy shim in `src/store/roundStore.ts` line 155: `'individual'` → `'singles'`.
C. Legacy read shim in `src/components/setup/GameInstanceCard.tsx` lines 69, 71.
D. Create `src/games/match_play.ts`: `MatchState`, `MatchPlayConfigError`, `MatchPlayBetNotFoundError`, `initialMatch`.
E. Create `src/games/__tests__/match_play.test.ts`: one stub test.

## Evidence gates (pre-implementation)

**matchFormat consumers grep:**
- `src/types/index.ts:70` — type definition (target)
- `src/store/roundStore.ts:155` — write: `inst.matchFormat = 'individual'`
- `src/components/setup/GameInstanceCard.tsx:69` — read: `active={game.matchFormat !== 'teams'}`
- `src/components/setup/GameInstanceCard.tsx:71` — read: `active={game.matchFormat === 'teams'}`
No exhaustive switches found — all four consumers can be shimmed without a stop-and-report.

**match_play.ts existence check:** NOT FOUND — new file creation confirmed.

**Gate grep baselines:**
- `b.config === cfg` → 0 (correct)
- `b.id === cfg.id` → 4 (wolf, stroke_play, skins, nassau)

## Action

1. Updated `IMPLEMENTATION_CHECKLIST.md`: moved #5 to Active-item-replaced-by-#6; removed #6 from Backlog.
2. `src/types/index.ts:70`: `'individual' | 'teams'` → `'singles' | 'best-ball' | 'alternate-shot' | 'foursomes'`.
3. `src/store/roundStore.ts:155`: `matchFormat = 'individual'` → `matchFormat = 'singles'`.
4. `src/components/setup/GameInstanceCard.tsx:69`: 
   - `active={game.matchFormat !== 'teams'}` → `active={game.matchFormat !== 'best-ball' && game.matchFormat !== 'alternate-shot' && game.matchFormat !== 'foursomes'}`
   - `matchFormat: 'individual'` → `matchFormat: 'singles'`
5. `src/components/setup/GameInstanceCard.tsx:71`:
   - `active={game.matchFormat === 'teams'}` → `active={game.matchFormat === 'best-ball' || game.matchFormat === 'alternate-shot' || game.matchFormat === 'foursomes'}`
   - `matchFormat: 'teams'` → `matchFormat: 'best-ball'`
6. Created `src/games/match_play.ts`: `MatchState { holesUp, holesPlayed, closedOut }`, `MatchPlayConfigError`, `MatchPlayBetNotFoundError`, `initialMatch(_cfg)` returning zero-state.
7. Created `src/games/__tests__/match_play.test.ts`: single stub test.

## Result

- Files touched: `IMPLEMENTATION_CHECKLIST.md`, `src/types/index.ts`, `src/store/roundStore.ts`, `src/components/setup/GameInstanceCard.tsx`, `src/games/match_play.ts` (new), `src/games/__tests__/match_play.test.ts` (new)
- `npm run test:run`: 9 test files, **178 tests passed** (177 existing + 1 stub)
- `npx tsc --noEmit --strict`: **zero errors**
- Gate greps post-implementation: `b.config === cfg` → 0; `b.id === cfg.id` → 4 (unchanged)
- Portability grep on `match_play.ts`: 0 actual imports (comment-only hits)
- No regressions on existing 177 tests

## Open questions

- None. Phase 1a stop-artifact met. Ready for Phase 1b.

## Parking lot additions

- (none new)
