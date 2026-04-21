// src/games/skins.ts — pure Skins scoring engine per docs/games/game_skins.md.
//
// Exports:
//   settleSkinsHole(hole, config, roundCfg)  → provisional per-hole events
//   finalizeSkinsRound(events, config)       → carry-adjusted events + hole-18 tie resolution
//   SkinsConfigError, SkinsBetNotFoundError  → typed errors
//
// Signature notes (logged to /tmp/execution-notes.md):
//   1. The rule file's § 5 pseudocode threads `carryFromPriorHoles` through
//      settleSkinsHole. The Sub-Task D prompt drops that parameter. Resolution:
//      settleSkinsHole emits provisional SkinWon events assuming carry == 0;
//      finalizeSkinsRound walks the event stream in order and rewrites each
//      SkinWon's `points` with the accumulated carry. This keeps settleSkinsHole
//      stateless and preserves zero-sum on every individual event.
//   2. The prompt's signature omits a BetId. This file derives it by matching
//      the config reference against `roundCfg.bets[i].config`; mismatch throws
//      SkinsBetNotFoundError.
//
// Portability: pure TypeScript. No next/*, react, react-dom, fs, path,
// process, DOM globals, @prisma/client, or src/lib/* imports.

import type {
  BetId,
  HoleState,
  PlayerId,
  RoundConfig,
  ScoringEvent,
  SkinsCfg,
} from './types'
import { strokesOnHole } from './handicap'

// ─── Typed errors ───────────────────────────────────────────────────────────

export class SkinsConfigError extends Error {
  readonly code = 'SkinsConfigError' as const
  constructor(public readonly field: string, public readonly detail?: string) {
    super(
      detail
        ? `SkinsCfg field '${field}' is invalid: ${detail}`
        : `SkinsCfg missing required field: ${field}`,
    )
    this.name = 'SkinsConfigError'
  }
}

export class SkinsBetNotFoundError extends Error {
  readonly code = 'SkinsBetNotFoundError' as const
  constructor() {
    super(
      'Skins config does not correspond to a bet in roundCfg.bets — ' +
        'pass a config reference obtained from roundCfg.bets[i].config.',
    )
    this.name = 'SkinsBetNotFoundError'
  }
}

export class SkinsRoundConfigError extends Error {
  readonly code = 'SkinsRoundConfigError' as const
  constructor(public readonly field: string) {
    super(`RoundConfig missing required field for Skins: ${field}`)
    this.name = 'SkinsRoundConfigError'
  }
}

// ─── Validation ─────────────────────────────────────────────────────────────

function assertValidSkinsCfg(cfg: SkinsCfg): void {
  if (typeof cfg.stake !== 'number' || !Number.isInteger(cfg.stake) || cfg.stake < 1) {
    throw new SkinsConfigError('stake', 'must be a positive integer')
  }
  const validTieRules = ['carryover', 'split', 'no-points'] as const
  if (!validTieRules.includes(cfg.tieRuleFinalHole)) {
    throw new SkinsConfigError('tieRuleFinalHole')
  }
  if (typeof cfg.appliesHandicap !== 'boolean') {
    throw new SkinsConfigError('appliesHandicap')
  }
  if (typeof cfg.escalating !== 'boolean') {
    throw new SkinsConfigError('escalating')
  }
  if (!Array.isArray(cfg.playerIds) || cfg.playerIds.length < 2 || cfg.playerIds.length > 5) {
    throw new SkinsConfigError('playerIds', 'length must be 2..5')
  }
  if (!Array.isArray(cfg.junkItems)) {
    throw new SkinsConfigError('junkItems')
  }
  if (
    typeof cfg.junkMultiplier !== 'number' ||
    !Number.isInteger(cfg.junkMultiplier) ||
    cfg.junkMultiplier < 1
  ) {
    throw new SkinsConfigError('junkMultiplier', 'must be a positive integer')
  }
}

function assertValidRoundCfgForSkins(roundCfg: RoundConfig): void {
  if (typeof roundCfg.unitSize !== 'number' || !Number.isInteger(roundCfg.unitSize)) {
    throw new SkinsRoundConfigError('unitSize')
  }
}

function findBetId(cfg: SkinsCfg, roundCfg: RoundConfig): BetId {
  const bet = roundCfg.bets.find((b) => b.type === 'skins' && b.id === cfg.id)
  if (bet === undefined) throw new SkinsBetNotFoundError()
  return bet.id
}

// ─── Small utilities ────────────────────────────────────────────────────────

