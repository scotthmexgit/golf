# Commit 2 — Aggregate staged diff (pre-commit review)

`git diff --cached` across all four staged files, 339 lines.

## Stat summary

```
 src/games/__tests__/wolf.test.ts | 94 +++++++++-------------------------------
 src/games/events.ts              |  2 +
 src/games/types.ts               |  2 -
 src/games/wolf.ts                | 82 +++--------------------------------
 4 files changed, 30 insertions(+), 150 deletions(-)
```

## Cross-file cohesion check (no surprises)

| File | Hunks | Role in #3 |
|---|---|---|
| `events.ts` | 1 | 2-line reservation comment on `WolfCaptainTiebreak` — event kept to preserve discriminated-union shape, no longer emitted. |
| `types.ts` | 1 | Removes `lastTwoHolesRule` and `teeOrder` from `WolfCfg`. |
| `wolf.ts` | 6 | Removes both config validators, re-sources `WolfDecisionMissing.captain` from `roundCfg.players`, rewrites `applyWolfCaptainRotation` to a straight rotation, deletes `moneyTotalsFromEvents`. |
| `wolf.test.ts` | 10 | Populates `players` from `playerIds` in `makeRoundCfg`, drops `teeOrder` overrides (3 fixtures), re-grades Worked Example hole-17/18 decisions & totals, deletes captain-tiebreak describe + 2 config-error tests, narrows 1 config-error test. |

All four files move together: the source changes (types + wolf) delete/rename; the tests remove the fixtures that fed the deleted fields and re-grade assertions that depended on the `lowest-money-first` rule. The `events.ts` comment preserves the type alias for future re-enablement. No unrelated scope included (no `+id:` adds, no `findBetId` changes, no Nassau / skins / stroke_play).

## Full diff

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
 
diff --git a/src/games/events.ts b/src/games/events.ts
index 7264a7d..9cbada1 100644
--- a/src/games/events.ts
+++ b/src/games/events.ts
@@ -95,6 +95,8 @@ type WolfCaptainReassigned = EventBase & WithBet & {
   from: PlayerId
   to: PlayerId
 }
