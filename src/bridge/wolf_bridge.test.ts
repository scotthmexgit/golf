import { describe, it, expect } from 'vitest'
import { settleWolfBet, getWolfCaptain } from './wolf_bridge'
import { payoutMapFromLedger } from './shared'
import type { HoleData, PlayerSetup, GameInstance, JunkConfig } from '../types'

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const EMPTY_JUNK: JunkConfig = {
  greenie: false, greenieAmount: 0,
  sandy: false, sandyAmount: 0,
  birdie: false, birdieAmount: 0,
  eagle: false, eagleAmount: 0,
  garbage: false, garbageAmount: 0,
  hammer: false,
  snake: false, snakeAmount: 0,
  lowball: false, lowballAmount: 0,
}

function makePlayer(id: string, courseHcp = 0): PlayerSetup {
  return {
    id, name: id, hcpIndex: courseHcp, tee: 'white',
    isCourseHcp: true, courseHcp, betting: true, isSelf: false, roundHandicap: 0,
  }
}

function makeHoleData(
  num: number,
  scores: Record<string, number>,
  opts: { par?: number; index?: number; wolfPick?: string } = {},
): HoleData {
  return {
    number: num,
    par: opts.par ?? 4,
    index: opts.index ?? num,
    scores,
    dots: {},
    wolfPick: opts.wolfPick,
  }
}

// 4-player Wolf game (minimum valid count). loneWolfMultiplier=3, stake=100.
function makeWolfGame(
  playerIds: string[],
  opts: { stake?: number; loneWolfMultiplier?: number } = {},
): GameInstance {
  return {
    id: 'wolf-test',
    type: 'wolf',
    label: 'Wolf',
    stake: opts.stake ?? 100,
    playerIds,
    loneWolfMultiplier: opts.loneWolfMultiplier ?? 3,
    junk: EMPTY_JUNK,
  }
}

function zeroSum(ledger: Record<string, number>, playerIds: string[]): number {
  return playerIds.reduce((s, pid) => s + (ledger[pid] ?? 0), 0)
}

// Players for most tests: A is hole-1 captain, B hole-2, C hole-3, D hole-4.
const PLAYERS_4 = ['A', 'B', 'C', 'D']
const players4 = PLAYERS_4.map(id => makePlayer(id))

// ─── Test W1 — Zero-decision round ───────────────────────────────────────────
// 4 players, 3 holes, no wolfPick on any hole.
// All holes emit WolfDecisionMissing; every delta is zero.
// Ledger all-zeros; zero-sum.

describe('Test W1: zero-decision round — WolfDecisionMissing on every hole', () => {
  const game = makeWolfGame(PLAYERS_4)
  const holes = [
    makeHoleData(1, { A: 3, B: 4, C: 4, D: 5 }), // no wolfPick
    makeHoleData(2, { A: 4, B: 3, C: 4, D: 5 }),
    makeHoleData(3, { A: 4, B: 4, C: 3, D: 5 }),
  ]
  const { events, ledger } = settleWolfBet(holes, players4, game)

  it('ledger is zero-sum', () => {
    expect(zeroSum(ledger, PLAYERS_4)).toBe(0)
  })

  it('all players have zero delta', () => {
    for (const pid of PLAYERS_4) {
      expect(ledger[pid] ?? 0).toBe(0)
    }
  })

  it('emits WolfDecisionMissing for every hole without a pick', () => {
    const missing = events.filter(e => e.kind === 'WolfDecisionMissing')
    expect(missing).toHaveLength(3)
  })

  it('emits no resolution events (no points move)', () => {
    const resolved = events.filter(e =>
      e.kind === 'WolfHoleResolved' ||
      e.kind === 'LoneWolfResolved' ||
      e.kind === 'BlindLoneResolved',
    )
    expect(resolved).toHaveLength(0)
  })
})

