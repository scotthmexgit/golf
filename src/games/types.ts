// src/games/types.ts — shared types for the pure scoring engine.
//
// Surviving types are re-exported from src/types/index.ts per UI-spec § 3.2.
// Scoring-engine types (RoundConfig, BetSelection, HoleState, ledgers, and
// per-game configs) are defined here and match § 4 of each docs/games/game_*.md.
// The ScoringEvent discriminated union lives in ./events and is re-exported
// below for convenience. Type-only imports keep this file free of runtime deps.

import type { PlayerSetup, CourseData, TeeData, TeeName } from '../types'
import type { ScoringEvent } from './events'

export type { PlayerSetup, CourseData, TeeData, TeeName, ScoringEvent }

// ─── Identifiers ────────────────────────────────────────────────────────────

export type PlayerId = string
export type BetId = string
export type EventId = string

// ─── Junk kinds ─────────────────────────────────────────────────────────────

export type JunkKind =
  | 'ctp'
  | 'longestDrive'
  | 'greenie'
  | 'sandy'
  | 'barkie'
  | 'polie'
  | 'arnie'

// ─── Per-bet configurations (each matches § 4 of its rule file) ─────────────

export interface SkinsCfg {
  id: BetId
  stake: number
  escalating: boolean
  tieRuleFinalHole: 'carryover' | 'split' | 'no-points'
  appliesHandicap: boolean
  playerIds: PlayerId[]
  junkItems: JunkKind[]
  junkMultiplier: number
}

export interface WolfCfg {
  id: BetId
  stake: number
  loneMultiplier: number
  blindLoneEnabled: boolean
  blindLoneMultiplier: number
  tieRule: 'no-points' | 'carryover'
  playerIds: PlayerId[]
  appliesHandicap: boolean
  junkItems: JunkKind[]
  junkMultiplier: number
}

export interface NassauCfg {
  id: BetId
  stake: number
  pressRule: 'manual' | 'auto-2-down' | 'auto-1-down'
  pressScope: 'nine' | 'match'
  appliesHandicap: boolean
  pairingMode: 'singles' | 'allPairs'
  playerIds: PlayerId[]
  junkItems: JunkKind[]
  junkMultiplier: number
}

export interface MatchPlayCfg {
  id: BetId
  stake: number
  format: 'singles' | 'best-ball'
  appliesHandicap: boolean
  holesToPlay: 9 | 18
  tieRule: 'halved'
  playerIds: PlayerId[]
  teams?: [[PlayerId, PlayerId], [PlayerId, PlayerId]]
  junkItems: JunkKind[]
  junkMultiplier: number
}

export interface StrokePlayCfg {
  id: BetId
  stake: number
  settlementMode: 'winner-takes-pot' | 'per-stroke' | 'places'
  stakePerStroke: number
  placesPayout: number[]
  tieRule: 'split' | 'card-back' | 'scorecard-playoff'
  cardBackOrder: number[]
  appliesHandicap: boolean
  playerIds: PlayerId[]
  junkItems: JunkKind[]
  junkMultiplier: number
}

export type AnyBetCfg =
  | SkinsCfg
  | WolfCfg
  | NassauCfg
  | MatchPlayCfg
  | StrokePlayCfg

// ─── Junk round configuration (game_junk.md § 4) ────────────────────────────
// Sub-Task C lands ctpTieRule; it is declared here for forward compatibility.

export interface JunkRoundConfig {
  girEnabled: boolean
  longestDriveHoles: number[]
  ctpEnabled: boolean
  longestDriveEnabled: boolean
  greenieEnabled: boolean
  sandyEnabled: boolean
  barkieEnabled: boolean
  polieEnabled: boolean
  arnieEnabled: boolean
  polieMode: 'automatic' | 'invoked'
  barkieStrict: boolean
  superSandyEnabled: boolean
  ctpTieRule?: 'groupResolve' | 'carry'
}

// ─── Bet selection (UI-spec § 3.1) ──────────────────────────────────────────

export type BetType = 'skins' | 'wolf' | 'nassau' | 'matchPlay' | 'strokePlay'

export interface BetSelection {
  id: BetId
  type: BetType
  stake: number
  participants: PlayerId[]
  config: AnyBetCfg
  teams?: PlayerId[][]
  junkItems: JunkKind[]
  junkMultiplier: number
}

// ─── Round configuration (UI-spec § 3.1) ────────────────────────────────────

export interface RoundConfig {
  roundId: string
  courseName: string
  players: PlayerSetup[]
  bets: BetSelection[]
  junk: JunkRoundConfig
  longestDriveHoles: number[]
  locked: boolean
  unitSize: number
}

// ─── Per-hole state (rule-file § 5 pseudocode surfaces) ─────────────────────

export type HoleStatus =
  | 'Pending'
  | 'ScoresEntered'
  | 'SideBetsResolved'
  | 'Confirmed'

export interface HoleState {
  hole: number
  par: number
  holeIndex: number
  timestamp: string
  gross: Record<PlayerId, number>
  strokes: Record<PlayerId, number>
  status: HoleStatus
  ctpWinner: PlayerId | null
  longestDriveWinners: PlayerId[]
  bunkerVisited: Record<PlayerId, boolean>
  treeSolidHit: Record<PlayerId, boolean>
  treeAnyHit: Record<PlayerId, boolean>
  longPutt: Record<PlayerId, boolean>
  polieInvoked: Record<PlayerId, boolean>
  fairwayHit: Record<PlayerId, boolean>
  gir: Record<PlayerId, boolean>
  pickedUp: PlayerId[]
  conceded: PlayerId[]
  withdrew: PlayerId[]
}

// ─── Running ledger (UI-spec § 3.1) ─────────────────────────────────────────

export interface RunningLedger {
  netByPlayer: Record<PlayerId, number>
  byBet: Record<BetId, Record<PlayerId, number>>
  lastRecomputeTs: string
}

// ─── Event log (UI-spec § 3.1) ──────────────────────────────────────────────

export interface ScoringEventLog {
  events: ScoringEvent[]
  supersessions: Record<EventId, EventId>
}
