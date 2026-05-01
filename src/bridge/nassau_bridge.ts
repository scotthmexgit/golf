// src/bridge/nassau_bridge.ts — Nassau orchestration layer.
//
// Exports:
//   buildNassauCfg  — maps GameInstance to NassauCfg (v1 defaults)
//   settleNassauBet — runs the full engine path for a Nassau bet
//
// Design:
//   Nassau threads MatchState[] explicitly across holes — unlike stateless Skins/Wolf,
//   Nassau presses add new MatchState entries mid-round. Each hole's holeData.presses
//   (array of match IDs) drives press opening after the hole is scored. openingPlayer
//   is derived from the current MatchState (the down player).
//
// Portability: imports from src/types and src/games/* only.
// No next/*, react, react-dom, fs, path, or @prisma/client imports.

import type { HoleData, PlayerSetup, GameInstance, PayoutMap } from '../types'
import type { NassauCfg, ScoringEvent } from '../games/types'
import {
  initialMatches,
  openPress,
  settleNassauHole,
  settleNassauWithdrawal,
  finalizeNassauRound,
} from '../games/nassau'
import type { MatchState } from '../games/nassau'
import { buildHoleState, buildMinimalRoundCfg, payoutMapFromLedger } from './shared'

// ── Nassau config builder ─────────────────────────────────────────────────────
//
// Maps GameInstance fields to NassauCfg. Nassau-specific fields (pressRule,
// pressScope, pairingMode) default until the NA-2 wizard surfaces them.

export function buildNassauCfg(game: GameInstance): NassauCfg {
  return {
    id: game.id,
    stake: game.stake,
    playerIds: game.playerIds,
    // NA-2 wizard will surface these; defaults until then.
    pressRule: game.pressRule ?? 'manual',
    pressScope: game.pressScope ?? 'nine',
    pairingMode: game.pairingMode ?? (game.playerIds.length >= 3 ? 'allPairs' : 'singles'),
    // Defaults true; NA-2 wizard surfaces the toggle via game.appliesHandicap.
    appliesHandicap: game.appliesHandicap ?? true,
    junkItems: [],
    junkMultiplier: 1,
  }
}

// ── Nassau orchestration ──────────────────────────────────────────────────────

/**
 * Runs the full Nassau engine path for one bet across all holes.
 *
 * MatchState[] is threaded explicitly across the hole loop. After each hole is
 * scored, holeData.presses (match IDs confirmed at that hole) triggers openPress.
 * The down player (openingPlayer) is derived from the post-hole MatchState:
 * holesWonA < holesWonB → pair[0] is down; else pair[1] is down.
 *
 * finalizeNassauRound settles any remaining open matches after all holes.
 *
 * Monetary events: MatchClosedOut and NassauWithdrawalSettled carry stake-scaled
 * points. MatchTied carries none. Payout map is the sum of all monetary points.
 */
export function settleNassauBet(
  holes: HoleData[],
  players: PlayerSetup[],
  game: GameInstance,
): { events: ScoringEvent[]; payouts: PayoutMap } {
  const bettingPlayers = players.filter(p => game.playerIds.includes(p.id))
  const cfg = buildNassauCfg(game)
  const roundCfg = buildMinimalRoundCfg(cfg, 'nassau')

  // Sort ascending — deterministic MatchState threading regardless of input order.
  const sortedHoles = [...holes].sort((a, b) => a.number - b.number)

  let matches: MatchState[] = initialMatches(cfg)
  const allEvents: ScoringEvent[] = []

  for (const hd of sortedHoles) {
    const state = buildHoleState(hd, bettingPlayers)
    const { events: holeEvents, matches: updatedMatches } = settleNassauHole(
      state, cfg, roundCfg, matches,
    )
    allEvents.push(...holeEvents)
    matches = updatedMatches

    // Press confirmations: holeData.presses contains match IDs confirmed at this hole.
    if (hd.presses && hd.presses.length > 0) {
      for (const parentMatchId of hd.presses) {
        const parent = matches.find(m => m.id === parentMatchId)
        if (!parent || parent.closed) continue

        // Derive down player from current MatchState.
        // holesWonA < holesWonB means pair[0] has fewer wins → pair[0] is down.
        const [playerA, playerB] = parent.pair
        const openingPlayer = parent.holesWonA < parent.holesWonB ? playerA : playerB

        const { events: pressEvents, matches: pressedMatches } = openPress(
          { hole: hd.number, parentMatchId, openingPlayer },
          cfg,
          roundCfg,
          matches,
        )
        allEvents.push(...pressEvents)
        matches = pressedMatches
      }
    }

    // Withdrawal settlement: process after presses so any open press matches
    // are also settled. Only players in this bet can trigger withdrawal events.
    if (hd.withdrew && hd.withdrew.length > 0) {
      for (const withdrawingPlayer of hd.withdrew) {
        if (!cfg.playerIds.includes(withdrawingPlayer)) continue
        const { events: withdrawalEvents, matches: newMatches } = settleNassauWithdrawal(
          hd.number,
          withdrawingPlayer,
          cfg,
          roundCfg,
          matches,
        )
        allEvents.push(...withdrawalEvents)
        matches = newMatches
      }
    }
  }

  // Settle remaining open matches (ties at round end).
  const finalEvents = finalizeNassauRound(cfg, roundCfg, matches)
  allEvents.push(...finalEvents)

  // Sum monetary event points. MatchClosedOut and NassauWithdrawalSettled carry points;
  // MatchTied does not (tied matches settle for zero).
  const ledger: Record<string, number> = {}
  for (const e of allEvents) {
    if (e.kind === 'MatchClosedOut' || e.kind === 'NassauWithdrawalSettled') {
      for (const [pid, pts] of Object.entries(e.points)) {
        ledger[pid] = (ledger[pid] ?? 0) + pts
      }
    }
  }

  return {
    events: allEvents,
    payouts: payoutMapFromLedger(ledger, cfg.playerIds),
  }
}
