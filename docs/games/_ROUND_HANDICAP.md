# Round Handicap

Link: `.claude/skills/golf-betting-rules/SKILL.md` · Cross-cutting feature; applies to every game.

This document is authoritative for the Round Handicap field. Every game that applies handicap strokes reads the player's course handicap **plus** the Round Handicap before calling `strokesOnHole` from `src/games/handicap.ts`.

## 1. Overview

Round Handicap is a per-player, per-round integer adjustment layered on top of the player's USGA course handicap. It exists because recreational groups often agree to an informal one-round modifier — a "game adjustment" that compensates for recent form, course familiarity, or group tradition — without touching the player's official handicap index.

## 2. Definition

```ts
interface RoundHandicapField {
  roundHandicap: number   // integer, range -10..+10, default 0
}
```

The field sits on `PlayerSetup` in `src/games/types.ts` (see `MIGRATION_NOTES.md` item 16). `-10` lets a player give up 10 strokes beyond their USGA handicap; `+10` lets a player take 10 extra strokes. `0` is the default and means no round-specific adjustment.

## 3. Application

Every handicap-aware game computes the player's effective course handicap for stroke allocation as:

```
effectiveCourseHcp = courseHcp + roundHandicap
```

`strokesOnHole` from `src/games/handicap.ts` takes `effectiveCourseHcp` (not the raw `courseHcp`). No game reimplements this addition — it is performed once, at the handicap-computation boundary, and every game inherits the result.

Handicap strokes do not apply to Junk awards. Round Handicap has no effect on CTP, Longest Drive, Greenie, Sandy, Barkie, Polie, or Arnie outcomes — those are evaluated on gross events per `docs/games/game_junk.md` § 2.

## 4. UI Surface

Round Handicap is visible only on the Bet Setup Screen, per row in the player roster (UI design spec § 4.1 and § 4.2).

- **Label**: "Round Handicap"
- **Helper text** (verbatim): "Strokes given for this round only. Can differ from USGA handicap if the group agrees."
- **Control**: numeric stepper, step = 1, range `-10..+10`, default `0`.
- **Editable until**: "Save & start round" click. After the round locks, the field is read-only for the remainder of the round.
- **Mid-round change**: requires `ConfigUnlocked` → edit → `RoundConfigLocked` (a new lock event). Every mid-round edit appends a fresh `RoundConfigLocked` event with the updated `RoundConfig` payload.

## 5. Data Model

`PlayerSetup` gains the field:

```ts
interface PlayerSetup {
  id: string
  name: string
  hcpIndex: number
  tee: TeeName
  isCourseHcp: boolean
  courseHcp: number
  betting: boolean
  isSelf: boolean
  roundHandicap: number   // new; integer, range -10..+10, default 0
}
```

The field appears in `RoundConfig.players[i].roundHandicap`. It is captured in the `RoundConfigLocked` event payload. No new `ScoringEvent` variant is needed for Round Handicap itself — the existing `RoundConfigLocked` carries the full config.

## 6. Interaction With Each Game

Every game that reads `strokesOnHole` from `src/games/handicap.ts` sees Round Handicap automatically, with no game-specific code change. One line per game:

- **Skins**: `netFor` in `src/games/skins.ts` reads `state.strokes[pid]`, which the hole-state builder populates from `effectiveCourseHcp`. Round Handicap feeds in through the builder, not through `skins.ts`.
- **Wolf**: team-score computation calls `strokesOnHole` per player with `effectiveCourseHcp`. Same path.
- **Nassau**: match-play per-hole net score uses `effectiveCourseHcp`. Same path.
- **Match Play**: singles uses `effectiveCourseHcp`. Best-ball uses `effectiveCourseHcp` per player.
- **Stroke Play**: `recordStrokePlayHole` reads `effectiveCourseHcp` through `state.strokes[pid]`. Same path.

No game implements a Round-Handicap-specific branch. A new game type inherits Round Handicap support by calling `strokesOnHole` with `effectiveCourseHcp`.

## 7. Validation

The UI and the engine both enforce:

