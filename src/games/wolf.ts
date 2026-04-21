// src/games/wolf.ts — pure Wolf scoring engine per docs/games/game_wolf.md.
//
// Exports:
//   settleWolfHole(hole, config, roundCfg, decision)
//     → provisional per-hole events; decision=null emits WolfDecisionMissing
//   finalizeWolfRound(events, config)
//     → applies the 'carryover' tieRule across consecutive tied holes
//   applyWolfCaptainRotation(hole, config, roundCfg, eventsSoFar?)
//     → captain for a given hole, with WolfCaptainTiebreak when lowest-money ties
//   WolfConfigError, WolfBetNotFoundError
//
// Signature notes (logged to /tmp/round-3-notes.md as spec gaps):
//   1. The Round 3 prompt's settleWolfHole signature is (hole, config, roundCfg);
//      the rule-file § 5 pseudocode additionally threads a Decision parameter.
//      A hole cannot settle without a decision. We add `decision: WolfDecision |
//      null` as the 4th arg so null can emit WolfDecisionMissing per § 9.
//   2. applyWolfCaptainRotation is 3-arg per the prompt; the rule file's
//      'lowest-money-first' rule for holes 17–18 needs current money totals.
//      We accept an optional 4th eventsSoFar? arg — holes 1–16 ignore it.
//
// Portability: pure TypeScript; no next/*, react, react-dom, fs, path,
// process, DOM globals, @prisma/client, or src/lib/* imports.

import type {
  BetId,
  HoleState,
  PlayerId,
  RoundConfig,
  ScoringEvent,
  WolfCfg,
} from './types'
import { strokesOnHole } from './handicap'

// ─── Public types ───────────────────────────────────────────────────────────

export type WolfDecision =
  | { kind: 'partner'; captain: PlayerId; partner: PlayerId }
  | { kind: 'lone'; captain: PlayerId; blind: boolean }

// ─── Typed errors ───────────────────────────────────────────────────────────

export class WolfConfigError extends Error {
  readonly code = 'WolfConfigError' as const
  constructor(public readonly field: string, public readonly detail?: string) {
    super(
      detail
        ? `WolfCfg field '${field}' is invalid: ${detail}`
        : `WolfCfg missing required field: ${field}`,
    )
    this.name = 'WolfConfigError'
  }
}

export class WolfBetNotFoundError extends Error {
  readonly code = 'WolfBetNotFoundError' as const
  constructor() {
    super(
      'Wolf config does not correspond to a bet in roundCfg.bets — ' +
        'pass a config reference obtained from roundCfg.bets[i].config.',
    )
    this.name = 'WolfBetNotFoundError'
  }
}

// ─── Validation ─────────────────────────────────────────────────────────────

function assertValidWolfCfg(cfg: WolfCfg): void {
  if (typeof cfg.stake !== 'number' || !Number.isInteger(cfg.stake) || cfg.stake < 1) {
    throw new WolfConfigError('stake', 'must be a positive integer')
  }
  if (
    typeof cfg.loneMultiplier !== 'number' ||
    !Number.isInteger(cfg.loneMultiplier) ||
    cfg.loneMultiplier < 2
  ) {
    throw new WolfConfigError('loneMultiplier', 'must be an integer ≥ 2')
  }
  if (typeof cfg.blindLoneEnabled !== 'boolean') {
    throw new WolfConfigError('blindLoneEnabled')
  }
  if (
    typeof cfg.blindLoneMultiplier !== 'number' ||
    !Number.isInteger(cfg.blindLoneMultiplier) ||
    cfg.blindLoneMultiplier < 3
  ) {
    throw new WolfConfigError('blindLoneMultiplier', 'must be an integer ≥ 3')
  }
  const validTieRules = ['no-points', 'carryover'] as const
  if (!validTieRules.includes(cfg.tieRule)) {
    throw new WolfConfigError('tieRule')
  }
  if (typeof cfg.appliesHandicap !== 'boolean') {
    throw new WolfConfigError('appliesHandicap')
  }
  if (!Array.isArray(cfg.playerIds) || cfg.playerIds.length < 4 || cfg.playerIds.length > 5) {
    throw new WolfConfigError('playerIds', 'length must be 4 or 5')
  }
  if (!Array.isArray(cfg.junkItems)) {
    throw new WolfConfigError('junkItems')
  }
  if (
    typeof cfg.junkMultiplier !== 'number' ||
    !Number.isInteger(cfg.junkMultiplier) ||
    cfg.junkMultiplier < 1
  ) {
    throw new WolfConfigError('junkMultiplier', 'must be a positive integer')
  }
}

function findBetId(cfg: WolfCfg, roundCfg: RoundConfig): BetId {
  const bet = roundCfg.bets.find((b) => b.type === 'wolf' && b.id === cfg.id)
  if (bet === undefined) throw new WolfBetNotFoundError()
  return bet.id
}

