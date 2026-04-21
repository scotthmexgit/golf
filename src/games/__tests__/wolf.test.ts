import { describe, it, expect } from 'vitest'
import {
  settleWolfHole,
  finalizeWolfRound,
  applyWolfCaptainRotation,
  WolfConfigError,
  WolfBetNotFoundError,
  type WolfDecision,
} from '../wolf'
import { effectiveCourseHcp } from '../handicap'
import type {
  BetSelection,
  HoleState,
  JunkRoundConfig,
  PlayerId,
  PlayerSetup,
  RoundConfig,
  ScoringEvent,
  WolfCfg,
} from '../types'

// ─── Helpers ───────────────────────────────────────────────────────────────

const defaultJunkCfg: JunkRoundConfig = {
  girEnabled: true,
  longestDriveHoles: [],
  ctpEnabled: true,
  longestDriveEnabled: true,
  greenieEnabled: true,
  sandyEnabled: true,
  barkieEnabled: true,
  polieEnabled: true,
  arnieEnabled: true,
  polieMode: 'automatic',
  barkieStrict: true,
  superSandyEnabled: false,
}

function makeWolfCfg(overrides: Partial<WolfCfg> = {}): WolfCfg {
  return {
    stake: 1,
    loneMultiplier: 3,
    blindLoneEnabled: false,
    blindLoneMultiplier: 4,
    tieRule: 'no-points',
    playerIds: ['A', 'B', 'C', 'D'],
    appliesHandicap: false,
    junkItems: [],
    junkMultiplier: 1,
    ...overrides,
  }
}

function makeRoundCfg(cfg: WolfCfg, betId = 'wolf-1'): RoundConfig {
  const bet: BetSelection = {
    id: betId,
    type: 'wolf',
    stake: cfg.stake,
    participants: cfg.playerIds,
    config: cfg,
    junkItems: cfg.junkItems,
    junkMultiplier: cfg.junkMultiplier,
  }
  const players: PlayerSetup[] = cfg.playerIds.map((id) => ({
    id,
    name: id,
    hcpIndex: 0,
    tee: 'white',
    isCourseHcp: true,
    courseHcp: 0,
    betting: true,
    isSelf: false,
    roundHandicap: 0,
  }))
  return {
    roundId: 'r1',
    courseName: 'Test Course',
    players,
    bets: [bet],
    junk: defaultJunkCfg,
    longestDriveHoles: [],
    locked: true,
    unitSize: 100,
  }
}

function makeHole(
  holeNum: number,
  gross: Record<PlayerId, number>,
  opts: {
    par?: number
    holeIndex?: number
    strokes?: Record<PlayerId, number>
  } = {},
): HoleState {
  const playerIds = Object.keys(gross)
  const zeroBool: Record<PlayerId, boolean> = {}
  for (const p of playerIds) zeroBool[p] = false
  const zeroStrokes: Record<PlayerId, number> = {}
  for (const p of playerIds) zeroStrokes[p] = 0
  return {
    hole: holeNum,
    par: opts.par ?? 4,
    holeIndex: opts.holeIndex ?? holeNum,
    timestamp: `ts-${holeNum}`,
    gross,
    strokes: opts.strokes ?? zeroStrokes,
    status: 'Confirmed',
    ctpWinner: null,
    longestDriveWinner: null,
    bunkerVisited: { ...zeroBool },
    treeSolidHit: { ...zeroBool },
    treeAnyHit: { ...zeroBool },
    longPutt: { ...zeroBool },
    polieInvoked: { ...zeroBool },
    fairwayHit: { ...zeroBool },
    gir: { ...zeroBool },
    pickedUp: [],
    conceded: [],
    withdrew: [],
  }
}

function sumPoints(
  events: ScoringEvent[],
  playerIds: readonly PlayerId[],
): Record<PlayerId, number> {
  const totals: Record<PlayerId, number> = {}
  for (const p of playerIds) totals[p] = 0
  for (const e of events) {
    if ('points' in e) {
      for (const p of playerIds) totals[p] += e.points[p] ?? 0
    }
  }
  return totals
}

