// src/games/aggregate.ts — Round aggregation: reduces a ScoringEventLog to a RunningLedger.
//
// Full-recompute on every call (Decision 4). Idempotent and pure.
// Nassau and Match Play compound byBet keys (${betId}::${matchId}) are handled
// in reduceEvent. Supersession filter deferred (no id field on EventBase).
//
// Decisions made during construction:
//   Decision 1: Shape A — combined orchestrator + reducer (single file).
//   Decision 2: junk.ts maybeEmitRoundingAdjustment stub deleted.
//   Decision 3: Supersession filter deferred (no id field on EventBase; no writers).
//   Decision 4: Full-recompute on every call.
//   Decision 5: Sizing M.
//
// NA-pre-1 (2026-05-01): RoundingAdjustment is now emitted by stroke_play.ts and
// match_play.ts when integer-division remainders occur. The reducer case below
// is active (not dead schema). RoundingAdjustment.points carries the actual
// remainder; aggregate accumulates it alongside the corresponding settled event.

import type { PlayerId, BetId, RoundConfig, RunningLedger } from './types'
import type { ScoringEventLog, NassauCfg, MatchPlayCfg, StrokePlayCfg } from './types'
import type { ScoringEvent } from './events'
import { initialMatches, applyHoleToMatch, buildPressMatchState, finalizeNassauRound } from './nassau'
import type { MatchState as NassauMatchState } from './nassau'
import { initialMatch, advanceMatch, finalizeMatchPlayRound } from './match_play'
import type { MatchState as MPMatchState } from './match_play'
import { finalizeStrokePlayRound } from './stroke_play'

// ─── ZeroSumViolationError ────────────────────────────────────────────────────
//
// Thrown after the reduce loop if Σ netByPlayer ≠ 0.
// Topic 5 decision: throw, not silent fallthrough.

export class ZeroSumViolationError extends Error {
  readonly delta: number
  readonly eventCount: number

