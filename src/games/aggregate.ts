// src/games/aggregate.ts — Round aggregation: reduces a ScoringEventLog to a RunningLedger.
//
// Phase 1 scope: scaffold, Junk monetary reducer. Non-Junk monetary events
// are reduced with money[p] = event.points[p] (correct formula for Phase 1).
// Supersession filter deferred to a dedicated schema pass (EventBase has no
// id field; zero writers in codebase — see parking-lot item).
// RoundingAdjustment branch removed: integer-only mandate (game_junk.md §11)
// makes the branch unreachable. Event type kept in events.ts as dead schema.
//
// Phase 2 adds Skins + Wolf synthetic-log tests.
// Phase 3 adds Nassau + Match Play (compound byBet keys) + orchestration loop.
//
// Decision 1: Shape A — combined orchestrator + reducer (single file).
// Decision 2: junk.ts maybeEmitRoundingAdjustment stub deleted.
// Decision 3: Supersession filter deferred (no id field on EventBase; no writers).
// Decision 4: Full-recompute on every call.
// Decision 5: Sizing M.

import type { PlayerId, BetId, RoundConfig, RunningLedger } from './types'
import type { ScoringEventLog, NassauCfg, MatchPlayCfg } from './types'
import { initialMatches, applyHoleToMatch, buildPressMatchState } from './nassau'
import type { MatchState as NassauMatchState } from './nassau'
import { initialMatch, advanceMatch } from './match_play'
import type { MatchState as MPMatchState } from './match_play'

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

  // Phase 3 Iter 1: thread MatchState for Nassau and Match Play bets.
  // Maps are not yet consumed in the money-reduction loop (Iter 2).
  const { nassauMatches, mpMatches } = buildMatchStates(log, roundCfg)
  void nassauMatches
  void mpMatches

  for (const event of log.events) {
    switch (event.kind) {
      // ── Junk: stake-scaled formula ──────────────────────────────────────────

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

      // ── Non-Junk monetary events: points already stake-scaled ───────────────
      //
      // Decision in §Money formula: money[p] = event.points[p] for all of:
      // SkinWon, WolfHoleResolved, LoneWolfResolved, BlindLoneResolved,
      // MatchClosedOut, NassauWithdrawalSettled, ExtraHoleResolved,
      // StrokePlaySettled, RoundingAdjustment (dead schema — never emitted
      // under integer-only mandate), FinalAdjustmentApplied.
      //
      // Phase 1 reduces all of these (correct formula, not a stub).
      // Phase 3 widens byBet key for Nassau monetary events.

      case 'SkinWon':
      case 'WolfHoleResolved':
      case 'LoneWolfResolved':
      case 'BlindLoneResolved':
      case 'MatchClosedOut':
      case 'ExtraHoleResolved':
      case 'StrokePlaySettled':
      case 'NassauWithdrawalSettled':
      case 'RoundingAdjustment':
      case 'FinalAdjustmentApplied': {
        // FinalAdjustmentApplied uses targetBet (BetId | 'all-bets'), not declaringBet.
        // All others use declaringBet via WithBet.
        const betKey =
          event.kind === 'FinalAdjustmentApplied'
            ? event.targetBet
            : (event as { declaringBet: BetId }).declaringBet

        accumulate(netByPlayer, byBet, betKey, event.points)
        break
      }

      // ── Bookkeeping events — no monetary contribution ────────────────────────
      // (All remaining ScoringEvent variants.)

      default:
        break
    }
  }

  // Topic 5: zero-sum enforcement.
  const total = Object.values(netByPlayer).reduce((acc, v) => acc + v, 0)
  if (total !== 0) {
    throw new ZeroSumViolationError(total, log.events.length)
  }

  return {
    netByPlayer,
    byBet,
    lastRecomputeTs: new Date().toISOString(),
  }
}
