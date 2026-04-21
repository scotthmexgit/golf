---
prompt_id: 007
timestamp: 2026-04-20T22:05:07Z
checklist_item_ref: "#3 — Wolf follow-ups"
tags: [engineer, wolf, rotation-refactor]
---

## Prompt

Approve transition. Begin #3. Before any code change, re-state acceptance criteria + fence sentence verbatim from REBUILD_PLAN.md. Log per amended skill. If work starts to exceed fence, stop. Park any adjacent typos/refactor opportunities.

## Action

Re-stated #3 AC + fence verbatim in response before touching any file. Verified baseline: 100 tests pass, `src/lib/payouts.ts` hash `52a389607248ffda...215c`. Then executed the 7 items as a coherent code change (interdependent via `WolfCfg` type).

1. `src/games/__tests__/wolf.test.ts` `makeWolfCfg` default — removed `lastTwoHolesRule` and `teeOrder` entries.
2. `src/games/__tests__/wolf.test.ts` `makeRoundCfg` — populated `players` from `cfg.playerIds` (PlayerSetup[] of length 4 or 5; minimal fields — `roundHandicap: 0`, `courseHcp: 0`, `tee: 'white'`). Consequential to item 3 since the engine now reads `roundCfg.players[]` directly; fixtures must comply.
3. Removed test-scoped `teeOrder` overrides at the 5-player Lone test, the tied-Lone-Wolf test, the 5-player-rotation test, and the `playerIds-outside-4..5` config-error test.
4. Deleted the captain-tiebreak describe block (Test 6).
5. Deleted the "throws WolfConfigError when teeOrder does not permute playerIds" test.
6. Deleted the "throws WolfConfigError when lastTwoHolesRule is missing" test.
7. Updated Test 1 Worked Example: hole-17 decision `{kind: 'partner', captain: 'A', partner: 'B'}`, hole-18 decision `{kind: 'lone', captain: 'B', blind: false}`. Assertions updated: round totals `{ A: 21, B: -19, C: 1, D: -3 }`; hole-18 LoneWolfResolved rewritten to assert `captain: 'B'`, `won: false`, `points: { A: 3, B: -9, C: 3, D: 3 }`.
8. `src/games/types.ts` — deleted `WolfCfg.teeOrder` and `WolfCfg.lastTwoHolesRule`.
9. `src/games/wolf.ts` `assertValidWolfCfg` — deleted the `teeOrder`-permutation validation block and the `lastTwoHolesRule`-validation block.
10. `src/games/wolf.ts` `settleWolfHole` line 176 — `WolfDecisionMissing.captain` now sourced from `roundCfg.players[((hole.hole - 1) % N)].id` (closes item 6).
11. `src/games/wolf.ts` `applyWolfCaptainRotation` — rewritten to a 19-line function: resolve `players = roundCfg.players.map(p => p.id)`, withdrawal-shift helper uses `players` instead of `teeOrder`, single statement `rotationCaptain = players[(hole - 1) % players.length]`. Deleted the `hole < 17` branch, the `'rotation' | 'captain-choice-by-vote'` branch, the `'lowest-money-first'` branch including the tiebreak emission, and the entire `moneyTotalsFromEvents` helper as dead code.
12. `src/games/events.ts` — one-line comment added directly above the `WolfCaptainTiebreak` variant noting it is reserved for future captain-selection rules and not emitted under generic rotation.

Verification:
- `npx tsc --noEmit --strict` → exit 0, zero errors.
- `npm run test:run` → 97 pass across 6 files.
- `grep -nE "teeOrder|lastTwoHolesRule" src/games/wolf.ts src/games/types.ts` → zero matches.
- `grep -nE "teeOrder|lastTwoHolesRule" src/games/__tests__/wolf.test.ts` → 4 matches (all stale describe names + one inline comment; parked — see below).
- Portability grep on `src/games/` → empty.
- `src/lib/payouts.ts` hash `52a389607248ffda72f4a3f21561300fe05dedac2d938b38e5cb60a27dfd215c` unchanged.
- `src/games/__tests__/types.test.ts` variant-count Set-size assertion → still 55. ✓

## Result

- Files touched:
  - `src/games/types.ts` — 2 `WolfCfg` fields deleted.
  - `src/games/wolf.ts` — 3 validation-block deletions + 1 inline captain-source change + full rewrite of `applyWolfCaptainRotation` + deletion of `moneyTotalsFromEvents` helper.
  - `src/games/events.ts` — 2-line comment on `WolfCaptainTiebreak` variant.
  - `src/games/__tests__/wolf.test.ts` — `makeWolfCfg` defaults cleaned; `makeRoundCfg` populates `players`; 4 test-scoped overrides removed; 3 tests deleted; Test 1 hole-17 + hole-18 + round-totals + hole-18-Lone assertions updated.
  - `IMPLEMENTATION_CHECKLIST.md` — 1 parking-lot entry added (see below).
- **Test count: 97.** Started 100, deleted 3 as specified in AC item 5, no additions. AC text "Total test count after #3: still 100" is arithmetically incompatible with "3 deleted Wolf tests balance against no additions." The correct count under the specified deletions is 97; flagging the AC internal contradiction for user triage rather than forcing a fabricated count.
- Worked: all 7 items landed. Parallel-path discipline held (`src/lib/payouts.ts` byte-unchanged). Rule file `docs/games/game_wolf.md` untouched per fence.
- Did not work / blocked: nothing blocking. Fence-boundary surface: 4 stale text residuals in `wolf.test.ts` (describe names + inline comment) remain; fence sentence prevented updating them; parked for a cosmetic pass.

## Open questions

- Close #3 and move to #4 (bet-id string-lookup refactor), or review completion first?
- Resolve the AC internal contradiction on test count (AC says "still 100" but also "3 deleted, 0 added"): is the correct interpretation 97 (arithmetic) or was some kind of addition expected that I missed (and thus 100 is correct)?

## Parking lot additions

- [ ] wolf.test.ts has 4 stale references to `teeOrder` in describe names + one inline comment (lines 314, 317, 337, 364) that describe logic that now uses `roundCfg.players[]`. Fence sentence prevented updates in #3; not functional defect; worth a cosmetic pass in a later cleanup — 2026-04-20 — prompt 007
