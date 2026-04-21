# Commit 2 / Patch 4 of 4 — `wolf.test.ts` staged diff (post-apply)

Captured via `git diff --cached -- src/games/__tests__/wolf.test.ts` after `git apply --cached /tmp/commit-2-wolf-test.patch` succeeded.

180 lines. 10 hunks staged (hunk 11 rejected; hunk 1 hand-filtered to drop `+id:` add).

```diff
diff --git a/src/games/__tests__/wolf.test.ts b/src/games/__tests__/wolf.test.ts
index f46698b..bdafb6a 100644
--- a/src/games/__tests__/wolf.test.ts
+++ b/src/games/__tests__/wolf.test.ts
@@ -42,10 +42,8 @@ function makeWolfCfg(overrides: Partial<WolfCfg> = {}): WolfCfg {
     loneMultiplier: 3,
     blindLoneEnabled: false,
     blindLoneMultiplier: 4,
-    lastTwoHolesRule: 'lowest-money-first',
     tieRule: 'no-points',
     playerIds: ['A', 'B', 'C', 'D'],
-    teeOrder: ['A', 'B', 'C', 'D'],
     appliesHandicap: false,
     junkItems: [],
     junkMultiplier: 1,
@@ -63,10 +61,21 @@ function makeRoundCfg(cfg: WolfCfg, betId = 'wolf-1'): RoundConfig {
     junkItems: cfg.junkItems,
     junkMultiplier: cfg.junkMultiplier,
   }
+  const players: PlayerSetup[] = cfg.playerIds.map((id) => ({
+    id,
+    name: id,
+    hcpIndex: 0,
+    tee: 'white',
+    isCourseHcp: true,
+    courseHcp: 0,
+    betting: true,
+    isSelf: false,
+    roundHandicap: 0,
+  }))
   return {
     roundId: 'r1',
     courseName: 'Test Course',
-    players: [],
+    players,
     bets: [bet],
     junk: defaultJunkCfg,
     longestDriveHoles: [],
@@ -166,8 +175,8 @@ describe('game_wolf.md § 10 Worked Example verbatim', () => {
     { hole: 14, gross: { A: 4, B: 4, C: 5, D: 5 }, decision: { kind: 'partner', captain: 'B', partner: 'A' } },
     { hole: 15, gross: { A: 4, B: 4, C: 3, D: 3 }, decision: { kind: 'partner', captain: 'C', partner: 'D' } },
     { hole: 16, gross: { A: 5, B: 5, C: 4, D: 4 }, decision: { kind: 'partner', captain: 'D', partner: 'C' } },
-    { hole: 17, gross: { A: 5, B: 5, C: 6, D: 6 }, decision: { kind: 'partner', captain: 'B', partner: 'A' } },
-    { hole: 18, gross: { A: 4, B: 4, C: 4, D: 3 }, decision: { kind: 'lone',    captain: 'D', blind: false } },
+    { hole: 17, gross: { A: 5, B: 5, C: 6, D: 6 }, decision: { kind: 'partner', captain: 'A', partner: 'B' } },
+    { hole: 18, gross: { A: 4, B: 4, C: 4, D: 3 }, decision: { kind: 'lone',    captain: 'B', blind: false } },
   ]
 
   const events: ScoringEvent[] = []
@@ -178,9 +187,9 @@ describe('game_wolf.md § 10 Worked Example verbatim', () => {
   }
   const finalEvents = finalizeWolfRound(events, cfg)
 
-  it('round totals = { A: +15, B: -13, C: -5, D: +3 } (§ 10 bottom line)', () => {
+  it('round totals = { A: +21, B: -19, C: +1, D: -3 } (§ 10 bottom line)', () => {
     const totals = sumPoints(finalEvents, ['A', 'B', 'C', 'D'])
-    expect(totals).toEqual({ A: 15, B: -13, C: -5, D: 3 })
+    expect(totals).toEqual({ A: 21, B: -19, C: 1, D: -3 })
   })
 
   it('settles zero-sum and every point is integer-typed', () => {
@@ -211,16 +220,16 @@ describe('game_wolf.md § 10 Worked Example verbatim', () => {
     expect(h10.points).toEqual({ A: 3, B: -9, C: 3, D: 3 })
   })
 
-  it('emits one LoneWolfResolved on hole 18 (captain D wins; D +9, others −3)', () => {
+  it('emits one LoneWolfResolved on hole 18 (captain B loses; A/C/D +3, B −9)', () => {
     const h18 = finalEvents.find(
       (e): e is ScoringEvent & { kind: 'LoneWolfResolved' } =>
         e.kind === 'LoneWolfResolved' && e.hole === 18,
     )
     expect(h18).toBeDefined()
     if (!h18) return
-    expect(h18.captain).toBe('D')
-    expect(h18.won).toBe(true)
-    expect(h18.points).toEqual({ A: -3, B: -3, C: -3, D: 9 })
+    expect(h18.captain).toBe('B')
+    expect(h18.won).toBe(false)
+    expect(h18.points).toEqual({ A: 3, B: -9, C: 3, D: 3 })
   })
 })
 
@@ -257,7 +266,6 @@ describe('5-player Lone Wolf — 1 vs 4, ×3 multiplier', () => {
   it('deltas = { A: +12, B: -3, C: -3, D: -3, E: -3 }', () => {
     const cfg = makeWolfCfg({
       playerIds: ['A', 'B', 'C', 'D', 'E'],
-      teeOrder: ['A', 'B', 'C', 'D', 'E'],
     })
     const round = makeRoundCfg(cfg)
     const events = settleWolfHole(
@@ -283,7 +291,6 @@ describe("tied Lone Wolf hole, tieRule='no-points'", () => {
   it('every delta = 0; one WolfHoleTied event', () => {
     const cfg = makeWolfCfg({
       playerIds: ['A', 'B', 'C', 'D', 'E'],
-      teeOrder: ['A', 'B', 'C', 'D', 'E'],
       tieRule: 'no-points',
     })
     const round = makeRoundCfg(cfg)
@@ -325,48 +332,6 @@ describe('missing decision emits WolfDecisionMissing with zero delta', () => {
   })
 })
 
-// ─── Test 6 — Captain tiebreak on hole 17 (§ 12 Test 6) ────────────────────
-
-describe("captain tiebreak on hole 17 under 'lowest-money-first'", () => {
-  it('B and D tied at -4; ascending playerIds chooses B; emits WolfCaptainTiebreak', () => {
-    const cfg = makeWolfCfg({ lastTwoHolesRule: 'lowest-money-first' })
-    const round = makeRoundCfg(cfg)
-
-    // Construct prior events that leave B and D tied at -4 after hole 16.
-    const priorEvents: ScoringEvent[] = [{
-      kind: 'WolfHoleResolved',
-      timestamp: 'ts-1',
-      declaringBet: 'wolf-1',
-      actor: 'A',
-      hole: 1,
-      winners: ['A', 'C'],
-      losers: ['B', 'D'],
-      points: { A: 2, B: -2, C: 2, D: -2 },
-    }, {
-      kind: 'WolfHoleResolved',
-      timestamp: 'ts-2',
-      declaringBet: 'wolf-1',
-      actor: 'A',
-      hole: 2,
-      winners: ['A', 'C'],
-      losers: ['B', 'D'],
-      points: { A: 2, B: -2, C: 2, D: -2 },
-    }]
-
-    const { captain, events } = applyWolfCaptainRotation(17, cfg, round, priorEvents)
-    expect(captain).toBe('B')
-    expect(events.filter((e) => e.kind === 'WolfCaptainTiebreak')).toHaveLength(1)
-    const tb = events.find(
-      (e): e is ScoringEvent & { kind: 'WolfCaptainTiebreak' } =>
-        e.kind === 'WolfCaptainTiebreak',
-    )
-    if (tb) {
-      expect(tb.candidates.sort()).toEqual(['B', 'D'])
-      expect(tb.chosen).toBe('B')
-    }
-  })
-})
-
 // ─── Test 7 — Captain rotation for holes 1–16 ─────────────────────────────
 
 describe('captain rotation holes 1–16 follows teeOrder modulo playerIds.length', () => {
@@ -384,7 +349,6 @@ describe('captain rotation holes 1–16 follows teeOrder modulo playerIds.length
   it('cycles A,B,C,D,E for 5-player round', () => {
     const cfg = makeWolfCfg({
       playerIds: ['A', 'B', 'C', 'D', 'E'],
-      teeOrder: ['A', 'B', 'C', 'D', 'E'],
     })
     const round = makeRoundCfg(cfg)
     const cycle = ['A', 'B', 'C', 'D', 'E']
@@ -710,23 +674,7 @@ describe('typed errors: throw on invalid or missing config', () => {
   })
 
   it('throws WolfConfigError on playerIds outside 4..5', () => {
-    const bad = { ...makeWolfCfg(), playerIds: ['A', 'B', 'C'], teeOrder: ['A', 'B', 'C'] } as WolfCfg
-    expect(() => settleWolfHole(hole, bad, round, decision)).toThrow(WolfConfigError)
-  })
-
-  it('throws WolfConfigError when teeOrder does not permute playerIds', () => {
-    const bad = {
-      ...makeWolfCfg(),
-      teeOrder: ['X', 'Y', 'Z', 'W'] as PlayerId[],
-    } as WolfCfg
-    expect(() => settleWolfHole(hole, bad, round, decision)).toThrow(WolfConfigError)
-  })
-
-  it('throws WolfConfigError when lastTwoHolesRule is missing', () => {
-    const bad = {
-      ...makeWolfCfg(),
-      lastTwoHolesRule: undefined as unknown as WolfCfg['lastTwoHolesRule'],
-    }
+    const bad = { ...makeWolfCfg(), playerIds: ['A', 'B', 'C'] } as WolfCfg
     expect(() => settleWolfHole(hole, bad, round, decision)).toThrow(WolfConfigError)
   })
 
```
