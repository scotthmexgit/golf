# Commit 3 / Staged diff 6 of 7 — `src/games/__tests__/wolf.test.ts`

Post-apply verification. `git diff --cached -- src/games/__tests__/wolf.test.ts` output:

```diff
diff --git a/src/games/__tests__/wolf.test.ts b/src/games/__tests__/wolf.test.ts
index bdafb6a..ebd0e0c 100644
--- a/src/games/__tests__/wolf.test.ts
+++ b/src/games/__tests__/wolf.test.ts
@@ -38,6 +38,7 @@ const defaultJunkCfg: JunkRoundConfig = {
 
 function makeWolfCfg(overrides: Partial<WolfCfg> = {}): WolfCfg {
   return {
+    id: 'wolf-1',
     stake: 1,
     loneMultiplier: 3,
     blindLoneEnabled: false,
@@ -687,7 +688,7 @@ describe('typed errors: throw on invalid or missing config', () => {
   })
 
   it('throws WolfBetNotFoundError when config is not referenced in roundCfg.bets', () => {
-    const stray = makeWolfCfg()
+    const stray = makeWolfCfg({ id: 'not-registered' })
     expect(() => settleWolfHole(hole, stray, round, decision)).toThrow(WolfBetNotFoundError)
   })
 })
```

`git diff -- src/games/__tests__/wolf.test.ts` → empty (worktree == index).
