// src/games/stroke_play.ts — pure Stroke Play scoring engine per
// docs/games/game_stroke_play.md.
//
// Exports:
//   settleStrokePlayHole(hole, config, roundCfg)
//     → one StrokePlayHoleRecorded per hole with nets across the field,
//       plus IncompleteCard events for players missing a gross score.
//   finalizeStrokePlayRound(events, config)
//     → resolves settlementMode (winner-takes-pot | per-stroke | places) and
//       tieRule (split | card-back | scorecard-playoff) at round end.
//   resolveTieByCardBack(events, tiedPlayers, config)
//     → pure helper: walks cardBackOrder and returns the first separating
//       segment plus a CardBackResolved event (or null if every segment tied).
//   StrokePlayConfigError, StrokePlayBetNotFoundError
//
// Divergences logged to /tmp/round-4-notes.md:
//   1. settleStrokePlayHole signature omits `decision` (Stroke Play has no
//      per-hole decision). Matches rule file § 5 pseudocode.
//   2. TieFallthrough emits before every split-based tie resolution — both
//      the direct-split path (tieRule === 'split') and the fall-through path
//      (card-back or scorecard-playoff exhausted). This closes MIGRATION_NOTES
//      #15 and extends the rule file § 6 wording, which covers only the
//      fall-through path. from='split' / 'card-back' / 'scorecard-playoff'
//      distinguishes the cases.
//
// Portability: pure TypeScript; no next/*, react, react-dom, fs, path,
// process, DOM globals, @prisma/client, or src/lib/* imports.

import type {
  BetId,
  HoleState,
  PlayerId,
  RoundConfig,
  ScoringEvent,
  StrokePlayCfg,
} from './types'
import { strokesOnHole } from './handicap'

// ─── Typed errors ───────────────────────────────────────────────────────────

export class StrokePlayConfigError extends Error {
  readonly code = 'StrokePlayConfigError' as const
  constructor(public readonly field: string, public readonly detail?: string) {
    super(
      detail
        ? `StrokePlayCfg field '${field}' is invalid: ${detail}`
        : `StrokePlayCfg missing required field: ${field}`,
    )
    this.name = 'StrokePlayConfigError'
  }
}

export class StrokePlayBetNotFoundError extends Error {
  readonly code = 'StrokePlayBetNotFoundError' as const
  constructor() {
    super(
      'StrokePlay config does not correspond to a bet in roundCfg.bets — ' +
        'pass a config reference obtained from roundCfg.bets[i].config.',
    )
    this.name = 'StrokePlayBetNotFoundError'
  }
}

// ─── Validation ─────────────────────────────────────────────────────────────