// ─── Test W2 — Partner Wolf win ───────────────────────────────────────────────
// 4 players, 1 hole. A (captain) picks B as partner. A+B win (lower net).
// stake=100, loneMultiplier=3 (irrelevant here — partner uses mult=1).
// Winners [A,B] vs losers [C,D], unit = stake × 1 = 100.
// A: +100 (vs C) +100 (vs D) = +200
// B: +100 (vs C) +100 (vs D) = +200
// C: -100 (vs A) -100 (vs B) = -200
// D: -100 (vs A) -100 (vs B) = -200
// Σ = 0.

describe('Test W2: partner Wolf win — correct stake-per-pair math', () => {
  const game = makeWolfGame(PLAYERS_4, { stake: 100, loneWolfMultiplier: 3 })
  // Hole 1: A is captain (rotation index 0). A picks B.
  // A net=3, B net=3, C net=5, D net=5. Side [A,B] best net=3, opp [C,D] best net=5. Side wins.
  const holes = [makeHoleData(1, { A: 3, B: 3, C: 5, D: 5 }, { wolfPick: 'B' })]
  const { ledger } = settleWolfBet(holes, players4, game)

  it('ledger is zero-sum', () => {
    expect(zeroSum(ledger, PLAYERS_4)).toBe(0)
  })

  it('A (captain) wins +200', () => { expect(ledger['A']).toBe(200) })
  it('B (partner) wins +200', () => { expect(ledger['B']).toBe(200) })
  it('C loses -200', () => { expect(ledger['C']).toBe(-200) })
  it('D loses -200', () => { expect(ledger['D']).toBe(-200) })
})

// ─── Test W3 — Lone Wolf win ──────────────────────────────────────────────────
// 4 players, 1 hole. A goes solo ('solo'). A wins.
// unit = stake × loneMultiplier = 100 × 3 = 300.
// Winners [A], losers [B,C,D].
// A: +300 (vs B) +300 (vs C) +300 (vs D) = +900
// B: -300, C: -300, D: -300. Σ = 0.

describe('Test W3: Lone Wolf win — loneMultiplier applied correctly', () => {
  const game = makeWolfGame(PLAYERS_4, { stake: 100, loneWolfMultiplier: 3 })
  // A net=3 (lowest). A goes solo.
  const holes = [makeHoleData(1, { A: 3, B: 5, C: 5, D: 5 }, { wolfPick: 'solo' })]
  const { events, ledger } = settleWolfBet(holes, players4, game)

  it('ledger is zero-sum', () => {
    expect(zeroSum(ledger, PLAYERS_4)).toBe(0)
  })

  it('A (lone wolf winner) gets +900', () => { expect(ledger['A']).toBe(900) })
  it('B, C, D each pay -300', () => {
    expect(ledger['B']).toBe(-300)
    expect(ledger['C']).toBe(-300)
    expect(ledger['D']).toBe(-300)
  })

  it('emits LoneWolfResolved event', () => {
    const resolved = events.filter(e => e.kind === 'LoneWolfResolved')
    expect(resolved).toHaveLength(1)
  })
})

// ─── Test W4 — Lone Wolf loss ─────────────────────────────────────────────────
// 4 players, 1 hole. A goes solo ('solo'). A loses (highest net).
// Winners [B,C,D], loser [A].
// B: +300, C: +300, D: +300
// A: -300 (vs B) -300 (vs C) -300 (vs D) = -900. Σ = 0.

describe('Test W4: Lone Wolf loss — losers collect correctly', () => {
  const game = makeWolfGame(PLAYERS_4, { stake: 100, loneWolfMultiplier: 3 })
  // A net=7 (highest). A goes solo and loses.
  const holes = [makeHoleData(1, { A: 7, B: 4, C: 4, D: 4 }, { wolfPick: 'solo' })]
  const { ledger } = settleWolfBet(holes, players4, game)

  it('ledger is zero-sum', () => {
    expect(zeroSum(ledger, PLAYERS_4)).toBe(0)
  })

  it('A (lone wolf loser) pays -900', () => { expect(ledger['A']).toBe(-900) })
  it('B, C, D each collect +300', () => {
    expect(ledger['B']).toBe(300)
    expect(ledger['C']).toBe(300)
    expect(ledger['D']).toBe(300)
  })
})

