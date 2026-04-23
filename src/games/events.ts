// src/games/events.ts — ScoringEvent discriminated union.
//
// Every variant named in docs/games/game_*.md § 11 is listed below, plus the
// UI-spec § 3.3 additions, plus CTPCarried (restored from game_junk.md § 6;
// game_junk.md § 11 omitted it — tracked in /tmp/execution-notes.md).
//
// The exhaustive narrowing test in src/games/__tests__/types.test.ts fails
// type-check whenever a new variant is added without updating that switch.

import type { PlayerId, BetId, EventId, JunkKind, RoundConfig } from './types'

interface EventBase {
  timestamp: string
  hole: number | null
  actor: PlayerId | 'system'
}

type WithPoints = { points: Record<PlayerId, number> }
type WithBet = { declaringBet: BetId }

// ─── Skins (game_skins.md § 11) ─────────────────────────────────────────────

type SkinWon = EventBase & WithPoints & WithBet & {
  kind: 'SkinWon'
  hole: number
  winner: PlayerId
}
type SkinCarried = EventBase & WithBet & {
  kind: 'SkinCarried'
  hole: number
  carryPoints: number
  // Optional: populated by settleSkinsHole so finalizeSkinsRound can resolve
  // a final-hole tie (split / carryover / no-points) without re-reading
  // HoleState. Non-final-hole tied holes ignore these fields.
  contenders?: PlayerId[]
  tiedPlayers?: PlayerId[]
}
type SkinVoid = EventBase & WithBet & {
  kind: 'SkinVoid'
  hole: number
}
type SkinCarryForfeit = EventBase & WithBet & {
  kind: 'SkinCarryForfeit'
  hole: number
  carryPoints: number
}

// ─── Wolf (game_wolf.md § 11) ───────────────────────────────────────────────

type WolfHoleResolved = EventBase & WithPoints & WithBet & {
  kind: 'WolfHoleResolved'
  hole: number
  winners: PlayerId[]
  losers: PlayerId[]
}
type LoneWolfResolved = EventBase & WithPoints & WithBet & {
  kind: 'LoneWolfResolved'
  hole: number
  captain: PlayerId
  won: boolean
}
type BlindLoneResolved = EventBase & WithPoints & WithBet & {
  kind: 'BlindLoneResolved'
  hole: number
  captain: PlayerId
  won: boolean
}
type BlindLoneDeclared = EventBase & WithBet & {
  kind: 'BlindLoneDeclared'
  hole: number
  captain: PlayerId
}
type WolfHoleTied = EventBase & WithBet & {
  kind: 'WolfHoleTied'
  hole: number
}
type WolfCarryApplied = EventBase & WithBet & {
  kind: 'WolfCarryApplied'
  hole: number
  multiplier: number
}
type WolfDecisionMissing = EventBase & WithBet & {
  kind: 'WolfDecisionMissing'
  hole: number
  captain: PlayerId
}
type WolfHoleInvalid = EventBase & WithBet & {
  kind: 'WolfHoleInvalid'
  hole: number
  reason: string
}
type WolfCaptainReassigned = EventBase & WithBet & {
  kind: 'WolfCaptainReassigned'
  hole: number
  from: PlayerId
  to: PlayerId
}
// Reserved for future captain-selection rules; not emitted under the generic
// rotation introduced in Round 5 / #3 (see REBUILD_PLAN.md).
type WolfCaptainTiebreak = EventBase & WithBet & {
  kind: 'WolfCaptainTiebreak'
  hole: number
  candidates: PlayerId[]
  chosen: PlayerId
}

// ─── Nassau (game_nassau.md § 11) ───────────────────────────────────────────

type NassauHoleResolved = EventBase & WithBet & {
  kind: 'NassauHoleResolved'
  hole: number
  matchId: string
  winner: 'A' | 'B' | 'tie'
}
type PressOffered = EventBase & WithBet & {
  kind: 'PressOffered'
  hole: number
  parentMatchId: string
  downPlayer: PlayerId
}
type PressOpened = EventBase & WithBet & {
  kind: 'PressOpened'
  hole: number
  parentMatchId: string
  pressMatchId: string
}
type PressVoided = EventBase & WithBet & {
  kind: 'PressVoided'
  hole: number
  parentMatchId: string
  reason: string
}
type NassauHoleForfeited = EventBase & WithBet & {
  kind: 'NassauHoleForfeited'
  hole: number
  matchId: string
  forfeiter: PlayerId
}
type NassauWithdrawalSettled = EventBase & WithPoints & WithBet & {
  kind: 'NassauWithdrawalSettled'
  hole: number
  matchId: string
  withdrawer: PlayerId
}

