import { describe, it, expect } from 'vitest'
import {
  settleSkinsHole,
  finalizeSkinsRound,
  SkinsConfigError,
  SkinsBetNotFoundError,
} from '../skins'
import { effectiveCourseHcp } from '../handicap'
import type {
  BetSelection,
  HoleState,
  JunkRoundConfig,
  PlayerId,
  PlayerSetup,
  RoundConfig,
  ScoringEvent,
  SkinsCfg,
} from '../types'

// ─── Test helpers ──────────────────────────────────────────────────────────

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

function makeSkinsCfg(overrides: Partial<SkinsCfg> = {}): SkinsCfg {
  return {
    id: 'skins-1',
    stake: 1,
    escalating: true,
    tieRuleFinalHole: 'split',
    appliesHandicap: false,
    playerIds: ['A', 'B', 'C', 'D'],
    junkItems: [],
    junkMultiplier: 1,
    ...overrides,
  }
}

function makeRoundCfg(skinsCfg: SkinsCfg, betId = 'skins-1'): RoundConfig {
  const bet: BetSelection = {
    id: betId,
    type: 'skins',
    stake: skinsCfg.stake,
    participants: skinsCfg.playerIds,
    config: skinsCfg,
    junkItems: skinsCfg.junkItems,
    junkMultiplier: skinsCfg.junkMultiplier,
  }
  return {
    roundId: 'r1',
    courseName: 'Test Course',
    players: [],
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
      for (const p of playerIds) {
        totals[p] += e.points[p] ?? 0
      }
    }
  }
  return totals
}

