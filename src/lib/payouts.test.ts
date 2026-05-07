// src/lib/payouts.test.ts — Integration tests for the WF7-2 Wolf orchestration path.
// Exercises computeAllPayouts with Wolf games to verify the aggregateRound-based
// dispatch produces correct, zero-sum, integer-valued results.
//
// Does NOT test Skins, Nassau, or Stroke Play (those remain on per-bet dispatch).
// Does NOT test junk (junk payouts are independent of the Wolf orchestration path).

import { describe, it, expect } from 'vitest'
import { computeAllPayouts } from './payouts'
import type { HoleData, PlayerSetup, GameInstance, JunkConfig } from '../types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

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

function makeWolfGame(
  playerIds: string[],
  opts: {
    stake?: number
    loneWolfMultiplier?: number
    wolfTieRule?: 'no-points' | 'carryover'
  } = {},
): GameInstance {
  return {
    id: 'wolf-payout-test',
    type: 'wolf',
    label: 'Wolf',
    stake: opts.stake ?? 100,
    playerIds,
    loneWolfMultiplier: opts.loneWolfMultiplier ?? 3,
    wolfTieRule: opts.wolfTieRule ?? 'no-points',
    junk: EMPTY_JUNK,
  }
}

function makeHole(
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

function zeroSum(payouts: Record<string, number>, playerIds: string[]): number {
  return playerIds.reduce((s, pid) => s + (payouts[pid] ?? 0), 0)
}

const PIDS = ['A', 'B', 'C', 'D']
const players = PIDS.map(id => makePlayer(id))

// ─── WP1 — Partner Wolf (basic resolved hole) ─────────────────────────────────
// A (captain) picks B. A+B win (lower net). stake=100, loneMultiplier=3.
// 2×2 match: A+200, B+200, C-200, D-200.

describe('WP1: partner Wolf — basic resolved hole', () => {
  const game = makeWolfGame(PIDS, { stake: 100 })
  const holes = [
    makeHole(1, { A: 3, B: 3, C: 5, D: 5 }, { wolfPick: 'B' }),
  ]
  const payouts = computeAllPayouts(holes, players, [game])

  it('zero-sum (GR3)', () => expect(zeroSum(payouts, PIDS)).toBe(0))
  it('A collects +200', () => expect(payouts['A']).toBe(200))
  it('B collects +200', () => expect(payouts['B']).toBe(200))
  it('C pays -200', () => expect(payouts['C']).toBe(-200))
  it('D pays -200', () => expect(payouts['D']).toBe(-200))
  it('all deltas are integers (GR2)', () => {
    for (const pid of PIDS) expect(Number.isInteger(payouts[pid])).toBe(true)
  })
})

// ─── WP2 — Lone Wolf ─────────────────────────────────────────────────────────
// B (hole-2 captain) goes solo. B wins. loneMultiplier=3.
// A alone (1 cross-pair with B) contributes: stake × loneMultiplier per opponent.
// Wait: Lone Wolf: B vs A, C, D. Each cross-pair: 100×3=300. B gains 300×3=900.
// Each opponent pays -300.

describe('WP2: Lone Wolf — captain goes solo', () => {
  const game = makeWolfGame(PIDS, { stake: 100, loneWolfMultiplier: 3 })
  const holes = [
    makeHole(2, { A: 5, B: 3, C: 5, D: 5 }, { wolfPick: 'solo' }),
  ]
  const payouts = computeAllPayouts(holes, players, [game])

  it('zero-sum (GR3)', () => expect(zeroSum(payouts, PIDS)).toBe(0))
  it('B (lone wolf) collects +900', () => expect(payouts['B']).toBe(900))
  it('A, C, D each pay -300', () => {
    expect(payouts['A']).toBe(-300)
    expect(payouts['C']).toBe(-300)
    expect(payouts['D']).toBe(-300)
  })
  it('all deltas are integers (GR2)', () => {
    for (const pid of PIDS) expect(Number.isInteger(payouts[pid])).toBe(true)
  })
})

// ─── WP3 — Blind Lone Wolf ────────────────────────────────────────────────────
// C (hole-3 captain) goes blind lone. blindLoneMultiplier = loneMultiplier+1 = 4.
// C wins all 3 opponents: 100×4 per opponent = 400 each → C+1200, others -400.

describe('WP3: Blind Lone Wolf — captain declares blind before tee', () => {
  const game = makeWolfGame(PIDS, { stake: 100, loneWolfMultiplier: 3 })
  const holes = [
    makeHole(3, { A: 5, B: 5, C: 3, D: 5 }, { wolfPick: 'blind' }),
  ]
  const payouts = computeAllPayouts(holes, players, [game])

  it('zero-sum (GR3)', () => expect(zeroSum(payouts, PIDS)).toBe(0))
  it('C (blind lone) collects +1200', () => expect(payouts['C']).toBe(1200))
  it('A, B, D each pay -400', () => {
    expect(payouts['A']).toBe(-400)
    expect(payouts['B']).toBe(-400)
    expect(payouts['D']).toBe(-400)
  })
  it('all deltas are integers (GR2)', () => {
    for (const pid of PIDS) expect(Number.isInteger(payouts[pid])).toBe(true)
  })
})

// ─── WP4 — Tied hole, no-points ───────────────────────────────────────────────
// All players tie hole 1. wolfTieRule='no-points' → hole voided, all deltas zero.

describe('WP4: tied hole — wolfTieRule=no-points (GR7 explicit event)', () => {
  const game = makeWolfGame(PIDS, { stake: 100, wolfTieRule: 'no-points' })
  const holes = [
    makeHole(1, { A: 4, B: 4, C: 4, D: 4 }, { wolfPick: 'B' }),
  ]
  const payouts = computeAllPayouts(holes, players, [game])

  it('zero-sum (GR3)', () => expect(zeroSum(payouts, PIDS)).toBe(0))
  it('all deltas are zero (hole voided)', () => {
    for (const pid of PIDS) expect(payouts[pid] ?? 0).toBe(0)
  })
  it('all deltas are integers (GR2)', () => {
    for (const pid of PIDS) expect(Number.isInteger(payouts[pid] ?? 0)).toBe(true)
  })
})

// ─── WP5 — Tied hole, carryover ───────────────────────────────────────────────
// Hole 1 ties (wolfTieRule='carryover'). Hole 2 A+B win with doubled stake.
// Base hole-2: A+200, B+200, C-200, D-200. Carry ×2: A+400, B+400, C-400, D-400.

describe('WP5: tied hole — wolfTieRule=carryover (carry doubles stake)', () => {
  const game = makeWolfGame(PIDS, { stake: 100, wolfTieRule: 'carryover' })
  const holes = [
    makeHole(1, { A: 4, B: 4, C: 4, D: 4 }, { wolfPick: 'B' }),
    makeHole(2, { A: 3, B: 3, C: 5, D: 5 }, { wolfPick: 'A' }),
  ]
  const payouts = computeAllPayouts(holes, players, [game])

  it('zero-sum (GR3)', () => expect(zeroSum(payouts, PIDS)).toBe(0))
  it('A collects +400 (carry-doubled)', () => expect(payouts['A']).toBe(400))
  it('B collects +400 (carry-doubled)', () => expect(payouts['B']).toBe(400))
  it('C pays -400', () => expect(payouts['C']).toBe(-400))
  it('D pays -400', () => expect(payouts['D']).toBe(-400))
  it('all deltas are integers (GR2)', () => {
    for (const pid of PIDS) expect(Number.isInteger(payouts[pid])).toBe(true)
  })
})

// ─── WP6 — Missing decision (WolfDecisionMissing, zero deltas) ────────────────
// All holes have no wolfPick → WolfDecisionMissing on every hole.
// Ledger should be all-zero (GR7: event emitted, delta explicit zero).

describe('WP6: missing decision — WolfDecisionMissing, zero payouts (GR7)', () => {
  const game = makeWolfGame(PIDS, { stake: 100 })
  const holes = [
    makeHole(1, { A: 3, B: 4, C: 4, D: 5 }),  // no wolfPick
    makeHole(2, { A: 4, B: 3, C: 4, D: 5 }),
  ]
  const payouts = computeAllPayouts(holes, players, [game])

  it('zero-sum (GR3)', () => expect(zeroSum(payouts, PIDS)).toBe(0))
  it('all payouts are zero (decision missing = no settlement)', () => {
    for (const pid of PIDS) expect(payouts[pid] ?? 0).toBe(0)
  })
  it('all deltas are integers (GR2)', () => {
    for (const pid of PIDS) expect(Number.isInteger(payouts[pid] ?? 0)).toBe(true)
  })
})

// ─── WP7 — Opponent wins partner Wolf ────────────────────────────────────────
// A (captain) picks B. C+D win (lower net). Losers pay, winners collect.

describe('WP7: partner Wolf — opposing pair wins', () => {
  const game = makeWolfGame(PIDS, { stake: 100 })
  const holes = [
    makeHole(1, { A: 5, B: 5, C: 3, D: 3 }, { wolfPick: 'B' }),
  ]
  const payouts = computeAllPayouts(holes, players, [game])

  it('zero-sum (GR3)', () => expect(zeroSum(payouts, PIDS)).toBe(0))
  it('C and D collect +200 each', () => {
    expect(payouts['C']).toBe(200)
    expect(payouts['D']).toBe(200)
  })
  it('A and B pay -200 each', () => {
    expect(payouts['A']).toBe(-200)
    expect(payouts['B']).toBe(-200)
  })
  it('all deltas are integers (GR2)', () => {
    for (const pid of PIDS) expect(Number.isInteger(payouts[pid])).toBe(true)
  })
})

// ─── WP8 — GR8 bet-id chain: non-default UUID-style game id ──────────────────
// Verifies the id chain game.id → wolfCfg.id → bet.id → declaringBet → byBet key
// is correct for a game id that does NOT use the test-fixture default.
// Adversarial review finding: silent all-zero payout if id chain breaks.

describe('WP8: GR8 bet-id chain — non-default UUID-style game id', () => {
  const game: GameInstance = {
    id: '3f7a1d2e-bc44-4f9b-9c31-a2e0b1234567',  // UUID-style id, not 'wolf-payout-test'
    type: 'wolf',
    label: 'Wolf',
    stake: 100,
    playerIds: PIDS,
    loneWolfMultiplier: 3,
    wolfTieRule: 'no-points',
    junk: EMPTY_JUNK,
  }
  const holes = [
    makeHole(1, { A: 3, B: 3, C: 5, D: 5 }, { wolfPick: 'B' }),
  ]
  const payouts = computeAllPayouts(holes, players, [game])

  it('zero-sum (GR3) — confirms byBet was keyed correctly', () => {
    expect(zeroSum(payouts, PIDS)).toBe(0)
  })
  it('A and B collect +200 (not zero — confirms no silent id mismatch)', () => {
    expect(payouts['A']).toBe(200)
    expect(payouts['B']).toBe(200)
  })
  it('C and D pay -200', () => {
    expect(payouts['C']).toBe(-200)
    expect(payouts['D']).toBe(-200)
  })
})
