# Commit 3 / Staged diff 5 of 7 — `src/games/__tests__/stroke_play.test.ts`

Post-apply verification. `git diff --cached -- src/games/__tests__/stroke_play.test.ts` output:

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

`git diff -- src/games/__tests__/stroke_play.test.ts` → empty (worktree == index).