  constructor(delta: number, eventCount: number) {
    super(
      `Zero-sum violated: Σ netByPlayer = ${delta} (expected 0) across ${eventCount} event(s).`,
    )
    this.name = 'ZeroSumViolationError'
    this.delta = delta
    this.eventCount = eventCount
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Add delta to ledger[player], initialising to 0 if absent. */
function credit(
  bucket: Record<PlayerId, number>,
  player: PlayerId,
  delta: number,
): void {
  bucket[player] = (bucket[player] ?? 0) + delta
}

/**
 * Accumulate money[p] into both the global net ledger and the per-bet bucket.
 * Creates the per-bet bucket on first use.
 */
function accumulate(
  netByPlayer: Record<PlayerId, number>,
  byBet: Record<string, Record<PlayerId, number>>,
  betKey: string,
  money: Record<PlayerId, number>,
): void {
  if (byBet[betKey] === undefined) {
    byBet[betKey] = {}
  }
  for (const [p, amount] of Object.entries(money)) {
    credit(netByPlayer, p, amount)
    credit(byBet[betKey], p, amount)
  }
}

// ─── Event reducer ───────────────────────────────────────────────────────────
//
// Single source of truth for the money-reduction switch. Called for both
// log events and finalizer events — no inline duplication in aggregateRound.
// Nassau monetary events use compound key "${betId}::${matchId}"; Match Play
// and all other events use the simple declaringBet / targetBet key.

function reduceEvent(
  event: ScoringEvent,
  roundCfg: RoundConfig,
  netByPlayer: Record<PlayerId, number>,
  byBet: Record<string, Record<PlayerId, number>>,
): void {
  switch (event.kind) {
    // ── Junk: stake-scaled formula ────────────────────────────────────────────
    case 'JunkAwarded': {
      const bet = roundCfg.bets.find(b => b.id === event.declaringBet)
      if (bet === undefined) {
        throw new Error(
          `aggregate: JunkAwarded references unknown bet "${event.declaringBet}". ` +
            `Event log is corrupt.`,
        )
      }
      const multiplier = bet.stake * bet.junkMultiplier
      const money: Record<PlayerId, number> = {}
      for (const [p, pts] of Object.entries(event.points)) {
        money[p] = pts * multiplier
      }
      accumulate(netByPlayer, byBet, event.declaringBet, money)
      break
    }

    // ── Nassau compound-key events ────────────────────────────────────────────
    //
    // NassauWithdrawalSettled and Nassau-sourced MatchClosedOut use compound key
    // "${declaringBet}::${matchId}" to separate per-match money buckets.

    case 'NassauWithdrawalSettled': {
      const betKey = `${event.declaringBet}::${event.matchId}`
      accumulate(netByPlayer, byBet, betKey, event.points)
      break
    }

    case 'MatchClosedOut': {
      const betType = roundCfg.bets.find(b => b.id === event.declaringBet)?.type
      const betKey = betType === 'nassau'
        ? `${event.declaringBet}::${event.matchId}`
        : event.declaringBet
      accumulate(netByPlayer, byBet, betKey, event.points)
      break
    }

    // ── Non-Junk monetary events: points already stake-scaled ─────────────────
    //
    // Decision in §Money formula: money[p] = event.points[p] for all of:
    // SkinWon, WolfHoleResolved, LoneWolfResolved, BlindLoneResolved,
    // ExtraHoleResolved, StrokePlaySettled, RoundingAdjustment,
    // FinalAdjustmentApplied.
    // Nassau compound keys are handled above.

    case 'SkinWon':
    case 'WolfHoleResolved':
    case 'LoneWolfResolved':
    case 'BlindLoneResolved':
    case 'ExtraHoleResolved':
    case 'StrokePlaySettled':
    case 'RoundingAdjustment': {
      accumulate(netByPlayer, byBet, (event as { declaringBet: BetId }).declaringBet, event.points)
      break
    }

    case 'FinalAdjustmentApplied': {
      // FinalAdjustmentApplied uses targetBet (BetId | 'all-bets'), not declaringBet.
      accumulate(netByPlayer, byBet, event.targetBet, event.points)
      break
    }

    // ── Bookkeeping events — no monetary contribution ──────────────────────────
    default:
      break
  }
}

// ─── MatchState threading ────────────────────────────────────────────────────

/**
 * Walks the event log and applies state transitions to Nassau and Match Play
 * MatchState objects. Returns Maps keyed by BetId.
 *
 * Exported for test access. Called internally by `aggregateRound`.
 * No finalizer calls in Phase 3 Iter 1.
 */
export function buildMatchStates(
  log: ScoringEventLog,
  roundCfg: RoundConfig,
): {
  nassauMatches: Map<BetId, NassauMatchState[]>
  mpMatches: Map<BetId, MPMatchState>
} {
  const nassauMatches = new Map<BetId, NassauMatchState[]>()
  const mpMatches = new Map<BetId, MPMatchState>()

  // Initialize from declared bets
  for (const bet of roundCfg.bets) {
    if (bet.type === 'nassau') {
      nassauMatches.set(bet.id, initialMatches(bet.config as NassauCfg))
    } else if (bet.type === 'matchPlay') {
      mpMatches.set(bet.id, initialMatch(bet.config as MatchPlayCfg))
    }
  }

  // Walk events and apply state transitions
  for (const event of log.events) {
    switch (event.kind) {

      // ── Nassau state transitions ────────────────────────────────────────────

      case 'NassauHoleResolved': {
        const matches = nassauMatches.get(event.declaringBet)
        if (!matches) break
        const idx = matches.findIndex(m => m.id === event.matchId)
        if (idx === -1) break
        nassauMatches.set(
          event.declaringBet,
          matches.map((m, i) => i === idx ? applyHoleToMatch(m, event.winner) : m),
        )
        break
      }

      case 'NassauHoleForfeited': {
        const matches = nassauMatches.get(event.declaringBet)
        if (!matches) break
        const idx = matches.findIndex(m => m.id === event.matchId)
        if (idx === -1) break
        const match = matches[idx]!
        const winner: 'A' | 'B' = event.forfeiter === match.pair[0] ? 'B' : 'A'
        nassauMatches.set(
          event.declaringBet,
          matches.map((m, i) => i === idx ? applyHoleToMatch(m, winner) : m),
        )
        break
      }

      case 'PressOpened': {
        const matches = nassauMatches.get(event.declaringBet)
        if (!matches) break
        const cfg = roundCfg.bets.find(b => b.id === event.declaringBet)?.config as NassauCfg | undefined
        if (!cfg) break
        const pressMatch = buildPressMatchState(event.hole, event.parentMatchId, matches, cfg)
        // Mirror the openPress void-guard: skip a press with no holes to play.
        if (pressMatch.startHole > pressMatch.endHole) break
        nassauMatches.set(event.declaringBet, [...matches, pressMatch])
        break
      }

      case 'NassauWithdrawalSettled': {
        const matches = nassauMatches.get(event.declaringBet)
        if (!matches) break
        nassauMatches.set(
          event.declaringBet,
          matches.map(m => m.id === event.matchId ? { ...m, closed: true } : m),
        )
        break
      }

      case 'MatchClosedOut': {
        const betType = roundCfg.bets.find(b => b.id === event.declaringBet)?.type
        if (betType === 'nassau') {
          const matches = nassauMatches.get(event.declaringBet)
          if (!matches) break
          nassauMatches.set(
            event.declaringBet,
            matches.map(m => m.id === event.matchId ? { ...m, closed: true } : m),
          )
        } else if (betType === 'matchPlay') {
          const match = mpMatches.get(event.declaringBet)
          if (!match) break
          mpMatches.set(event.declaringBet, { ...match, closedOut: true })
        }
        break
      }

      // ── Match Play state transitions ────────────────────────────────────────

      case 'HoleResolved': {
        const match = mpMatches.get(event.declaringBet)
        if (!match) break
        const cfg = roundCfg.bets.find(b => b.id === event.declaringBet)?.config as MatchPlayCfg | undefined
        if (!cfg) break
        mpMatches.set(event.declaringBet, advanceMatch(match, event.winner, cfg.holesToPlay))
        break
      }

      case 'HoleHalved': {
        const match = mpMatches.get(event.declaringBet)
        if (!match) break
        const cfg = roundCfg.bets.find(b => b.id === event.declaringBet)?.config as MatchPlayCfg | undefined
        if (!cfg) break
        mpMatches.set(event.declaringBet, advanceMatch(match, 'halved', cfg.holesToPlay))
        break
      }

      case 'HoleForfeited': {
        const match = mpMatches.get(event.declaringBet)
        if (!match) break
        const cfg = roundCfg.bets.find(b => b.id === event.declaringBet)?.config as MatchPlayCfg | undefined
        if (!cfg) break
        // Derive winner: forfeiter's side loses
        const isTeam1Forfeiter =
          cfg.format === 'singles'
            ? event.forfeiter === cfg.playerIds[0]
            : ([...(cfg.teams?.[0] ?? [])] as PlayerId[]).includes(event.forfeiter)
        const winner: 'team1' | 'team2' = isTeam1Forfeiter ? 'team2' : 'team1'
        mpMatches.set(event.declaringBet, advanceMatch(match, winner, cfg.holesToPlay))
        break
      }

      case 'ConcessionRecorded': {
        // unit 'hole': advance match — conceder's side loses one hole
        // unit 'match': no state update here; MatchClosedOut event handles closure
        // unit 'stroke': no state update
        if (event.unit !== 'hole') break
        const match = mpMatches.get(event.declaringBet)
        if (!match) break
        const cfg = roundCfg.bets.find(b => b.id === event.declaringBet)?.config as MatchPlayCfg | undefined
        if (!cfg) break
        const isTeam1Conceder =
          cfg.format === 'singles'
            ? event.conceder === cfg.playerIds[0]
            : ([...(cfg.teams?.[0] ?? [])] as PlayerId[]).includes(event.conceder)
        const winner: 'team1' | 'team2' = isTeam1Conceder ? 'team2' : 'team1'
        mpMatches.set(event.declaringBet, advanceMatch(match, winner, cfg.holesToPlay))
        break
      }

      default:
        break
    }
  }

  return { nassauMatches, mpMatches }
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Reduces a `ScoringEventLog` to a `RunningLedger`.
 *
 * Full-recompute on every call. Idempotent and pure — no module-level mutable
 * state. `lastRecomputeTs` is set to `new Date().toISOString()` on each return.
 *
 * Junk formula: `money[p] = event.points[p] × bet.stake × bet.junkMultiplier`.
 * All other monetary events: `money[p] = event.points[p]`.
 *
 * Supersession filter is deferred — `log.supersessions` is not consumed here.
 * See parking-lot item "Supersession schema design (pre-Phase-2 gate)".
 *
 * Throws `ZeroSumViolationError` if Σ netByPlayer ≠ 0 after reduction.
 */
export function aggregateRound(
  log: ScoringEventLog,
  roundCfg: RoundConfig,
): RunningLedger {
  // Phase 1 fence: byBet keys are simple BetId strings.
  // Phase 3 widens to compound keys for Nassau (${betId}::${matchId}).
  const netByPlayer: Record<PlayerId, number> = {}
  const byBet: Record<string, Record<PlayerId, number>> = {}

  // Phase 3: thread MatchState for Nassau and Match Play bets.
  const { nassauMatches, mpMatches } = buildMatchStates(log, roundCfg)

  // Reduce all log events through the single-source-of-truth reducer.
  for (const event of log.events) {
    reduceEvent(event, roundCfg, netByPlayer, byBet)
  }

  // Invoke finalizers and reduce their emitted events.
  const finalizerEvents: ScoringEvent[] = []

  for (const bet of roundCfg.bets) {
    if (bet.type === 'nassau') {
      const matches = nassauMatches.get(bet.id)
      if (matches) {
        const events = finalizeNassauRound(bet.config as NassauCfg, roundCfg, matches)
        finalizerEvents.push(...events)
      }
    } else if (bet.type === 'matchPlay') {
      const match = mpMatches.get(bet.id)
      if (match) {
        const { events } = finalizeMatchPlayRound(bet.config as MatchPlayCfg, roundCfg, match)
        finalizerEvents.push(...events)
      }
    } else if (bet.type === 'strokePlay') {
      // Filter to StrokePlayHoleRecorded events for this bet only.
      // finalizeStrokePlayRound groups by declaringBet internally, so passing
      // only this bet's events prevents cross-bet contamination.
      const strokeEvents = log.events.filter(
        e => e.kind === 'StrokePlayHoleRecorded' && e.declaringBet === bet.id
      )
      const spEvents = finalizeStrokePlayRound(strokeEvents, bet.config as StrokePlayCfg)
      finalizerEvents.push(...spEvents)
    }
  }

  for (const event of finalizerEvents) {
    reduceEvent(event, roundCfg, netByPlayer, byBet)
  }

  // Topic 5: zero-sum enforcement.
  const total = Object.values(netByPlayer).reduce((acc, v) => acc + v, 0)
  if (total !== 0) {
    throw new ZeroSumViolationError(total, log.events.length + finalizerEvents.length)
  }

  return {
    netByPlayer,
    byBet,
    lastRecomputeTs: new Date().toISOString(),
  }
}
