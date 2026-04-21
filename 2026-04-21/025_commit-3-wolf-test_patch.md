# Commit 3 / Patch 6 of 7 — `src/games/__tests__/wolf.test.ts`

Scope: #4 bet-id string-lookup refactor. Two hunks held back from commit 2's filtered wolf test patches.

## Source

- Full working-tree diff for this path: `/tmp/wolf-test-file6.patch` (21 lines, 2 hunks)

## Dry-run

`git apply --cached --check /tmp/wolf-test-file6.patch` → clean

## Hunk inventory

1. `@@ -38,6 +38,7 @@` — `+id: 'wolf-1'` in `makeWolfCfg` default return (structural twin of the `makeSkinsCfg` and `makeSPCfg` id hunks; adds `id` field so `findBetId`'s `b.id === cfg.id` lookup matches the default round fixture).
2. `@@ -687,7 +688,7 @@` — `+id: 'not-registered'` override on `stray` in the `WolfBetNotFoundError` test. With id-based lookup the old `makeWolfCfg()` would produce `id: 'wolf-1'` which matches the round's bet — the test would no longer throw. The override ensures `stray.id` is absent from `roundCfg.bets`.

## Scope-match verification

- No comment rewording in either hunk.
- No `makeRoundCfg` second-arg collapses: no non-default second-arg call sites exist in this file.
- Helper signature (line 55): `function makeRoundCfg(cfg: WolfCfg, betId = 'wolf-1'): RoundConfig` — unchanged; `betId` parameter is now dead code (every call site uses default). Parked, not bundled.

## Patch body

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

## Expected post-apply state (wolf.test.ts only)

- `git diff --cached -- src/games/__tests__/wolf.test.ts` shows both hunks.
- `git diff -- src/games/__tests__/wolf.test.ts` empty (worktree == index for this path).
- `git status --short` for this path: `M  src/games/__tests__/wolf.test.ts` (index-only).