function assertValidStrokePlayCfg(cfg: StrokePlayCfg): void {
  if (typeof cfg.stake !== 'number' || !Number.isInteger(cfg.stake) || cfg.stake < 1) {
    throw new StrokePlayConfigError('stake', 'must be a positive integer')
  }
  const validSettlement = ['winner-takes-pot', 'per-stroke', 'places'] as const
  if (!validSettlement.includes(cfg.settlementMode)) {
    throw new StrokePlayConfigError('settlementMode')
  }
  const validTieRules = ['split', 'card-back', 'scorecard-playoff'] as const
  if (!validTieRules.includes(cfg.tieRule)) {
    throw new StrokePlayConfigError('tieRule')
  }
  if (typeof cfg.appliesHandicap !== 'boolean') {
    throw new StrokePlayConfigError('appliesHandicap')
  }
  if (!Array.isArray(cfg.playerIds) || cfg.playerIds.length < 2 || cfg.playerIds.length > 5) {
    throw new StrokePlayConfigError('playerIds', 'length must be 2..5')
  }
  if (cfg.settlementMode === 'per-stroke') {
    if (
      typeof cfg.stakePerStroke !== 'number' ||
      !Number.isInteger(cfg.stakePerStroke) ||
      cfg.stakePerStroke < 1
    ) {
      throw new StrokePlayConfigError('stakePerStroke', 'must be a positive integer')
    }
  }
  if (cfg.settlementMode === 'places') {
    if (!Array.isArray(cfg.placesPayout)) {
      throw new StrokePlayConfigError('placesPayout')
    }
    if (cfg.placesPayout.length !== cfg.playerIds.length) {
      throw new StrokePlayConfigError(
        'placesPayout',
        `length must equal playerIds.length (${cfg.playerIds.length})`,
      )
    }
    if (!cfg.placesPayout.every((v) => Number.isInteger(v) && v >= 0)) {
      throw new StrokePlayConfigError('placesPayout', 'every entry must be a non-negative integer')
    }
    const total = cfg.placesPayout.reduce((s, v) => s + v, 0)
    const expected = cfg.stake * cfg.playerIds.length
    if (total !== expected) {
      throw new StrokePlayConfigError(
        'placesPayout',
        `sum must equal stake × playerIds.length (${expected}), got ${total}`,
      )
    }
  }
  if (cfg.tieRule === 'card-back' || cfg.tieRule === 'scorecard-playoff') {
    if (!Array.isArray(cfg.cardBackOrder) || cfg.cardBackOrder.length === 0) {
      throw new StrokePlayConfigError('cardBackOrder', 'must be a non-empty integer array')
    }
    if (!cfg.cardBackOrder.every((v) => Number.isInteger(v) && v > 0)) {
      throw new StrokePlayConfigError('cardBackOrder', 'every entry must be a positive integer')
    }
  }
  if (!Array.isArray(cfg.junkItems)) {
    throw new StrokePlayConfigError('junkItems')
  }
  if (
    typeof cfg.junkMultiplier !== 'number' ||
    !Number.isInteger(cfg.junkMultiplier) ||
    cfg.junkMultiplier < 1
  ) {
    throw new StrokePlayConfigError('junkMultiplier', 'must be a positive integer')
  }
}

