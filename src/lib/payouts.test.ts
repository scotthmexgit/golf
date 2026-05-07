// src/lib/payouts.test.ts — Integration tests for the Wolf, Skins, and Nassau
// aggregateRound orchestration paths (Phase 7 sweep).
// Exercises computeAllPayouts to verify correct, zero-sum, integer-valued results.
//
// WP1–WP8: Wolf (WF7-2 cutover, aggregateRound via byBet[game.id])
// SP1–SP10: Skins (Phase 7 sweep, aggregateRound via byBet[game.id])
// NP1–NP10: Nassau (Phase 7 sweep, aggregateRound via netByPlayer — compound byBet keys)
//
// Does NOT test Stroke Play (still on per-bet dispatch).
// Does NOT test junk (junk payouts are independent of the orchestration paths).

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

// ─── Nassau Phase 7 sweep — NP1–NP10 ─────────────────────────────────────────
// Tests for the Nassau aggregateRound orchestration path (Phase 7 sweep).
// Key invariant: result.netByPlayer extraction is correct for Nassau because
// compound byBet keys (${game.id}::${matchId}) make byBet[game.id] always undefined.
// netByPlayer is safe when the log contains only one bet's events (NP10 proves isolation).
//
// Fixture: 2 players (A/B) singles mode; 3 players (A/B/C) for NP9 allPairs.
// All scratch (courseHcp=0), stake=100, pressRule='manual', pressScope='nine'.

const NASSAU_GAME_ID = 'nassau-payout-test'

function makeNassauGame(
  playerIds: string[],
  opts: {
    stake?: number
    id?: string
    pressRule?: 'manual' | 'auto-2-down' | 'auto-1-down'
    pressScope?: 'nine' | 'match'
  } = {},
): GameInstance {
  return {
    id: opts.id ?? NASSAU_GAME_ID,
    type: 'nassau',
    label: 'Nassau',
    stake: opts.stake ?? 100,
    playerIds,
    pressRule: opts.pressRule ?? 'manual',
    pressScope: opts.pressScope ?? 'nine',
    junk: EMPTY_JUNK,
  }
}

// Build 18-hole HoleData array for a 2-player Nassau round.
// pressByHole: hole number → match IDs confirmed at that hole for this game.
function makeNassauHoles(
  aScores: number[],
  bScores: number[],
  opts: { pressByHole?: Record<number, string[]>; gameId?: string } = {},
): HoleData[] {
  const gid = opts.gameId ?? NASSAU_GAME_ID
  return Array.from({ length: 18 }, (_, i) => {
    const hole = i + 1
    const pressMatches = opts.pressByHole?.[hole]
    return {
      number: hole,
      par: 4,
      index: hole,
      scores: { A: aScores[i], B: bScores[i] },
      dots: {},
      ...(pressMatches ? { presses: { [gid]: pressMatches } } : {}),
    }
  })
}

const NPIDS = ['A', 'B']
const nassauPlayers = NPIDS.map(id => makePlayer(id))

// ─── NP1 — A wins front, back, overall (3× stake) ────────────────────────────
// A=3, B=5 all 18 holes. All scratch.
// A wins front (closeout before hole 9), back (closeout), overall (closeout).
// A: +300, B: -300. Σ=0.

describe('NP1: A wins all 3 matches — 3× stake', () => {
  const game = makeNassauGame(NPIDS, { stake: 100 })
  const holes = makeNassauHoles(Array(18).fill(3), Array(18).fill(5))
  const payouts = computeAllPayouts(holes, nassauPlayers, [game])

  it('zero-sum (GR3)', () => expect(zeroSum(payouts, NPIDS)).toBe(0))
  it('A collects +300 (front + back + overall)', () => expect(payouts['A']).toBe(300))
  it('B pays -300', () => expect(payouts['B']).toBe(-300))
  it('all deltas are integers (GR2)', () => {
    for (const pid of NPIDS) expect(Number.isInteger(payouts[pid])).toBe(true)
  })
})

// ─── NP2 — Front tied, back + overall A wins (2× stake) ──────────────────────
// Holes 1-9: A=4, B=4 (all halved). Holes 10-18: A=3, B=5 (A wins back).
// Front: MatchTied → 0. Back: A wins → +100. Overall: A won 9 (back), B won 0 → A wins → +100.
// A: +200, B: -200.

describe('NP2: front tied, back + overall A wins — 2× stake', () => {
  const game = makeNassauGame(NPIDS, { stake: 100 })
  const holes = makeNassauHoles(
    [...Array(9).fill(4), ...Array(9).fill(3)],
    [...Array(9).fill(4), ...Array(9).fill(5)],
  )
  const payouts = computeAllPayouts(holes, nassauPlayers, [game])

  it('zero-sum (GR3)', () => expect(zeroSum(payouts, NPIDS)).toBe(0))
  it('A collects +200 (back + overall; front MatchTied)', () => expect(payouts['A']).toBe(200))
  it('B pays -200', () => expect(payouts['B']).toBe(-200))
  it('all deltas are integers (GR2)', () => {
    for (const pid of NPIDS) expect(Number.isInteger(payouts[pid])).toBe(true)
  })
})