function assertZeroSum(events: ScoringEvent[], playerIds: readonly PlayerId[]): void {
  const totals = sumPoints(events, playerIds)
  const sum = playerIds.reduce((s, p) => s + totals[p], 0)
  expect(sum).toBe(0)
  for (const e of events) {
    if ('points' in e) {
      for (const p of playerIds) {
        expect(Number.isInteger(e.points[p] ?? 0)).toBe(true)
      }
    }
  }
}

// ─── Test 1 — Worked Example verbatim (game_wolf.md § 10) ──────────────────

describe('game_wolf.md § 10 Worked Example verbatim', () => {
  const cfg = makeWolfCfg()
  const round = makeRoundCfg(cfg)

  const holes: Array<{
    hole: number
    gross: Record<PlayerId, number>
    decision: WolfDecision
  }> = [
    { hole: 1,  gross: { A: 4, B: 5, C: 5, D: 5 }, decision: { kind: 'partner', captain: 'A', partner: 'B' } },
    { hole: 2,  gross: { A: 4, B: 4, C: 5, D: 5 }, decision: { kind: 'partner', captain: 'B', partner: 'A' } },
    { hole: 3,  gross: { A: 4, B: 4, C: 3, D: 3 }, decision: { kind: 'partner', captain: 'C', partner: 'D' } },
    { hole: 4,  gross: { A: 6, B: 6, C: 5, D: 5 }, decision: { kind: 'partner', captain: 'D', partner: 'C' } },
    { hole: 5,  gross: { A: 3, B: 4, C: 4, D: 4 }, decision: { kind: 'lone',    captain: 'A', blind: false } },
    { hole: 6,  gross: { A: 3, B: 3, C: 4, D: 4 }, decision: { kind: 'partner', captain: 'B', partner: 'A' } },
    { hole: 7,  gross: { A: 4, B: 5, C: 4, D: 5 }, decision: { kind: 'partner', captain: 'C', partner: 'A' } },
    { hole: 8,  gross: { A: 5, B: 4, C: 5, D: 4 }, decision: { kind: 'partner', captain: 'D', partner: 'B' } },
    { hole: 9,  gross: { A: 4, B: 5, C: 4, D: 5 }, decision: { kind: 'partner', captain: 'A', partner: 'C' } },
    { hole: 10, gross: { A: 4, B: 5, C: 4, D: 4 }, decision: { kind: 'lone',    captain: 'B', blind: false } },
    { hole: 11, gross: { A: 3, B: 4, C: 3, D: 4 }, decision: { kind: 'partner', captain: 'C', partner: 'A' } },
    { hole: 12, gross: { A: 6, B: 5, C: 6, D: 5 }, decision: { kind: 'partner', captain: 'D', partner: 'B' } },
    { hole: 13, gross: { A: 4, B: 4, C: 5, D: 5 }, decision: { kind: 'partner', captain: 'A', partner: 'B' } },
    { hole: 14, gross: { A: 4, B: 4, C: 5, D: 5 }, decision: { kind: 'partner', captain: 'B', partner: 'A' } },
    { hole: 15, gross: { A: 4, B: 4, C: 3, D: 3 }, decision: { kind: 'partner', captain: 'C', partner: 'D' } },
    { hole: 16, gross: { A: 5, B: 5, C: 4, D: 4 }, decision: { kind: 'partner', captain: 'D', partner: 'C' } },
    { hole: 17, gross: { A: 5, B: 5, C: 6, D: 6 }, decision: { kind: 'partner', captain: 'A', partner: 'B' } },
    { hole: 18, gross: { A: 4, B: 4, C: 4, D: 3 }, decision: { kind: 'lone',    captain: 'B', blind: false } },
  ]

  const events: ScoringEvent[] = []
  for (const row of holes) {
    events.push(
      ...settleWolfHole(makeHole(row.hole, row.gross), cfg, round, row.decision),
    )
  }
  const finalEvents = finalizeWolfRound(events, cfg)

  it('round totals = { A: +21, B: -19, C: +1, D: -3 } (§ 10 bottom line)', () => {
    const totals = sumPoints(finalEvents, ['A', 'B', 'C', 'D'])
    expect(totals).toEqual({ A: 21, B: -19, C: 1, D: -3 })
  })

  it('settles zero-sum and every point is integer-typed', () => {
    assertZeroSum(finalEvents, ['A', 'B', 'C', 'D'])
  })

  it('emits one LoneWolfResolved on hole 5 (captain A wins; +9 / −3 / −3 / −3)', () => {
    const h5 = finalEvents.find(
      (e): e is ScoringEvent & { kind: 'LoneWolfResolved' } =>
        e.kind === 'LoneWolfResolved' && e.hole === 5,
    )
    expect(h5).toBeDefined()
    if (!h5) return
    expect(h5.captain).toBe('A')
    expect(h5.won).toBe(true)
    expect(h5.points).toEqual({ A: 9, B: -3, C: -3, D: -3 })
  })

  it('emits one LoneWolfResolved on hole 10 (captain B loses; A/C/D +3, B −9)', () => {
    const h10 = finalEvents.find(
      (e): e is ScoringEvent & { kind: 'LoneWolfResolved' } =>
        e.kind === 'LoneWolfResolved' && e.hole === 10,
    )
    expect(h10).toBeDefined()
    if (!h10) return
    expect(h10.captain).toBe('B')
    expect(h10.won).toBe(false)
    expect(h10.points).toEqual({ A: 3, B: -9, C: 3, D: 3 })
  })

  it('emits one LoneWolfResolved on hole 18 (captain B loses; A/C/D +3, B −9)', () => {
    const h18 = finalEvents.find(
      (e): e is ScoringEvent & { kind: 'LoneWolfResolved' } =>
        e.kind === 'LoneWolfResolved' && e.hole === 18,
    )
    expect(h18).toBeDefined()
    if (!h18) return
    expect(h18.captain).toBe('B')
    expect(h18.won).toBe(false)
    expect(h18.points).toEqual({ A: 3, B: -9, C: 3, D: 3 })
  })
})

