// src/games/nassau.ts — pure Nassau scoring engine per docs/games/game_nassau.md.
//
// Phase 1 scope (prompt 013): types + MatchState + per-hole scoring for
// singles mode only. No press handling (Phase 2). No finalization / closeout
// (Phase 3). No allPairs / withdrawal / Round-Handicap integration (Phase 4).
//
// Signature divergence from Skins/Wolf/Stroke Play (prompt 012 I2 decision):
//   Nassau threads MatchState[] explicitly through settleNassauHole:
//     (hole, cfg, roundCfg, matches) => { events, matches }
//   This reflects Nassau's genuine structural state — presses (Phase 2) add
//   MatchState entries mid-round in ways the event log alone doesn't cleanly
//   replay. Hiding the state would force every call to rebuild matches from
//   the event log; explicit threading is the honest interface.
//
// Handicap allocation (prompt 012 I1/I4 decision):
//   Pair-wise USGA allocation per game_nassau.md § 2 prose (authoritative).
//   § 5 pseudocode is illustrative and incomplete for pair reduction — see
//   holeResult body for the algorithm.
//
// Portability: pure TypeScript; no next/*, react, react-dom, fs, path,
// process, DOM globals, @prisma/client, or src/lib/* imports.

import type {
  BetId,
  HoleState,
  NassauCfg,
  PlayerId,
  RoundConfig,
  ScoringEvent,
} from './types'
import { strokesOnHole } from './handicap'

// ─── Typed errors ───────────────────────────────────────────────────────────

export class NassauConfigError extends Error {
  readonly code = 'NassauConfigError' as const
  constructor(public readonly field: string, public readonly detail?: string) {
    super(
      detail
        ? `NassauCfg field '${field}' is invalid: ${detail}`
        : `NassauCfg missing required field: ${field}`,
    )
    this.name = 'NassauConfigError'
  }
}

export class NassauBetNotFoundError extends Error {
  readonly code = 'NassauBetNotFoundError' as const
  constructor() {
    super(
      'Nassau config does not correspond to a bet in roundCfg.bets — ' +
        'pass a config whose id matches a BetSelection.id.',
    )
    this.name = 'NassauBetNotFoundError'
  }
}

// ─── Match state ────────────────────────────────────────────────────────────

export interface MatchState {
  id: string                   // 'front' | 'back' | 'overall' | 'press-<n>'
  startHole: number
  endHole: number
  holesWonA: number
  holesWonB: number
  parentId: string | null
}

// ─── Validation ─────────────────────────────────────────────────────────────

function assertValidNassauCfg(cfg: NassauCfg): void {
  if (typeof cfg.id !== 'string' || cfg.id.length === 0) {
    throw new NassauConfigError('id')
  }
  if (typeof cfg.stake !== 'number' || !Number.isInteger(cfg.stake) || cfg.stake < 1) {
    throw new NassauConfigError('stake', 'must be a positive integer')
  }
  const validPressRules = ['manual', 'auto-2-down', 'auto-1-down'] as const
  if (!validPressRules.includes(cfg.pressRule)) {
    throw new NassauConfigError('pressRule')
  }
  const validPressScopes = ['nine', 'match'] as const
  if (!validPressScopes.includes(cfg.pressScope)) {
    throw new NassauConfigError('pressScope')
  }
  const validPairingModes = ['singles', 'allPairs'] as const
  if (!validPairingModes.includes(cfg.pairingMode)) {
    throw new NassauConfigError('pairingMode')
  }
  if (typeof cfg.appliesHandicap !== 'boolean') {
    throw new NassauConfigError('appliesHandicap')
  }
  if (!Array.isArray(cfg.playerIds) || cfg.playerIds.length < 2 || cfg.playerIds.length > 5) {
    throw new NassauConfigError('playerIds', 'length must be 2..5')
  }
  if (cfg.pairingMode === 'singles' && cfg.playerIds.length !== 2) {
    throw new NassauConfigError('playerIds', "pairingMode 'singles' requires exactly 2 players")
  }
  if (!Array.isArray(cfg.junkItems)) {
    throw new NassauConfigError('junkItems')
  }
  if (
    typeof cfg.junkMultiplier !== 'number' ||
    !Number.isInteger(cfg.junkMultiplier) ||
    cfg.junkMultiplier < 1
  ) {
    throw new NassauConfigError('junkMultiplier', 'must be a positive integer')
  }
}

