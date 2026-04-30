// src/bridge/wolf_bridge.ts — Wolf orchestration layer.
//
// Exports:
//   buildWolfCfg    — maps GameInstance to WolfCfg (v1 hardcoded defaults)
//   getWolfCaptain  — returns captain for a given hole (UI helper for WolfDeclare)
//   settleWolfBet   — runs the full engine path for a Wolf bet
//
// Bridge internals:
//   translateWolfPick  — maps HoleData.wolfPick + captain → WolfDecision | null
//
// Generic utilities (buildHoleState, buildMinimalRoundCfg, payoutMapFromLedger)
// are imported from ./shared.
//
// Portability: imports from src/types (shared UI types) and
// src/games/* (pure engine). No next/*, react, react-dom, fs, or path imports.

import type { HoleData, PlayerSetup, GameInstance } from '../types'
import type { WolfCfg, RoundConfig, ScoringEvent } from '../games/types'
import type { PlayerId } from '../games/types'
import {
  settleWolfHole,
  finalizeWolfRound,
  applyWolfCaptainRotation,
} from '../games/wolf'
import type { WolfDecision } from '../games/wolf'
import { buildHoleState, buildMinimalRoundCfg } from './shared'

// ── Wolf-specific config builder ──────────────────────────────────────────────
//
// Maps GameInstance fields to WolfCfg. Fields not present on GameInstance are
// filled with locked v1 defaults (same pattern as skins_bridge.ts §buildSkinsCfg).

export function buildWolfCfg(game: GameInstance): WolfCfg {
  const loneMultiplier = game.loneWolfMultiplier ?? 2
  return {
    id: game.id,
    stake: game.stake,
    playerIds: game.playerIds,
    loneMultiplier,
    // HARDCODE: blindLoneEnabled not on GameInstance; always enabled in v1.
    blindLoneEnabled: true,
    // HARDCODE: blindLoneMultiplier not on GameInstance; one above loneMultiplier,
    // minimum 3 per assertValidWolfCfg. Replace when GameInstance gains a field.
    blindLoneMultiplier: Math.max(loneMultiplier + 1, 3),
    // HARDCODE: tieRule not on GameInstance; 'carryover' is the most common Wolf
    // rule and doubles the pot on consecutive tied holes. Replace when surfaced.
    tieRule: 'carryover',
    // HARDCODE: appliesHandicap not on GameInstance; v1 Wolf always applies handicap.
    appliesHandicap: true,
    junkItems: [],
    // HARDCODE: GameInstance has no junkMultiplier field; junk is out of scope for v1.
    junkMultiplier: 1,
  }
}

// ── Round config builder ──────────────────────────────────────────────────────
//
// Wolf requires roundCfg.players to be populated (used by applyWolfCaptainRotation
// for rotation and withdrawal tracking). buildMinimalRoundCfg leaves players: [];
// this builder overrides with the actual betting players.

function buildWolfRoundCfg(cfg: WolfCfg, bettingPlayers: PlayerSetup[]): RoundConfig {
  return {
    ...buildMinimalRoundCfg(cfg, 'wolf'),
    players: bettingPlayers,
  }
}

// ── Decision translation ──────────────────────────────────────────────────────
//
// Maps HoleData.wolfPick (legacy string field) + the captain for that hole
// to a typed WolfDecision, or null when no pick is set.
//
// wolfPick values:
//   undefined / '' → null (WolfDecisionMissing — zero delta)
//   'solo'         → Lone Wolf (not blind)
//   'blind'        → Blind Lone Wolf
//   any other str  → Partner Wolf; the string is the partner's player ID

function translateWolfPick(
  wolfPick: string | undefined,
  captain: PlayerId,
): WolfDecision | null {
  if (!wolfPick) return null
  if (wolfPick === 'solo') return { kind: 'lone', captain, blind: false }
  if (wolfPick === 'blind') return { kind: 'lone', captain, blind: true }
  return { kind: 'partner', captain, partner: wolfPick }
}