// ─── Test 2 — Blind Lone (game_wolf.md § 12 Test 2) ────────────────────────

describe('Blind Lone — 4× multiplier with BlindLoneDeclared', () => {
  it('emits BlindLoneDeclared + BlindLoneResolved; deltas = { A: +12, B: -4, C: -4, D: -4 }', () => {
    const cfg = makeWolfCfg({ blindLoneEnabled: true, blindLoneMultiplier: 4 })
    const round = makeRoundCfg(cfg)
    const events = settleWolfHole(
      makeHole(1, { A: 3, B: 4, C: 4, D: 4 }),
      cfg,
      round,
      { kind: 'lone', captain: 'A', blind: true },
    )
    const declared = events.filter((e) => e.kind === 'BlindLoneDeclared')
    expect(declared).toHaveLength(1)
    expect(declared[0].actor).toBe('A')

    const resolved = events.find(
      (e): e is ScoringEvent & { kind: 'BlindLoneResolved' } =>
        e.kind === 'BlindLoneResolved',
    )
    expect(resolved).toBeDefined()
    if (!resolved) return
    expect(resolved.points).toEqual({ A: 12, B: -4, C: -4, D: -4 })
    assertZeroSum(events, cfg.playerIds)
  })
})

// ─── Test 3 — 5-player Lone Wolf (game_wolf.md § 12 Test 3) ────────────────

describe('5-player Lone Wolf — 1 vs 4, ×3 multiplier', () => {
  it('deltas = { A: +12, B: -3, C: -3, D: -3, E: -3 }', () => {
    const cfg = makeWolfCfg({
      playerIds: ['A', 'B', 'C', 'D', 'E'],
    })
    const round = makeRoundCfg(cfg)
    const events = settleWolfHole(
      makeHole(1, { A: 3, B: 4, C: 4, D: 4, E: 4 }),
      cfg,
      round,
      { kind: 'lone', captain: 'A', blind: false },
    )
    const resolved = events.find(
      (e): e is ScoringEvent & { kind: 'LoneWolfResolved' } =>
        e.kind === 'LoneWolfResolved',
    )
    expect(resolved).toBeDefined()
    if (!resolved) return
    expect(resolved.points).toEqual({ A: 12, B: -3, C: -3, D: -3, E: -3 })
    assertZeroSum(events, cfg.playerIds)
  })
})

