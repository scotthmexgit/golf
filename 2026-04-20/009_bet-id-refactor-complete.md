---
prompt_id: 009
timestamp: 2026-04-20T22:24:18Z
checklist_item_ref: "#4 — Bet-id string-lookup refactor"
tags: [engineer, refactor, bug-fix, persistence-prep]
---

## Prompt

Approve transition. Begin #4. Re-state AC + fence verbatim. User-added execution-sequence requirement: run `tsc --noEmit --strict` + `test:run` after each *Cfg interface is updated (5 checkpoints, not just end-of-work). Log each checkpoint terse in per-prompt. Keep visible: this closes a latent bug (`b.config === cfg` reference-equality would fail on any serialization boundary). If work feels like rote find-and-replace, slow down on verification. Re-check `src/lib/payouts.ts` hash at end (must still be `52a389607248ffda...215c`). Fence: 5 interfaces, 3 helpers, 3 test files, nothing else — park any adjacent cleanups.

## Action

Re-stated #4 AC + fence verbatim before any file change. Baseline: 97 tests pass, `src/lib/payouts.ts` hash `52a389607248ffda...215c`.

Also flagged (before execution): REBUILD_PLAN.md #4 AC text "Total test count remains at 100 (modulo the #3 net-zero)" was written pre-#3; actual baseline is 97 post-#3 close. Carried 97 forward.

Executed interface-by-interface with checkpoint gates:

**Checkpoint A (SkinsCfg):**
- `types.ts` SkinsCfg: added `id: BetId` as the first field.
- `skins.test.ts` `makeSkinsCfg` default: added `id: 'skins-1'`.
- `skins.test.ts:515` simplified `makeRoundCfg(cfgGross, 'skins-2')` → `makeRoundCfg(cfgGross)` (unrelated roundCfg; default id is fine).
- `skins.test.ts:595` `strayCfg` test: changed `makeSkinsCfg()` → `makeSkinsCfg({ id: 'not-registered' })` so the string-id lookup correctly fails.
- `skins.ts:103` `findBetId`: `b.config === cfg` → `b.id === cfg.id`.
- **Result: tsc ok, tests 97 pass.** ✓

**Checkpoint B (WolfCfg):**
- `types.ts` WolfCfg: added `id: BetId`.
- `wolf.test.ts` `makeWolfCfg` default: added `id: 'wolf-1'`.
- `wolf.test.ts:691` `stray` test: changed to `makeWolfCfg({ id: 'not-registered' })`.
- `wolf.ts:111` `findBetId`: string-id equality.
- **Result: tsc ok, tests 97 pass.** ✓

**Checkpoint C (StrokePlayCfg):**
- `types.ts` StrokePlayCfg: added `id: BetId`.
- `stroke_play.test.ts` `makeSPCfg` default: added `id: 'sp-1'`.
- `stroke_play.test.ts:601` `stray` test: changed to `makeSPCfg({ id: 'not-registered' })`.
- `stroke_play.ts:136` `findBetId`: string-id equality.
- **Result: tsc ok, tests 97 pass.** ✓

**Checkpoint D (NassauCfg — type-only):**
- `types.ts` NassauCfg: added `id: BetId`. No engine or tests exist yet, so no consumer updates.
- **Result: tsc ok, tests 97 pass.** ✓

**Checkpoint E (MatchPlayCfg — type-only):**
- `types.ts` MatchPlayCfg: added `id: BetId`. Same: no engine, no tests.
- **Result: tsc ok, tests 97 pass.** ✓

**Final gate:**
- `sha256sum src/lib/payouts.ts` → `52a389607248ffda72f4a3f21561300fe05dedac2d938b38e5cb60a27dfd215c` (byte-unchanged from start of round).
- Portability grep on `src/games/` → empty.
- `grep -nE "b\.config === cfg" src/games/` → zero matches.
- `grep -nE "b\.id === cfg\.id" src/games/*.ts` → exactly 3 matches (skins.ts:103, stroke_play.ts:136, wolf.ts:111).
- Variant count in types.test.ts Set-size assertion → 55 (unchanged).

## Result

- Files touched (9 — exactly within fence: 1 types file + 3 engines + 3 test files + nothing else code-side; `IMPLEMENTATION_CHECKLIST.md` untouched, `REBUILD_PLAN.md` untouched, AUDIT.md untouched):
  - `src/games/types.ts` — 5 interfaces gained `id: BetId`.
  - `src/games/skins.ts` — `findBetId` rewritten.
  - `src/games/stroke_play.ts` — `findBetId` rewritten.
  - `src/games/wolf.ts` — `findBetId` rewritten.
  - `src/games/__tests__/skins.test.ts` — `makeSkinsCfg` default, 1 test-scoped `strayCfg` override, 1 simplified `makeRoundCfg` call.
  - `src/games/__tests__/stroke_play.test.ts` — `makeSPCfg` default, 1 test-scoped `stray` override.
  - `src/games/__tests__/wolf.test.ts` — `makeWolfCfg` default, 1 test-scoped `stray` override.
- **Test count: 97** (unchanged from start of #4 to end).
- **`src/lib/payouts.ts` hash: unchanged.** Parallel-path discipline held.
- Worked: all 5 interfaces updated with checkpoint-verified tsc + tests between each. Bet-id refactor complete; reference-identity anti-pattern eliminated from `src/games/*.ts` code. Nassau (#5), Match Play (#6), Junk (#7) will be built string-id-native.
- Did not work / blocked: none.

## Open questions

- Close #4 and transition to #5 (Nassau end-to-end), same pattern as #3→#4?

## Parking lot additions

(none — the refactor stayed tight within fence; no adjacent cleanups surfaced)