// ─── NP3 — All matches tied → zero payout (GR7) ──────────────────────────────
// All 18 holes halved (A=4, B=4). Front, back, overall all MatchTied.
// GR7: MatchTied events emit explicitly; no silent zeros.

describe('NP3: all matches tied — zero payout (GR7: MatchTied explicit)', () => {
  const game = makeNassauGame(NPIDS, { stake: 100 })
  const holes = makeNassauHoles(Array(18).fill(4), Array(18).fill(4))
  const payouts = computeAllPayouts(holes, nassauPlayers, [game])

  it('zero-sum (GR3)', () => expect(zeroSum(payouts, NPIDS)).toBe(0))
  it('all payouts are zero (all 3 matches MatchTied)', () => {
    for (const pid of NPIDS) expect(payouts[pid] ?? 0).toBe(0)
  })
  it('all deltas are integers (GR2)', () => {
    for (const pid of NPIDS) expect(Number.isInteger(payouts[pid] ?? 0)).toBe(true)
  })
})

// ─── NP4 — Front A wins, back B wins, overall tied → net zero ────────────────
// Holes 1-9: A=3, B=5. Holes 10-18: A=5, B=3.
// Front: A wins (+100). Back: B wins (A-100). Overall: 9-9 → MatchTied (0).
// Net: A=0, B=0.

describe('NP4: front A wins, back B wins, overall MatchTied — net zero', () => {
  const game = makeNassauGame(NPIDS, { stake: 100 })
  const holes = makeNassauHoles(
    [...Array(9).fill(3), ...Array(9).fill(5)],
    [...Array(9).fill(5), ...Array(9).fill(3)],
  )
  const payouts = computeAllPayouts(holes, nassauPlayers, [game])

  it('zero-sum (GR3)', () => expect(zeroSum(payouts, NPIDS)).toBe(0))
  it('A at net zero (front win offset by back loss; overall tied)', () => {
    expect(payouts['A'] ?? 0).toBe(0)
  })
  it('B at net zero', () => expect(payouts['B'] ?? 0).toBe(0))
})

// ─── NP5 — Manual press wins, stacks with main result ────────────────────────
// A=3, B=5 all 18 holes. Press confirmed on hole 3 for 'front' match.
// Press covers holes 4-9 (pressScope='nine'); A wins all → A wins press (+100).
// Front: A+100. Press: A+100. Back: A+100. Overall: A+100. Total: A+400, B-400.

describe('NP5: press opens and wins — stacks with main result (4× stake total)', () => {
  const game = makeNassauGame(NPIDS, { stake: 100 })
  const holes = makeNassauHoles(
    Array(18).fill(3),
    Array(18).fill(5),
    { pressByHole: { 3: ['front'] } },
  )
  const payouts = computeAllPayouts(holes, nassauPlayers, [game])

  it('zero-sum (GR3)', () => expect(zeroSum(payouts, NPIDS)).toBe(0))
  it('A collects +400 (front + press + back + overall)', () => expect(payouts['A']).toBe(400))
  it('B pays -400', () => expect(payouts['B']).toBe(-400))
  it('all deltas are integers (GR2)', () => {
    for (const pid of NPIDS) expect(Number.isInteger(payouts[pid])).toBe(true)
  })
})

// ─── NP6 — Press opened but ties → press contributes zero ────────────────────
// Holes 1-3: A=3, B=5 (A leads front 3-0). Press on hole 3 for 'front'.
// Holes 4-9: A=4, B=4 (all tied) → press ends 0-0 → MatchTied, press=0.
// Front main: A won 3, B won 0, 6 halved → A wins front (+100 for A).
// Holes 10-18: A=5, B=3 → B wins back and overall.
// Net: A+100 (front) + 0 (press) - 100 (back) - 100 (overall) = A-100.