- `Number.isInteger(roundHandicap)` is `true`.
- `-10 <= roundHandicap <= 10`.
- No missing-field default. An uninitialised `PlayerSetup` with a missing `roundHandicap` is rejected at `RoundConfigLocked` time; the UI defaults to `0` at roster construction so a user-facing "missing" state never occurs.

Engine rejection on invalid input throws a typed error (`PlayerSetupError` or equivalent — named in `MIGRATION_NOTES.md` item 16 during the engineer pass).

## 8. Worked Example

Alice plays with a USGA handicap index of 12 that the app converts to `courseHcp = 12` at the default tees. The group agrees Alice has been sandbagging recent rounds and she should give up two extra strokes this round. Alice sets her Round Handicap to `-2`.

```
Alice.courseHcp      = 12
Alice.roundHandicap  = -2
Alice.effectiveCourseHcp = 12 + (-2) = 10
```

For a hole with handicap index 5, `strokesOnHole(10, 5)` returns `1` (10 >= 5, 10 < 23 where 18 + holeIndex = 23). Alice receives 1 stroke on that hole. Without the Round Handicap, she would have received `strokesOnHole(12, 5) = 1` — same on this index-5 hole, since 12 exceeds 5 comfortably. The Round Handicap bite shows on higher-index holes: on an index-11 hole, `strokesOnHole(10, 11) = 0` versus `strokesOnHole(12, 11) = 1`. Alice surrenders the stroke she would have taken at index 11.

Inverse scenario: Bob has `courseHcp = 14` and the group gives him `roundHandicap = +3` because he tweaked his back at the range. His `effectiveCourseHcp = 17`. On an index-16 hole, he now receives `strokesOnHole(17, 16) = 1`; without the adjustment he would have received `strokesOnHole(14, 16) = 0`.

Both adjustments show up the moment the hole-state builder runs `effectiveCourseHcp` through `strokesOnHole`. No game module needs to know Round Handicap exists.

## 9. Test Cases

### Test 1 — Default is zero, no effect

Setup: player with `courseHcp = 10`, `roundHandicap = 0` (default). On hole index 5, `strokesOnHole` returns 1.
Assert: Net score on a gross-4 hole is `4 - 1 = 3`, identical to a pre-Round-Handicap round. No behavior change when the field defaults.

### Test 2 — Negative Round Handicap removes strokes

Setup: Alice `courseHcp = 12`, `roundHandicap = -2`. Hole index 11.
Assert: `effectiveCourseHcp = 10`; `strokesOnHole(10, 11) = 0`; Alice's net on gross 5 = 5, not 4.

### Test 3 — Positive Round Handicap adds strokes

Setup: Bob `courseHcp = 14`, `roundHandicap = +3`. Hole index 16.
Assert: `effectiveCourseHcp = 17`; `strokesOnHole(17, 16) = 1`; Bob's net on gross 5 = 4, not 5.

### Test 4 — Out-of-range values rejected

Setup: attempt to save `RoundConfig` with `roundHandicap = 11`.
Assert: UI blocks save; engine rejects on round-trip with a typed error; no `RoundConfigLocked` event emits.

### Test 5 — Non-integer values rejected

Setup: attempt to save `roundHandicap = 1.5`.
Assert: Same rejection path. UI step=1 prevents the entry; engine validation catches any round-trip violation.

### Test 6 — No effect on Junk awards

Setup: Alice `roundHandicap = +5`. Par-3 hole; Alice wins CTP with a gross-3 par.
Assert: `CTPWinnerSelected` emits for Alice. `JunkAwarded` kind `'greenie'` emits with the same points map whether `roundHandicap` is `0` or `+5`. Junk outcomes depend on gross events only.

### Test 7 — Mid-round edit appends a fresh RoundConfigLocked

Setup: mid-round, role-holder unlocks, bumps Alice's `roundHandicap` from `0` to `+1`, re-locks.
Assert: Two `RoundConfigLocked` events in the log. The second carries the updated value. Subsequent holes use `effectiveCourseHcp = courseHcp + 1` for Alice.
