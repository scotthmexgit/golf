// src/games/match_play.ts — pure Match Play scoring engine per docs/games/game_match_play.md.
//
// Portability: pure TypeScript; no next/*, react, react-dom, fs, path,
// process, DOM globals, @prisma/client, or src/lib/* imports.

import type { HoleState, MatchPlayCfg, PlayerId, RoundConfig, ScoringEvent } from './types'
import { strokesOnHole } from './handicap'

// ─── Match state ─────────────────────────────────────────────────────────────

export interface MatchState {
  holesUp: number       // positive = team1 leads; negative = team2 leads
  holesPlayed: number
  closedOut: boolean
}

// ─── Typed errors ────────────────────────────────────────────────────────────

export class MatchPlayConfigError extends Error {
  readonly code = 'MatchPlayConfigError' as const
  constructor(public readonly field: string, public readonly detail?: string) {
    super(
      detail
        ? `MatchPlayCfg field '${field}' is invalid: ${detail}`
        : `MatchPlayCfg missing required field: ${field}`,
    )
    this.name = 'MatchPlayConfigError'
  }
}

export class MatchPlayBetNotFoundError extends Error {
  readonly code = 'MatchPlayBetNotFoundError' as const
  constructor() {
    super(
      'Match Play config does not correspond to a bet in roundCfg.bets — ' +
        'pass a config whose id matches a BetSelection.id.',
    )
    this.name = 'MatchPlayBetNotFoundError'
  }
}

// ─── State initializer ───────────────────────────────────────────────────────