// ─── Test 4 — Tied Lone Wolf under tieRule='no-points' (§ 12 Test 4) ────────

describe("tied Lone Wolf hole, tieRule='no-points'", () => {
  it('every delta = 0; one WolfHoleTied event', () => {
    const cfg = makeWolfCfg({
      playerIds: ['A', 'B', 'C', 'D', 'E'],
      tieRule: 'no-points',
    })
    const round = makeRoundCfg(cfg)
    const events = settleWolfHole(
      makeHole(1, { A: 4, B: 4, C: 4, D: 4, E: 4 }),
      cfg,
      round,
      { kind: 'lone', captain: 'A', blind: false },
    )
    const finalized = finalizeWolfRound(events, cfg)
    const tied = finalized.filter((e) => e.kind === 'WolfHoleTied')
    expect(tied).toHaveLength(1)
    const totals = sumPoints(finalized, cfg.playerIds)
    expect(totals).toEqual({ A: 0, B: 0, C: 0, D: 0, E: 0 })
  })
})

// ─── Test 5 — Missing decision (§ 12 Test 5) ───────────────────────────────

describe('missing decision emits WolfDecisionMissing with zero delta', () => {
  it('emits WolfDecisionMissing with actor=captain (teeOrder rotation)', () => {
    const cfg = makeWolfCfg()
    const round = makeRoundCfg(cfg)
    // Hole 7 captain = teeOrder[(7-1) % 4] = teeOrder[2] = 'C'.
    const events = settleWolfHole(
      makeHole(7, { A: 4, B: 4, C: 4, D: 4 }),
      cfg,
      round,
      null,
    )
    expect(events).toHaveLength(1)
    const e = events[0]
    expect(e.kind).toBe('WolfDecisionMissing')
    if (e.kind === 'WolfDecisionMissing') {
      expect(e.captain).toBe('C')
    }
    const totals = sumPoints(events, cfg.playerIds)
    expect(totals).toEqual({ A: 0, B: 0, C: 0, D: 0 })
  })
})

// ─── Test 7 — Captain rotation for holes 1–16 ─────────────────────────────

describe('captain rotation holes 1–16 follows teeOrder modulo playerIds.length', () => {
  it('emits no events and cycles A,B,C,D for 4-player round', () => {
    const cfg = makeWolfCfg()
    const round = makeRoundCfg(cfg)
    const expected = ['A', 'B', 'C', 'D', 'A', 'B', 'C', 'D', 'A', 'B', 'C', 'D', 'A', 'B', 'C', 'D']
    for (let hole = 1; hole <= 16; hole += 1) {
      const { captain, events } = applyWolfCaptainRotation(hole, cfg, round)
      expect(captain).toBe(expected[hole - 1])
      expect(events).toHaveLength(0)
    }
  })

  it('cycles A,B,C,D,E for 5-player round', () => {
    const cfg = makeWolfCfg({
      playerIds: ['A', 'B', 'C', 'D', 'E'],
    })
    const round = makeRoundCfg(cfg)
    const cycle = ['A', 'B', 'C', 'D', 'E']
    for (let hole = 1; hole <= 16; hole += 1) {
      const { captain } = applyWolfCaptainRotation(hole, cfg, round)
      expect(captain).toBe(cycle[(hole - 1) % 5])
    }
  })
})

// ─── Test 7.5 — § 9: Captain withdraws → WolfCaptainReassigned ─────────────

