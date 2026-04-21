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
 