export function initialMatch(_cfg: MatchPlayCfg): MatchState {
  return { holesUp: 0, holesPlayed: 0, closedOut: false }
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function netScore(state: HoleState, pid: PlayerId, appliesHandicap: boolean): number {
  return appliesHandicap
    ? state.gross[pid] - strokesOnHole(state.strokes[pid], state.holeIndex)
    : state.gross[pid]
}

// Returns non-null reason string if teams config fails § 4 validation contract.
function validateTeams(cfg: MatchPlayCfg): string | null {
  const { teams, playerIds } = cfg
  if (!teams || teams.length !== 2) {
    return 'teams must contain exactly 2 entries'
  }
  for (let i = 0; i < 2; i++) {
    if (teams[i].length !== 2) {
      return `teams[${i}] must have exactly 2 player IDs`
    }
  }
  const all = [...teams[0], ...teams[1]]
  for (const pid of all) {
    if (!playerIds.includes(pid)) {
      return `player '${pid}' in teams is not listed in playerIds`
    }
  }
  const seen = new Set<string>()
  for (const pid of all) {
    if (seen.has(pid)) {
      return `duplicate player ID '${pid}' across teams`
    }
    seen.add(pid)
  }
  return null
}

// Per § 5: singles and best-ball. conceded = players excluded from bestNet (§ 7 hole concession).
function holeWinner(
  state: HoleState,
  cfg: MatchPlayCfg,
  conceded: ReadonlySet<PlayerId> = new Set(),
): 'team1' | 'team2' | 'halved' {
  const side1: readonly PlayerId[] =
    cfg.format === 'singles' ? [cfg.playerIds[0]] : cfg.teams![0]
  const side2: readonly PlayerId[] =
    cfg.format === 'singles' ? [cfg.playerIds[1]] : cfg.teams![1]
  const active1 = conceded.size > 0 ? side1.filter((p) => !conceded.has(p)) : side1
  const active2 = conceded.size > 0 ? side2.filter((p) => !conceded.has(p)) : side2
  // Filter players with undefined gross (§ 5 partial-miss: use available partner's score).
  // Phase 4d: also exclude players in state.withdrew — withdrew is the authoritative signal
  // for team composition regardless of gross presence.
  const bestNet = (pids: readonly PlayerId[]): number => {
    const valid = pids.filter(
      (p) => state.gross[p] !== undefined && !state.withdrew.includes(p),
    )
    return valid.length === 0
      ? Infinity
      : Math.min(...valid.map((p) => netScore(state, p, cfg.appliesHandicap)))
  }
  const netA = bestNet(active1)
  const netB = bestNet(active2)

  if (netA < netB) return 'team1'
  if (netB < netA) return 'team2'
  return 'halved'
}

export function advanceMatch(
  match: MatchState,
  winner: 'team1' | 'team2' | 'halved',
  holesToPlay: number,
): MatchState {
  if (match.closedOut) return match
  const delta = winner === 'team1' ? 1 : winner === 'team2' ? -1 : 0
  const next: MatchState = {
    holesUp: match.holesUp + delta,
    holesPlayed: match.holesPlayed + 1,
    closedOut: false,
  }
  const holesRemaining = holesToPlay - next.holesPlayed
  if (Math.abs(next.holesUp) > holesRemaining) next.closedOut = true
  return next
}

// Splits totalPoints evenly across team members. If stake % teamSize !== 0,
// the lex-lowest player ID absorbs the remainder per § 8 Gap 7 contract.
function splitToTeam(
  team: readonly PlayerId[],
  totalPoints: number,
): { base: Record<PlayerId, number>; adjPlayer: PlayerId | null; remainder: number } {
  const n = team.length
  const sign = totalPoints >= 0 ? 1 : -1
  const baseMag = Math.floor(Math.abs(totalPoints) / n)
  const baseAmt = baseMag * sign
  const remainder = totalPoints - baseAmt * n
  const base: Record<PlayerId, number> = {}
  for (const pid of team) base[pid] = baseAmt
  // Sort is safe: team has ≥ 1 member (validated before splitToTeam is called).
  const adjPlayer = remainder !== 0 ? [...team].sort()[0]! : null
  return { base, adjPlayer, remainder }
}

// Builds MatchClosedOut (+ RoundingAdjustment if needed) for a decided match.
function buildCloseoutEvent(
  timestamp: string,
  holeNum: number,
  cfg: MatchPlayCfg,
  holesUp: number,
  holesRemaining: number,
  winner: 'team1' | 'team2',
): ScoringEvent[] {
  const out: ScoringEvent[] = []
  const declaringBet = cfg.id
  if (cfg.format === 'singles') {
    const pid0 = cfg.playerIds[0]
    const pid1 = cfg.playerIds[1]
    const points =
      winner === 'team1'
        ? { [pid0]: cfg.stake, [pid1]: -cfg.stake }
        : { [pid0]: -cfg.stake, [pid1]: cfg.stake }
    out.push({
      kind: 'MatchClosedOut',
      timestamp,
      hole: holeNum,
      actor: 'system',
      declaringBet,
      matchId: cfg.id,
      holesUp,
      holesRemaining,
      points,
    })
  } else {
    const [winTeam, loseTeam] =
      winner === 'team1' ? [cfg.teams![0], cfg.teams![1]] : [cfg.teams![1], cfg.teams![0]]
    const winSplit = splitToTeam(winTeam, cfg.stake)
    const loseSplit = splitToTeam(loseTeam, -cfg.stake)
    const points: Record<PlayerId, number> = { ...winSplit.base, ...loseSplit.base }
    out.push({
      kind: 'MatchClosedOut',
      timestamp,
      hole: holeNum,
      actor: 'system',
      declaringBet,
      matchId: cfg.id,
      holesUp,
      holesRemaining,
      points,
    })
    if (winSplit.adjPlayer !== null) {
      out.push({
        kind: 'RoundingAdjustment',
        timestamp,
        hole: holeNum,
        actor: 'system',
        declaringBet,
        absorbingPlayer: winSplit.adjPlayer,
        points: { [winSplit.adjPlayer]: winSplit.remainder },
      })
    }
    if (loseSplit.adjPlayer !== null) {
      out.push({
        kind: 'RoundingAdjustment',
        timestamp,
        hole: holeNum,
        actor: 'system',
        declaringBet,
        absorbingPlayer: loseSplit.adjPlayer,
        points: { [loseSplit.adjPlayer]: loseSplit.remainder },
      })
    }
  }
  return out
}

// Returns the forfeiting player + winner for a single-side missing-score situation (§ 9).
// Returns null when: (a) no one is missing, (b) both sides are missing (doc silent — caller falls through).
function getMissingScoreForfeit(
  hole: HoleState,
  cfg: MatchPlayCfg,
): { forfeiter: PlayerId; winner: 'team1' | 'team2' } | null {
  if (cfg.format === 'singles') {
    const p0Missing = hole.gross[cfg.playerIds[0]] === undefined
    const p1Missing = hole.gross[cfg.playerIds[1]] === undefined
    if (p0Missing && !p1Missing) return { forfeiter: cfg.playerIds[0], winner: 'team2' }
    if (!p0Missing && p1Missing) return { forfeiter: cfg.playerIds[1], winner: 'team1' }
    return null
  }
  const team1AllMissing = cfg.teams![0].every((p) => hole.gross[p] === undefined)
  const team2AllMissing = cfg.teams![1].every((p) => hole.gross[p] === undefined)
  if (team1AllMissing && !team2AllMissing)
    return { forfeiter: [...cfg.teams![0]].sort()[0]!, winner: 'team2' }
  if (!team1AllMissing && team2AllMissing)
    return { forfeiter: [...cfg.teams![1]].sort()[0]!, winner: 'team1' }
  return null
}

// ─── Per-hole settle ─────────────────────────────────────────────────────────

export function settleMatchPlayHole(
  hole: HoleState,
  cfg: MatchPlayCfg,
  roundCfg: RoundConfig,
  match: MatchState,
): { events: ScoringEvent[]; match: MatchState } {
  if (match.closedOut) return { events: [], match }

  // Non-singles formats require a valid teams array per § 4.
  if (cfg.format !== 'singles') {
    const reason = validateTeams(cfg)
    if (reason !== null) {
      return {
        events: [
          {
            kind: 'MatchConfigInvalid',
            timestamp: hole.timestamp,
            hole: hole.hole,
            actor: 'system',
            declaringBet: cfg.id,
            reason,
          },
        ],
        match,
      }
    }
  }

  const bet = roundCfg.bets.find((b) => b.type === 'matchPlay' && b.id === cfg.id)
  if (!bet) throw new MatchPlayBetNotFoundError()
  const declaringBet = cfg.id

  // Hole concession short-circuit (§ 7): ConcessionRecorded replaces HoleResolved.
  if (hole.conceded.length > 0) {
    const conceder = hole.conceded[0]!
    const holeWin: 'team1' | 'team2' | 'halved' =
      cfg.format === 'singles'
        ? // singles: conceder's side loses; net scores not compared
          conceder === cfg.playerIds[0]
          ? 'team2'
          : 'team1'
        : // best-ball: exclude conceded players from bestNet (§ 5 partial-miss rule)
          holeWinner(hole, cfg, new Set(hole.conceded))
    const updatedConcededMatch = advanceMatch(match, holeWin, cfg.holesToPlay)
    const concededEvents: ScoringEvent[] = [
      {
        kind: 'ConcessionRecorded',
        timestamp: hole.timestamp,
        hole: hole.hole,
        actor: 'system',
        declaringBet,
        conceder,
        unit: 'hole',
      },
    ]
    if (updatedConcededMatch.closedOut) {
      const closeWinner: 'team1' | 'team2' = updatedConcededMatch.holesUp > 0 ? 'team1' : 'team2'
      concededEvents.push(
        ...buildCloseoutEvent(
          hole.timestamp,
          hole.hole,
          cfg,
          Math.abs(updatedConcededMatch.holesUp),
          cfg.holesToPlay - updatedConcededMatch.holesPlayed,
          closeWinner,
        ),
      )
    }
    return { events: concededEvents, match: updatedConcededMatch }
  }

  // Missing score check (§ 9): HoleForfeited replaces HoleResolved.
  const forfeit = getMissingScoreForfeit(hole, cfg)
  if (forfeit !== null) {
    const updatedForfeitMatch = advanceMatch(match, forfeit.winner, cfg.holesToPlay)
    const forfeitEvents: ScoringEvent[] = [
      {
        kind: 'HoleForfeited',
        timestamp: hole.timestamp,
        hole: hole.hole,
        actor: 'system',
        declaringBet,
        forfeiter: forfeit.forfeiter,
      },
    ]
    if (updatedForfeitMatch.closedOut) {
      const closeWinner: 'team1' | 'team2' = updatedForfeitMatch.holesUp > 0 ? 'team1' : 'team2'
      forfeitEvents.push(
        ...buildCloseoutEvent(
          hole.timestamp,
          hole.hole,
          cfg,
          Math.abs(updatedForfeitMatch.holesUp),
          cfg.holesToPlay - updatedForfeitMatch.holesPlayed,
          closeWinner,
        ),
      )
    }
    return { events: forfeitEvents, match: updatedForfeitMatch }
  }

  const winner = holeWinner(hole, cfg)
  const updatedMatch = advanceMatch(match, winner, cfg.holesToPlay)
  const events: ScoringEvent[] = []

  // Phase 4d: emit TeamSizeReduced for best-ball partner withdrawal (§ 9).
  // Singles has no team to reduce — skip entirely for singles format.
  if (cfg.format === 'best-ball' && hole.withdrew.length > 0) {
    for (const wid of hole.withdrew) {
      let teamId: string | null = null
      if (cfg.teams![0].includes(wid)) {
        teamId = 'team1'
      } else if (cfg.teams![1].includes(wid)) {
        teamId = 'team2'
      }
      // Stray PlayerId not on any team: silent no-op.
      if (teamId !== null) {
        events.push({
          kind: 'TeamSizeReduced',
          timestamp: hole.timestamp,
          hole: hole.hole,
          actor: 'system',
          declaringBet,
          teamId,
          remainingSize: 1, // 2-player-team invariant; validateTeams enforces team.length === 2
        })
      }
    }
  }

  if (winner !== 'halved') {
    events.push({
      kind: 'HoleResolved',
      timestamp: hole.timestamp,
      hole: hole.hole,
      actor: 'system',
      declaringBet,
      winner,
    })
  } else {
    events.push({
      kind: 'HoleHalved',
      timestamp: hole.timestamp,
      hole: hole.hole,
      actor: 'system',
      declaringBet,
    })
  }

  if (updatedMatch.closedOut) {
    const closeWinner: 'team1' | 'team2' = updatedMatch.holesUp > 0 ? 'team1' : 'team2'
    events.push(
      ...buildCloseoutEvent(
        hole.timestamp,
        hole.hole,
        cfg,
        Math.abs(updatedMatch.holesUp),
        cfg.holesToPlay - updatedMatch.holesPlayed,
        closeWinner,
      ),
    )
  }

  return { events, match: updatedMatch }
}

// ─── Round finalizer ─────────────────────────────────────────────────────────

export function finalizeMatchPlayRound(
  cfg: MatchPlayCfg,
  _roundCfg: RoundConfig,
  match: MatchState,
): { events: ScoringEvent[]; match: MatchState } {
  if (match.closedOut) return { events: [], match }

  const declaringBet = cfg.id
  const timestamp = String(cfg.holesToPlay)
  const events: ScoringEvent[] = []

  if (match.holesUp === 0) {
    // § 6: tied match at holesToPlay → MatchHalved, zero deltas.
    events.push({
      kind: 'MatchHalved',
      timestamp,
      hole: cfg.holesToPlay,
      actor: 'system',
      declaringBet,
      matchId: cfg.id,
    })
    return { events, match: { ...match, closedOut: true } }
  }

  // Decided match still open at round boundary — settle now.
  const finalWinner: 'team1' | 'team2' = match.holesUp > 0 ? 'team1' : 'team2'
  events.push(
    ...buildCloseoutEvent(
      timestamp,
      cfg.holesToPlay,
      cfg,
      Math.abs(match.holesUp),
      cfg.holesToPlay - match.holesPlayed,
      finalWinner,
    ),
  )

  return { events, match: { ...match, closedOut: true } }
}

// ─── Match concession ────────────────────────────────────────────────────────

export function concedeMatch(
  cfg: MatchPlayCfg,
  roundCfg: RoundConfig,
  match: MatchState,
  concedingPlayer: PlayerId,
  hole: number,
): { events: ScoringEvent[]; match: MatchState } {
  if (match.closedOut) return { events: [], match }

  const bet = roundCfg.bets.find((b) => b.type === 'matchPlay' && b.id === cfg.id)
  if (!bet) throw new MatchPlayBetNotFoundError()

  const declaringBet = cfg.id
  const timestamp = String(hole)
  const events: ScoringEvent[] = []

  events.push({
    kind: 'ConcessionRecorded',
    timestamp,
    hole,
    actor: 'system',
    declaringBet,
    conceder: concedingPlayer,
    unit: 'match',
  })

  // Conceder's side loses; winner is the opposing side.
  const concederOnTeam1 =
    cfg.format === 'singles'
      ? concedingPlayer === cfg.playerIds[0]
      : cfg.teams![0].includes(concedingPlayer)
  const winner: 'team1' | 'team2' = concederOnTeam1 ? 'team2' : 'team1'

  events.push(
    ...buildCloseoutEvent(
      timestamp,
      hole,
      cfg,
      Math.abs(match.holesUp),
      cfg.holesToPlay - match.holesPlayed,
      winner,
    ),
  )

  return { events, match: { ...match, closedOut: true } }
}
