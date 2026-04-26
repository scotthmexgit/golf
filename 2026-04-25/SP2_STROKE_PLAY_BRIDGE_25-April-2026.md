---
prompt_id: SP2
timestamp: 2026-04-25T18:58:00Z
checklist_item_ref: "SP-2 — Stroke Play HoleState Builder"
tags: [sp2, engineer, bridge, holestate, builder]
---

## Prompt

SP-2: Build `buildStrokePlayHoleState(holeData, players)` — the HoleData → HoleState translator for Stroke Play's 5-field surface, with 14 HoleState fields stubbed empty. Four tests. tsc clean.

## Action

1. Surveyed project structure: no `src/bridge/` directory existed. Candidate paths: `src/bridge/` (new) vs `src/lib/` (legacy).
2. Read `src/games/types.ts:158–178` (HoleState definition), `src/games/handicap.ts:36–38` (effectiveCourseHcp), `src/types/index.ts:98–115` (HoleData, PlayerSetup), `vitest.config.ts` (include pattern).
3. Identified vitest include-pattern issue: only `src/games/**/*.test.ts` — bridge tests at `src/bridge/` would not be discovered.
4. Created `src/bridge/stroke_play_bridge.ts` and `src/bridge/stroke_play_bridge.test.ts`.
5. Updated `vitest.config.ts` include to add `'src/bridge/**/*.test.ts'`.
6. Ran `npm run test:run`: 316/316 (307 base + 9 new its).
7. Ran `tsc --noEmit --strict`: exit 0.

---

## File location: `src/bridge/stroke_play_bridge.ts`

**Reasoning:** `src/bridge/` is semantically correct for translation-layer code that spans the UI store (HoleData, PlayerSetup from `src/types/`) and the engine (HoleState from `src/games/types`). `src/lib/` is the legacy path being phased out by SP-4; adding new code there risks confusion about deprecation status. `src/games/` is off-limits (portability invariant). A new `src/bridge/` directory signals the architectural seam clearly and will be the natural home for SP-3's orchestration wrapper.

---

## Verified handicap function

`src/games/handicap.ts:36–38`:
```ts
export function effectiveCourseHcp(player: PlayerSetup): number {
  return player.courseHcp + player.roundHandicap
}
```

Takes a single `PlayerSetup` object. Returns the player's effective course handicap as an integer. Re-exports `strokesOnHole` from `src/lib/handicap.ts` (line 15).

---

## Builder function signature (as written)

```ts
export function buildStrokePlayHoleState(
  holeData: HoleData,
  players: PlayerSetup[],
): HoleState
```

**Deviation from prompt spec:** The prompt suggested a third parameter `roundHandicap: number`. It is not needed. `effectiveCourseHcp(player)` already reads `player.roundHandicap` from the PlayerSetup object. Adding a redundant third parameter would create a potential inconsistency (caller could pass a different value from what the PlayerSetup already carries). Two parameters is correct.

---

## strokes[pid] value: effectiveCourseHcp, not per-hole strokes

**Deviation from prompt description:** The prompt says "the strokes value is the per-hole handicap allocation." That is not what HoleState.strokes[pid] stores. The engine's `netFor()` (`stroke_play.ts:149–154`) calls `strokesOnHole(hole.strokes[pid], hole.holeIndex)` — meaning `strokes[pid]` is the player's **total course handicap**, and `strokesOnHole` converts it to a per-hole integer (0 or 1). The builder correctly stores `effectiveCourseHcp(player)` (the total), not the per-hole result. This matches how the test fixtures (`WORKED_STROKES = { Alice: 0, Bob: 5, ... }`) populate `strokes`.

---

## HoleState field inventory

Actual fields from `src/games/types.ts:158–178`:

| Field | Type | Builder action |
|---|---|---|
| `hole` | `number` | `holeData.number` (live) |
| `par` | `number` | `holeData.par` (live) |
| `holeIndex` | `number` | `holeData.index` (live) |
| `timestamp` | `string` | `new Date().toISOString()` (live) |
| `gross` | `Record<PlayerId, number>` | `holeData.scores[pid] ?? 0` (live) |
| `strokes` | `Record<PlayerId, number>` | `effectiveCourseHcp(player)` (live) |
| `status` | `HoleStatus` | `'Confirmed'` (stub) |
| `ctpWinner` | `PlayerId \| null` | `null` (stub) |
| `longestDriveWinners` | `PlayerId[]` | `[]` (stub) |
| `bunkerVisited` | `Record<PlayerId, boolean>` | `{}` (stub) |
| `treeSolidHit` | `Record<PlayerId, boolean>` | `{}` (stub) |
| `treeAnyHit` | `Record<PlayerId, boolean>` | `{}` (stub) |
| `longPutt` | `Record<PlayerId, boolean>` | `{}` (stub) |
| `polieInvoked` | `Record<PlayerId, boolean>` | `{}` (stub) |
| `fairwayHit` | `Record<PlayerId, boolean>` | `{}` (stub) |
| `gir` | `Record<PlayerId, boolean>` | `{}` (stub) |
| `pickedUp` | `PlayerId[]` | `[]` (stub) |
| `conceded` | `PlayerId[]` | `[]` (stub) |
| `withdrew` | `PlayerId[]` | `[]` (stub) |

No discrepancy with the prompt's stub list. All 19 HoleState fields accounted for.

---

## vitest.config.ts change

**Deviation note:** The fence said "only the new builder file, the new test file, and the session log are created." The vitest.config.ts required modification (not creation) to include `'src/bridge/**/*.test.ts'` — without this change the tests would not run. The config file is not in any fenced directory (`src/games/`, `src/lib/payouts.ts`, etc.). Change: one-line addition to the `include` array.

---

## Test count

| Describe | `it` blocks |
|---|---|
| Test 1: live fields map correctly | 4 |
| Test 2: zero handicap → strokes all 0 | 2 |
| Test 3: missing score → gross = 0 | 2 |
| Test 4: stubbed fields empty | 1 |

**Before:** 307 (10 test files) → **After:** 316 (11 test files, 9 new `it` blocks)

---

## tsc result

`npx tsc --noEmit --strict`: exit 0, zero errors.

---

## Noticed but out of scope

- `src/lib/handicap.ts` is a deprecated shim re-exported by `src/games/handicap.ts`. The shim comment says "Transitional re-export; will be inlined here once callers migrate." This will be relevant at SP-4 cutover time; not a SP-2 concern.

## Result

- **Files created:** `src/bridge/stroke_play_bridge.ts`, `src/bridge/stroke_play_bridge.test.ts`
- **Files modified:** `vitest.config.ts` (one-line include addition)
- **Tests:** 307 → 316 (9 new its, all passing)
- **tsc:** exit 0, zero errors
