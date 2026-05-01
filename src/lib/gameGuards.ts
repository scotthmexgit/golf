// src/lib/gameGuards.ts — Wizard-level validation guards for game instances.
//
// Pure functions (no DOM, no store) so they can be tested in vitest's node
// environment and imported by both GameInstanceCard and the wizard page.

import type { GameInstance } from '../types'

// Returns true when a Skins bet has fewer than the required 3 players.
// False for all other game types regardless of player count.
export function skinsTooFewPlayers(game: GameInstance): boolean {
  return game.type === 'skins' && game.playerIds.length < 3
}

// Returns true when a Wolf bet has fewer than 4 or more than 5 players.
// Wolf requires exactly 4 or 5 players per assertValidWolfCfg.
// False for all other game types.
export function wolfInvalidPlayerCount(game: GameInstance): boolean {
  return game.type === 'wolf' && (game.playerIds.length < 4 || game.playerIds.length > 5)
}

// Returns true when a Nassau bet has fewer than the required 2 players.
// False for all other game types.
export function nassauTooFewPlayers(game: GameInstance): boolean {
  return game.type === 'nassau' && game.playerIds.length < 2
}

// Returns true when a Nassau bet is in allPairs mode but has fewer than 3 players.
// allPairs requires ≥3 players: 2 players gives only 1 pair, equivalent to singles.
// False for all other game types or pairingMode=singles.
export function nassauAllPairsTooFewPlayers(game: GameInstance): boolean {
  return (
    game.type === 'nassau' &&
    game.pairingMode === 'allPairs' &&
    game.playerIds.length < 3
  )
}

// Returns true when any game instance in the round is in an invalid state
// that must be resolved before round creation can proceed.
export function hasInvalidGames(games: GameInstance[]): boolean {
  return games.some(g =>
    skinsTooFewPlayers(g) ||
    wolfInvalidPlayerCount(g) ||
    nassauTooFewPlayers(g) ||
    nassauAllPairsTooFewPlayers(g)
  )
}
