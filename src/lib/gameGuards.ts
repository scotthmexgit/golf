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

// Returns true when any game instance in the round is in an invalid state
// that must be resolved before round creation can proceed.
// Currently only Skins with < 3 players is invalid; other types are added here
// when they unpark and bring their own requirements.
export function hasInvalidGames(games: GameInstance[]): boolean {
  return games.some(skinsTooFewPlayers)
}