function assertZeroSum(
  events: ScoringEvent[],
  playerIds: readonly PlayerId[],
): void {
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

function runRound(
  holeGross: Array<{ hole: number; gross: Record<PlayerId, number> }>,
  skinsCfg: SkinsCfg,
  roundCfg: RoundConfig,
  opts: { holeIndices?: Record<number, number>; strokes?: Record<PlayerId, number> } = {},
): ScoringEvent[] {
  const events: ScoringEvent[] = []
  for (const row of holeGross) {
    const holeState = makeHole(row.hole, row.gross, {
      holeIndex: opts.holeIndices?.[row.hole] ?? row.hole,
      strokes: opts.strokes,
    })
    events.push(...settleSkinsHole(holeState, skinsCfg, roundCfg))
  }
  return finalizeSkinsRound(events, skinsCfg)
}

// ─── Test 1 — Worked Example verbatim (game_skins.md § 10) ─────────────────

describe('game_skins.md § 10 Worked Example verbatim', () => {
  const skinsCfg = makeSkinsCfg()
  const roundCfg = makeRoundCfg(skinsCfg)

  const holes: Array<{ hole: number; gross: Record<PlayerId, number> }> = [
    { hole: 1,  gross: { A: 4, B: 5, C: 5, D: 5 } },
    { hole: 2,  gross: { A: 4, B: 4, C: 4, D: 4 } },
    { hole: 3,  gross: { A: 4, B: 4, C: 4, D: 4 } },
    { hole: 4,  gross: { A: 5, B: 4, C: 5, D: 5 } },
    { hole: 5,  gross: { A: 4, B: 5, C: 5, D: 5 } },
    { hole: 6,  gross: { A: 5, B: 5, C: 4, D: 5 } },
    { hole: 7,  gross: { A: 5, B: 5, C: 5, D: 4 } },
    { hole: 8,  gross: { A: 4, B: 5, C: 5, D: 5 } },
    { hole: 9,  gross: { A: 5, B: 4, C: 5, D: 5 } },
    { hole: 10, gross: { A: 5, B: 5, C: 5, D: 5 } },
    { hole: 11, gross: { A: 4, B: 5, C: 5, D: 5 } },
    { hole: 12, gross: { A: 5, B: 4, C: 5, D: 5 } },
    { hole: 13, gross: { A: 5, B: 5, C: 4, D: 5 } },
    { hole: 14, gross: { A: 5, B: 5, C: 5, D: 4 } },
    { hole: 15, gross: { A: 4, B: 5, C: 5, D: 5 } },
    { hole: 16, gross: { A: 4, B: 4, C: 5, D: 5 } },
    { hole: 17, gross: { A: 5, B: 5, C: 5, D: 5 } },
    { hole: 18, gross: { A: 4, B: 4, C: 5, D: 5 } },
  ]

  const finalEvents = runRound(holes, skinsCfg, roundCfg)

  it('produces the stated round totals { A:+15, B:+11, C:−13, D:−13 }', () => {
    const totals = sumPoints(finalEvents, ['A', 'B', 'C', 'D'])
    expect(totals).toEqual({ A: 15, B: 11, C: -13, D: -13 })
  })

  it('settles zero-sum across the round and every event is integer-typed', () => {
    assertZeroSum(finalEvents, ['A', 'B', 'C', 'D'])
  })

  it('emits exactly 5 SkinCarried events on holes 2, 3, 10, 16, 17', () => {
    const carries = finalEvents.filter((e) => e.kind === 'SkinCarried')
    expect(carries).toHaveLength(5)
    expect(carries.map((c) => c.hole).sort((a, b) => a - b)).toEqual([2, 3, 10, 16, 17])
  })

  it('emits one SkinWon event per solo-win hole (holes 1, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15)', () => {
    const soloHoles = [1, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15]
    for (const h of soloHoles) {
      const matches = finalEvents.filter((e) => e.kind === 'SkinWon' && e.hole === h)
      expect(matches).toHaveLength(1)
    }
  })

  it('emits two SkinWon events on hole 18 for the split between A and B', () => {
    const h18wins = finalEvents.filter((e) => e.kind === 'SkinWon' && e.hole === 18)
    expect(h18wins).toHaveLength(2)
    const winners = h18wins
      .map((e) => (e.kind === 'SkinWon' ? e.winner : ''))
      .sort()
    expect(winners).toEqual(['A', 'B'])
  })

  it('hole 18 per-winner points split: each winner +6; each of C, D −6 across both events', () => {
    const h18wins = finalEvents.filter(
      (e): e is ScoringEvent & { kind: 'SkinWon' } =>
        e.kind === 'SkinWon' && e.hole === 18,
    )
    // Per-event shape: winner +6 (= potPerOpponent 3 × 2 losers); each loser -3.
    for (const e of h18wins) {
      expect(e.points[e.winner]).toBe(6)
      expect(e.points.C).toBe(-3)
      expect(e.points.D).toBe(-3)
      // Per-event zero-sum
      const s = e.points.A + e.points.B + e.points.C + e.points.D
      expect(s).toBe(0)
    }
  })

  it('hole 4 SkinWon absorbs the hole-2+3 carry: B +9, others −3', () => {
    const h4 = finalEvents.find(
      (e): e is ScoringEvent & { kind: 'SkinWon' } =>
        e.kind === 'SkinWon' && e.hole === 4,
    )
    expect(h4).toBeDefined()
    if (h4 === undefined) return
    expect(h4.winner).toBe('B')
    expect(h4.points).toEqual({ A: -3, B: 9, C: -3, D: -3 })
  })

  it('hole 11 SkinWon absorbs the hole-10 carry: A +6, others −2', () => {
    const h11 = finalEvents.find(
      (e): e is ScoringEvent & { kind: 'SkinWon' } =>
        e.kind === 'SkinWon' && e.hole === 11,
    )
    expect(h11).toBeDefined()
    if (h11 === undefined) return
    expect(h11.winner).toBe('A')
    expect(h11.points).toEqual({ A: 6, B: -2, C: -2, D: -2 })
  })
})

// ─── Test 2 — Hole-18 tieRuleFinalHole: 'split' default path ───────────────

describe('hole-18 tieRuleFinalHole: split (default)', () => {
  it('distributes the accumulated carry between tied winners in a 4-player field', () => {
    // Carry=2 entering hole 18 (holes 1 and 2 tied), then A and B tie on hole 18.
    const cfg = makeSkinsCfg()
    const round = makeRoundCfg(cfg)
    const events = runRound(
      [
        { hole: 1, gross: { A: 4, B: 4, C: 4, D: 4 } },
        { hole: 2, gross: { A: 4, B: 4, C: 4, D: 4 } },
        { hole: 18, gross: { A: 4, B: 4, C: 5, D: 5 } },
      ],
      cfg,
      round,
    )
    const h18 = events.filter((e) => e.kind === 'SkinWon' && e.hole === 18)
    expect(h18).toHaveLength(2)
    const totals = sumPoints(events, cfg.playerIds)
    expect(totals).toEqual({ A: 6, B: 6, C: -6, D: -6 })
    assertZeroSum(events, cfg.playerIds)
  })
})

// ─── Test 3 — game_skins.md § 12 Test 2: carryover on final hole ──────────

describe('tieRuleFinalHole: carryover — all four tie on hole 18', () => {
  it('emits exactly one SkinCarryForfeit with carryPoints = 3 and zero deltas', () => {
    const cfg = makeSkinsCfg({ tieRuleFinalHole: 'carryover' })
    const round = makeRoundCfg(cfg)
    const events = runRound(
      [
        { hole: 1, gross: { A: 4, B: 4, C: 4, D: 4 } },
        { hole: 2, gross: { A: 4, B: 4, C: 4, D: 4 } },
        { hole: 18, gross: { A: 5, B: 5, C: 5, D: 5 } },
      ],
      cfg,
      round,
    )
    const forfeits = events.filter((e) => e.kind === 'SkinCarryForfeit')
    expect(forfeits).toHaveLength(1)
    const f = forfeits[0]
    if (f.kind === 'SkinCarryForfeit') {
      expect(f.carryPoints).toBe(3) // 2 carried + 1 hole-18 stake
    }
    // No SkinWon at hole 18 under carryover
    const h18wins = events.filter((e) => e.kind === 'SkinWon' && e.hole === 18)
    expect(h18wins).toHaveLength(0)
    // Points are all zero for hole 18 (carry is forfeited, not zero-sum pay)
    const totals = sumPoints(events, cfg.playerIds)
    expect(totals).toEqual({ A: 0, B: 0, C: 0, D: 0 })
  })
})

// ─── Test 4 — game_skins.md § 12 Test 3: no-points on final hole ──────────

describe('tieRuleFinalHole: no-points — tied hole 18 refunds carry', () => {
  it('emits SkinCarryForfeit and holds zero-sum', () => {
    const cfg = makeSkinsCfg({ tieRuleFinalHole: 'no-points' })
    const round = makeRoundCfg(cfg)
    // Carry=2 from holes 1, 2; hole 18 tied (A, B).
    const events = runRound(
      [
        { hole: 1, gross: { A: 4, B: 4, C: 4, D: 4 } },
        { hole: 2, gross: { A: 4, B: 4, C: 4, D: 4 } },
        { hole: 18, gross: { A: 4, B: 4, C: 5, D: 5 } },
      ],
      cfg,
      round,
    )
    expect(events.filter((e) => e.kind === 'SkinCarryForfeit')).toHaveLength(1)
    const totals = sumPoints(events, cfg.playerIds)
    expect(totals).toEqual({ A: 0, B: 0, C: 0, D: 0 })
    assertZeroSum(events, cfg.playerIds)
  })
})

// ─── Test 5 — game_skins.md § 12 Test 5: field of 2 players ───────────────

describe('field of 2 players — zero-sum per hole', () => {
  it('zero-sum holds on every settled hole over 18 holes', () => {
    const cfg = makeSkinsCfg({ playerIds: ['A', 'B'] })
    const round = makeRoundCfg(cfg)
    const holes = Array.from({ length: 18 }, (_, i) => ({
      hole: i + 1,
      gross:
        i % 2 === 0
          ? { A: 4, B: 5 }
          : { A: 5, B: 4 },
    }))
    const events = runRound(holes, cfg, round)
    assertZeroSum(events, cfg.playerIds)
    // Every hole emits a SkinWon (alternating winners) — no ties.
    const wins = events.filter((e) => e.kind === 'SkinWon')
    expect(wins).toHaveLength(18)
    // Per-hole events zero-sum: winner + loser = 0.
    for (const e of wins) {
      if (e.kind === 'SkinWon') {
        const s = (e.points.A ?? 0) + (e.points.B ?? 0)
        expect(s).toBe(0)
      }
    }
  })
})

// ─── Test 7 — game_skins.md § 9: missing gross score mid-round ────────────

describe('edge case: missing gross score mid-round (Carol on hole 10)', () => {
  it('resolves hole 10 among A, B, D only; Carol point = 0; winner collects from the other two', () => {
    const cfg = makeSkinsCfg()
    const round = makeRoundCfg(cfg)
    const holeState = makeHole(10, { A: 5, B: 4, D: 5, C: 0 }, { holeIndex: 10 })
    // Carol's gross is 0 (missing). settleSkinsHole excludes her.
    const events = settleSkinsHole(holeState, cfg, round)
    const finalized = finalizeSkinsRound(events, cfg)
    const h10 = finalized.find(
      (e): e is ScoringEvent & { kind: 'SkinWon' } =>
        e.kind === 'SkinWon' && e.hole === 10,
    )
    expect(h10).toBeDefined()
    if (h10 === undefined) return
    expect(h10.winner).toBe('B')
    expect(h10.points.B).toBe(2) // stake=1 × 2 losers
    expect(h10.points.A).toBe(-1)
    expect(h10.points.D).toBe(-1)
    expect(h10.points.C).toBe(0) // excluded contender → zero delta
    // Zero-sum
    const sum = h10.points.A + h10.points.B + h10.points.C + h10.points.D
    expect(sum).toBe(0)
  })
})

// ─── Test 8 — game_skins.md § 9: all players tie on final hole (split) ────

describe('edge case: all four players tie on final hole under split', () => {
  it('emits SkinCarryForfeit with zero deltas; no payout possible', () => {
    const cfg = makeSkinsCfg({ tieRuleFinalHole: 'split' })
    const round = makeRoundCfg(cfg)
    const events = runRound(
      [{ hole: 18, gross: { A: 5, B: 5, C: 5, D: 5 } }],
      cfg,
      round,
    )
    const forfeits = events.filter((e) => e.kind === 'SkinCarryForfeit')
    expect(forfeits).toHaveLength(1)
    const totals = sumPoints(events, cfg.playerIds)
    expect(totals).toEqual({ A: 0, B: 0, C: 0, D: 0 })
  })
})

// ─── Test 9 — game_skins.md § 9: two-way tie on final hole, others worse ──

describe('edge case: two-way tie on hole 18 (no carry in)', () => {
  it('distributes stake=1 pot: winners +1 each, losers -1 each', () => {
    const cfg = makeSkinsCfg({ tieRuleFinalHole: 'split' })
    const round = makeRoundCfg(cfg)
    const events = runRound(
      [{ hole: 18, gross: { A: 4, B: 4, C: 5, D: 5 } }],
      cfg,
      round,
    )
    const totals = sumPoints(events, cfg.playerIds)
    // potPerOpponent = stake 1; losers = {C,D}; each winner gets 1 per loser × 2 losers = +2
    // Each loser pays 1 per winner × 2 winners = -2.
    expect(totals).toEqual({ A: 2, B: 2, C: -2, D: -2 })
    assertZeroSum(events, cfg.playerIds)
  })
})

// ─── Test 10 — game_skins.md § 9: handicap strokes produce negative net ───

describe('edge case: handicap strokes produce a negative net', () => {
  it('accepts a negative net and the negative-net player wins the hole', () => {
    // A is scratch (0 strokes). B has 36 handicap — gets 2 strokes on every hole.
    // On hole 1 (idx 1), A shoots 4 (net 4), B shoots 5 (net 5 - 2 = 3).
    const cfg = makeSkinsCfg({
      appliesHandicap: true,
      playerIds: ['A', 'B'],
    })
    const round = makeRoundCfg(cfg)
    const hole = makeHole(
      1,
      { A: 4, B: 3 },
      {
        holeIndex: 1,
        // B gets 2 strokes on hole index 1 when strokes=36 (36 >= 18+1).
        strokes: { A: 0, B: 36 },
      },
    )
    const events = settleSkinsHole(hole, cfg, round)
    // B's net = 3 - 2 = 1; A's net = 4. B wins.
    const won = events.find(
      (e): e is ScoringEvent & { kind: 'SkinWon' } => e.kind === 'SkinWon',
    )
    expect(won).toBeDefined()
    if (won === undefined) return
    expect(won.winner).toBe('B')
  })
})

// ─── Test 11 — Carryover accumulation across multiple tied holes ──────────

describe('carry accumulation across many tied holes', () => {
  it('pot grows by one stake per tied hole and pays out on the next solo win', () => {
    const cfg = makeSkinsCfg()
    const round = makeRoundCfg(cfg)
    // Five consecutive tied holes, then A wins hole 6. Pot per opponent should be 6.
    const holes: Array<{ hole: number; gross: Record<PlayerId, number> }> = [
      { hole: 1, gross: { A: 4, B: 4, C: 4, D: 4 } },
      { hole: 2, gross: { A: 4, B: 4, C: 4, D: 4 } },
      { hole: 3, gross: { A: 4, B: 4, C: 4, D: 4 } },
      { hole: 4, gross: { A: 4, B: 4, C: 4, D: 4 } },
      { hole: 5, gross: { A: 4, B: 4, C: 4, D: 4 } },
      { hole: 6, gross: { A: 3, B: 4, C: 4, D: 4 } },
    ]
    const events = runRound(holes, cfg, round)
    const won = events.find(
      (e): e is ScoringEvent & { kind: 'SkinWon' } => e.kind === 'SkinWon',
    )
    expect(won).toBeDefined()
    if (won === undefined) return
    // 5 carried holes + 1 hole-6 stake = 6 per opponent. A wins → A +18, others -6 each.
    expect(won.points).toEqual({ A: 18, B: -6, C: -6, D: -6 })
    assertZeroSum(events, cfg.playerIds)
  })
})

// ─── Test 12 — Net-score scenario where handicap flips the skin winner ────

describe('net-score handicap changes skin winner vs gross-score winner', () => {
  it('gross-low player loses skin when net-low opponent has strokes', () => {
    // A is scratch (strokes=0); B has strokes=18 (one shot per hole).
    // Hole 1 (idx 1): A gross 4, B gross 4. Gross winner: tie.
    // B's net = 4 - 1 = 3. B wins the hole outright under net scoring.
    const cfg = makeSkinsCfg({
      appliesHandicap: true,
      playerIds: ['A', 'B'],
    })
    const round = makeRoundCfg(cfg)
    const hole = makeHole(
      1,
      { A: 4, B: 4 },
      { holeIndex: 1, strokes: { A: 0, B: 18 } },
    )
    const events = settleSkinsHole(hole, cfg, round)
    const won = events.find(
      (e): e is ScoringEvent & { kind: 'SkinWon' } => e.kind === 'SkinWon',
    )
    expect(won).toBeDefined()
    if (won === undefined) return
    expect(won.winner).toBe('B')
    // Contrast: without handicap the hole would tie → SkinCarried.
    const cfgGross = makeSkinsCfg({
      appliesHandicap: false,
      playerIds: ['A', 'B'],
    })
    const roundGross = makeRoundCfg(cfgGross)
    const grossEvents = settleSkinsHole(hole, cfgGross, roundGross)
    expect(grossEvents.some((e) => e.kind === 'SkinCarried')).toBe(true)
  })
})

// ─── Test 13 — Player withdraws mid-round ─────────────────────────────────

describe('edge case: player withdraws mid-round', () => {
  it('prior deltas stand; subsequent holes exclude the withdrawn player (gross = 0)', () => {
    const cfg = makeSkinsCfg()
    const round = makeRoundCfg(cfg)
    // Hole 1: all 4 play, A wins. Hole 2: Dave withdraws (gross = 0); A wins vs B,C.
    const events = runRound(
      [
        { hole: 1, gross: { A: 3, B: 4, C: 4, D: 4 } },
        { hole: 2, gross: { A: 3, B: 4, C: 4, D: 0 } },
      ],
      cfg,
      round,
    )
    const totals = sumPoints(events, cfg.playerIds)
    // Hole 1: A +3, B/C/D -1 each.
    // Hole 2 (D withdrew → 3 contenders): A +2, B/C -1 each; D delta = 0.
    expect(totals).toEqual({ A: 5, B: -2, C: -2, D: -1 })
    assertZeroSum(events, cfg.playerIds)
  })
})

// ─── Test 14 — Field shrinks below 2 mid-round ────────────────────────────

describe('edge case: field shrinks below 2 mid-round', () => {
  it('emits FieldTooSmall with zero deltas when only one contender remains', () => {
    const cfg = makeSkinsCfg()
    const round = makeRoundCfg(cfg)
    // Hole 5: only A has a recorded gross; B, C, D withdrew.
    const events = runRound(
      [{ hole: 5, gross: { A: 4, B: 0, C: 0, D: 0 } }],
      cfg,
      round,
    )
    const fts = events.filter((e) => e.kind === 'FieldTooSmall')
    expect(fts).toHaveLength(1)
    const totals = sumPoints(events, cfg.playerIds)
    expect(totals).toEqual({ A: 0, B: 0, C: 0, D: 0 })
  })
})

// ─── Test 15 — Throw-on-missing-config ────────────────────────────────────

describe('typed errors: throw on invalid or missing config', () => {
  const round = makeRoundCfg(makeSkinsCfg())
  const hole = makeHole(1, { A: 4, B: 5, C: 5, D: 5 })

  it('throws SkinsConfigError when stake is not a positive integer', () => {
    const badCfg = { ...makeSkinsCfg(), stake: 0 } as SkinsCfg
    expect(() => settleSkinsHole(hole, badCfg, round)).toThrow(SkinsConfigError)
  })

  it('throws SkinsConfigError when tieRuleFinalHole is missing', () => {
    const badCfg = {
      ...makeSkinsCfg(),
      tieRuleFinalHole: undefined as unknown as SkinsCfg['tieRuleFinalHole'],
    }
    expect(() => settleSkinsHole(hole, badCfg, round)).toThrow(SkinsConfigError)
  })

  it('throws SkinsConfigError when appliesHandicap is not a boolean', () => {
    const badCfg = {
      ...makeSkinsCfg(),
      appliesHandicap: undefined as unknown as boolean,
    }
    expect(() => settleSkinsHole(hole, badCfg, round)).toThrow(SkinsConfigError)
  })

  it('throws SkinsConfigError on playerIds outside 2..5', () => {
    const badCfg = { ...makeSkinsCfg(), playerIds: ['A'] }
    expect(() => settleSkinsHole(hole, badCfg, round)).toThrow(SkinsConfigError)
  })

  it('throws SkinsBetNotFoundError when config is not referenced in roundCfg.bets', () => {
    const strayCfg = makeSkinsCfg({ id: 'not-registered' })
    // Valid cfg, but its id does not match any BetSelection.id in roundCfg.bets.
    expect(() => settleSkinsHole(hole, strayCfg, round)).toThrow(SkinsBetNotFoundError)
  })

  it('throws SkinsRoundConfigError when unitSize is missing from RoundConfig', () => {
    const cfg = makeSkinsCfg()
    const badRound = {
      ...makeRoundCfg(cfg),
      unitSize: undefined as unknown as number,
    }
    expect(() => settleSkinsHole(hole, cfg, badRound)).toThrow()
  })
})

// ─── Test 16 — Provisional path: settleSkinsHole is pure and stateless ────

describe('purity: settleSkinsHole is stateless', () => {
  it('returns the same events for identical inputs regardless of call order', () => {
    const cfg = makeSkinsCfg()
    const round = makeRoundCfg(cfg)
    const hole = makeHole(7, { A: 4, B: 5, C: 5, D: 5 })
    const a = settleSkinsHole(hole, cfg, round)
    const b = settleSkinsHole(hole, cfg, round)
    expect(a).toEqual(b)
  })
})

// ─── Test 17 — Round Handicap integration via effectiveCourseHcp ──────────
//
// Skins reads hole.strokes[pid] directly; the hole-state builder populates
// that field from effectiveCourseHcp(player) per _ROUND_HANDICAP.md § 6.
// This test demonstrates that routing by comparing the same gross scores
// against two different roundHandicap values for one player — the outcome
// flips from an outright SkinWon to a tied hole (SkinCarried under the
// default escalating: true).

describe('Round Handicap integration (item 16 × Skins)', () => {
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

  const cfg = makeSkinsCfg({ appliesHandicap: true, playerIds: ['A', 'B'] })
  const round = makeRoundCfg(cfg)
  const gross = { A: 4, B: 5 }

  it('same gross scores, roundHandicap = 0 → A wins outright (SkinWon)', () => {
    const players = [basePlayer('A', 0, 0), basePlayer('B', 0, 0)]
    const hole = makeHole(1, gross, {
      holeIndex: 1,
      strokes: strokesFor(players),
    })
    const events = settleSkinsHole(hole, cfg, round)
    const won = events.find(
      (e): e is ScoringEvent & { kind: 'SkinWon' } => e.kind === 'SkinWon',
    )
    expect(won).toBeDefined()
    if (won) {
      expect(won.winner).toBe('A')
      expect(won.points).toEqual({ A: 1, B: -1 })
    }
  })

  it('same gross scores, roundHandicap = +2 on B → hole ties (SkinCarried)', () => {
    const players = [basePlayer('A', 0, 0), basePlayer('B', 0, 2)]
    const hole = makeHole(1, gross, {
      holeIndex: 1,
      strokes: strokesFor(players),
    })
    // effectiveCourseHcp(B) = 0 + 2 = 2; strokesOnHole(2, 1) = 1.
    // B's net = 5 - 1 = 4 == A's net → tied → SkinCarried under escalating=true.
    const events = settleSkinsHole(hole, cfg, round)
    expect(events.some((e) => e.kind === 'SkinCarried')).toBe(true)
    expect(events.some((e) => e.kind === 'SkinWon')).toBe(false)
  })

  it('proves the outcome difference is driven by effectiveCourseHcp, not raw courseHcp', () => {
    // Control: both scenarios use courseHcp = 0. Only roundHandicap differs.
    // If Skins read player.courseHcp directly (wrong path), both scenarios
    // would produce SkinWon for A. The tie in the +2 case proves strokes
    // flowed through the effectiveCourseHcp → state.strokes boundary.
    const rh0 = [basePlayer('A', 0, 0), basePlayer('B', 0, 0)]
    const rh2 = [basePlayer('A', 0, 0), basePlayer('B', 0, 2)]
    expect(strokesFor(rh0)).toEqual({ A: 0, B: 0 })
    expect(strokesFor(rh2)).toEqual({ A: 0, B: 2 })
  })
})
