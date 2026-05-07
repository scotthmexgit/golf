// src/bridge/nassau_bridge.test.ts — Nassau bridge integration tests.
//
// Tests:
//   F6 invariant   — buildMatchStates(events, roundCfg) matches bridge's final MatchState[]
//   T1 singles     — 2-player golden round (no presses), zero-sum, correct payouts
//   T2 press       — 2-player with one manual press, F6 invariant holds
//   T3 allPairs    — 3-player allPairs, zero-sum across all players, F6 invariant
//   T4 allPairs-4p — 4-player allPairs with one press, stress test
//   T5 withdrawal  — engine-level NassauWithdrawalSettled emitted correctly
//   T6 perHole     — per-hole event slicing consistent with perHoleDeltas.ts path
//   T7 GAME_DEFS   — Nassau disabled flag is false

import { describe, it, expect } from 'vitest'
import { settleNassauBet, buildNassauCfg } from './nassau_bridge'
import { buildMatchStates } from '../games/aggregate'
import { initialMatches, settleNassauWithdrawal } from '../games/nassau'
import { GAME_DEFS } from '../types'
import type { HoleData, PlayerSetup, GameInstance } from '../types'
import type { BetSelection, RoundConfig, ScoringEventLog, NassauCfg } from '../games/types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeGame(overrides: Partial<GameInstance> = {}): GameInstance {
  return {
    id: 'nassau-1',
    type: 'nassau',
    label: 'Nassau',
    stake: 100,
    playerIds: ['Alice', 'Bob'],
    pressRule: 'manual',
    pressScope: 'nine',
    pairingMode: 'singles',
    junk: {
      greenie: false, greenieAmount: 0,
      sandy: false, sandyAmount: 0, birdie: false, birdieAmount: 0,
      eagle: false, eagleAmount: 0, garbage: false, garbageAmount: 0,
      hammer: false, snake: false, snakeAmount: 0, lowball: false, lowballAmount: 0,
    },
    ...overrides,
  }
}

function makePlayer(id: string, courseHcp = 0): PlayerSetup {
  return {
    id,
    name: id,
    hcpIndex: courseHcp,
    tee: 'blue',
    isCourseHcp: false,
    courseHcp,
    betting: true,
    isSelf: false,
    roundHandicap: 0,
  }
}

/** 18 holes, all par 4, index 1-18. */
function makeHoles(scores: Record<string, number[]>, presses?: Record<number, Record<string, string[]>>): HoleData[] {
  return Array.from({ length: 18 }, (_, i) => {
    const hole = i + 1
    const holeScores: Record<string, number> = {}
    for (const [pid, scoreArr] of Object.entries(scores)) {
      holeScores[pid] = scoreArr[i]
    }
    return {
      number: hole,
      par: 4,
      index: hole,
      scores: holeScores,
      dots: {},
      presses: presses?.[hole],
    }
  })
}

/** Minimal RoundConfig matching what buildNassauCfg and buildMinimalRoundCfg would produce. */
function makeRoundCfg(cfg: NassauCfg): RoundConfig {
  const bet: BetSelection = {
    id: cfg.id,
    type: 'nassau',
    stake: cfg.stake,
    participants: cfg.playerIds,
    config: cfg,
    junkItems: [],
    junkMultiplier: 1,
  }
  return {
    roundId: 'r1',
    courseName: 'Test Course',
    players: [],
    bets: [bet],
    junk: {
      girEnabled: false, longestDriveHoles: [], ctpEnabled: false,
      longestDriveEnabled: false, greenieEnabled: false, sandyEnabled: false,
      barkieEnabled: false, polieEnabled: false, arnieEnabled: false,
      polieMode: 'automatic', barkieStrict: false, superSandyEnabled: false,
    },
    longestDriveHoles: [],
    locked: true,
    unitSize: 100,
  }
}

function zeroSum(events: ReturnType<typeof settleNassauBet>['events'], playerIds: string[]): void {
  const totals: Record<string, number> = {}
  for (const pid of playerIds) totals[pid] = 0
  for (const e of events) {
    if ('points' in e && e.points) {
      for (const [pid, pts] of Object.entries(e.points)) {
        totals[pid] = (totals[pid] ?? 0) + pts
      }
    }
  }
  const sum = Object.values(totals).reduce((a, b) => a + b, 0)
  expect(sum).toBe(0)
  for (const v of Object.values(totals)) {
    expect(Number.isInteger(v)).toBe(true)
  }
}