// ─── Test W5 — Tied hole + carryover ─────────────────────────────────────────
// 4 players, 2 holes. Hole 1 ties. Hole 2 A+B win with carry applied.
// tieRule: 'carryover'. carryMult = 2^1 = 2. decMult = 1. effective = max(2,1) = 2.
// Base hole-2 deltas: A+200, B+200, C-200, D-200.
// Carry-scaled: A+400, B+400, C-400, D-400.

describe('Test W5: tied hole + carryover — next decisive hole doubles stake', () => {
  const game = makeWolfGame(PLAYERS_4, { stake: 100, loneWolfMultiplier: 3 })
  const holes = [
    // Hole 1: A is captain, picks B. All net equal → WolfHoleTied.
    makeHoleData(1, { A: 4, B: 4, C: 4, D: 4 }, { wolfPick: 'B' }),
    // Hole 2: B is captain, picks A. A+B win with carry.
    makeHoleData(2, { A: 3, B: 3, C: 5, D: 5 }, { wolfPick: 'A' }),
  ]
  const { events, ledger } = settleWolfBet(holes, players4, game)

  it('ledger is zero-sum', () => {
    expect(zeroSum(ledger, PLAYERS_4)).toBe(0)
  })

  it('A and B each collect +400 (carry doubled)', () => {
    expect(ledger['A']).toBe(400)
    expect(ledger['B']).toBe(400)
  })

  it('C and D each pay -400', () => {
    expect(ledger['C']).toBe(-400)
    expect(ledger['D']).toBe(-400)
  })

  it('emits WolfHoleTied on hole 1', () => {
    const tied = events.filter(e => e.kind === 'WolfHoleTied')
    expect(tied).toHaveLength(1)
    expect(tied[0].hole).toBe(1)
  })

  it('emits WolfCarryApplied with multiplier=2 on hole 2', () => {
    const carry = events.filter(e => e.kind === 'WolfCarryApplied')
    expect(carry).toHaveLength(1)
    if (carry[0].kind === 'WolfCarryApplied') {
      expect(carry[0].multiplier).toBe(2)
      expect(carry[0].hole).toBe(2)
    }
  })
})

// ─── Test W6 — Missing score ──────────────────────────────────────────────────
// 4 players, 1 hole. D has no score (gross=0).
// Engine emits WolfHoleInvalid; zero delta for all players.

describe('Test W6: missing score — WolfHoleInvalid, zero delta', () => {
  const game = makeWolfGame(PLAYERS_4, { stake: 100 })
  // D has no score. wolfPick='B' (partner pick, would normally settle).
  const holes = [makeHoleData(1, { A: 3, B: 4, C: 5 /* D absent → 0 */ }, { wolfPick: 'B' })]
  const { events, ledger } = settleWolfBet(holes, players4, game)

  it('ledger is zero-sum', () => {
    expect(zeroSum(ledger, PLAYERS_4)).toBe(0)
  })

  it('all players have zero delta', () => {
    for (const pid of PLAYERS_4) {
      expect(ledger[pid] ?? 0).toBe(0)
    }
  })

  it('emits WolfHoleInvalid', () => {
    const invalid = events.filter(e => e.kind === 'WolfHoleInvalid')
    expect(invalid).toHaveLength(1)
    expect(invalid[0].hole).toBe(1)
  })
})

// ─── Test W7 — R5: all-tied round (empty ledger) ─────────────────────────────
// 18 holes, all players tie every hole. carryover never resolves (no decisive hole).
// Ledger is empty. payoutMapFromLedger({}, playerIds) must return all-zeros.