// ─── Small utilities ────────────────────────────────────────────────────────

function zeroPoints(playerIds: readonly PlayerId[]): Record<PlayerId, number> {
  const m: Record<PlayerId, number> = {}
  for (const p of playerIds) m[p] = 0
  return m
}

function netFor(hole: HoleState, pid: PlayerId, appliesHandicap: boolean): number {
  const gross = hole.gross[pid] ?? 0
  if (!appliesHandicap) return gross
  const strokes = hole.strokes[pid] ?? 0
  return gross - strokesOnHole(strokes, hole.holeIndex)
}

function decisionMultiplier(decision: WolfDecision, cfg: WolfCfg): number {
  if (decision.kind === 'partner') return 1
  return decision.blind ? cfg.blindLoneMultiplier : cfg.loneMultiplier
}

function resolvedKind(
  decision: WolfDecision,
): 'WolfHoleResolved' | 'LoneWolfResolved' | 'BlindLoneResolved' {
  if (decision.kind === 'partner') return 'WolfHoleResolved'
  return decision.blind ? 'BlindLoneResolved' : 'LoneWolfResolved'
}

// ─── Per-hole settlement ────────────────────────────────────────────────────

export function settleWolfHole(
  hole: HoleState,
  config: WolfCfg,
  roundCfg: RoundConfig,
  decision: WolfDecision | null,
): ScoringEvent[] {
  assertValidWolfCfg(config)
  const declaringBet = findBetId(config, roundCfg)
  const base = {
    timestamp: hole.timestamp,
    declaringBet,
  }

  // § 9: missing decision → WolfDecisionMissing, zero delta.
  if (decision === null) {
    return [{
      kind: 'WolfDecisionMissing',
      ...base,
      actor: 'system',
      hole: hole.hole,
      captain: roundCfg.players[(hole.hole - 1) % roundCfg.players.length].id,
    }]
  }

  // § 9: any player with gross <= 0 invalidates the hole → WolfHoleInvalid.
  const missing = config.playerIds.filter((pid) => (hole.gross[pid] ?? 0) <= 0)
  if (missing.length > 0) {
    return [{
      kind: 'WolfHoleInvalid',
      ...base,
      actor: 'system',
      hole: hole.hole,
      reason: `missing-score: ${missing.join(',')}`,
    }]
  }

  // Split sides per decision.
  const all = config.playerIds
  const side =
    decision.kind === 'partner'
      ? [decision.captain, decision.partner]
      : [decision.captain]
  const opp = all.filter((p) => !side.includes(p))
  const mult = decisionMultiplier(decision, config)

  const netAll: Record<PlayerId, number> = {}
  for (const p of all) netAll[p] = netFor(hole, p, config.appliesHandicap)

  const sideBest = Math.min(...side.map((p) => netAll[p]))
  const oppBest = Math.min(...opp.map((p) => netAll[p]))

  // Emit a declaration event for Blind Lone before the resolution event.
  const pre: ScoringEvent[] = []
  if (decision.kind === 'lone' && decision.blind) {
    pre.push({
      kind: 'BlindLoneDeclared',
      ...base,
      actor: decision.captain,
      hole: hole.hole,
      captain: decision.captain,
    })
  }

  // § 6: tie handling.
  if (sideBest === oppBest) {
    return [...pre, {
      kind: 'WolfHoleTied',
      ...base,
      actor: 'system',
      hole: hole.hole,
    }]
  }

  // Winning and losing sides.
  const sideWon = sideBest < oppBest
  const winners = sideWon ? side : opp
  const losers = sideWon ? opp : side
  const unit = config.stake * mult

  const points = zeroPoints(all)
  for (const w of winners) {
    for (const l of losers) {
      points[w] += unit
      points[l] -= unit
    }
  }

  const kind = resolvedKind(decision)
  if (kind === 'WolfHoleResolved') {
    return [...pre, {
      kind,
      ...base,
      actor: decision.captain,
      hole: hole.hole,
      winners: [...winners],
      losers: [...losers],
      points,
    }]
  }

  // Lone or Blind Lone.
  return [...pre, {
    kind,
    ...base,
    actor: decision.captain,
    hole: hole.hole,
    captain: decision.captain,
    won: sideWon,
    points,
  }]
}

// ─── Round finalization: apply 'carryover' tieRule ──────────────────────────

const WOLF_EVENT_KINDS = new Set<ScoringEvent['kind']>([
  'WolfHoleResolved',
  'LoneWolfResolved',
  'BlindLoneResolved',
  'BlindLoneDeclared',
  'WolfHoleTied',
  'WolfCarryApplied',
  'WolfDecisionMissing',
  'WolfHoleInvalid',
  'WolfCaptainReassigned',
  'WolfCaptainTiebreak',
])

