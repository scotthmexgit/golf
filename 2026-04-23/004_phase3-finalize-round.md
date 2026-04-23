---
prompt_id: "004"
timestamp: "2026-04-23T20:33:00Z"
checklist_item_ref: "#6 — Match Play engine (Phase 3: finalizeMatchPlayRound + tieRule collapse)"
tags: [match-play, phase3, engineer]
---

## Prompt

Engineer proceeds to Phase 3 after documenter turn accepted. Scope: narrow MatchPlayCfg.tieRule from 'halved'|'extra-holes' to 'halved', remove extraHolesCap from types.ts and test fixture; implement finalizeMatchPlayRound (Nassau-shaped); exactly 4 tests (218 total). Pre-flight: confirm Item 1 (types.ts tieRule collapse), Item 2 (exact test count), Item 3 (ExtraHoleResolved emit sites). Agent: engineer.

## Evidence gates (pre-edit)

- `src/games/types.ts` line 75: `tieRule: 'halved' | 'extra-holes'` — confirmed target for collapse.
- `src/games/types.ts` line 76: `extraHolesCap: number` — confirmed for removal.
- References to `extraHolesCap` across `src/`: exactly 2 files — `types.ts` (definition) and `match_play.test.ts` (makeCfg default `extraHolesCap: 3`). Zero engine callers.
- `ExtraHoleResolved` emit sites in `src/**`: **0**. Switch-case/fixture refs: `types.test.ts` lines 37 and 103 (discriminated-union switch + fixture for exhaustive-switch test). Zero references in `match_play.ts`.
- `MatchHalved` type: `EventBase & WithBet & { kind: 'MatchHalved'; hole: number | null; matchId: string }` — no `WithPoints` mixin; zero-delta semantics are implicit (absence of points-carrying events).
- `MatchClosedOut` type: `EventBase & WithPoints & WithBet & { kind: 'MatchClosedOut'; hole: number; matchId: string; holesUp: number; holesRemaining: number }` — `WithPoints` provides `points: Record<PlayerId, number>`.
- Decided-match delta arithmetic: holesUp=+2, stake=100, playerIds=['A','B'] → A wins → `{ A: +100, B: -100 }` → Σ = 0 ✓.
- § 6 (revised): "On the final scheduled hole, if the match is tied (holesUp === 0 at holesPlayed === holesToPlay), finalizeMatchPlayRound emits MatchHalved with matchId: cfg.id, hole: holesToPlay, and zero deltas for all participants."
- § 12 Test 2: "18-hole singles, tieRule='halved'; after hole 18, holesUp===0. Assert: MatchHalved, deltas={A:0,B:0}, Σ=0." Maps to tests 1 (kind/matchId/hole) + 2 (Σ=0 aggregate).

## Pre-write test count

Exactly 4 new tests (214 → 218):
1. `§ 12 Test 2: tied match at holesToPlay emits MatchHalved` — kind, matchId, hole, closedOut
2. `§ 12 Test 2: MatchHalved carries no monetary movement, Σ = 0 for all playerIds` — aggregate points = 0 per player
3. `decided match at holesToPlay emits MatchClosedOut with correct delta` — holesUp=+2, stake=100 → {A:+100,B:-100}, Σ=0
4. `already-closed match returns [] and unchanged MatchState (idempotent)` — closedOut=true → events=[], match reference===input

## Action

**src/games/types.ts:**
- `tieRule: 'halved' | 'extra-holes'` → `tieRule: 'halved'`
- Removed `extraHolesCap: number` field from MatchPlayCfg.

**src/games/match_play.ts:**
- Added `export function finalizeMatchPlayRound(cfg, _roundCfg, match)`.
- Already-closed guard: return `{ events: [], match }` (idempotent).
- Tied path (holesUp === 0): push MatchHalved, return `{ events, match: { ...match, closedOut: true } }`.
- Decided path (holesUp !== 0): singles builds direct delta; team formats use `splitToTeam` + RoundingAdjustment if remainder, mirroring `settleMatchPlayHole` closeout path. Returns `{ events, match: { ...match, closedOut: true } }`.
- Timestamp: `String(cfg.holesToPlay)` (analogous to Nassau's `String(match.endHole)`).

**src/games/__tests__/match_play.test.ts:**
- Added `finalizeMatchPlayRound` to import.
- Removed `extraHolesCap: 3` from `makeCfg` default.
- Appended `describe('finalizeMatchPlayRound', ...)` with exactly 4 tests.

## Result

- Files touched: `src/games/types.ts`, `src/games/match_play.ts`, `src/games/__tests__/match_play.test.ts`, `IMPLEMENTATION_CHECKLIST.md`
- `npm run test:run`: 9 test files, **218 tests passed** (214 + 4 new Phase 3 tests)
- `npx tsc --noEmit --strict`: zero errors
- Gate greps: `b.config === cfg` → 0; `b.id === cfg.id` → 5 (unchanged) ✓
- Portability grep on match_play.ts: comment line only, zero imports ✓

## Open questions

- None. Gate to Phase 4a: Round Handicap integration test.

## Parking lot additions

- (none new)
