# MIGRATION_NOTES.md

Contradictions between the Team-Lead brief and the current codebase as of 2026-04-17. Every entry names the brief clause, the current state, and the merge decision. **Nothing is silently fixed.** Each item is owned by an agent and has a trigger.

---

## 1. `src/games/` does not exist

- **Brief clause:** "Scoring logic must live in pure, platform-agnostic TypeScript under `src/games/` with zero imports from `next/*`, `react`, `react-dom`, `fs`, `path`, `window`, `document`, or `localStorage`."
- **Current state:** Scoring lives in `src/lib/scoring.ts`, `src/lib/payouts.ts`, `src/lib/junk.ts`, `src/lib/handicap.ts`. `src/lib/payouts.ts` imports `@/types` (fine) but is not structured per-game as one file per rule doc.
- **Merge decision:** Create `src/games/` alongside `src/lib/` and migrate scoring functions file-by-file. Do not delete `src/lib/` until every callsite (`src/app/api/*`, `src/app/round/*`, `src/components/scorecard/*`, `src/store/roundStore.ts`) is updated and tests pass.
- **Owner:** engineer. **Trigger:** any PR touching scoring logic must move the touched function into `src/games/<game>.ts`.

## 2. Prisma `stake` is `Float`, not integer units

- **Brief clause:** "integer-unit math only".
- **Current state:** `prisma/schema.prisma` declares `Game.stake Float` and `SideBet.stake Float`. `src/types/index.ts` `GameInstance.stake: number`. `formatMoneyDecimal` formats to two decimal places — evidence of non-integer amounts in practice.
- **Merge decision:** Migrate `stake` to `Int` representing cents (or configurable minor unit). Update `schema.prisma`, generate migration, update all call sites, and retire `formatMoneyDecimal`. Keep a single conversion boundary at the UI layer.
- **Owner:** engineer. **Trigger:** first scoring change after this file lands.

## 3. Scope mismatch — extra games in the codebase

- **Brief clause:** "Implemented games (scope): Skins, Wolf, Nassau, Match Play, Stroke Play."
- **Current state:** `src/types/index.ts` `GAME_DEFS` lists nine game types: `strokePlay`, `matchPlay`, `stableford`, `skins`, `nassau`, `bestBall`, `bingoBangoBongo`, `wolf`, `vegas`. `computeGamePayouts` in `src/lib/payouts.ts` dispatches on five of them; `wolf`, `bestBall`, `bingoBangoBongo`, `vegas` have no compute function and fall through to `computeStrokePlay`.
- **Merge decision:** Keep the extra labels visible in UI but mark non-scope games as `disabled: true` in `GAME_DEFS` until a rule file exists. Wolf is in scope — implement `src/games/wolf.ts` before re-enabling the UI card.
- **Owner:** engineer (code), documenter (UI copy). **Trigger:** any PR that changes `GAME_DEFS`.

## 4. Wolf has no compute function

- **Brief clause:** Wolf is one of the five in-scope games and must match `docs/games/game_wolf.md`.
- **Current state:** `computeGamePayouts` default-branches Wolf into `computeStrokePlay`. Players using Wolf today silently get stroke-play settlement.
- **Merge decision:** Implement `src/games/wolf.ts` with rotating captain, partner-choice-after-tee-shot, default 3× Lone Wolf multiplier, optional Blind Lone, and holes 17–18 rotation rule. Do not ship UI until `game_wolf.md` and tests pass.
- **Owner:** engineer. **Trigger:** Task 4 produces `docs/games/game_wolf.md`; engineer then implements against it.

## 5. Nassau is hard-limited to two players and has no press logic

- **Brief clause:** "Nassau — three matches (front/back/overall); presses per configurable `pressRule` and `pressScope`; presses require explicit user confirmation."
- **Current state:** `computeNassau` early-returns `if (inGame.length !== 2)`. `GameInstance.pressAmount` exists in types but is never read. `HoleData.presses?: string[]` field exists but no code writes or consumes it.
- **Merge decision:** Generalize Nassau to pairings (default: all pairs; team mode later) and wire `pressRule` / `pressScope` / press confirmation through the UI. Presses must require an explicit confirm step; no auto-presses.
- **Owner:** engineer. **Trigger:** Task 4 produces `docs/games/game_nassau.md`.

## 6. Match Play format labels do not match the brief

- **Brief clause:** "formats: singles / best-ball / alternate-shot / foursomes".
- **Current state:** `GameInstance.matchFormat?: 'individual' | 'teams'`. No closeout logic (`holesUp > holesRemaining`).
- **Merge decision:** Rename the field and widen the union to the four brief formats. Add closeout logic. USGA stroke allocation for net match play must live in `src/games/handicap.ts`.
- **Owner:** engineer. **Trigger:** Task 4 produces `docs/games/game_match_play.md`.

## 7. Skins has no tie rule for hole 18

