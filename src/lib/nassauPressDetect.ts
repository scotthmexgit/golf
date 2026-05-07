// src/lib/nassauPressDetect.ts — Detects Nassau press offers for auto press modes.
//
// Only fires for pressRule=auto-2-down or auto-1-down. Manual mode is player-
// triggered (future NA-4 UI button); returns [] immediately for manual/undefined.
//
// Usage: call after scoring a hole, before persisting. If any PressOffer is
// returned, show PressConfirmationModal. Accepted offers are written to
// hd.presses via setPressConfirmation, then picked up by the bridge.

import type { HoleData, PlayerSetup, GameInstance } from '../types'
import type { MatchState } from '../games/nassau'
import { initialMatches, settleNassauHole, openPress, offerPress, settleNassauWithdrawal } from '../games/nassau'
import { buildHoleState, buildMinimalRoundCfg } from '../bridge/shared'
import { buildNassauCfg } from '../bridge/nassau_bridge'

export interface PressOffer {
  gameId: string
  matchId: string
  downPlayer: string
  pair: [string, string]
}

/**
 * Returns press offers for the current hole across all open Nassau matches.
 *
 * Threads MatchState through all scored holes (in order) to arrive at the
 * post-hole standings, then calls offerPress on each open match. Prior holes'
 * confirmed presses (hd.presses) are applied so the MatchState is accurate.
 *
 * Returns [] for manual mode — manual presses are player-initiated (NA-4).
 */
export function detectNassauPressOffers(
  currentHole: number,
  holes: HoleData[],
  players: PlayerSetup[],
  game: GameInstance,
): PressOffer[] {
  if (!game.pressRule || game.pressRule === 'manual') return []

  const bettingPlayers = players.filter(p => game.playerIds.includes(p.id))
  const cfg = buildNassauCfg(game)
  const roundCfg = buildMinimalRoundCfg(cfg, 'nassau')

  const sortedHoles = [...holes].sort((a, b) => a.number - b.number)
  const holesUpToCurrent = sortedHoles.filter(h => h.number <= currentHole)

  let matches: MatchState[] = initialMatches(cfg)

  for (const hd of holesUpToCurrent) {
    const state = buildHoleState(hd, bettingPlayers)
    const { matches: updatedMatches } = settleNassauHole(state, cfg, roundCfg, matches)
    matches = updatedMatches

    // Apply confirmed presses from PRIOR holes only — current hole's presses are
    // what we're computing now (not yet confirmed by the user).
    const priorGamePresses = hd.number < currentHole ? (hd.presses?.[cfg.id] ?? []) : []
    if (priorGamePresses.length > 0) {
      for (const parentMatchId of priorGamePresses) {
        const parent = matches.find(m => m.id === parentMatchId)
        if (!parent || parent.closed) continue
        const [playerA, playerB] = parent.pair
        const openingPlayer = parent.holesWonA < parent.holesWonB ? playerA : playerB
        const { matches: pressedMatches } = openPress(
          { hole: hd.number, parentMatchId, openingPlayer },
          cfg,
          roundCfg,
          matches,
        )
        matches = pressedMatches
      }
    }

    // Apply withdrawals from prior holes so MatchState stays consistent with
    // what the bridge will produce (bridge also processes withdrew after presses).
    if (hd.number < currentHole && hd.withdrew && hd.withdrew.length > 0) {
      for (const withdrawingPlayer of hd.withdrew) {
        if (!cfg.playerIds.includes(withdrawingPlayer)) continue
        const { matches: newMatches } = settleNassauWithdrawal(
          hd.number, withdrawingPlayer, cfg, roundCfg, matches,
        )
        matches = newMatches
      }
    }
  }

  // After the current hole is scored, check each open match for press offers.
  const offers: PressOffer[] = []
  for (const match of matches) {
    if (match.closed) continue
    if (currentHole < match.startHole || currentHole > match.endHole) continue

    const [playerA, playerB] = match.pair
    let downPlayer: string | null = null
    if (match.holesWonA < match.holesWonB) downPlayer = playerA
    else if (match.holesWonB < match.holesWonA) downPlayer = playerB
    if (!downPlayer) continue

    const events = offerPress(currentHole, match, cfg, downPlayer)
    if (events.length > 0) {
      offers.push({ gameId: game.id, matchId: match.id, downPlayer, pair: [playerA, playerB] })
    }
  }

  return offers
}