describe('Test W7: R5 — all-tied round, empty ledger produces all-zero PayoutMap', () => {
  const game = makeWolfGame(PLAYERS_4, { stake: 100 })
  // All 18 holes: A is captain (rotation), picks B; all net-equal → tied.
  const holes = Array.from({ length: 18 }, (_, i) =>
    makeHoleData(i + 1, { A: 4, B: 4, C: 4, D: 4 }, {
      wolfPick: PLAYERS_4[(i + 1) % 4], // some partner pick, but all tied anyway
    }),
  )
  const { ledger } = settleWolfBet(holes, players4, game)
  const payout = payoutMapFromLedger(ledger, PLAYERS_4)

  it('ledger is empty (no resolution events produced)', () => {
    expect(Object.keys(ledger)).toHaveLength(0)
  })

  it('payoutMapFromLedger returns all-zero entry for every player', () => {
    for (const pid of PLAYERS_4) {
      expect(pid in payout).toBe(true)
      expect(payout[pid]).toBe(0)
    }
  })

  it('PayoutMap is zero-sum', () => {
    expect(PLAYERS_4.reduce((s, pid) => s + payout[pid], 0)).toBe(0)
  })
})

// ─── Test W8 — Captain rotation (4-player, holes 1–5) ────────────────────────
// getWolfCaptain returns the correct captain per the rotation formula:
// players[(hole - 1) % playerCount]. 4 players: A,B,C,D,A for holes 1–5.

describe('Test W8: captain rotation — 4-player round, holes 1–5', () => {
  const game = makeWolfGame(PLAYERS_4)
  const expected = ['A', 'B', 'C', 'D', 'A']

  expected.forEach((expectedCaptain, i) => {
    const hole = i + 1
    it(`hole ${hole}: captain is ${expectedCaptain}`, () => {
      const { captain } = getWolfCaptain(hole, game, players4)
      expect(captain).toBe(expectedCaptain)
    })
  })
})

// ─── Test W9 — Blind Lone Wolf ────────────────────────────────────────────────
// 4 players, 1 hole. A goes blind ('blind'). A wins.
// blindLoneMultiplier = max(loneWolfMultiplier+1, 3) = max(3+1,3) = 4.
// unit = stake × 4 = 100 × 4 = 400.
// A: +400×3 = +1200. B,C,D: -400 each. Σ = 0.
// BlindLoneDeclared event must be emitted before BlindLoneResolved.

describe('Test W9: Blind Lone Wolf — blindLoneMultiplier applied, BlindLoneDeclared emitted', () => {
  const game = makeWolfGame(PLAYERS_4, { stake: 100, loneWolfMultiplier: 3 })
  // A net=3 (wins). A goes blind.
  const holes = [makeHoleData(1, { A: 3, B: 5, C: 5, D: 5 }, { wolfPick: 'blind' })]
  const { events, ledger } = settleWolfBet(holes, players4, game)

  it('ledger is zero-sum', () => {
    expect(zeroSum(ledger, PLAYERS_4)).toBe(0)
  })

  it('A (blind lone winner) gets +1200 (blindLoneMultiplier=4, 3 losers)', () => {
    expect(ledger['A']).toBe(1200)
  })

  it('B, C, D each pay -400', () => {
    expect(ledger['B']).toBe(-400)
    expect(ledger['C']).toBe(-400)
    expect(ledger['D']).toBe(-400)
  })

  it('BlindLoneDeclared emitted before BlindLoneResolved', () => {
    const declared = events.findIndex(e => e.kind === 'BlindLoneDeclared')
    const resolved = events.findIndex(e => e.kind === 'BlindLoneResolved')
    expect(declared).toBeGreaterThanOrEqual(0)
    expect(resolved).toBeGreaterThan(declared)
  })

  it('emits BlindLoneResolved (not LoneWolfResolved)', () => {
    const blindResolved = events.filter(e => e.kind === 'BlindLoneResolved')
    const loneResolved = events.filter(e => e.kind === 'LoneWolfResolved')
    expect(blindResolved).toHaveLength(1)
    expect(loneResolved).toHaveLength(0)
  })
})