- **Brief clause:** "ties carry over; configurable `tieRule` for hole 18."
- **Current state:** `computeSkins` accumulates `carry` indefinitely. A tied hole 18 leaves carried stakes unpaid.
- **Merge decision:** Add `tieRule: 'carryover' | 'split' | 'no-points' | 'sudden-death'` to the Skins rule config. Default `split` for hole 18. Reject silent forfeit.
- **Owner:** engineer. **Trigger:** Task 4 produces `docs/games/game_skins.md`.

## 8. Stroke Play has no settlement mode

- **Brief clause:** "settlementMode (winner-takes-pot | per-stroke | places) configurable; tieRule (split | sudden-death | card-back | scorecard-playoff)."
- **Current state:** `computeStrokePlay` implements only winner-takes-pot and silently does nothing on ties (no payouts written).
- **Merge decision:** Implement all three settlement modes and all four tie rules. Silent-zero on tie is a bug; reviewer agent must flag any future occurrence.
- **Owner:** engineer. **Trigger:** Task 4 produces `docs/games/game_stroke_play.md`.

## 9. No `ScoringEvent` union / audit trail

- **Brief clause:** "every scoring event is a typed variant of a `ScoringEvent` union logged with timestamp/hole/actor/delta."
- **Current state:** `HoleResult` records per-hole results but lacks timestamps, actors, or an explicit event union. `GameResult.detail: Json` is free-form.
- **Merge decision:** Introduce `ScoringEvent` in `src/games/events.ts`. Every scoring delta (hole won, skin carried, press opened, Wolf partner chosen, etc.) emits a typed event. Persist to a new `ScoringEvent` Prisma model.
- **Owner:** engineer. **Trigger:** first scoring function migrated into `src/games/`.

## 10. Pure-function signature contract not met

- **Brief clause:** "pure functions `(holeState, ruleConfig) => settlementDelta`, no side effects inside `src/games/`."
- **Current state:** `computeStrokePlay(holes, players, game)` takes whole-round arrays and returns a whole-round `PayoutMap`. `src/lib/prisma.ts` is a DB side-effect surface and must never be imported from `src/games/`.
- **Merge decision:** New signatures take one-hole state and one rule config, return a `SettlementDelta`. Round-total aggregation happens in `src/games/aggregate.ts`, not inside per-game files.
- **Owner:** engineer. **Trigger:** each game migration.

## 11. Handicap utility is in `src/lib/`, not `src/games/`

- **Brief clause:** "handicap only via `src/games/handicap.ts`."
- **Current state:** `src/lib/handicap.ts` exists with `calcCourseHcp`, `calcStrokes`, `strokesOnHole`. No other copies found.
- **Merge decision:** Move the file to `src/games/handicap.ts`. Keep the named exports identical and add a deprecated re-export shim at `src/lib/handicap.ts` for one release, then delete.
- **Owner:** engineer. **Trigger:** first PR in the `src/games/` migration.

## 12. README.md was generic `create-next-app` boilerplate

- **Brief clause:** "Remove generic LLM guidance that doesn't mention this app's domain or stack."
- **Current state:** Replaced in Task 1 with an app-specific stub. Task 5 will expand with "How this project is organized" and "Portability invariants" sections.
- **Owner:** documenter. **Trigger:** Task 5.

## 13. No tests exist

- **Brief clause:** "Test Cases section must include the worked example verbatim and assert zero-sum across all players at round end."
- **Current state:** No `*.test.ts`, no test runner configured. `package.json` has no `test` script.
- **Merge decision:** Pick a runner (Vitest recommended — pure-ESM, fast, good TS strict support) in Task 4 or a follow-up. Until then, rule files' "Worked Example" serves as the specification and reviewer agent treats the absence of tests as a BLOCKED condition for any engineer work.
- **Owner:** engineer (runner + harness), documenter (example sync). **Trigger:** Task 4.

## 14. Junk (side bets) sits outside the scope but is wired into payouts

- **Brief clause:** Brief lists five games. Junk (greenie, sandy, birdie, eagle, garbage, hammer, snake, lowball) is not a game.
- **Current state:** `src/lib/junk.ts` + `GameInstance.junk: JunkConfig` are hard-wired into `computeAllPayouts`. UI collects junk dots per hole.
- **Merge decision:** Keep junk out of the five game rule files. Document junk separately in `docs/games/_junk.md` (follow-up). Reviewer must not block scope-five changes on junk gaps.
- **Owner:** documenter (follow-up). **Trigger:** after the five core rule files land.
- Follow-up: `src/lib/junk.ts` is slated for full replacement by `src/games/junk.ts` per `docs/games/game_junk.md`. Owner: engineer. Trigger: Task B in the Junk-rule-file round.

## 15. `computeStrokePlay` silently zero-pays on tie

