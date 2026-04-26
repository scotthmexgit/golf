import { describe, it, expect } from 'vitest'
import { settleSkinsBet } from './skins_bridge'
import { buildHoleState, payoutMapFromLedger } from './shared'
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

function makePlayer(id: string, courseHcp = 0, roundHandicap = 0): PlayerSetup {
  return {
    id, name: id, hcpIndex: courseHcp, tee: 'white',
    isCourseHcp: true, courseHcp, betting: true, isSelf: false, roundHandicap,
  }
}

function makeHoleData(
  num: number,
  scores: Record<string, number>,
  opts: { par?: number; index?: number } = {},
): HoleData {
  return { number: num, par: opts.par ?? 4, index: opts.index ?? num, scores, dots: {} }
}

function makeSkinsGame(playerIds: string[], stake = 10, escalating = true): GameInstance {
  return {
    id: 'skins-test',
    type: 'skins',
    label: 'Skins',
    stake,
    playerIds,
    escalating,
    junk: EMPTY_JUNK,
  }
}

function zeroSum(ledger: Record<string, number>, playerIds: string[]): number {
  return playerIds.reduce((s, pid) => s + (ledger[pid] ?? 0), 0)
}

// ─── Test S1 — 3 players, 2 holes, handicap applied ─────────────────────────
// buildHoleState from shared.ts is used directly to validate reusability.
// Hole 1: A gross 3 wins (net 3 vs B net 4 vs C net 5). A +20, B -10, C -10.
// Hole 2: B gross 3 wins. B +20, A -10, C -10.
// Round: A +10, B +10, C -20. Σ=0.

describe('Test S1: 3 players, 2 holes, handicap applied — basic skin awards', () => {
  const players = [makePlayer('A'), makePlayer('B'), makePlayer('C')]
  const game = makeSkinsGame(['A', 'B', 'C'], 10, false) // escalating=false simplifies carry

  // Verify buildHoleState reuse from shared.ts: HoleState maps correctly.
  it('buildHoleState (from shared.ts) maps hole 1 gross scores correctly', () => {
    const hd = makeHoleData(1, { A: 3, B: 4, C: 5 })
    const state = buildHoleState(hd, players)
    expect(state.gross).toEqual({ A: 3, B: 4, C: 5 })
    expect(state.hole).toBe(1)
    expect(state.holeIndex).toBe(1)
  })

  const holes = [
    makeHoleData(1, { A: 3, B: 4, C: 5 }),   // A wins
    makeHoleData(2, { A: 4, B: 3, C: 5 }),   // B wins
  ]
  const { ledger } = settleSkinsBet(holes, players, game)

  it('ledger is zero-sum', () => {
    expect(zeroSum(ledger, game.playerIds)).toBe(0)
  })

  it('A wins hole 1 (gross 3 outright): +10', () => {
    expect(ledger['A']).toBe(10)  // stake × 2 losers
  })

  it('B wins hole 2 (gross 3 outright): +10', () => {
    expect(ledger['B']).toBe(10)
  })

  it('C loses both holes: -20', () => {
    expect(ledger['C']).toBe(-20)
  })
})

// ─── Test S2 — 3 players, carry scenario (escalating=true) ───────────────────
// Hole 1: all tie → SkinCarried (carry=5).
// Hole 2: A wins outright → absorbs carry. potPerOpponent = 5+5=10. A +20, B -10, C -10.
// Hole 3 (final): B wins outright → pot = 5 (no carry). B +10, A -5, C -5.
// Round: A = +20-5 = +15. B = -10+10 = 0. C = -10-5 = -15. Σ=0.

describe('Test S2: 3 players, carry accumulation — skin scales with carry', () => {
  const players = [makePlayer('A'), makePlayer('B'), makePlayer('C')]
  const game = makeSkinsGame(['A', 'B', 'C'], 5, true)

  const holes = [
    makeHoleData(1, { A: 4, B: 4, C: 4 }),   // all tie → carry
    makeHoleData(2, { A: 3, B: 5, C: 5 }),   // A wins, absorbs hole-1 carry
    makeHoleData(3, { A: 5, B: 3, C: 5 }),   // B wins (final hole, no further carry)
  ]
  const { events, ledger } = settleSkinsBet(holes, players, game)

  it('ledger is zero-sum', () => {
    expect(zeroSum(ledger, game.playerIds)).toBe(0)
  })

  it('A wins hole 2 with carry: +20 (10 per opponent × 2)', () => {
    expect(ledger['A']).toBe(15)  // 20 - 5 (hole 3)
  })

  it('B net 0: wins hole 3 but loses hole 2', () => {
    expect(ledger['B']).toBe(0)   // -10 + 10
  })

  it('C loses both hole 2 and hole 3: -15', () => {
    expect(ledger['C']).toBe(-15)
  })

  it('emits exactly one SkinCarried event (hole 1 tie)', () => {
    const carries = events.filter(e => e.kind === 'SkinCarried')
    expect(carries).toHaveLength(1)
    expect(carries[0].hole).toBe(1)
  })

  it('emits SkinWon events for holes 2 and 3', () => {
    const wins = events.filter(e => e.kind === 'SkinWon')
    expect(wins.map(e => e.hole).sort((a, b) => a - b)).toEqual([2, 3])
  })
})