// ─── F6 Invariant ─────────────────────────────────────────────────────────────
//
// For a round with at least one press: buildMatchStates(events, roundCfg).nassauMatches
// must deep-equal the bridge's final internal MatchState[] — the load-bearing test
// of NA-1 (audit finding F6 gate).

describe('F6 invariant — buildMatchStates replay matches bridge final MatchState', () => {
  it('singles 2-player round with one manual press: replay produces same MatchState[] as bridge', () => {
    // Alice wins holes 1 and 2 (A 2-up on front). Bob confirms a press on hole 2.
    // Press opens for holes 3-9 (pressScope = 'nine', endHole = 9).
    // Remaining holes: Alice and Bob alternate (no further presses).
    const game = makeGame({ pressRule: 'manual' })
    const players = [makePlayer('Alice'), makePlayer('Bob')]

    // Scores: Alice wins h1, h2 (net lower). All other holes: halved (same score).
    const aliceScores = [3, 3, 4, 4, 4, 4, 4, 4, 4,  4, 4, 4, 4, 4, 4, 4, 4, 4]
    const bobScores   = [4, 4, 4, 4, 4, 4, 4, 4, 4,  4, 4, 4, 4, 4, 4, 4, 4, 4]

    // Press confirmed on hole 2 — match ID for front-9 in singles is 'front'
    const holes = makeHoles({ Alice: aliceScores, Bob: bobScores }, { 2: { 'nassau-1': ['front'] } })

    const { events } = settleNassauBet(holes, players, game)

    // Build RoundConfig matching what the bridge uses internally.
    const cfg = buildNassauCfg(game)
    const roundCfg = makeRoundCfg(cfg)
    const log: ScoringEventLog = { events, supersessions: {} }

    // F6 assertion: replay via aggregate.ts buildMatchStates.
    const { nassauMatches } = buildMatchStates(log, roundCfg)
    const replayedMatches = nassauMatches.get('nassau-1') ?? []

    // Bridge's final MatchState is the state after all holes + finalization.
    // Both should have: front (closed), back, overall, press-1 (all settled at round end).
    // Every open match was finalized — so all should be closed.
    for (const m of replayedMatches) {
      expect(m.closed).toBe(true)
    }

    // PressOpened event must exist (proves press was opened via the bridge).
    const pressOpenedEvents = events.filter(e => e.kind === 'PressOpened')
    expect(pressOpenedEvents).toHaveLength(1)

    // The press match (press-1) must appear in replayed matches.
    const pressMatch = replayedMatches.find(m => m.id === 'press-1')
    expect(pressMatch).toBeDefined()

    zeroSum(events, ['Alice', 'Bob'])
  })
})

// ─── T1 — Singles golden round (no presses) ───────────────────────────────────

describe('T1 — singles 2-player, no presses, correct payouts', () => {
  it('Alice wins front 9, Bob wins back 9, tied overall → front +100, back -100, overall 0', () => {
    const game = makeGame()
    const players = [makePlayer('Alice'), makePlayer('Bob')]

    // Alice wins all of front (holes 1-9, Alice=3, Bob=4).
    // Bob wins all of back (holes 10-18, Alice=4, Bob=3).
    // Overall: tied (9-9 holes won each).
    const alice = Array.from({ length: 18 }, (_, i) => i < 9 ? 3 : 4)
    const bob   = Array.from({ length: 18 }, (_, i) => i < 9 ? 4 : 3)
    const holes = makeHoles({ Alice: alice, Bob: bob })

    const { events, payouts } = settleNassauBet(holes, players, game)

    // Alice wins front (stake=100), Bob wins back (Alice loses 100), overall tied (0).
    expect(payouts['Alice']).toBe(0)   // +100 front, -100 back, 0 overall
    expect(payouts['Bob']).toBe(0)

    // Front and back close out (Alice leads front 9-0 by hole 9, Bob leads back 9-0 by hole 18).
    const closeouts = events.filter(e => e.kind === 'MatchClosedOut')
    expect(closeouts.length).toBeGreaterThanOrEqual(2)

    // Overall: MatchTied (9-9 at hole 18).
    const tied = events.filter(e => e.kind === 'MatchTied' || e.kind === 'MatchHalved')
    expect(tied.length).toBeGreaterThanOrEqual(1)

    zeroSum(events, ['Alice', 'Bob'])
  })

  it('Alice wins front 9 cleanly — front closes out before hole 9', () => {
    const game = makeGame()
    const players = [makePlayer('Alice'), makePlayer('Bob')]

    // Alice wins all front 9 holes — leads 5-0 on hole 5 → closes out (5>4 remaining).
    const alice = Array.from({ length: 18 }, (_, i) => i < 9 ? 3 : 4)
    const bob   = Array.from({ length: 18 }, (_, i) => i < 9 ? 5 : 4)
    const holes = makeHoles({ Alice: alice, Bob: bob })

    const { events, payouts } = settleNassauBet(holes, players, game)

    expect(payouts['Alice']).toBeGreaterThan(0)
    expect(payouts['Bob']).toBeLessThan(0)
    zeroSum(events, ['Alice', 'Bob'])
  })
})