- **Brief clause:** "no silent defaults" (ground rule).
- **Current state:** `src/lib/payouts.ts:36-40` — `if (winners.length === 1)` gates the whole payout block; a tie produces all-zero payouts with no event, no log.
- **Merge decision:** Either emit a `TieUnresolved` scoring event or route through the configured tie rule. Never silently return zeros.
- **Owner:** engineer. **Trigger:** Task 4 produces `docs/games/game_stroke_play.md`.

## 16. `PlayerSetup.roundHandicap` field and validation

- **Brief clause:** `docs/games/_ROUND_HANDICAP.md` § 2 and § 5 require `roundHandicap: number` on `PlayerSetup`, integer, range `-10..+10`, default `0`. § 7 requires a typed rejection error (named `PlayerSetupError` or equivalent) on out-of-range or non-integer input.
- **Current state:** `src/types/index.ts` `PlayerSetup` has no `roundHandicap` field. `src/games/types.ts` per-game configs do not carry it either. No `PlayerSetupError` typed error exists. The hole-state builder does not compute `effectiveCourseHcp`.
- **Merge decision:** Add `roundHandicap: number` to `PlayerSetup` (mirror across `src/games/types.ts` and `src/types/index.ts` until unified). Engine rejects invalid input at `RoundConfigLocked` time via a typed error. Hole-state builder computes `effectiveCourseHcp = courseHcp + roundHandicap` and passes it to `strokesOnHole`. No game module branches on the field.
- **Owner:** engineer. **Trigger:** first PR that wires Round Handicap into the hole-state builder or the Bet Setup Screen.

## 17. Final Adjustment event variants absent from `src/games/events.ts`

- **Brief clause:** `docs/games/_FINAL_ADJUSTMENT.md` § 7 lists five new `ScoringEvent` variants: `FinalAdjustmentApplied`, `AdjustmentProposed`, `AdjustmentApproved`, `AdjustmentRejected`, `RoundControlTransferred`.
- **Current state:** `src/games/events.ts` defines none of the five variants. The exhaustive switch in `src/games/__tests__/types.test.ts` tracks a variant count that does not include them.
- **Merge decision:** Add all five variants to the `ScoringEvent` discriminated union with the payload shapes listed in § 7. Update the `types.test.ts` exhaustive-switch variant count. Persist through the existing `ScoringEvent` pipeline; no new Prisma model. Engine enforces zero-sum per bet before persisting a `FinalAdjustmentApplied`.
- **Owner:** engineer. **Trigger:** first PR implementing the Final Adjustment screen or its engine-side validation.

## 18. Role-holder disconnect quorum override — v2 deferred

- **Brief clause:** `docs/games/_FINAL_ADJUSTMENT.md` § 9 names a v2 feature: if the role-holder disconnects, a quorum of remaining bettors may vote to reassign the round role. v1 does not ship it. § 7 also defers an accept-timeout UX for `RoundControlTransferred` to v2.
- **Current state:** No role-transfer code exists. v1 will ship only the one-tap `RoundControlTransferred` flow initiated by the outgoing role-holder.
- **Merge decision:** Defer the quorum-override feature and the accept-timeout UX. v1 documents both as deferred so users and reviewers know the limit. Do not ship quorum logic without a new doc round that defines quorum size, voting window, timeout, and tie-breaking.
- **Owner:** product + engineer. **Trigger:** v2 planning round.

## 19. `NassauCfg.matchTieRule` present in types but absent from `game_nassau.md` § 4

- **Brief clause:** Rule files are the source of truth for per-game config (see AGENTS.md § Source of truth). Every field on a `*Cfg` interface in `src/games/types.ts` appears in the corresponding rule file § 4 Configuration.
- **Current state:** `src/games/types.ts` declares `NassauCfg.matchTieRule`. `docs/games/game_nassau.md` § 4 does not mention the field. Source unclear — legitimate config omission, or stale type-only survivor of a prior doc pass.
- **Merge decision:** Determine whether the field is legitimate config (add to rule file § 4 with value set and default) or stale (remove from `types.ts`). Researcher first, then documenter or engineer based on finding.
- **Owner:** researcher first, then documenter or engineer based on finding. **Trigger:** before Nassau end-to-end implementation.

---

## Audit summary (Task 1)

- Non-node-modules `.md` files before Task 1: `CLAUDE.md`, `AGENTS.md`, `README.md`.
- `CLAUDE.md` contained only `@AGENTS.md` — kept as-is (valid pointer).
- `AGENTS.md` contained only the Next.js-version warning — kept and tightened with domain scope, source-of-truth table, and five-game list.
- `README.md` contained generic `create-next-app` boilerplate — replaced with app-specific stub.
- No existing `docs/`, no `.claude/skills/`, no `.claude/agents/` directories.

No contradiction was silently resolved. Every code change in Tasks 2–5 that affects items 1–15 above will cite the item number in its commit message.
