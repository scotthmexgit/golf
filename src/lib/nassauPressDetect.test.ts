// src/lib/nassauPressDetect.test.ts — Tests for auto-mode and manual-mode press detection.
//
// detectNassauPressOffers tests:
//   manual mode returns []
//   auto-2-down: not offered until exactly 2-down
//   auto-2-down: offered when exactly 2-down after current hole
//   auto-1-down: offered when exactly 1-down
//   allPairs: correct matchId returned (pair-suffixed)
//   prior presses are applied before detection
//
// detectManualNassauPressOffers tests (B5):
//   manual mode + down player → returns offers (front + overall)
//   manual mode + tied (no down player) → returns []
//   auto-2-down mode → returns []
//   auto-1-down mode → returns []

import { describe, it, expect } from 'vitest'
import { detectNassauPressOffers, detectManualNassauPressOffers } from './nassauPressDetect'
import type { HoleData, PlayerSetup, GameInstance, JunkConfig } from '../types'

const EMPTY_JUNK: JunkConfig = {
  greenie: false, greenieAmount: 0, sandy: false, sandyAmount: 0,
  birdie: false, birdieAmount: 0, eagle: false, eagleAmount: 0,
  garbage: false, garbageAmount: 0, hammer: false,
  snake: false, snakeAmount: 0, lowball: false, lowballAmount: 0,
}

function makeGame(overrides: Partial<GameInstance> = {}): GameInstance {
  return {
    id: 'nassau-1',
    type: 'nassau',
    label: 'Nassau',
    stake: 100,
    playerIds: ['Alice', 'Bob'],
    pressRule: 'auto-2-down',
    pressScope: 'nine',
    pairingMode: 'singles',
    appliesHandicap: false,
    junk: EMPTY_JUNK,
    ...overrides,
  }
}

function makePlayer(id: string): PlayerSetup {
  return {
    id, name: id, hcpIndex: 0, tee: 'blue',
    isCourseHcp: false, courseHcp: 0, betting: true, isSelf: false, roundHandicap: 0,
  }
}

/** Build HoleData[1..18] with given scores. All par 4, index = hole number. */
function makeHoles(
  scoresByPlayer: Record<string, number[]>,
  pressesMap: Record<number, Record<string, string[]>> = {},
): HoleData[] {
  return Array.from({ length: 18 }, (_, i) => {
    const hole = i + 1
    const scores: Record<string, number> = {}
    for (const [pid, arr] of Object.entries(scoresByPlayer)) {
      scores[pid] = arr[i]
    }
    return { number: hole, par: 4, index: hole, scores, dots: {}, presses: pressesMap[hole] }
  })
}

const players = [makePlayer('Alice'), makePlayer('Bob')]

// ── Manual mode ───────────────────────────────────────────────────────────────

