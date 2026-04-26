---
prompt_id: SP6
timestamp: 2026-04-25T18:07:00Z
checklist_item_ref: "SP-6 — GAME_DEFS cleanup + GameList filter"
tags: [engineer, sp6, game-defs, gamelist, park]
---

## Prompt

SP-6 engineering task: add `disabled?: boolean` to GAME_DEFS entries in `src/types/index.ts`; mark four primary parked bets (skins, matchPlay, wolf, nassau) and four pre-existing out-of-scope bets (stableford, bestBall, bingoBangoBongo, vegas) as `disabled: true`; update `GameList.tsx` to filter them out of the "Add a game" picker.

## Action

1. Read `src/types/index.ts`, `src/components/setup/GameList.tsx`, `.claude/skills/session-logging/SKILL.md`, `docs/plans/STROKE_PLAY_PLAN.md` (SP-6 AC).
2. Grepped for all `GAME_DEFS` consumers in `src/` — found three: `src/types/index.ts` (definition), `src/components/setup/GameList.tsx` (render loop), `src/store/roundStore.ts` (label lookup via `.find(d => d.key === type)`, accesses only `def?.label`).
3. Edited `src/types/index.ts`: added two-line comment above GAME_DEFS, added `disabled?: boolean` to inline type, added `disabled: true` to 8 entries, left `strokePlay` with no disabled flag.
4. Edited `src/components/setup/GameList.tsx`: changed `GAME_DEFS.map(def => {` → `GAME_DEFS.filter(def => !def.disabled).map(def => {` (line 33).
5. Ran `npm run test:run` — 307/307 pass.
6. Ran `tsc --noEmit --strict` — 3 errors in `src/games/__tests__/match_play.test.ts` (cannot find name `ScoringEvent`). Confirmed pre-existing via `git stash` baseline check — identical errors before my changes.

## Result

- **Files touched:** `src/types/index.ts`, `src/components/setup/GameList.tsx`
- **Tests:** 307 → 307 (no regression)
- **tsc:** 3 pre-existing errors in `match_play.test.ts`; 0 new errors from SP-6 changes

### Diff summary

**`src/types/index.ts`** (+3 lines, 9 lines modified):
- Added 2-line comment block above GAME_DEFS explaining `disabled?` flag purpose
- Added `disabled?: boolean` to the inline type signature
- Added `disabled: true` to: matchPlay, stableford, skins, nassau, bestBall, bingoBangoBongo, wolf, vegas
- strokePlay: no disabled flag

**`src/components/setup/GameList.tsx`** (1 line modified):
- Line 33: `GAME_DEFS.map(def => {` → `GAME_DEFS.filter(def => !def.disabled).map(def => {`

### GAME_DEFS consumer grep

| File | Usage | Effect of `disabled` |
|---|---|---|
| `src/types/index.ts` | definition | N/A |
| `src/components/setup/GameList.tsx` | render loop (now filtered) | Hides disabled entries from picker |
| `src/store/roundStore.ts:45` | `.find(d => d.key === type)` for label | None — `.find` still resolves disabled entries by key; only `def?.label` is accessed |

`roundStore.ts` usage is unaffected: it looks up a label by exact key for already-selected games. A game instance created with a disabled key (e.g., from a saved round) will still resolve its label correctly.

### Disabled-flag verification

| Entry | `disabled` value |
|---|---|
| strokePlay | (absent — visible) |
| matchPlay | `true` |
| stableford | `true` |
| skins | `true` |
| nassau | `true` |
| bestBall | `true` |
| bingoBangoBongo | `true` |
| wolf | `true` |
| vegas | `true` |

## Noticed but out of scope

- Pre-existing tsc error in `src/games/__tests__/match_play.test.ts` (lines 1177, 1185, 1191): `ScoringEvent` referenced without import. Not introduced by SP-6; not in scope.

## Open questions

None. SP-6 closes. No operator decisions required.