// ─── Match Play (game_match_play.md § 11) ───────────────────────────────────

type HoleResolved = EventBase & WithBet & {
  kind: 'HoleResolved'
  hole: number
  winner: 'team1' | 'team2' | 'halved'
}
type HoleHalved = EventBase & WithBet & {
  kind: 'HoleHalved'
  hole: number
}
type MatchClosedOut = EventBase & WithPoints & WithBet & {
  kind: 'MatchClosedOut'
  hole: number
  matchId: string
  holesUp: number
  holesRemaining: number
}
type MatchTied = EventBase & WithBet & {
  kind: 'MatchTied'
  hole: number | null
  matchId: string
}
type MatchHalved = EventBase & WithBet & {
  kind: 'MatchHalved'
  hole: number | null
  matchId: string
}
type MatchConfigInvalid = EventBase & WithBet & {
  kind: 'MatchConfigInvalid'
  reason: string
}
// Extra-holes format deferred to post-v1; type retained for exhaustive-switch coverage.
type ExtraHoleResolved = EventBase & WithPoints & WithBet & {
  kind: 'ExtraHoleResolved'
  hole: number
  extraHoleIndex: number
}
type ConcessionRecorded = EventBase & WithBet & {
  kind: 'ConcessionRecorded'
  hole: number | null
  conceder: PlayerId
  unit: 'hole' | 'stroke' | 'match'
}
type HoleForfeited = EventBase & WithBet & {
  kind: 'HoleForfeited'
  hole: number
  forfeiter: PlayerId
}
type TeamSizeReduced = EventBase & WithBet & {
  kind: 'TeamSizeReduced'
  hole: number
  teamId: string
  remainingSize: number
}

// ─── Stroke Play (game_stroke_play.md § 11) ─────────────────────────────────

type StrokePlayHoleRecorded = EventBase & WithBet & {
  kind: 'StrokePlayHoleRecorded'
  hole: number
  nets: Record<PlayerId, number>
}
type StrokePlaySettled = EventBase & WithPoints & WithBet & {
  kind: 'StrokePlaySettled'
  hole: null
  mode: 'winner-takes-pot' | 'per-stroke' | 'places'
}
type CardBackResolved = EventBase & WithBet & {
  kind: 'CardBackResolved'
  hole: null
  segment: number
  tiedPlayers: PlayerId[]
  winner: PlayerId
}
type ScorecardPlayoffResolved = EventBase & WithBet & {
  kind: 'ScorecardPlayoffResolved'
  hole: null
  tiedPlayers: PlayerId[]
  winner: PlayerId
}
type TieFallthrough = EventBase & WithBet & {
  kind: 'TieFallthrough'
  hole: number | null
  from: string
  to: string
}
type IncompleteCard = EventBase & WithBet & {
  kind: 'IncompleteCard'
  hole: number
  player: PlayerId
}

// ─── Shared across games ────────────────────────────────────────────────────

type RoundingAdjustment = EventBase & WithPoints & WithBet & {
  kind: 'RoundingAdjustment'
  hole: number | null
  absorbingPlayer: PlayerId
}
type FieldTooSmall = EventBase & WithBet & {
  kind: 'FieldTooSmall'
  hole: number | null
}

// ─── Junk (game_junk.md § 11 + § 6) ─────────────────────────────────────────

type JunkAwarded = EventBase & WithPoints & WithBet & {
  kind: 'JunkAwarded'
  hole: number
  junk: JunkKind
  winner: PlayerId
}
type CTPWinnerSelected = EventBase & {
  kind: 'CTPWinnerSelected'
  hole: number
  winner: PlayerId
  gir: boolean
}
type CTPCarried = EventBase & {
  // Restored from game_junk.md § 6; variant was omitted from that file's § 11.
  // Rule-file gap logged at /tmp/execution-notes.md.
  kind: 'CTPCarried'
  hole: number
  fromHole: number
  carryPoints: number
}
type LongestDriveWinnerSelected = EventBase & {
  kind: 'LongestDriveWinnerSelected'
  hole: number
  winner: PlayerId
  distance?: number
}