describe('NP6: press opens but ties — press contributes zero (MatchTied)', () => {
  const game = makeNassauGame(NPIDS, { stake: 100 })
  const holes: HoleData[] = [
    ...Array.from({ length: 3 }, (_, i): HoleData => ({
      number: i + 1, par: 4, index: i + 1,
      scores: { A: 3, B: 5 }, dots: {},
      ...(i === 2 ? { presses: { [NASSAU_GAME_ID]: ['front'] } } : {}),
    })),
    ...Array.from({ length: 6 }, (_, i): HoleData => ({
      number: i + 4, par: 4, index: i + 4,
      scores: { A: 4, B: 4 }, dots: {},
    })),
    ...Array.from({ length: 9 }, (_, i): HoleData => ({
      number: i + 10, par: 4, index: i + 10,
      scores: { A: 5, B: 3 }, dots: {},
    })),
  ]
  const payouts = computeAllPayouts(holes, nassauPlayers, [game])

  it('zero-sum (GR3)', () => expect(zeroSum(payouts, NPIDS)).toBe(0))
  it('A is net -100 (press tie = 0, B wins back + overall)', () => {
    expect(payouts['A']).toBe(-100)
  })
  it('B is net +100', () => expect(payouts['B']).toBe(100))
  it('all deltas are integers (GR2)', () => {
    for (const pid of NPIDS) expect(Number.isInteger(payouts[pid])).toBe(true)
  })
})

// ─── NP7 — GR8 bet-id chain: UUID-style game id ──────────────────────────────
// Verifies the id chain game.id → buildNassauCfg.id → events.declaringBet →
// netByPlayer attribution for a UUID-style game id (not the fixture default).
// Nassau uses netByPlayer (byBet[game.id] is undefined for compound keys), but the
// id still flows through buildNassauCfg → GR8 guard → event attribution.
// Non-zero payouts confirm no silent id mismatch.

describe('NP7: GR8 bet-id chain — UUID-style game id (non-default)', () => {
  const game: GameInstance = {
    id: 'c1d2e3f4-a5b6-7890-abcd-ef1234567890',
    type: 'nassau',
    label: 'Nassau',
    stake: 100,
    playerIds: NPIDS,
    pressRule: 'manual',
    pressScope: 'nine',
    junk: EMPTY_JUNK,
  }
  const holes = makeNassauHoles(Array(18).fill(3), Array(18).fill(5), { gameId: game.id })
  const payouts = computeAllPayouts(holes, nassauPlayers, [game])

  it('zero-sum (GR3) — confirms attribution correct for UUID game id', () => {
    expect(zeroSum(payouts, NPIDS)).toBe(0)
  })
  it('A collects +300 (not zero — confirms no silent id mismatch)', () => {
    expect(payouts['A']).toBe(300)
  })
  it('B pays -300', () => expect(payouts['B']).toBe(-300))
})

// ─── NP8 — Partial round (3 holes) → finalizeNassauRound settles open matches ──
// Only holes 1-3 are played (A=3, B=5 each). Back match never receives a hole.
// finalizeNassauRound: front (A:3, B:0) → A wins front (+100); back (0-0) → MatchTied (0);
// overall (A:3, B:0) → A wins overall (+100). Net: A+200, B-200.
// Tests that finalization correctly resolves partially-played rounds.

describe('NP8: partial round (3 holes) — finalizeNassauRound settles open matches', () => {
  const game = makeNassauGame(NPIDS, { stake: 100 })
  const holes: HoleData[] = Array.from({ length: 3 }, (_, i): HoleData => ({
    number: i + 1, par: 4, index: i + 1,
    scores: { A: 3, B: 5 }, dots: {},
  }))
  const payouts = computeAllPayouts(holes, nassauPlayers, [game])

  it('zero-sum (GR3)', () => expect(zeroSum(payouts, NPIDS)).toBe(0))
  it('A collects +200 (front won + overall won; back MatchTied at 0-0)', () => {
    expect(payouts['A']).toBe(200)
  })
  it('B pays -200', () => expect(payouts['B']).toBe(-200))
  it('all deltas are integers (GR2)', () => {
    for (const pid of NPIDS) expect(Number.isInteger(payouts[pid])).toBe(true)
  })
})

// ─── NP9 — 3-player allPairs via aggregateRound → zero-sum ──────────────────
// 3 players (A/B/C), pairingMode inferred as 'allPairs' (3 >= 3 in buildNassauCfg).
// 9 matches total (front/back/overall × 3 pairs). A=3, B=5, C=5 all 18 holes.
// A beats B (all 3 matches, +300). A beats C (all 3, +300). B vs C: all tied (0).
// Net: A+600, B-300, C-300, Σ=0. Confirms netByPlayer works for multi-pair Nassau.

describe('NP9: 3-player allPairs Nassau — netByPlayer correct across all pairs (GR3)', () => {
  const game = makeNassauGame(['A', 'B', 'C'])
  const players3 = ['A', 'B', 'C'].map(id => makePlayer(id))
  const holes = Array.from({ length: 18 }, (_, i): HoleData => ({
    number: i + 1, par: 4, index: i + 1,
    scores: { A: 3, B: 5, C: 5 }, dots: {},
  }))
  const payouts = computeAllPayouts(holes, players3, [game])

  it('zero-sum across all 3 players (GR3)', () => {
    expect(zeroSum(payouts, ['A', 'B', 'C'])).toBe(0)
  })
  it('A collects +600 (3 matches × 2 pairs × stake)', () => {
    expect(payouts['A']).toBe(600)
  })
  it('B pays -300 (3 matches lost to A; tied with C)', () => expect(payouts['B']).toBe(-300))
  it('C pays -300', () => expect(payouts['C']).toBe(-300))
  it('all deltas are integers (GR2)', () => {
    for (const pid of ['A', 'B', 'C']) expect(Number.isInteger(payouts[pid])).toBe(true)
  })
})

