# _TEMPLATE.md

Every `docs/games/game_<name>.md` file copies this template and fills each section. Sections must appear in this order and with these exact names. The reviewer agent fails any rule file that is missing, renames, or reorders a section.

A rule file does not restate cross-game invariants from `.claude/skills/golf-betting-rules/SKILL.md`. It restates an invariant only when it overrides it.

Replace every `<placeholder>` with a concrete value, name, number, or code block. No placeholder survives into a shipped rule file.

---

# Game: `<Name>`

Link: `.claude/skills/golf-betting-rules/SKILL.md` · Scoring file: `src/games/<name>.ts`

## 1. Overview

One paragraph. Names the game, the number of players it supports, and the single-sentence objective. End with a link to the scoring file.

## 2. Players & Teams

State minimum and maximum field size. State whether teams form, how they form (fixed at round start, rotating per hole, captain's choice after tee shots), and how handicap strokes apply per side.

## 3. Unit of Wager

State the stake unit (integer minor units — e.g. cents), whether the stake is per hole, per match, per skin, per stroke, or per place. State every multiplier (e.g. Lone Wolf 3×).

## 4. Setup

List every configuration field the UI must collect before the first tee shot. For each field give the TypeScript type, default, and valid range. Example:

```ts
interface <Name>Config {
  stake: number        // integer minor units, default 100, min 1
  tieRule: 'carryover' | 'split' | 'no-points'  // default 'split' — app never plays extra holes; unresolved ties escalate to Final Adjustment
  // ...
}
```

## 5. Per-Hole Scoring

Pseudocode in TypeScript-flavored shape. Show the exact function signature used in `src/games/<name>.ts`. Walk through each decision in order (who scores, how net is computed, who wins, what the delta is, what event is emitted).

```ts
function settleHole(state: HoleState, cfg: <Name>Config): SettlementDelta {
  // step 1: compute net per player via src/games/handicap.ts
  // step 2: apply game rule
  // step 3: emit ScoringEvent
  // step 4: return delta
}
```

## 6. Tie Handling

Name every tie mode this game supports. State the default. State exactly what happens on a tied hole, a tied leg, and a tied round. Reference `tieRule` config field from section 4.

## 7. Press & Variants

List every press rule, automatic-press threshold, and variant (e.g. Lone Wolf, Blind Lone, escalating skins). For each variant state the toggle flag in the config and the behavioral delta from the base game. Every press requires explicit user confirmation — state exactly which UI event and which `ScoringEvent` variant records the confirmation.

## 8. End-of-Round Settlement

Describe how per-hole deltas aggregate into the final round result. State the `settlementMode` options, the default, and any per-round multipliers (e.g. Nassau's three-way match structure). State the rounding policy for non-integer divisions and the `RoundingAdjustment` event that records any remainder.

## 9. Edge Cases

Enumerate every edge case the scoring function must handle. Each entry names the condition and the expected behavior. Examples:

- Missing score for a player on a hole — `TieUnresolved` event, no delta.
- Player withdraws mid-round — prior deltas stand; remaining holes do not score.
- Field size falls below minimum — scoring returns `[]` and emits `FieldTooSmall` event.

## 10. Worked Example

Real players, real gross scores, real arithmetic. Walk hole-by-hole (or leg-by-leg) showing each delta. End with the full round's per-player total. State that `Σ delta == 0`.

This block is copied verbatim into section 12.

## 11. Implementation Notes

Point to `src/games/<name>.ts`. List every `ScoringEvent` variant this game emits. List every cross-file dependency (`src/games/handicap.ts`, `src/games/aggregate.ts`, `src/games/events.ts`). Note any non-obvious performance or precision concern.

## 12. Test Cases

Copy section 10 verbatim as one test case. Add test cases for every edge case named in section 9. Every test asserts `Σ delta == 0`. Every delta value is asserted with `Number.isInteger`.