describe('§ 9 edge case: captain withdraws shifts rotation to next teeOrder player', () => {
  it('A withdrew; hole 1 rotation captain A → shifts to B and emits WolfCaptainReassigned', () => {
    const cfg = makeWolfCfg()
    const round = makeRoundCfg(cfg)
    const priorEvents: ScoringEvent[] = [{
      kind: 'PlayerWithdrew',
      timestamp: 'ts-0',
      hole: 0,
      actor: 'A',
      player: 'A',
      fromHole: 1,
    }]
    const { captain, events } = applyWolfCaptainRotation(1, cfg, round, priorEvents)
    expect(captain).toBe('B')
    const reassigned = events.find(
      (e): e is ScoringEvent & { kind: 'WolfCaptainReassigned' } =>
        e.kind === 'WolfCaptainReassigned',
    )
    expect(reassigned).toBeDefined()
    if (reassigned) {
      expect(reassigned.from).toBe('A')
      expect(reassigned.to).toBe('B')
    }
  })
})

// ─── Test 8 — § 9: Missing score → WolfHoleInvalid ─────────────────────────

describe('§ 9 edge case: missing score invalidates the hole', () => {
  it('emits WolfHoleInvalid with zero deltas when a player has gross <= 0', () => {
    const cfg = makeWolfCfg()
    const round = makeRoundCfg(cfg)
    const events = settleWolfHole(
      makeHole(5, { A: 4, B: 0, C: 4, D: 4 }),
      cfg,
      round,
      { kind: 'partner', captain: 'A', partner: 'B' },
    )
    expect(events).toHaveLength(1)
    expect(events[0].kind).toBe('WolfHoleInvalid')
    const totals = sumPoints(events, cfg.playerIds)
    expect(totals).toEqual({ A: 0, B: 0, C: 0, D: 0 })
  })
})

// ─── Test 9 — § 9: Tie on Lone Wolf hole resolves under tieRule ────────────

describe('§ 9 edge case: Lone captain does not auto-win on tie', () => {
  it("under tieRule='no-points', tied Lone hole emits WolfHoleTied, zero delta", () => {
    const cfg = makeWolfCfg({ tieRule: 'no-points' })
    const round = makeRoundCfg(cfg)
    const events = settleWolfHole(
      makeHole(1, { A: 4, B: 4, C: 4, D: 4 }),
      cfg,
      round,
      { kind: 'lone', captain: 'A', blind: false },
    )
    expect(events).toHaveLength(1)
    expect(events[0].kind).toBe('WolfHoleTied')
  })
})

// ─── Test 10 — Round Handicap integration via effectiveCourseHcp ───────────

describe('Round Handicap integration (item 16 × Wolf)', () => {
  // Build HoleState via effectiveCourseHcp so we can demonstrate a roundHandicap
  // change propagating into Wolf's net-score computation. This proves Wolf
  // consumes the Round Handicap path rather than raw courseHcp.
  function strokesFor(players: PlayerSetup[]): Record<PlayerId, number> {
    const m: Record<PlayerId, number> = {}
    for (const p of players) m[p.id] = effectiveCourseHcp(p)
    return m
  }
  function basePlayer(id: PlayerId, courseHcp: number, roundHandicap: number): PlayerSetup {
    return {
      id,
      name: id,
      hcpIndex: courseHcp,
      tee: 'white',
      isCourseHcp: true,
      courseHcp,
      betting: true,
      isSelf: false,
      roundHandicap,
    }
  }

  it('same gross scores, different roundHandicap → different Wolf outcome', () => {
    const cfg = makeWolfCfg({ appliesHandicap: true })
    const round = makeRoundCfg(cfg)
    // Hole index 11, gross: A=4, B=5, C=5, D=5. A is captain Lone.
    // Case 1: all courseHcp=0, all roundHandicap=0 → no strokes → A wins gross.
    const case1Players = [
      basePlayer('A', 0, 0),
      basePlayer('B', 0, 0),
      basePlayer('C', 0, 0),
      basePlayer('D', 0, 0),
    ]
    const case1Events = settleWolfHole(
      makeHole(11, { A: 4, B: 5, C: 5, D: 5 }, { holeIndex: 11, strokes: strokesFor(case1Players) }),
      cfg,
      round,
      { kind: 'lone', captain: 'A', blind: false },
    )
    const case1Resolved = case1Events.find(
      (e): e is ScoringEvent & { kind: 'LoneWolfResolved' } => e.kind === 'LoneWolfResolved',
    )
    expect(case1Resolved?.won).toBe(true)
    expect(case1Resolved?.points).toEqual({ A: 9, B: -3, C: -3, D: -3 })

    // Case 2: courseHcp=0 for all; B has roundHandicap=+2 → B gets 2 strokes on idx 11
    // (effectiveCourseHcp=2 → strokesOnHole(2, 11)=0; strokesOnHole(20, 11)=1 actually).
    // Let's pick hole index 1 where strokes are allocated first, and give B
    // effectiveCourseHcp=1 via roundHandicap=+1. Then B's net = 5 - 1 = 4, tying A.
    const case2Players = [
      basePlayer('A', 0, 0),
      basePlayer('B', 0, 1),
      basePlayer('C', 0, 0),
      basePlayer('D', 0, 0),
    ]
    const case2Events = settleWolfHole(
      makeHole(1, { A: 4, B: 5, C: 5, D: 5 }, { holeIndex: 1, strokes: strokesFor(case2Players) }),
      cfg,
      round,
      { kind: 'lone', captain: 'A', blind: false },
    )
    // Opp best = min(B_net, C_net, D_net) = min(4, 5, 5) = 4 = A's net.
    // Tie under tieRule='no-points' → WolfHoleTied.
    expect(case2Events.some((e) => e.kind === 'WolfHoleTied')).toBe(true)
  })
})