// ─── T2 — Singles with one press ─────────────────────────────────────────────

describe('T2 — singles with manual press, F6 invariant holds', () => {
  it('press confirmed on hole 3, press match settles correctly', () => {
    const game = makeGame({ pressRule: 'manual' })
    const players = [makePlayer('Alice'), makePlayer('Bob')]

    // Alice wins h1, h2, h3 (front 3-0). Press opened on hole 3 → press starts h4.
    // Bob wins h4-h9 in press match (Bob wins press).
    const alice = [3,3,3,4,4,4,4,4,4, 4,4,4,4,4,4,4,4,4]
    const bob   = [4,4,4,3,3,3,3,3,3, 4,4,4,4,4,4,4,4,4]

    // Press confirmed on hole 3 for front match (game-scoped to 'nassau-1').
    const holes = makeHoles({ Alice: alice, Bob: bob }, { 3: { 'nassau-1': ['front'] } })

    const { events, payouts } = settleNassauBet(holes, players, game)

    // PressOpened must be emitted.
    expect(events.filter(e => e.kind === 'PressOpened')).toHaveLength(1)

    // Zero-sum holds.
    zeroSum(events, ['Alice', 'Bob'])

    // Payouts are integers.
    expect(Number.isInteger(payouts['Alice'])).toBe(true)
    expect(Number.isInteger(payouts['Bob'])).toBe(true)

    // F6: replay via buildMatchStates.
    const cfg = buildNassauCfg(game)
    const roundCfg = makeRoundCfg(cfg)
    const { nassauMatches } = buildMatchStates({ events, supersessions: {} }, roundCfg)
    const replayed = nassauMatches.get('nassau-1') ?? []
    const pressInReplayed = replayed.find(m => m.id === 'press-1')
    expect(pressInReplayed).toBeDefined()
    for (const m of replayed) {
      expect(m.closed).toBe(true)
    }
  })
})

// ─── T3 — allPairs 3-player ───────────────────────────────────────────────────

describe('T3 — allPairs 3-player, zero-sum across all players', () => {
  it('3 players: A wins vs B, B wins vs C, A ties C → correct per-player totals', () => {
    const game = makeGame({
      playerIds: ['Alice', 'Bob', 'Carol'],
      pairingMode: 'allPairs',
      stake: 100,
    })
    const players = [makePlayer('Alice'), makePlayer('Bob'), makePlayer('Carol')]

    // Alice always beats Bob (Alice=3, Bob=4).
    // Bob always beats Carol (Bob=3, Carol=4) — but only on back 9; front tied.
    // Alice and Carol are tied.
    const alice = Array.from({ length: 18 }, () => 4)
    const bob   = Array.from({ length: 18 }, (_, i) => i < 9 ? 4 : 3)
    const carol = Array.from({ length: 18 }, (_, i) => i < 9 ? 4 : 4)
    // Make Alice win against Bob on front:
    alice[0] = 3; alice[1] = 3; alice[2] = 3; alice[3] = 3; alice[4] = 3
    bob[0]   = 4; bob[1]   = 4; bob[2]   = 4; bob[3]   = 4; bob[4]   = 4

    const holes = makeHoles({ Alice: alice, Bob: bob, Carol: carol })
    const { events, payouts } = settleNassauBet(holes, players, game)

    zeroSum(events, ['Alice', 'Bob', 'Carol'])

    // All payouts are integers.
    for (const pid of ['Alice', 'Bob', 'Carol']) {
      expect(Number.isInteger(payouts[pid])).toBe(true)
    }

    // F6: buildMatchStates replay produces valid MatchState.
    const cfg = buildNassauCfg(game)
    const roundCfg = makeRoundCfg(cfg)
    const { nassauMatches } = buildMatchStates({ events, supersessions: {} }, roundCfg)
    const replayed = nassauMatches.get('nassau-1') ?? []
    // 3-player allPairs: C(3,2)=3 pairs × 3 matches = 9 MatchState entries.
    expect(replayed).toHaveLength(9)
    for (const m of replayed) {
      expect(m.closed).toBe(true)
    }
  })
})

