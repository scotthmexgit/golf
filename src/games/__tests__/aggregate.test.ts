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