// ─── Test W10 — R3: eventsSoFar accumulator threading ───────────────────────
// 4 players, 17 holes with decisions. Verifies that eventsSoFar is correctly
// threaded through the bridge loop so applyWolfCaptainRotation does not throw
// and the captain at hole 17 matches the rotation formula.
// (Lowest-money tiebreak for holes 17–18 is a v1 engine gap; this test locks
// the accumulator threading and basic rotation correctness only.)

describe('Test W10: R3 — eventsSoFar accumulator threaded correctly through 17-hole round', () => {
  const game = makeWolfGame(PLAYERS_4, { stake: 100, loneWolfMultiplier: 3 })
  // 17 holes — mix of partner wins, lone wins, and ties.
  // Captain for hole 17: players[(16) % 4] = players[0] = A.
  const holes = Array.from({ length: 17 }, (_, i) => {
    const hole = i + 1
    // Rotate wolfPick with the captain to produce a mix of events.
    const captain = PLAYERS_4[(hole - 1) % 4]
    // Holes 1-15: captain wins as lone wolf. Hole 16: tie. Hole 17: lone wolf.
    if (hole === 16) {
      return makeHoleData(hole, { A: 4, B: 4, C: 4, D: 4 }, { wolfPick: captain })
    }
    // Captain has lowest score; goes lone wolf.
    const scores: Record<string, number> = { A: 5, B: 5, C: 5, D: 5 }
    scores[captain] = 3
    return makeHoleData(hole, scores, { wolfPick: 'solo' })
  })

  it('settleWolfBet completes without throwing across 17 holes', () => {
    expect(() => settleWolfBet(holes, players4, game)).not.toThrow()
  })

  it('captain at hole 17 is A (index (17-1) % 4 = 0)', () => {
    const { captain } = getWolfCaptain(17, game, players4)
    expect(captain).toBe('A')
  })

  it('ledger is zero-sum across all 17 holes', () => {
    const { ledger } = settleWolfBet(holes, players4, game)
    expect(zeroSum(ledger, PLAYERS_4)).toBe(0)
  })
})

// ─── Test W11 — 5-player round ───────────────────────────────────────────────
// Validates bridge works for the 5-player variant.
// Hole 1: captain=A, picks B. A+B win.
// unit=100. A: +300 (vs C,D,E). B: +300. C,D,E: -200 each (vs A and B).
// Wait: winners=[A,B], losers=[C,D,E].
// A: +unit×3 = +300. B: +unit×3 = +300.
// C: -unit×2 = -200 (one payment to A, one to B). D: -200. E: -200.
// Σ = 300+300-200-200-200 = 0. ✓

describe('Test W11: 5-player partner Wolf — bridge works for max player count', () => {
  const PLAYERS_5 = ['A', 'B', 'C', 'D', 'E']
  const players5 = PLAYERS_5.map(id => makePlayer(id))
  const game = makeWolfGame(PLAYERS_5, { stake: 100, loneWolfMultiplier: 3 })

  const holes = [
    makeHoleData(1, { A: 3, B: 3, C: 5, D: 5, E: 5 }, { wolfPick: 'B' }),
  ]
  const { ledger } = settleWolfBet(holes, players5, game)

  it('ledger is zero-sum across 5 players', () => {
    expect(zeroSum(ledger, PLAYERS_5)).toBe(0)
  })

  it('A and B each collect +300', () => {
    expect(ledger['A']).toBe(300)
    expect(ledger['B']).toBe(300)
  })

  it('C, D, E each pay -200', () => {
    expect(ledger['C']).toBe(-200)
    expect(ledger['D']).toBe(-200)
    expect(ledger['E']).toBe(-200)
  })
})