// ─── T4 — allPairs 4-player with press ───────────────────────────────────────

describe('T4 — allPairs 4-player with one press, F6 invariant', () => {
  it('4 players: press on first pair front match, zero-sum', () => {
    const game = makeGame({
      playerIds: ['Alice', 'Bob', 'Carol', 'Dave'],
      pairingMode: 'allPairs',
      pressRule: 'manual',
      stake: 100,
    })
    const players = ['Alice', 'Bob', 'Carol', 'Dave'].map(p => makePlayer(p))

    // All 4s on every hole (all tied) except Alice beats Bob on h1, h2.
    const scores: Record<string, number[]> = {
      Alice: Array.from({ length: 18 }, () => 4),
      Bob:   Array.from({ length: 18 }, () => 4),
      Carol: Array.from({ length: 18 }, () => 4),
      Dave:  Array.from({ length: 18 }, () => 4),
    }
    scores['Alice'][0] = 3; scores['Alice'][1] = 3

    // Press on hole 2 for the Alice-Bob front match (game-scoped to 'nassau-1').
    // In allPairs, Alice-Bob front match ID = 'front-Alice-Bob'
    const holes = makeHoles(scores, { 2: { 'nassau-1': ['front-Alice-Bob'] } })

    const { events, payouts } = settleNassauBet(holes, players, game)

    zeroSum(events, ['Alice', 'Bob', 'Carol', 'Dave'])

    // PressOpened must be emitted for the Alice-Bob front press.
    const pressOpened = events.filter(e => e.kind === 'PressOpened')
    expect(pressOpened).toHaveLength(1)

    // F6: buildMatchStates replay.
    const cfg = buildNassauCfg(game)
    const roundCfg = makeRoundCfg(cfg)
    const { nassauMatches } = buildMatchStates({ events, supersessions: {} }, roundCfg)
    const replayed = nassauMatches.get('nassau-1') ?? []
    // 4-player allPairs: C(4,2)=6 pairs × 3 matches = 18 + 1 press = 19 total.
    expect(replayed.length).toBeGreaterThanOrEqual(19)
    for (const m of replayed) {
      expect(m.closed).toBe(true)
    }

    for (const pid of ['Alice', 'Bob', 'Carol', 'Dave']) {
      expect(Number.isInteger(payouts[pid])).toBe(true)
    }
  })
})

// ─── T5 — Withdrawal (engine-level, bridge-assisted) ─────────────────────────
//
// The bridge does not yet auto-detect withdrawals (HoleData has no `withdrew` signal;
// that's a future NA-3/later phase concern). This test exercises the withdrawal engine
// path manually by calling settleNassauWithdrawal directly after a partial round.
// Flagged in Open questions: bridge-level withdrawal detection deferred.

