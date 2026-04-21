# Commit 3 / Patch 5 of 7 — `src/games/__tests__/stroke_play.test.ts`

Scope: #4 bet-id string-lookup refactor. Two hunks held back from commit 2's filtered stroke_play test patches.

## Source

- Full working-tree diff for this path: `/tmp/sp-test-file5.patch` (21 lines, 2 hunks)

## Dry-run

`git apply --cached --check /tmp/sp-test-file5.patch` → clean

## Hunk inventory

1. `@@ -37,6 +37,7 @@` — `+id: 'sp-1'` in `makeSPCfg` default return (structural twin of the `makeSkinsCfg` and `makeWolfCfg` id hunks; adds `id` field so `findBetId`'s `b.id === cfg.id` lookup matches the default round fixture).
2. `@@ -597,7 +598,7 @@` — `+id: 'not-registered'` override on `stray` in the `StrokePlayBetNotFoundError` test. With id-based lookup the old `makeSPCfg()` would produce `id: 'sp-1'` which matches the round's bet — the test would no longer throw. The override ensures `stray.id` is absent from `roundCfg.bets`.

## Scope-match verification

- No comment rewording in either hunk.
- No `makeRoundCfg` second-arg collapses: no non-default second-arg call sites exist in this file.
- Helper signature (line 55): `function makeRoundCfg(cfg: StrokePlayCfg, betId = 'sp-1'): RoundConfig` — unchanged; `betId` parameter is now dead code (every call site uses default). Parked, not bundled.

## Patch body

```diff
diff --git a/src/games/__tests__/stroke_play.test.ts b/src/games/__tests__/stroke_play.test.ts
index 66d30b4..98fe42d 100644
--- a/src/games/__tests__/stroke_play.test.ts
+++ b/src/games/__tests__/stroke_play.test.ts
@@ -37,6 +37,7 @@ const defaultJunkCfg: JunkRoundConfig = {
 
 function makeSPCfg(overrides: Partial<StrokePlayCfg> = {}): StrokePlayCfg {
   return {
+    id: 'sp-1',
     stake: 10,
     settlementMode: 'winner-takes-pot',
     stakePerStroke: 1,
@@ -597,7 +598,7 @@ describe('typed errors: throw on invalid or missing config', () => {
   })
 
   it('throws StrokePlayBetNotFoundError when config is not referenced in roundCfg.bets', () => {
-    const stray = makeSPCfg()
+    const stray = makeSPCfg({ id: 'not-registered' })
     expect(() => settleStrokePlayHole(hole, stray, round)).toThrow(StrokePlayBetNotFoundError)
   })
 })
```

## Expected post-apply state (stroke_play.test.ts only)

- `git diff --cached -- src/games/__tests__/stroke_play.test.ts` shows both hunks.
- `git diff -- src/games/__tests__/stroke_play.test.ts` empty (worktree == index for this path).
- `git status --short` for this path: `M  src/games/__tests__/stroke_play.test.ts` (index-only).