function findBetId(cfg: StrokePlayCfg, roundCfg: RoundConfig): BetId {
  const bet = roundCfg.bets.find((b) => b.type === 'strokePlay' && b.id === cfg.id)
  if (bet === undefined) throw new StrokePlayBetNotFoundError()
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

// ─── Per-hole settlement ────────────────────────────────────────────────────

export function settleStrokePlayHole(
  hole: HoleState,
  config: StrokePlayCfg,
  roundCfg: RoundConfig,
): ScoringEvent[] {
  assertValidStrokePlayCfg(config)
  const declaringBet = findBetId(config, roundCfg)
  const base = {
    timestamp: hole.timestamp,
    actor: 'system' as const,
    declaringBet,
  }

  const events: ScoringEvent[] = []
  const nets: Record<PlayerId, number> = {}
  for (const pid of config.playerIds) {
    const gross = hole.gross[pid] ?? 0
    if (gross <= 0) {
      events.push({
        kind: 'IncompleteCard',
        ...base,
        hole: hole.hole,
        player: pid,
      })
      // A missing-gross player is excluded from this hole's net map.
      continue
    }
    nets[pid] = netFor(hole, pid, config.appliesHandicap)
  }

  events.push({
    kind: 'StrokePlayHoleRecorded',
    ...base,
    hole: hole.hole,
    nets,
  })
  return events
}

// ─── Round finalization ─────────────────────────────────────────────────────

const STROKE_EVENT_KINDS = new Set<ScoringEvent['kind']>([
  'StrokePlayHoleRecorded',
  'StrokePlaySettled',
  'CardBackResolved',
  'ScorecardPlayoffResolved',
  'TieFallthrough',
  'RoundingAdjustment',
  'IncompleteCard',
  'FieldTooSmall',
])

export function finalizeStrokePlayRound(
  events: ScoringEvent[],
  config: StrokePlayCfg,
): ScoringEvent[] {
  assertValidStrokePlayCfg(config)

  const owned: ScoringEvent[] = []
  const passThrough: ScoringEvent[] = []
  for (const e of events) {
    if (STROKE_EVENT_KINDS.has(e.kind) && 'declaringBet' in e) owned.push(e)
    else passThrough.push(e)
  }

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
  config: StrokePlayCfg,
  betId: BetId,
): ScoringEvent[] {
  const holeRecords = betEvents.filter(
    (e): e is ScoringEvent & { kind: 'StrokePlayHoleRecorded' } =>
      e.kind === 'StrokePlayHoleRecorded',
  )
  const incompleteByPlayer = new Set<PlayerId>()
  for (const e of betEvents) {
    if (e.kind === 'IncompleteCard') incompleteByPlayer.add(e.player)
  }

  // Scoring set: players who completed every hole they should have.
  const scoringSet = config.playerIds.filter((p) => !incompleteByPlayer.has(p))
  const baseTs = holeRecords.length > 0 ? holeRecords[holeRecords.length - 1].timestamp : 'end'
  const base = {
    timestamp: baseTs,
    actor: 'system' as const,
    declaringBet: betId,
    hole: null as null,
  }

  const passthrough = betEvents.filter((e) => !STROKE_EVENT_KINDS.has(e.kind))
  const result: ScoringEvent[] = []

  // § 9: fewer than 2 scoring players → FieldTooSmall, no settlement.
  if (scoringSet.length < 2) {
    result.push({
      kind: 'FieldTooSmall',
      ...base,
    })
    return passthrough.length > 0 ? result : result
  }

  // Compute per-player net totals from StrokePlayHoleRecorded events.
  const netTotals: Record<PlayerId, number> = {}
  for (const p of scoringSet) netTotals[p] = 0
  for (const e of holeRecords) {
    for (const p of scoringSet) {
      netTotals[p] += e.nets[p] ?? 0
    }
  }

  // Dispatch to settlement mode.
  if (config.settlementMode === 'per-stroke') {
    result.push(...settlePerStroke(netTotals, scoringSet, config, base))
  } else if (config.settlementMode === 'places') {
    result.push(...settlePlaces(netTotals, scoringSet, holeRecords, config, base))
  } else {
    result.push(...settleWinnerTakesPot(netTotals, scoringSet, holeRecords, config, base))
  }

  return result
}

// ─── winner-takes-pot ───────────────────────────────────────────────────────

function settleWinnerTakesPot(
  netTotals: Record<PlayerId, number>,
  scoringSet: readonly PlayerId[],
  holeRecords: ReadonlyArray<ScoringEvent & { kind: 'StrokePlayHoleRecorded' }>,
  config: StrokePlayCfg,
  base: { timestamp: string; actor: 'system'; declaringBet: BetId; hole: null },
): ScoringEvent[] {
  const out: ScoringEvent[] = []
  const minNet = Math.min(...scoringSet.map((p) => netTotals[p]))
  const tied = scoringSet.filter((p) => netTotals[p] === minNet)

  if (tied.length === 1) {
    const winner = tied[0]
    const points = zeroPoints(scoringSet)
    points[winner] = config.stake * (scoringSet.length - 1)
    for (const p of scoringSet) if (p !== winner) points[p] = -config.stake
    out.push({
      kind: 'StrokePlaySettled',
      ...base,
      mode: 'winner-takes-pot',
      points,
    })
    return out
  }

  // Tie: resolve per tieRule.
  return resolveTie({
    tied,
    scoringSet,
    holeRecords,
    config,
    base,
    buildWinnerPoints: (winners) => winnerTakesPotPoints(winners, scoringSet, config),
    settlementMode: 'winner-takes-pot',
  })
}

function winnerTakesPotPoints(
  winners: readonly PlayerId[],
  scoringSet: readonly PlayerId[],
  config: StrokePlayCfg,
): { points: Record<PlayerId, number>; absorbingPlayer: PlayerId | null; remainder: number } {
  const points = zeroPoints(scoringSet)
  const losers = scoringSet.filter((p) => !winners.includes(p))
  for (const l of losers) points[l] = -config.stake
  const loserPot = config.stake * losers.length
  const perWinner = Math.floor(loserPot / winners.length)
  const remainder = loserPot - perWinner * winners.length
  for (const w of winners) points[w] = perWinner
  const absorbingPlayer =
    remainder > 0 ? [...winners].sort()[0] : null
  // Remainder goes into RoundingAdjustment event (emitted by caller), not silently
  // absorbed here. Keeps StrokePlaySettled.points consistent across tied winners.
  return { points, absorbingPlayer, remainder }
}

// ─── per-stroke ─────────────────────────────────────────────────────────────

function settlePerStroke(
  netTotals: Record<PlayerId, number>,
  scoringSet: readonly PlayerId[],
  config: StrokePlayCfg,
  base: { timestamp: string; actor: 'system'; declaringBet: BetId; hole: null },
): ScoringEvent[] {
  const points = zeroPoints(scoringSet)
  for (let i = 0; i < scoringSet.length; i += 1) {
    for (let j = i + 1; j < scoringSet.length; j += 1) {
      const p = scoringSet[i]
      const q = scoringSet[j]
      const diff = netTotals[p] - netTotals[q]
      // § 8: p pays stakePerStroke per stroke above q. If diff>0, p pays.
      points[p] -= diff * config.stakePerStroke
      points[q] += diff * config.stakePerStroke
    }
  }
  return [{
    kind: 'StrokePlaySettled',
    ...base,
    mode: 'per-stroke',
    points,
  }]
}

// ─── places ────────────────────────────────────────────────────────────────

function settlePlaces(
  netTotals: Record<PlayerId, number>,
  scoringSet: readonly PlayerId[],
  holeRecords: ReadonlyArray<ScoringEvent & { kind: 'StrokePlayHoleRecorded' }>,
  config: StrokePlayCfg,
  base: { timestamp: string; actor: 'system'; declaringBet: BetId; hole: null },
): ScoringEvent[] {
  // Sort players by net ascending; break ties via tieRule.
  const ranked = [...scoringSet].sort((a, b) => netTotals[a] - netTotals[b])

  // Identify tied clusters and resolve each.
  const out: ScoringEvent[] = []
  const finalOrder: PlayerId[] = []
  let i = 0
  while (i < ranked.length) {
    let j = i
    while (j + 1 < ranked.length && netTotals[ranked[j + 1]] === netTotals[ranked[i]]) j += 1
    const cluster = ranked.slice(i, j + 1)
    if (cluster.length === 1) {
      finalOrder.push(cluster[0])
    } else {
      const tbResult = breakTieForPlaces(cluster, holeRecords, config, base)
      out.push(...tbResult.events)
      finalOrder.push(...tbResult.order)
    }
    i = j + 1
  }

  const points = zeroPoints(scoringSet)
  for (let rank = 0; rank < finalOrder.length; rank += 1) {
    points[finalOrder[rank]] = config.placesPayout[rank] - config.stake
  }
  out.push({
    kind: 'StrokePlaySettled',
    ...base,
    mode: 'places',
    points,
  })
  return out
}

function breakTieForPlaces(
  tied: readonly PlayerId[],
  holeRecords: ReadonlyArray<ScoringEvent & { kind: 'StrokePlayHoleRecorded' }>,
  config: StrokePlayCfg,
  base: { timestamp: string; actor: 'system'; declaringBet: BetId; hole: null },
): { order: PlayerId[]; events: ScoringEvent[] } {
  // For `places` under card-back / scorecard-playoff we need a total order,
  // not just a single winner. We iteratively pick the lowest-ranked tied
  // player via card-back on the remaining cluster. If card-back exhausts
  // without resolution, fall back to sorted playerId order plus TieFallthrough.
  const out: ScoringEvent[] = []
  const remaining = [...tied]
  const order: PlayerId[] = []
  while (remaining.length > 1) {
    const resolution = resolveTieByCardBack(holeRecords, remaining, config, base)
    if (resolution.winner !== null) {
      out.push(...resolution.events)
      order.push(resolution.winner)
      remaining.splice(remaining.indexOf(resolution.winner), 1)
      continue
    }
    // Fell through: TieFallthrough + deterministic order by playerId.
    out.push({
      kind: 'TieFallthrough',
      ...base,
      from: config.tieRule,
      to: 'split',
    })
    remaining.sort()
    order.push(...remaining)
    return { order, events: out }
  }
  if (remaining.length === 1) order.push(remaining[0])
  return { order, events: out }
}

// ─── Tie resolution (used by winner-takes-pot) ──────────────────────────────

function resolveTie(args: {
  tied: readonly PlayerId[]
  scoringSet: readonly PlayerId[]
  holeRecords: ReadonlyArray<ScoringEvent & { kind: 'StrokePlayHoleRecorded' }>
  config: StrokePlayCfg
  base: { timestamp: string; actor: 'system'; declaringBet: BetId; hole: null }
  buildWinnerPoints: (winners: readonly PlayerId[]) => {
    points: Record<PlayerId, number>
    absorbingPlayer: PlayerId | null
    remainder: number
  }
  settlementMode: 'winner-takes-pot' | 'per-stroke' | 'places'
}): ScoringEvent[] {
  const { tied, holeRecords, config, base, buildWinnerPoints, settlementMode } = args
  const out: ScoringEvent[] = []

  if (config.tieRule === 'split') {
    return emitSplitSettlement(tied, buildWinnerPoints, config, base, settlementMode)
  }

  if (config.tieRule === 'card-back') {
    const resolution = resolveTieByCardBack(holeRecords, tied, config, base)
    if (resolution.winner !== null) {
      out.push(...resolution.events)
      const winPoints = buildWinnerPoints([resolution.winner])
      out.push({
        kind: 'StrokePlaySettled',
        ...base,
        mode: settlementMode,
        points: winPoints.points,
      })
      if (winPoints.absorbingPlayer !== null) {
        out.push({
          kind: 'RoundingAdjustment',
          ...base,
          absorbingPlayer: winPoints.absorbingPlayer,
          points: { [winPoints.absorbingPlayer]: winPoints.remainder },
        })
      }
      return out
    }
    // Fell through: TieFallthrough → split.
    out.push({
      kind: 'TieFallthrough',
      ...base,
      from: 'card-back',
      to: 'split',
    })
    out.push(...emitSplitSettlement(tied, buildWinnerPoints, config, base, settlementMode, /* skipFallthrough */ true))
    return out
  }

  // scorecard-playoff
  const sp = resolveTieByScorecardPlayoff(holeRecords, tied, config, base)
  if (sp.winner !== null) {
    out.push(...sp.events)
    const winPoints = buildWinnerPoints([sp.winner])
    out.push({
      kind: 'StrokePlaySettled',
      ...base,
      mode: settlementMode,
      points: winPoints.points,
    })
    if (winPoints.absorbingPlayer !== null) {
      out.push({
        kind: 'RoundingAdjustment',
        ...base,
        absorbingPlayer: winPoints.absorbingPlayer,
        points: { [winPoints.absorbingPlayer]: winPoints.remainder },
      })
    }
    return out
  }
  out.push({
    kind: 'TieFallthrough',
    ...base,
    from: 'scorecard-playoff',
    to: 'split',
  })
  out.push(...emitSplitSettlement(tied, buildWinnerPoints, config, base, settlementMode, /* skipFallthrough */ true))
  return out
}

function emitSplitSettlement(
  tied: readonly PlayerId[],
  buildWinnerPoints: (winners: readonly PlayerId[]) => {
    points: Record<PlayerId, number>
    absorbingPlayer: PlayerId | null
    remainder: number
  },
  config: StrokePlayCfg,
  base: { timestamp: string; actor: 'system'; declaringBet: BetId; hole: null },
  settlementMode: 'winner-takes-pot' | 'per-stroke' | 'places',
  skipFallthrough = false,
): ScoringEvent[] {
  const out: ScoringEvent[] = []
  if (!skipFallthrough) {
    // MIGRATION_NOTES #15: every tie-to-split resolution logs a TieFallthrough.
    // Distinguishes from silent zero-pay; audit log is complete.
    out.push({
      kind: 'TieFallthrough',
      ...base,
      from: 'split',
      to: 'split',
    })
  }
  const { points, absorbingPlayer, remainder } = buildWinnerPoints(tied)
  out.push({
    kind: 'StrokePlaySettled',
    ...base,
    mode: settlementMode,
    points,
  })
  if (absorbingPlayer !== null) {
    out.push({
      kind: 'RoundingAdjustment',
      ...base,
      absorbingPlayer,
      points: { [absorbingPlayer]: remainder },
    })
  }
  return out
}

// ─── Card-back helper ───────────────────────────────────────────────────────

export function resolveTieByCardBack(
  holeRecords: ReadonlyArray<ScoringEvent & { kind: 'StrokePlayHoleRecorded' }>,
  tiedPlayers: readonly PlayerId[],
  config: StrokePlayCfg,
  base?: { timestamp: string; actor: 'system'; declaringBet: BetId; hole: null },
): { winner: PlayerId | null; events: ScoringEvent[] } {
  const events: ScoringEvent[] = []
  // 18-hole round assumed. Segment n = last n holes = holes (19-n)..18.
  for (const segment of config.cardBackOrder) {
    const startHole = Math.max(1, 19 - segment)
    const totals: Record<PlayerId, number> = {}
    for (const p of tiedPlayers) totals[p] = 0
    for (const e of holeRecords) {
      if (e.hole >= startHole && e.hole <= 18) {
        for (const p of tiedPlayers) totals[p] += e.nets[p] ?? 0
      }
    }
    const minTotal = Math.min(...tiedPlayers.map((p) => totals[p]))
    const separated = tiedPlayers.filter((p) => totals[p] === minTotal)
    if (separated.length === 1) {
      const winner = separated[0]
      const evBase = base ?? {
        timestamp: holeRecords[holeRecords.length - 1]?.timestamp ?? 'end',
        actor: 'system' as const,
        declaringBet: holeRecords[0]?.declaringBet ?? '',
        hole: null as null,
      }
      events.push({
        kind: 'CardBackResolved',
        ...evBase,
        segment,
        tiedPlayers: [...tiedPlayers],
        winner,
      })
      return { winner, events }
    }
  }
  return { winner: null, events }
}

function resolveTieByScorecardPlayoff(
  holeRecords: ReadonlyArray<ScoringEvent & { kind: 'StrokePlayHoleRecorded' }>,
  tiedPlayers: readonly PlayerId[],
  config: StrokePlayCfg,
  base: { timestamp: string; actor: 'system'; declaringBet: BetId; hole: null },
): { winner: PlayerId | null; events: ScoringEvent[] } {
  const events: ScoringEvent[] = []

  // First try cardBackOrder segments (same as card-back).
  const cb = resolveTieByCardBack(holeRecords, tiedPlayers, config, base)
  if (cb.winner !== null) {
    // Reframe as ScorecardPlayoffResolved to match § 11 / § 6 semantics.
    events.push({
      kind: 'ScorecardPlayoffResolved',
      ...base,
      tiedPlayers: [...tiedPlayers],
      winner: cb.winner,
    })
    return { winner: cb.winner, events }
  }

  // Still tied: walk holes 18..1 individually.
  for (let h = 18; h >= 1; h -= 1) {
    const totals: Record<PlayerId, number> = {}
    for (const p of tiedPlayers) totals[p] = 0
    for (const e of holeRecords) {
      if (e.hole === h) {
        for (const p of tiedPlayers) totals[p] += e.nets[p] ?? 0
      }
    }
    const minTotal = Math.min(...tiedPlayers.map((p) => totals[p]))
    const separated = tiedPlayers.filter((p) => totals[p] === minTotal)
    if (separated.length === 1) {
      const winner = separated[0]
      events.push({
        kind: 'ScorecardPlayoffResolved',
        ...base,
        tiedPlayers: [...tiedPlayers],
        winner,
      })
      return { winner, events }
    }
  }
  return { winner: null, events }
}
