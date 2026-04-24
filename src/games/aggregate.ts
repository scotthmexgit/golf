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
import type { ScoringEventLog } from './types'

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