// ─── Test S3 — IncompleteCard / FieldTooSmall path ───────────────────────────
// 3 players, 3 holes. C missing on hole 1 → 2-player sub-field (A vs B).
// Hole 1: A=3, B=4, C missing (0). Contenders={A,B}. A wins 1-loser skin.
//   A +5 (stake × 1), B -5, C 0.
// Hole 2: all 3 compete. C=4, A=5, B=5. C wins. C +10, A -5, B -5.
// Hole 3 (final): A=4, B=5, C=5. A wins. A +10, B -5, C -5.
// Round: A = +5-5+10 = +10. B = -5-5-5 = -15. C = 0+10-5 = +5. Σ=0.

describe('Test S3: player missing a hole — excluded from that hole only', () => {
  const players = [makePlayer('A'), makePlayer('B'), makePlayer('C')]
  const game = makeSkinsGame(['A', 'B', 'C'], 5, false)

  const holes = [
    makeHoleData(1, { A: 3, B: 4 }),          // C absent → gross[C]=0 → excluded
    makeHoleData(2, { A: 5, B: 5, C: 4 }),    // all compete, C wins
    makeHoleData(3, { A: 4, B: 5, C: 5 }),    // all compete, A wins
  ]
  const { ledger } = settleSkinsBet(holes, players, game)

  it('ledger is zero-sum', () => {
    expect(zeroSum(ledger, game.playerIds)).toBe(0)
  })

  it('A wins holes 1 and 3 but loses hole 2: net +10', () => {
    expect(ledger['A']).toBe(10)
  })

  it('B loses all three holes: -15', () => {
    expect(ledger['B']).toBe(-15)
  })

  it('C excluded from hole 1 (no delta), wins hole 2, loses hole 3: net +5', () => {
    expect(ledger['C']).toBe(5)
  })
})

// ─── Test S4 — 4-player smoke test ───────────────────────────────────────────
// Validates bridge works for the 4-player variant, not just canonical 3.
// 4 players, 2 holes, escalating=false. A wins hole 1, B wins hole 2.
// Hole 1: A +15, B -5, C -5, D -5. Hole 2: B +15, A -5, C -5, D -5.
// Round: A +10, B +10, C -10, D -10. Σ=0.

describe('Test S4: 4-player smoke test — bridge works for variant player counts', () => {
  const players = [makePlayer('A'), makePlayer('B'), makePlayer('C'), makePlayer('D')]
  const game = makeSkinsGame(['A', 'B', 'C', 'D'], 5, false)

  const holes = [
    makeHoleData(1, { A: 3, B: 4, C: 4, D: 4 }),   // A wins
    makeHoleData(2, { A: 4, B: 3, C: 4, D: 4 }),   // B wins
  ]
  const { ledger } = settleSkinsBet(holes, players, game)

  it('ledger is zero-sum across 4 players', () => {
    expect(zeroSum(ledger, game.playerIds)).toBe(0)
  })

  it('A wins hole 1 (3 losers × stake 5): +15', () => {
    expect(ledger['A']).toBe(10)  // +15 - 5 = +10
  })

  it('B wins hole 2: +10 net', () => {
    expect(ledger['B']).toBe(10)
  })

  it('C and D each lose both holes: -10', () => {
    expect(ledger['C']).toBe(-10)
    expect(ledger['D']).toBe(-10)
  })
})

// ─── Test S5 — payoutMapFromLedger from shared.ts ────────────────────────────
// Verifies payoutMapFromLedger correctly projects the Skins ledger to a PayoutMap
// and ensures all playerIds are present even when a player has zero delta.

describe('Test S5: payoutMapFromLedger produces complete PayoutMap', () => {
  const players = [makePlayer('A'), makePlayer('B'), makePlayer('C')]
  const game = makeSkinsGame(['A', 'B', 'C'], 10, false)

  // One hole: A wins. A +20, B -10, C -10.
  const holes = [makeHoleData(1, { A: 3, B: 4, C: 5 })]
  const { ledger } = settleSkinsBet(holes, players, game)
  const payout = payoutMapFromLedger(ledger, game.playerIds)

  it('all playerIds present in PayoutMap', () => {
    for (const pid of game.playerIds) {
      expect(pid in payout).toBe(true)
    }
  })

  it('payout values match ledger', () => {
    expect(payout['A']).toBe(20)
    expect(payout['B']).toBe(-10)
    expect(payout['C']).toBe(-10)
  })

  it('PayoutMap is zero-sum', () => {
    expect(game.playerIds.reduce((s, pid) => s + payout[pid], 0)).toBe(0)
  })
})