// ─── Test 11 — Tie handling: no-points and carryover ──────────────────────

describe('§ 6 tie modes', () => {
  it("tieRule='no-points': tied hole stays zero; no stake doubling", () => {
    const cfg = makeWolfCfg({ tieRule: 'no-points' })
    const round = makeRoundCfg(cfg)
    // Hole 1 ties; hole 2 A,B win over C,D (partner).
    const e1 = settleWolfHole(
      makeHole(1, { A: 4, B: 4, C: 4, D: 4 }),
      cfg,
      round,
      { kind: 'partner', captain: 'A', partner: 'B' },
    )
    const e2 = settleWolfHole(
      makeHole(2, { A: 4, B: 4, C: 5, D: 5 }),
      cfg,
      round,
      { kind: 'partner', captain: 'B', partner: 'A' },
    )
    const finalized = finalizeWolfRound([...e1, ...e2], cfg)
    expect(finalized.filter((e) => e.kind === 'WolfHoleTied')).toHaveLength(1)
    expect(finalized.filter((e) => e.kind === 'WolfCarryApplied')).toHaveLength(0)
    const totals = sumPoints(finalized, cfg.playerIds)
    // Hole 2 only: stake 1 × mult 1 × 4 cross-pairs. A+B: +2 each; C+D: −2 each.
    expect(totals).toEqual({ A: 2, B: 2, C: -2, D: -2 })
  })

  it("tieRule='carryover': one tied hole doubles the next resolved hole's delta", () => {
    const cfg = makeWolfCfg({ tieRule: 'carryover' })
    const round = makeRoundCfg(cfg)
    const e1 = settleWolfHole(
      makeHole(1, { A: 4, B: 4, C: 4, D: 4 }),
      cfg,
      round,
      { kind: 'partner', captain: 'A', partner: 'B' },
    )
    const e2 = settleWolfHole(
      makeHole(2, { A: 4, B: 4, C: 5, D: 5 }),
      cfg,
      round,
      { kind: 'partner', captain: 'B', partner: 'A' },
    )
    const finalized = finalizeWolfRound([...e1, ...e2], cfg)
    expect(finalized.filter((e) => e.kind === 'WolfCarryApplied')).toHaveLength(1)
    const totals = sumPoints(finalized, cfg.playerIds)
    // Hole 2 doubled: A+B +4 each; C+D -4 each.
    expect(totals).toEqual({ A: 4, B: 4, C: -4, D: -4 })
    assertZeroSum(finalized, cfg.playerIds)
  })

  it("tieRule='carryover' vs Lone: max(carryMult, loneMult) applies — no product", () => {
    const cfg = makeWolfCfg({ tieRule: 'carryover', loneMultiplier: 3 })
    const round = makeRoundCfg(cfg)
    // Hole 1 tie (carryMult becomes 2). Hole 2: A goes Lone, wins.
    // decisionMult=3. max(2, 3) = 3. Expect A +9, B/C/D -3 each (same as non-carried).
    const e1 = settleWolfHole(
      makeHole(1, { A: 4, B: 4, C: 4, D: 4 }),
      cfg,
      round,
      { kind: 'partner', captain: 'A', partner: 'B' },
    )
    const e2 = settleWolfHole(
      makeHole(2, { A: 3, B: 4, C: 4, D: 4 }),
      cfg,
      round,
      { kind: 'lone', captain: 'A', blind: false },
    )
    const finalized = finalizeWolfRound([...e1, ...e2], cfg)
    const lone = finalized.find(
      (e): e is ScoringEvent & { kind: 'LoneWolfResolved' } => e.kind === 'LoneWolfResolved',
    )
    expect(lone?.points).toEqual({ A: 9, B: -3, C: -3, D: -3 })
    const carry = finalized.find(
      (e): e is ScoringEvent & { kind: 'WolfCarryApplied' } => e.kind === 'WolfCarryApplied',
    )
    expect(carry?.multiplier).toBe(3)
  })

  it("tieRule='carryover': two consecutive ties quadruple the next resolved hole", () => {
    const cfg = makeWolfCfg({ tieRule: 'carryover' })
    const round = makeRoundCfg(cfg)
    const e1 = settleWolfHole(
      makeHole(1, { A: 4, B: 4, C: 4, D: 4 }),
      cfg,
      round,
      { kind: 'partner', captain: 'A', partner: 'B' },
    )
    const e2 = settleWolfHole(
      makeHole(2, { A: 4, B: 4, C: 4, D: 4 }),
      cfg,
      round,
      { kind: 'partner', captain: 'B', partner: 'A' },
    )
    const e3 = settleWolfHole(
      makeHole(3, { A: 4, B: 4, C: 5, D: 5 }),
      cfg,
      round,
      { kind: 'partner', captain: 'C', partner: 'D' },
    )
    const finalized = finalizeWolfRound([...e1, ...e2, ...e3], cfg)
    const carry = finalized.find(
      (e): e is ScoringEvent & { kind: 'WolfCarryApplied' } => e.kind === 'WolfCarryApplied',
    )
    expect(carry?.multiplier).toBe(4)
    const totals = sumPoints(finalized, cfg.playerIds)
    expect(totals).toEqual({ A: 8, B: 8, C: -8, D: -8 })
  })
})

