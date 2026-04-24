// src/games/__tests__/aggregate.test.ts
//
// Phase 1 tests for aggregateRound (src/games/aggregate.ts).
// Scope items targeted per test:
//   Test 1 — scope item A (scaffold): empty log
//   Test 2 — scope item A (Junk money formula): JunkAwarded with known values
//   Test 3 — scope item A (purity): same input → same output, two calls
//
// Tests removed in remediation pass:
//   Former Test 3 (RoundingAdjustment) — branch removed (Outcome A: integer-only mandate)
//   Former Test 4 (supersession filter) — filter removed (Option C: deferred to schema pass)

import { describe, it, expect } from 'vitest'
import { aggregateRound, ZeroSumViolationError } from '../aggregate'
import type { ScoringEventLog, RoundConfig, BetSelection } from '../types'
import type { ScoringEvent } from '../events'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeEmptyLog(): ScoringEventLog {
  return { events: [], supersessions: {} }
}

/** Minimal RoundConfig — only the bets field is used by aggregateRound Phase 1. */
function makeRoundCfg(bets: BetSelection[]): RoundConfig {
  return {
    roundId: 'round-1',
    courseName: 'Test Course',
    players: [],
    bets,
    junk: {
      girEnabled: false,
      longestDriveHoles: [],
      ctpEnabled: false,
      longestDriveEnabled: false,
      greenieEnabled: false,
      sandyEnabled: false,
      barkieEnabled: false,
      polieEnabled: false,
      arnieEnabled: false,
      polieMode: 'automatic',
      barkieStrict: false,
      superSandyEnabled: false,
    },
    longestDriveHoles: [],
    locked: false,
    unitSize: 1,
  }
}

/** A minimal BetSelection for Junk tests. */
function makeJunkBet(overrides: Partial<BetSelection> = {}): BetSelection {
  return {
    id: 'bet-junk',
    type: 'skins',
    stake: 100,
    participants: ['alice', 'bob', 'carol'],
    config: {
      id: 'bet-junk',
      stake: 100,
      escalating: false,
      tieRuleFinalHole: 'carryover',
      appliesHandicap: false,
      playerIds: ['alice', 'bob', 'carol'],
      junkItems: ['ctp'],
      junkMultiplier: 2,
    },
    junkItems: ['ctp'],
    junkMultiplier: 2,
    ...overrides,
  }
}