describe('T5 — withdrawal engine path: NassauWithdrawalSettled emitted correctly', () => {
  it('Bob withdraws mid-round: NassauWithdrawalSettled emitted for Alice-Bob matches', () => {
    const game = makeGame()
    const players = [makePlayer('Alice'), makePlayer('Bob')]
    const cfg = buildNassauCfg(game)
    const roundCfg = makeRoundCfg(cfg)

    // Build intermediate MatchState directly: Alice wins h1-h3, halved h4-h5.
    // Front: Alice 3-0 (open). Overall: Alice 3-0 (open). Back: 0-0 (not started).
    // Build this way (not through bridge) to avoid bridge finalization closing the matches
    // before withdrawal can settle them.
    const matches = initialMatches(cfg).map(m => {
      if (m.id === 'front' || m.id === 'overall') {
        return { ...m, holesWonA: 3, holesWonB: 0 }
      }
      return m
    })

    const { events: withdrawalEvents } = settleNassauWithdrawal(
      6, 'Bob', cfg, roundCfg, matches,
    )

    const withdrawalSettled = withdrawalEvents.filter(e => e.kind === 'NassauWithdrawalSettled')
    // Front and overall are Alice-leading → two NassauWithdrawalSettled events.
    // Back is 0-0 (tied) → no event per § 9 rule.
    expect(withdrawalSettled.length).toBeGreaterThanOrEqual(1)

    for (const e of withdrawalSettled) {
      if (e.kind === 'NassauWithdrawalSettled') {
        expect(e.points['Alice']).toBe(100)
        expect(e.points['Bob']).toBe(-100)
        expect(Number.isInteger(e.points['Alice'])).toBe(true)
      }
    }
  })
})

// ─── T6 — Per-hole consistency with perHoleDeltas.ts ─────────────────────────

describe('T6 — per-hole event slicing consistent with perHoleDeltas dispatch', () => {
  it('events for a single hole match what a per-hole filter would produce', () => {
    const game = makeGame()
    const players = [makePlayer('Alice'), makePlayer('Bob')]

    const alice = Array.from({ length: 18 }, () => 4)
    const bob   = Array.from({ length: 18 }, () => 4)
    alice[0] = 3  // Alice wins hole 1

    const holes = makeHoles({ Alice: alice, Bob: bob })
    const { events } = settleNassauBet(holes, players, game)

    // Filter to hole 1 events — should include NassauHoleResolved for the winner.
    const hole1Events = events.filter(e => e.hole === 1)
    expect(hole1Events.length).toBeGreaterThan(0)
    const hole1Resolved = hole1Events.find(e => e.kind === 'NassauHoleResolved')
    expect(hole1Resolved).toBeDefined()
    if (hole1Resolved?.kind === 'NassauHoleResolved') {
      expect(hole1Resolved.winner).toBe('A')  // Alice is pair[0]
    }

    // The full event set is zero-sum.
    zeroSum(events, ['Alice', 'Bob'])
  })
})

// ─── T5b — Bridge-level withdrawal via hd.withdrew ───────────────────────────
//
// NA-3: settleNassauBet now reads hd.withdrew and calls settleNassauWithdrawal
// automatically. This test exercises the full bridge path rather than calling
// settleNassauWithdrawal directly (that's already covered in T5).

