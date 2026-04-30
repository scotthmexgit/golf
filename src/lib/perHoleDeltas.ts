// src/lib/perHoleDeltas.ts — Per-hole monetary delta computation for all active bets.
//
// computePerHoleDeltas runs each active game's bridge and accumulates events
// that carry both a non-null hole number and a points map into two structures:
//
//   totals   — { holeNumber → { playerId → netDelta } }  (sum across all games)
//   byGame   — { holeNumber → { gameId → { playerId → delta } } }  (per-game breakdown)
//
// Design notes:
//   • Stroke Play: finalizeStrokePlayRound produces StrokePlaySettled with
//     hole: null, so SP contributes nothing to either map. The second row on
//     the scorecard shows "—" for every hole in a SP-only round (Choice B,
//     SKINS_PLAN.md §1 Decision B). The accordion shows "Stroke Play —".
//   • Skins (SK-2): add case 'skins' → settleSkinsBet(...).events. SkinWon
//     events carry hole + points and land in both maps immediately.
//   • Parked games (wolf, nassau, matchPlay, etc.): default → [] until their
//     bridges are wired.

import type { HoleData, PlayerSetup, GameInstance } from '../types'
import type { ScoringEvent } from '../games/types'
import { settleStrokePlayBet } from '../bridge/stroke_play_bridge'
import { settleSkinsBet } from '../bridge/skins_bridge'
import { settleWolfBet } from '../bridge/wolf_bridge'

export interface PerHoleDeltasResult {
  /** Summed across all games: { holeNumber → { playerId → netDelta } } */
  totals: Record<number, Record<string, number>>
  /** Per-game breakdown: { holeNumber → { gameId → { playerId → delta } } } */
  byGame: Record<number, Record<string, Record<string, number>>>
}

// Returns the raw ScoringEvent[] for one game. Only events with a non-null
// hole field and a points map land in the result maps; the rest are ignored.
function gameHoleEvents(
  holes: HoleData[],
  players: PlayerSetup[],
  game: GameInstance,
): ScoringEvent[] {
  switch (game.type) {
    case 'strokePlay':
      return settleStrokePlayBet(holes, players, game).events
    case 'skins':
      return settleSkinsBet(holes, players, game).events
    case 'wolf':
      return settleWolfBet(holes, players, game).events
    default:
      return []
  }
}

// computePerHoleDeltas performs a single bridge-dispatch pass across all active
// games and returns both a summed total and a per-game breakdown per hole.
// Holes with no monetary events are absent from both maps — callers default to 0.
export function computePerHoleDeltas(
  holes: HoleData[],
  players: PlayerSetup[],
  games: GameInstance[],
): PerHoleDeltasResult {
  const totals: Record<number, Record<string, number>> = {}
  const byGame: Record<number, Record<string, Record<string, number>>> = {}

  for (const game of games) {
    const events = gameHoleEvents(holes, players, game)
    for (const event of events) {
      if (event.hole == null || !('points' in event)) continue

      // Accumulate into totals (sum across games).
      const holeTotal = totals[event.hole] ?? (totals[event.hole] = {})
      // Accumulate into byGame (per-game breakdown).
      const holeGames = byGame[event.hole] ?? (byGame[event.hole] = {})
      const gameMap = holeGames[game.id] ?? (holeGames[game.id] = {})

      for (const [pid, pts] of Object.entries(event.points)) {
        holeTotal[pid] = (holeTotal[pid] ?? 0) + pts
        gameMap[pid] = (gameMap[pid] ?? 0) + pts
      }
    }
  }

  return { totals, byGame }
}
