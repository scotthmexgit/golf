import { describe, it, expect } from 'vitest'
import { skinsTooFewPlayers, hasInvalidGames } from './gameGuards'
import type { GameInstance, JunkConfig } from '../types'

const EMPTY_JUNK: JunkConfig = {
  greenie: false, greenieAmount: 0, sandy: false, sandyAmount: 0,
  birdie: false, birdieAmount: 0, eagle: false, eagleAmount: 0,
  garbage: false, garbageAmount: 0, hammer: false,
  snake: false, snakeAmount: 0, lowball: false, lowballAmount: 0,
}

function makeGame(type: GameInstance['type'], playerCount: number): GameInstance {
  const ids = Array.from({ length: playerCount }, (_, i) => `p${i + 1}`)
  return { id: `game-${type}`, type, label: type, stake: 500, playerIds: ids, junk: EMPTY_JUNK }
}

// ── skinsTooFewPlayers ────────────────────────────────────────────────────────

describe('skinsTooFewPlayers — Skins instances', () => {
  it('returns true when 0 players in a Skins game', () => {
    expect(skinsTooFewPlayers(makeGame('skins', 0))).toBe(true)
  })
  it('returns true when 1 player in a Skins game', () => {
    expect(skinsTooFewPlayers(makeGame('skins', 1))).toBe(true)
  })
  it('returns true when 2 players in a Skins game', () => {
    expect(skinsTooFewPlayers(makeGame('skins', 2))).toBe(true)
  })
  it('returns false when exactly 3 players (minimum) in a Skins game', () => {
    expect(skinsTooFewPlayers(makeGame('skins', 3))).toBe(false)
  })
  it('returns false when 4 players in a Skins game', () => {
    expect(skinsTooFewPlayers(makeGame('skins', 4))).toBe(false)
  })
  it('returns false when 5 players in a Skins game', () => {
    expect(skinsTooFewPlayers(makeGame('skins', 5))).toBe(false)
  })
})

describe('skinsTooFewPlayers — non-Skins game types are always valid', () => {
  for (const type of ['strokePlay', 'matchPlay', 'nassau', 'wolf'] as const) {
    it(`returns false for ${type} regardless of player count`, () => {
      expect(skinsTooFewPlayers(makeGame(type, 1))).toBe(false)
      expect(skinsTooFewPlayers(makeGame(type, 2))).toBe(false)
      expect(skinsTooFewPlayers(makeGame(type, 5))).toBe(false)
    })
  }
})

// ── hasInvalidGames ────────────────────────────────────────────────────────────

describe('hasInvalidGames', () => {
  it('returns false for an empty games array', () => {
    expect(hasInvalidGames([])).toBe(false)
  })
  it('returns false for a valid Stroke Play game (2 players)', () => {
    expect(hasInvalidGames([makeGame('strokePlay', 2)])).toBe(false)
  })
  it('returns false for a valid Skins game (3 players)', () => {
    expect(hasInvalidGames([makeGame('skins', 3)])).toBe(false)
  })
  it('returns true for a Skins game with 2 players', () => {
    expect(hasInvalidGames([makeGame('skins', 2)])).toBe(true)
  })
  it('returns true for a Skins game with 1 player', () => {
    expect(hasInvalidGames([makeGame('skins', 1)])).toBe(true)
  })
  it('returns false for SP(2) + Skins(3): both valid', () => {
    expect(hasInvalidGames([makeGame('strokePlay', 2), makeGame('skins', 3)])).toBe(false)
  })
  it('returns true for SP(2) + Skins(2): Skins invalid', () => {
    expect(hasInvalidGames([makeGame('strokePlay', 2), makeGame('skins', 2)])).toBe(true)
  })
  it('returns true when one of two Skins instances is invalid', () => {
    // Two Skins games: first valid (3 players), second invalid (2 players).
    const g1 = { ...makeGame('skins', 3), id: 'sk-a' }
    const g2 = { ...makeGame('skins', 2), id: 'sk-b' }
    expect(hasInvalidGames([g1, g2])).toBe(true)
  })
  it('returns false when both Skins instances are valid', () => {
    const g1 = { ...makeGame('skins', 3), id: 'sk-a' }
    const g2 = { ...makeGame('skins', 4), id: 'sk-b' }
    expect(hasInvalidGames([g1, g2])).toBe(false)
  })
})