+// Reserved for future captain-selection rules; not emitted under the generic
+// rotation introduced in Round 5 / #3 (see REBUILD_PLAN.md).
 type WolfCaptainTiebreak = EventBase & WithBet & {
   kind: 'WolfCaptainTiebreak'
   hole: number
diff --git a/src/games/types.ts b/src/games/types.ts
index 7663b51..b99e38e 100644
--- a/src/games/types.ts
+++ b/src/games/types.ts
@@ -45,10 +45,8 @@ export interface WolfCfg {
   loneMultiplier: number
   blindLoneEnabled: boolean
   blindLoneMultiplier: number
-  lastTwoHolesRule: 'rotation' | 'lowest-money-first' | 'captain-choice-by-vote'
   tieRule: 'no-points' | 'carryover'
   playerIds: PlayerId[]
-  teeOrder: PlayerId[]
   appliesHandicap: boolean
   junkItems: JunkKind[]
   junkMultiplier: number
diff --git a/src/games/wolf.ts b/src/games/wolf.ts
index cafc34b..6f86fac 100644
--- a/src/games/wolf.ts
+++ b/src/games/wolf.ts
@@ -85,10 +85,6 @@ function assertValidWolfCfg(cfg: WolfCfg): void {
   ) {
     throw new WolfConfigError('blindLoneMultiplier', 'must be an integer ≥ 3')
   }
-  const validLastTwo = ['rotation', 'lowest-money-first', 'captain-choice-by-vote'] as const
-  if (!validLastTwo.includes(cfg.lastTwoHolesRule)) {
-    throw new WolfConfigError('lastTwoHolesRule')
-  }
   const validTieRules = ['no-points', 'carryover'] as const
   if (!validTieRules.includes(cfg.tieRule)) {
     throw new WolfConfigError('tieRule')
@@ -99,13 +95,6 @@ function assertValidWolfCfg(cfg: WolfCfg): void {
   if (!Array.isArray(cfg.playerIds) || cfg.playerIds.length < 4 || cfg.playerIds.length > 5) {
     throw new WolfConfigError('playerIds', 'length must be 4 or 5')
   }
-  if (
-    !Array.isArray(cfg.teeOrder) ||
-    cfg.teeOrder.length !== cfg.playerIds.length ||
-    !cfg.teeOrder.every((p) => cfg.playerIds.includes(p))
-  ) {
-    throw new WolfConfigError('teeOrder', 'must permute playerIds')
-  }
   if (!Array.isArray(cfg.junkItems)) {
     throw new WolfConfigError('junkItems')
   }
@@ -173,7 +162,7 @@ export function settleWolfHole(
       ...base,
       actor: 'system',
       hole: hole.hole,
-      captain: config.teeOrder[(hole.hole - 1) % config.playerIds.length],
+      captain: roundCfg.players[(hole.hole - 1) % roundCfg.players.length].id,
     }]
   }
 
@@ -393,15 +382,16 @@ export function applyWolfCaptainRotation(
 ): { captain: PlayerId; events: ScoringEvent[] } {
   assertValidWolfCfg(config)
   const betId = findBetId(config, roundCfg)
+  const players = roundCfg.players.map((p) => p.id)
 
   const withdrawn = withdrawnPlayersFromEvents(eventsSoFar ?? [])
   const events: ScoringEvent[] = []
 
   function shiftForWithdrawals(initial: PlayerId): PlayerId {
     if (!withdrawn.has(initial)) return initial
-    const startIdx = config.teeOrder.indexOf(initial)
-    for (let step = 1; step < config.teeOrder.length; step += 1) {
-      const candidate = config.teeOrder[(startIdx + step) % config.teeOrder.length]
+    const startIdx = players.indexOf(initial)
+    for (let step = 1; step < players.length; step += 1) {
+      const candidate = players[(startIdx + step) % players.length]
       if (!withdrawn.has(candidate)) {
         events.push({
           kind: 'WolfCaptainReassigned',
@@ -419,52 +409,8 @@ export function applyWolfCaptainRotation(
     return initial
   }
 
-  // Holes 1–16: straight rotation per § 4.
-  if (hole < 17) {
-    const rotationCaptain = config.teeOrder[(hole - 1) % config.playerIds.length]
-    return { captain: shiftForWithdrawals(rotationCaptain), events }
-  }
-
-  // Holes 17–18: depends on lastTwoHolesRule.
-  if (config.lastTwoHolesRule === 'rotation' || config.lastTwoHolesRule === 'captain-choice-by-vote') {
-    // Vote is a UI concern; the scoring function cannot resolve it alone.
-    // Fall back to straight rotation; UI may override via a prior event.
-    const rotationCaptain = config.teeOrder[(hole - 1) % config.playerIds.length]
-    return { captain: shiftForWithdrawals(rotationCaptain), events }
-  }
-
-  // 'lowest-money-first': compute money totals within this Wolf bet only.
-  // Cross-bet totals would conflate other games' deltas into Wolf's captain
-  // rotation; the rule is a Wolf-internal running score.
-  const totals = moneyTotalsFromEvents(eventsSoFar ?? [], config, betId)
-  // Exclude withdrawn players from lowest-money ranking.
-  const eligible = config.playerIds.filter((p) => !withdrawn.has(p))
-
-  // § 9: two-player tie for lowest money → ascending playerIds[i] wins tiebreak.
-  const ranked = [...eligible].sort((a, b) => {
-    const diff = totals[a] - totals[b]
-    if (diff !== 0) return diff
-    return config.playerIds.indexOf(a) - config.playerIds.indexOf(b)
-  })
-
-  const targetIndex = hole === 17 ? 0 : 1
-  const captain = ranked[targetIndex] ?? ranked[0] ?? config.teeOrder[0]
-
-  const targetMoney = totals[captain]
-  const tied = eligible.filter((p) => totals[p] === targetMoney)
-  if (tied.length > 1) {
-    events.push({
-      kind: 'WolfCaptainTiebreak',
-      timestamp: String(hole),
-      actor: 'system',
-      declaringBet: betId,
-      hole,
-      candidates: tied,
-      chosen: captain,
-    })
-  }
-
-  return { captain, events }
+  const rotationCaptain = players[(hole - 1) % players.length]
+  return { captain: shiftForWithdrawals(rotationCaptain), events }
 }
 
 function withdrawnPlayersFromEvents(events: ScoringEvent[]): Set<PlayerId> {
@@ -474,17 +420,3 @@ function withdrawnPlayersFromEvents(events: ScoringEvent[]): Set<PlayerId> {
   }
   return out
 }
-
-function moneyTotalsFromEvents(
-  events: ScoringEvent[],
-  config: WolfCfg,
-  betId: BetId,
-): Record<PlayerId, number> {
-  const totals = zeroPoints(config.playerIds)
-  for (const e of events) {
-    if ('points' in e && 'declaringBet' in e && e.declaringBet === betId) {
-      for (const p of config.playerIds) totals[p] += e.points[p] ?? 0
-    }
-  }
-  return totals
-}
```