function findBetId(cfg: NassauCfg, roundCfg: RoundConfig): BetId {
  const bet = roundCfg.bets.find((b) => b.type === 'nassau' && b.id === cfg.id)
  if (bet === undefined) throw new NassauBetNotFoundError()
  return bet.id
}

// ─── Initial matches ────────────────────────────────────────────────────────
//
// Singles mode: three base matches (front / back / overall). allPairs mode
// (Phase 4) will expand this to three matches per distinct pair.

export function initialMatches(_cfg: NassauCfg): MatchState[] {
  return [
    { id: 'front', startHole: 1, endHole: 9, holesWonA: 0, holesWonB: 0, parentId: null },
    { id: 'back', startHole: 10, endHole: 18, holesWonA: 0, holesWonB: 0, parentId: null },
    { id: 'overall', startHole: 1, endHole: 18, holesWonA: 0, holesWonB: 0, parentId: null },
  ]
}

// ─── Press handling (Phase 2) ───────────────────────────────────────────────
//
// Design: three pure functions compose a press event. The caller drives the
// sequence — offerPress returns a PressOffered event when the rule permits;
// UI layer confirms (or not); openPress creates the press MatchState when
// confirmed. `settleNassauHole` scoring is byte-identical to Phase 1 —
// presses enter the matches list via openPress before the next settle call.
//
// In manual mode, offerPress is only invoked when the down player has opted
// in (caller's responsibility per rule file § 5). In auto modes, offerPress
// filters by the exact threshold (2-down or 1-down) and returns [] otherwise.
// offerPress never emits when downBy === 0 — no "down player" exists.

export interface PressConfirmation {
  hole: number             // hole at which the UI confirmation landed
  parentMatchId: string    // id of the match being pressed
  openingPlayer: PlayerId  // the down player whose opt-in created the press
}

export function offerPress(
  hole: number,
  parent: MatchState,
  cfg: NassauCfg,
  downPlayer: PlayerId,
): ScoringEvent[] {
  // Hole must lie inside the parent match window.
  if (hole < parent.startHole || hole > parent.endHole) return []

  // Compute lead size. If tied, no "down player" exists → no offer.
  const lead = Math.abs(parent.holesWonA - parent.holesWonB)
  if (lead === 0) return []

  // Auto modes require the exact threshold. Manual mode accepts any down
  // value (the caller's opt-in is the gate under manual).
  if (cfg.pressRule === 'auto-2-down' && lead !== 2) return []
  if (cfg.pressRule === 'auto-1-down' && lead !== 1) return []

  return [{
    kind: 'PressOffered',
    timestamp: String(hole),
    actor: downPlayer,
    declaringBet: cfg.id,
    hole,
    parentMatchId: parent.id,
    downPlayer,
  }]
}

function endOfCurrent9Leg(hole: number, parentEndHole: number): number {
  const legEnd = hole <= 9 ? 9 : 18
  return Math.min(legEnd, parentEndHole)
}

export function openPress(
  confirmation: PressConfirmation,
  config: NassauCfg,
  roundCfg: RoundConfig,
  matches: MatchState[],
): { events: ScoringEvent[]; matches: MatchState[] } {
  assertValidNassauCfg(config)
  const declaringBet = findBetId(config, roundCfg)

  const parent = matches.find((m) => m.id === confirmation.parentMatchId)
  if (!parent) {
    throw new NassauConfigError(
      'parentMatchId',
      `no MatchState with id '${confirmation.parentMatchId}'`,
    )
  }

  const startHole = confirmation.hole + 1
  const endHole = config.pressScope === 'match'
    ? parent.endHole
    : endOfCurrent9Leg(confirmation.hole, parent.endHole)

  const pressCount = matches.filter((m) => m.id.startsWith('press-')).length
  const pressId = `press-${pressCount + 1}`
  const base = {
    timestamp: String(confirmation.hole),
    actor: confirmation.openingPlayer,
    declaringBet,
    hole: confirmation.hole,
  } as const

  const events: ScoringEvent[] = [{
    kind: 'PressOpened',
    ...base,
    parentMatchId: parent.id,
    pressMatchId: pressId,
  }]

  // § 9: press opened on the last hole of its window has zero holes to play
  // and ties immediately. Emit PressVoided; do NOT add the MatchState.
  if (startHole > endHole) {
    events.push({
      kind: 'PressVoided',
      ...base,
      parentMatchId: parent.id,
      reason: 'zero-holes-to-play',
    })
    return { events, matches }
  }

  const pressMatch: MatchState = {
    id: pressId,
    startHole,
    endHole,
    holesWonA: 0,
    holesWonB: 0,
    parentId: parent.id,
  }

  return { events, matches: [...matches, pressMatch] }
}

