diff --git a/src/games/__tests__/nassau.test.ts b/src/games/__tests__/nassau.test.ts
new file mode 100644
index 0000000..00423b6
--- /dev/null
+++ b/src/games/__tests__/nassau.test.ts
@@ -0,0 +1,467 @@
+import { describe, it, expect } from 'vitest'
+import {
+  settleNassauHole,
+  initialMatches,
+  offerPress,
+  openPress,
+  NassauConfigError,
+  NassauBetNotFoundError,
+  type MatchState,
+  type PressConfirmation,
+} from '../nassau'
+import type {
+  BetSelection,
+  HoleState,
+  JunkRoundConfig,
+  NassauCfg,
+  PlayerId,
+  PlayerSetup,
+  RoundConfig,
+  ScoringEvent,
+} from '../types'
+
+// ─── Fixtures ───────────────────────────────────────────────────────────────
+
+const defaultJunkCfg: JunkRoundConfig = {
+  girEnabled: true,
+  longestDriveHoles: [],
+  ctpEnabled: true,
+  longestDriveEnabled: true,
+  greenieEnabled: true,
+  sandyEnabled: true,
+  barkieEnabled: true,
+  polieEnabled: true,
+  arnieEnabled: true,
+  polieMode: 'automatic',
+  barkieStrict: true,
+  superSandyEnabled: false,
+}
+
+function makeNassauCfg(overrides: Partial<NassauCfg> = {}): NassauCfg {
+  return {
+    id: 'nassau-1',
+    stake: 1,
+    pressRule: 'manual',
+    pressScope: 'nine',
+    appliesHandicap: false,
+    pairingMode: 'singles',
+    playerIds: ['A', 'B'],
+    junkItems: [],
+    junkMultiplier: 1,
+    ...overrides,
+  }
+}
+
+function makeRoundCfg(cfg: NassauCfg): RoundConfig {
+  const bet: BetSelection = {
+    id: cfg.id,
+    type: 'nassau',
+    stake: cfg.stake,
+    participants: cfg.playerIds,
+    config: cfg,
+    junkItems: cfg.junkItems,
+    junkMultiplier: cfg.junkMultiplier,
+  }
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
+  return {
+    roundId: 'r1',
+    courseName: 'Test Course',
+    players,
+    bets: [bet],
+    junk: defaultJunkCfg,
+    longestDriveHoles: [],
+    locked: true,
+    unitSize: 100,
+  }
+}
+
+function makeHole(
+  holeNum: number,
+  holeIndex: number,
+  gross: Record<PlayerId, number>,
+  opts: { par?: number; strokes?: Record<PlayerId, number> } = {},
+): HoleState {
+  const playerIds = Object.keys(gross)
+  const zeroBool: Record<PlayerId, boolean> = {}
+  for (const p of playerIds) zeroBool[p] = false
+  const zeroStrokes: Record<PlayerId, number> = {}
+  for (const p of playerIds) zeroStrokes[p] = 0
+  return {
+    hole: holeNum,
+    par: opts.par ?? 4,
+    holeIndex,
+    timestamp: `ts-${holeNum}`,
+    gross,
+    strokes: opts.strokes ?? zeroStrokes,
+    status: 'Confirmed',
+    ctpWinner: null,
+    longestDriveWinner: null,
+    bunkerVisited: { ...zeroBool },
+    treeSolidHit: { ...zeroBool },
+    treeAnyHit: { ...zeroBool },
+    longPutt: { ...zeroBool },
+    polieInvoked: { ...zeroBool },
+    fairwayHit: { ...zeroBool },
+    gir: { ...zeroBool },
+    pickedUp: [],
+    conceded: [],
+    withdrew: [],
+  }
+}
+
+// Run a sequence of holes through settleNassauHole, threading matches.
+function runHoles(
+  rows: Array<{
+    hole: number
+    idx: number
+    gross: Record<PlayerId, number>
+    strokes?: Record<PlayerId, number>
+  }>,
+  cfg: NassauCfg,
+  round: RoundConfig,
+): { events: ScoringEvent[]; matches: MatchState[] } {
+  let matches = initialMatches(cfg)
+  const events: ScoringEvent[] = []
+  for (const row of rows) {
+    const hole = makeHole(row.hole, row.idx, row.gross, { strokes: row.strokes })
+    const out = settleNassauHole(hole, cfg, round, matches)
+    events.push(...out.events)
+    matches = out.matches
+  }
+  return { events, matches }
+}
+
+// ─── Test 1 — game_nassau.md § 10 Worked Example, front 9 ──────────────────
+//
+// A (scratch, hcp 0) vs B (hcp 5). Pair-wise USGA: diff = 5, B receives one
+// stroke on holes with hole-index ≤ 5 (idx 1, 3, 5 in this example's table
+// cover holes 4, 2, 7 respectively). Front-9 result per rule-file table:
+// A wins holes 3, 5, 6, 8; B wins holes 1, 4, 7; holes 2 and 9 tie.
+// Final front state: A 4, B 3.
+
+describe('game_nassau.md § 10 Worked Example — front 9 (singles, pair-wise handicap)', () => {
+  const cfg = makeNassauCfg({ appliesHandicap: true })
+  const round = makeRoundCfg(cfg)
+  const strokes = { A: 0, B: 5 }
+
+  const front9 = [
+    { hole: 1, idx: 7,  gross: { A: 5, B: 4 } },
+    { hole: 2, idx: 3,  gross: { A: 3, B: 4 } },
+    { hole: 3, idx: 15, gross: { A: 3, B: 4 } },
+    { hole: 4, idx: 1,  gross: { A: 5, B: 5 } },
+    { hole: 5, idx: 11, gross: { A: 4, B: 5 } },
+    { hole: 6, idx: 17, gross: { A: 3, B: 4 } },
+    { hole: 7, idx: 5,  gross: { A: 5, B: 4 } },
+    { hole: 8, idx: 9,  gross: { A: 5, B: 6 } },
+    { hole: 9, idx: 13, gross: { A: 5, B: 5 } },
+  ].map((r) => ({ ...r, strokes }))
+
+  const result = runHoles(front9, cfg, round)
+
+  it('emits one NassauHoleResolved per active match per hole (front + overall, 18 events for 9 holes)', () => {
+    const resolvedEvents = result.events.filter((e) => e.kind === 'NassauHoleResolved')
+    expect(resolvedEvents).toHaveLength(18) // front + overall are active on holes 1-9
+    const frontEvents = resolvedEvents.filter(
+      (e): e is ScoringEvent & { kind: 'NassauHoleResolved' } =>
+        e.kind === 'NassauHoleResolved' && e.matchId === 'front',
+    )
+    const overallEvents = resolvedEvents.filter(
+      (e): e is ScoringEvent & { kind: 'NassauHoleResolved' } =>
+        e.kind === 'NassauHoleResolved' && e.matchId === 'overall',
+    )
+    expect(frontEvents).toHaveLength(9)
+    expect(overallEvents).toHaveLength(9)
+    // No back events during front-9 since back.startHole = 10.
+    const backEvents = resolvedEvents.filter(
+      (e): e is ScoringEvent & { kind: 'NassauHoleResolved' } =>
+        e.kind === 'NassauHoleResolved' && e.matchId === 'back',
+    )
+    expect(backEvents).toHaveLength(0)
+  })
+
+  it('produces the expected winner sequence per § 10 table', () => {
+    const frontEvents = result.events.filter(
+      (e): e is ScoringEvent & { kind: 'NassauHoleResolved' } =>
+        e.kind === 'NassauHoleResolved' && e.matchId === 'front',
+    )
+    const winners = frontEvents.map((e) => e.winner)
+    // Per § 10: B, tie, A, B, A, A, B, A, tie
+    expect(winners).toEqual(['B', 'tie', 'A', 'B', 'A', 'A', 'B', 'A', 'tie'])
+  })
+
+  it('front match state ends at { holesWonA: 4, holesWonB: 3 }', () => {
+    const front = result.matches.find((m) => m.id === 'front')
+    expect(front).toBeDefined()
+    expect(front?.holesWonA).toBe(4)
+    expect(front?.holesWonB).toBe(3)
+  })
+
+  it('overall match state mirrors front through hole 9 { holesWonA: 4, holesWonB: 3 }', () => {
+    const overall = result.matches.find((m) => m.id === 'overall')
+    expect(overall?.holesWonA).toBe(4)
+    expect(overall?.holesWonB).toBe(3)
+  })
+
+  it('back match state remains untouched at { 0, 0 } during the front 9', () => {
+    const back = result.matches.find((m) => m.id === 'back')
+    expect(back?.holesWonA).toBe(0)
+    expect(back?.holesWonB).toBe(0)
+  })
+})
+
+// ─── Test 2 — Pair-wise allocation distinguishes from per-player ────────────
+//
+// With A hcp 8 and B hcp 10 on a hole of index 9:
+//   Pair-wise (correct per § 2): diff = 2; strokesOnHole(2, 9) = 0 (2 < 9).
+//     Neither player gets a stroke. Pure gross comparison applies.
+//   Per-player (the incorrect § 5 pseudocode reading): A strokes(8, 9) = 0,
+//     B strokes(10, 9) = 1. B's net drops by 1.
+// Engineered gross A=5, B=5 produces:
+//   Pair-wise → tie. Per-player → B wins.
+// This test enforces the pair-wise interpretation.
+
+describe('pair-wise USGA allocation (distinguishes from per-player)', () => {
+  const cfg = makeNassauCfg({ appliesHandicap: true })
+  const round = makeRoundCfg(cfg)
+
+  it('A hcp 8, B hcp 10, idx 9, gross 5/5 → pair-wise tie (would be B win under per-player)', () => {
+    const hole = makeHole(1, 9, { A: 5, B: 5 }, { strokes: { A: 8, B: 10 } })
+    const out = settleNassauHole(hole, cfg, round, initialMatches(cfg))
+    const overall = out.events.find(
+      (e): e is ScoringEvent & { kind: 'NassauHoleResolved' } =>
+        e.kind === 'NassauHoleResolved' && e.matchId === 'overall',
+    )
+    expect(overall?.winner).toBe('tie')
+  })
+
+  it('tied hole does not increment either holesWon counter', () => {
+    const hole = makeHole(1, 9, { A: 5, B: 5 }, { strokes: { A: 8, B: 10 } })
+    const out = settleNassauHole(hole, cfg, round, initialMatches(cfg))
+    const overall = out.matches.find((m) => m.id === 'overall')
+    expect(overall?.holesWonA).toBe(0)
+    expect(overall?.holesWonB).toBe(0)
+  })
+})
+
+// ─── Test 3 — Typed errors ─────────────────────────────────────────────────
+
+describe('typed errors: invalid or missing config', () => {
+  const hole = makeHole(1, 1, { A: 4, B: 4 })
+
+  it("throws NassauConfigError when pairingMode='singles' with wrong player count", () => {
+    const bad = makeNassauCfg({ playerIds: ['A', 'B', 'C'] as PlayerId[] })
+    expect(() => settleNassauHole(hole, bad, makeRoundCfg(bad), initialMatches(bad))).toThrow(
+      NassauConfigError,
+    )
+  })
+
+  it('throws NassauBetNotFoundError when config id does not match any BetSelection.id', () => {
+    const cfg = makeNassauCfg()
+    const round = makeRoundCfg(cfg)
+    const stray = makeNassauCfg({ id: 'not-registered' })
+    expect(() => settleNassauHole(hole, stray, round, initialMatches(stray))).toThrow(
+      NassauBetNotFoundError,
+    )
+  })
+
+  it("throws NassauConfigError when pairingMode='allPairs' (Phase 1 supports singles only)", () => {
+    const cfg = makeNassauCfg({ pairingMode: 'allPairs', playerIds: ['A', 'B', 'C'] as PlayerId[] })
+    const round = makeRoundCfg(cfg)
+    expect(() => settleNassauHole(hole, cfg, round, initialMatches(cfg))).toThrow(
+      NassauConfigError,
+    )
+  })
+})
+
+// ─── Phase 2 — offerPress threshold semantics ──────────────────────────────
+//
+// Distinguishing-input tests per prompt 015 guidance: pick inputs where
+// auto-2-down rejects but manual accepts (or vice versa). downBy=2 is the
+// single point where all three press rules agree, so it's NOT a
+// distinguishing test on its own.
+
+describe('offerPress threshold semantics (auto-2-down / auto-1-down / manual)', () => {
+  function matchAt(holesWonA: number, holesWonB: number): MatchState {
+    return { id: 'front', startHole: 1, endHole: 9, holesWonA, holesWonB, parentId: null }
+  }
+
+  it("distinguishes auto-2-down and manual at downBy=1: auto rejects, manual accepts", () => {
+    const m = matchAt(3, 2) // A up 1, B is the down player
+    const autoCfg = makeNassauCfg({ pressRule: 'auto-2-down' })
+    const manualCfg = makeNassauCfg({ pressRule: 'manual' })
+    const autoEvents = offerPress(5, m, autoCfg, 'B')
+    const manualEvents = offerPress(5, m, manualCfg, 'B')
+    expect(autoEvents).toHaveLength(0)
+    expect(manualEvents).toHaveLength(1)
+    expect(manualEvents[0].kind).toBe('PressOffered')
+    if (manualEvents[0].kind === 'PressOffered') {
+      expect(manualEvents[0].downPlayer).toBe('B')
+      expect(manualEvents[0].parentMatchId).toBe('front')
+    }
+  })
+
+  it("distinguishes auto-1-down and manual at downBy=2: auto rejects, manual accepts", () => {
+    const m = matchAt(4, 2) // A up 2, B is down
+    const autoCfg = makeNassauCfg({ pressRule: 'auto-1-down' })
+    const manualCfg = makeNassauCfg({ pressRule: 'manual' })
+    expect(offerPress(6, m, autoCfg, 'B')).toHaveLength(0)
+    expect(offerPress(6, m, manualCfg, 'B')).toHaveLength(1)
+  })
+
+  it("auto-2-down emits PressOffered exactly at downBy=2", () => {
+    const m = matchAt(4, 2)
+    const cfg = makeNassauCfg({ pressRule: 'auto-2-down' })
+    const events = offerPress(6, m, cfg, 'B')
+    expect(events).toHaveLength(1)
+    expect(events[0].kind).toBe('PressOffered')
+  })
+
+  it("all pressRules return [] when downBy=0 (no down player exists)", () => {
+    const m = matchAt(3, 3)
+    expect(offerPress(6, m, makeNassauCfg({ pressRule: 'auto-2-down' }), 'A')).toHaveLength(0)
+    expect(offerPress(6, m, makeNassauCfg({ pressRule: 'auto-1-down' }), 'A')).toHaveLength(0)
+    expect(offerPress(6, m, makeNassauCfg({ pressRule: 'manual' }), 'A')).toHaveLength(0)
+  })
+
+  it("returns [] when hole is outside the parent match window", () => {
+    const frontMatch = matchAt(3, 1)
+    // Hole 10 is outside front-9 match (endHole 9).
+    expect(offerPress(10, frontMatch, makeNassauCfg({ pressRule: 'manual' }), 'B')).toHaveLength(0)
+  })
+})
+
+// ─── Phase 2 — openPress scope-window + last-hole voiding ──────────────────
+
+describe("openPress scope-window enforcement ('nine' vs 'match')", () => {
+  it("distinguishes 'nine' and 'match' on overall-match press at hole 5 (endHole 9 vs 18)", () => {
+    // Overall match spans 1-18. At hole 5 (front-9 territory), 'nine' runs the
+    // press to hole 9; 'match' runs it to hole 18. This is the canonical
+    // scope-distinguishing case.
+    const cfgNine = makeNassauCfg({ pressScope: 'nine' })
+    const cfgMatch = makeNassauCfg({ pressScope: 'match' })
+    const roundNine = makeRoundCfg(cfgNine)
+    const roundMatch = makeRoundCfg(cfgMatch)
+    const baseMatches = initialMatches(cfgNine)
+
+    const confirmation: PressConfirmation = {
+      hole: 5, parentMatchId: 'overall', openingPlayer: 'B',
+    }
+    const outNine = openPress(confirmation, cfgNine, roundNine, baseMatches)
+    const outMatch = openPress(confirmation, cfgMatch, roundMatch, baseMatches)
+
+    const pressNine = outNine.matches.find((m) => m.id === 'press-1')
+    const pressMatch = outMatch.matches.find((m) => m.id === 'press-1')
+    expect(pressNine?.endHole).toBe(9)
+    expect(pressMatch?.endHole).toBe(18)
+    expect(pressNine?.startHole).toBe(6)
+    expect(pressMatch?.startHole).toBe(6)
+  })
+
+  it("front-9 match press: 'nine' and 'match' both give endHole=9 (scopes agree)", () => {
+    // Front-9 match endHole is already 9; both scopes produce the same result
+    // here. Not a distinguishing test — it documents the no-disagreement case.
+    const cfgNine = makeNassauCfg({ pressScope: 'nine' })
+    const roundNine = makeRoundCfg(cfgNine)
+    const baseMatches = initialMatches(cfgNine)
+    const out = openPress(
+      { hole: 3, parentMatchId: 'front', openingPlayer: 'B' },
+      cfgNine, roundNine, baseMatches,
+    )
+    const press = out.matches.find((m) => m.id === 'press-1')
+    expect(press?.endHole).toBe(9) // min(9, parent.endHole=9) = 9
+    expect(press?.startHole).toBe(4)
+  })
+
+  it("back-9 match press with 'match' scope runs to hole 18", () => {
+    const cfg = makeNassauCfg({ pressScope: 'match' })
+    const round = makeRoundCfg(cfg)
+    const out = openPress(
+      { hole: 13, parentMatchId: 'back', openingPlayer: 'B' },
+      cfg, round, initialMatches(cfg),
+    )
+    const press = out.matches.find((m) => m.id === 'press-1')
+    expect(press?.endHole).toBe(18)
+    expect(press?.startHole).toBe(14)
+  })
+})
+
+describe('openPress last-hole voiding (§ 9 press-on-last-hole)', () => {
+  it("press opened on hole 9 of front-9 with 'nine' scope → PressVoided, no MatchState added", () => {
+    const cfg = makeNassauCfg({ pressScope: 'nine' })
+    const round = makeRoundCfg(cfg)
+    const out = openPress(
+      { hole: 9, parentMatchId: 'front', openingPlayer: 'B' },
+      cfg, round, initialMatches(cfg),
+    )
+    expect(out.events.find((e) => e.kind === 'PressOpened')).toBeDefined()
+    expect(out.events.find((e) => e.kind === 'PressVoided')).toBeDefined()
+    expect(out.matches.find((m) => m.id.startsWith('press-'))).toBeUndefined()
+  })
+
+  it("press opened at hole 8 of front-9 gives a 1-hole window (not voided)", () => {
+    // Distinguishing vs hole-9 case above: startHole=9, endHole=9 → valid 1-hole press.
+    const cfg = makeNassauCfg({ pressScope: 'nine' })
+    const round = makeRoundCfg(cfg)
+    const out = openPress(
+      { hole: 8, parentMatchId: 'front', openingPlayer: 'B' },
+      cfg, round, initialMatches(cfg),
+    )
+    expect(out.events.find((e) => e.kind === 'PressVoided')).toBeUndefined()
+    const press = out.matches.find((m) => m.id.startsWith('press-'))
+    expect(press).toBeDefined()
+    expect(press?.startHole).toBe(9)
+    expect(press?.endHole).toBe(9)
+  })
+
+  it('press opened on hole 18 of back-9 → PressVoided', () => {
+    const cfg = makeNassauCfg({ pressScope: 'match' })
+    const round = makeRoundCfg(cfg)
+    const out = openPress(
+      { hole: 18, parentMatchId: 'back', openingPlayer: 'A' },
+      cfg, round, initialMatches(cfg),
+    )
+    expect(out.events.some((e) => e.kind === 'PressVoided')).toBe(true)
+  })
+})
+
+describe('press composition (press-of-press)', () => {
+  it('press-2 can be opened with parentMatchId = press-1 (uncapped depth)', () => {
+    const cfg = makeNassauCfg({ pressScope: 'nine' })
+    const round = makeRoundCfg(cfg)
+    const out1 = openPress(
+      { hole: 3, parentMatchId: 'front', openingPlayer: 'B' },
+      cfg, round, initialMatches(cfg),
+    )
+    const out2 = openPress(
+      { hole: 5, parentMatchId: 'press-1', openingPlayer: 'A' },
+      cfg, round, out1.matches,
+    )
+    const press1 = out2.matches.find((m) => m.id === 'press-1')
+    const press2 = out2.matches.find((m) => m.id === 'press-2')
+    expect(press1).toBeDefined()
+    expect(press2).toBeDefined()
+    expect(press2?.parentId).toBe('press-1')
+    expect(press2?.startHole).toBe(6)
+  })
+
+  it('openPress throws when parentMatchId does not exist', () => {
+    const cfg = makeNassauCfg()
+    const round = makeRoundCfg(cfg)
+    expect(() =>
+      openPress(
+        { hole: 3, parentMatchId: 'no-such-match', openingPlayer: 'B' },
+        cfg, round, initialMatches(cfg),
+      ),
+    ).toThrow(NassauConfigError)
+  })
+})
diff --git a/src/games/nassau.ts b/src/games/nassau.ts
new file mode 100644
index 0000000..b75487a
--- /dev/null
+++ b/src/games/nassau.ts
@@ -0,0 +1,346 @@
+// src/games/nassau.ts — pure Nassau scoring engine per docs/games/game_nassau.md.
+//
+// Phase 1 scope (prompt 013): types + MatchState + per-hole scoring for
+// singles mode only. No press handling (Phase 2). No finalization / closeout
+// (Phase 3). No allPairs / withdrawal / Round-Handicap integration (Phase 4).
+//
+// Signature divergence from Skins/Wolf/Stroke Play (prompt 012 I2 decision):
+//   Nassau threads MatchState[] explicitly through settleNassauHole:
+//     (hole, cfg, roundCfg, matches) => { events, matches }
+//   This reflects Nassau's genuine structural state — presses (Phase 2) add
+//   MatchState entries mid-round in ways the event log alone doesn't cleanly
+//   replay. Hiding the state would force every call to rebuild matches from
+//   the event log; explicit threading is the honest interface.
+//
+// Handicap allocation (prompt 012 I1/I4 decision):
+//   Pair-wise USGA allocation per game_nassau.md § 2 prose (authoritative).
+//   § 5 pseudocode is illustrative and incomplete for pair reduction — see
+//   holeResult body for the algorithm.
+//
+// Portability: pure TypeScript; no next/*, react, react-dom, fs, path,
+// process, DOM globals, @prisma/client, or src/lib/* imports.
+
+import type {
+  BetId,
+  HoleState,
+  NassauCfg,
+  PlayerId,
+  RoundConfig,
+  ScoringEvent,
+} from './types'
+import { strokesOnHole } from './handicap'
+
+// ─── Typed errors ───────────────────────────────────────────────────────────
+
+export class NassauConfigError extends Error {
+  readonly code = 'NassauConfigError' as const
+  constructor(public readonly field: string, public readonly detail?: string) {
+    super(
+      detail
+        ? `NassauCfg field '${field}' is invalid: ${detail}`
+        : `NassauCfg missing required field: ${field}`,
+    )
+    this.name = 'NassauConfigError'
+  }
+}
+
+export class NassauBetNotFoundError extends Error {
+  readonly code = 'NassauBetNotFoundError' as const
+  constructor() {
+    super(
+      'Nassau config does not correspond to a bet in roundCfg.bets — ' +
+        'pass a config whose id matches a BetSelection.id.',
+    )
+    this.name = 'NassauBetNotFoundError'
+  }
+}
+
+// ─── Match state ────────────────────────────────────────────────────────────
+
+export interface MatchState {
+  id: string                   // 'front' | 'back' | 'overall' | 'press-<n>'
+  startHole: number
+  endHole: number
+  holesWonA: number
+  holesWonB: number
+  parentId: string | null
+}
+
+// ─── Validation ─────────────────────────────────────────────────────────────
+
+function assertValidNassauCfg(cfg: NassauCfg): void {
+  if (typeof cfg.id !== 'string' || cfg.id.length === 0) {
+    throw new NassauConfigError('id')
+  }
+  if (typeof cfg.stake !== 'number' || !Number.isInteger(cfg.stake) || cfg.stake < 1) {
+    throw new NassauConfigError('stake', 'must be a positive integer')
+  }
+  const validPressRules = ['manual', 'auto-2-down', 'auto-1-down'] as const
+  if (!validPressRules.includes(cfg.pressRule)) {
+    throw new NassauConfigError('pressRule')
+  }
+  const validPressScopes = ['nine', 'match'] as const
+  if (!validPressScopes.includes(cfg.pressScope)) {
+    throw new NassauConfigError('pressScope')
+  }
+  const validPairingModes = ['singles', 'allPairs'] as const
+  if (!validPairingModes.includes(cfg.pairingMode)) {
+    throw new NassauConfigError('pairingMode')
+  }
+  if (typeof cfg.appliesHandicap !== 'boolean') {
+    throw new NassauConfigError('appliesHandicap')
+  }
+  if (!Array.isArray(cfg.playerIds) || cfg.playerIds.length < 2 || cfg.playerIds.length > 5) {
+    throw new NassauConfigError('playerIds', 'length must be 2..5')
+  }
+  if (cfg.pairingMode === 'singles' && cfg.playerIds.length !== 2) {
+    throw new NassauConfigError('playerIds', "pairingMode 'singles' requires exactly 2 players")
+  }
+  if (!Array.isArray(cfg.junkItems)) {
+    throw new NassauConfigError('junkItems')
+  }
+  if (
+    typeof cfg.junkMultiplier !== 'number' ||
+    !Number.isInteger(cfg.junkMultiplier) ||
+    cfg.junkMultiplier < 1
+  ) {
+    throw new NassauConfigError('junkMultiplier', 'must be a positive integer')
+  }
+}
+
+function findBetId(cfg: NassauCfg, roundCfg: RoundConfig): BetId {
+  const bet = roundCfg.bets.find((b) => b.type === 'nassau' && b.id === cfg.id)
+  if (bet === undefined) throw new NassauBetNotFoundError()
+  return bet.id
+}
+
+// ─── Initial matches ────────────────────────────────────────────────────────
+//
+// Singles mode: three base matches (front / back / overall). allPairs mode
+// (Phase 4) will expand this to three matches per distinct pair.
+
+export function initialMatches(_cfg: NassauCfg): MatchState[] {
+  return [
+    { id: 'front', startHole: 1, endHole: 9, holesWonA: 0, holesWonB: 0, parentId: null },
+    { id: 'back', startHole: 10, endHole: 18, holesWonA: 0, holesWonB: 0, parentId: null },
+    { id: 'overall', startHole: 1, endHole: 18, holesWonA: 0, holesWonB: 0, parentId: null },
+  ]
+}
+
+// ─── Press handling (Phase 2) ───────────────────────────────────────────────
+//
+// Design: three pure functions compose a press event. The caller drives the
+// sequence — offerPress returns a PressOffered event when the rule permits;
+// UI layer confirms (or not); openPress creates the press MatchState when
+// confirmed. `settleNassauHole` scoring is byte-identical to Phase 1 —
+// presses enter the matches list via openPress before the next settle call.
+//
+// In manual mode, offerPress is only invoked when the down player has opted
+// in (caller's responsibility per rule file § 5). In auto modes, offerPress
+// filters by the exact threshold (2-down or 1-down) and returns [] otherwise.
+// offerPress never emits when downBy === 0 — no "down player" exists.
+
+export interface PressConfirmation {
+  hole: number             // hole at which the UI confirmation landed
+  parentMatchId: string    // id of the match being pressed
+  openingPlayer: PlayerId  // the down player whose opt-in created the press
+}
+
+export function offerPress(
+  hole: number,
+  parent: MatchState,
+  cfg: NassauCfg,
+  downPlayer: PlayerId,
+): ScoringEvent[] {
+  // Hole must lie inside the parent match window.
+  if (hole < parent.startHole || hole > parent.endHole) return []
+
+  // Compute lead size. If tied, no "down player" exists → no offer.
+  const lead = Math.abs(parent.holesWonA - parent.holesWonB)
+  if (lead === 0) return []
+
+  // Auto modes require the exact threshold. Manual mode accepts any down
+  // value (the caller's opt-in is the gate under manual).
+  if (cfg.pressRule === 'auto-2-down' && lead !== 2) return []
+  if (cfg.pressRule === 'auto-1-down' && lead !== 1) return []
+
+  return [{
+    kind: 'PressOffered',
+    timestamp: String(hole),
+    actor: downPlayer,
+    declaringBet: cfg.id,
+    hole,
+    parentMatchId: parent.id,
+    downPlayer,
+  }]
+}
+
+function endOfCurrent9Leg(hole: number, parentEndHole: number): number {
+  const legEnd = hole <= 9 ? 9 : 18
+  return Math.min(legEnd, parentEndHole)
+}
+
+export function openPress(
+  confirmation: PressConfirmation,
+  config: NassauCfg,
+  roundCfg: RoundConfig,
+  matches: MatchState[],
+): { events: ScoringEvent[]; matches: MatchState[] } {
+  assertValidNassauCfg(config)
+  const declaringBet = findBetId(config, roundCfg)
+
+  const parent = matches.find((m) => m.id === confirmation.parentMatchId)
+  if (!parent) {
+    throw new NassauConfigError(
+      'parentMatchId',
+      `no MatchState with id '${confirmation.parentMatchId}'`,
+    )
+  }
+
+  const startHole = confirmation.hole + 1
+  const endHole = config.pressScope === 'match'
+    ? parent.endHole
+    : endOfCurrent9Leg(confirmation.hole, parent.endHole)
+
+  const pressCount = matches.filter((m) => m.id.startsWith('press-')).length
+  const pressId = `press-${pressCount + 1}`
+  const base = {
+    timestamp: String(confirmation.hole),
+    actor: confirmation.openingPlayer,
+    declaringBet,
+    hole: confirmation.hole,
+  } as const
+
+  const events: ScoringEvent[] = [{
+    kind: 'PressOpened',
+    ...base,
+    parentMatchId: parent.id,
+    pressMatchId: pressId,
+  }]
+
+  // § 9: press opened on the last hole of its window has zero holes to play
+  // and ties immediately. Emit PressVoided; do NOT add the MatchState.
+  if (startHole > endHole) {
+    events.push({
+      kind: 'PressVoided',
+      ...base,
+      parentMatchId: parent.id,
+      reason: 'zero-holes-to-play',
+    })
+    return { events, matches }
+  }
+
+  const pressMatch: MatchState = {
+    id: pressId,
+    startHole,
+    endHole,
+    holesWonA: 0,
+    holesWonB: 0,
+    parentId: parent.id,
+  }
+
+  return { events, matches: [...matches, pressMatch] }
+}
+
+// ─── Net-score computation (pair-wise USGA allocation) ──────────────────────
+//
+// Pair-wise USGA allocation per docs/games/game_nassau.md § 2 prose; § 5
+// pseudocode is illustrative and incomplete for pair reduction.
+//
+//   diff = |strokes[a] − strokes[b]|
+//   higher-hcp player receives strokesOnHole(diff, holeIndex) strokes
+//   lower-hcp player receives 0
+
+function holeResult(
+  state: HoleState,
+  cfg: NassauCfg,
+  a: PlayerId,
+  b: PlayerId,
+): 'A' | 'B' | 'tie' {
+  const grossA = state.gross[a] ?? 0
+  const grossB = state.gross[b] ?? 0
+
+  let na: number
+  let nb: number
+
+  if (cfg.appliesHandicap) {
+    const strokesA = state.strokes[a] ?? 0
+    const strokesB = state.strokes[b] ?? 0
+    const diff = Math.abs(strokesA - strokesB)
+    const strokesForHigher = strokesOnHole(diff, state.holeIndex)
+    const aIsHigher = strokesA > strokesB
+    na = grossA - (aIsHigher ? strokesForHigher : 0)
+    nb = grossB - (aIsHigher ? 0 : strokesForHigher)
+  } else {
+    na = grossA
+    nb = grossB
+  }
+
+  if (na < nb) return 'A'
+  if (nb < na) return 'B'
+  return 'tie'
+}
+
+function applyHoleToMatch(match: MatchState, winner: 'A' | 'B' | 'tie'): MatchState {
+  if (winner === 'A') return { ...match, holesWonA: match.holesWonA + 1 }
+  if (winner === 'B') return { ...match, holesWonB: match.holesWonB + 1 }
+  return match
+}
+
+// ─── Per-hole settlement ────────────────────────────────────────────────────
+
+export function settleNassauHole(
+  hole: HoleState,
+  config: NassauCfg,
+  roundCfg: RoundConfig,
+  matches: MatchState[],
+): { events: ScoringEvent[]; matches: MatchState[] } {
+  assertValidNassauCfg(config)
+  const declaringBet = findBetId(config, roundCfg)
+
+  // Phase 1 supports only singles mode. allPairs lands in Phase 4.
+  if (config.pairingMode !== 'singles') {
+    throw new NassauConfigError(
+      'pairingMode',
+      `Phase 1 supports only 'singles'; got '${config.pairingMode}'`,
+    )
+  }
+
+  const [playerA, playerB] = config.playerIds
+  const events: ScoringEvent[] = []
+  const updatedMatches: MatchState[] = []
+
+  for (const match of matches) {
+    if (hole.hole < match.startHole || hole.hole > match.endHole) {
+      updatedMatches.push(match)
+      continue
+    }
+    const winner = holeResult(hole, config, playerA, playerB)
+    const updated = applyHoleToMatch(match, winner)
+    updatedMatches.push(updated)
+    events.push({
+      kind: 'NassauHoleResolved',
+      timestamp: hole.timestamp,
+      actor: 'system',
+      declaringBet,
+      hole: hole.hole,
+      matchId: match.id,
+      winner,
+    })
+  }
+
+  return { events, matches: updatedMatches }
+}
+
+// ─── Round finalization (Phase 3 stub) ──────────────────────────────────────
+//
+// Phase 1 stub: no settlement events emitted yet. Phase 3 fills this in with
+// MatchClosedOut, MatchTied, and stake-denominated end-of-round events.
+
+export function finalizeNassauRound(
+  _events: ScoringEvent[],
+  _config: NassauCfg,
+  _matches: MatchState[],
+): ScoringEvent[] {
+  return []
+}
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