// ── Captain helper (UI surface) ───────────────────────────────────────────────
//
// Returns the captain for a given hole number. Called by the WolfDeclare
// component (WF-5) to determine who declares on each hole.
//
// eventsSoFar: pass prior hole events to support withdrawal-shifted rotation
// (v1 never has withdrawals, but the parameter is threaded for correctness).

export function getWolfCaptain(
  hole: number,
  game: GameInstance,
  players: PlayerSetup[],
  eventsSoFar?: ScoringEvent[],
): { captain: PlayerId; events: ScoringEvent[] } {
  const cfg = buildWolfCfg(game)
  const bettingPlayers = players.filter(p => game.playerIds.includes(p.id))
  const roundCfg = buildWolfRoundCfg(cfg, bettingPlayers)
  return applyWolfCaptainRotation(hole, cfg, roundCfg, eventsSoFar)
}

// ── Wolf orchestration ────────────────────────────────────────────────────────

/**
 * Runs the full Wolf engine path for one bet across all holes.
 *
 * Uses the same signature shape as settleSkinsBet and settleStrokePlayBet:
 * constructed from GameInstance so computeGamePayouts (which only has
 * GameInstance) can call this directly.
 *
 * Decisions are derived internally from HoleData.wolfPick + captain rotation,
 * matching the pattern used by the legacy wolfPick field. The caller does not
 * need to supply decisions explicitly.
 *
 * eventsSoFar accumulates per-hole events across the loop so that
 * applyWolfCaptainRotation receives the full prior event history. In v1
 * (no PlayerWithdrew events), this has no observable effect, but the
 * threading is correct for future phases.
 *
 * Ledger is built from WolfHoleResolved, LoneWolfResolved, and BlindLoneResolved
 * events (the only event kinds that carry a monetary points map). Events are
 * already carry-scaled by finalizeWolfRound before ledger reduction.
 */
export function settleWolfBet(
  holes: HoleData[],
  players: PlayerSetup[],
  game: GameInstance,
): { events: ScoringEvent[]; ledger: Record<string, number> } {
  const bettingPlayers = players.filter(p => game.playerIds.includes(p.id))
  const cfg = buildWolfCfg(game)
  const roundCfg = buildWolfRoundCfg(cfg, bettingPlayers)

  const holeEvents: ScoringEvent[] = []
  let eventsSoFar: ScoringEvent[] = []

  for (const hd of holes) {
    // Determine captain for this hole (includes withdrawal-shift logic).
    const { captain, events: rotEvents } = applyWolfCaptainRotation(
      hd.number,
      cfg,
      roundCfg,
      eventsSoFar,
    )
    holeEvents.push(...rotEvents)
    eventsSoFar = [...eventsSoFar, ...rotEvents]

    // Translate legacy wolfPick string to a typed WolfDecision.
    const decision = translateWolfPick(hd.wolfPick, captain)
    const state = buildHoleState(hd, bettingPlayers)
    const perHoleEvents = settleWolfHole(state, cfg, roundCfg, decision)
    holeEvents.push(...perHoleEvents)
    eventsSoFar = [...eventsSoFar, ...perHoleEvents]
  }

  // Apply carryover tieRule across consecutive WolfHoleTied events.
  const finalEvents = finalizeWolfRound(holeEvents, cfg)

  // Reduce to per-player ledger: WolfHoleResolved, LoneWolfResolved, and
  // BlindLoneResolved all carry a points map. WolfCarryApplied and others
  // are informational and do not contribute money.
  const ledger: Record<string, number> = {}
  for (const e of finalEvents) {
    if (
      (e.kind === 'WolfHoleResolved' ||
        e.kind === 'LoneWolfResolved' ||
        e.kind === 'BlindLoneResolved') &&
      'points' in e
    ) {
      for (const [pid, pts] of Object.entries(e.points)) {
        ledger[pid] = (ledger[pid] ?? 0) + pts
      }
    }
  }

  return { events: finalEvents, ledger }
}