function zeroPoints(playerIds: PlayerId[]): Record<PlayerId, number> {
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

export function settleSkinsHole(
  hole: HoleState,
  config: SkinsCfg,
  roundCfg: RoundConfig,
): ScoringEvent[] {
  assertValidSkinsCfg(config)
  assertValidRoundCfgForSkins(roundCfg)

  const declaringBet = findBetId(config, roundCfg)
  const base = {
    timestamp: hole.timestamp,
    actor: 'system' as const,
    declaringBet,
  }

  // Missing-score exclusion (rule file § 9): gross <= 0 or undefined drops
  // the player from this hole's competition; their delta stays zero.
  const contenders = config.playerIds.filter((pid) => (hole.gross[pid] ?? 0) > 0)

  if (contenders.length < 2) {
    return [{
      kind: 'FieldTooSmall',
      ...base,
      hole: hole.hole,
    }]
  }

  const nets = contenders.map((pid) => ({
    pid,
    net: netFor(hole, pid, config.appliesHandicap),
  }))
  const best = Math.min(...nets.map((n) => n.net))
  const winners = nets.filter((n) => n.net === best).map((n) => n.pid)

  if (winners.length === 1) {
    // Single winner. Emit a provisional SkinWon with points assuming
    // carry == 0; finalizeSkinsRound rewrites with accumulated carry.
    const winner = winners[0]
    const losers = contenders.filter((p) => p !== winner)
    const points = zeroPoints(config.playerIds)
    points[winner] = config.stake * losers.length
    for (const l of losers) points[l] = -config.stake
    return [{
      kind: 'SkinWon',
      ...base,
      hole: hole.hole,
      winner,
      points,
    }]
  }

  // Tied hole. Escalating=false voids the hole; escalating=true carries.
  if (!config.escalating) {
    return [{
      kind: 'SkinVoid',
      ...base,
      hole: hole.hole,
    }]
  }

  return [{
    kind: 'SkinCarried',
    ...base,
    hole: hole.hole,
    carryPoints: config.stake,
    contenders,
    tiedPlayers: winners,
  }]
}

// ─── Round finalization ─────────────────────────────────────────────────────

const SKINS_EVENT_KINDS = new Set<ScoringEvent['kind']>([
  'SkinWon',
  'SkinCarried',
  'SkinVoid',
  'SkinCarryForfeit',
  'FieldTooSmall',
  'RoundingAdjustment',
])

export function finalizeSkinsRound(
  events: ScoringEvent[],
  config: SkinsCfg,
): ScoringEvent[] {
  assertValidSkinsCfg(config)

  // Partition events: Skins-owned vs. everything else (other games pass through).
  const owned: ScoringEvent[] = []
  const passThrough: ScoringEvent[] = []
  for (const e of events) {
    if (SKINS_EVENT_KINDS.has(e.kind) && 'declaringBet' in e) owned.push(e)
    else passThrough.push(e)
  }

  // Group owned events by declaringBet so multiple Skins bets finalize independently.
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
  config: SkinsCfg,
  betId: BetId,
): ScoringEvent[] {
  // Sort by hole (null holes first, then ascending).
  const sorted = [...betEvents].sort((a, b) => {
    const ah = a.hole ?? -1
    const bh = b.hole ?? -1
    return ah - bh
  })

  const holeNumbers = sorted.map((e) => e.hole).filter((h): h is number => h !== null)
  const finalHole = holeNumbers.length > 0 ? Math.max(...holeNumbers) : null

  const result: ScoringEvent[] = []
  let carryStake = 0

  for (const e of sorted) {
    if (e.kind === 'SkinWon') {
      // Scale the provisional per-hole points by the carry multiplier.
      // carryStake is always an integer multiple of stake (each SkinCarried
      // adds one stake to the accumulator), so multiplier is an integer.
      // Scaling preserves the contender set encoded by settleSkinsHole —
      // missing-score players and withdrawn players keep their zero delta.
      const carryCount = carryStake / config.stake
      const multiplier = 1 + carryCount
      const points: Record<PlayerId, number> = {}
      for (const pid of config.playerIds) {
        points[pid] = (e.points[pid] ?? 0) * multiplier
      }
      result.push({ ...e, points })
      carryStake = 0
      continue
    }

    if (e.kind === 'SkinCarried') {
      if (e.hole === finalHole) {
        const resolved = resolveFinalHoleTie(e, config, carryStake, betId)
        result.push(...resolved)
        carryStake = 0
      } else {
        carryStake += config.stake
        result.push(e)
      }
      continue
    }

    // Other Skins-owned events pass through unchanged.
    result.push(e)
  }

  return result
}

function resolveFinalHoleTie(
  carryEvent: ScoringEvent & { kind: 'SkinCarried' },
  config: SkinsCfg,
  carryStake: number,
  betId: BetId,
): ScoringEvent[] {
  const base = {
    timestamp: carryEvent.timestamp,
    actor: 'system' as const,
    declaringBet: betId,
  }

  // Pot per opponent includes every carried hole's stake plus the final hole's own.
  const totalCarry = carryStake + config.stake
  const potPerOpponent = totalCarry

  const contenders = carryEvent.contenders ?? config.playerIds
  const tiedPlayers = carryEvent.tiedPlayers ?? []
  const losers = contenders.filter((p) => !tiedPlayers.includes(p))

  switch (config.tieRuleFinalHole) {
    case 'carryover':
    case 'no-points':
      return [{
        kind: 'SkinCarryForfeit',
        ...base,
        hole: carryEvent.hole,
        carryPoints: totalCarry,
      }]

    case 'split': {
      if (tiedPlayers.length === 0 || losers.length === 0) {
        // All-tied or all-out: no non-winner payers → forfeit.
        return [{
          kind: 'SkinCarryForfeit',
          ...base,
          hole: carryEvent.hole,
          carryPoints: totalCarry,
        }]
      }
      // One SkinWon event per tied winner. Each event is zero-sum within
      // the declaring bet's bettor set: winner collects potPerOpponent from
      // each loser; losers' debts accumulate across events.
      return tiedPlayers.map((winner) => {
        const points = zeroPoints(config.playerIds)
        points[winner] = potPerOpponent * losers.length
        for (const l of losers) points[l] = -potPerOpponent
        return {
          kind: 'SkinWon' as const,
          ...base,
          hole: carryEvent.hole,
          winner,
          points,
        }
      })
    }
  }
}