// ─── NP10 — Multi-bet isolation: Nassau + Skins, no cross-bet contamination ───
// Proves single-bet-log precondition empirically.
// Method 1: vary Skins outcomes (C/D) while holding Nassau inputs (A/B) constant
//           → Nassau payouts must be identical across both runs.
// Method 2: vary Nassau outcomes (A/B) while holding Skins inputs (C/D) constant
//           → Skins payouts must be identical across both runs.
// Non-overlapping player sets ensure structural isolation matches semantic isolation.

describe('NP10: multi-bet isolation — Nassau netByPlayer uncontaminated by Skins events', () => {
  // Non-overlapping player sets: Nassau = [A, B]; Skins = [C, D, E] (3-player minimum).
  const nassauGame = makeNassauGame(['A', 'B'], { stake: 100 })
  const skinsGameBase: GameInstance = {
    id: 'skins-isolation-test',
    type: 'skins',
    label: 'Skins',
    stake: 100,
    playerIds: ['C', 'D', 'E'],
    escalating: false,
    junk: EMPTY_JUNK,
  }
  const allPlayers = ['A', 'B', 'C', 'D', 'E'].map(id => makePlayer(id))

  // Nassau: A=3, B=5 (A wins). Skins scenario X: C=3, D=5, E=5 on hole 1 (C wins skin).
  const holesSkinsX = Array.from({ length: 18 }, (_, i): HoleData => ({
    number: i + 1, par: 4, index: i + 1,
    scores: { A: 3, B: 5, C: i === 0 ? 3 : 4, D: i === 0 ? 5 : 4, E: i === 0 ? 5 : 4 },
    dots: {},
  }))

  // Nassau: A=3, B=5 (same). Skins scenario Y: D=3, C=5, E=5 on hole 1 (D wins skin instead).
  const holesSkinsY = Array.from({ length: 18 }, (_, i): HoleData => ({
    number: i + 1, par: 4, index: i + 1,
    scores: { A: 3, B: 5, C: i === 0 ? 5 : 4, D: i === 0 ? 3 : 4, E: i === 0 ? 5 : 4 },
    dots: {},
  }))

  // Nassau: B=3, A=5 (B wins instead). Skins: same as scenario X (C wins).
  const holesNassauBwins = Array.from({ length: 18 }, (_, i): HoleData => ({
    number: i + 1, par: 4, index: i + 1,
    scores: { A: 5, B: 3, C: i === 0 ? 3 : 4, D: i === 0 ? 5 : 4, E: i === 0 ? 5 : 4 },
    dots: {},
  }))

  const payoutsX = computeAllPayouts(holesSkinsX, allPlayers, [nassauGame, skinsGameBase])
  const payoutsY = computeAllPayouts(holesSkinsY, allPlayers, [nassauGame, skinsGameBase])
  const payoutsBwins = computeAllPayouts(holesNassauBwins, allPlayers, [nassauGame, skinsGameBase])

  it('Nassau A payout identical when Skins outcome changes (X→Y)', () => {
    expect(payoutsX['A']).toBe(payoutsY['A'])
  })
  it('Nassau B payout identical when Skins outcome changes (X→Y)', () => {
    expect(payoutsX['B']).toBe(payoutsY['B'])
  })
  it('Skins C payout identical when Nassau outcome changes (A wins→B wins)', () => {
    expect(payoutsX['C']).toBe(payoutsBwins['C'])
  })
  it('Skins D payout identical when Nassau outcome changes (A wins→B wins)', () => {
    expect(payoutsX['D']).toBe(payoutsBwins['D'])
  })
  it('Nassau zero-sum in scenario X (GR3)', () => {
    expect((payoutsX['A'] ?? 0) + (payoutsX['B'] ?? 0)).toBe(0)
  })
  it('Skins zero-sum in scenario X (GR3 — C/D/E)', () => {
    const skinsNet = (payoutsX['C'] ?? 0) + (payoutsX['D'] ?? 0) + (payoutsX['E'] ?? 0)
    expect(skinsNet).toBe(0)
  })
  it('Nassau A collects +300 in scenario X (A wins all 3 Nassau matches)', () => {
    expect(payoutsX['A']).toBe(300)
  })
})
