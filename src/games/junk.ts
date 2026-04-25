// src/games/junk.ts — Junk scoring engine.
//
// Phase 2 Iteration 1: CTP + Greenie surface (bookkeeping events, per-bet
// fan-out, CTPCarried stub). settleJunkHole emits ScoringEvent[].
// Phase 2 Iteration 2 fills in Longest Drive.
// #7b fills in Sandy, Barkie, Polie, Arnie after rules-pass 2026-04-24.

import type { HoleState, JunkKind, JunkRoundConfig, PlayerId, RoundConfig, ScoringEvent } from './types'

// ─── Tie-rule default ─────────────────────────────────────────────────────────

const CTP_TIE_RULE_DEFAULT = 'groupResolve' as const

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isCTP(hole: HoleState, junkCfg: JunkRoundConfig): PlayerId | null {
  if (!junkCfg.ctpEnabled) return null
  if (hole.par !== 3) return null
  return hole.ctpWinner ?? null
}

function isGreenie(
  ctpWinner: PlayerId | null,
  hole: HoleState,
  junkCfg: JunkRoundConfig,
  bet: { participants: PlayerId[] },
): PlayerId | null {
  if (ctpWinner === null) return null
  if (!junkCfg.girEnabled) return null
  if (hole.gir[ctpWinner] !== true) return null
  if (!bet.participants.includes(ctpWinner)) return null
  const gross = hole.gross[ctpWinner]
  if (gross === undefined || gross > hole.par) return null
  return ctpWinner
}

function isLongestDrive(hole: HoleState, junkCfg: JunkRoundConfig): PlayerId[] | null {
  if (!junkCfg.longestDriveEnabled) return null
  if (hole.par < 4) return null
  if (!junkCfg.longestDriveHoles.includes(hole.hole)) return null
  if (hole.longestDriveWinners.length === 0) return null
  return hole.longestDriveWinners
}

// ─── Dispatch switch ─────────────────────────────────────────────────────────

export function resolveJunkWinner(
  kind: JunkKind,
  hole: HoleState,
  junkCfg: JunkRoundConfig,
): PlayerId | null {
  switch (kind) {
    case 'ctp':
      return isCTP(hole, junkCfg)
    case 'longestDrive':
      // isLongestDrive returns PlayerId[] | null; dispatch switch surface is
      // PlayerId | null. LD is settled via the per-bet fan-out in settleJunkHole.
      return null
    case 'greenie':
      // Greenie is context-dependent on ctpWinner + bet; direct resolution
      // from the switch cannot apply per-bet filtering. The dispatch switch
      // returns the bare CTP-derived candidate; settleJunkHole applies the
      // full isGreenie check per bet.
      return isCTP(hole, junkCfg)
    case 'sandy':
      return null // #7b — rules pass 2026-04-24 pending
    case 'barkie':
      return null // #7b — rules pass 2026-04-24 pending
    case 'polie':
      return null // #7b — rules pass 2026-04-24 pending
    case 'arnie':
      return null // #7b — rules pass 2026-04-24 pending
    default: {
      const _exhaustive: never = kind
      return null
    }
  }
}

// ─── Award builder ────────────────────────────────────────────────────────────

function pushAward(
  events: ScoringEvent[],
  kind: JunkKind,
  hole: number,
  timestamp: string,
  bet: { id: string; participants: PlayerId[] },
  winners: PlayerId[],
  // Event-level point doubling only (e.g. Super Sandy). Phase 2 callers use default=1.
  // `bet.junkMultiplier` is the money-rendering multiplier — must never be passed here.
  // Verify multiplier propagation before #7b Phase 3 Sandy/Barkie/Polie/Arnie work.
  multiplier = 1,
): void {
  const N = bet.participants.length
  const w = winners.length
  const points: Record<PlayerId, number> = {}
  for (const p of bet.participants) {
    points[p] = winners.includes(p) ? (N - w) * multiplier : -w * multiplier
  }
  events.push({
    kind: 'JunkAwarded',
    timestamp,
    hole,
    actor: 'system',
    declaringBet: bet.id,
    junk: kind,
    winners,
    points,
  })
}

// ─── Hole settler ────────────────────────────────────────────────────────────

export function settleJunkHole(
  hole: HoleState,
  roundCfg: RoundConfig,
  junkCfg: JunkRoundConfig,
): ScoringEvent[] {
  const events: ScoringEvent[] = []
  const ts = hole.timestamp ?? ''
  const ctpWinner = isCTP(hole, junkCfg)

  // ── Bookkeeping: CTPWinnerSelected fires once per hole, not per-bet ──────

  if (ctpWinner !== null) {
    const tieRule = junkCfg.ctpTieRule ?? CTP_TIE_RULE_DEFAULT
    if (tieRule === 'carry') {
      // AC-pending: rules pass needed for carry accumulation formula.
      // CTPCarried emitted with carryPoints: 0 as stub.
      events.push({
        kind: 'CTPCarried',
        timestamp: ts,
        hole: hole.hole,
        actor: 'system',
        fromHole: hole.hole,
        carryPoints: 0,
      })
      return events
    }
    // groupResolve (default): bookkeeping event fires once
    const girValue = (junkCfg.girEnabled ?? false) && (hole.gir[ctpWinner] === true)
    events.push({
      kind: 'CTPWinnerSelected',
      timestamp: ts,
      hole: hole.hole,
      actor: 'system',
      winner: ctpWinner,
      gir: girValue,
    })
  }

  // ── CTP fan-out: one JunkAwarded per declaring bet (Topic 8 — CTP first) ──

  if (ctpWinner !== null) {
    for (const bet of roundCfg.bets) {
      if (!bet.junkItems.includes('ctp')) continue
      if (!bet.participants.includes(ctpWinner)) continue
      pushAward(events, 'ctp', hole.hole, ts, bet, [ctpWinner])
    }
  }

  // ── Greenie fan-out: one JunkAwarded per declaring bet (after CTP pass) ──

  for (const bet of roundCfg.bets) {
    if (!bet.junkItems.includes('greenie')) continue
    const greenieWinner = isGreenie(ctpWinner, hole, junkCfg, bet)
    if (greenieWinner === null) continue
    pushAward(events, 'greenie', hole.hole, ts, bet, [greenieWinner])
  }

  // ── LD bookkeeping: LongestDriveWinnerSelected fires once per hole ──────

  if (hole.longestDriveWinners.length > 0) {
    events.push({
      kind: 'LongestDriveWinnerSelected',
      timestamp: ts,
      hole: hole.hole,
      actor: 'system',
      winners: hole.longestDriveWinners,
    })
  }

  // ── LD fan-out: one JunkAwarded per declaring bet in declaration order ──

  for (const bet of roundCfg.bets) {
    if (!bet.junkItems.includes('longestDrive')) continue
    const ldWinners = isLongestDrive(hole, junkCfg)
    if (ldWinners === null) continue
    pushAward(events, 'longestDrive', hole.hole, ts, bet, ldWinners)
  }

  return events
}