/** Construct a JunkAwarded ScoringEvent. */
function makeJunkAwarded(
  betId: string,
  points: Record<string, number>,
  winners: string[],
): ScoringEvent {
  return {
    kind: 'JunkAwarded',
    timestamp: '2026-04-24T10:00:00.000Z',
    hole: 3,
    actor: 'system',
    declaringBet: betId,
    junk: 'ctp',
    winners,
    points,
  } as ScoringEvent
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('aggregateRound — Phase 1', () => {
  // ── Test 1: scope item A — scaffold ────────────────────────────────────────
  //
  // Empty ScoringEventLog returns RunningLedger with all-zero netByPlayer
  // and empty byBet. Verifies the scaffold returns the correct shape and
  // does not throw ZeroSumViolationError (Σ 0 === 0).

  it('Test 1: empty log returns zeroed ledger with correct shape', () => {
    const log = makeEmptyLog()
    const cfg = makeRoundCfg([])

    const ledger = aggregateRound(log, cfg)

    expect(ledger.netByPlayer).toEqual({})
    expect(ledger.byBet).toEqual({})
    expect(typeof ledger.lastRecomputeTs).toBe('string')
    // lastRecomputeTs is a non-empty ISO string
    expect(ledger.lastRecomputeTs.length).toBeGreaterThan(0)
  })

  // ── Test 2: scope item A — Junk money formula ───────────────────────────────
  //
  // One JunkAwarded event.
  // Fixture: 3 participants (alice, bob, carol), winner alice,
  //   points: { alice: 2, bob: -1, carol: -1 }, stake: 100, junkMultiplier: 2.
  // Expected money: alice = 2 × 100 × 2 = 400, bob = -100×2 = -200, carol = -200.
  // Zero-sum: 400 - 200 - 200 = 0. ✓

  it('Test 2: JunkAwarded applies points × stake × junkMultiplier formula', () => {
    const bet = makeJunkBet({ stake: 100, junkMultiplier: 2 })
    const log: ScoringEventLog = {
      events: [
        makeJunkAwarded(
          'bet-junk',
          { alice: 2, bob: -1, carol: -1 },
          ['alice'],
        ),
      ],
      supersessions: {},
    }
    const cfg = makeRoundCfg([bet])

    const ledger = aggregateRound(log, cfg)

    // netByPlayer
    expect(ledger.netByPlayer['alice']).toBe(400)
    expect(ledger.netByPlayer['bob']).toBe(-200)
    expect(ledger.netByPlayer['carol']).toBe(-200)

    // byBet slice has the same shape
    expect(ledger.byBet['bet-junk']?.['alice']).toBe(400)
    expect(ledger.byBet['bet-junk']?.['bob']).toBe(-200)
    expect(ledger.byBet['bet-junk']?.['carol']).toBe(-200)

    // Zero-sum holds
    const total = Object.values(ledger.netByPlayer).reduce((a, b) => a + b, 0)
    expect(total).toBe(0)
  })

  // ── Test 3: scope item A — purity ─────────────────────────────────────────
  //
  // Two calls with identical input produce identical netByPlayer and byBet.
  // lastRecomputeTs is NOT asserted equal (wall-clock value, may differ
  // between rapid calls).

  it('Test 3: aggregateRound is pure — two calls with identical input produce identical results', () => {
    const bet = makeJunkBet({ stake: 100, junkMultiplier: 2 })
    const log: ScoringEventLog = {
      events: [
        makeJunkAwarded(
          'bet-junk',
          { alice: 2, bob: -1, carol: -1 },
          ['alice'],
        ),
      ],
      supersessions: {},
    }
    const cfg = makeRoundCfg([bet])

    const result1 = aggregateRound(log, cfg)
    const result2 = aggregateRound(log, cfg)

    expect(result1.netByPlayer).toEqual(result2.netByPlayer)
    expect(result1.byBet).toEqual(result2.byBet)
    // lastRecomputeTs not asserted equal — it is new Date().toISOString()
    // and two rapid calls may produce different strings.
  })
})

// ─── Phase 2 fixtures ─────────────────────────────────────────────────────────

/** Construct a SkinWon ScoringEvent with pre-scaled points. */
function makeSkinWon(
  betId: string,
  hole: number,
  winner: string,
  points: Record<string, number>,
): ScoringEvent {
  return {
    kind: 'SkinWon',
    timestamp: '2026-04-24T10:00:00.000Z',
    hole,
    actor: 'system',
    declaringBet: betId,
    winner,
    points,
  } as ScoringEvent
}

/** Construct a WolfHoleResolved ScoringEvent with pre-scaled points. */
function makeWolfHoleResolved(
  betId: string,
  hole: number,
  winners: string[],
  losers: string[],
  points: Record<string, number>,
): ScoringEvent {
  return {
    kind: 'WolfHoleResolved',
    timestamp: '2026-04-24T10:00:00.000Z',
    hole,
    actor: 'system',
    declaringBet: betId,
    winners,
    losers,
    points,
  } as ScoringEvent
}

/** Construct a LoneWolfResolved ScoringEvent with pre-scaled points. */
function makeLoneWolfResolved(
  betId: string,
  hole: number,
  captain: string,
  won: boolean,
  points: Record<string, number>,
): ScoringEvent {
  return {
    kind: 'LoneWolfResolved',
    timestamp: '2026-04-24T10:00:00.000Z',
    hole,
    actor: 'system',
    declaringBet: betId,
    captain,
    won,
    points,
  } as ScoringEvent
}

/** Construct a BlindLoneResolved ScoringEvent with pre-scaled points. */
function makeBlindLoneResolved(
  betId: string,
  hole: number,
  captain: string,
  won: boolean,
  points: Record<string, number>,
): ScoringEvent {
  return {
    kind: 'BlindLoneResolved',
    timestamp: '2026-04-24T10:00:00.000Z',
    hole,
    actor: 'system',
    declaringBet: betId,
    captain,
    won,
    points,
  } as ScoringEvent
}

/** A minimal BetSelection for Skins (no junk scaling — points already pre-scaled). */
function makeSkinsBet(
  id: string,
  participants: string[],
  stake: number,
): BetSelection {
  return {
    id,
    type: 'skins',
    stake,
    participants,
    config: {
      id,
      stake,
      escalating: false,
      tieRuleFinalHole: 'carryover',
      appliesHandicap: false,
      playerIds: participants,
      junkItems: [],
      junkMultiplier: 1,
    },
    junkItems: [],
    junkMultiplier: 1,
  }
}

/** A minimal BetSelection for Wolf (no junk scaling — points already pre-scaled). */
function makeWolfBet(
  id: string,
  participants: string[],
  stake: number,
  loneMultiplier: number,
  blindLoneMultiplier: number,
): BetSelection {
  return {
    id,
    type: 'wolf',
    stake,
    participants,
    config: {
      id,
      stake,
      loneMultiplier,
      blindLoneEnabled: true,
      blindLoneMultiplier,
      tieRule: 'no-points',
      playerIds: participants,
      appliesHandicap: false,
      junkItems: [],
      junkMultiplier: 1,
    },
    junkItems: [],
    junkMultiplier: 1,
  }
}

// ─── Phase 2 tests ────────────────────────────────────────────────────────────

describe('aggregateRound — Phase 2 (Skins + Wolf validation)', () => {
  // ── Test 1: Skins synthetic log ─────────────────────────────────────────────
  //
  // 4 players, 1 Skins bet (bet-skins), stake: 100, junkMultiplier: 1.
  // Points are pre-scaled (money units); reducer applies money[p] = event.points[p].
  //
  // Hole 3: alice wins skin; points: { alice: 300, bob: -100, carol: -100, dave: -100 }
  //   Zero-sum: 300 - 100 - 100 - 100 = 0 ✓
  // Hole 7: bob wins skin; points: { bob: 300, alice: -100, carol: -100, dave: -100 }
  //   Zero-sum: 300 - 100 - 100 - 100 = 0 ✓
  //
  // Net: alice = 300 - 100 = 200, bob = -100 + 300 = 200,
  //      carol = -100 - 100 = -200, dave = -100 - 100 = -200
  // Σ = 200 + 200 - 200 - 200 = 0 ✓

  it('Test 1: Skins synthetic log — two SkinWon events, correct per-player and per-bet totals', () => {
    const skinsBet = makeSkinsBet('bet-skins', ['alice', 'bob', 'carol', 'dave'], 100)
    const log: ScoringEventLog = {
      events: [
        makeSkinWon('bet-skins', 3, 'alice', { alice: 300, bob: -100, carol: -100, dave: -100 }),
        makeSkinWon('bet-skins', 7, 'bob', { bob: 300, alice: -100, carol: -100, dave: -100 }),
      ],
      supersessions: {},
    }
    const cfg = makeRoundCfg([skinsBet])

    const ledger = aggregateRound(log, cfg)

    // netByPlayer
    expect(ledger.netByPlayer['alice']).toBe(200)
    expect(ledger.netByPlayer['bob']).toBe(200)
    expect(ledger.netByPlayer['carol']).toBe(-200)
    expect(ledger.netByPlayer['dave']).toBe(-200)

    // byBet slice matches netByPlayer (single bet)
    expect(ledger.byBet['bet-skins']?.['alice']).toBe(200)
    expect(ledger.byBet['bet-skins']?.['bob']).toBe(200)
    expect(ledger.byBet['bet-skins']?.['carol']).toBe(-200)
    expect(ledger.byBet['bet-skins']?.['dave']).toBe(-200)

    // Zero-sum
    const total = Object.values(ledger.netByPlayer).reduce((a, b) => a + b, 0)
    expect(total).toBe(0)

    // Integer check
    for (const v of Object.values(ledger.netByPlayer)) {
      expect(Number.isInteger(v)).toBe(true)
    }

    // lastRecomputeTs is a non-empty string
    expect(typeof ledger.lastRecomputeTs).toBe('string')
    expect(ledger.lastRecomputeTs.length).toBeGreaterThan(0)
  })

  // ── Test 2: Wolf synthetic log ─────────────────────────────────────────────
  //
  // 4 players, 1 Wolf bet (bet-wolf), stake: 100, loneMultiplier: 2, blindLoneMultiplier: 3.
  // Points pre-scaled (multipliers already baked into fixtures).
  //
  // WolfHoleResolved hole 1: { alice: 100, bob: 100, carol: -100, dave: -100 }
  //   Zero-sum: 100 + 100 - 100 - 100 = 0 ✓
  // LoneWolfResolved hole 4: { alice: 600, bob: -200, carol: -200, dave: -200 }
  //   Zero-sum: 600 - 200 - 200 - 200 = 0 ✓
  // BlindLoneResolved hole 9: { alice: 900, bob: -300, carol: -300, dave: -300 }
  //   Zero-sum: 900 - 300 - 300 - 300 = 0 ✓
  //
  // Net: alice = 100 + 600 + 900 = 1600, bob = 100 - 200 - 300 = -400,
  //      carol = -100 - 200 - 300 = -600, dave = -100 - 200 - 300 = -600
  // Σ = 1600 - 400 - 600 - 600 = 0 ✓

  it('Test 2: Wolf synthetic log — WolfHoleResolved + LoneWolfResolved + BlindLoneResolved', () => {
    const wolfBet = makeWolfBet('bet-wolf', ['alice', 'bob', 'carol', 'dave'], 100, 2, 3)
    const log: ScoringEventLog = {
      events: [
        makeWolfHoleResolved(
          'bet-wolf', 1, ['alice', 'bob'], ['carol', 'dave'],
          { alice: 100, bob: 100, carol: -100, dave: -100 },
        ),
        makeLoneWolfResolved(
          'bet-wolf', 4, 'alice', true,
          { alice: 600, bob: -200, carol: -200, dave: -200 },
        ),
        makeBlindLoneResolved(
          'bet-wolf', 9, 'alice', true,
          { alice: 900, bob: -300, carol: -300, dave: -300 },
        ),
      ],
      supersessions: {},
    }
    const cfg = makeRoundCfg([wolfBet])

    const ledger = aggregateRound(log, cfg)

    // netByPlayer
    expect(ledger.netByPlayer['alice']).toBe(1600)
    expect(ledger.netByPlayer['bob']).toBe(-400)
    expect(ledger.netByPlayer['carol']).toBe(-600)
    expect(ledger.netByPlayer['dave']).toBe(-600)

    // byBet slice matches netByPlayer (single bet)
    expect(ledger.byBet['bet-wolf']?.['alice']).toBe(1600)
    expect(ledger.byBet['bet-wolf']?.['bob']).toBe(-400)
    expect(ledger.byBet['bet-wolf']?.['carol']).toBe(-600)
    expect(ledger.byBet['bet-wolf']?.['dave']).toBe(-600)

    // Zero-sum
    const total = Object.values(ledger.netByPlayer).reduce((a, b) => a + b, 0)
    expect(total).toBe(0)

    // Integer check
    for (const v of Object.values(ledger.netByPlayer)) {
      expect(Number.isInteger(v)).toBe(true)
    }
  })

  // ── Test 3: Mixed Skins + Wolf ──────────────────────────────────────────────
  //
  // 4 players; Skins bet: alice, bob, carol (N=3); Wolf bet: alice, bob, dave (N=3).
  //
  // SkinWon h2: alice wins; points: { alice: 400, bob: -200, carol: -200 }
  //   Zero-sum: 400 - 200 - 200 = 0 ✓
  // SkinWon h5: carol wins; points: { carol: 400, alice: -200, bob: -200 }
  //   Zero-sum: 400 - 200 - 200 = 0 ✓
  // WolfHoleResolved h3: alice+bob win vs dave; points: { alice: 150, bob: 150, dave: -300 }
  //   Zero-sum: 150 + 150 - 300 = 0 ✓
  // WolfHoleResolved h6: dave wins vs alice+bob; points: { dave: 300, alice: -150, bob: -150 }
  //   Zero-sum: 300 - 150 - 150 = 0 ✓
  //
  // byBet['bet-skins']: alice = 400 - 200 = 200, bob = -200 - 200 = -400, carol = -200 + 400 = 200
  // byBet['bet-wolf']:  alice = 150 - 150 = 0,   bob = 150 - 150 = 0,     dave = -300 + 300 = 0
  // netByPlayer: alice = 200 + 0 = 200, bob = -400 + 0 = -400, carol = 200, dave = 0
  // Σ = 200 - 400 + 200 + 0 = 0 ✓

  it('Test 3: Mixed Skins + Wolf — per-bet slices correct, cross-bet netByPlayer sums to zero', () => {
    const skinsBet = makeSkinsBet('bet-skins', ['alice', 'bob', 'carol'], 200)
    const wolfBet = makeWolfBet('bet-wolf', ['alice', 'bob', 'dave'], 150, 2, 3)
    const log: ScoringEventLog = {
      events: [
        makeSkinWon('bet-skins', 2, 'alice', { alice: 400, bob: -200, carol: -200 }),
        makeSkinWon('bet-skins', 5, 'carol', { carol: 400, alice: -200, bob: -200 }),
        makeWolfHoleResolved(
          'bet-wolf', 3, ['alice', 'bob'], ['dave'],
          { alice: 150, bob: 150, dave: -300 },
        ),
        makeWolfHoleResolved(
          'bet-wolf', 6, ['dave'], ['alice', 'bob'],
          { dave: 300, alice: -150, bob: -150 },
        ),
      ],
      supersessions: {},
    }
    const cfg = makeRoundCfg([skinsBet, wolfBet])

    const ledger = aggregateRound(log, cfg)

    // byBet['bet-skins']
    expect(ledger.byBet['bet-skins']?.['alice']).toBe(200)
    expect(ledger.byBet['bet-skins']?.['bob']).toBe(-400)
    expect(ledger.byBet['bet-skins']?.['carol']).toBe(200)

    // byBet['bet-wolf']
    expect(ledger.byBet['bet-wolf']?.['alice']).toBe(0)
    expect(ledger.byBet['bet-wolf']?.['bob']).toBe(0)
    expect(ledger.byBet['bet-wolf']?.['dave']).toBe(0)

    // Players absent from a bet's events do not bleed into the wrong byBet slice.
    // dave never appears in skins event.points → not in byBet['bet-skins'] (or 0 if present).
    // carol never appears in wolf event.points → not in byBet['bet-wolf'] (or 0 if present).
    expect(ledger.byBet['bet-skins']?.['dave'] ?? 0).toBe(0)
    expect(ledger.byBet['bet-wolf']?.['carol'] ?? 0).toBe(0)

    // netByPlayer
    expect(ledger.netByPlayer['alice']).toBe(200)
    expect(ledger.netByPlayer['bob']).toBe(-400)
    expect(ledger.netByPlayer['carol']).toBe(200)
    expect(ledger.netByPlayer['dave']).toBe(0)

    // Zero-sum
    const total = Object.values(ledger.netByPlayer).reduce((a, b) => a + b, 0)
    expect(total).toBe(0)

    // Integer check
    for (const v of Object.values(ledger.netByPlayer)) {
      expect(Number.isInteger(v)).toBe(true)
    }
  })
})

// ─── ZeroSumViolationError ────────────────────────────────────────────────────
//
// Verify the error class is thrown with correct metadata when zero-sum is
// violated (construct a corrupt log with an unbalanced monetary event).
// This test is supplemental — not a numbered Phase 1 scope item — but
// validates Topic 5 runtime enforcement.

describe('ZeroSumViolationError', () => {
  it('is thrown when netByPlayer does not sum to zero', () => {
    // Construct a corrupt SkinWon event that has unbalanced points.
    // SkinWon is a non-Junk monetary event: money[p] = event.points[p].
    const unbalancedEvent: ScoringEvent = {
      kind: 'SkinWon',
      timestamp: '2026-04-24T10:00:00.000Z',
      hole: 1,
      actor: 'system',
      declaringBet: 'bet-skins',
      winner: 'alice',
      // Intentionally unbalanced (should be { alice: 3, bob: -1, carol: -1, dave: -1 })
      points: { alice: 5, bob: -1, carol: -1, dave: -1 },
    }
    const log: ScoringEventLog = {
      events: [unbalancedEvent],
      supersessions: {},
    }
    const cfg = makeRoundCfg([
      {
        id: 'bet-skins',
        type: 'skins',
        stake: 1,
        participants: ['alice', 'bob', 'carol', 'dave'],
        config: {
          id: 'bet-skins',
          stake: 1,
          escalating: false,
          tieRuleFinalHole: 'carryover',
          appliesHandicap: false,
          playerIds: ['alice', 'bob', 'carol', 'dave'],
          junkItems: [],
          junkMultiplier: 1,
        },
        junkItems: [],
        junkMultiplier: 1,
      },
    ])

    expect(() => aggregateRound(log, cfg)).toThrowError(ZeroSumViolationError)
    expect(() => aggregateRound(log, cfg)).toThrow(/Zero-sum violated/)
  })
})
