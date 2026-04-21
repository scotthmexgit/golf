# Commit 3 / Patch 4 of 7 — `src/games/__tests__/skins.test.ts`

Scope: #4 bet-id string-lookup refactor. Includes the two `+id` hunks held back from commit 2's filtered wolf/skins test patches, plus the refactor-consequence arg-drop at the sole non-default `makeRoundCfg` call site.

## Source

- Full working-tree diff for this path: `/tmp/skins-test-file4.patch` (32 lines, 3 hunks)

## Dry-run

`git apply --cached --check /tmp/skins-test-file4.patch` → clean

## Hunk inventory

1. `@@ -36,6 +36,7 @@` — `+id: 'skins-1'` in `makeSkinsCfg` default return (matches predicted hunk #1; structural twin of the `makeWolfCfg` default-id hunk held for this commit).
2. `@@ -511,7 +512,7 @@` — drop second arg `'skins-2'` from the sole non-default `makeRoundCfg` caller at line 515 (matches predicted hunk #3; pure refactor-consequence). Single-line change; no signature rewrite; no other call sites touched.
3. `@@ -592,8 +593,8 @@` — `+id: 'not-registered'` override on `strayCfg` in the `SkinsBetNotFoundError` test (matches predicted hunk #2; parallel to the wolf.test.ts BetNotFoundError hunk held for this commit). Co-located one-line comment rewording from "roundCfg points to a DIFFERENT SkinsCfg reference" → "its id does not match any BetSelection.id in roundCfg.bets" is inside the same diff window (not predicted, disclosed for transparency, not structural).

## Scope-match verification

- Helper signature (line 51): `function makeRoundCfg(skinsCfg: SkinsCfg, betId = 'skins-1'): RoundConfig` — unchanged by this patch.
- Call-site enumeration: 18 `makeRoundCfg` call sites in the file; only line 515 carried a non-default second arg pre-patch; only line 515 changes.
- Parked observation: with line 515 dropping the arg, every remaining caller relies on the default — `betId` parameter is now dead code. Parked to `IMPLEMENTATION_CHECKLIST.md` Parking Lot (prompt 021). **Not bundled into commit 3**; separate cosmetic cleanup.

## Patch body

```diff
diff --git a/src/games/__tests__/skins.test.ts b/src/games/__tests__/skins.test.ts
index 972883a..ab522ed 100644
--- a/src/games/__tests__/skins.test.ts
+++ b/src/games/__tests__/skins.test.ts
@@ -36,6 +36,7 @@ const defaultJunkCfg: JunkRoundConfig = {
 
 function makeSkinsCfg(overrides: Partial<SkinsCfg> = {}): SkinsCfg {
   return {
+    id: 'skins-1',
     stake: 1,
     escalating: true,
     tieRuleFinalHole: 'split',
@@ -511,7 +512,7 @@ describe('net-score handicap changes skin winner vs gross-score winner', () => {
       appliesHandicap: false,
       playerIds: ['A', 'B'],
     })
-    const roundGross = makeRoundCfg(cfgGross, 'skins-2')
+    const roundGross = makeRoundCfg(cfgGross)
     const grossEvents = settleSkinsHole(hole, cfgGross, roundGross)
     expect(grossEvents.some((e) => e.kind === 'SkinCarried')).toBe(true)
   })
@@ -592,8 +593,8 @@ describe('typed errors: throw on invalid or missing config', () => {
   })
 
   it('throws SkinsBetNotFoundError when config is not referenced in roundCfg.bets', () => {
-    const strayCfg = makeSkinsCfg()
-    // Valid cfg, but roundCfg points to a DIFFERENT SkinsCfg reference.
+    const strayCfg = makeSkinsCfg({ id: 'not-registered' })
+    // Valid cfg, but its id does not match any BetSelection.id in roundCfg.bets.
     expect(() => settleSkinsHole(hole, strayCfg, round)).toThrow(SkinsBetNotFoundError)
   })
 
```

## Expected post-apply state (skins.test.ts only)

- `git diff --cached -- src/games/__tests__/skins.test.ts` shows all three hunks.
- `git diff -- src/games/__tests__/skins.test.ts` empty (worktree == index for this path).
- `git status --short` for this path: `M  src/games/__tests__/skins.test.ts` (index-only).
