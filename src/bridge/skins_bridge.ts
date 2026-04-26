// src/bridge/skins_bridge.ts — Skins orchestration layer.
//
// Exports:
//   settleSkinsBet — runs the full engine path for a Skins bet.
//
// Generic utilities (buildHoleState, EMPTY_JUNK, buildMinimalRoundCfg,
// payoutMapFromLedger) are imported from ./shared.
//
// Portability: imports from src/types (shared UI types) and
// src/games/* (pure engine). No next/*, react, react-dom, fs, or path imports.

import type { HoleData, PlayerSetup, GameInstance } from '../types'
import type { SkinsCfg, ScoringEvent } from '../games/types'
import { settleSkinsHole, finalizeSkinsRound } from '../games/skins'
import { buildHoleState, buildMinimalRoundCfg } from './shared'

// ── Skins-specific config builder ─────────────────────────────────────────────
//
// Maps GameInstance fields to SkinsCfg. GameInstance carries stake, playerIds,
// id, and escalating (optional); Skins-specific engine fields not present on
// GameInstance are filled with locked v1 defaults.

function buildSkinsCfg(game: GameInstance): SkinsCfg {
  return {
    id: game.id,
    stake: game.stake,
    // game.escalating is optional on GameInstance; default true per game_skins.md §4.
    escalating: game.escalating ?? true,
    // HARDCODE: tieRuleFinalHole not on GameInstance; 'split' is the engine default
    // per game_skins.md §4 and keeps the round zero-sum without extending play.
    // Replace when GameInstance grows a tieRuleFinalHole config field.
    tieRuleFinalHole: 'split',
    // HARDCODE: appliesHandicap not on GameInstance; v1 Skins always applies handicap.
    // Replace with a config field read when per-game handicap toggling is needed.
    appliesHandicap: true,
    playerIds: game.playerIds,
    junkItems: [],
    // HARDCODE: GameInstance has no junkMultiplier field; junk is out of scope for
    // v1 Skins. See docs/proposals/bridge-file-structure.md §1 inventory.
    // Replace when junk re-enters Skins scope.
    junkMultiplier: 1,
  }
}

// ── Skins orchestration ───────────────────────────────────────────────────────

/**
 * Runs the full Skins engine path for one bet across all holes.
 *
 * Uses the same signature shape as settleStrokePlayBet: constructed internally
 * from GameInstance so computeGamePayouts (which only has GameInstance) can
 * call this directly when the Skins cutover lands.
 *
 * Ledger is built from SkinWon events only. Skins finalization is integer-safe
 * (potPerOpponent × loserCount is always integer) so no RoundingAdjustment is
 * emitted. SkinCarryForfeit events carry carryPoints, not points, and do not
 * represent money movement — they are excluded from the ledger.
 *
 * Returns the finalization events and a per-player ledger (net deltas for the
 * bet). Pass the ledger to `payoutMapFromLedger` to get a PayoutMap.
 */
export function settleSkinsBet(
  holes: HoleData[],
  players: PlayerSetup[],
  game: GameInstance,
): { events: ScoringEvent[]; ledger: Record<string, number> } {
  const bettingPlayers = players.filter(p => game.playerIds.includes(p.id))
  const cfg = buildSkinsCfg(game)
  const roundCfg = buildMinimalRoundCfg(cfg, 'skins')

  // Per-hole pass: translate HoleData → HoleState, collect engine events.
  const holeEvents: ScoringEvent[] = []
  for (const hd of holes) {
    const state = buildHoleState(hd, bettingPlayers)
    holeEvents.push(...settleSkinsHole(state, cfg, roundCfg))
  }

  // Finalization: resolves carry accumulation, tieRuleFinalHole, SkinVoid.
  // Returns carry-adjusted events; SkinCarried events for non-final holes are
  // preserved (informational), SkinWon events are scaled by carry multiplier.
  const finalEvents = finalizeSkinsRound(holeEvents, cfg)

  // Reduce to per-player ledger: only SkinWon events carry monetary points.
  const ledger: Record<string, number> = {}
  for (const e of finalEvents) {
    if (e.kind === 'SkinWon' && 'points' in e) {
      for (const [pid, pts] of Object.entries(e.points)) {
        ledger[pid] = (ledger[pid] ?? 0) + pts
      }
    }
  }

  return { events: finalEvents, ledger }
}
