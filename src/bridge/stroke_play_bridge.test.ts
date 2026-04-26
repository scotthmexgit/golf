import { describe, it, expect } from 'vitest'
import { buildHoleState } from './shared'
import { settleStrokePlayBet } from './stroke_play_bridge'
import { payoutMapFromLedger } from './shared'
import type { HoleData, PlayerSetup, GameInstance, JunkConfig } from '../types'

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makePlayer(
  id: string,
  courseHcp: number,
  roundHandicap = 0,
): PlayerSetup {
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

function makeHoleData(
  num: number,
  scores: Record<string, number>,
  opts: { par?: number; index?: number } = {},
): HoleData {
  return {
    number: num,
    par: opts.par ?? 4,
    index: opts.index ?? num,
    scores,
    dots: {},
  }
}

// ─── Test 1 — All scores present; handicap players ──────────────────────────
// Verifies that hole, holeIndex, par, gross, strokes, and status all map
// correctly from HoleData + PlayerSetup. Stubs verified separately (Test 4).

describe('Test 1: all scores present — live fields map correctly', () => {
  const players = [
    makePlayer('Alice', 0),
    makePlayer('Bob', 5),
    makePlayer('Carol', 10),
  ]
  const holeData = makeHoleData(3, { Alice: 4, Bob: 5, Carol: 6 }, { par: 3, index: 7 })
  const state = buildHoleState(holeData, players)

  it('maps hole, holeIndex, par from HoleData', () => {
    expect(state.hole).toBe(3)
    expect(state.holeIndex).toBe(7)
    expect(state.par).toBe(3)
  })

  it('maps gross scores from HoleData.scores', () => {
    expect(state.gross).toEqual({ Alice: 4, Bob: 5, Carol: 6 })
  })

  it('maps strokes to effectiveCourseHcp (courseHcp + roundHandicap = 0, 5, 10)', () => {
    expect(state.strokes).toEqual({ Alice: 0, Bob: 5, Carol: 10 })
  })

  it('sets status to Confirmed', () => {
    expect(state.status).toBe('Confirmed')
  })
})

// ─── Test 2 — Zero handicaps (appliesHandicap: false equivalent) ─────────────
// When all players have courseHcp=0 and roundHandicap=0, strokes are all 0.
// The engine with appliesHandicap=false ignores strokes entirely, but building
// correct zero strokes is the right thing regardless.

describe('Test 2: all players with courseHcp=0, roundHandicap=0 → strokes all 0', () => {
  const players = [makePlayer('A', 0), makePlayer('B', 0), makePlayer('C', 0)]
  const holeData = makeHoleData(1, { A: 3, B: 4, C: 5 })
  const state = buildHoleState(holeData, players)

  it('strokes are all 0 when no handicap', () => {
    expect(state.strokes).toEqual({ A: 0, B: 0, C: 0 })
  })

  it('gross scores map correctly with zero handicap', () => {
    expect(state.gross).toEqual({ A: 3, B: 4, C: 5 })
  })
})

// ─── Test 3 — Missing score maps to 0 ────────────────────────────────────────
// A player absent from HoleData.scores gets gross=0, which the engine reads as
// an IncompleteCard trigger. The builder's job is to produce 0; the engine
// converts it to an event. roundHandicap on PlayerSetup is additive.

describe('Test 3: missing score in HoleData.scores → gross[pid] = 0', () => {
  const players = [makePlayer('A', 0), makePlayer('B', 5, 2), makePlayer('C', 0)]
  // B's score is absent from the map
  const holeData = makeHoleData(7, { A: 4, C: 5 }, { index: 3 })
  const state = buildHoleState(holeData, players)

  it('missing player gross is 0 (IncompleteCard trigger for engine)', () => {
    expect(state.gross['B']).toBe(0)
  })

  it('present scores are unaffected; B strokes = courseHcp + roundHandicap = 7', () => {
    expect(state.gross['A']).toBe(4)
    expect(state.gross['C']).toBe(5)
    expect(state.strokes['B']).toBe(7) // 5 + 2
  })
})

// ─── Test 4 — All stubbed fields are correctly empty ─────────────────────────

describe('Test 4: stubbed fields are empty defaults', () => {
  const players = [makePlayer('X', 3), makePlayer('Y', 7)]
  const holeData = makeHoleData(1, { X: 4, Y: 5 })
  const state = buildHoleState(holeData, players)

  it('all stub fields carry correct empty defaults', () => {
    expect(state.ctpWinner).toBeNull()
    expect(state.longestDriveWinners).toHaveLength(0)
    expect(Object.keys(state.gir)).toHaveLength(0)
    expect(Object.keys(state.bunkerVisited)).toHaveLength(0)
    expect(Object.keys(state.treeSolidHit)).toHaveLength(0)
    expect(Object.keys(state.treeAnyHit)).toHaveLength(0)
    expect(Object.keys(state.longPutt)).toHaveLength(0)
    expect(Object.keys(state.polieInvoked)).toHaveLength(0)
    expect(Object.keys(state.fairwayHit)).toHaveLength(0)
    expect(state.pickedUp).toHaveLength(0)
    expect(state.conceded).toHaveLength(0)
    expect(state.withdrew).toHaveLength(0)
  })
})

// ─── SP-3 integration tests ──────────────────────────────────────────────────

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

function makeGame(playerIds: string[], stake = 10): GameInstance {
  return {
    id: 'sp-test',
    type: 'strokePlay',
    label: 'Stroke Play',
    stake,
    playerIds,
    junk: EMPTY_JUNK,
  }
}

// Build 18 holes of gross scores where all players have scores on every hole.
function makeHoles18(scores: Record<string, number[]>): HoleData[] {
  const playerIds = Object.keys(scores)
  return Array.from({ length: 18 }, (_, i) => ({
    number: i + 1,
    par: 4,
    index: i + 1,
    scores: Object.fromEntries(playerIds.map(pid => [pid, scores[pid][i]])),
    dots: {},
  }))
}

// ─── Test 5 — Full orchestration, appliesHandicap=true (via non-zero hcp) ────
// A (hcp 0) gross 72 = net 72. B (hcp 9) gross 81 = net 72. C (hcp 18) gross 90 = net 72.
// All tied at net 72. tieRule='split', 3-way tie: each non-winner pays stake.
// Loser pot = 0 (no losers when all 3 tie). Each winner gets 0. Σ = 0.
// Easier: Make A clearly win with net 70, B net 72, C net 74.

describe('Test 5: settleStrokePlayBet — 18 holes, handicap applied, clear winner', () => {
  // A hcp 0: gross 70 → net 70. B hcp 0: gross 72 → net 72. C hcp 0: gross 74 → net 74.
  // stake=10, 3 players. A wins: +20. B: -10. C: -10. Σ=0.
  const players = [makePlayer('A', 0), makePlayer('B', 0), makePlayer('C', 0)]
  const game = makeGame(['A', 'B', 'C'], 10)

  // Distribute 70, 72, 74 gross over 18 holes (all par 4, hcpIndex 1..18).
  // A: 13×4 + 5×3 = 52+15 = 67... easier: use flat 4s/5s/etc.
  // A gross 70: 16×4 + 2×3 = 64+6 = 70. B gross 72: 18×4 = 72. C gross 74: 16×4+2×5=74.
  const aGross = [...Array(16).fill(4), 3, 3]
  const bGross = Array(18).fill(4)
  const cGross = [...Array(16).fill(4), 5, 5]
  const holes = makeHoles18({ A: aGross, B: bGross, C: cGross })

  const { ledger } = settleStrokePlayBet(holes, players, game)
  const payout = payoutMapFromLedger(ledger, game.playerIds)

  it('A wins with lowest net total → +20', () => {
    expect(payout['A']).toBe(20)
  })

  it('B and C each pay stake → -10', () => {
    expect(payout['B']).toBe(-10)
    expect(payout['C']).toBe(-10)
  })

  it('PayoutMap is zero-sum', () => {
    const sum = game.playerIds.reduce((s, pid) => s + (payout[pid] ?? 0), 0)
    expect(sum).toBe(0)
  })
})

// ─── Test 6 — Zero handicap players (functionally appliesHandicap=false) ──────
// buildSpCfg hardcodes appliesHandicap=true; with all courseHcp=0 and
// roundHandicap=0, strokes[pid]=0 → strokesOnHole(0, holeIndex)=0 on every hole.
// Net = gross, so winner is determined by gross totals alone.

describe('Test 6: settleStrokePlayBet — zero-handicap players, gross determines winner', () => {
  const players = [makePlayer('X', 0), makePlayer('Y', 0), makePlayer('Z', 0)]
  const game = makeGame(['X', 'Y', 'Z'], 5)

  // X gross 71 wins. Y gross 73. Z gross 75. stake=5.
  // X: +10. Y: -5. Z: -5. Σ=0.
  const xGross = [...Array(17).fill(4), 3]  // 17×4+3 = 71
  const yGross = [...Array(17).fill(4), 5]  // 17×4+5 = 73
  const zGross = [...Array(16).fill(4), 5, 6] // 16×4+5+6 = 75
  const holes = makeHoles18({ X: xGross, Y: yGross, Z: zGross })

  const { ledger } = settleStrokePlayBet(holes, players, game)
  const payout = payoutMapFromLedger(ledger, game.playerIds)

  it('X wins on gross total (net = gross with zero hcp)', () => {
    expect(payout['X']).toBe(10)
  })

  it('Y and Z each pay stake', () => {
    expect(payout['Y']).toBe(-5)
    expect(payout['Z']).toBe(-5)
  })

  it('PayoutMap is zero-sum', () => {
    const sum = game.playerIds.reduce((s, pid) => s + (payout[pid] ?? 0), 0)
    expect(sum).toBe(0)
  })
})

// ─── Test 7 — One player misses a hole (IncompleteCard) ───────────────────────
// B has no score on hole 7 → gross[B]=0 on that hole → IncompleteCard for B.
// B is excluded from settlement. A and C settle between themselves.
// B delta = 0. Σ across all three = 0.

describe('Test 7: settleStrokePlayBet — IncompleteCard excludes player from settlement', () => {
  const players = [makePlayer('A', 0), makePlayer('B', 0), makePlayer('C', 0)]
  const game = makeGame(['A', 'B', 'C'], 10)

  // 18 holes. A: all 4s (72). C: all 5s (90). B: all 4s except hole 7 missing (absent score).
  const aGross = Array(18).fill(4)
  const bGross = Array(18).fill(4)
  const cGross = Array(18).fill(5)
  const holes: HoleData[] = Array.from({ length: 18 }, (_, i) => ({
    number: i + 1,
    par: 4,
    index: i + 1,
    scores: {
      A: aGross[i],
      // B is absent from hole 7 (index 6) — undefined → gross[B]=0 in builder
      ...(i !== 6 ? { B: bGross[i] } : {}),
      C: cGross[i],
    },
    dots: {},
  }))

  const { events, ledger } = settleStrokePlayBet(holes, players, game)
  const payout = payoutMapFromLedger(ledger, game.playerIds)

  it('B receives IncompleteCard and is excluded: delta = 0', () => {
    expect(payout['B']).toBe(0)
    expect(events.some(e => e.kind === 'IncompleteCard')).toBe(false) // IncompleteCard is consumed by finalizer
  })

  it('A wins the 2-player sub-field: +10 (stake × 1 other)', () => {
    expect(payout['A']).toBe(10)
  })

  it('C loses: -10', () => {
    expect(payout['C']).toBe(-10)
  })

  it('PayoutMap is zero-sum', () => {
    const sum = game.playerIds.reduce((s, pid) => s + (payout[pid] ?? 0), 0)
    expect(sum).toBe(0)
  })
})