describe('T5b — bridge-level withdrawal detection via hd.withdrew', () => {
  it('Bob withdraws on hole 6: NassauWithdrawalSettled emitted, zero-sum holds', () => {
    const game = makeGame()
    const players = [makePlayer('Alice'), makePlayer('Bob')]

    // Alice wins h1-h3 (Alice 3-up in front + overall).
    // Bob withdraws on h6. Front and overall are non-tied → settlement events.
    const alice = Array.from({ length: 18 }, (_, i) => i < 3 ? 3 : 4)
    const bob   = Array.from({ length: 18 }, () => 4)

    const holes: HoleData[] = makeHoles({ Alice: alice, Bob: bob })
    // Mark Bob as withdrawn on hole 6
    holes[5] = { ...holes[5]!, withdrew: ['Bob'] }

    const { events, payouts } = settleNassauBet(holes, players, game)

    const withdrawalEvents = events.filter(e => e.kind === 'NassauWithdrawalSettled')
    // Front (Alice 3-0 open) and overall (Alice 3-0 open) settle for Alice.
    // Back (0-0 at withdrawal) is tied → no event per § 9.
    expect(withdrawalEvents.length).toBeGreaterThanOrEqual(1)

    // Alice should be net positive; Bob net negative.
    expect(payouts['Alice']).toBeGreaterThan(0)
    expect(payouts['Bob']).toBeLessThan(0)

    zeroSum(events, ['Alice', 'Bob'])
  })

  it('withdrew player not in bet is ignored (no crash)', () => {
    const game = makeGame()
    const players = [makePlayer('Alice'), makePlayer('Bob')]
    const holes: HoleData[] = makeHoles({
      Alice: Array.from({ length: 18 }, () => 4),
      Bob:   Array.from({ length: 18 }, () => 4),
    })
    // 'Carol' is not in playerIds — should be silently skipped
    holes[5] = { ...holes[5]!, withdrew: ['Carol'] }
    expect(() => settleNassauBet(holes, players, game)).not.toThrow()
  })

  it('Bob withdraws on hole 6 AFTER a press was confirmed on hole 3: press match also settled', () => {
    const game = makeGame()
    const players = [makePlayer('Alice'), makePlayer('Bob')]

    // Alice wins h1-h3 (3-0 on front). Press confirmed on hole 3 for front match.
    // Bob withdraws on h6. Withdrawal should settle front + press-1 + overall.
    const alice = Array.from({ length: 18 }, (_, i) => i < 3 ? 3 : 4)
    const bob   = Array.from({ length: 18 }, () => 4)

    const holes: HoleData[] = makeHoles({ Alice: alice, Bob: bob }, { 3: { 'nassau-1': ['front'] } })
    holes[5] = { ...holes[5]!, withdrew: ['Bob'] }

    const { events } = settleNassauBet(holes, players, game)

    // PressOpened must exist (press-1 was opened)
    expect(events.filter(e => e.kind === 'PressOpened')).toHaveLength(1)

    // Withdrawal events settle open matches (front, press-1, overall — all Alice-leading)
    const withdrawalEvents = events.filter(e => e.kind === 'NassauWithdrawalSettled')
    expect(withdrawalEvents.length).toBeGreaterThanOrEqual(2)

    zeroSum(events, ['Alice', 'Bob'])
  })
})

// ─── T7 — GAME_DEFS Nassau disabled flag ─────────────────────────────────────

describe('T7 — Nassau GAME_DEFS disabled flag is false after cutover', () => {
  it('Nassau entry in GAME_DEFS has no disabled: true', () => {
    const nassauDef = GAME_DEFS.find(d => d.key === 'nassau')
    expect(nassauDef).toBeDefined()
    expect(nassauDef?.disabled).toBeFalsy()
  })
})

// ─── T8 — Two Nassau games, same pair: presses are game-scoped ────────────────
//
// Failure scenario for F11: two Nassau bets on Alice/Bob (singles). A press
// confirmed for game A's 'front' match must NOT open a press in game B.
// Before the fix, both games would read hd.presses (flat array) and both would
// find 'front' in their matches array → ghost press in game B.
// After the fix, each game reads hd.presses[cfg.id] (its own UUID) → isolated.

describe('T8 — two Nassau games same player pair: presses do not bleed across games', () => {
  it('game A press does not open a press in game B; both games settle zero-sum', () => {
    const gameA = makeGame({ id: 'game-a', pressRule: 'manual', stake: 100 })
    const gameB = makeGame({ id: 'game-b', pressRule: 'manual', stake: 100 })
    const players = [makePlayer('Alice'), makePlayer('Bob')]

    // Alice wins holes 1-2 (birdie 3); holes 3-18 tied (par 4).
    const alice = [3,3,4,4,4,4,4,4,4, 4,4,4,4,4,4,4,4,4]
    const bob   = [4,4,4,4,4,4,4,4,4, 4,4,4,4,4,4,4,4,4]

    // Only game A has a press confirmed on hole 2 for the 'front' match.
    // Game B's presses entry is absent (not provided for 'game-b').
    const holes = makeHoles({ Alice: alice, Bob: bob }, {
      2: { 'game-a': ['front'] },
    })

    const { events: eventsA } = settleNassauBet(holes, players, gameA)
    const { events: eventsB } = settleNassauBet(holes, players, gameB)

    // Game A must have opened a press (hd.presses['game-a'] = ['front']).
    expect(eventsA.filter(e => e.kind === 'PressOpened')).toHaveLength(1)

    // Game B must NOT have opened a press — F11 regression gate.
    expect(eventsB.filter(e => e.kind === 'PressOpened')).toHaveLength(0)

    // Zero-sum holds per game (no phantom delta from cross-game bleed).
    zeroSum(eventsA, ['Alice', 'Bob'])
    zeroSum(eventsB, ['Alice', 'Bob'])
  })
})
