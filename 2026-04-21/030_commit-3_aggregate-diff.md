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
diff --git a/src/games/skins.ts b/src/games/skins.ts
index 77cc415..ee6c50f 100644
--- a/src/games/skins.ts
+++ b/src/games/skins.ts
@@ -100,7 +100,7 @@ function assertValidRoundCfgForSkins(roundCfg: RoundConfig): void {
 }
 
 function findBetId(cfg: SkinsCfg, roundCfg: RoundConfig): BetId {
-  const bet = roundCfg.bets.find((b) => b.type === 'skins' && b.config === cfg)
+  const bet = roundCfg.bets.find((b) => b.type === 'skins' && b.id === cfg.id)
   if (bet === undefined) throw new SkinsBetNotFoundError()
   return bet.id
 }
diff --git a/src/games/stroke_play.ts b/src/games/stroke_play.ts
index dd592ae..9adc1a1 100644
--- a/src/games/stroke_play.ts
+++ b/src/games/stroke_play.ts
@@ -133,7 +133,7 @@ function assertValidStrokePlayCfg(cfg: StrokePlayCfg): void {
 }
 
 function findBetId(cfg: StrokePlayCfg, roundCfg: RoundConfig): BetId {
-  const bet = roundCfg.bets.find((b) => b.type === 'strokePlay' && b.config === cfg)
+  const bet = roundCfg.bets.find((b) => b.type === 'strokePlay' && b.id === cfg.id)
   if (bet === undefined) throw new StrokePlayBetNotFoundError()
   return bet.id
 }
diff --git a/src/games/types.ts b/src/games/types.ts
index b99e38e..b323e55 100644
--- a/src/games/types.ts
+++ b/src/games/types.ts
@@ -31,6 +31,7 @@ export type JunkKind =
 // ─── Per-bet configurations (each matches § 4 of its rule file) ─────────────
 
 export interface SkinsCfg {
+  id: BetId
   stake: number
   escalating: boolean
   tieRuleFinalHole: 'carryover' | 'split' | 'no-points'
@@ -41,6 +42,7 @@ export interface SkinsCfg {
 }
 
 export interface WolfCfg {
+  id: BetId
   stake: number
   loneMultiplier: number
   blindLoneEnabled: boolean
@@ -53,6 +55,7 @@ export interface WolfCfg {
 }
 
 export interface NassauCfg {
+  id: BetId
   stake: number
   pressRule: 'manual' | 'auto-2-down' | 'auto-1-down'
   pressScope: 'nine' | 'match'
@@ -65,6 +68,7 @@ export interface NassauCfg {
 }
 
 export interface MatchPlayCfg {
+  id: BetId
   stake: number
   format: 'singles' | 'best-ball' | 'alternate-shot' | 'foursomes'
   appliesHandicap: boolean
@@ -78,6 +82,7 @@ export interface MatchPlayCfg {
 }
 
 export interface StrokePlayCfg {
+  id: BetId
   stake: number
   settlementMode: 'winner-takes-pot' | 'per-stroke' | 'places'
   stakePerStroke: number
diff --git a/src/games/wolf.ts b/src/games/wolf.ts
index 6f86fac..a3c8885 100644
--- a/src/games/wolf.ts
+++ b/src/games/wolf.ts
@@ -108,7 +108,7 @@ function assertValidWolfCfg(cfg: WolfCfg): void {
 }
 
 function findBetId(cfg: WolfCfg, roundCfg: RoundConfig): BetId {
-  const bet = roundCfg.bets.find((b) => b.type === 'wolf' && b.config === cfg)
+  const bet = roundCfg.bets.find((b) => b.type === 'wolf' && b.id === cfg.id)
   if (bet === undefined) throw new WolfBetNotFoundError()
   return bet.id
 }
