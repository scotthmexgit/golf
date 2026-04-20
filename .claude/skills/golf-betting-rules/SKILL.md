---
name: golf-betting-rules
description: Canonical entry point for every rule, scoring, payout, settlement, or handicap question about the five implemented betting games — Skins, Wolf, Nassau, Match Play, and Stroke Play. Invoke whenever the user asks how a hole is scored, how a round is settled, how ties are broken, how presses work, how Lone Wolf pays, how handicap strokes are allocated, how a payout is computed, how zero-sum is enforced, how an audit event is logged, or when adding a new game, modifying payout logic, implementing per-hole settlement, changing tie handling (carryover, split, no-points, sudden-death, card-back, scorecard-playoff), or porting scoring code between web and React Native. Route rule lookups for Skins, Wolf, Nassau, Match Play, and Stroke Play to their game file. Do not answer from memory — read the game file and the invariants below before responding.
---

# Golf Betting Rules — Skill

This skill is the single entry point for every question about how the app scores holes, settles rounds, and pays out bets. It binds Claude to the canonical rule files in `docs/games/` and to the cross-game invariants listed below.

## When to invoke

Invoke this skill before answering any question or writing any code that involves:

1. Scoring a hole in Skins, Wolf, Nassau, Match Play, or Stroke Play.
2. Settling a round or a leg of a round (front 9, back 9, overall, press, closeout).
3. Computing a payout, delta, or settlement total.
4. Explaining a game's rules to a user or another agent.
5. Adding a new game type or a new game variant.
6. Modifying any file under `src/games/` or the scoring utilities currently in `src/lib/` that are slated for migration per `MIGRATION_NOTES.md`.
7. Resolving a tie, opening or accepting a press, or deciding a carryover.
8. Applying handicap strokes to a hole or a match.

## Routing table

| Game | Rule file | Scoring file (target path) |
|---|---|---|
| Skins | `docs/games/game_skins.md` | `src/games/skins.ts` |
| Wolf | `docs/games/game_wolf.md` | `src/games/wolf.ts` |
| Nassau | `docs/games/game_nassau.md` | `src/games/nassau.ts` |
| Match Play | `docs/games/game_match_play.md` | `src/games/match_play.ts` |
| Stroke Play | `docs/games/game_stroke_play.md` | `src/games/stroke_play.ts` |

Shared:

| Concern | File |
|---|---|
| Handicap allocation (course handicap, strokes-on-hole) | `src/games/handicap.ts` |
| Per-hole aggregation across games | `src/games/aggregate.ts` |
| Typed audit events | `src/games/events.ts` |
| Template for new game rule files | `docs/games/_TEMPLATE.md` |

Cross-cutting rule files:

| Feature | Rule file | Applies to |
|---|---|---|
| Round Handicap — per-player, per-round handicap adjustment | `docs/games/_ROUND_HANDICAP.md` | every handicap-aware game |
| Final Adjustment — post-hole-18 arbitration screen | `docs/games/_FINAL_ADJUSTMENT.md` | every game at round end |

Read the cross-cutting file alongside the per-game file whenever handicap, tie resolution beyond the game's own rules, or end-of-round dispute handling is touched.

If a rule file referenced above is missing, stop and dispatch the `documenter` agent to create it from `_TEMPLATE.md`. Do not guess.

## Cross-game invariants

These apply to every game. A game rule file restates an invariant **only when it overrides it**; otherwise the rule file is silent and the invariant below governs. Do not duplicate these in game files.

### Invariant 1 — Handicap in one place

Handicap strokes are computed by `src/games/handicap.ts` only. No other file may recompute course handicap or strokes-on-hole. Net scores are always derived through `strokesOnHole(strokes, holeIndex)` from that file. If a game uses gross scoring, it passes the gross score through unchanged; it does not reimplement handicap logic.

Round Handicap (`docs/games/_ROUND_HANDICAP.md`) feeds into the same net-score path with no game-specific logic. The hole-state builder computes `effectiveCourseHcp = courseHcp + roundHandicap` at the handicap-computation boundary; every game reads it through `strokesOnHole` without knowing Round Handicap exists. No game module branches on the field.

### Invariant 2 — Gross vs. net is always explicit

Every scoring function takes scores as gross and a flag or config field stating whether handicap is applied. Function signatures name the variable `gross` or `net`; never a bare `score`. No function silently assumes one or the other.

### Invariant 3 — Integer-unit math only

Stakes and payouts are integers in the app's minor unit (e.g. cents). No `Float`, no `toFixed`, no floating-point arithmetic anywhere in `src/games/`. Tests must assert `Number.isInteger(delta)` on every settlement output. UI formatting converts to major units at the render boundary; scoring never does.

### Invariant 4 — Tie-handling modes

The four canonical modes are `carryover | split | no-points | sudden-death`. Stroke Play additionally supports `card-back` and `scorecard-playoff` and declares that override in `docs/games/game_stroke_play.md`. Every rule file states which modes it supports and which is the default. A tied hole or match must resolve to exactly one of these modes; silent zero-pay on tie is a bug.

### Invariant 5 — Presses require explicit user confirmation

No press is ever auto-opened. The UI must show a confirmation step and persist the `actor` who confirmed it into the `ScoringEvent` log. `pressRule` and `pressScope` are configured once at round start; each individual press still requires a live confirmation.

### Invariant 6 — Settlement is zero-sum at round end

For every round, `Σ settlementDelta == 0` across all betting players, per game and in total. Rounding must not break zero-sum. When integer division leaves a remainder, the rule file names the absorbing player — default: the player with the lowest `playerId` in the round pays or absorbs the odd cent — and the adjustment is logged as a `RoundingAdjustment` scoring event.

### Invariant 7 — Every scoring event is typed and logged

Every delta-producing action (hole won, skin carried, press opened, Wolf partner chosen, closeout, rounding adjustment, tie resolution, etc.) emits a variant of the `ScoringEvent` discriminated union defined in `src/games/events.ts`. Each event carries `{ timestamp: string, hole: number | null, actor: PlayerId | 'system', delta: Record<PlayerId, number>, kind: <variant> }`. The event log is the audit trail; no settlement exists outside it.

## Agent routing

| User intent | Agent |
|---|---|
| "How do we score / settle / pay X?" | Answer directly using this skill + the referenced game file. |
| "Implement / change scoring for X" | `engineer`, after reading the game file and this skill. |
| "Rule is ambiguous / I need a USGA citation" | `researcher`. Do not guess. |
| "Review this scoring change" | `reviewer` (read-only gate). |
| "Draft / update / sync a rule file" | `documenter`. |
| Anything crossing two or more of the above | `team-lead` orchestrates. |

## Forbidden answers

- Do not answer rule questions from training data when a `docs/games/game_<name>.md` exists. Read the file.
- Do not propose scoring code that imports `next/*`, `react`, `react-dom`, `fs`, `path`, `window`, `document`, or `localStorage` under `src/games/`.
- Do not introduce a new tie-handling mode without updating this skill and every game rule file that references tie modes.
- Do not write settlement code that cannot be proven zero-sum by a test.
