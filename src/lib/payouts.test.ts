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

// ─── Skins Phase 7 sweep — SP1–SP10 ─────────────────────────────────────────
// Tests for the Skins aggregateRound orchestration path (Phase 7 sweep).
// Follows the Wolf WP1–WP8 structure exactly. Fixture: 4 players (A/B/C/D),
// all scratch, stake=100 minor units per skin, escalating=false.

function makeSkinsGame(
  playerIds: string[],
  opts: { stake?: number; escalating?: boolean } = {},
): GameInstance {
  return {
    id: 'skins-payout-test',
    type: 'skins',
    label: 'Skins',
    stake: opts.stake ?? 100,
    playerIds,
    escalating: opts.escalating ?? false,
    junk: EMPTY_JUNK,
  }
}

function makeSkinsHole(
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

const SPIDS = ['A', 'B', 'C', 'D']
const skinsPlayers = SPIDS.map(id => makePlayer(id))

// ─── SP1 — Basic skin win ────────────────────────────────────────────────────
// A wins hole 1 uniquely (score 3, others 4). stake=100, 4 players.
// A: +100×3 = +300. B/C/D: -100 each. Σ = 0.

describe('SP1: basic skin win — A lowest score, unique', () => {
  const game = makeSkinsGame(SPIDS, { stake: 100 })
  const holes = [
    makeSkinsHole(1, { A: 3, B: 4, C: 4, D: 4 }),
  ]
  const payouts = computeAllPayouts(holes, skinsPlayers, [game])

  it('A collects +300 (stake × 3 opponents)', () => expect(payouts['A']).toBe(300))
  it('B, C, D each pay -100', () => {
    expect(payouts['B']).toBe(-100)
    expect(payouts['C']).toBe(-100)
    expect(payouts['D']).toBe(-100)
  })
})

// ─── SP2 — Zero-sum on SP1 ───────────────────────────────────────────────────

describe('SP2: zero-sum on SP1 scenario (GR3)', () => {
  const game = makeSkinsGame(SPIDS, { stake: 100 })
  const holes = [makeSkinsHole(1, { A: 3, B: 4, C: 4, D: 4 })]
  const payouts = computeAllPayouts(holes, skinsPlayers, [game])

  it('Σ delta === 0 (GR3)', () => expect(zeroSum(payouts, SPIDS)).toBe(0))
})

// ─── SP3 — Integer assertion on SP1 (GR2) ───────────────────────────────────

describe('SP3: integer assertion on SP1 scenario (GR2)', () => {
  const game = makeSkinsGame(SPIDS, { stake: 100 })
  const holes = [makeSkinsHole(1, { A: 3, B: 4, C: 4, D: 4 })]
  const payouts = computeAllPayouts(holes, skinsPlayers, [game])

  it('all deltas are integers in minor units (GR2)', () => {
    for (const pid of SPIDS) expect(Number.isInteger(payouts[pid])).toBe(true)
  })
})

// ─── SP4 — Carry chain → split at final hole (GR7) ──────────────────────────
// All 18 holes tied (escalating=true → SkinCarried per hole, not void).
// Hole 18 applies tieRuleFinalHole='split' → SkinCarryForfeit → all zero.
// GR7: informational events (SkinCarried, SkinCarryForfeit) emit explicitly;
// no silent zero-delta; aggregateRound correctly ignores them (default: break).

describe('SP4: carry chain → split at final hole → all zero (GR7: informational events)', () => {
  const game = makeSkinsGame(SPIDS, { stake: 100, escalating: true })
  const holes = Array.from({ length: 18 }, (_, i) =>
    makeSkinsHole(i + 1, { A: 4, B: 4, C: 4, D: 4 }),
  )
  const payouts = computeAllPayouts(holes, skinsPlayers, [game])

  it('Σ delta === 0 (GR3 — carry forfeited, no money moved)', () => {
    expect(zeroSum(payouts, SPIDS)).toBe(0)
  })
  it('all players at zero (carry forfeited via SkinCarryForfeit, not silently lost)', () => {
    for (const pid of SPIDS) expect(payouts[pid] ?? 0).toBe(0)
  })
  it('all deltas are integers (GR2)', () => {
    for (const pid of SPIDS) expect(Number.isInteger(payouts[pid] ?? 0)).toBe(true)
  })
})

// ─── SP5 — Carry chain → resolved skin (carry-scaled SkinWon) ───────────────
// escalating=true: hole 1 ties → SkinCarried (carry accumulates). Hole 2: A wins.
// finalizeSkinsRound scales SkinWon by multiplier = 1 + carryCount = 2.
// A: +100×2×3 = +600. B/C/D: -200 each. Σ = 0.

describe('SP5: carry chain (escalating=true) → decisive hole — carry-scaled SkinWon delta', () => {
  const game = makeSkinsGame(SPIDS, { stake: 100, escalating: true })
  const holes = [
    makeSkinsHole(1, { A: 4, B: 4, C: 4, D: 4 }),  // all tie → SkinCarried
    makeSkinsHole(2, { A: 3, B: 4, C: 4, D: 4 }),  // A wins carry-scaled skin
  ]
  const payouts = computeAllPayouts(holes, skinsPlayers, [game])

  it('A collects +600 (2-skin carry × 3 opponents × stake 100)', () => {
    expect(payouts['A']).toBe(600)
  })
  it('B, C, D each pay -200 (2 × stake)', () => {
    expect(payouts['B']).toBe(-200)
    expect(payouts['C']).toBe(-200)
    expect(payouts['D']).toBe(-200)
  })
})

// ─── SP6 — Zero-sum on SP5 ───────────────────────────────────────────────────

describe('SP6: zero-sum on SP5 (carry-resolved, escalating=true) scenario (GR3)', () => {
  const game = makeSkinsGame(SPIDS, { stake: 100, escalating: true })
  const holes = [
    makeSkinsHole(1, { A: 4, B: 4, C: 4, D: 4 }),
    makeSkinsHole(2, { A: 3, B: 4, C: 4, D: 4 }),
  ]
  const payouts = computeAllPayouts(holes, skinsPlayers, [game])

  it('Σ delta === 0 (GR3)', () => expect(zeroSum(payouts, SPIDS)).toBe(0))
})

// ─── SP7 — Integer assertion on SP5 (GR2) ───────────────────────────────────

describe('SP7: integer assertion on SP5 (carry-resolved, escalating=true) scenario (GR2)', () => {
  const game = makeSkinsGame(SPIDS, { stake: 100, escalating: true })
  const holes = [
    makeSkinsHole(1, { A: 4, B: 4, C: 4, D: 4 }),
    makeSkinsHole(2, { A: 3, B: 4, C: 4, D: 4 }),
  ]
  const payouts = computeAllPayouts(holes, skinsPlayers, [game])

  it('all deltas are integers (GR2)', () => {
    for (const pid of SPIDS) expect(Number.isInteger(payouts[pid])).toBe(true)
  })
})

// ─── SP8 — GR8 contract: non-default UUID-style game id ─────────────────────
// Verifies the id chain buildSkinsCfg.id → bet.id → declaringBet → byBet key
// for a game id that is NOT the test-fixture default. Mirrors WP8 for Wolf.
// Adversarial review finding (WF7-2): ?? {} silently zeros payouts on mismatch.
// Option A guard (skinsCfg.id !== game.id throws) prevents this.

describe('SP8: GR8 bet-id chain — non-default UUID-style game id', () => {
  const game: GameInstance = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    type: 'skins',
    label: 'Skins',
    stake: 100,
    playerIds: SPIDS,
    escalating: false,
    junk: EMPTY_JUNK,
  }
  const holes = [makeSkinsHole(1, { A: 3, B: 4, C: 4, D: 4 })]
  const payouts = computeAllPayouts(holes, skinsPlayers, [game])

  it('zero-sum (GR3) — confirms byBet was keyed correctly', () => {
    expect(zeroSum(payouts, SPIDS)).toBe(0)
  })
  it('A collects +300 (not zero — confirms no silent id mismatch)', () => {
    expect(payouts['A']).toBe(300)
  })
  it('B, C, D pay -100 each', () => {
    expect(payouts['B']).toBe(-100)
    expect(payouts['C']).toBe(-100)
    expect(payouts['D']).toBe(-100)
  })
})