// ─── Test 12 — Partner decision produces 2 vs 2 settlement ────────────────

describe('partner decision: 2 vs 2 settlement, 4 cross-pairs', () => {
  it('winner side +stake × 2 each; loser side -stake × 2 each', () => {
    const cfg = makeWolfCfg({ stake: 1 })
    const round = makeRoundCfg(cfg)
    const events = settleWolfHole(
      makeHole(1, { A: 4, B: 5, C: 5, D: 5 }),
      cfg,
      round,
      { kind: 'partner', captain: 'A', partner: 'B' },
    )
    // Side best = 4 (A). Opp best = 5. A+B win 2 cross-pairs each → +2.
    // C+D lose 2 cross-pairs each → -2. 4 cross-pairs total.
    const resolved = events.find(
      (e): e is ScoringEvent & { kind: 'WolfHoleResolved' } => e.kind === 'WolfHoleResolved',
    )
    expect(resolved?.points).toEqual({ A: 2, B: 2, C: -2, D: -2 })
    expect(resolved?.winners.sort()).toEqual(['A', 'B'])
    expect(resolved?.losers.sort()).toEqual(['C', 'D'])
  })
})

// ─── Test 13 — Pass-on: same captain, different Decision → different output ─

describe('pass-on: scoring function honors the final Decision; UI enforces no-reversal', () => {
  it('Lone decision and partner decision for the same hole give different settlements', () => {
    const cfg = makeWolfCfg()
    const round = makeRoundCfg(cfg)
    const holeState = makeHole(1, { A: 3, B: 4, C: 4, D: 4 })
    const asPartner = settleWolfHole(holeState, cfg, round, {
      kind: 'partner', captain: 'A', partner: 'B',
    })
    const asLone = settleWolfHole(holeState, cfg, round, {
      kind: 'lone', captain: 'A', blind: false,
    })
    const partnerResolved = asPartner.find(
      (e): e is ScoringEvent & { kind: 'WolfHoleResolved' } => e.kind === 'WolfHoleResolved',
    )
    const loneResolved = asLone.find(
      (e): e is ScoringEvent & { kind: 'LoneWolfResolved' } => e.kind === 'LoneWolfResolved',
    )
    // Partner: 2 vs 2 × stake 1 → A+B +2; C+D -2.
    expect(partnerResolved?.points).toEqual({ A: 2, B: 2, C: -2, D: -2 })
    // Lone: 1 vs 3 × stake 1 × loneMult 3 → A +9; B+C+D -3.
    expect(loneResolved?.points).toEqual({ A: 9, B: -3, C: -3, D: -3 })
  })
})

