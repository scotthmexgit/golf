// src/store/roundStore.nassau.test.ts — Nassau wizard store state tests.
//
// Tests:
//   Default values applied on addGame('nassau')
//   pairingMode derivation from player count
//   updateGame writes config fields back to store

import { describe, it, expect, beforeEach } from 'vitest'
import { useRoundStore } from './roundStore'

// Reset store before each test — Zustand store is a singleton
function resetStore() {
  useRoundStore.setState(useRoundStore.getInitialState())
}

// useRoundStore.getInitialState is not available on all versions; use reset() instead
function resetAndSetup() {
  useRoundStore.getState().reset()
}

describe('addGame nassau — default values (rule #7: wizard must set explicit defaults)', () => {
  beforeEach(resetAndSetup)

  it('pressRule defaults to manual', () => {
    useRoundStore.getState().addGame('nassau')
    const game = useRoundStore.getState().games[0]!
    expect(game.pressRule).toBe('manual')
  })

  it('pressScope defaults to nine', () => {
    useRoundStore.getState().addGame('nassau')
    const game = useRoundStore.getState().games[0]!
    expect(game.pressScope).toBe('nine')
  })

  it('appliesHandicap defaults to true', () => {
    useRoundStore.getState().addGame('nassau')
    const game = useRoundStore.getState().games[0]!
    expect(game.appliesHandicap).toBe(true)
  })

  it('pairingMode defaults to singles when 1 player (< 3)', () => {
    // Initial store has 1 player (isSelf); bettingIds.length = 1 < 3 → singles
    useRoundStore.getState().addGame('nassau')
    const game = useRoundStore.getState().games[0]!
    expect(game.pairingMode).toBe('singles')
  })

  it('pairingMode defaults to allPairs when 3+ players', () => {
    // Add two more players to reach 3 total
    useRoundStore.getState().addPlayer()
    useRoundStore.getState().addPlayer()
    useRoundStore.getState().addGame('nassau')
    const game = useRoundStore.getState().games[0]!
    expect(game.pairingMode).toBe('allPairs')
  })

  it('pairingMode defaults to singles when exactly 2 players', () => {
    useRoundStore.getState().addPlayer() // now 2 players
    useRoundStore.getState().addGame('nassau')
    const game = useRoundStore.getState().games[0]!
    expect(game.pairingMode).toBe('singles')
  })

  it('no config field is undefined (all four explicitly set)', () => {
    useRoundStore.getState().addGame('nassau')
    const game = useRoundStore.getState().games[0]!
    // rule #7: no silent defaults at user-input boundary
    expect(game.pressRule).not.toBeUndefined()
    expect(game.pressScope).not.toBeUndefined()
    expect(game.pairingMode).not.toBeUndefined()
    expect(game.appliesHandicap).not.toBeUndefined()
  })
})

describe('updateGame — Nassau config fields round-trip through store', () => {
  beforeEach(resetAndSetup)

  it('updateGame writes pressRule change', () => {
    useRoundStore.getState().addGame('nassau')
    const id = useRoundStore.getState().games[0]!.id
    useRoundStore.getState().updateGame(id, { pressRule: 'auto-2-down' })
    expect(useRoundStore.getState().games[0]!.pressRule).toBe('auto-2-down')
  })

  it('updateGame writes pressScope change', () => {
    useRoundStore.getState().addGame('nassau')
    const id = useRoundStore.getState().games[0]!.id
    useRoundStore.getState().updateGame(id, { pressScope: 'match' })
    expect(useRoundStore.getState().games[0]!.pressScope).toBe('match')
  })

  it('updateGame writes pairingMode change', () => {
    useRoundStore.getState().addPlayer()
    useRoundStore.getState().addPlayer()
    useRoundStore.getState().addGame('nassau')
    const id = useRoundStore.getState().games[0]!.id
    useRoundStore.getState().updateGame(id, { pairingMode: 'singles' })
    expect(useRoundStore.getState().games[0]!.pairingMode).toBe('singles')
  })

  it('updateGame writes appliesHandicap=false change', () => {
    useRoundStore.getState().addGame('nassau')
    const id = useRoundStore.getState().games[0]!.id
    useRoundStore.getState().updateGame(id, { appliesHandicap: false })
    expect(useRoundStore.getState().games[0]!.appliesHandicap).toBe(false)
  })
})