// ─── Round lifecycle and UI-spec § 3.3 additions ────────────────────────────

type RoundConfigLocked = EventBase & {
  kind: 'RoundConfigLocked'
  hole: null
  config: RoundConfig
}
type ConfigUnlocked = EventBase & {
  kind: 'ConfigUnlocked'
  hole: number | null
  reason: string
}
type RoundStarted = EventBase & {
  kind: 'RoundStarted'
  hole: null
}
type RoundClosed = EventBase & {
  kind: 'RoundClosed'
  hole: null
}
type PlayerPickedUp = EventBase & {
  kind: 'PlayerPickedUp'
  hole: number
  player: PlayerId
}
type PlayerConceded = EventBase & {
  kind: 'PlayerConceded'
  hole: number
  player: PlayerId
}
type PlayerWithdrew = EventBase & {
  kind: 'PlayerWithdrew'
  hole: number
  player: PlayerId
  fromHole: number
}
type HoleReopened = EventBase & {
  kind: 'HoleReopened'
  hole: number
  supersedes: string[]
}

// ─── Final Adjustment (_FINAL_ADJUSTMENT.md § 7) ────────────────────────────
//
// Five new variants added per MIGRATION_NOTES.md item 17. These events are
// cross-bet in nature: targetBet may be a BetId or the literal 'all-bets', so
// they do not carry the WithBet mixin.

type AdjustmentTarget = { playerId: PlayerId; points: number }

type FinalAdjustmentApplied = EventBase & WithPoints & {
  kind: 'FinalAdjustmentApplied'
  hole: null
  targetPlayers: AdjustmentTarget[]
  targetBet: BetId | 'all-bets'
  reason: string
}
type AdjustmentProposed = EventBase & {
  kind: 'AdjustmentProposed'
  hole: null
  targetPlayers: AdjustmentTarget[]
  targetBet: BetId | 'all-bets'
  reason: string
  proposalId: string
}
type AdjustmentApproved = EventBase & {
  kind: 'AdjustmentApproved'
  hole: null
  proposalId: string
  appliedEventId: EventId
}
type AdjustmentRejected = EventBase & {
  kind: 'AdjustmentRejected'
  hole: null
  proposalId: string
  reason: string
}
type RoundControlTransferred = EventBase & {
  kind: 'RoundControlTransferred'
  hole: null
  fromPlayer: PlayerId
  toPlayer: PlayerId
  reason?: string
}

// ─── Discriminated union ────────────────────────────────────────────────────

export type ScoringEvent =
  | SkinWon
  | SkinCarried
  | SkinVoid
  | SkinCarryForfeit
  | WolfHoleResolved
  | LoneWolfResolved
  | BlindLoneResolved
  | BlindLoneDeclared
  | WolfHoleTied
  | WolfCarryApplied
  | WolfDecisionMissing
  | WolfHoleInvalid
  | WolfCaptainReassigned
  | WolfCaptainTiebreak
  | NassauHoleResolved
  | PressOffered
  | PressOpened
  | PressVoided
  | NassauHoleForfeited
  | NassauWithdrawalSettled
  | HoleResolved
  | HoleHalved
  | MatchClosedOut
  | MatchTied
  | MatchHalved
  | MatchConfigInvalid
  | ExtraHoleResolved
  | ConcessionRecorded
  | HoleForfeited
  | TeamSizeReduced
  | StrokePlayHoleRecorded
  | StrokePlaySettled
  | CardBackResolved
  | ScorecardPlayoffResolved
  | TieFallthrough
  | IncompleteCard
  | RoundingAdjustment
  | FieldTooSmall
  | JunkAwarded
  | CTPWinnerSelected
  | CTPCarried
  | LongestDriveWinnerSelected
  | RoundConfigLocked
  | ConfigUnlocked
  | RoundStarted
  | RoundClosed
  | PlayerPickedUp
  | PlayerConceded
  | PlayerWithdrew
  | HoleReopened
  | FinalAdjustmentApplied
  | AdjustmentProposed
  | AdjustmentApproved
  | AdjustmentRejected
  | RoundControlTransferred

export type ScoringEventKind = ScoringEvent['kind']