// ─── Net-score computation (pair-wise USGA allocation) ──────────────────────
//
// Pair-wise USGA allocation per docs/games/game_nassau.md § 2 prose; § 5
// pseudocode is illustrative and incomplete for pair reduction.
//
//   diff = |strokes[a] − strokes[b]|
//   higher-hcp player receives strokesOnHole(diff, holeIndex) strokes
//   lower-hcp player receives 0

function holeResult(
  state: HoleState,
  cfg: NassauCfg,
  a: PlayerId,
  b: PlayerId,
): 'A' | 'B' | 'tie' {
  const grossA = state.gross[a] ?? 0
  const grossB = state.gross[b] ?? 0

  let na: number
  let nb: number

  if (cfg.appliesHandicap) {
    const strokesA = state.strokes[a] ?? 0
    const strokesB = state.strokes[b] ?? 0
    const diff = Math.abs(strokesA - strokesB)
    const strokesForHigher = strokesOnHole(diff, state.holeIndex)
    const aIsHigher = strokesA > strokesB
    na = grossA - (aIsHigher ? strokesForHigher : 0)
    nb = grossB - (aIsHigher ? 0 : strokesForHigher)
  } else {
    na = grossA
    nb = grossB
  }

  if (na < nb) return 'A'
  if (nb < na) return 'B'
  return 'tie'
}

function applyHoleToMatch(match: MatchState, winner: 'A' | 'B' | 'tie'): MatchState {
  if (winner === 'A') return { ...match, holesWonA: match.holesWonA + 1 }
  if (winner === 'B') return { ...match, holesWonB: match.holesWonB + 1 }
  return match
}

// ─── Per-hole settlement ────────────────────────────────────────────────────

export function settleNassauHole(
  hole: HoleState,
  config: NassauCfg,
  roundCfg: RoundConfig,
  matches: MatchState[],
): { events: ScoringEvent[]; matches: MatchState[] } {
  assertValidNassauCfg(config)
  const declaringBet = findBetId(config, roundCfg)

  // Phase 1 supports only singles mode. allPairs lands in Phase 4.
  if (config.pairingMode !== 'singles') {
    throw new NassauConfigError(
      'pairingMode',
      `Phase 1 supports only 'singles'; got '${config.pairingMode}'`,
    )
  }

  const [playerA, playerB] = config.playerIds
  const events: ScoringEvent[] = []
  const updatedMatches: MatchState[] = []

  for (const match of matches) {
    if (hole.hole < match.startHole || hole.hole > match.endHole) {
      updatedMatches.push(match)
      continue
    }
    const winner = holeResult(hole, config, playerA, playerB)
    const updated = applyHoleToMatch(match, winner)
    updatedMatches.push(updated)
    events.push({
      kind: 'NassauHoleResolved',
      timestamp: hole.timestamp,
      actor: 'system',
      declaringBet,
      hole: hole.hole,
      matchId: match.id,
      winner,
    })
  }

  return { events, matches: updatedMatches }
}

// ─── Round finalization (Phase 3 stub) ──────────────────────────────────────
//
// Phase 1 stub: no settlement events emitted yet. Phase 3 fills this in with
// MatchClosedOut, MatchTied, and stake-denominated end-of-round events.

export function finalizeNassauRound(
  _events: ScoringEvent[],
  _config: NassauCfg,
  _matches: MatchState[],
): ScoringEvent[] {
  return []
}