describe('detectNassauPressOffers — manual mode returns []', () => {
  it('manual mode: no auto offers even when 2-down', () => {
    const game = makeGame({ pressRule: 'manual' })
    // Alice wins holes 1-2 → Bob is 2-down
    const holes = makeHoles({
      Alice: [3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      Bob:   [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    })
    expect(detectNassauPressOffers(2, holes, players, game)).toEqual([])
  })

  it('undefined pressRule treated as manual: returns []', () => {
    const game = makeGame({ pressRule: undefined })
    const holes = makeHoles({
      Alice: [3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      Bob:   [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    })
    expect(detectNassauPressOffers(2, holes, players, game)).toEqual([])
  })
})

// ── auto-2-down ───────────────────────────────────────────────────────────────

describe('detectNassauPressOffers — auto-2-down', () => {
  it('returns [] when only 1-down (threshold not met)', () => {
    const game = makeGame({ pressRule: 'auto-2-down' })
    // Alice wins only hole 1 → Bob is 1-down
    const holes = makeHoles({
      Alice: [3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      Bob:   [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    })
    expect(detectNassauPressOffers(1, holes, players, game)).toEqual([])
  })

  it('returns offer when exactly 2-down on front match — includes gameId', () => {
    const game = makeGame({ pressRule: 'auto-2-down' })
    // Alice wins holes 1-2 → Bob is 2-down in front + overall
    const holes = makeHoles({
      Alice: [3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      Bob:   [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    })
    // After hole 2: front=2-0(offer), overall=2-0(offer), back=0-0(no offer)
    const offers = detectNassauPressOffers(2, holes, players, game)
    expect(offers.length).toBeGreaterThanOrEqual(1)
    expect(offers.some(o => o.matchId === 'front')).toBe(true)
    expect(offers.every(o => o.downPlayer === 'Bob')).toBe(true)
    // Every offer must carry the game's UUID
    expect(offers.every(o => o.gameId === 'nassau-1')).toBe(true)
  })

  it('returns [] when 3-down (threshold exceeded, not exactly 2)', () => {
    const game = makeGame({ pressRule: 'auto-2-down' })
    // Alice wins holes 1-3 → Bob is 3-down
    const holes = makeHoles({
      Alice: [3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      Bob:   [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    })
    const offers = detectNassauPressOffers(3, holes, players, game)
    // front is 3-down → no offer (auto-2-down threshold is exact)
    expect(offers.find(o => o.matchId === 'front')).toBeUndefined()
  })
})

// ── auto-1-down ───────────────────────────────────────────────────────────────

describe('detectNassauPressOffers — auto-1-down', () => {
  it('offers press when exactly 1-down', () => {
    const game = makeGame({ pressRule: 'auto-1-down' })
    // Alice wins only hole 1 → Bob is 1-down in front + overall
    const holes = makeHoles({
      Alice: [3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      Bob:   [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    })
    const offers = detectNassauPressOffers(1, holes, players, game)
    expect(offers.length).toBeGreaterThanOrEqual(1)
    expect(offers.some(o => o.matchId === 'front')).toBe(true)
  })

  it('returns [] when exactly 2-down (threshold not met for auto-1-down)', () => {
    const game = makeGame({ pressRule: 'auto-1-down' })
    // Alice wins holes 1-2 → Bob 2-down
    const holes = makeHoles({
      Alice: [3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      Bob:   [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    })
    const offers = detectNassauPressOffers(2, holes, players, game)
    // 2-down is not exactly 1-down → no offer
    expect(offers.find(o => o.matchId === 'front')).toBeUndefined()
  })
})

// ── allPairs mode ─────────────────────────────────────────────────────────────

describe('detectNassauPressOffers — allPairs: pair-suffixed matchIds', () => {
  it('offers use pair-suffixed matchId for allPairs 3-player game', () => {
    const game = makeGame({
      playerIds: ['Alice', 'Bob', 'Carol'],
      pairingMode: 'allPairs',
      pressRule: 'auto-2-down',
    })
    const threePlayers = [makePlayer('Alice'), makePlayer('Bob'), makePlayer('Carol')]
    // Alice wins holes 1-2 against Bob and Carol
    const holes = makeHoles({
      Alice: [3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      Bob:   [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      Carol: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    })
    const offers = detectNassauPressOffers(2, holes, threePlayers, game)
    // front-Alice-Bob and front-Alice-Carol should offer (both 2-down)
    const matchIds = offers.map(o => o.matchId)
    expect(matchIds).toContain('front-Alice-Bob')
    expect(matchIds).toContain('front-Alice-Carol')
  })
})

// ── detectManualNassauPressOffers (B5) ────────────────────────────────────────

describe('detectManualNassauPressOffers — manual mode with down player returns offers', () => {
  it('returns offers for front and overall matches when Bob is 1-down after hole 1', () => {
    const game = makeGame({ pressRule: 'manual' })
    const holes = makeHoles({
      Alice: [3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      Bob:   [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    })
    const offers = detectManualNassauPressOffers(1, holes, players, game)
    expect(offers.length).toBeGreaterThanOrEqual(2)
    // Front and overall are both 1-0 after hole 1 → offers for Bob in both
    expect(offers.some(o => o.matchId === 'front')).toBe(true)
    expect(offers.some(o => o.matchId === 'overall')).toBe(true)
    expect(offers.every(o => o.downPlayer === 'Bob')).toBe(true)
    expect(offers.every(o => o.gameId === 'nassau-1')).toBe(true)
  })

  it('returns [] when no player is down (all ties)', () => {
    const game = makeGame({ pressRule: 'manual' })
    const holes = makeHoles({
      Alice: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      Bob:   [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    })
    const offers = detectManualNassauPressOffers(1, holes, players, game)
    expect(offers).toEqual([])
  })
})

describe('detectManualNassauPressOffers — auto mode returns []', () => {
  it('returns [] for auto-2-down even when a player is down', () => {
    const game = makeGame({ pressRule: 'auto-2-down' })
    const holes = makeHoles({
      Alice: [3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      Bob:   [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    })
    expect(detectManualNassauPressOffers(2, holes, players, game)).toEqual([])
  })

  it('returns [] for auto-1-down', () => {
    const game = makeGame({ pressRule: 'auto-1-down' })
    const holes = makeHoles({
      Alice: [3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      Bob:   [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    })
    expect(detectManualNassauPressOffers(1, holes, players, game)).toEqual([])
  })
})

// ── Prior presses respected ───────────────────────────────────────────────────

describe('detectNassauPressOffers — prior presses respected in state threading', () => {
  it('already-pressed front match does not re-offer on current hole', () => {
    const game = makeGame({ pressRule: 'auto-2-down' })
    // Alice wins h1, h2 (Bob 2-down). Press confirmed on hole 2 (front).
    // On hole 3 Bob still loses → press-1 now 1-down but front is already in press-1.
    // Front match was pressed on h2; press starts h3. Bob 1-down in press-1 on h3.
    const holes = makeHoles(
      {
        Alice: [3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
        Bob:   [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      },
      { 2: { 'nassau-1': ['front'] } }, // press on hole 2 already confirmed (game-scoped)
    )
    // On hole 3: front is still open (press started h3). Alice won h3 → press-1 is 1-down.
    // auto-2-down → no offer for press-1 (only 1-down).
    const offers = detectNassauPressOffers(3, holes, players, game)
    expect(offers.find(o => o.matchId === 'press-1')).toBeUndefined()
  })
})