export function finalizeWolfRound(
  events: ScoringEvent[],
  config: WolfCfg,
): ScoringEvent[] {
  assertValidWolfCfg(config)

  // No-op when tieRule is 'no-points'. Tied holes already stand as zero-delta
  // WolfHoleTied events from settleWolfHole.
  if (config.tieRule === 'no-points') return events

  // Partition: Wolf-owned vs pass-through.
  const owned: ScoringEvent[] = []
  const passThrough: ScoringEvent[] = []
  for (const e of events) {
    if (WOLF_EVENT_KINDS.has(e.kind) && 'declaringBet' in e) owned.push(e)
    else passThrough.push(e)
  }

  // Group by declaring bet.
  const byBet = new Map<BetId, ScoringEvent[]>()
  for (const e of owned) {
    if (!('declaringBet' in e)) continue
    const list = byBet.get(e.declaringBet) ?? []
    list.push(e)
    byBet.set(e.declaringBet, list)
  }

  const result: ScoringEvent[] = [...passThrough]
  for (const [betId, betEvents] of byBet) {
    result.push(...finalizeBetEvents(betEvents, config, betId))
  }
  return result
}

function finalizeBetEvents(
  betEvents: ScoringEvent[],
  config: WolfCfg,
  betId: BetId,
): ScoringEvent[] {
  // Sort by hole ascending (null holes first).
  const sorted = [...betEvents].sort((a, b) => {
    const ah = a.hole ?? -1
    const bh = b.hole ?? -1
    return ah - bh
  })

  const result: ScoringEvent[] = []
  let consecutiveTies = 0

  for (const e of sorted) {
    // Resolution events (partner, Lone, or Blind Lone) absorb any accumulated carry.
    if (
      e.kind === 'WolfHoleResolved' ||
      e.kind === 'LoneWolfResolved' ||
      e.kind === 'BlindLoneResolved'
    ) {
      if (consecutiveTies === 0) {
        result.push(e)
        continue
      }
      // Stake doubling: carryMult = 2^ties. § 6: max(carryMult, decisionMult).
      const carryMult = 2 ** consecutiveTies
      const decMult = decisionMultiplierFromEvent(e, config)
      const effective = Math.max(carryMult, decMult)
      const scale = effective / decMult
      const scaled: Record<PlayerId, number> = {}
      for (const [pid, v] of Object.entries(e.points)) scaled[pid] = v * scale
      result.push({ ...e, points: scaled })
      result.push({
        kind: 'WolfCarryApplied',
        timestamp: e.timestamp,
        actor: 'system',
        declaringBet: betId,
        hole: e.hole,
        multiplier: effective,
      })
      consecutiveTies = 0
      continue
    }

    if (e.kind === 'WolfHoleTied') {
      consecutiveTies += 1
      result.push(e)
      continue
    }

    // Other owned events pass through unchanged.
    result.push(e)
  }

  return result
}

function decisionMultiplierFromEvent(
  e: ScoringEvent,
  config: WolfCfg,
): number {
  if (e.kind === 'WolfHoleResolved') return 1
  if (e.kind === 'LoneWolfResolved') return config.loneMultiplier
  if (e.kind === 'BlindLoneResolved') return config.blindLoneMultiplier
  return 1
}

// ─── Captain rotation ───────────────────────────────────────────────────────

export function applyWolfCaptainRotation(
  hole: number,
  config: WolfCfg,
  roundCfg: RoundConfig,
  eventsSoFar?: ScoringEvent[],
): { captain: PlayerId; events: ScoringEvent[] } {
  assertValidWolfCfg(config)
  const betId = findBetId(config, roundCfg)
  const players = roundCfg.players.map((p) => p.id)

  const withdrawn = withdrawnPlayersFromEvents(eventsSoFar ?? [])
  const events: ScoringEvent[] = []

  function shiftForWithdrawals(initial: PlayerId): PlayerId {
    if (!withdrawn.has(initial)) return initial
    const startIdx = players.indexOf(initial)
    for (let step = 1; step < players.length; step += 1) {
      const candidate = players[(startIdx + step) % players.length]
      if (!withdrawn.has(candidate)) {
        events.push({
          kind: 'WolfCaptainReassigned',
          timestamp: String(hole),
          actor: 'system',
          declaringBet: betId,
          hole,
          from: initial,
          to: candidate,
        })
        return candidate
      }
    }
    // Every player withdrew — return the initial value; the hole will invalidate.
    return initial
  }

  const rotationCaptain = players[(hole - 1) % players.length]
  return { captain: shiftForWithdrawals(rotationCaptain), events }
}

function withdrawnPlayersFromEvents(events: ScoringEvent[]): Set<PlayerId> {
  const out = new Set<PlayerId>()
  for (const e of events) {
    if (e.kind === 'PlayerWithdrew') out.add(e.player)
  }
  return out
}