// ─── SP9 — No-skin round (all FieldTooSmall or all tied → forfeit) ───────────
// All holes have 0 scores (no players have entered scores yet). The Skins
// engine emits FieldTooSmall on every hole; no SkinWon fires. The skinsLedger
// from byBet[game.id] is {} (undefined → fallback). All payouts are zero.

describe('SP9: no-skin round — all FieldTooSmall (no SkinWon → ledger is {})', () => {
  const game = makeSkinsGame(SPIDS, { stake: 100 })
  const holes = [
    makeSkinsHole(1, { A: 0, B: 0, C: 0, D: 0 }),  // 0 = missing score → FieldTooSmall
  ]
  const payouts = computeAllPayouts(holes, skinsPlayers, [game])

  it('Σ delta === 0 (GR3 — no SkinWon means no money moved)', () => {
    expect(zeroSum(payouts, SPIDS)).toBe(0)
  })
  it('all payouts are zero (byBet empty → ?? {} fallback is correct)', () => {
    for (const pid of SPIDS) expect(payouts[pid] ?? 0).toBe(0)
  })
})

// ─── SP10 — escalating=true: carry multiplier via aggregateRound ─────────────
// Hole 1 ties (all par). Hole 2 A wins. With escalating=true, each additional
// carry hole adds another skin stake to the pot. Carry of 1 hole → skin worth
// 2 × stake = 200 per opponent (same as SP5 with escalating=false, since carry
// multiplier = 1 + carryCount = 2 in both cases for a 1-hole carry).
// Verify that aggregateRound correctly reduces the carry-scaled SkinWon from
// finalizeSkinsRound regardless of escalating setting.

describe('SP10: escalating=true — carry-scaled SkinWon reduces correctly', () => {
  const game = makeSkinsGame(SPIDS, { stake: 100, escalating: true })
  const holes = [
    makeSkinsHole(1, { A: 4, B: 4, C: 4, D: 4 }),  // all tie → SkinCarried
    makeSkinsHole(2, { A: 3, B: 4, C: 4, D: 4 }),  // A wins carry-scaled skin
  ]
  const payouts = computeAllPayouts(holes, skinsPlayers, [game])

  it('Σ delta === 0 (GR3)', () => expect(zeroSum(payouts, SPIDS)).toBe(0))
  it('A collects more than base stake (carry applied via finalizeSkinsRound)', () => {
    // With 1-hole carry: A wins 2 skins × 3 opponents × stake 100 = +600
    expect(payouts['A']).toBeGreaterThan(300)  // strictly more than a single skin
  })
  it('all deltas are integers (GR2)', () => {
    for (const pid of SPIDS) expect(Number.isInteger(payouts[pid])).toBe(true)
  })
})
