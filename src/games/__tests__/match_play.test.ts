import { describe, it, expect } from 'vitest'
import {
  settleMatchPlayHole,
  initialMatch,
  finalizeMatchPlayRound,
  concedeMatch,
  MatchPlayBetNotFoundError,
  type MatchState,
} from '../match_play'
import type {
  BetSelection,
  HoleState,
  JunkRoundConfig,
  MatchPlayCfg,
  PlayerId,
  PlayerSetup,
  RoundConfig,
} from '../types'

// ─── Fixtures ────────────────────────────────────────────────────────────────

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

function makeCfg(overrides: Partial<MatchPlayCfg> = {}): MatchPlayCfg {
  return {
    id: 'mp-1',
    stake: 1,
    format: 'singles',
    appliesHandicap: false,
    holesToPlay: 18,
    tieRule: 'halved',
    playerIds: ['A', 'B'],
    junkItems: [],
    junkMultiplier: 1,
    ...overrides,
  }
}

function makeRoundCfg(cfg: MatchPlayCfg): RoundConfig {
  const bet: BetSelection = {
    id: cfg.id,
    type: 'matchPlay',
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
  holeIndex: number,
  gross: Record<PlayerId, number>,
  opts: {
    par?: number
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
    holeIndex,
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

// Runs a sequence of holes through settleMatchPlayHole, threading MatchState.
function runHoles(
  holes: HoleState[],
  cfg: MatchPlayCfg,
  roundCfg: RoundConfig,
): { allEvents: ReturnType<typeof settleMatchPlayHole>['events']; finalMatch: MatchState } {
  let match = initialMatch(cfg)
  const allEvents: ReturnType<typeof settleMatchPlayHole>['events'] = []
  for (const h of holes) {
    const result = settleMatchPlayHole(h, cfg, roundCfg, match)
    allEvents.push(...result.events)
    match = result.match
  }
  return { allEvents, finalMatch: match }
}

// ─── § 1: Basic singles hole results (no handicap) ───────────────────────────

describe('§ 1 singles hole results (appliesHandicap: false)', () => {
  const cfg = makeCfg()
  const roundCfg = makeRoundCfg(cfg)
  let match = initialMatch(cfg)

  it('team1 wins when A gross < B gross', () => {
    const result = settleMatchPlayHole(makeHole(1, 7, { A: 3, B: 4 }), cfg, roundCfg, match)
    expect(result.events).toHaveLength(1)
    expect(result.events[0].kind).toBe('HoleResolved')
    expect((result.events[0] as { winner: string }).winner).toBe('team1')
    expect(result.match.holesUp).toBe(1)
    expect(result.match.holesPlayed).toBe(1)
    match = result.match
  })

  it('team2 wins when B gross < A gross', () => {
    const result = settleMatchPlayHole(makeHole(2, 3, { A: 5, B: 4 }), cfg, roundCfg, match)
    expect(result.events[0].kind).toBe('HoleResolved')
    expect((result.events[0] as { winner: string }).winner).toBe('team2')
    expect(result.match.holesUp).toBe(0)
    match = result.match
  })

  it('halved when gross scores are equal', () => {
    const result = settleMatchPlayHole(makeHole(3, 5, { A: 4, B: 4 }), cfg, roundCfg, match)
    expect(result.events[0].kind).toBe('HoleHalved')
    expect(result.match.holesUp).toBe(0)
  })

  it('no events emitted when match already closedOut', () => {
    const closedMatch: MatchState = { holesUp: 3, holesPlayed: 15, closedOut: true }
    const result = settleMatchPlayHole(makeHole(16, 4, { A: 4, B: 5 }), cfg, roundCfg, closedMatch)
    expect(result.events).toHaveLength(0)
    expect(result.match).toBe(closedMatch)
  })
})

// ─── § 2: Handicap allocation ─────────────────────────────────────────────────

describe('§ 2 singles handicap allocation', () => {
  const cfg = makeCfg({ appliesHandicap: true })
  const roundCfg = makeRoundCfg(cfg)

  it('strokes on hole benefit the higher-handicap player', () => {
    // A hcp=0, B hcp=5; hcpIndex=3 → B gets 1 stroke → B net = gross - 1
    const hole = makeHole(2, 3, { A: 4, B: 4 }, { strokes: { A: 0, B: 5 } })
    const result = settleMatchPlayHole(hole, cfg, roundCfg, initialMatch(cfg))
    // B net = 4 - strokesOnHole(5, 3) = 4 - 1 = 3; A net = 4; B wins
    expect(result.events[0].kind).toBe('HoleResolved')
    expect((result.events[0] as { winner: string }).winner).toBe('team2')
  })

  it('no-handicap hole: gross scores compared directly (hcpIndex=7, B hcp=5 → 0 strokes)', () => {
    const hole = makeHole(1, 7, { A: 4, B: 4 }, { strokes: { A: 0, B: 5 } })
    const result = settleMatchPlayHole(hole, cfg, roundCfg, initialMatch(cfg))
    // B net = 4 - strokesOnHole(5, 7) = 4 - 0 = 4; A net = 4; halved
    expect(result.events[0].kind).toBe('HoleHalved')
  })
})

// ─── § 3: Closeout trigger ────────────────────────────────────────────────────

describe('§ 3 closeout trigger', () => {
  const cfg = makeCfg()
  const roundCfg = makeRoundCfg(cfg)

  it('emits MatchClosedOut when |holesUp| > holesRemaining', () => {
    // 4 up after 14 holes → holesRemaining = 4; 4 > 4 is false.
    // 5 up after 14 holes → holesRemaining = 4; 5 > 4 → closeout.
    const preMatch: MatchState = { holesUp: 4, holesPlayed: 14, closedOut: false }
    const result = settleMatchPlayHole(makeHole(15, 4, { A: 3, B: 4 }), cfg, roundCfg, preMatch)
    // A wins hole 15 → holesUp = 5; holesPlayed = 15; holesRemaining = 3; 5 > 3 → closedOut
    expect(result.events).toHaveLength(2)
    expect(result.events[0].kind).toBe('HoleResolved')
    expect(result.events[1].kind).toBe('MatchClosedOut')
    const closeout = result.events[1] as {
      kind: string; holesUp: number; holesRemaining: number; points: Record<string, number>
    }
    expect(closeout.holesUp).toBe(5)
    expect(closeout.holesRemaining).toBe(3)
    expect(closeout.points['A']).toBe(1)
    expect(closeout.points['B']).toBe(-1)
    expect(Object.values(closeout.points).reduce((s, v) => s + v, 0)).toBe(0)
    expect(result.match.closedOut).toBe(true)
  })

  it('does NOT close out when |holesUp| === holesRemaining (dormie)', () => {
    // 4 up after 14 holes (dormie) — 4 > 4 is false
    const preMatch: MatchState = { holesUp: 3, holesPlayed: 14, closedOut: false }
    const result = settleMatchPlayHole(makeHole(15, 4, { A: 3, B: 4 }), cfg, roundCfg, preMatch)
    // A wins → holesUp = 4; holesRemaining = 3; 4 > 3 → closes out
    // Wait, 18 - 15 = 3; 4 > 3 → yes it does. Let me use different numbers.
    // holesUp = 3, holesPlayed = 13 → remaining = 5; A wins → 4 > 4 = false. Dormie.
    const preMatchDormie: MatchState = { holesUp: 3, holesPlayed: 13, closedOut: false }
    const resultDormie = settleMatchPlayHole(makeHole(14, 4, { A: 3, B: 4 }), cfg, roundCfg, preMatchDormie)
    // A wins → holesUp = 4; holesPlayed = 14; holesRemaining = 4; 4 > 4 is false → no closeout
    expect(resultDormie.match.closedOut).toBe(false)
    expect(resultDormie.events.filter(e => e.kind === 'MatchClosedOut')).toHaveLength(0)
  })

  it('halved hole can trigger closeout if prior lead is big enough', () => {
    // holesUp = -6, holesPlayed = 13 → remaining after H14 = 4; 6 > 4 → closeout
    const preMatch: MatchState = { holesUp: -6, holesPlayed: 13, closedOut: false }
    const result = settleMatchPlayHole(makeHole(14, 12, { A: 5, B: 5 }), cfg, roundCfg, preMatch)
    // Halved → holesUp stays -6; holesPlayed = 14; holesRemaining = 4; 6 > 4 → closedOut
    expect(result.events[0].kind).toBe('HoleHalved')
    expect(result.events[1].kind).toBe('MatchClosedOut')
    const closeout = result.events[1] as {
      holesUp: number; holesRemaining: number; points: Record<string, number>
    }
    expect(closeout.holesUp).toBe(6)          // absolute value
    expect(closeout.holesRemaining).toBe(4)
    expect(closeout.points['A']).toBe(-1)     // team2 (B) wins
    expect(closeout.points['B']).toBe(1)
    expect(result.match.closedOut).toBe(true)
  })
})

// ─── § 4: Error handling ──────────────────────────────────────────────────────

describe('§ 4 error: bet not found', () => {
  it('throws MatchPlayBetNotFoundError when cfg.id not in roundCfg.bets', () => {
    const cfg = makeCfg({ id: 'mp-missing' })
    const roundCfg = makeRoundCfg(makeCfg({ id: 'mp-other' }))
    expect(() =>
      settleMatchPlayHole(makeHole(1, 7, { A: 4, B: 5 }), cfg, roundCfg, initialMatch(cfg)),
    ).toThrow(MatchPlayBetNotFoundError)
  })
})

// ─── § 10 worked example (§ 12 Test 1) ───────────────────────────────────────
//
// Alice (hcp 0) vs Bob (hcp 5). Bob receives strokes where hcpIndex ≤ 5.
// Paper arithmetic (gross → net, winner, holesUp):
//   H1 idx7:  A5→5  B4→4   team2  holesUp=-1
//   H2 idx3:  A4→4  B5→4   halved holesUp=-1
//   H3 idx15: A4→4  B3→3   team2  holesUp=-2
//   H4 idx1:  A5→5  B5→4   team2  holesUp=-3
//   H5 idx11: A4→4  B4→4   halved holesUp=-3
//   H6 idx17: A4→4  B3→3   team2  holesUp=-4
//   H7 idx5:  A4→4  B5→4   halved holesUp=-4
//   H8 idx9:  A5→5  B6→6   team1  holesUp=-3
//   H9 idx13: A5→5  B4→4   team2  holesUp=-4
//  H10 idx8:  A4→4  B4→4   halved holesUp=-4
//  H11 idx16: A4→4  B3→3   team2  holesUp=-5
//  H12 idx2:  A5→5  B5→4   team2  holesUp=-6  holesRemaining=6  |6|>6=false
//  H13 idx6:  A4→4  B4→4   halved holesUp=-6  holesRemaining=5  |6|>5 → CLOSEOUT
//   Σ: A=-1 B=+1 = 0 ✓  (B wins 6 & 5)

describe('§ 10 worked example / § 12 Test 1 (singles, handicap, Bob wins 6&5)', () => {
  const alice = 'alice'
  const bob = 'bob'
  const cfg = makeCfg({
    id: 'mp-worked',
    stake: 1,
    appliesHandicap: true,
    playerIds: [alice, bob],
  })
  const roundCfg = makeRoundCfg(cfg)
  // Bob's courseHcp = 5; Alice's = 0 (pair-wise USGA allocation pre-computed by caller)
  const bobStroke = { [alice]: 0, [bob]: 5 }

  // prettier-ignore
  const holeData = [
    { h: 1,  idx: 7,  aG: 5, bG: 4, par: 4  },
    { h: 2,  idx: 3,  aG: 4, bG: 5, par: 4  },
    { h: 3,  idx: 15, aG: 4, bG: 3, par: 3  },
    { h: 4,  idx: 1,  aG: 5, bG: 5, par: 5  },
    { h: 5,  idx: 11, aG: 4, bG: 4, par: 4  },
    { h: 6,  idx: 17, aG: 4, bG: 3, par: 3  },
    { h: 7,  idx: 5,  aG: 4, bG: 5, par: 4  },
    { h: 8,  idx: 9,  aG: 5, bG: 6, par: 5  },
    { h: 9,  idx: 13, aG: 5, bG: 4, par: 4  },
    { h: 10, idx: 8,  aG: 4, bG: 4, par: 4  },
    { h: 11, idx: 16, aG: 4, bG: 3, par: 3  },
    { h: 12, idx: 2,  aG: 5, bG: 5, par: 5  },
    { h: 13, idx: 6,  aG: 4, bG: 4, par: 4  },
  ]

  const holes = holeData.map(({ h, idx, aG, bG, par }) =>
    makeHole(h, idx, { [alice]: aG, [bob]: bG }, { par, strokes: bobStroke }),
  )

  const { allEvents, finalMatch } = runHoles(holes, cfg, roundCfg)

  it('MatchClosedOut fires after hole 13 with holesUp=6, holesRemaining=5', () => {
    const closeouts = allEvents.filter(e => e.kind === 'MatchClosedOut')
    expect(closeouts).toHaveLength(1)
    const c = closeouts[0] as { hole: number; holesUp: number; holesRemaining: number }
    expect(c.hole).toBe(13)
    expect(c.holesUp).toBe(6)
    expect(c.holesRemaining).toBe(5)
  })

  it('deltas are { alice: -1, bob: +1 } and Σ = 0', () => {
    const closeout = allEvents.find(e => e.kind === 'MatchClosedOut') as
      { points: Record<string, number> }
    expect(closeout.points[alice]).toBe(-1)
    expect(closeout.points[bob]).toBe(1)
    expect(closeout.points[alice] + closeout.points[bob]).toBe(0)
  })

  it('all deltas are integers', () => {
    const closeout = allEvents.find(e => e.kind === 'MatchClosedOut') as
      { points: Record<string, number> }
    for (const v of Object.values(closeout.points)) {
      expect(Number.isInteger(v)).toBe(true)
    }
  })

  it('no HoleResolved events for holes 14–18', () => {
    const resolved = allEvents.filter(
      e => e.kind === 'HoleResolved' && (e as { hole: number }).hole >= 14,
    )
    expect(resolved).toHaveLength(0)
  })

  it('exactly 5 HoleHalved events on holes 2, 5, 7, 10, 13', () => {
    const halved = allEvents.filter(e => e.kind === 'HoleHalved')
    expect(halved).toHaveLength(5)
    const halvedHoles = halved.map(e => (e as { hole: number }).hole).sort((a, b) => a - b)
    expect(halvedHoles).toEqual([2, 5, 7, 10, 13])
  })

  it('final MatchState: holesUp=-6, holesPlayed=13, closedOut=true', () => {
    expect(finalMatch.holesUp).toBe(-6)
    expect(finalMatch.holesPlayed).toBe(13)
    expect(finalMatch.closedOut).toBe(true)
  })
})

// ─── § 4a: MatchConfigInvalid — non-singles team validation ──────────────────

describe('§ 4a MatchConfigInvalid (non-singles team validation)', () => {
  const alice = 'alice', bob = 'bob', carol = 'carol', dave = 'dave'
  const bbPlayerIds: PlayerId[] = [alice, bob, carol, dave]
  const goodHole = makeHole(1, 7, { [alice]: 4, [bob]: 4, [carol]: 4, [dave]: 4 })

  it('emits MatchConfigInvalid when teams is missing for best-ball format', () => {
    const cfg = makeCfg({ format: 'best-ball', playerIds: bbPlayerIds })
    const result = settleMatchPlayHole(goodHole, cfg, makeRoundCfg(cfg), initialMatch(cfg))
    expect(result.events).toHaveLength(1)
    expect(result.events[0].kind).toBe('MatchConfigInvalid')
    expect(result.match.holesPlayed).toBe(0)
  })

  it('emits MatchConfigInvalid when a team has wrong member count', () => {
    const cfg = makeCfg({
      format: 'best-ball',
      playerIds: bbPlayerIds,
      teams: [[alice] as unknown as [PlayerId, PlayerId], [carol, dave]],
    })
    const result = settleMatchPlayHole(goodHole, cfg, makeRoundCfg(cfg), initialMatch(cfg))
    expect(result.events[0].kind).toBe('MatchConfigInvalid')
  })

  it('emits MatchConfigInvalid when team member is not in playerIds', () => {
    const cfg = makeCfg({
      format: 'best-ball',
      playerIds: bbPlayerIds,
      teams: [[alice, 'stranger'], [carol, dave]],
    })
    const result = settleMatchPlayHole(goodHole, cfg, makeRoundCfg(cfg), initialMatch(cfg))
    expect(result.events[0].kind).toBe('MatchConfigInvalid')
  })

  it('emits MatchConfigInvalid when duplicate player ID across teams', () => {
    const cfg = makeCfg({
      format: 'best-ball',
      playerIds: bbPlayerIds,
      teams: [[alice, alice], [carol, dave]],
    })
    const result = settleMatchPlayHole(goodHole, cfg, makeRoundCfg(cfg), initialMatch(cfg))
    expect(result.events[0].kind).toBe('MatchConfigInvalid')
  })
})

// ─── § 12 Test 3 (best-ball, stake 100, AB wins 3&2) ─────────────────────────
//
// Teams: (alice, bob) vs (carol, dave). AB wins H1–H3 (alice best-ball=3 < carol best-ball=4).
// H4–H16 halved (both teams best-ball=4). At H16: holesUp=+3, holesRemaining=2; |3|>2 → closedOut.
// stake=100, teamSize=2 → 100%2=0 → no RoundingAdjustment.
//   MatchClosedOut.points: alice+50, bob+50, carol-50, dave-50; Σ=0 ✓

describe('§ 12 Test 3 (best-ball, stake 100, AB wins 3&2)', () => {
  const alice = 'alice', bob = 'bob', carol = 'carol', dave = 'dave'
  const cfg = makeCfg({
    id: 'mp-bb',
    stake: 100,
    format: 'best-ball',
    appliesHandicap: false,
    playerIds: [alice, bob, carol, dave],
    teams: [[alice, bob], [carol, dave]],
  })
  const roundCfg = makeRoundCfg(cfg)

  // AB-win: alice best-ball=min(3,7)=3, CD best-ball=min(4,5)=4 → AB wins
  // halved: alice best-ball=min(4,7)=4, CD best-ball=min(4,5)=4 → halved
  const bb3and2Holes = [
    ...Array.from({ length: 3 }, (_, i) =>
      makeHole(i + 1, i + 1, { [alice]: 3, [bob]: 7, [carol]: 4, [dave]: 5 }),
    ),
    ...Array.from({ length: 13 }, (_, i) =>
      makeHole(i + 4, i + 4, { [alice]: 4, [bob]: 7, [carol]: 4, [dave]: 5 }),
    ),
  ]

  const { allEvents, finalMatch } = runHoles(bb3and2Holes, cfg, roundCfg)

  it('MatchClosedOut fires at hole 16 with holesUp=3, holesRemaining=2', () => {
    const closeouts = allEvents.filter(e => e.kind === 'MatchClosedOut')
    expect(closeouts).toHaveLength(1)
    const c = closeouts[0] as { hole: number; holesUp: number; holesRemaining: number }
    expect(c.hole).toBe(16)
    expect(c.holesUp).toBe(3)
    expect(c.holesRemaining).toBe(2)
  })

  it('per-player deltas: alice+50, bob+50, carol-50, dave-50; Σ=0', () => {
    const closeout = allEvents.find(e => e.kind === 'MatchClosedOut') as
      { points: Record<string, number> }
    expect(closeout.points[alice]).toBe(50)
    expect(closeout.points[bob]).toBe(50)
    expect(closeout.points[carol]).toBe(-50)
    expect(closeout.points[dave]).toBe(-50)
    expect(Object.values(closeout.points).reduce((s, v) => s + v, 0)).toBe(0)
  })

  it('all per-player deltas are integers', () => {
    const closeout = allEvents.find(e => e.kind === 'MatchClosedOut') as
      { points: Record<string, number> }
    for (const v of Object.values(closeout.points)) {
      expect(Number.isInteger(v)).toBe(true)
    }
  })

  it('final MatchState: closedOut=true, holesPlayed=16, holesUp=3', () => {
    expect(finalMatch.closedOut).toBe(true)
    expect(finalMatch.holesPlayed).toBe(16)
    expect(finalMatch.holesUp).toBe(3)
  })
})

// ─── Gap 7 rounding (best-ball, stake 101, lex-lowest absorbs) ───────────────
//
// Paper arithmetic (stake=101, teamSize=2, AB wins):
//   baseMag = floor(101/2) = 50; baseAmt_win=+50, baseAmt_lose=-50
//   win remainder = 101 − 50×2 = +1 → lex-lowest of team absorbs
//   lose remainder = −101 − (−50×2) = −1 → lex-lowest of team absorbs
//   sort(['alice','bob'])[0] = 'alice'; sort(['carol','dave'])[0] = 'carol'
//   Final: alice=+51, bob=+50, carol=−51, dave=−50; Σ=51+50−51−50=0 ✓

describe('Gap 7 rounding (best-ball, stake 101, lex-lowest absorbs remainder)', () => {
  const alice = 'alice', bob = 'bob', carol = 'carol', dave = 'dave'
  // Same winning hole sequence as Test 3
  const bbWinHoles = [
    ...Array.from({ length: 3 }, (_, i) =>
      makeHole(i + 1, i + 1, { [alice]: 3, [bob]: 7, [carol]: 4, [dave]: 5 }),
    ),
    ...Array.from({ length: 13 }, (_, i) =>
      makeHole(i + 4, i + 4, { [alice]: 4, [bob]: 7, [carol]: 4, [dave]: 5 }),
    ),
  ]

  it('[alice,bob] team stake 101: alice (lex-lowest) absorbs +1; Σ over all events = 0', () => {
    const cfg = makeCfg({
      id: 'mp-round',
      stake: 101,
      format: 'best-ball',
      appliesHandicap: false,
      playerIds: [alice, bob, carol, dave],
      teams: [[alice, bob], [carol, dave]],
    })
    const { allEvents } = runHoles(bbWinHoles, cfg, makeRoundCfg(cfg))
    const roundingEvts = allEvents.filter(e => e.kind === 'RoundingAdjustment')
    expect(roundingEvts).toHaveLength(2)
    // Winning team: alice (lex-lowest of [alice,bob]) absorbs +1
    const aliceAdj = roundingEvts.find(
      e => (e as { absorbingPlayer: string }).absorbingPlayer === alice,
    )
    expect(aliceAdj).toBeDefined()
    expect((aliceAdj as { points: Record<string, number> }).points[alice]).toBe(1)
    // Losing team: carol (lex-lowest of [carol,dave]) absorbs -1
    const carolAdj = roundingEvts.find(
      e => (e as { absorbingPlayer: string }).absorbingPlayer === carol,
    )
    expect(carolAdj).toBeDefined()
    expect((carolAdj as { points: Record<string, number> }).points[carol]).toBe(-1)
    const total = allEvents.reduce((sum, e) => {
      const pts = (e as { points?: Record<string, number> }).points ?? {}
      return sum + Object.values(pts).reduce((s, v) => s + v, 0)
    }, 0)
    expect(total).toBe(0)
  })

  it('[bob,alice] team stake 101: alice still absorbs +1 (lex sort, not array order)', () => {
    const cfg = makeCfg({
      id: 'mp-round-rev',
      stake: 101,
      format: 'best-ball',
      appliesHandicap: false,
      playerIds: [alice, bob, carol, dave],
      teams: [[bob, alice], [carol, dave]],
    })
    const { allEvents } = runHoles(bbWinHoles, cfg, makeRoundCfg(cfg))
    const roundingEvts = allEvents.filter(e => e.kind === 'RoundingAdjustment')
    // Winning team: alice is lex-lowest of [bob,alice] by sort, not by array position
    const aliceAdj = roundingEvts.find(
      e => (e as { absorbingPlayer: string }).absorbingPlayer === alice,
    )
    expect(aliceAdj).toBeDefined()
    expect((aliceAdj as { points: Record<string, number> }).points[alice]).toBe(1)
    // Losing team: carol (lex-lowest of [carol,dave]) absorbs -1 regardless of winning-team array order
    const carolAdj = roundingEvts.find(
      e => (e as { absorbingPlayer: string }).absorbingPlayer === carol,
    )
    expect(carolAdj).toBeDefined()
    expect((carolAdj as { points: Record<string, number> }).points[carol]).toBe(-1)
  })
})

// ─── finalizeMatchPlayRound (Phase 3) ────────────────────────────────────────
//
// § 6 rule: tied match at holesToPlay → MatchHalved, zero deltas.
// § 6 / Plan: decided open match at boundary → MatchClosedOut with correct delta.
// Plan idempotent clause: match.closedOut === true → return { events: [], match }.

describe('finalizeMatchPlayRound', () => {
  it('§ 12 Test 2: tied match at holesToPlay emits MatchHalved', () => {
    const cfg = makeCfg({ stake: 1, playerIds: ['A', 'B'] })
    const match: MatchState = { holesUp: 0, holesPlayed: 18, closedOut: false }
    const { events, match: out } = finalizeMatchPlayRound(cfg, makeRoundCfg(cfg), match)
    expect(events).toHaveLength(1)
    expect(events[0].kind).toBe('MatchHalved')
    if (events[0].kind === 'MatchHalved') {
      expect(events[0].matchId).toBe(cfg.id)
      expect(events[0].hole).toBe(cfg.holesToPlay)
    }
    expect(out.closedOut).toBe(true)
  })

  it('§ 12 Test 2: MatchHalved carries no monetary movement, Σ = 0 for all playerIds', () => {
    const cfg = makeCfg({ stake: 1, playerIds: ['A', 'B'] })
    const match: MatchState = { holesUp: 0, holesPlayed: 18, closedOut: false }
    const { events } = finalizeMatchPlayRound(cfg, makeRoundCfg(cfg), match)
    const totalDelta: Record<string, number> = {}
    for (const e of events) {
      const pts = (e as { points?: Record<string, number> }).points ?? {}
      for (const [pid, amt] of Object.entries(pts)) {
        totalDelta[pid] = (totalDelta[pid] ?? 0) + amt
      }
    }
    for (const pid of cfg.playerIds) {
      expect(totalDelta[pid] ?? 0).toBe(0)
    }
  })

  it('decided match at holesToPlay emits MatchClosedOut with correct delta', () => {
    // holesUp=+2 (A leads), stake=100 → A wins → { A: +100, B: -100 }, Σ=0
    const cfg = makeCfg({ stake: 100, playerIds: ['A', 'B'] })
    const match: MatchState = { holesUp: 2, holesPlayed: 18, closedOut: false }
    const { events, match: out } = finalizeMatchPlayRound(cfg, makeRoundCfg(cfg), match)
    expect(events).toHaveLength(1)
    expect(events[0].kind).toBe('MatchClosedOut')
    if (events[0].kind === 'MatchClosedOut') {
      expect(events[0].points['A']).toBe(100)
      expect(events[0].points['B']).toBe(-100)
      expect(Object.values(events[0].points).reduce((s, v) => s + v, 0)).toBe(0)
    }
    expect(out.closedOut).toBe(true)
  })

  it('already-closed match returns [] and unchanged MatchState (idempotent)', () => {
    const cfg = makeCfg()
    const match: MatchState = { holesUp: 3, holesPlayed: 14, closedOut: true }
    const result = finalizeMatchPlayRound(cfg, makeRoundCfg(cfg), match)
    expect(result.events).toHaveLength(0)
    expect(result.match).toBe(match)
  })
})

// ─── Phase 4a: Round Handicap caller-applies (_ROUND_HANDICAP.md § 6) ─────────
//
// Engine reads state.strokes[pid]; caller pre-populates from
// effectiveCourseHcp = courseHcp + roundHandicap.
// No engine modification needed — caller-applies model per rule doc § 6.
//
// Pre-write three-winner arithmetic:
//
// Test 1 (singles, hcpIndex=7): A.gross=4, A.strokes=0; B.gross=5, B.courseHcp=6, B.roundHandicap=10
//   W_adj   (strokes[B]=16): A net=4-strokesOnHole(0,7)=4; B net=5-strokesOnHole(16,7)=5-1=4 → halved
//   W_unadj (strokes[B]=6):  A net=4;                       B net=5-strokesOnHole(6,7)=5-0=5 → team1
//   W_double(strokes[B]=26): A net=4;                       B net=5-strokesOnHole(26,7)=5-2=3 → team2
//   All distinct ✓

describe('Phase 4a: Round Handicap caller-applies (_ROUND_HANDICAP.md § 6)', () => {
  it('singles: caller pre-adjusts strokes to effectiveCourseHcp; net scores reflect roundHandicap', () => {
    // B.courseHcp=6, B.roundHandicap=10 → effectiveCourseHcp=16. A is scratch (strokes=0).
    // Gross A=4, B=5, hcpIndex=7. Caller sets strokes[B]=16.
    // A net=4, B net=5-strokesOnHole(16,7)=4 → HoleHalved.
    const cfg = makeCfg({ appliesHandicap: true, playerIds: ['A', 'B'] })
    const hole = makeHole(7, 7, { A: 4, B: 5 }, { strokes: { A: 0, B: 16 } })
    const result = settleMatchPlayHole(hole, cfg, makeRoundCfg(cfg), initialMatch(cfg))
    expect(result.events[0].kind).toBe('HoleHalved')
    expect(result.match.holesUp).toBe(0)
  })

})

// ─── § 12 Test 4 — Conceded match (concedeMatch) ─────────────────────────────
//
// Pre-write arithmetic:
//   match: holesUp = +3 (A leads, B is 3 down), holesPlayed = 10
//   B concedes → A wins → points = { A: +1, B: -1 }
//   holesUp (event) = Math.abs(+3) = 3
//   holesRemaining = 18 - 10 = 8

describe('§ 12 Test 4 — Conceded match (concedeMatch)', () => {
  const cfg = makeCfg({ playerIds: ['A', 'B'], stake: 1 })
  const roundCfg = makeRoundCfg(cfg)
  const preMatch: MatchState = { holesUp: 3, holesPlayed: 10, closedOut: false }
  const { events, match } = concedeMatch(cfg, roundCfg, preMatch, 'B', 10)

  it('emits exactly 2 events in order: ConcessionRecorded then MatchClosedOut', () => {
    expect(events).toHaveLength(2)
    expect(events[0].kind).toBe('ConcessionRecorded')
    expect(events[1].kind).toBe('MatchClosedOut')
  })

  it('ConcessionRecorded has unit=match, conceder=B, hole=10', () => {
    const cr = events[0] as { unit: string; conceder: string; hole: number }
    expect(cr.unit).toBe('match')
    expect(cr.conceder).toBe('B')
    expect(cr.hole).toBe(10)
  })

  it('MatchClosedOut has holesUp=3, holesRemaining=8', () => {
    const co = events[1] as { holesUp: number; holesRemaining: number }
    expect(co.holesUp).toBe(3)
    expect(co.holesRemaining).toBe(8)
  })

  it('points = { A: +1, B: -1 }, Σ = 0', () => {
    const co = events[1] as { points: Record<string, number> }
    expect(co.points['A']).toBe(1)
    expect(co.points['B']).toBe(-1)
    expect(Object.values(co.points).reduce((s, v) => s + v, 0)).toBe(0)
  })

  it('match.closedOut = true', () => {
    expect(match.closedOut).toBe(true)
  })
})

// ─── § 12 Test 5 — Hole concession closes out the match (Gap 4 ordering) ──────
//
// Pre-write arithmetic:
//   preMatch: holesUp = +3 (A leads), holesPlayed = 15
//   B concedes H16 → winner = team1; advance: holesUp = +4, holesPlayed = 16
//   holesRemaining = 18 - 16 = 2; |4| > 2 → closedOut
//   Events: [ConcessionRecorded(unit=hole, hole=16, conceder=B), MatchClosedOut(holesUp=4, holesRemaining=2)]
//   No HoleResolved. points = { A: +1, B: -1 }, Σ = 0.

describe('§ 12 Test 5 — Hole concession closes out the match (Gap 4 ordering)', () => {
  const cfg = makeCfg({ playerIds: ['A', 'B'], stake: 1 })
  const roundCfg = makeRoundCfg(cfg)
  const preMatch: MatchState = { holesUp: 3, holesPlayed: 15, closedOut: false }
  // Gross scores present but irrelevant — concession short-circuits net-score comparison.
  const h16: ReturnType<typeof makeHole> = { ...makeHole(16, 6, { A: 4, B: 5 }), conceded: ['B'] }
  const { events, match } = settleMatchPlayHole(h16, cfg, roundCfg, preMatch)

  it('exactly 2 events emitted in order: ConcessionRecorded then MatchClosedOut', () => {
    expect(events).toHaveLength(2)
    expect(events[0].kind).toBe('ConcessionRecorded')
    expect(events[1].kind).toBe('MatchClosedOut')
  })

  it('ConcessionRecorded has unit=hole, conceder=B, hole=16', () => {
    const cr = events[0] as { unit: string; conceder: string; hole: number }
    expect(cr.unit).toBe('hole')
    expect(cr.conceder).toBe('B')
    expect(cr.hole).toBe(16)
  })

  it('MatchClosedOut has holesUp=4, holesRemaining=2', () => {
    const co = events[1] as { holesUp: number; holesRemaining: number }
    expect(co.holesUp).toBe(4)
    expect(co.holesRemaining).toBe(2)
  })

  it('no HoleResolved event — ConcessionRecorded is the hole resolution event', () => {
    expect(events.filter((e) => e.kind === 'HoleResolved')).toHaveLength(0)
  })

  it('points = { A: +1, B: -1 }, Σ = 0', () => {
    const co = events[1] as { points: Record<string, number> }
    expect(co.points['A']).toBe(1)
    expect(co.points['B']).toBe(-1)
    expect(Object.values(co.points).reduce((s, v) => s + v, 0)).toBe(0)
  })

  it('match.closedOut = true, holesUp = 4, holesPlayed = 16', () => {
    expect(match.closedOut).toBe(true)
    expect(match.holesUp).toBe(4)
    expect(match.holesPlayed).toBe(16)
  })
})

// ─── Phase 4c — Missing score / HoleForfeited (§ 9 + § 5 Gap 9) ──────────────

// ─── § Phase 4c Test 1: singles A missing, forfeits hole to B ────────────────
//
// Pre-write arithmetic:
//   gross = { B: 4 } (A absent) → A forfeits → team2 (B) wins → holesUp = −1, holesPlayed = 1

describe('§ Phase 4c — singles: A missing score forfeits hole to B', () => {
  const cfg = makeCfg({ playerIds: ['A', 'B'], stake: 1 })
  const roundCfg = makeRoundCfg(cfg)
  // A's gross is absent from the record; B's is present.
  const h1: ReturnType<typeof makeHole> = { ...makeHole(1, 7, { B: 4 }), gross: { B: 4 } }
  const { events, match } = settleMatchPlayHole(h1, cfg, roundCfg, initialMatch(cfg))

  it('emits exactly 1 event of kind HoleForfeited', () => {
    expect(events).toHaveLength(1)
    expect(events[0].kind).toBe('HoleForfeited')
  })

  it('HoleForfeited has forfeiter=A and hole=1', () => {
    const ev = events[0] as { forfeiter: string; hole: number }
    expect(ev.forfeiter).toBe('A')
    expect(ev.hole).toBe(1)
  })

  it('no HoleResolved; match.holesUp=-1, holesPlayed=1', () => {
    expect(events.filter((e) => e.kind === 'HoleResolved')).toHaveLength(0)
    expect(match.holesUp).toBe(-1)
    expect(match.holesPlayed).toBe(1)
  })
})

// ─── § Phase 4c Test 2: singles B missing, forfeits hole to A ────────────────
//
// Pre-write: gross = { A: 3 } (B absent) → B forfeits → team1 (A) wins → holesUp = +1

describe('§ Phase 4c — singles: B missing score forfeits hole to A', () => {
  const cfg = makeCfg({ playerIds: ['A', 'B'], stake: 1 })
  const roundCfg = makeRoundCfg(cfg)
  const h1: ReturnType<typeof makeHole> = { ...makeHole(1, 7, { A: 3 }), gross: { A: 3 } }
  const { events, match } = settleMatchPlayHole(h1, cfg, roundCfg, initialMatch(cfg))

  it('HoleForfeited with forfeiter=B', () => {
    expect(events[0].kind).toBe('HoleForfeited')
    expect((events[0] as { forfeiter: string }).forfeiter).toBe('B')
  })

  it('match.holesUp=+1 (A wins hole)', () => {
    expect(match.holesUp).toBe(1)
  })
})

// ─── § Phase 4c Test 3: best-ball partial miss, A absent, B's score counts ───
//
// Teams [alice,bob] vs [carol,dave]. alice gross absent; bob=3; carol=4, dave=5.
// bestNet([alice,bob]) = min(bob's net) = 3; bestNet([carol,dave]) = min(4,5) = 4.
// team1 (alice,bob) wins via bob's score — no HoleForfeited.

describe('§ Phase 4c — best-ball partial miss: alice absent, bob score counts, AB wins', () => {
  const alice = 'alice', bob = 'bob', carol = 'carol', dave = 'dave'
  const cfg = makeCfg({
    id: 'mp-bb-pm',
    format: 'best-ball',
    appliesHandicap: false,
    playerIds: [alice, bob, carol, dave],
    teams: [[alice, bob], [carol, dave]],
  })
  const roundCfg = makeRoundCfg(cfg)
  // alice's gross absent; others present.
  const h1 = {
    ...makeHole(1, 7, { [bob]: 3, [carol]: 4, [dave]: 5 }),
    gross: { [bob]: 3, [carol]: 4, [dave]: 5 },
  }
  const { events, match } = settleMatchPlayHole(h1, cfg, roundCfg, initialMatch(cfg))

  it('no HoleForfeited emitted', () => {
    expect(events.filter((e) => e.kind === 'HoleForfeited')).toHaveLength(0)
  })

  it('emits HoleResolved with winner=team1 (AB wins via bob)', () => {
    expect(events).toHaveLength(1)
    expect(events[0].kind).toBe('HoleResolved')
    expect((events[0] as { winner: string }).winner).toBe('team1')
  })

  it('match.holesUp=+1', () => {
    expect(match.holesUp).toBe(1)
  })
})

// ─── § Phase 4c Test 4: best-ball all-team missing, HoleForfeited, CD wins ───
//
// Teams [alice,bob] vs [carol,dave]. alice AND bob gross absent; carol=4, dave=5.
// team1 all-missing → HoleForfeited(forfeiter=alice, lex-lowest of [alice,bob]) → team2 wins.

describe('§ Phase 4c — best-ball all A-team missing: [alice,bob] forfeit, CD wins', () => {
  const alice = 'alice', bob = 'bob', carol = 'carol', dave = 'dave'
  const cfg = makeCfg({
    id: 'mp-bb-allm',
    format: 'best-ball',
    appliesHandicap: false,
    playerIds: [alice, bob, carol, dave],
    teams: [[alice, bob], [carol, dave]],
  })
  const roundCfg = makeRoundCfg(cfg)
  // alice AND bob gross absent; CD present.
  const h1 = {
    ...makeHole(1, 7, { [carol]: 4, [dave]: 5 }),
    gross: { [carol]: 4, [dave]: 5 },
  }
  const { events, match } = settleMatchPlayHole(h1, cfg, roundCfg, initialMatch(cfg))

  it('emits HoleForfeited with forfeiter=alice (lex-lowest of [alice,bob])', () => {
    expect(events[0].kind).toBe('HoleForfeited')
    expect((events[0] as { forfeiter: string }).forfeiter).toBe(alice)
  })

  it('no HoleResolved', () => {
    expect(events.filter((e) => e.kind === 'HoleResolved')).toHaveLength(0)
  })

  it('match.holesUp=-1 (team2/CD wins hole)', () => {
    expect(match.holesUp).toBe(-1)
  })
})

// ─── § Phase 4c Test 5: forfeit triggers closeout (HoleForfeited before MatchClosedOut) ─
//
// Pre-write arithmetic:
//   preMatch: holesUp=+3 (A leads), holesPlayed=14
//   B missing on H15 → B forfeits → A wins H15 → holesUp=+4, holesPlayed=15
//   holesRemaining = 18-15 = 3; |4| > 3 → closedOut
//   Events: [HoleForfeited(B), MatchClosedOut(holesUp=4, holesRemaining=3)]
//   points = { A: +1, B: -1 }, Σ = 0

describe('§ Phase 4c Test 5 — forfeit triggers closeout (HoleForfeited before MatchClosedOut)', () => {
  const cfg = makeCfg({ playerIds: ['A', 'B'], stake: 1 })
  const roundCfg = makeRoundCfg(cfg)
  const preMatch: MatchState = { holesUp: 3, holesPlayed: 14, closedOut: false }
  // B's gross absent on H15; A has gross.
  const h15 = { ...makeHole(15, 4, { A: 4 }), gross: { A: 4 } }
  const { events, match } = settleMatchPlayHole(h15, cfg, roundCfg, preMatch)

  it('exactly 2 events emitted', () => {
    expect(events).toHaveLength(2)
  })

  it('events[0] = HoleForfeited, events[1] = MatchClosedOut (causal ordering)', () => {
    expect(events[0].kind).toBe('HoleForfeited')
    expect(events[1].kind).toBe('MatchClosedOut')
  })

  it('no HoleResolved event', () => {
    expect(events.filter((e) => e.kind === 'HoleResolved')).toHaveLength(0)
  })

  it('MatchClosedOut has holesUp=4, holesRemaining=3', () => {
    const co = events[1] as { holesUp: number; holesRemaining: number }
    expect(co.holesUp).toBe(4)
    expect(co.holesRemaining).toBe(3)
  })

  it('points = { A: +1, B: -1 }, Σ = 0', () => {
    const co = events[1] as { points: Record<string, number> }
    expect(co.points['A']).toBe(1)
    expect(co.points['B']).toBe(-1)
    expect(Object.values(co.points).reduce((s, v) => s + v, 0)).toBe(0)
    expect(match.closedOut).toBe(true)
  })
})
