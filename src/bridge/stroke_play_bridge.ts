// src/bridge/stroke_play_bridge.ts — Stroke Play orchestration layer.
//
// Exports:
//   settleStrokePlayBet — runs the full engine path for a Stroke Play bet.
//
// Generic utilities (buildHoleState, EMPTY_JUNK, buildMinimalRoundCfg,
// payoutMapFromLedger) live in ./shared and are imported here.
//
// Portability: imports from src/types (shared UI types) and
// src/games/* (pure engine). No next/*, react, react-dom, fs, or path imports.

import type { HoleData, PlayerSetup, GameInstance } from '../types'
import type { StrokePlayCfg, ScoringEvent } from '../games/types'
import { settleStrokePlayHole, finalizeStrokePlayRound } from '../games/stroke_play'
import { buildHoleState, buildMinimalRoundCfg } from './shared'

// ── Stroke-Play-specific config builder ───────────────────────────────────────
//
// GameInstance carries stake, playerIds, and id; the engine fields not present
// on GameInstance are filled with locked v1 defaults (Option α Minimal).

function buildSpCfg(game: GameInstance): StrokePlayCfg {
  return {
    id: game.id,
    stake: game.stake,
    settlementMode: 'winner-takes-pot',
    stakePerStroke: 1,
    placesPayout: [],
    tieRule: 'split',
    cardBackOrder: [9, 6, 3, 1],
    // HARDCODE (Option α Minimal): appliesHandicap is always true in v1 Stroke Play.
    // Replace with a config field read when Option β/γ expands scope beyond α and
    // per-game handicap toggling is supported. See STROKE_PLAY_PLAN.md §2.
    appliesHandicap: true,
    playerIds: game.playerIds,
    junkItems: [],
    // HARDCODE: GameInstance has no junkMultiplier field; junk is out of scope for
    // v1 Stroke Play (STROKE_PLAY_PLAN.md §1e). Replace when junk re-enters scope.
    junkMultiplier: 1,
  }
}

// ── Stroke Play orchestration ─────────────────────────────────────────────────

/**
 * Runs the full Stroke Play engine path for one bet across all holes.
 *
 * Signature deviation from SP-3 prompt suggestion (which specified
 * `bet: BetSelection, roundCfg: RoundConfig` params): those are constructed
 * internally from `game: GameInstance` so SP-4's computeGamePayouts integration
 * point (which only has GameInstance) can call this directly without the caller
 * building config objects.
 *
 * Returns the finalization events and a per-player ledger (net deltas for the
 * bet). Pass the ledger to `payoutMapFromLedger` to get a PayoutMap.
 */
export function settleStrokePlayBet(
  holes: HoleData[],
  players: PlayerSetup[],
  game: GameInstance,
): { events: ScoringEvent[]; ledger: Record<string, number> } {
  const bettingPlayers = players.filter(p => game.playerIds.includes(p.id))
  const cfg = buildSpCfg(game)
  const roundCfg = buildMinimalRoundCfg(cfg, 'strokePlay')

  // Per-hole pass: translate HoleData → HoleState, collect engine events.
  const holeEvents: ScoringEvent[] = []
  for (const hd of holes) {
    const state = buildHoleState(hd, bettingPlayers)
    holeEvents.push(...settleStrokePlayHole(state, cfg, roundCfg))
  }

  // Finalization: resolves tieRule, settlement mode, IncompleteCard exclusions.
  // Returns new events only (StrokePlaySettled, TieFallthrough, RoundingAdjustment,
  // FieldTooSmall) — hole-recorded events are consumed internally.
  const finalEvents = finalizeStrokePlayRound(holeEvents, cfg)

  // Reduce settlement events to a per-player ledger.
  const ledger: Record<string, number> = {}
  for (const e of finalEvents) {
    if ((e.kind === 'StrokePlaySettled' || e.kind === 'RoundingAdjustment') && 'points' in e) {
      for (const [pid, pts] of Object.entries(e.points)) {
        ledger[pid] = (ledger[pid] ?? 0) + pts
      }
    }
  }

  return { events: finalEvents, ledger }
}
