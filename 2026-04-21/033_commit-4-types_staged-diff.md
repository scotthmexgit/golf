diff --git a/src/games/types.ts b/src/games/types.ts
index b323e55..d654f6e 100644
--- a/src/games/types.ts
+++ b/src/games/types.ts
@@ -61,7 +61,6 @@ export interface NassauCfg {
   pressScope: 'nine' | 'match'
   appliesHandicap: boolean
   pairingMode: 'singles' | 'allPairs'
-  matchTieRule: 'split'
   playerIds: PlayerId[]
   junkItems: JunkKind[]
   junkMultiplier: number
