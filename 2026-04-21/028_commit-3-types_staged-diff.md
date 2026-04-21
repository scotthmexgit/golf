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