// ─── Test 14 — Typed errors: throw on missing/invalid config ──────────────

describe('typed errors: throw on invalid or missing config', () => {
  const round = makeRoundCfg(makeWolfCfg())
  const hole = makeHole(1, { A: 4, B: 5, C: 5, D: 5 })
  const decision: WolfDecision = { kind: 'partner', captain: 'A', partner: 'B' }

  it('throws WolfConfigError when stake is not a positive integer', () => {
    const bad = { ...makeWolfCfg(), stake: 0 } as WolfCfg
    expect(() => settleWolfHole(hole, bad, round, decision)).toThrow(WolfConfigError)
  })

  it('throws WolfConfigError when loneMultiplier < 2', () => {
    const bad = { ...makeWolfCfg(), loneMultiplier: 1 } as WolfCfg
    expect(() => settleWolfHole(hole, bad, round, decision)).toThrow(WolfConfigError)
  })

  it('throws WolfConfigError when blindLoneMultiplier < 3', () => {
    const bad = { ...makeWolfCfg(), blindLoneMultiplier: 2 } as WolfCfg
    expect(() => settleWolfHole(hole, bad, round, decision)).toThrow(WolfConfigError)
  })

  it('throws WolfConfigError on playerIds outside 4..5', () => {
    const bad = { ...makeWolfCfg(), playerIds: ['A', 'B', 'C'] } as WolfCfg
    expect(() => settleWolfHole(hole, bad, round, decision)).toThrow(WolfConfigError)
  })

  it('throws WolfConfigError when tieRule is missing', () => {
    const bad = {
      ...makeWolfCfg(),
      tieRule: undefined as unknown as WolfCfg['tieRule'],
    }
    expect(() => settleWolfHole(hole, bad, round, decision)).toThrow(WolfConfigError)
  })

  it('throws WolfBetNotFoundError when config is not referenced in roundCfg.bets', () => {
    const stray = makeWolfCfg()
    expect(() => settleWolfHole(hole, stray, round, decision)).toThrow(WolfBetNotFoundError)
  })
})

// ─── Test 15 — Purity ─────────────────────────────────────────────────────

describe('purity: settleWolfHole returns identical events for identical inputs', () => {
  it('two calls with the same args produce deeply equal event arrays', () => {
    const cfg = makeWolfCfg()
    const round = makeRoundCfg(cfg)
    const hole = makeHole(5, { A: 3, B: 4, C: 4, D: 4 })
    const decision: WolfDecision = { kind: 'lone', captain: 'A', blind: false }
    const a = settleWolfHole(hole, cfg, round, decision)
    const b = settleWolfHole(hole, cfg, round, decision)
    expect(a).toEqual(b)
  })
})
